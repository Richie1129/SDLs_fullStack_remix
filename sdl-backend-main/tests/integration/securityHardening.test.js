/**
 * 資安止血項回歸測試（2026-09-03）
 *
 * 涵蓋：
 *   1. 註冊 API 強制 role=student（忽略 body 的 role）
 *   2. User model role 白名單驗證
 *   3. admin 變更角色端點（僅 student/teacher，admin 不可動，撤銷 refresh token）
 *   4. Socket 刪除／更新 handler 的資源歸屬驗證（task / column / node）
 *   5. 錯誤報告遮蔽 currentPassword
 *
 * 不需要 DB／外部服務：Sequelize 只做 define，所有 DB 方法一律 spy。
 */

jest.mock('../../services/auditService', () => ({
    logAudit: jest.fn(() => Promise.resolve())
}));
jest.mock('../../config/logger', () => {
    const noop = jest.fn();
    return { info: noop, warn: noop, error: noop, debug: noop, child: () => ({ info: noop, warn: noop, error: noop, debug: noop }) };
});
jest.mock('../../services/orchestrator', () => ({ orchestrate: jest.fn() }));
jest.mock('../../utils/minioFileHelper', () => ({
    // 測試用：檔名直接取自物件上的 __files，方便辨識來源是 DB row 還是 client payload
    extractTaskFileNames: jest.fn((task) => task.__files || []),
    batchDeleteMinioFiles: jest.fn(async (names) => ({ success: names.length, failed: 0 }))
}));
jest.mock('../../utils/taskChangeLogger', () => ({ logTaskChange: jest.fn(), logFieldChanges: jest.fn() }));
jest.mock('../../utils/columnChangeLogger', () => ({ logColumnChange: jest.fn(), logColumnReorder: jest.fn() }));
jest.mock('../../utils/nodeChangeLogger', () => ({
    logNodeChange: jest.fn(async () => ({ id: 1 })),
    logNodeFieldChanges: jest.fn()
}));
jest.mock('../../utils/kanbanHelper', () => ({ buildKanbanData: jest.fn(async () => []) }));

const { Op } = require('sequelize');
const sequelize = require('../../util/database');
const User = require('../../models/user');
const RefreshToken = require('../../models/refresh_token');
const Task = require('../../models/task');
const Column = require('../../models/column');
const Kanban = require('../../models/kanban');
const Node = require('../../models/node');
const NodeRelation = require('../../models/node_relation');
const IdeaWall = require('../../models/idea_wall');
const Project = require('../../models/project');
const { sanitizeBody } = require('../../utils/errorHandler');
const { requireAdmin } = require('../../middlewares/requireAdmin');
const apiCache = require('../../services/apiCache');
const { registerUser } = require('../../controllers/user');
const adminController = require('../../controllers/adminController');
const { SocketHandlerFactory } = require('../../sockets/socketHandlers');
const TaskHandler = require('../../sockets/handlers/taskHandler');
const ColumnHandler = require('../../sockets/handlers/columnHandler');
const NodeHandler = require('../../sockets/handlers/nodeHandler');
const minioFileHelper = require('../../utils/minioFileHelper');

// ---------- 共用假物件 ----------

let lastTx;
function installTransactionSpy() {
    jest.spyOn(sequelize, 'transaction').mockImplementation(async (cb) => {
        const t = {
            commit: jest.fn(async () => {}),
            rollback: jest.fn(async () => {}),
            LOCK: { UPDATE: 'UPDATE' }
        };
        lastTx = t;
        if (typeof cb === 'function') return cb(t);
        return t;
    });
}

function fakeRes() {
    const res = {};
    res.status = jest.fn(() => res);
    res.json = jest.fn(() => res);
    return res;
}

function fakeSocketHandler() {
    const room = { emit: jest.fn() };
    const io = { to: jest.fn(() => room), room };
    const socket = {
        id: 'sock-1',
        userId: 1,
        user: { id: 1, username: 'alice' },
        emit: jest.fn(),
        rooms: new Set(),
        join: jest.fn(),
        handshake: { address: '127.0.0.1' }
    };
    const handler = SocketHandlerFactory.create(io, socket);
    return { handler, socket, io, room };
}

function emittedCodes(socket, eventName) {
    return socket.emit.mock.calls
        .filter(([event]) => event === eventName)
        .map(([, payload]) => payload && payload.code);
}

beforeEach(() => {
    lastTx = null;
    installTransactionSpy();
    jest.spyOn(Project, 'update').mockResolvedValue([1]);
});

afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
});

// ---------- 1. 註冊 API ----------

describe('registerUser 強制 role=student', () => {
    it('body 帶 role=admin 時仍以 student 建立並回傳 student', async () => {
        jest.spyOn(User, 'findOne').mockResolvedValue(null);
        const createSpy = jest.spyOn(User, 'create').mockImplementation(async (values) => ({ id: 1, ...values }));
        jest.spyOn(RefreshToken, 'create').mockResolvedValue({});

        const req = {
            body: { username: 'Eve', account: 'eve123456', email: 'eve@example.com', password: 'Passw0rd1', role: 'admin' },
            headers: {},
            ip: '127.0.0.1'
        };
        const res = fakeRes();

        await registerUser(req, res);

        expect(createSpy).toHaveBeenCalledTimes(1);
        expect(createSpy.mock.calls[0][0].role).toBe('student');
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ role: 'student' }));
        expect(lastTx.commit).toHaveBeenCalled();
    });

    it('body 帶 role=teacher 時同樣強制 student', async () => {
        jest.spyOn(User, 'findOne').mockResolvedValue(null);
        const createSpy = jest.spyOn(User, 'create').mockImplementation(async (values) => ({ id: 2, ...values }));
        jest.spyOn(RefreshToken, 'create').mockResolvedValue({});

        await registerUser({ body: { username: 'T', account: 'teacher01', email: 't@example.com', password: 'Passw0rd1', role: 'teacher' }, headers: {} }, fakeRes());

        expect(createSpy.mock.calls[0][0].role).toBe('student');
    });
});

// ---------- 2. Model 白名單 ----------

describe('User model role 白名單', () => {
    const base = { username: 'x', account: 'acc', email: 'x@example.com', password: 'hash' };

    it('拒絕不在白名單的 role', async () => {
        await expect(User.build({ ...base, role: 'superuser' }).validate()).rejects.toThrow(/role/);
    });

    it.each(['student', 'teacher', 'admin'])('接受既有資料使用的 role=%s', async (role) => {
        await expect(User.build({ ...base, role }).validate()).resolves.toBeDefined();
    });

    it('對外暴露 ROLES 常數', () => {
        expect(User.ROLES).toEqual(['student', 'teacher', 'admin']);
    });
});

// ---------- 3. admin 變更角色 ----------

describe('adminController.updateUserRole', () => {
    function reqFor(userId, role) {
        return { params: { userId: String(userId) }, body: { role }, userId: 99, user: { id: 99, role: 'admin' }, headers: {} };
    }

    it('拒絕指派 admin', async () => {
        const res = fakeRes();
        await adminController.updateUserRole(reqFor(5, 'admin'), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('拒絕變更 admin 帳號的角色', async () => {
        jest.spyOn(User, 'findByPk').mockResolvedValue({ id: 5, account: 'root', username: 'Root', role: 'admin', update: jest.fn() });
        const res = fakeRes();
        await adminController.updateUserRole(reqFor(5, 'student'), res);
        expect(res.status).toHaveBeenCalledWith(403);
    });

    it('student → teacher：更新角色並撤銷所有 refresh token', async () => {
        const update = jest.fn(async () => {});
        jest.spyOn(User, 'findByPk').mockResolvedValue({ id: 5, account: 'stu', username: 'Stu', role: 'student', update });
        const destroySpy = jest.spyOn(RefreshToken, 'destroy').mockResolvedValue(2);
        const res = fakeRes();

        await adminController.updateUserRole(reqFor(5, 'teacher'), res);

        expect(update).toHaveBeenCalledWith({ role: 'teacher' }, expect.objectContaining({ transaction: lastTx }));
        expect(destroySpy).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 5 } }));
        expect(res.status).not.toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ role: 'teacher' }));
    });

    it('角色相同時不動 DB', async () => {
        const update = jest.fn();
        jest.spyOn(User, 'findByPk').mockResolvedValue({ id: 5, account: 'stu', username: 'Stu', role: 'teacher', update });
        const destroySpy = jest.spyOn(RefreshToken, 'destroy').mockResolvedValue(0);
        await adminController.updateUserRole(reqFor(5, 'teacher'), fakeRes());
        expect(update).not.toHaveBeenCalled();
        expect(destroySpy).not.toHaveBeenCalled();
    });
});

// ---------- 4. Socket 資源歸屬驗證 ----------

describe('Socket 刪除 handler 資源歸屬驗證', () => {
    describe('handleTaskDelete', () => {
        it('任務屬於其他專案 → RESOURCE_MISMATCH，不刪除、交易回滾', async () => {
            jest.spyOn(Task, 'findByPk').mockResolvedValue({
                id: 42, columnId: 5, title: 'T',
                column: { id: 5, name: 'Todo', kanban: { id: 10, projectId: 99 } }
            });
            const destroySpy = jest.spyOn(Task, 'destroy').mockResolvedValue(1);
            const { handler, socket } = fakeSocketHandler();

            await TaskHandler.handleTaskDelete.call(handler, {
                cardData: { id: 42, title: 'client', files: [{ fileName: 'client-supplied.png' }] },
                projectId: 1, _reqContext: {}
            });

            expect(emittedCodes(socket, 'taskDeleteError')).toContain('RESOURCE_MISMATCH');
            expect(destroySpy).not.toHaveBeenCalled();
            expect(lastTx.rollback).toHaveBeenCalled();
            expect(minioFileHelper.batchDeleteMinioFiles).not.toHaveBeenCalled();
        });

        it('任務不存在 → TASK_NOT_FOUND', async () => {
            jest.spyOn(Task, 'findByPk').mockResolvedValue(null);
            const destroySpy = jest.spyOn(Task, 'destroy').mockResolvedValue(1);
            const { handler, socket } = fakeSocketHandler();

            await TaskHandler.handleTaskDelete.call(handler, { cardData: { id: 42 }, projectId: 1 });

            expect(emittedCodes(socket, 'taskDeleteError')).toContain('TASK_NOT_FOUND');
            expect(destroySpy).not.toHaveBeenCalled();
        });

        it('任務屬於該專案 → 刪除，MinIO 檔名取自 DB 而非 client', async () => {
            const dbTask = {
                id: 42, columnId: 5, title: 'DB title', content: 'c', labels: [], assignees: [],
                __files: ['db-file.png'],
                column: { id: 5, name: 'Todo', kanban: { id: 10, projectId: 1 } }
            };
            jest.spyOn(Task, 'findByPk').mockResolvedValue(dbTask);
            const column = { id: 5, name: 'Todo', task: [42, 43], save: jest.fn(async () => {}) };
            jest.spyOn(Column, 'findByPk').mockResolvedValue(column);
            const destroySpy = jest.spyOn(Task, 'destroy').mockResolvedValue(1);
            const { handler, socket, room } = fakeSocketHandler();

            await TaskHandler.handleTaskDelete.call(handler, {
                cardData: { id: 42, title: 'client title', __files: ['client-supplied.png'] },
                projectId: 1, _reqContext: {}
            });

            expect(emittedCodes(socket, 'taskDeleteError')).toEqual([]);
            expect(destroySpy).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 42 } }));
            expect(column.task).toEqual([43]);
            expect(lastTx.commit).toHaveBeenCalled();
            expect(minioFileHelper.extractTaskFileNames).toHaveBeenCalledWith(dbTask);
            expect(minioFileHelper.batchDeleteMinioFiles).toHaveBeenCalledWith(['db-file.png']);
            expect(room.emit).toHaveBeenCalledWith('taskDeleted', expect.objectContaining({ taskId: 42, columnId: 5 }));
            expect(room.emit).toHaveBeenCalledWith('activityUpdate', expect.objectContaining({ taskTitle: 'DB title' }));
        });
    });

    describe('handleColumnDelete', () => {
        it('欄位屬於其他專案 → RESOURCE_MISMATCH，不刪任務／欄位、不動順序', async () => {
            const kanban = { id: 10, column: [5], update: jest.fn(async () => {}) };
            jest.spyOn(Kanban, 'findOne').mockResolvedValue(kanban);
            jest.spyOn(Column, 'findByPk').mockResolvedValue({ id: 7, name: 'Other', kanbanId: 20, kanban: { id: 20, projectId: 99 } });
            const taskDestroy = jest.spyOn(Task, 'destroy').mockResolvedValue(0);
            const columnDestroy = jest.spyOn(Column, 'destroy').mockResolvedValue(0);
            const { handler, socket } = fakeSocketHandler();

            await ColumnHandler.handleColumnDelete.call(handler, {
                columnData: { id: 7, name: 'Other', task: [{ id: 999 }] },
                kanbanId: 1, _reqContext: {}
            });

            expect(emittedCodes(socket, 'columnDeleteError')).toContain('RESOURCE_MISMATCH');
            expect(taskDestroy).not.toHaveBeenCalled();
            expect(columnDestroy).not.toHaveBeenCalled();
            expect(kanban.update).not.toHaveBeenCalled();
            expect(lastTx.rollback).toHaveBeenCalled();
        });

        it('欄位屬於該專案 → 任務清單由 DB 反查，忽略 client 傳來的 task 陣列', async () => {
            const kanban = { id: 10, column: [5, 6], update: jest.fn(async () => {}) };
            jest.spyOn(Kanban, 'findOne').mockResolvedValue(kanban);
            jest.spyOn(Column, 'findByPk').mockResolvedValue({ id: 5, name: 'Todo', kanbanId: 10, kanban: { id: 10, projectId: 1 } });
            const findAllSpy = jest.spyOn(Task, 'findAll').mockResolvedValue([{ id: 1, __files: ['a.png'] }, { id: 2, __files: [] }]);
            const taskDestroy = jest.spyOn(Task, 'destroy').mockResolvedValue(2);
            const columnDestroy = jest.spyOn(Column, 'destroy').mockResolvedValue(1);
            const { handler, socket, room } = fakeSocketHandler();

            await ColumnHandler.handleColumnDelete.call(handler, {
                columnData: { id: 5, name: 'client name', task: [{ id: 999, __files: ['victim.png'] }] },
                kanbanId: 1, _reqContext: {}
            });

            expect(emittedCodes(socket, 'columnDeleteError')).toEqual([]);
            expect(findAllSpy).toHaveBeenCalledWith(expect.objectContaining({ where: { columnId: 5 } }));
            expect(taskDestroy).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { [Op.in]: [1, 2] } } }));
            expect(columnDestroy).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 5 } }));
            expect(kanban.update).toHaveBeenCalledWith({ column: [6] }, expect.anything());
            expect(minioFileHelper.batchDeleteMinioFiles).toHaveBeenCalledWith(['a.png']);
            expect(room.emit).toHaveBeenCalledWith('columnDeleted', expect.objectContaining({ deletedColumnId: 5, updatedColumns: [6] }));
        });

        it('欄位 row 已不存在但仍在順序陣列 → 只清理順序，不刪任何任務', async () => {
            const kanban = { id: 10, column: [5, 6], update: jest.fn(async () => {}) };
            jest.spyOn(Kanban, 'findOne').mockResolvedValue(kanban);
            jest.spyOn(Column, 'findByPk').mockResolvedValue(null);
            const taskDestroy = jest.spyOn(Task, 'destroy').mockResolvedValue(0);
            const { handler, socket } = fakeSocketHandler();

            await ColumnHandler.handleColumnDelete.call(handler, { columnData: { id: 5, task: [{ id: 999 }] }, kanbanId: 1 });

            expect(emittedCodes(socket, 'columnDeleteError')).toEqual([]);
            expect(kanban.update).toHaveBeenCalledWith({ column: [6] }, expect.anything());
            expect(taskDestroy).not.toHaveBeenCalled();
        });

        it('欄位不存在且不在順序陣列 → COLUMN_NOT_FOUND', async () => {
            const kanban = { id: 10, column: [6], update: jest.fn() };
            jest.spyOn(Kanban, 'findOne').mockResolvedValue(kanban);
            jest.spyOn(Column, 'findByPk').mockResolvedValue(null);
            const { handler, socket } = fakeSocketHandler();

            await ColumnHandler.handleColumnDelete.call(handler, { columnData: { id: 5 }, kanbanId: 1 });

            expect(emittedCodes(socket, 'columnDeleteError')).toContain('COLUMN_NOT_FOUND');
            expect(kanban.update).not.toHaveBeenCalled();
        });
    });

    describe('handleNodeDelete / handleNodeUpdate', () => {
        it('節點屬於其他專案 → 刪除被拒（RESOURCE_MISMATCH）', async () => {
            jest.spyOn(Node, 'findByPk').mockResolvedValue({ id: 3, title: 'N', ideaWallId: 7 });
            jest.spyOn(IdeaWall, 'findByPk').mockResolvedValue({ id: 7, projectId: 99 });
            const destroySpy = jest.spyOn(Node, 'destroy').mockResolvedValue(1);
            const { handler, socket } = fakeSocketHandler();

            await NodeHandler.handleNodeDelete.call(handler, { id: 3, projectId: 1, title: 'client', owner: 'alice' });

            expect(emittedCodes(socket, 'nodeDeleteError')).toContain('RESOURCE_MISMATCH');
            expect(destroySpy).not.toHaveBeenCalled();
        });

        it('節點屬於該專案 → 刪除，標題取自 DB', async () => {
            jest.spyOn(Node, 'findByPk').mockResolvedValue({ id: 3, title: 'DB title', ideaWallId: 7 });
            jest.spyOn(IdeaWall, 'findByPk').mockResolvedValue({ id: 7, projectId: 1 });
            jest.spyOn(NodeRelation, 'destroy').mockResolvedValue(0);
            const destroySpy = jest.spyOn(Node, 'destroy').mockResolvedValue(1);
            const { handler, socket } = fakeSocketHandler();

            await NodeHandler.handleNodeDelete.call(handler, { id: 3, projectId: 1, title: 'client', owner: 'alice' });

            expect(destroySpy).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 3 } }));
            expect(socket.emit).toHaveBeenCalledWith('nodeDeleteSuccess', expect.objectContaining({ code: 'NODE_DELETE_SUCCESS', nodeTitle: 'DB title' }));
        });

        it('節點已不存在 → 冪等成功、不寫入變更日誌', async () => {
            jest.spyOn(Node, 'findByPk').mockResolvedValue(null);
            const destroySpy = jest.spyOn(Node, 'destroy').mockResolvedValue(0);
            const { logNodeChange } = require('../../utils/nodeChangeLogger');
            const { handler, socket } = fakeSocketHandler();

            await NodeHandler.handleNodeDelete.call(handler, { id: 3, projectId: 1 });

            expect(destroySpy).not.toHaveBeenCalled();
            expect(logNodeChange).not.toHaveBeenCalled();
            expect(socket.emit).toHaveBeenCalledWith('nodeDeleteSuccess', expect.objectContaining({ code: 'NODE_DELETE_SUCCESS' }));
        });

        it('節點屬於其他專案 → 更新被拒（RESOURCE_MISMATCH）', async () => {
            jest.spyOn(Node, 'findByPk').mockResolvedValue({ id: 3, title: 'N', ideaWallId: 7, dataValues: {} });
            jest.spyOn(IdeaWall, 'findByPk').mockResolvedValue({ id: 7, projectId: 99 });
            const updateSpy = jest.spyOn(Node, 'update').mockResolvedValue([1]);
            const { handler, socket } = fakeSocketHandler();

            await NodeHandler.handleNodeUpdate.call(handler, { id: 3, projectId: 1, title: 'new', content: 'c' });

            expect(emittedCodes(socket, 'nodeUpdateError')).toContain('RESOURCE_MISMATCH');
            expect(updateSpy).not.toHaveBeenCalled();
        });
    });
});

// ---------- 5. 錯誤報告遮蔽 ----------

describe('errorHandler.sanitizeBody', () => {
    it('遮蔽 currentPassword 等密碼欄位，保留其他欄位', () => {
        const cleaned = sanitizeBody({ currentPassword: 'old-secret', newPassword: 'new-secret', confirmPassword: 'x', note: 'keep' });
        expect(cleaned).toEqual({ currentPassword: '***', newPassword: '***', confirmPassword: '***', note: 'keep' });
    });
});

// ---------- 6. Code review 補強：拖曳／更新／連線／順序 ----------

describe('Socket 其他 handler 的資源歸屬驗證（審查補強）', () => {
    it('handleTaskDrag：任務屬於其他專案 → RESOURCE_MISMATCH，不改 columnId', async () => {
        jest.spyOn(Task, 'findByPk').mockResolvedValue({ id: 42, columnId: 7, column: { id: 7, kanban: { id: 20, projectId: 99 } } });
        jest.spyOn(Column, 'findByPk').mockImplementation(async (id) => ({ id, name: `col-${id}`, task: [], kanban: { id: 10, projectId: 1 }, save: jest.fn() }));
        const updateSpy = jest.spyOn(Task, 'update').mockResolvedValue([1]);
        const { handler, socket } = fakeSocketHandler();

        await TaskHandler.handleTaskDrag.call(handler, { taskId: 42, projectId: 1, source: { columnId: '5', index: 0 }, destination: { columnId: '6', index: 0 } });

        expect(emittedCodes(socket, 'taskDragError')).toContain('RESOURCE_MISMATCH');
        expect(updateSpy).not.toHaveBeenCalled();
        expect(lastTx.rollback).toHaveBeenCalled();
    });

    it('handleTaskDrag：目標欄位屬於其他專案 → RESOURCE_MISMATCH', async () => {
        jest.spyOn(Task, 'findByPk').mockResolvedValue({ id: 42, columnId: 5, column: { id: 5, kanban: { id: 10, projectId: 1 } } });
        jest.spyOn(Column, 'findByPk').mockImplementation(async (id) => ({
            id, name: `col-${id}`, task: [42], save: jest.fn(),
            kanban: { id: id === 5 ? 10 : 20, projectId: id === 5 ? 1 : 99 }
        }));
        const updateSpy = jest.spyOn(Task, 'update').mockResolvedValue([1]);
        const { handler, socket } = fakeSocketHandler();

        await TaskHandler.handleTaskDrag.call(handler, { taskId: 42, projectId: 1, source: { columnId: 5, index: 0 }, destination: { columnId: 6, index: 0 } });

        expect(emittedCodes(socket, 'taskDragError')).toContain('RESOURCE_MISMATCH');
        expect(updateSpy).not.toHaveBeenCalled();
    });

    it('handleTaskUpdate：查不到所屬專案（kanban 為 null）→ fail-closed 拒絕', async () => {
        jest.spyOn(Task, 'findByPk').mockResolvedValue({ id: 42, columnId: 5, dataValues: {}, column: { id: 5, kanban: null } });
        const updateSpy = jest.spyOn(Task, 'update').mockResolvedValue([1]);
        const { handler, socket } = fakeSocketHandler();

        await TaskHandler.handleTaskUpdate.call(handler, { cardData: { id: 42, title: 'x' }, projectId: 1 });

        expect(emittedCodes(socket, 'taskUpdateError')).toContain('RESOURCE_MISMATCH');
        expect(updateSpy).not.toHaveBeenCalled();
        expect(lastTx.rollback).toHaveBeenCalled();
    });

    it('handleCreateNodeRelation：目標節點屬於其他專案 → 不建立連線', async () => {
        jest.spyOn(Node, 'findByPk').mockImplementation(async (id) => ({ id, title: `n${id}`, owner: 'alice', ideaWallId: id === 1 ? 7 : 8 }));
        jest.spyOn(IdeaWall, 'findByPk').mockImplementation(async (id) => ({ id, projectId: id === 7 ? 1 : 99 }));
        const createSpy = jest.spyOn(NodeRelation, 'create').mockResolvedValue({});
        const { handler, socket } = fakeSocketHandler();

        await NodeHandler.handleCreateNodeRelation.call(handler, { from_id: 1, to_id: 2, projectId: 1 });

        expect(createSpy).not.toHaveBeenCalled();
        expect(emittedCodes(socket, 'createNodeRelationError')).toContain('NODE_RELATION_CREATE_ERROR');
    });

    it('handleDeleteNodeRelation：來源節點屬於其他專案 → 不刪連線', async () => {
        jest.spyOn(Node, 'findByPk').mockImplementation(async (id) => ({ id, title: `n${id}`, owner: 'alice', ideaWallId: 8 }));
        jest.spyOn(IdeaWall, 'findByPk').mockResolvedValue({ id: 8, projectId: 99 });
        const destroySpy = jest.spyOn(NodeRelation, 'destroy').mockResolvedValue(1);
        const { handler, socket } = fakeSocketHandler();

        await NodeHandler.handleDeleteNodeRelation.call(handler, { from_id: 1, to_id: 2, projectId: 1 });

        expect(destroySpy).not.toHaveBeenCalled();
        expect(emittedCodes(socket, 'deleteNodeRelationError')).toContain('NODE_RELATION_DELETE_ERROR');
    });

    it('handleColumnOrderChange：過濾非本 kanban 的欄位 ID、去重，並補回漏掉的欄位', async () => {
        jest.spyOn(Kanban, 'findOne').mockResolvedValue({ id: 10, column: [5, 6, 7] });
        jest.spyOn(Column, 'findAll').mockResolvedValue([{ id: 5 }, { id: 6 }, { id: 7 }]);
        const updateSpy = jest.spyOn(Kanban, 'update').mockResolvedValue([1]);
        const { handler } = fakeSocketHandler();

        await ColumnHandler.handleColumnOrderChange.call(handler, { projectId: 1, columnOrder: [7, 999, 5, 7] });

        expect(updateSpy).toHaveBeenCalledWith({ column: [7, 5, 6] }, expect.objectContaining({ where: { id: 10 } }));
    });
});

describe('requireAdmin 一律以 DB 角色為準', () => {
    it('JWT 宣稱 admin 但 DB 為 student → 403', async () => {
        jest.spyOn(User, 'findByPk').mockResolvedValue({ id: 5, role: 'student', username: 'S' });
        const res = fakeRes();
        const next = jest.fn();

        await requireAdmin({ userId: 5, user: { id: 5, role: 'admin' }, url: '/api/admin/users' }, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    it('DB 為 admin → 放行並以 DB 資料覆寫 req.user', async () => {
        jest.spyOn(User, 'findByPk').mockResolvedValue({ id: 5, role: 'admin', username: 'Root' });
        const req = { userId: 5, user: { id: 5, role: 'student' }, url: '/api/admin/users' };
        const next = jest.fn();

        await requireAdmin(req, fakeRes(), next);

        expect(next).toHaveBeenCalled();
        expect(req.user.role).toBe('admin');
    });
});

describe('adminController.updateUserRole（審查補強）', () => {
    const reqFor = (userId, role) => ({ params: { userId: String(userId) }, body: { role }, userId: 99, headers: {} });

    it('非數字 userId → 400，不查 DB', async () => {
        const findSpy = jest.spyOn(User, 'findByPk');
        const res = fakeRes();
        await adminController.updateUserRole(reqFor('abc', 'teacher'), res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(findSpy).not.toHaveBeenCalled();
    });

    it('成功時清除該使用者的 me: 快取', async () => {
        jest.spyOn(User, 'findByPk').mockResolvedValue({ id: 5, account: 'stu', username: 'Stu', role: 'student', update: jest.fn(async () => {}) });
        jest.spyOn(RefreshToken, 'destroy').mockResolvedValue(1);
        const delSpy = jest.spyOn(apiCache, 'del');
        await adminController.updateUserRole(reqFor(5, 'teacher'), fakeRes());
        expect(delSpy).toHaveBeenCalledWith('me:5');
    });

    it('撤銷 refresh token 失敗 → 交易拋錯、回 500、不回成功', async () => {
        jest.spyOn(User, 'findByPk').mockResolvedValue({ id: 5, account: 'stu', username: 'Stu', role: 'student', update: jest.fn(async () => {}) });
        jest.spyOn(RefreshToken, 'destroy').mockRejectedValue(new Error('db down'));
        const res = fakeRes();
        await adminController.updateUserRole(reqFor(5, 'teacher'), res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).not.toHaveBeenCalledWith(expect.objectContaining({ role: 'teacher' }));
    });
});

describe('errorHandler.sanitizeBody 名稱樣式', () => {
    it('遮蔽 apiKey / Authorization / resetToken / PASSWORD_CONFIRM，保留 author', () => {
        const cleaned = sanitizeBody({ apiKey: 'k', Authorization: 'Bearer x', resetToken: 't', PASSWORD_CONFIRM: 'p', author: 'alice' });
        expect(cleaned).toEqual({ apiKey: '***', Authorization: '***', resetToken: '***', PASSWORD_CONFIRM: '***', author: 'alice' });
    });
});
