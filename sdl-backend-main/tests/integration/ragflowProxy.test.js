/**
 * RAGFlow proxy 加固回歸測試
 *   - chatId / sessionId 只允許 [A-Za-z0-9_-]，其餘 400 且不打上游
 *   - production 一律驗證憑證，SSL_VERIFY=false 只在非 production 生效
 */
jest.mock('axios', () => ({ post: jest.fn(), delete: jest.fn() }));
jest.mock('../../services/auditService', () => ({
    logAudit: jest.fn(() => Promise.resolve()),
    clampMetadataSize: (x) => x,
    summarizeText: (x) => x
}));
jest.mock('../../services/aiAccessService', () => ({ requireAiEnabled: function requireAiEnabled(req, res, next) { next(); } }));
jest.mock('../../config/logger', () => {
    const noop = jest.fn();
    return { info: noop, warn: noop, error: noop, debug: noop, child: () => ({ info: noop, warn: noop, error: noop, debug: noop }) };
});

const axios = require('axios');

function fakeRes() {
    const res = {};
    res.status = jest.fn(() => res);
    res.json = jest.fn(() => res);
    return res;
}

describe('config.ssl', () => {
    const original = { NODE_ENV: process.env.NODE_ENV, SSL_VERIFY: process.env.SSL_VERIFY };
    afterEach(() => {
        process.env.NODE_ENV = original.NODE_ENV;
        if (original.SSL_VERIFY === undefined) delete process.env.SSL_VERIFY; else process.env.SSL_VERIFY = original.SSL_VERIFY;
    });

    test('production 忽略 SSL_VERIFY=false，仍驗證憑證', () => {
        const config = require('../../config');
        process.env.NODE_ENV = 'production';
        process.env.SSL_VERIFY = 'false';
        expect(config.ssl.verify).toBe(true);
    });

    test('非 production 可用 SSL_VERIFY=false 關閉；未設定時預設驗證', () => {
        const config = require('../../config');
        process.env.NODE_ENV = 'test';
        process.env.SSL_VERIFY = 'false';
        expect(config.ssl.verify).toBe(false);
        delete process.env.SSL_VERIFY;
        expect(config.ssl.verify).toBe(true);
    });
});

describe('routes/ragflowProxy 路徑參數白名單', () => {
    const router = require('../../routes/ragflowProxy');
    const layerOf = (path, method) => router.stack.find(l => l.route && l.route.path === path && l.route.methods[method]);
    const validatorOf = (path, method) => layerOf(path, method).route.stack.find(s => s.handle.name === 'validatePathIds').handle;

    beforeEach(() => jest.clearAllMocks());

    test('三條帶 id 的路由都掛了 validatePathIds，且在 validateToken 之後', () => {
        for (const [path, method] of [['/:chatId/sessions', 'post'], ['/:chatId/completions', 'post'], ['/:chatId/sessions/:sessionId', 'delete']]) {
            const names = layerOf(path, method).route.stack.map(s => s.handle.name);
            expect(names[0]).toBe('validateToken');
            expect(names).toContain('validatePathIds');
        }
    });

    test.each([
        ['../admin', '路徑穿越'],
        ['abc?x=1', 'query 注入'],
        ['abc/def', '斜線'],
        ['', '空字串'],
        ['a'.repeat(129), '過長'],
        ['中文', '非 ASCII'],
    ])('chatId=%s（%s）→ 400，不打上游', async (chatId) => {
        const next = jest.fn();
        const res = fakeRes();
        validatorOf('/:chatId/sessions', 'post')({ params: { chatId } }, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'INVALID_PATH_ID' }));
        expect(next).not.toHaveBeenCalled();
        expect(axios.post).not.toHaveBeenCalled();
    });

    test('合法 id 放行；sessionId 也受檢', () => {
        const next = jest.fn();
        validatorOf('/:chatId/sessions/:sessionId', 'delete')({ params: { chatId: 'chat_01-A', sessionId: 'sess-9' } }, fakeRes(), next);
        expect(next).toHaveBeenCalled();

        const next2 = jest.fn();
        const res = fakeRes();
        validatorOf('/:chatId/sessions/:sessionId', 'delete')({ params: { chatId: 'ok', sessionId: '../x' } }, res, next2);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(next2).not.toHaveBeenCalled();
    });
});
