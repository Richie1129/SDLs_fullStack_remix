/**
 * 專案存取判定（共用）
 *
 * 之前「使用者是否能碰這個專案」在四個地方各寫一份（UserProject 直查、
 * Project include User、UserProject.findAll 交集、原生 SQL）。這裡統一成一個入口，
 * 讓 IDOR 修復的各路由不用再各自複製一份，也讓 teacher 的放行範圍只有一個判斷點。
 *
 * 判定順序（由便宜到貴）：
 *   1. 專案成員（user_projects 直查）
 *   2. 角色查 DB（不信任 JWT 的 role，與 requireAdmin 的方針一致）
 *      - admin  → 放行
 *      - teacher → 放行（目前對所有專案放行，維持 checkProjectOwnerOrTeacher 現況）
 *   3. 專案指導教師（project.mentorId）
 *   4. 跨班觀摩者（allowViewer=true 時才算；規則抄自 checkProjectViewingPermission）
 */
const Project = require('../models/project');
const User = require('../models/user');
const UserProject = require('../models/user_project');
const Task = require('../models/task');
const Column = require('../models/column');
const Kanban = require('../models/kanban');
const Question = require('../models/question');
const Comment = require('../models/comment');

const NO_ACCESS = Object.freeze({ allowed: false, level: null });

function toPositiveInt(value) {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * @param {number|string} userId
 * @param {number|string} projectId
 * @param {{ allowViewer?: boolean }} [options] allowViewer：是否把跨班觀摩者算進去（唯讀情境才開）
 * @returns {Promise<{ allowed: boolean, level: 'member'|'admin'|'teacher'|'mentor'|'viewer'|null }>}
 */
async function getProjectAccess(userId, projectId, { allowViewer = false } = {}) {
    const uid = toPositiveInt(userId);
    const pid = toPositiveInt(projectId);
    if (!uid || !pid) return NO_ACCESS;

    const membership = await UserProject.findOne({
        where: { userId: uid, projectId: pid },
        attributes: ['userId']
    });
    if (membership) return { allowed: true, level: 'member' };

    const user = await User.findByPk(uid, { attributes: ['id', 'role', 'class', 'school_id'] });
    if (!user) return NO_ACCESS;

    if (user.role === 'admin') return { allowed: true, level: 'admin' };
    // teacher 目前對所有專案放行；未來要收斂成 project.mentorId 綁定時，只改這一行。
    if (user.role === 'teacher') return { allowed: true, level: 'teacher' };

    const project = await Project.findByPk(pid, {
        attributes: ['id', 'mentorId', 'is_open_for_viewing', 'allowed_classes', 'school_id']
    });
    if (!project) return NO_ACCESS;

    if (project.mentorId === user.id) return { allowed: true, level: 'mentor' };

    if (allowViewer) {
        const bothHaveSchool = project.school_id != null && user.school_id != null;
        const schoolMatch = !bothHaveSchool || project.school_id === user.school_id;
        const isViewer = Boolean(project.is_open_for_viewing)
            && Array.isArray(project.allowed_classes)
            && schoolMatch
            && project.allowed_classes.includes(user.class);
        if (isViewer) return { allowed: true, level: 'viewer' };
    }

    return NO_ACCESS;
}

async function canAccessProject(userId, projectId, options) {
    return (await getProjectAccess(userId, projectId, options)).allowed;
}

/**
 * 使用者在 DB 裡的角色是否為 teacher 或 admin（不採信 JWT）
 */
async function isTeacherOrAdmin(userId) {
    const uid = toPositiveInt(userId);
    if (!uid) return false;
    const user = await User.findByPk(uid, { attributes: ['id', 'role'] });
    return !!user && (user.role === 'teacher' || user.role === 'admin');
}

function setProjectIdOnRequest(req, projectId) {
    req.params.projectId = projectId;
    if (req.body && typeof req.body === 'object') req.body.projectId = projectId;
    req.query.projectId = projectId;
}

/**
 * taskId → projectId（task → column → kanban），供 checkProjectViewingPermission 使用。
 * 原本 routes/comments.js 與 routes/kanban.js 各有一份，這裡合併。
 */
const getProjectIdFromTask = async (req, res, next) => {
    try {
        const taskId = req.params.taskId || req.body?.taskId || req.params.commentIdTaskId;

        // 樂觀 UI 的暫存任務尚未進 DB，沒有 projectId 可查
        if (taskId && taskId.toString().startsWith('temp-')) {
            return res.status(404).json({ message: '暫存任務無法獲取評論', code: 'TEMP_TASK' });
        }
        if (!taskId) return res.status(400).json({ message: '缺少 taskId 參數', code: 'MISSING_TASK_ID' });

        const task = await Task.findByPk(taskId, {
            include: [{
                model: Column,
                include: [{ model: Kanban, attributes: ['projectId'] }]
            }]
        });
        if (!task || !task.column || !task.column.kanban) {
            return res.status(404).json({ message: '任務或相關專案不存在', code: 'TASK_NOT_FOUND' });
        }

        setProjectIdOnRequest(req, task.column.kanban.projectId);
        next();
    } catch (error) {
        console.error('從 taskId 獲取 projectId 錯誤:', error);
        return res.status(500).json({ message: '獲取專案資訊時發生錯誤' });
    }
};

/**
 * questionId → projectId，並把 question 掛到 req.questionRecord 供 controller 判斷本人
 */
const getProjectIdFromQuestion = async (req, res, next) => {
    try {
        const questionId = toPositiveInt(req.params.questionId);
        if (!questionId) return res.status(400).json({ message: '缺少或無效的 questionId 參數', code: 'INVALID_QUESTION_ID' });

        const question = await Question.findByPk(questionId, { attributes: ['id', 'projectId', 'userId'] });
        if (!question) return res.status(404).json({ message: '問答室不存在', code: 'QUESTION_NOT_FOUND' });

        req.questionRecord = question;
        setProjectIdOnRequest(req, question.projectId);
        next();
    } catch (error) {
        console.error('從 questionId 獲取 projectId 錯誤:', error);
        return res.status(500).json({ message: '獲取專案資訊時發生錯誤' });
    }
};

/**
 * commentId → projectId（comment → task → column → kanban）
 * 原本在 routes/comments.js，與 getProjectIdFromTask 一併集中管理。
 */
const getProjectIdFromComment = async (req, res, next) => {
    try {
        const commentId = toPositiveInt(req.params.commentId);
        if (!commentId) return res.status(400).json({ message: '缺少或無效的 commentId 參數', code: 'INVALID_COMMENT_ID' });

        const comment = await Comment.findByPk(commentId, {
            include: [{
                model: Task,
                include: [{
                    model: Column,
                    include: [{ model: Kanban, attributes: ['projectId'] }]
                }]
            }]
        });
        const projectId = comment?.task?.column?.kanban?.projectId;
        if (!projectId) return res.status(404).json({ message: '無法解析評論所屬專案', code: 'COMMENT_NOT_FOUND' });

        setProjectIdOnRequest(req, projectId);
        next();
    } catch (error) {
        console.error('從 commentId 獲取 projectId 錯誤:', error);
        return res.status(500).json({ message: '獲取專案資訊時發生錯誤' });
    }
};

module.exports = {
    getProjectAccess,
    canAccessProject,
    isTeacherOrAdmin,
    getProjectIdFromTask,
    getProjectIdFromQuestion,
    getProjectIdFromComment,
    toPositiveInt
};
