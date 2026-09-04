/**
 * 資安 Medium 項回歸測試（2026-09-05）
 *
 * 涵蓋：
 *   1. metrics 端點：NODE_ENV 未設定視為生產、METRICS_TOKEN 未設定一律 403、固定時間比對
 *   2. 客戶端稽核事件淨化：身分欄位不採信 body、時間戳窗口、projectId、metadata 大小、action 長度
 *   3. 密碼重設：token 只存雜湊、驗證改 POST（token 在 body）、信件連結用 fragment
 *   4. 臨時密碼改用 crypto.randomInt，不再碰 Math.random
 *   5. CSP 回報正規化：兩種格式、去掉 URL 的 query/fragment
 *
 * 不需要 DB／外部服務：Sequelize 只做 define，所有 DB 方法一律 spy。
 */

jest.mock('../../services/auditService', () => ({
    logAudit: jest.fn(() => Promise.resolve()),
    clampMetadataSize: jest.requireActual('../../services/auditService').clampMetadataSize,
}));
jest.mock('../../config/logger', () => {
    const noop = jest.fn();
    return { info: noop, warn: noop, error: noop, debug: noop, child: () => ({ info: noop, warn: noop, error: noop, debug: noop }) };
});
jest.mock('../../services/emailService', () => ({
    sendPasswordResetEmail: jest.fn(async () => ({ success: true })),
}));
jest.mock('../../controllers/auth', () => ({
    revokeAllTokens: jest.fn(async () => {}),
}));

const crypto = require('crypto');
const sequelize = require('../../util/database');
const User = require('../../models/user');
const PasswordResetToken = require('../../models/password_reset_token');
const { authMetrics } = require('../../routes/metrics');
const UserProject = require('../../models/user_project');
const Project = require('../../models/project');
const { sanitizeClientEvent, classifyClientAction, resolveAllowedProjectIds, buildClientRecords } = require('../../routes/auditClient');
const { normalize: normalizeCspReport } = require('../../routes/cspReport');
const passwordReset = require('../../controllers/passwordReset');
const { sendPasswordResetEmail } = require('../../services/emailService');
const adminController = require('../../controllers/adminController');

function fakeRes() {
    const res = {};
    res.status = jest.fn(() => res);
    res.json = jest.fn(() => res);
    return res;
}

const ENV_KEYS = ['NODE_ENV', 'METRICS_TOKEN', 'EMAIL_USER', 'FRONTEND_URL'];
let savedEnv;
beforeEach(() => {
    savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
});
afterEach(() => {
    for (const k of ENV_KEYS) {
        if (savedEnv[k] === undefined) delete process.env[k];
        else process.env[k] = savedEnv[k];
    }
    jest.restoreAllMocks();
});

// ---------- 1. metrics ----------

describe('metrics 端點權限（routes/metrics.js）', () => {
    function call(headers = {}) {
        const req = { headers };
        const res = fakeRes();
        const next = jest.fn();
        authMetrics(req, res, next);
        return { res, next };
    }

    test('NODE_ENV 未設定且沒有 METRICS_TOKEN：403，不放行', () => {
        delete process.env.NODE_ENV;
        delete process.env.METRICS_TOKEN;
        const { res, next } = call();
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
    });

    test('NODE_ENV 未設定但 token 正確：放行', () => {
        delete process.env.NODE_ENV;
        process.env.METRICS_TOKEN = 'secret-token';
        const { next } = call({ 'x-metrics-token': 'secret-token' });
        expect(next).toHaveBeenCalledTimes(1);
    });

    test('token 錯誤或長度不同：403', () => {
        process.env.NODE_ENV = 'production';
        process.env.METRICS_TOKEN = 'secret-token';
        expect(call({ 'x-metrics-token': 'secret-tokeX' }).res.status).toHaveBeenCalledWith(403);
        expect(call({ 'x-metrics-token': 'secret' }).res.status).toHaveBeenCalledWith(403);
        expect(call({}).res.status).toHaveBeenCalledWith(403);
    });

    test('只有明確 NODE_ENV=development 才免 token', () => {
        process.env.NODE_ENV = 'development';
        delete process.env.METRICS_TOKEN;
        expect(call().next).toHaveBeenCalledTimes(1);
        process.env.NODE_ENV = 'test';
        expect(call().next).not.toHaveBeenCalled();
    });
});

// ---------- 2. 客戶端稽核事件淨化 ----------

describe('客戶端稽核事件淨化（routes/auditClient.js sanitizeClientEvent）', () => {
    const now = new Date('2026-09-05T00:00:00.000Z');

    test('沒有 action 或不是物件：回傳 null', () => {
        expect(sanitizeClientEvent(null, now)).toBeNull();
        expect(sanitizeClientEvent('x', now)).toBeNull();
        expect(sanitizeClientEvent({ targetType: 't' }, now)).toBeNull();
        expect(sanitizeClientEvent({ action: '   ' }, now)).toBeNull();
    });

    test('身分欄位一律不採信 body（回傳值不含 actorId / actorRole / ip）', () => {
        const out = sanitizeClientEvent({ action: 'X', userId: 999, actorId: 999, actorRole: 'admin', ip: '1.2.3.4' }, now);
        expect(out).not.toHaveProperty('actorId');
        expect(out).not.toHaveProperty('actorRole');
        expect(out).not.toHaveProperty('ip');
        expect(out).not.toHaveProperty('userId');
    });

    test('時間戳：窗口內採用客戶端值，未來或過久改用伺服器時間並標記', () => {
        const recent = now.getTime() - 60 * 1000;
        expect(sanitizeClientEvent({ action: 'X', _ts: recent }, now).timestamp.getTime()).toBe(recent);

        const future = sanitizeClientEvent({ action: 'X', _ts: now.getTime() + 10 * 60 * 1000 }, now);
        expect(future.timestamp).toBe(now);
        expect(future.metadata.clientTsRejected).toBe(true);

        const ancient = sanitizeClientEvent({ action: 'X', _ts: '2020-01-01T00:00:00Z' }, now);
        expect(ancient.timestamp).toBe(now);
        expect(ancient.metadata.clientTsRejected).toBe(true);

        const garbage = sanitizeClientEvent({ action: 'X', _ts: 'not-a-date' }, now);
        expect(garbage.timestamp).toBe(now);

        const none = sanitizeClientEvent({ action: 'X' }, now);
        expect(none.timestamp).toBe(now);
        expect(none.metadata.clientTsRejected).toBeUndefined();
        expect(none.metadata.receivedAt).toBe(now.toISOString());
    });

    test('projectId 只接受正整數，其餘為 null（避免 BIGINT 欄位讓整批寫入失敗）', () => {
        expect(sanitizeClientEvent({ action: 'X', projectId: true }, now).projectId).toBeNull();
        expect(sanitizeClientEvent({ action: 'X', projectId: [7] }, now).projectId).toBeNull();
        expect(sanitizeClientEvent({ action: 'X', projectId: '123' }, now).projectId).toBe('123');
        expect(sanitizeClientEvent({ action: 'X', projectId: 45 }, now).projectId).toBe('45');
        expect(sanitizeClientEvent({ action: 'X', projectId: 'abc' }, now).projectId).toBeNull();
        expect(sanitizeClientEvent({ action: 'X', projectId: '12.5' }, now).projectId).toBeNull();
        expect(sanitizeClientEvent({ action: 'X', projectId: 0 }, now).projectId).toBeNull();
        expect(sanitizeClientEvent({ action: 'X' }, now).projectId).toBeNull();
    });

    test('metadata：非物件改成空物件；過大時保住 url/timestamp/projectId 再丟其餘；_clientId 保留', () => {
        expect(sanitizeClientEvent({ action: 'X', metadata: 'str' }, now).metadata).toEqual({ receivedAt: now.toISOString() });
        const big = { blob: 'x'.repeat(20 * 1024), url: '/kanban', timestamp: '2026-09-05T00:00:00.000Z', projectId: 9 };
        const out = sanitizeClientEvent({ action: 'X', metadata: big, _clientId: 'c-1' }, now).metadata;
        expect(out.truncated).toBe(true);
        expect(out.blob).toBeUndefined();
        expect(out.url).toBe('/kanban');
        expect(out.timestamp).toBe('2026-09-05T00:00:00.000Z');
        expect(out.projectId).toBe('9');
        expect(out._clientId).toBe('c-1');
    });

    test('客戶端事件不得永久保留：essential 類 action 降為 functional 並有到期日', () => {
        const capped = classifyClientAction('PASSWORD_RESET_EXECUTE');
        expect(capped.consentLevel).toBe('functional');
        expect(capped.expiresAt).toBeInstanceOf(Date);
        expect(classifyClientAction('TOKEN_REFRESH').expiresAt).not.toBeNull();
        expect(classifyClientAction('PAGE_VIEW').consentLevel).toBe('analytics');
        expect(classifyClientAction('SCROLL_X').consentLevel).toBe('full');
    });

    test('resolveAllowedProjectIds：學生只拿到成員或指導的專案，教師／admin 全部放行，沒有 id 就不查 DB', async () => {
        const findByPk = jest.spyOn(User, 'findByPk').mockResolvedValue({ id: 1, role: 'student' });
        jest.spyOn(UserProject, 'findAll').mockResolvedValue([{ projectId: 10 }]);
        jest.spyOn(Project, 'findAll').mockResolvedValue([{ id: 30 }]);

        const allowed = await resolveAllowedProjectIds(1, ['10', '20', '30', '10']);
        expect([...allowed].sort()).toEqual(['10', '30']);
        expect(UserProject.findAll.mock.calls[0][0].where.userId).toBe(1);

        findByPk.mockResolvedValue({ id: 2, role: 'teacher' });
        expect([...await resolveAllowedProjectIds(2, ['20'])]).toEqual(['20']);

        findByPk.mockClear();
        expect((await resolveAllowedProjectIds(1, [null, null])).size).toBe(0);
        expect(findByPk).not.toHaveBeenCalled();
    });

    test('buildClientRecords：不可存取的 projectId 改 null 並記在 metadata；身分欄位來自 req', async () => {
        jest.spyOn(User, 'findByPk').mockResolvedValue({ id: 1, role: 'student' });
        jest.spyOn(UserProject, 'findAll').mockResolvedValue([{ projectId: 10 }]);
        jest.spyOn(Project, 'findAll').mockResolvedValue([]);
        const req = { userId: 1, user: { role: 'student', username: 'alice' }, ip: '10.0.0.1', headers: { 'user-agent': 'ua' }, id: 'req-1' };

        const { records, skipped } = await buildClientRecords(req, [
            { action: 'KANBAN_TASK_CLICK', projectId: '10', userId: 999, actorRole: 'admin' },
            { action: 'KANBAN_TASK_CLICK', projectId: '20' },
            { targetType: 'no-action' },
        ]);

        expect(skipped).toBe(1);
        expect(records).toHaveLength(2);
        expect(records[0]).toMatchObject({ actorId: 1, actorRole: 'student', actorName: 'alice', ip: '10.0.0.1', projectId: '10', source: 'client' });
        expect(records[1].projectId).toBeNull();
        expect(records[1].metadata.projectIdRejected).toBe('20');
        expect(records.every((r) => r.expiresAt instanceof Date)).toBe(true);
    });

    test('字串欄位截斷與預設值', () => {
        const out = sanitizeClientEvent({ action: 'A'.repeat(300), targetId: 42 }, now);
        expect(out.action).toHaveLength(128);
        expect(out.targetType).toBe('client');
        expect(out.targetId).toBe('42');
    });
});

// ---------- 3. 密碼重設 ----------

describe('密碼重設 token 雜湊與 POST 驗證（controllers/passwordReset.js）', () => {
    const { hashResetToken } = passwordReset;

    test('hashResetToken 是 sha256 hex，且與明文不同', () => {
        const h = hashResetToken('abc');
        expect(h).toMatch(/^[0-9a-f]{64}$/);
        expect(h).toBe(crypto.createHash('sha256').update('abc').digest('hex'));
    });

    test('requestPasswordReset：DB 寫入雜湊、信件拿到明文', async () => {
        jest.spyOn(User, 'findOne').mockResolvedValue({ id: 7, email: 'a@b.c' });
        jest.spyOn(PasswordResetToken, 'destroy').mockResolvedValue(1);
        const create = jest.spyOn(PasswordResetToken, 'create').mockResolvedValue({});
        sendPasswordResetEmail.mockClear();

        const res = fakeRes();
        await passwordReset.requestPasswordReset({ body: { email: 'A@b.c' } }, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const rawToken = sendPasswordResetEmail.mock.calls[0][1];
        const stored = create.mock.calls[0][0].token;
        expect(rawToken).toMatch(/^[0-9a-f-]{36}$/);
        expect(stored).toBe(hashResetToken(rawToken));
        expect(stored).not.toBe(rawToken);
    });

    test('requestPasswordReset：寄信失敗時用雜湊刪除剛建立的列', async () => {
        jest.spyOn(User, 'findOne').mockResolvedValue({ id: 7, email: 'a@b.c' });
        const destroy = jest.spyOn(PasswordResetToken, 'destroy').mockResolvedValue(1);
        const create = jest.spyOn(PasswordResetToken, 'create').mockResolvedValue({});
        sendPasswordResetEmail.mockRejectedValueOnce(new Error('smtp down'));

        const res = fakeRes();
        await passwordReset.requestPasswordReset({ body: { email: 'a@b.c' } }, res);

        expect(res.status).toHaveBeenCalledWith(500);
        const stored = create.mock.calls[0][0].token;
        expect(destroy).toHaveBeenLastCalledWith({ where: { token: stored } });
    });

    test('validateResetToken：token 從 body 取、用雜湊查 DB', async () => {
        const findOne = jest.spyOn(PasswordResetToken, 'findOne').mockResolvedValue({
            id: 1, User: { id: 7, email: 'a@b.c', username: 'u', account: 'acc' },
        });
        const res = fakeRes();
        await passwordReset.validateResetToken({ body: { token: 'raw-token' } }, res);

        expect(findOne.mock.calls[0][0].where.token).toBe(hashResetToken('raw-token'));
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json.mock.calls[0][0]).toMatchObject({ success: true, email: 'a@b.c' });
    });

    test('validateResetToken：缺少或非字串 token 回 400，不查 DB', async () => {
        const findOne = jest.spyOn(PasswordResetToken, 'findOne');
        for (const body of [{}, { token: 123 }, { token: { $ne: null } }, undefined]) {
            const res = fakeRes();
            await passwordReset.validateResetToken({ body }, res);
            expect(res.status).toHaveBeenCalledWith(400);
        }
        expect(findOne).not.toHaveBeenCalled();
    });

    test('resetPassword：交易內用雜湊查、鎖列、更新密碼後刪除該使用者所有 token', async () => {
        const t = { commit: jest.fn(async () => {}), rollback: jest.fn(async () => {}), LOCK: { UPDATE: 'UPDATE' } };
        jest.spyOn(sequelize, 'transaction').mockResolvedValue(t);
        const findOne = jest.spyOn(PasswordResetToken, 'findOne').mockResolvedValue({ id: 1, User: { id: 7, email: 'a@b.c' } });
        const update = jest.spyOn(User, 'update').mockResolvedValue([1]);
        const destroy = jest.spyOn(PasswordResetToken, 'destroy').mockResolvedValue(1);

        const res = fakeRes();
        await passwordReset.resetPassword({ body: { token: 'raw-token', newPassword: 'abcdefg1' } }, res);

        expect(findOne.mock.calls[0][0].where.token).toBe(hashResetToken('raw-token'));
        expect(findOne.mock.calls[0][0].lock).toBe('UPDATE');
        expect(update).toHaveBeenCalledTimes(1);
        expect(destroy).toHaveBeenCalledWith({ where: { userId: 7 }, transaction: t });
        expect(t.commit).toHaveBeenCalledTimes(1);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('信件連結把 token 放在 fragment（#token=），不用 query', async () => {
        const actual = jest.requireActual('../../services/emailService');
        delete process.env.EMAIL_USER;           // 演示模式：不真的寄信，回傳 resetUrl
        process.env.FRONTEND_URL = 'https://example.test';
        jest.spyOn(console, 'log').mockImplementation(() => {});
        const result = await actual.sendPasswordResetEmail('a@b.c', 'tok-123');
        expect(result.resetUrl).toBe('https://example.test/reset-password#token=tok-123');
        expect(result.resetUrl).not.toContain('?token=');
    });
});

// ---------- 4. 臨時密碼 ----------

describe('臨時密碼使用 crypto.randomInt（controllers/adminController.js）', () => {
    test('resetUserPassword 產生 SDL + 6 位數，且不呼叫 Math.random', async () => {
        jest.spyOn(User, 'findByPk').mockResolvedValue({ id: 5, account: 'acc', username: 'u', role: 'student' });
        jest.spyOn(User, 'update').mockResolvedValue([1]);
        const mathRandom = jest.spyOn(Math, 'random');
        const randomInt = jest.spyOn(crypto, 'randomInt');

        const res = fakeRes();
        await adminController.resetUserPassword({ params: { userId: '5' }, userId: 1, user: { role: 'admin' } }, res);

        expect(mathRandom).not.toHaveBeenCalled();
        expect(randomInt).toHaveBeenCalledWith(100000, 1000000);
        expect(res.json.mock.calls[0][0].tempPassword).toMatch(/^SDL\d{6}$/);
    });
});

// ---------- 5. CSP 回報 ----------

describe('CSP 違規回報正規化（routes/cspReport.js）', () => {
    test('report-uri 格式：取固定欄位並去掉 URL 的 query/fragment', () => {
        const out = normalizeCspReport({
            'csp-report': {
                'document-uri': 'https://science.wuretedu.com/reset-password?token=SECRET#token=SECRET',
                'blocked-uri': 'eval',
                'effective-directive': 'script-src',
                'violated-directive': 'script-src',
                'source-file': 'https://science.wuretedu.com/assets/html2pdf-abc.js?x=1',
                'line-number': '12',
                disposition: 'report',
                'original-policy': 'x'.repeat(1000),
            },
        });
        expect(out).toHaveLength(1);
        expect(out[0].documentUri).toBe('https://science.wuretedu.com/reset-password');
        expect(out[0].sourceFile).toBe('https://science.wuretedu.com/assets/html2pdf-abc.js');
        expect(out[0].lineNumber).toBe(12);
        expect(out[0].effectiveDirective).toBe('script-src');
        expect(JSON.stringify(out[0])).not.toContain('SECRET');
        expect(out[0]).not.toHaveProperty('original-policy');
    });

    test('Reporting API 陣列格式：只收 csp-violation，其餘丟掉', () => {
        const out = normalizeCspReport([
            { type: 'csp-violation', body: { documentURL: 'https://a.test/p?q=1', blockedURL: 'inline', effectiveDirective: 'style-src' } },
            { type: 'deprecation', body: {} },
        ]);
        expect(out).toHaveLength(1);
        expect(out[0].documentUri).toBe('https://a.test/p');
        expect(out[0].blockedUri).toBe('inline');
        expect(out[0].violatedDirective).toBeNull();
    });

    test('不認得的 body：空陣列', () => {
        expect(normalizeCspReport(null)).toEqual([]);
        expect(normalizeCspReport('str')).toEqual([]);
        expect(normalizeCspReport({ foo: 1 })).toEqual([]);
    });
});
