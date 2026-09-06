/**
 * 教師存取範圍收斂為 project.mentorId 綁定（2026-09-05，future-list F021）回歸測試
 *
 * 涵蓋：
 *   1. projectAccess：isAdmin / getMentoredProjectIds / isMentorOfStudent / requireProjectMentor
 *   2. checkProjectOwnerOrTeacher 改走 getProjectAccess（非 mentor 教師 → 403）
 *   3. 依指導老師名稱列專案／列學期：本人全部、他人只回自己也是成員的、admin 不限
 *   4. 批次觀摩設定只認呼叫者本人為指導教師
 *   5. 公告：建立／刪除／socket 廣播限自己指導範圍；角色一律查 DB
 *   6. 稽核事件查詢：教師只看自己指導專案或自己的事件
 *   7. KB Coach 歷史／回饋統計、求助統計：教師只在自己指導的專案有權
 *   8. 路由接線：teacher-agent 與 orchestrator 必須掛 requireProjectMentor
 *
 * 不需要 DB：所有 model 方法一律 spy；middlewares/projectAccess.js 跑真邏輯。
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
jest.mock('../../controllers/teacherAgentController', () => ({
    getCooldownStatus: jest.fn(),
    getHistory: jest.fn(),
    startAnalysis: jest.fn()
}));

const { Op } = require('sequelize');
const sequelize = require('../../util/database');
const User = require('../../models/user');
const Project = require('../../models/project');
const UserProject = require('../../models/user_project');
const Announcement = require('../../models/announcement');
const AuditEvent = require('../../models/audit_event');
const AiFeedback = require('../../models/ai_feedback');
const KbCoachHistory = require('../../models/kb_coach_history');
const HelpSeekingLog = require('../../models/help_seeking_log');

const {
    isAdmin, getMentoredProjectIds, isMentorOfStudent, requireProjectMentor
} = require('../../middlewares/projectAccess');
const { checkProjectOwnerOrTeacher } = require('../../middlewares/projectViewingMiddleware');
const { canDeleteAnnouncement, canCreateAnnouncement } = require('../../middlewares/announcementPermission');
const projectController = require('../../controllers/project/projectController');
const projectViewingController = require('../../controllers/project/projectViewingController');
const announcementController = require('../../controllers/announcement');
const AnnouncementHandler = require('../../sockets/handlers/announcementHandler');
const auditClientRouter = require('../../routes/auditClient');
const kbCoachController = require('../../controllers/kbCoach');
const aiTaskAssistantController = require('../../controllers/aiTaskAssistantController');

function fakeRes() {
    const res = {};
    res.status = jest.fn(() => res);
    res.json = jest.fn(() => res);
    return res;
}

const teacher = { id: 5, role: 'teacher', username: '陳老師', class: null, school_id: 1 };
const otherTeacher = { id: 6, role: 'teacher', username: '林老師', class: null, school_id: 1 };
const admin = { id: 1, role: 'admin', username: '系統管理員' };
const student = { id: 7, role: 'student', username: '小明', class: '301', school_id: 1 };
const users = { 1: admin, 5: teacher, 6: otherTeacher, 7: student };

// 專案 26 由 5 指導；專案 99 由 6 指導
const mentoredProject = { id: 26, mentorId: 5, is_open_for_viewing: false, allowed_classes: null, school_id: 1 };
const foreignProject = { id: 99, mentorId: 6, is_open_for_viewing: false, allowed_classes: null, school_id: 1 };
const projects = { 26: mentoredProject, 99: foreignProject };

beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.spyOn(User, 'findByPk').mockImplementation(async (id) => users[Number(id)] || null);
    jest.spyOn(Project, 'findByPk').mockImplementation(async (id) => projects[Number(id)] || null);
    // mentorId → 指導的專案清單
    jest.spyOn(Project, 'findAll').mockImplementation(async ({ where } = {}) => (
        Object.values(projects).filter((p) => !where || where.mentorId === undefined || p.mentorId === where.mentorId)
    ));
    jest.spyOn(UserProject, 'findOne').mockResolvedValue(null);
    jest.spyOn(UserProject, 'findAll').mockResolvedValue([]);
});

// ---------- 1. projectAccess 新增的判定 ----------

describe('projectAccess：admin 與師生關係', () => {
    test('isAdmin 只認 DB 角色 admin', async () => {
        expect(await isAdmin(1)).toBe(true);
        expect(await isAdmin(5)).toBe(false);
        expect(await isAdmin(7)).toBe(false);
        expect(await isAdmin('x')).toBe(false);
    });

    test('getMentoredProjectIds 只回 mentorId 指向自己的專案', async () => {
        expect(await getMentoredProjectIds(5)).toEqual([26]);
        expect(await getMentoredProjectIds(7)).toEqual([]);
        expect(await getMentoredProjectIds(undefined)).toEqual([]);
        expect(Project.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { mentorId: 5 }, attributes: ['id'] }));
    });

    test('isMentorOfStudent：學生在自己指導的專案裡才算；沒有指導專案時不查成員表', async () => {
        UserProject.findOne.mockResolvedValue({ projectId: 26 });
        expect(await isMentorOfStudent(5, 7)).toBe(true);
        expect(UserProject.findOne).toHaveBeenCalledWith(expect.objectContaining({
            where: { userId: 7, projectId: { [Op.in]: [26] } }
        }));

        UserProject.findOne.mockClear();
        expect(await isMentorOfStudent(7, 5)).toBe(false); // 學生沒有指導專案
        expect(UserProject.findOne).not.toHaveBeenCalled();

        UserProject.findOne.mockResolvedValue(null);
        expect(await isMentorOfStudent(5, 7)).toBe(false);
    });
});

describe('requireProjectMentor', () => {
    test('projectId 無效 → 400；專案不存在 → 404', async () => {
        let res = fakeRes();
        await requireProjectMentor({ params: { projectId: 'abc' }, userId: 5 }, res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(400);

        res = fakeRes();
        await requireProjectMentor({ params: { projectId: '12345' }, userId: 5 }, res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(404);
    });

    test('非 mentor 的教師 → 403 PROJECT_MENTOR_ONLY；mentor → 通過；admin → 通過', async () => {
        let next = jest.fn();
        let res = fakeRes();
        await requireProjectMentor({ params: { projectId: '99' }, userId: 5 }, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'PROJECT_MENTOR_ONLY' }));
        expect(next).not.toHaveBeenCalled();

        next = jest.fn();
        await requireProjectMentor({ params: { projectId: '26' }, userId: 5 }, fakeRes(), next);
        expect(next).toHaveBeenCalled();

        next = jest.fn();
        await requireProjectMentor({ params: { projectId: '99' }, userId: 1 }, fakeRes(), next);
        expect(next).toHaveBeenCalled();
    });

    test('projectId 也可來自 body（Orchestrator 手動觸發）', async () => {
        const next = jest.fn();
        await requireProjectMentor({ params: {}, body: { projectId: 26, ideaWallId: 3 }, userId: 5 }, fakeRes(), next);
        expect(next).toHaveBeenCalled();
    });

    test('角色以 DB 為準：mentorId 指向一個已降級為 student 的帳號 → 403', async () => {
        users[8] = { id: 8, role: 'student', username: '前老師' };
        projects[27] = { id: 27, mentorId: 8 };
        const res = fakeRes();
        await requireProjectMentor({ params: { projectId: '27' }, userId: 8 }, res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(403);
        delete users[8];
        delete projects[27];
    });
});

// ---------- 2. checkProjectOwnerOrTeacher ----------

describe('checkProjectOwnerOrTeacher（PUT/DELETE 專案、觀摩設定）', () => {
    test('非 mentor 的教師 → 403；mentor / 成員 / admin → 通過；專案不存在 → 404', async () => {
        let res = fakeRes();
        let next = jest.fn();
        await checkProjectOwnerOrTeacher({ params: { projectId: '99' }, userId: 5 }, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'PROJECT_MEMBER_OR_TEACHER_ONLY' }));
        expect(next).not.toHaveBeenCalled();

        next = jest.fn();
        await checkProjectOwnerOrTeacher({ params: { id: '26' }, userId: 5 }, fakeRes(), next);
        expect(next).toHaveBeenCalled();

        UserProject.findOne.mockResolvedValue({ userId: 7 });
        next = jest.fn();
        await checkProjectOwnerOrTeacher({ params: { projectId: '99' }, userId: 7 }, fakeRes(), next);
        expect(next).toHaveBeenCalled();
        UserProject.findOne.mockResolvedValue(null);

        next = jest.fn();
        await checkProjectOwnerOrTeacher({ params: { projectId: '99' }, userId: 1 }, fakeRes(), next);
        expect(next).toHaveBeenCalled();

        res = fakeRes();
        await checkProjectOwnerOrTeacher({ params: { projectId: '12345' }, userId: 1 }, res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(404);
    });
});

// ---------- 3. 依指導老師名稱列專案／列學期 ----------

describe('getProjectsByMentor / getAvailableSemesters 的可見範圍', () => {
    test('老師本人：以自己的 id 當 mentorId，不以 username 反查（username 不唯一）', async () => {
        const findOne = jest.spyOn(User, 'findOne').mockResolvedValue({ id: 999 });
        Project.findAll.mockResolvedValue([]);

        const res = fakeRes();
        await projectController.getProjectsByMentor({ params: { mentor: '陳老師' }, query: { semester: 'all' }, userId: 5 }, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(findOne).not.toHaveBeenCalled();
        expect(Project.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { mentorId: 5 } }));
    });

    test('學生／其他老師拿別人的名字查：只回自己也是成員的專案', async () => {
        jest.spyOn(User, 'findOne').mockResolvedValue({ id: 5 });
        UserProject.findAll.mockResolvedValue([{ projectId: 26 }, { projectId: 30 }]);
        Project.findAll.mockResolvedValue([]);

        let res = fakeRes();
        await projectController.getProjectsByMentor({ params: { mentor: '陳老師' }, query: { semester: 'all' }, userId: 7 }, res);
        expect(Project.findAll).toHaveBeenCalledWith(expect.objectContaining({
            where: { mentorId: 5, id: { [Op.in]: [26, 30] } }
        }));

        Project.findAll.mockClear();
        UserProject.findAll.mockResolvedValue([]);
        res = fakeRes();
        await projectController.getProjectsByMentor({ params: { mentor: '陳老師' }, query: { semester: 'all' }, userId: 6 }, res);
        expect(Project.findAll).toHaveBeenCalledWith(expect.objectContaining({
            where: { mentorId: 5, id: { [Op.in]: [] } }
        }));
    });

    test('admin 可查任一老師的全部專案；呼叫者不存在 → 401', async () => {
        jest.spyOn(User, 'findOne').mockResolvedValue({ id: 5 });
        Project.findAll.mockResolvedValue([]);

        let res = fakeRes();
        await projectController.getProjectsByMentor({ params: { mentor: '陳老師' }, query: { semester: '114-1' }, userId: 1 }, res);
        expect(Project.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { mentorId: 5, semester: '114-1' } }));

        res = fakeRes();
        await projectController.getProjectsByMentor({ params: { mentor: '陳老師' }, query: {}, userId: 424242 }, res);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    test('getAvailableSemesters 沿用同一套範圍', async () => {
        jest.spyOn(User, 'findOne').mockResolvedValue({ id: 5 });
        UserProject.findAll.mockResolvedValue([{ projectId: 26 }]);
        Project.findAll.mockResolvedValue([{ semester: '114-1' }]);

        const res = fakeRes();
        await projectController.getAvailableSemesters({ params: { mentor: '陳老師' }, userId: 7 }, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(Project.findAll).toHaveBeenCalledWith(expect.objectContaining({
            where: { mentorId: 5, id: { [Op.in]: [26] } }
        }));
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ semesters: ['114-1'] }));
    });
});

// ---------- 4. 批次觀摩設定 ----------

describe('batchUpdateViewingSettings', () => {
    let tx;
    beforeEach(() => {
        tx = { commit: jest.fn(async () => {}), rollback: jest.fn(async () => {}) };
        jest.spyOn(sequelize, 'transaction').mockResolvedValue(tx);
        jest.spyOn(User, 'findAll').mockResolvedValue([{ id: 7 }]);
    });

    test('教師指名別的老師 → 403 並 rollback，不查專案', async () => {
        const res = fakeRes();
        await projectViewingController.batchUpdateViewingSettings({
            body: { sourceClass: '301', targetClasses: ['302'], mentorName: '林老師', semester: 'all' },
            userId: 5
        }, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(tx.rollback).toHaveBeenCalled();
        expect(Project.findAll).not.toHaveBeenCalled();
    });

    test('教師指名自己 → 以自己的 id 過濾 mentorId；admin 才能指名任一老師', async () => {
        const findOne = jest.spyOn(User, 'findOne').mockResolvedValue({ id: 6 });
        Project.findAll.mockResolvedValue([]); // 沒有專案 → 404，但足以驗證 where

        let res = fakeRes();
        await projectViewingController.batchUpdateViewingSettings({
            body: { sourceClass: '301', targetClasses: ['302'], mentorName: '陳老師', semester: 'all' },
            userId: 5
        }, res);
        expect(findOne).not.toHaveBeenCalled();
        expect(Project.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { mentorId: 5 } }));

        Project.findAll.mockClear();
        res = fakeRes();
        await projectViewingController.batchUpdateViewingSettings({
            body: { sourceClass: '301', targetClasses: ['302'], mentorName: '林老師', semester: 'all' },
            userId: 1
        }, res);
        expect(findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { username: '林老師' } }));
        expect(Project.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { mentorId: 6 } }));
    });
});

// ---------- 5. 公告 ----------

describe('公告：建立', () => {
    const io = { to: jest.fn(() => ({ emit: jest.fn() })), emit: jest.fn() };
    const app = { get: jest.fn(() => io) };

    test('對非自己指導的專案發公告 → 403，不建立；自己指導的專案 → 201', async () => {
        const create = jest.spyOn(Announcement, 'create').mockResolvedValue({ id: 1, projectId: 26 });

        let res = fakeRes();
        await announcementController.createAnnouncement({
            body: { title: 't', content: 'c', projectId: '99' }, user: { username: '陳老師' }, userId: 5, app
        }, res);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(create).not.toHaveBeenCalled();

        res = fakeRes();
        await announcementController.createAnnouncement({
            body: { title: 't', content: 'c', projectId: '26' }, user: { username: '陳老師' }, userId: 5, app
        }, res);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(create).toHaveBeenCalledWith(expect.objectContaining({ projectId: 26 }));
    });

    test('個人公告：只能發給自己指導專案裡的學生；admin 不受限', async () => {
        const create = jest.spyOn(Announcement, 'create').mockResolvedValue({ id: 2, projectId: -7 });

        let res = fakeRes();
        await announcementController.createAnnouncement({
            body: { title: 't', content: 'c', projectId: 'student_7' }, user: { username: '林老師' }, userId: 6, app
        }, res);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(create).not.toHaveBeenCalled();

        UserProject.findOne.mockResolvedValue({ projectId: 26 }); // 7 在 5 指導的專案 26 裡
        res = fakeRes();
        await announcementController.createAnnouncement({
            body: { title: 't', content: 'c', projectId: 'student_7' }, user: { username: '陳老師' }, userId: 5, app
        }, res);
        expect(res.status).toHaveBeenCalledWith(201);

        UserProject.findOne.mockResolvedValue(null);
        create.mockClear();
        res = fakeRes();
        await announcementController.createAnnouncement({
            body: { title: 't', content: 'c', projectId: 'student_7' }, user: { username: '系統管理員' }, userId: 1, app
        }, res);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(create).toHaveBeenCalled();
    });

    test('canCreateAnnouncement 角色查 DB：JWT 說 teacher 但 DB 是 student → 403', async () => {
        const res = fakeRes();
        const next = jest.fn();
        await canCreateAnnouncement({ userId: 7, user: { role: 'teacher' } }, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });
});

describe('公告：刪除（canDeleteAnnouncement）', () => {
    const run = async (announcement, userId, jwtRole) => {
        jest.spyOn(Announcement, 'findByPk').mockResolvedValue(announcement);
        const res = fakeRes();
        const next = jest.fn();
        await canDeleteAnnouncement({ params: { id: String(announcement.id) }, userId, user: { role: jwtRole } }, res, next);
        return { res, next };
    };

    test('教師刪別人專案的公告 → 403；自己指導專案 → 通過；全域公告 → 通過', async () => {
        let r = await run({ id: 1, projectId: 99, title: 'x' }, 5, 'teacher');
        expect(r.res.status).toHaveBeenCalledWith(403);
        expect(r.next).not.toHaveBeenCalled();

        r = await run({ id: 2, projectId: 26, title: 'x' }, 5, 'teacher');
        expect(r.next).toHaveBeenCalled();

        r = await run({ id: 3, projectId: null, title: 'x' }, 5, 'teacher');
        expect(r.next).toHaveBeenCalled();
    });

    test('個人公告只有指導該學生的教師可刪；admin 皆可', async () => {
        let r = await run({ id: 4, projectId: -7, title: 'x' }, 6, 'teacher');
        expect(r.res.status).toHaveBeenCalledWith(403);

        UserProject.findOne.mockResolvedValue({ projectId: 26 });
        r = await run({ id: 4, projectId: -7, title: 'x' }, 5, 'teacher');
        expect(r.next).toHaveBeenCalled();
        UserProject.findOne.mockResolvedValue(null);

        r = await run({ id: 1, projectId: 99, title: 'x' }, 1, 'admin');
        expect(r.next).toHaveBeenCalled();
    });

    test('角色查 DB：JWT 說 admin 但 DB 是 student → 403', async () => {
        const r = await run({ id: 1, projectId: 99, title: 'x' }, 7, 'admin');
        expect(r.res.status).toHaveBeenCalledWith(403);
        expect(r.next).not.toHaveBeenCalled();
    });
});

describe('公告：socket emitAnnouncement', () => {
    function ctx(user) {
        const room = { emit: jest.fn() };
        return {
            socket: { id: 's1', user, emit: jest.fn(), handshake: { address: '127.0.0.1', headers: {} } },
            io: { emit: jest.fn(), to: jest.fn(() => room), room }
        };
    }

    test('教師對非自己指導的專案廣播 → announcementError，不寫入', async () => {
        const create = jest.spyOn(Announcement, 'create').mockResolvedValue({ id: 1 });
        const c = ctx(teacher);
        await AnnouncementHandler.handleAnnouncementBroadcast.call(c, { title: 't', content: 'c', author: '陳老師', projectId: 99, userId: 5 });
        expect(c.socket.emit).toHaveBeenCalledWith('announcementError', expect.objectContaining({ code: 'PERMISSION_DENIED' }));
        expect(create).not.toHaveBeenCalled();
    });

    test('自己指導的專案 → 寫入並只廣播到該房間；all → 全域廣播', async () => {
        const create = jest.spyOn(Announcement, 'create').mockResolvedValue({ id: 1 });
        let c = ctx(teacher);
        await AnnouncementHandler.handleAnnouncementBroadcast.call(c, { title: 't', content: 'c', author: '陳老師', projectId: '26', userId: 5 });
        expect(create).toHaveBeenCalledWith(expect.objectContaining({ projectId: 26 }));
        expect(c.io.to).toHaveBeenCalledWith('26');
        expect(c.io.emit).not.toHaveBeenCalled();

        c = ctx(teacher);
        await AnnouncementHandler.handleAnnouncementBroadcast.call(c, { title: 't', content: 'c', author: '陳老師', projectId: 'all', userId: 5 });
        expect(create).toHaveBeenLastCalledWith(expect.objectContaining({ projectId: null }));
        expect(c.io.emit).toHaveBeenCalledWith('receiveAnnouncement', expect.anything());
    });

    test('非教師 → INSUFFICIENT_ROLE', async () => {
        const c = ctx(student);
        await AnnouncementHandler.handleAnnouncementBroadcast.call(c, { title: 't', content: 'c', projectId: 'all' });
        expect(c.socket.emit).toHaveBeenCalledWith('announcementError', expect.objectContaining({ code: 'INSUFFICIENT_ROLE' }));
    });
});

// ---------- 6. 稽核事件查詢 ----------

describe('GET /api/audit/events 的教師範圍', () => {
    const handler = (() => {
        const layer = auditClientRouter.stack.find((l) => l.route && l.route.path === '/events' && l.route.methods.get);
        return layer.route.stack[layer.route.stack.length - 1].handle;
    })();

    test('教師指定非自己指導的 projectId → 403；指定自己的 → 查詢', async () => {
        const findAll = jest.spyOn(AuditEvent, 'findAll').mockResolvedValue([]);
        let res = fakeRes();
        await handler({ query: { projectId: '99' }, userId: 5 }, res);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(findAll).not.toHaveBeenCalled();

        res = fakeRes();
        await handler({ query: { projectId: '26', targetType: 'daily_personal', targetId: '3' }, userId: 5 }, res);
        expect(findAll).toHaveBeenCalledWith(expect.objectContaining({
            where: { targetType: 'daily_personal', targetId: '3', projectId: '26' }
        }));
    });

    test('教師沒指定 projectId：自己指導專案的事件或自己的事件', async () => {
        const findAll = jest.spyOn(AuditEvent, 'findAll').mockResolvedValue([]);
        await handler({ query: { targetType: 'daily_team', targetId: '9' }, userId: 5 }, fakeRes());
        expect(findAll).toHaveBeenCalledWith(expect.objectContaining({
            where: {
                targetType: 'daily_team',
                targetId: '9',
                [Op.or]: [{ projectId: { [Op.in]: [26] } }, { actorId: '5' }]
            }
        }));
    });

    test('admin 不設限；學生強制 actorId = 自己', async () => {
        const findAll = jest.spyOn(AuditEvent, 'findAll').mockResolvedValue([]);
        await handler({ query: { projectId: '99', actorId: '7' }, userId: 1 }, fakeRes());
        expect(findAll).toHaveBeenLastCalledWith(expect.objectContaining({ where: { projectId: '99', actorId: '7' } }));

        await handler({ query: { projectId: '99', actorId: '5' }, userId: 7 }, fakeRes());
        expect(findAll).toHaveBeenLastCalledWith(expect.objectContaining({ where: { projectId: '99', actorId: '7' } }));
    });
});

// ---------- 7. KB Coach 與求助統計 ----------

describe('kbCoach：教師只在自己指導的專案有權', () => {
    test('getHistory：非 mentor 教師帶 projectId → 403；mentor → 查詢', async () => {
        const findAll = jest.spyOn(KbCoachHistory, 'findAll').mockResolvedValue([]);
        let res = fakeRes();
        await kbCoachController.getHistory({ query: { projectId: '99' }, userId: 5 }, res);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(findAll).not.toHaveBeenCalled();

        res = fakeRes();
        await kbCoachController.getHistory({ query: { projectId: '26' }, userId: 5 }, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { projectId: 26 } }));
    });

    test('getHistory：教師不帶 projectId/nodeId 只能看自己的紀錄；admin 才能指定 userId', async () => {
        const findAll = jest.spyOn(KbCoachHistory, 'findAll').mockResolvedValue([]);
        await kbCoachController.getHistory({ query: { userId: '7' }, userId: 5 }, fakeRes());
        expect(findAll).toHaveBeenLastCalledWith(expect.objectContaining({ where: { userId: 5 } }));

        await kbCoachController.getHistory({ query: { userId: '7' }, userId: 1 }, fakeRes());
        expect(findAll).toHaveBeenLastCalledWith(expect.objectContaining({ where: { userId: 7 } }));
    });

    test('getFeedbackStats：教師預設只統計自己指導的專案；指定他人專案 → 403；admin 全部', async () => {
        const findAll = jest.spyOn(AiFeedback, 'findAll').mockResolvedValue([]);
        await kbCoachController.getFeedbackStats({ query: {}, userId: 5 }, fakeRes());
        expect(findAll).toHaveBeenLastCalledWith(expect.objectContaining({ where: { projectId: { [Op.in]: [26] } } }));

        const res = fakeRes();
        await kbCoachController.getFeedbackStats({ query: { projectId: '99' }, userId: 5 }, res);
        expect(res.status).toHaveBeenCalledWith(403);

        await kbCoachController.getFeedbackStats({ query: {}, userId: 1 }, fakeRes());
        expect(findAll).toHaveBeenLastCalledWith(expect.objectContaining({ where: {} }));
    });
});

describe('aiTaskAssistant.getHelpSeekingStats：教師只能看自己學生', () => {
    test('非指導關係的教師 → 403；指導該學生的教師 → 查詢', async () => {
        const findAll = jest.spyOn(HelpSeekingLog, 'findAll').mockResolvedValue([]);
        let res = fakeRes();
        await aiTaskAssistantController.getHelpSeekingStats({ params: { userId: '7' }, query: {}, userId: 6, user: { id: 6 } }, res);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(findAll).not.toHaveBeenCalled();

        UserProject.findOne.mockResolvedValue({ projectId: 26 });
        res = fakeRes();
        await aiTaskAssistantController.getHelpSeekingStats({ params: { userId: '7' }, query: {}, userId: 5, user: { id: 5 } }, res);
        expect(res.status).not.toHaveBeenCalledWith(403);
        expect(findAll).toHaveBeenCalled();
    });
});

// ---------- 8. 路由接線 ----------

describe('路由接線：教師專屬且以 projectId 為對象的端點必須掛 requireProjectMentor', () => {
    const hasMiddleware = (router, path, method) => {
        const layer = router.stack.find((l) => l.route && l.route.path === path && l.route.methods[method]);
        expect(layer).toBeDefined();
        return layer.route.stack.some((s) => s.handle === requireProjectMentor);
    };

    test('teacher-agent 三條路由', () => {
        const router = require('../../routes/teacherAgent');
        expect(hasMiddleware(router, '/status/:projectId', 'get')).toBe(true);
        expect(hasMiddleware(router, '/history/:projectId', 'get')).toBe(true);
        expect(hasMiddleware(router, '/analyze/:projectId', 'post')).toBe(true);
    });

    test('kb-coach orchestrator 手動觸發', () => {
        const router = require('../../routes/kbCoach');
        expect(hasMiddleware(router, '/orchestrator/analyze', 'post')).toBe(true);
    });
});

// ---------- 9. 專案清單與成員清單的列舉面 ----------

describe('getAllProject：query.userId 只有 admin 可指定別人', () => {
    const apiCache = require('../../services/apiCache');
    const { getAllProject } = require('../../controllers/project/projectController');

    beforeEach(() => apiCache.clear());

    test('學生帶別人的 userId → 仍只列自己的專案', async () => {
        Project.findAll.mockResolvedValue([]);
        const res = fakeRes();
        await getAllProject({ query: { userId: '5', semester: 'all' }, userId: 7 }, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(Project.findAll).toHaveBeenCalledWith(expect.objectContaining({
            include: [expect.objectContaining({ where: { id: 7 } })]
        }));
    });

    test('admin 帶別人的 userId → 列該使用者的專案', async () => {
        Project.findAll.mockResolvedValue([]);
        await getAllProject({ query: { userId: '7', semester: 'all' }, userId: 1 }, fakeRes());
        expect(Project.findAll).toHaveBeenCalledWith(expect.objectContaining({
            include: [expect.objectContaining({ where: { id: 7 } })]
        }));
    });
});

describe('專案成員清單：getProjectUsers / batchGetProjectUsers', () => {
    const userController = require('../../controllers/user');

    test('getProjectUsers：非 mentor 教師 → 403；mentor → 查詢', async () => {
        const findAll = jest.spyOn(User, 'findAll').mockResolvedValue([]);
        let res = fakeRes();
        await userController.getProjectUsers({ params: { projectId: '99' }, userId: 5 }, res);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(findAll).not.toHaveBeenCalled();

        res = fakeRes();
        await userController.getProjectUsers({ params: { projectId: '26' }, userId: 5 }, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(findAll).toHaveBeenCalled();
    });

    test('batchGetProjectUsers：教師只拿到自己指導或身為成員的專案；一個都沒有 → 空物件；admin 不限', async () => {
        const findAll = jest.spyOn(User, 'findAll').mockResolvedValue([]);
        let res = fakeRes();
        await userController.batchGetProjectUsers({ body: { projectIds: [26, 99, '26'] }, userId: 5 }, res);
        expect(findAll).toHaveBeenCalledWith(expect.objectContaining({
            include: [expect.objectContaining({ where: { id: [26] } })]
        }));

        findAll.mockClear();
        res = fakeRes();
        await userController.batchGetProjectUsers({ body: { projectIds: [99] }, userId: 5 }, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({});
        expect(findAll).not.toHaveBeenCalled();

        await userController.batchGetProjectUsers({ body: { projectIds: [26, 99] }, userId: 1 }, fakeRes());
        expect(findAll).toHaveBeenCalledWith(expect.objectContaining({
            include: [expect.objectContaining({ where: { id: [26, 99] } })]
        }));
    });
});
