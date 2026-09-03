/**
 * IDOR 授權修復回歸測試（2026-09-03）
 *
 * 涵蓋五組修復：
 *   1. GET /api/announcements — 加 validateToken，查詢範圍依角色/專案成員關係限制
 *   2. GET /api/users/:userId — 前端零呼叫，整條路由與 controller 函式移除
 *   3. 問答室 messages / chatrooms — 只有本人、teacher/admin、該專案 mentor 可查看／刪除
 *   4. KB Coach history / history/:id — 依 projectId／nodeId／擁有者限制查詢範圍
 *   5. AI 任務助理 task-history — 跨班觀摩者（readOnly）不可查看求助紀錄
 *
 * 不需要 DB：Sequelize 只做 define，所有 DB 方法一律 spy；middlewares/projectAccess.js 是真的（不
 * mock），內部用到的 model 方法照樣 spy，讓 isTeacherOrAdmin / canAccessProject / getProjectAccess
 * 跑真邏輯，只是資料來源換成假資料。
 */

jest.mock('../../services/auditService', () => ({
    logAudit: jest.fn(() => Promise.resolve()),
    clampMetadataSize: jest.fn((v) => v),
    summarizeText: jest.fn((v) => v)
}));
jest.mock('../../config/logger', () => {
    const noop = jest.fn();
    return { info: noop, warn: noop, error: noop, debug: noop, child: () => ({ info: noop, warn: noop, error: noop, debug: noop }) };
});

const { Op } = require('sequelize');
const User = require('../../models/user');
const Project = require('../../models/project');
const UserProject = require('../../models/user_project');
const Question = require('../../models/question');
const QuestionMessage = require('../../models/question_message');
const Announcement = require('../../models/announcement');
const KbCoachHistory = require('../../models/kb_coach_history');
const IdeaWall = require('../../models/idea_wall');
const Node = require('../../models/node');
const HelpSeekingLog = require('../../models/help_seeking_log');

const announcementController = require('../../controllers/announcement');
const userController = require('../../controllers/user');
const userRouter = require('../../routes/user');
const questionController = require('../../controllers/question');
const kbCoachController = require('../../controllers/kbCoach');
const aiTaskAssistantController = require('../../controllers/aiTaskAssistantController');

function fakeRes() {
    const res = {};
    res.status = jest.fn(() => res);
    res.json = jest.fn(() => res);
    res.send = jest.fn(() => res);
    return res;
}

// 學生（非專案成員、非 mentor）身分，用來驅動 isTeacherOrAdmin/getProjectAccess 走真邏輯得到「拒絕」
const studentUser = { id: 7, role: 'student', class: '301', school_id: 1 };
// project.mentorId 指向另一個 id，代表當事人不是該專案 mentor
const otherMentorProject = { id: 55, mentorId: 555, is_open_for_viewing: false, allowed_classes: null, school_id: 1 };

beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    // 預設：不是專案成員，避免忘記 mock 時 getProjectAccess 直接爆炸
    jest.spyOn(UserProject, 'findOne').mockResolvedValue(null);
    jest.spyOn(UserProject, 'findAll').mockResolvedValue([]);
});

// ---------- 1. 公告 ----------

describe('announcement.getAnnouncements', () => {
    test('指定 projectId：非成員/非 teacher/非 mentor → 403 且不查公告表', async () => {
        jest.spyOn(User, 'findByPk').mockResolvedValue(studentUser);
        jest.spyOn(Project, 'findByPk').mockResolvedValue(otherMentorProject);
        const findAllSpy = jest.spyOn(Announcement, 'findAll').mockResolvedValue([]);

        const req = { query: { projectId: '55' }, userId: 7 };
        const res = fakeRes();
        await announcementController.getAnnouncements(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'PERMISSION_DENIED' }));
        expect(findAllSpy).not.toHaveBeenCalled();
    });

    test('指定 projectId：專案成員 → 通過，查詢範圍含該專案／全域／自己的個人公告', async () => {
        // isTeacherOrAdmin 會先查一次角色，即便後面 canAccessProject 走成員短路也要 mock
        jest.spyOn(User, 'findByPk').mockResolvedValue(studentUser);
        jest.spyOn(UserProject, 'findOne').mockResolvedValue({ userId: 7, projectId: 55 });
        const findAllSpy = jest.spyOn(Announcement, 'findAll').mockResolvedValue([]);

        const req = { query: { projectId: '55' }, userId: 7 };
        const res = fakeRes();
        await announcementController.getAnnouncements(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(findAllSpy).toHaveBeenCalledWith(expect.objectContaining({
            where: { [Op.or]: [{ projectId: 55 }, { projectId: null }, { projectId: -7 }] }
        }));
    });

    test('總覽：query 帶他人 userId 會被忽略，個人公告條件一律用 req.userId', async () => {
        jest.spyOn(User, 'findByPk').mockResolvedValue(studentUser);
        const findAllSpy = jest.spyOn(Announcement, 'findAll').mockResolvedValue([]);

        // query.userId 故意帶別人的 id，controller 應完全不採信
        const req = { query: { userId: '999' }, userId: 7 };
        const res = fakeRes();
        await announcementController.getAnnouncements(req, res);

        expect(findAllSpy).toHaveBeenCalledWith(expect.objectContaining({
            where: { [Op.or]: [{ projectId: null }, { projectId: -7 }] }
        }));
    });

    test('總覽：學生只看全站公告 + 自己所屬專案的公告 + 自己的個人公告', async () => {
        jest.spyOn(User, 'findByPk').mockResolvedValue(studentUser);
        jest.spyOn(UserProject, 'findAll').mockResolvedValue([{ projectId: 10 }, { projectId: 20 }]);
        const findAllSpy = jest.spyOn(Announcement, 'findAll').mockResolvedValue([]);

        const req = { query: {}, userId: 7 };
        const res = fakeRes();
        await announcementController.getAnnouncements(req, res);

        expect(findAllSpy).toHaveBeenCalledWith(expect.objectContaining({
            where: {
                [Op.or]: [
                    { projectId: null },
                    { projectId: -7 },
                    { projectId: { [Op.in]: [10, 20] } }
                ]
            }
        }));
    });

    test('總覽：teacher/admin 維持看全部公告', async () => {
        jest.spyOn(User, 'findByPk').mockResolvedValue({ id: 1, role: 'teacher' });
        const findAllSpy = jest.spyOn(Announcement, 'findAll').mockResolvedValue([]);

        const req = { query: {}, userId: 1 };
        const res = fakeRes();
        await announcementController.getAnnouncements(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(findAllSpy).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
    });
});

// ---------- 2. GET /api/users/:userId 移除 ----------

describe('users/:userId 路由移除', () => {
    test('controllers/user.js 不再匯出 getUser', () => {
        expect(userController.getUser).toBeUndefined();
    });

    test('routes/user.js 不再註冊 GET /:userId', () => {
        const routes = userRouter.stack
            .filter((layer) => layer.route)
            .map((layer) => ({ path: layer.route.path, methods: Object.keys(layer.route.methods) }));

        const hasBareUserIdGet = routes.some((r) => r.path === '/:userId' && r.methods.includes('get'));
        expect(hasBareUserIdGet).toBe(false);
    });
});

// ---------- 3. 問答室 ----------

describe('question.getMessages', () => {
    test('非本人學生查看他人問答室 → 403，不查訊息表', async () => {
        jest.spyOn(User, 'findByPk').mockResolvedValue(studentUser);
        jest.spyOn(Project, 'findByPk').mockResolvedValue(otherMentorProject);
        const findAllSpy = jest.spyOn(QuestionMessage, 'findAll').mockResolvedValue([]);

        const req = {
            params: { questionId: '5' },
            userId: 7,
            questionRecord: { id: 5, projectId: 55, userId: 999 }
        };
        const res = fakeRes();
        await questionController.getMessages(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'PERMISSION_DENIED' }));
        expect(findAllSpy).not.toHaveBeenCalled();
    });

    test('本人查看自己的問答室 → 通過', async () => {
        const findAllSpy = jest.spyOn(QuestionMessage, 'findAll').mockResolvedValue([{ id: 1, message: 'hi' }]);

        const req = {
            params: { questionId: '5' },
            userId: 7,
            questionRecord: { id: 5, projectId: 55, userId: 7 }
        };
        const res = fakeRes();
        await questionController.getMessages(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(findAllSpy).toHaveBeenCalled();
    });
});

describe('question.deleteChatroom', () => {
    test('非本人學生刪除他人問答室 → 403，destroy 未被呼叫', async () => {
        jest.spyOn(User, 'findByPk').mockResolvedValue(studentUser);
        jest.spyOn(Project, 'findByPk').mockResolvedValue(otherMentorProject);
        const questionDestroy = jest.spyOn(Question, 'destroy').mockResolvedValue(1);
        const messageDestroy = jest.spyOn(QuestionMessage, 'destroy').mockResolvedValue(1);

        const req = {
            params: { questionId: '5' },
            userId: 7,
            questionRecord: { id: 5, projectId: 55, userId: 999 }
        };
        const res = fakeRes();
        await questionController.deleteChatroom(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'PERMISSION_DENIED' }));
        expect(questionDestroy).not.toHaveBeenCalled();
        expect(messageDestroy).not.toHaveBeenCalled();
    });

    test('該專案 mentor 刪除學生的問答室 → 通過', async () => {
        // mentorId 指向當事人自己（7），角色刻意設為 student，證明是走 mentor 判定而非 isTeacherOrAdmin
        jest.spyOn(User, 'findByPk').mockResolvedValue(studentUser);
        jest.spyOn(Project, 'findByPk').mockResolvedValue({ ...otherMentorProject, mentorId: 7 });
        const questionDestroy = jest.spyOn(Question, 'destroy').mockResolvedValue(1);
        const messageDestroy = jest.spyOn(QuestionMessage, 'destroy').mockResolvedValue(1);

        const req = {
            params: { questionId: '5' },
            userId: 7,
            questionRecord: { id: 5, projectId: 55, userId: 999 }
        };
        const res = fakeRes();
        await questionController.deleteChatroom(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(questionDestroy).toHaveBeenCalledWith(expect.objectContaining({ where: { id: '5' } }));
        expect(messageDestroy).toHaveBeenCalled();
    });
});

describe('question.createMessage', () => {
    test('對無權存取的問答室發言 → 403，訊息未建立', async () => {
        jest.spyOn(User, 'findByPk').mockResolvedValue(studentUser);
        jest.spyOn(Project, 'findByPk').mockResolvedValue(otherMentorProject);
        jest.spyOn(Question, 'findByPk').mockResolvedValue({ id: 5, projectId: 55, userId: 999 });
        const create = jest.spyOn(QuestionMessage, 'create').mockResolvedValue({ id: 1 });

        const res = fakeRes();
        await questionController.createMessage({ body: { message: 'hi', author: 'teacher', questionId: 5 }, userId: 7 }, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(create).not.toHaveBeenCalled();
    });

    test('問答室不存在 → 404', async () => {
        jest.spyOn(Question, 'findByPk').mockResolvedValue(null);
        const create = jest.spyOn(QuestionMessage, 'create').mockResolvedValue({ id: 1 });
        const res = fakeRes();
        await questionController.createMessage({ body: { message: 'hi', questionId: 5 }, userId: 7 }, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(create).not.toHaveBeenCalled();
    });

    test('author 由 DB 角色推導，學生冒充 teacher 會被寫成 student', async () => {
        jest.spyOn(User, 'findByPk').mockResolvedValue(studentUser);
        jest.spyOn(Question, 'findByPk').mockResolvedValue({ id: 5, projectId: 55, userId: 7 });
        const create = jest.spyOn(QuestionMessage, 'create').mockResolvedValue({ id: 1 });

        const res = fakeRes();
        await questionController.createMessage({ body: { message: 'hi', author: 'teacher', questionId: 5 }, userId: 7 }, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(create).toHaveBeenCalledWith(expect.objectContaining({ author: 'student', questionId: 5 }));
    });

    test('teacher（DB 角色）發言 author 為 teacher', async () => {
        jest.spyOn(User, 'findByPk').mockResolvedValue({ ...studentUser, role: 'teacher' });
        jest.spyOn(Question, 'findByPk').mockResolvedValue({ id: 5, projectId: 55, userId: 999 });
        const create = jest.spyOn(QuestionMessage, 'create').mockResolvedValue({ id: 1 });

        const res = fakeRes();
        await questionController.createMessage({ body: { message: 'hi', author: 'student', questionId: 5 }, userId: 7 }, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(create).toHaveBeenCalledWith(expect.objectContaining({ author: 'teacher' }));
    });
});

describe('路由接線（防止中介層被拿掉後靜默失效）', () => {
    const stackNames = (router, path, method) => {
        const layer = router.stack.find(l => l.route && l.route.path === path && l.route.methods[method]);
        expect(layer).toBeDefined();
        return layer.route.stack.map(s => s.handle.name);
    };

    test('ai-task-assistant task-history 必須串 getProjectIdFromTask 與 checkProjectViewingPermission', () => {
        const router = require('../../routes/aiTaskAssistant');
        const names = stackNames(router, '/task-history/:taskId', 'get');
        expect(names[0]).toBe('validateToken');
        expect(names).toEqual(expect.arrayContaining(['getProjectIdFromTask', 'checkProjectViewingPermission']));
    });

    test('問答室 messages 與 chatrooms 必須串 getProjectIdFromQuestion', () => {
        const router = require('../../routes/question');
        for (const [path, method] of [['/messages/:questionId', 'get'], ['/chatrooms/:questionId', 'delete']]) {
            const names = stackNames(router, path, method);
            expect(names[0]).toBe('validateToken');
            expect(names).toContain('getProjectIdFromQuestion');
        }
    });

    test('公告 GET 必須有 validateToken', () => {
        const router = require('../../routes/announcement');
        expect(stackNames(router, '/', 'get')[0]).toBe('validateToken');
    });

    test('評論路由改用共用 resolver（comments.js 不再自帶副本）', () => {
        const router = require('../../routes/comments');
        const names = stackNames(router, '/tasks/:taskId/comments', 'get');
        expect(names).toEqual(expect.arrayContaining(['validateToken', 'getProjectIdFromTask', 'checkProjectViewingPermission']));
        const src = require('fs').readFileSync(require.resolve('../../routes/comments'), 'utf8');
        expect(src).not.toMatch(/const getProjectIdFrom(Task|Comment) =/);
    });
});

describe('question.createMessage 參數驗證', () => {
    test('非數字 questionId → 400，不查 DB 也不會 hang', async () => {
        const findByPk = jest.spyOn(Question, 'findByPk').mockResolvedValue(null);
        const res = fakeRes();
        await questionController.createMessage({ body: { message: 'hi', questionId: 'abc' }, userId: 7 }, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(findByPk).not.toHaveBeenCalled();
    });

    test('空訊息 → 400', async () => {
        const res = fakeRes();
        await questionController.createMessage({ body: { questionId: 5 }, userId: 7 }, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('DB 例外 → 500 而非未處理的 rejection', async () => {
        jest.spyOn(Question, 'findByPk').mockRejectedValue(new Error('boom'));
        const res = fakeRes();
        await expect(questionController.createMessage({ body: { message: 'hi', questionId: 5 }, userId: 7 }, res)).resolves.not.toThrow;
        expect(res.status).toHaveBeenCalledWith(500);
    });
});

describe('controllers/user 角色以 DB 為準', () => {
    test('adminResetPassword：JWT 說 teacher 但 DB 是 student → 403', async () => {
        jest.spyOn(User, 'findByPk').mockResolvedValue(studentUser);
        const res = fakeRes();
        await userController.adminResetPassword({ params: { userId: '9' }, userId: 7, user: { role: 'teacher' } }, res);
        expect(res.status).toHaveBeenCalledWith(403);
    });

    test('getTeacherStudents：DB 是 student → 403；DB 是 admin → 通過', async () => {
        jest.spyOn(User, 'findByPk').mockResolvedValue(studentUser);
        let res = fakeRes();
        await userController.getTeacherStudents({ userId: 7, user: { role: 'teacher' } }, res);
        expect(res.status).toHaveBeenCalledWith(403);

        User.findByPk.mockResolvedValue({ ...studentUser, role: 'admin' });
        jest.spyOn(Project, 'findAll').mockResolvedValue([]);
        res = fakeRes();
        await userController.getTeacherStudents({ userId: 7, user: { role: 'student' } }, res);
        expect(res.status).not.toHaveBeenCalledWith(403);
    });
});

// ---------- 4. KB Coach ----------

describe('kbCoach.getHistory', () => {
    test('無任何查詢參數時，學生被強制只能查自己的紀錄', async () => {
        jest.spyOn(User, 'findByPk').mockResolvedValue(studentUser);
        const findAllSpy = jest.spyOn(KbCoachHistory, 'findAll').mockResolvedValue([]);

        const req = { query: {}, userId: 7 };
        const res = fakeRes();
        await kbCoachController.getHistory(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(findAllSpy).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 7 } }));
    });

    test('帶 projectId 但非該專案成員/mentor/teacher → 403，不查歷史表', async () => {
        jest.spyOn(User, 'findByPk').mockResolvedValue(studentUser);
        jest.spyOn(Project, 'findByPk').mockResolvedValue(otherMentorProject);
        const findAllSpy = jest.spyOn(KbCoachHistory, 'findAll').mockResolvedValue([]);

        const req = { query: { projectId: '55' }, userId: 7 };
        const res = fakeRes();
        await kbCoachController.getHistory(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'PERMISSION_DENIED' }));
        expect(findAllSpy).not.toHaveBeenCalled();
    });

    test('帶 projectId 且為該專案成員 → 通過，可看同專案的紀錄（與詳情一致）', async () => {
        // isTeacherOrAdmin 會先查一次角色，即便後面 canAccessProject 走成員短路也要 mock
        jest.spyOn(User, 'findByPk').mockResolvedValue(studentUser);
        jest.spyOn(UserProject, 'findOne').mockResolvedValue({ userId: 7, projectId: 55 });
        const findAllSpy = jest.spyOn(KbCoachHistory, 'findAll').mockResolvedValue([]);

        const req = { query: { projectId: '55' }, userId: 7 };
        const res = fakeRes();
        await kbCoachController.getHistory(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(findAllSpy).toHaveBeenCalledWith(expect.objectContaining({
            where: { projectId: 55 }
        }));
    });
});

describe('kbCoach.getHistoryDetail', () => {
    test('非本人、非該專案成員/mentor/teacher → 403', async () => {
        jest.spyOn(KbCoachHistory, 'findByPk').mockResolvedValue({
            id: 1, userId: 999, projectId: 55, ideaWallId: null
        });
        jest.spyOn(User, 'findByPk').mockResolvedValue(studentUser);
        jest.spyOn(Project, 'findByPk').mockResolvedValue(otherMentorProject);

        const req = { params: { id: '1' }, userId: 7 };
        const res = fakeRes();
        await kbCoachController.getHistoryDetail(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'PERMISSION_DENIED' }));
    });

    test('本人查看自己的紀錄 → 通過', async () => {
        jest.spyOn(KbCoachHistory, 'findByPk').mockResolvedValue({
            id: 1, userId: 7, projectId: 55, ideaWallId: null,
            agentType: 'IMPROVER', modelUsed: 'x', nodeTitle: 't', nodeContent: 'c',
            thinkingProcess: null, responseContent: 'r', suggestedActions: [],
            contextCount: 0, responseTimeMs: 10, sessionId: 's', createdAt: new Date()
        });

        const req = { params: { id: '1' }, userId: 7 };
        const res = fakeRes();
        await kbCoachController.getHistoryDetail(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
    });
});

// ---------- 5. AI 任務助理 ----------

describe('aiTaskAssistantController.getTaskHistory', () => {
    test('跨班觀摩者（readOnly）→ 403，不查求助紀錄', async () => {
        jest.spyOn(User, 'findByPk').mockResolvedValue(studentUser);
        const findAllSpy = jest.spyOn(HelpSeekingLog, 'findAll').mockResolvedValue([]);

        const req = { params: { taskId: '5' }, query: {}, userId: 7, readOnly: true };
        const res = fakeRes();
        await aiTaskAssistantController.getTaskHistory(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'PERMISSION_DENIED' }));
        expect(findAllSpy).not.toHaveBeenCalled();
    });

    test('一般專案成員（非觀摩）→ 通過', async () => {
        const findAllSpy = jest.spyOn(HelpSeekingLog, 'findAll').mockResolvedValue([]);

        const req = { params: { taskId: '5' }, query: {}, userId: 7, readOnly: false };
        const res = fakeRes();
        await aiTaskAssistantController.getTaskHistory(req, res);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        expect(findAllSpy).toHaveBeenCalled();
    });
});

describe('aiTaskAssistantController.getHelpSeekingStats', () => {
    test('學生查看他人求助統計 → 403', async () => {
        jest.spyOn(User, 'findByPk').mockResolvedValue(studentUser);
        const findAllSpy = jest.spyOn(HelpSeekingLog, 'findAll').mockResolvedValue([]);

        const req = { params: { userId: '999' }, query: {}, userId: 7, user: { id: 7, role: 'student' } };
        const res = fakeRes();
        await aiTaskAssistantController.getHelpSeekingStats(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(findAllSpy).not.toHaveBeenCalled();
    });

    test('admin 查看他人求助統計 → 通過（舊版只認 role 字面值 teacher，admin 會被誤擋）', async () => {
        jest.spyOn(User, 'findByPk').mockResolvedValue({ id: 7, role: 'admin' });
        const findAllSpy = jest.spyOn(HelpSeekingLog, 'findAll').mockResolvedValue([]);

        const req = { params: { userId: '999' }, query: {}, userId: 7, user: { id: 7, role: 'admin' } };
        const res = fakeRes();
        await aiTaskAssistantController.getHelpSeekingStats(req, res);

        expect(res.status).not.toHaveBeenCalledWith(403);
        expect(findAllSpy).toHaveBeenCalled();
    });
});
