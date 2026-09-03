/**
 * 專案存取判定（middlewares/projectAccess）回歸測試
 *
 * 不需要 DB：所有 model 方法一律 spy。
 */
jest.mock('../../config/logger', () => {
    const noop = jest.fn();
    return { info: noop, warn: noop, error: noop, debug: noop, child: () => ({ info: noop, warn: noop, error: noop, debug: noop }) };
});

const User = require('../../models/user');
const Project = require('../../models/project');
const UserProject = require('../../models/user_project');
const Task = require('../../models/task');
const Question = require('../../models/question');
const {
    getProjectAccess, canAccessProject, isTeacherOrAdmin,
    getProjectIdFromTask, getProjectIdFromQuestion, toPositiveInt
} = require('../../middlewares/projectAccess');

function fakeRes() {
    const res = {};
    res.status = jest.fn(() => res);
    res.json = jest.fn(() => res);
    return res;
}

const student = { id: 7, role: 'student', class: '301', school_id: 1 };
const openProject = { id: 42, mentorId: 99, is_open_for_viewing: true, allowed_classes: ['301'], school_id: 1 };

beforeEach(() => {
    jest.restoreAllMocks();
    jest.spyOn(UserProject, 'findOne').mockResolvedValue(null);
    jest.spyOn(User, 'findByPk').mockResolvedValue(student);
    jest.spyOn(Project, 'findByPk').mockResolvedValue(openProject);
});

describe('getProjectAccess', () => {
    test('無效的 id 直接拒絕，不查 DB', async () => {
        expect(await getProjectAccess(undefined, 42)).toEqual({ allowed: false, level: null });
        expect(await getProjectAccess(7, 'abc')).toEqual({ allowed: false, level: null });
        expect(await getProjectAccess(7, -1)).toEqual({ allowed: false, level: null });
        expect(UserProject.findOne).not.toHaveBeenCalled();
    });

    test('專案成員：成員表命中即放行，不再查角色', async () => {
        UserProject.findOne.mockResolvedValue({ userId: 7 });
        expect(await getProjectAccess(7, 42)).toEqual({ allowed: true, level: 'member' });
        expect(User.findByPk).not.toHaveBeenCalled();
    });

    test('非成員學生、非 mentor、未開放觀摩 → 拒絕', async () => {
        Project.findByPk.mockResolvedValue({ ...openProject, is_open_for_viewing: false });
        expect(await getProjectAccess(7, 42, { allowViewer: true })).toEqual({ allowed: false, level: null });
    });

    test('角色以 DB 為準：admin / teacher 放行', async () => {
        User.findByPk.mockResolvedValue({ ...student, role: 'admin' });
        expect(await getProjectAccess(7, 42)).toEqual({ allowed: true, level: 'admin' });
        User.findByPk.mockResolvedValue({ ...student, role: 'teacher' });
        expect(await getProjectAccess(7, 42)).toEqual({ allowed: true, level: 'teacher' });
        expect(Project.findByPk).not.toHaveBeenCalled();
    });

    test('專案 mentor 放行', async () => {
        Project.findByPk.mockResolvedValue({ ...openProject, mentorId: 7, is_open_for_viewing: false });
        expect(await getProjectAccess(7, 42)).toEqual({ allowed: true, level: 'mentor' });
    });

    test('跨班觀摩者：只有 allowViewer=true 才算', async () => {
        expect(await getProjectAccess(7, 42)).toEqual({ allowed: false, level: null });
        expect(await getProjectAccess(7, 42, { allowViewer: true })).toEqual({ allowed: true, level: 'viewer' });
    });

    test('跨班觀摩需同校（雙方皆有學校時）', async () => {
        Project.findByPk.mockResolvedValue({ ...openProject, school_id: 2 });
        expect(await getProjectAccess(7, 42, { allowViewer: true })).toEqual({ allowed: false, level: null });
        Project.findByPk.mockResolvedValue({ ...openProject, school_id: null });
        expect(await getProjectAccess(7, 42, { allowViewer: true })).toEqual({ allowed: true, level: 'viewer' });
    });

    test('使用者或專案不存在 → 拒絕', async () => {
        User.findByPk.mockResolvedValue(null);
        expect(await getProjectAccess(7, 42)).toEqual({ allowed: false, level: null });
        User.findByPk.mockResolvedValue(student);
        Project.findByPk.mockResolvedValue(null);
        expect(await getProjectAccess(7, 42, { allowViewer: true })).toEqual({ allowed: false, level: null });
    });

    test('canAccessProject 只回布林', async () => {
        UserProject.findOne.mockResolvedValue({ userId: 7 });
        expect(await canAccessProject(7, 42)).toBe(true);
        UserProject.findOne.mockResolvedValue(null);
        expect(await canAccessProject(7, 42)).toBe(false);
    });
});

describe('isTeacherOrAdmin', () => {
    test('依 DB 角色判定', async () => {
        expect(await isTeacherOrAdmin(7)).toBe(false);
        User.findByPk.mockResolvedValue({ id: 7, role: 'teacher' });
        expect(await isTeacherOrAdmin(7)).toBe(true);
        User.findByPk.mockResolvedValue(null);
        expect(await isTeacherOrAdmin(7)).toBe(false);
        expect(await isTeacherOrAdmin('x')).toBe(false);
    });
});

describe('toPositiveInt', () => {
    test('只接受正整數', () => {
        expect(toPositiveInt('42')).toBe(42);
        expect(toPositiveInt(0)).toBeNull();
        expect(toPositiveInt('1.5')).toBeNull();
        expect(toPositiveInt(null)).toBeNull();
    });
});

describe('getProjectIdFromTask', () => {
    test('暫存任務 → 404；缺 taskId → 400；找不到 → 404', async () => {
        const next = jest.fn();
        let res = fakeRes();
        await getProjectIdFromTask({ params: { taskId: 'temp-1' }, body: {}, query: {} }, res, next);
        expect(res.status).toHaveBeenCalledWith(404);

        res = fakeRes();
        await getProjectIdFromTask({ params: {}, body: {}, query: {} }, res, next);
        expect(res.status).toHaveBeenCalledWith(400);

        jest.spyOn(Task, 'findByPk').mockResolvedValue(null);
        res = fakeRes();
        await getProjectIdFromTask({ params: { taskId: 5 }, body: {}, query: {} }, res, next);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(next).not.toHaveBeenCalled();
    });

    test('成功時把 projectId 寫進 params/body/query', async () => {
        jest.spyOn(Task, 'findByPk').mockResolvedValue({ id: 5, column: { kanban: { projectId: 42 } } });
        const req = { params: { taskId: 5 }, body: {}, query: {} };
        const next = jest.fn();
        await getProjectIdFromTask(req, fakeRes(), next);
        expect(next).toHaveBeenCalled();
        expect(req.params.projectId).toBe(42);
        expect(req.body.projectId).toBe(42);
        expect(req.query.projectId).toBe(42);
    });
});

describe('getProjectIdFromQuestion', () => {
    test('無效 id → 400；不存在 → 404', async () => {
        const next = jest.fn();
        let res = fakeRes();
        await getProjectIdFromQuestion({ params: { questionId: 'x' }, body: {}, query: {} }, res, next);
        expect(res.status).toHaveBeenCalledWith(400);

        jest.spyOn(Question, 'findByPk').mockResolvedValue(null);
        res = fakeRes();
        await getProjectIdFromQuestion({ params: { questionId: 9 }, body: {}, query: {} }, res, next);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(next).not.toHaveBeenCalled();
    });

    test('成功時掛上 questionRecord 並寫入 projectId', async () => {
        jest.spyOn(Question, 'findByPk').mockResolvedValue({ id: 9, projectId: 42, userId: 7 });
        const req = { params: { questionId: '9' }, body: {}, query: {} };
        const next = jest.fn();
        await getProjectIdFromQuestion(req, fakeRes(), next);
        expect(next).toHaveBeenCalled();
        expect(req.questionRecord).toEqual({ id: 9, projectId: 42, userId: 7 });
        expect(req.params.projectId).toBe(42);
    });
});
