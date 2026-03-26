//controllers/daily.js
const Daily_personal = require('../models/daily_personal');
const Daily_team = require('../models/daily_team');
const User = require('../models/user');
const Project = require('../models/project');
const Idea_wall = require('../models/idea_wall');
const Node = require('../models/node');
const Kanban = require('../models/kanban');
const Column = require('../models/column');
const Task = require('../models/task');
const { Op, fn, col } = require('sequelize');
const dailyService = require('../services/dailyService');
const { createErrorResponse } = require('../constants/dailyErrorCodes');

/**
 * 班級反思匿名統計
 * GET /daily/class-summary?projectId=X
 *
 * 只回傳聚合數字，不含任何個人內容或姓名。
 * 供學生端「班級情境參考」元件使用，讓學生了解班級均值而不暴露他人資料。
 *
 * 回傳：
 *   { avgWeeklyReflections, totalWeeklyReflections, memberCount }
 */
exports.getClassSummary = async (req, res) => {
    const { projectId } = req.query;
    if (!projectId) return res.status(400).json({ message: '缺少 projectId' });

    try {
        const oneWeekAgo = new Date(Date.now() - 7 * 86_400_000);

        // 本週各成員反思篇數（GROUP BY userId）
        const perUserCounts = await Daily_personal.findAll({
            where: { projectId, createdAt: { [Op.gte]: oneWeekAgo } },
            attributes: ['userId', [fn('COUNT', col('id')), 'count']],
            group: ['userId'],
            raw: true,
        });

        // 本週反思總篇數
        const totalWeeklyReflections = perUserCounts.reduce(
            (sum, row) => sum + parseInt(row.count, 10), 0
        );

        // 專案成員總人數（含老師/學生均計，與前端 teamMembers 一致）
        const memberCount = await User.count({
            include: [{
                model: Project,
                where: { id: projectId },
                through: { attributes: [] },
                attributes: [],
            }],
        });

        const avgWeeklyReflections =
            memberCount > 0
                ? Math.round((totalWeeklyReflections / memberCount) * 10) / 10
                : 0;

        // 全專案想法節點總數：先取所有 ideaWall id，再 count nodes
        const ideaWalls = await Idea_wall.findAll({
            where: { projectId },
            attributes: ['id'],
            raw: true,
        });
        const ideaWallIds = ideaWalls.map(w => w.id);
        const totalIdeaNodes = ideaWallIds.length > 0
            ? await Node.count({ where: { ideaWallId: { [Op.in]: ideaWallIds } } })
            : 0;

        // 全專案看板任務總數：Kanban → columns → tasks
        const kanban = await Kanban.findOne({
            where: { projectId },
            attributes: ['id'],
            raw: true,
        });
        let totalKanbanTasks = 0;
        if (kanban) {
            const columns = await Column.findAll({
                where: { kanbanId: kanban.id },
                attributes: ['id'],
                raw: true,
            });
            const columnIds = columns.map(c => c.id);
            if (columnIds.length > 0) {
                totalKanbanTasks = await Task.count({
                    where: { columnId: { [Op.in]: columnIds } },
                });
            }
        }

        const avgIdeaNodes =
            memberCount > 0 ? Math.round((totalIdeaNodes / memberCount) * 10) / 10 : 0;
        const avgKanbanTasks =
            memberCount > 0 ? Math.round((totalKanbanTasks / memberCount) * 10) / 10 : 0;

        res.status(200).json({
            avgWeeklyReflections,
            totalWeeklyReflections,
            memberCount,
            avgIdeaNodes,
            avgKanbanTasks,
        });
    } catch (err) {
        console.error('❌ 取得班級反思統計失敗:', err);
        res.status(500).json({ message: '伺服器錯誤', error: err.message });
    }
};

exports.getPersonalDaily = async (req, res) => {
    const { userId, projectId, isTeacher } = req.query;
    try {
        let where = { projectId };
        let include = [];

        if (isTeacher === "true") {
            include = [{
                model: User,
                attributes: ['id', 'username', 'account', 'class', 'seatNumber', 'role'],
                where: { role: 'student' }
            }];
        } else {
            where.userId = userId;
        }

        const personalDaily = await dailyService.getDailies(Daily_personal, where, include);
        res.status(200).json(personalDaily);
    } catch (err) {
        console.error("❌ 取得個人日誌失敗:", err);
        res.status(500).json(createErrorResponse('QUERY_FAILED', err.message));
    }
};

exports.createPersonalDaily = async (req, res) => {
    try {
        const { title, content } = req.body;
        if (!title) return res.status(400).json(createErrorResponse('EMPTY_TITLE'));
        if (!content) return res.status(400).json(createErrorResponse('EMPTY_CONTENT'));

        const files = req.uploadedFiles || [];
        await dailyService.createDaily('personal', req.body, files, req);
        
        res.status(200).send({ message: 'create success!' });
    } catch (err) {
        console.error('❌ 創建個人日誌失敗:', err);
        res.status(500).json(createErrorResponse('CREATE_FAILED', err.message));
    }
};

exports.getTeamDaily = async (req, res) => {
    const { projectId } = req.query;
    try {
        const teamDaily = await dailyService.getDailies(Daily_team, { projectId });
        res.status(200).json(teamDaily);
    } catch (err) {
        console.error('❌ 取得團隊日誌失敗:', err);
        res.status(500).json(createErrorResponse('QUERY_FAILED', err.message));
    }
};

exports.createTeamDaily = async (req, res) => {
    try {
        const { title } = req.body;
        if (!title) return res.status(400).json(createErrorResponse('EMPTY_TITLE'));

        const files = req.uploadedFiles || [];
        await dailyService.createDaily('team', req.body, files, req);
        
        res.status(200).send({ message: 'create success!' });
    } catch (err) {
        console.error('❌ 創建團隊日誌失敗:', err);
        res.status(500).json(createErrorResponse('CREATE_FAILED', err.message));
    }
};

exports.updatePersonalDaily = async (req, res) => {
    try {
        const { id } = req.params;
        const files = (req.uploadedFiles && req.uploadedFiles.length > 0) 
            ? req.uploadedFiles 
            : (req.uploadedFile ? [req.uploadedFile] : []);

        const daily = await dailyService.updateDaily('personal', id, req.body, files, req);
        if (!daily) return res.status(404).json(createErrorResponse('DAILY_NOT_FOUND'));

        res.status(200).json({ message: "更新成功", data: daily });
    } catch (error) {
        console.error("❌ 更新個人日誌錯誤:", error);
        res.status(500).json(createErrorResponse('UPDATE_FAILED', error.message));
    }
};

exports.updateTeamDaily = async (req, res) => {
    try {
        const { id } = req.params;
        const files = (req.uploadedFiles && req.uploadedFiles.length > 0) 
            ? req.uploadedFiles 
            : (req.uploadedFile ? [req.uploadedFile] : []);

        const daily = await dailyService.updateDaily('team', id, req.body, files, req);
        if (!daily) return res.status(404).json(createErrorResponse('DAILY_NOT_FOUND'));

        res.status(200).json({ message: "更新成功", data: daily });
    } catch (error) {
        console.error("❌ 更新團隊日誌錯誤:", error);
        res.status(500).json(createErrorResponse('UPDATE_FAILED', error.message));
    }
};

exports.removePersonalAttachment = async (req, res) => {
    try {
        const { id } = req.params;
        const daily = await dailyService.removeAttachment('personal', id, req);
        if (!daily) return res.status(404).json(createErrorResponse('DAILY_NOT_FOUND'));
        res.status(200).json({ message: '附件已移除', data: daily });
    } catch (error) {
        console.error('❌ 移除個人日誌附件失敗:', error);
        res.status(500).json(createErrorResponse('DELETE_ATTACHMENT_FAILED', error.message));
    }
};

exports.removeTeamAttachment = async (req, res) => {
    try {
        const { id } = req.params;
        const daily = await dailyService.removeAttachment('team', id, req);
        if (!daily) return res.status(404).json(createErrorResponse('DAILY_NOT_FOUND'));
        res.status(200).json({ message: '附件已移除', data: daily });
    } catch (error) {
        console.error('❌ 移除小組日誌附件失敗:', error);
        res.status(500).json(createErrorResponse('DELETE_ATTACHMENT_FAILED', error.message));
    }
};

exports.deletePersonalDaily = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await dailyService.deleteDaily('personal', id, req);
        if (!result) return res.status(404).json(createErrorResponse('DAILY_NOT_FOUND'));
        res.status(200).json({ message: "個人日誌刪除成功" });
    } catch (error) {
        console.error("❌ 刪除個人日誌錯誤:", error);
        res.status(500).json(createErrorResponse('DELETE_FAILED', error.message));
    }
};

exports.deleteTeamDaily = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await dailyService.deleteDaily('team', id, req);
        if (!result) return res.status(404).json(createErrorResponse('DAILY_NOT_FOUND'));
        res.status(200).json({ message: "團隊日誌刪除成功" });
    } catch (error) {
        console.error("❌ 刪除團隊日誌錯誤:", error);
        res.status(500).json(createErrorResponse('DELETE_FAILED', error.message));
    }
};
