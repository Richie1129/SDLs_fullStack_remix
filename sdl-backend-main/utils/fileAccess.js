/**
 * MinIO 檔案的讀取／刪除授權
 *
 * fileName（MinIO object key）散落在七個地方：submits、tasks（images / files）、
 * comment_attachments、project_comment_attachments、daily_personals、daily_teams，
 * 以及「剛上傳、尚未寫進任何業務表」的 file_uploads（上傳者紀錄）。
 * 舊的 verifyFileOwnership 只查前四個，而且對兩張 attachment 表無條件放行；
 * 若直接拿去當讀取規則，反思日誌與作品集的附件會全部 403。
 *
 * 規則：
 *   讀取：檔案擁有者本人，或對所屬專案有存取權（成員 / mentor / teacher / admin / 跨班觀摩者）
 *   刪除：檔案擁有者本人，或對所屬專案有存取權（不含觀摩者）
 *   解析不到來源的孤立檔案：讀取與刪除都只給 teacher / admin
 *
 * 快取：「檔案 → 歸屬」這層以 fileName 為 key 快取（量級 = 檔案數，且幾乎不變），
 * 解析不到的結果只快取很短（涵蓋剛上傳的檔案）。使用者層的判定不快取：
 * getProjectAccess 走的是 user_projects / users 的主鍵查詢，成本低，
 * 也避免「使用者 × 檔案」的 key 空間塞爆共用的 apiCache，以及被移出專案後仍可讀的尾巴。
 */
const { Op, QueryTypes } = require('sequelize');
const sequelize = require('../util/database');
const Submit = require('../models/submit');
const DailyPersonal = require('../models/daily_personal');
const DailyTeam = require('../models/daily_team');
const FileUpload = require('../models/file_upload');
const apiCache = require('../services/apiCache');
const { getProjectAccess, isTeacherOrAdmin, toPositiveInt } = require('../middlewares/projectAccess');

const SCOPE_CACHE_TTL_SECONDS = 600;
const SCOPE_MISS_TTL_SECONDS = 15;
const SCOPE_MISS = 'none';

/** LIKE 的 % 與 _ 是萬用字元，檔名裡常見底線，必須跳脫（PostgreSQL 預設跳脫字元為反斜線） */
function escapeLike(value) {
    return String(value).replace(/[\\%_]/g, '\\$&');
}

/** 各表的 fileName 可能存純 key 或含路徑的 URL，一律兩種都比 */
function fileNameMatcher(fileName, suffixPattern) {
    return { [Op.or]: [{ fileName }, { fileName: { [Op.like]: suffixPattern } }] };
}

// tasks 的 files 是 jsonb[]、images 是 text[]（存完整 URL），無法用 Op.contains 比對，
// 需 unnest 展開後逐一比對。（tasks.image 是 BLOB 舊欄位，不存 key，不比對）
const TASK_SQL = `
    SELECT k."projectId" AS "projectId"
    FROM tasks t
    LEFT JOIN columns c ON c.id = t."columnId"
    LEFT JOIN kanbans k ON k.id = c."kanbanId"
    WHERE EXISTS (SELECT 1 FROM unnest(t.files) AS f WHERE f->>'fileName' = :fileName)
       OR EXISTS (SELECT 1 FROM unnest(t.images) AS img WHERE img = :fileName OR img LIKE :fileNameSuffix)
    LIMIT 1
`;

const COMMENT_ATTACHMENT_SQL = `
    SELECT k."projectId" AS "projectId", c."userId" AS "ownerUserId"
    FROM comment_attachments ca
    JOIN comments c ON c.id = ca."commentId"
    LEFT JOIN tasks t ON t.id = c."taskId"
    LEFT JOIN columns col ON col.id = t."columnId"
    LEFT JOIN kanbans k ON k.id = col."kanbanId"
    WHERE ca."fileName" = :fileName
    LIMIT 1
`;

const PROJECT_COMMENT_ATTACHMENT_SQL = `
    SELECT pc."projectId" AS "projectId", pc."userId" AS "ownerUserId"
    FROM project_comment_attachments pca
    JOIN project_comments pc ON pc.id = pca."commentId"
    WHERE pca."fileName" = :fileName
    LIMIT 1
`;

function scope(source, row, ownerField = 'userId') {
    return {
        source,
        projectId: row.projectId ?? null,
        ownerUserId: row[ownerField] ?? null
    };
}

/**
 * 找出檔案屬於哪個專案／哪個使用者（不走快取）
 * @returns {Promise<{ source: string, projectId: number|null, ownerUserId: number|null } | null>}
 */
async function resolveFileScope(fileName) {
    if (!fileName || typeof fileName !== 'string') return null;
    const fileNameSuffix = `%/${escapeLike(fileName)}`;
    const replacements = { fileName, fileNameSuffix };
    const matcher = fileNameMatcher(fileName, fileNameSuffix);

    const submit = await Submit.findOne({ where: matcher, attributes: ['projectId', 'userId'] });
    if (submit) return scope('submit', submit);

    const taskRows = await sequelize.query(TASK_SQL, { replacements, type: QueryTypes.SELECT });
    if (taskRows.length > 0) return scope('task', taskRows[0]);

    const commentRows = await sequelize.query(COMMENT_ATTACHMENT_SQL, { replacements, type: QueryTypes.SELECT });
    if (commentRows.length > 0) return scope('comment_attachment', commentRows[0], 'ownerUserId');

    const projectCommentRows = await sequelize.query(PROJECT_COMMENT_ATTACHMENT_SQL, { replacements, type: QueryTypes.SELECT });
    if (projectCommentRows.length > 0) return scope('project_comment_attachment', projectCommentRows[0], 'ownerUserId');

    const personal = await DailyPersonal.findOne({ where: matcher, attributes: ['projectId', 'userId'] });
    if (personal) return scope('daily_personal', personal);

    const team = await DailyTeam.findOne({ where: matcher, attributes: ['projectId', 'userId'] });
    if (team) return scope('daily_team', team);

    // 剛上傳、尚未寫進任何業務表：只認上傳者本人
    const upload = await FileUpload.findOne({ where: { fileName }, attributes: ['userId'] });
    if (upload) return { source: 'upload', projectId: null, ownerUserId: upload.userId ?? null };

    return null;
}

function scopeCacheKey(fileName) {
    return `filescope:${fileName}`;
}

/** 有快取的歸屬解析 */
async function resolveFileScopeCached(fileName) {
    if (!fileName || typeof fileName !== 'string') return null;
    const key = scopeCacheKey(fileName);
    const hit = apiCache.get(key);
    if (hit !== null && hit !== undefined) return hit === SCOPE_MISS ? null : hit;

    const result = await resolveFileScope(fileName);
    apiCache.set(key, result ?? SCOPE_MISS, result ? SCOPE_CACHE_TTL_SECONDS : SCOPE_MISS_TTL_SECONDS);
    return result;
}

async function decide(userId, fileName, { allowViewer }) {
    const uid = toPositiveInt(userId);
    if (!uid || !fileName) return false;

    const fileScope = await resolveFileScopeCached(fileName);
    if (!fileScope) return isTeacherOrAdmin(uid);            // 孤立檔案
    if (fileScope.ownerUserId && fileScope.ownerUserId === uid) return true;
    if (!fileScope.projectId) return isTeacherOrAdmin(uid);  // 有擁有者但無專案（例如剛上傳）：非本人只給 teacher / admin
    return (await getProjectAccess(uid, fileScope.projectId, { allowViewer })).allowed;
}

/** 讀取（/image、/direct、HEAD） */
async function canReadFile(userId, fileName) {
    return decide(userId, fileName, { allowViewer: true });
}

/** 刪除（DELETE、batch-delete）：觀摩者不算 */
async function canDeleteFile(userId, fileName) {
    return decide(userId, fileName, { allowViewer: false });
}

/** 檔案已從 MinIO 刪除：清歸屬快取、移除上傳者紀錄（盡力而為，不影響刪除結果） */
async function onFileDeleted(fileName) {
    apiCache.del(scopeCacheKey(fileName));
    try {
        await FileUpload.destroy({ where: { fileName } });
    } catch (err) {
        console.error('清除檔案上傳者紀錄失敗:', err.message);
    }
}

/** 檔案歸屬變動（例如卡片儲存後）可呼叫此函式讓快取立即失效 */
function forgetFileScope(fileName) {
    apiCache.del(scopeCacheKey(fileName));
}

module.exports = {
    resolveFileScope,
    resolveFileScopeCached,
    canReadFile,
    canDeleteFile,
    onFileDeleted,
    forgetFileScope,
    escapeLike,
    SCOPE_CACHE_TTL_SECONDS,
    SCOPE_MISS_TTL_SECONDS
};
