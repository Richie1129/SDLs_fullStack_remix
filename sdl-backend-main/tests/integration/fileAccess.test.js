/**
 * MinIO 檔案讀取／刪除授權（utils/fileAccess + routes/file）回歸測試
 *
 * 重點：
 *   - 反思日誌／作品集附件（daily_personals / daily_teams）本人與同專案成員必須可讀（防止修過頭）
 *   - 他專案的檔案 → 403
 *   - 評論附件不再無條件放行
 *   - 孤立檔案只有 admin；教師只在自己指導（mentorId）的專案算 mentor，不再對所有專案放行（F021）
 *   - /download（免認證 presigned URL）已移除
 */
jest.mock('../../config/logger', () => {
    const noop = jest.fn();
    return { info: noop, warn: noop, error: noop, debug: noop, child: () => ({ info: noop, warn: noop, error: noop, debug: noop }) };
});
jest.mock('../../services/auditService', () => ({ logAudit: jest.fn(() => Promise.resolve()) }));
jest.mock('../../config/minio', () => ({
    deleteFileFromMinio: jest.fn(async () => {}),
    fileExistsInMinio: jest.fn(async () => true),
    getFileStreamFromMinio: jest.fn(async () => ({ stream: { pipe: jest.fn(), on: jest.fn() } })),
    getPresignedDownloadUrl: jest.fn(async () => 'http://presigned')
}));

const { Op } = require('sequelize');
const sequelize = require('../../util/database');
const Submit = require('../../models/submit');
const DailyPersonal = require('../../models/daily_personal');
const DailyTeam = require('../../models/daily_team');
const User = require('../../models/user');
const Project = require('../../models/project');
const UserProject = require('../../models/user_project');
const apiCache = require('../../services/apiCache');
const FileUpload = require('../../models/file_upload');
const { resolveFileScope, canReadFile, canDeleteFile, onFileDeleted, escapeLike } = require('../../utils/fileAccess');
const minio = require('../../config/minio');

const FILE = '1700000000-abc123-report_final.pdf';
const student = { id: 7, role: 'student', class: '301', school_id: 1 };
const closedProject = { id: 42, mentorId: 99, is_open_for_viewing: false, allowed_classes: [], school_id: 1 };

/** 依 SQL 內容分派 sequelize.query 的回傳，模擬各表命中情況 */
function installQuerySpy({ task = [], comment = [], projectComment = [] } = {}) {
    return jest.spyOn(sequelize, 'query').mockImplementation(async (sql) => {
        if (sql.includes('FROM tasks t')) return task;
        if (sql.includes('FROM comment_attachments')) return comment;
        if (sql.includes('FROM project_comment_attachments')) return projectComment;
        throw new Error('未預期的 SQL: ' + sql.slice(0, 60));
    });
}

function fakeRes() {
    const res = {};
    res.status = jest.fn(() => res);
    res.json = jest.fn(() => res);
    res.end = jest.fn(() => res);
    res.setHeader = jest.fn();
    return res;
}

beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks(); // jest.mock 的模組函式（minio）呼叫次數不會被 restore 清掉
    apiCache.clear();
    jest.spyOn(Submit, 'findOne').mockResolvedValue(null);
    jest.spyOn(DailyPersonal, 'findOne').mockResolvedValue(null);
    jest.spyOn(DailyTeam, 'findOne').mockResolvedValue(null);
    jest.spyOn(FileUpload, 'findOne').mockResolvedValue(null);
    jest.spyOn(FileUpload, 'destroy').mockResolvedValue(1);
    jest.spyOn(UserProject, 'findOne').mockResolvedValue(null);
    jest.spyOn(User, 'findByPk').mockResolvedValue(student);
    jest.spyOn(Project, 'findByPk').mockResolvedValue(closedProject);
    jest.spyOn(Project, 'findAll').mockResolvedValue([]); // isMentorOfStudent：預設沒有指導任何專案
    installQuerySpy();
});

describe('escapeLike', () => {
    test('跳脫 % _ 與反斜線', () => {
        expect(escapeLike('a_b%c\\d')).toBe('a\\_b\\%c\\\\d');
    });
});

describe('resolveFileScope', () => {
    test('依序查 submits → tasks → 評論附件 → 專案評論附件 → 個人日誌 → 小組日誌', async () => {
        Submit.findOne.mockResolvedValue({ projectId: 1, userId: 2 });
        expect(await resolveFileScope(FILE)).toEqual({ source: 'submit', projectId: 1, ownerUserId: 2 });

        Submit.findOne.mockResolvedValue(null);
        installQuerySpy({ task: [{ projectId: 3 }] });
        expect(await resolveFileScope(FILE)).toEqual({ source: 'task', projectId: 3, ownerUserId: null });

        installQuerySpy({ comment: [{ projectId: 4, ownerUserId: 5 }] });
        expect(await resolveFileScope(FILE)).toEqual({ source: 'comment_attachment', projectId: 4, ownerUserId: 5 });

        installQuerySpy({ projectComment: [{ projectId: 6, ownerUserId: 8 }] });
        expect(await resolveFileScope(FILE)).toEqual({ source: 'project_comment_attachment', projectId: 6, ownerUserId: 8 });

        installQuerySpy();
        DailyPersonal.findOne.mockResolvedValue({ projectId: 9, userId: 7 });
        expect(await resolveFileScope(FILE)).toEqual({ source: 'daily_personal', projectId: 9, ownerUserId: 7 });

        DailyPersonal.findOne.mockResolvedValue(null);
        DailyTeam.findOne.mockResolvedValue({ projectId: 10, userId: 11 });
        expect(await resolveFileScope(FILE)).toEqual({ source: 'daily_team', projectId: 10, ownerUserId: 11 });

        DailyTeam.findOne.mockResolvedValue(null);
        FileUpload.findOne.mockResolvedValue({ userId: 12 });
        expect(await resolveFileScope(FILE)).toEqual({ source: 'upload', projectId: null, ownerUserId: 12 });

        FileUpload.findOne.mockResolvedValue(null);
        expect(await resolveFileScope(FILE)).toBeNull();
        expect(await resolveFileScope('')).toBeNull();
    });

    test('submits 與日誌都同時比對純 key 與 URL 後綴', async () => {
        await resolveFileScope('a_b.png');
        const submitWhere = Submit.findOne.mock.calls[0][0].where;
        const dailyWhere = DailyPersonal.findOne.mock.calls[0][0].where;
        for (const where of [submitWhere, dailyWhere]) {
            const [exact, like] = where[Op.or];
            expect(exact).toEqual({ fileName: 'a_b.png' });
            expect(like.fileName[Op.like]).toBe('%/a\\_b.png');
        }
    });

    test('LIKE 後綴會先跳脫萬用字元', async () => {
        const spy = installQuerySpy({ task: [{ projectId: 3 }] });
        await resolveFileScope('a_b%c.png');
        expect(spy.mock.calls[0][1].replacements.fileNameSuffix).toBe('%/a\\_b\\%c.png');
    });
});

describe('canReadFile：反思日誌／作品集附件不可被修過頭', () => {
    test('個人日誌附件：本人可讀（不需查專案）', async () => {
        DailyPersonal.findOne.mockResolvedValue({ projectId: 42, userId: 7 });
        expect(await canReadFile(7, FILE)).toBe(true);
        expect(UserProject.findOne).not.toHaveBeenCalled();
    });

    test('小組日誌附件：同專案成員可讀，他專案學生不可讀', async () => {
        DailyTeam.findOne.mockResolvedValue({ projectId: 42, userId: 3 });
        UserProject.findOne.mockResolvedValue({ userId: 7 });
        expect(await canReadFile(7, FILE)).toBe(true);

        apiCache.clear();
        UserProject.findOne.mockResolvedValue(null);
        expect(await canReadFile(7, FILE)).toBe(false);
    });
});

describe('canReadFile：其他來源', () => {
    test('他專案的任務圖片 → 拒絕；成員 → 放行；非 mentor 教師 → 拒絕；mentor → 放行', async () => {
        installQuerySpy({ task: [{ projectId: 42 }] });
        expect(await canReadFile(7, FILE)).toBe(false);

        UserProject.findOne.mockResolvedValue({ userId: 7 });
        expect(await canReadFile(7, FILE)).toBe(true);

        apiCache.clear();
        UserProject.findOne.mockResolvedValue(null);
        User.findByPk.mockResolvedValue({ ...student, role: 'teacher' });
        expect(await canReadFile(7, FILE)).toBe(false); // 教師不再對所有專案放行（F021）
        Project.findByPk.mockResolvedValue({ ...closedProject, mentorId: 7 });
        expect(await canReadFile(7, FILE)).toBe(true);
    });

    test('跨班觀摩者可讀、不可刪', async () => {
        installQuerySpy({ task: [{ projectId: 42 }] });
        Project.findByPk.mockResolvedValue({ ...closedProject, is_open_for_viewing: true, allowed_classes: ['301'] });
        expect(await canReadFile(7, FILE)).toBe(true);
        expect(await canDeleteFile(7, FILE)).toBe(false);
    });

    test('評論附件：不再無條件放行，非成員拒絕、留言者本人放行', async () => {
        installQuerySpy({ comment: [{ projectId: 42, ownerUserId: 3 }] });
        expect(await canReadFile(7, FILE)).toBe(false);
        expect(await canDeleteFile(7, FILE)).toBe(false);

        apiCache.clear(); // 歸屬已快取，換資料前先清
        installQuerySpy({ comment: [{ projectId: 42, ownerUserId: 7 }] });
        expect(await canReadFile(7, FILE)).toBe(true);
        expect(await canDeleteFile(7, FILE)).toBe(true);
    });

    test('孤立檔案：學生與教師拒絕，只有 admin 放行', async () => {
        expect(await canReadFile(7, FILE)).toBe(false);
        expect(await canDeleteFile(7, FILE)).toBe(false);
        User.findByPk.mockResolvedValue({ ...student, role: 'teacher' });
        expect(await canReadFile(7, FILE)).toBe(false);
        expect(await canDeleteFile(7, FILE)).toBe(false);
        User.findByPk.mockResolvedValue({ ...student, role: 'admin' });
        expect(await canReadFile(7, FILE)).toBe(true);
        expect(await canDeleteFile(7, FILE)).toBe(true);
    });

    test('無效輸入一律拒絕', async () => {
        expect(await canReadFile(null, FILE)).toBe(false);
        expect(await canReadFile(7, '')).toBe(false);
        expect(await canDeleteFile('x', FILE)).toBe(false);
    });
});

describe('剛上傳、尚未儲存的卡片附件（file_uploads）', () => {
    test('上傳者本人可預覽、可刪除；其他學生不可', async () => {
        FileUpload.findOne.mockResolvedValue({ userId: 7 });
        expect(await canReadFile(7, FILE)).toBe(true);
        expect(await canDeleteFile(7, FILE)).toBe(true);
        expect(UserProject.findOne).not.toHaveBeenCalled();

        expect(await canReadFile(8, FILE)).toBe(false);
        expect(await canDeleteFile(8, FILE)).toBe(false);
    });

    test('非本人：指導該上傳者的教師可讀，其他教師不可，admin 可', async () => {
        FileUpload.findOne.mockResolvedValue({ userId: 7 });
        User.findByPk.mockResolvedValue({ ...student, id: 8, role: 'teacher' });
        expect(await canReadFile(8, FILE)).toBe(false);

        Project.findAll.mockResolvedValue([{ id: 42 }]);          // 8 指導專案 42
        UserProject.findOne.mockResolvedValue({ projectId: 42 });  // 7 是專案 42 的成員
        expect(await canReadFile(8, FILE)).toBe(true);
        expect(UserProject.findOne).toHaveBeenCalledWith(expect.objectContaining({
            where: { userId: 7, projectId: { [Op.in]: [42] } }
        }));

        Project.findAll.mockResolvedValue([]);
        User.findByPk.mockResolvedValue({ ...student, id: 9, role: 'admin' });
        expect(await canReadFile(9, FILE)).toBe(true);
    });
});

describe('歸屬快取（filescope）', () => {
    test('歸屬解析結果以 fileName 快取，第二次不再查表；使用者層判定不快取', async () => {
        installQuerySpy({ task: [{ projectId: 42 }] });
        UserProject.findOne.mockResolvedValue({ userId: 7 });
        expect(await canReadFile(7, FILE)).toBe(true);
        const queries = sequelize.query.mock.calls.length;
        const memberships = UserProject.findOne.mock.calls.length;

        // 同一檔、不同使用者：歸屬走快取，成員判定照查
        UserProject.findOne.mockResolvedValue(null);
        expect(await canReadFile(8, FILE)).toBe(false);
        expect(sequelize.query.mock.calls.length).toBe(queries);
        expect(UserProject.findOne.mock.calls.length).toBe(memberships + 1);
        expect(apiCache.get(`filescope:${FILE}`)).toEqual({ source: 'task', projectId: 42, ownerUserId: null });
    });

    test('被移出專案後立即失效（不快取使用者層判定）', async () => {
        installQuerySpy({ task: [{ projectId: 42 }] });
        UserProject.findOne.mockResolvedValue({ userId: 7 });
        expect(await canReadFile(7, FILE)).toBe(true);
        UserProject.findOne.mockResolvedValue(null);
        expect(await canReadFile(7, FILE)).toBe(false);
    });

    test('解析不到的檔案只短暫快取，之後上傳紀錄出現即可讀', async () => {
        expect(await canReadFile(7, FILE)).toBe(false);
        expect(apiCache.get(`filescope:${FILE}`)).toBe('none');
        apiCache.clear();
        FileUpload.findOne.mockResolvedValue({ userId: 7 });
        expect(await canReadFile(7, FILE)).toBe(true);
    });

    test('onFileDeleted 清快取並移除上傳者紀錄', async () => {
        installQuerySpy({ task: [{ projectId: 42 }] });
        UserProject.findOne.mockResolvedValue({ userId: 7 });
        await canReadFile(7, FILE);
        expect(apiCache.get(`filescope:${FILE}`)).not.toBeNull();
        await onFileDeleted(FILE);
        expect(apiCache.get(`filescope:${FILE}`)).toBeNull();
        expect(FileUpload.destroy).toHaveBeenCalledWith({ where: { fileName: FILE } });
    });

    test('onFileDeleted 在 DB 失敗時不拋錯', async () => {
        FileUpload.destroy.mockRejectedValue(new Error('db down'));
        await expect(onFileDeleted(FILE)).resolves.toBeUndefined();
    });
});

describe('routes/file', () => {
    const router = require('../../routes/file');
    const routes = router.stack.filter(l => l.route).map(l => ({ path: l.route.path, methods: Object.keys(l.route.methods) }));
    const handlerOf = (path, method) => {
        const layer = router.stack.find(l => l.route && l.route.path === path && l.route.methods[method]);
        return layer.route.stack[layer.route.stack.length - 1].handle;
    };

    test('/download/:fileName（免認證 presigned URL）已移除', () => {
        expect(routes.find(r => r.path === '/download/:fileName')).toBeUndefined();
        expect(routes.find(r => r.path === '/image/:fileName')).toBeDefined();
        expect(routes.find(r => r.path === '/direct/:fileName')).toBeDefined();
    });

    test('/image 無權時 403，且不碰 MinIO', async () => {
        installQuerySpy();
        const res = fakeRes();
        await handlerOf('/image/:fileName', 'get')({ params: { fileName: FILE }, userId: 7, get: () => undefined }, res);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ message: '無權存取此檔案', code: 'FILE_ACCESS_DENIED' });
        expect(minio.getFileStreamFromMinio).not.toHaveBeenCalled();
    });

    test('/direct 無權時 403（含 URL 解碼後的檔名）', async () => {
        installQuerySpy();
        const res = fakeRes();
        await handlerOf('/direct/:fileName', 'get')({ params: { fileName: encodeURIComponent(FILE) }, userId: 7 }, res);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(minio.getFileStreamFromMinio).not.toHaveBeenCalled();
    });

    test('DELETE 無權時 403，且不刪除', async () => {
        installQuerySpy({ task: [{ projectId: 42 }] });
        const res = fakeRes();
        await handlerOf('/:fileName', 'delete')({ params: { fileName: FILE }, userId: 7, user: { role: 'teacher' } }, res);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(minio.deleteFileFromMinio).not.toHaveBeenCalled();
    });

    test('DELETE 角色以 DB 為準：JWT 說 admin 但 DB 是 student 仍拒絕；DB admin 放行（孤立檔案教師也不可刪）', async () => {
        installQuerySpy();
        let res = fakeRes();
        await handlerOf('/:fileName', 'delete')({ params: { fileName: FILE }, userId: 7, user: { role: 'admin' } }, res);
        expect(res.status).toHaveBeenCalledWith(403);

        User.findByPk.mockResolvedValue({ ...student, role: 'teacher' });
        res = fakeRes();
        await handlerOf('/:fileName', 'delete')({ params: { fileName: FILE }, userId: 7, user: { role: 'teacher' } }, res);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(minio.deleteFileFromMinio).not.toHaveBeenCalled();

        User.findByPk.mockResolvedValue({ ...student, role: 'admin' });
        res = fakeRes();
        await handlerOf('/:fileName', 'delete')({ params: { fileName: FILE }, userId: 7, user: { role: 'student' } }, res);
        expect(minio.deleteFileFromMinio).toHaveBeenCalledWith(FILE);
        expect(FileUpload.destroy).toHaveBeenCalledWith({ where: { fileName: FILE } });
    });

    test('batch-delete 任一檔無權即整批 403', async () => {
        installQuerySpy({ task: [{ projectId: 42 }] });
        const res = fakeRes();
        await handlerOf('/batch-delete', 'post')({ body: { fileNames: [FILE] }, userId: 7 }, res);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(minio.deleteFileFromMinio).not.toHaveBeenCalled();
    });

    test('HEAD 無權時 403', async () => {
        installQuerySpy();
        const res = fakeRes();
        await handlerOf('/:fileName', 'head')({ params: { fileName: FILE }, userId: 7 }, res);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(minio.fileExistsInMinio).not.toHaveBeenCalled();
    });
});
