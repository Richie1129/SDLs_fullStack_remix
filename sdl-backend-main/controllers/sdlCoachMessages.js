// SDL Coach 對話紀錄 controller
// 原名 chatTurns.js（對應舊表 chat_turns），2026-04-17 rename 為 sdl_coach_messages
// 相關檔案：
//   - models/sdl_coach_message.js
//   - migrations/20260417000002-rename-chat-turns-to-sdl-coach-messages.js
//   - routes/project.js（掛在 /api/projects/:projectId/chat*，URL 保留不變）

const SdlCoachMessage = require('../models/sdl_coach_message');
const Project = require('../models/project');
const sequelize = require('../util/database');

// GET /api/projects/:projectId/chat
// Query param: sessionId (optional, defaults to 'default')
exports.listByProject = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { sessionId = 'default' } = req.query;

        const rows = await SdlCoachMessage.findAll({
            where: {
                projectId: parseInt(projectId, 10),
                sessionId: sessionId || 'default',
            },
            order: [['createdAt', 'ASC']],
            attributes: ['id', 'projectId', 'projectName', 'userId', 'username',
                'userContent', 'assistantContent', 'assistantUsername',
                'thinkingContent', 'sessionId', 'createdAt', 'updatedAt'],
        });
        res.json(rows);
    } catch (error) {
        console.error('List SDL Coach messages error:', error);
        res.status(500).json({ message: '讀取歷史訊息時發生錯誤', error: error.message });
    }
};

// GET /api/projects/:projectId/chat/sessions
// 列出專案下所有唯一 session 與摘要
exports.listSessions = async (req, res) => {
    try {
        const { projectId } = req.params;
        const pid = parseInt(projectId, 10);

        // ORM 端依 sessionId 分組取計數與最新時間
        const sessions = await SdlCoachMessage.findAll({
            where: { projectId: pid },
            attributes: [
                'sessionId',
                [sequelize.fn('MIN', sequelize.col('createdAt')), 'createdAt'],
                [sequelize.fn('MAX', sequelize.col('updatedAt')), 'updatedAt'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'messageCount'],
            ],
            group: ['sessionId'],
            order: [[sequelize.fn('MAX', sequelize.col('updatedAt')), 'DESC']],
            raw: true,
        });

        // Batch fetch first user messages to avoid N+1
        // 注意：DB 欄位名混用 camelCase（projectId / userContent）與 snake_case（session_id）
        //   - camelCase 欄位建立時未加雙引號 → PG 會 lowercase 成 projectid / usercontent，不需 quote
        //   - snake_case 欄位 session_id 可直接引用
        // 原版 raw SQL 用 ct.sessionId 在 PG 實際被解析為 sessionid（不存在），會 fail；
        // 這裡改成顯式 session_id 才正確對應 DB column。
        let firstMessagesMap = new Map();
        if (sessions.length > 0) {
            const query = `
                SELECT ct.session_id AS "sessionId", ct."userContent"
                FROM sdl_coach_messages ct
                INNER JOIN (
                    SELECT MIN(id) AS id
                    FROM sdl_coach_messages
                    WHERE "projectId" = :projectId
                      AND "userContent" IS NOT NULL
                    GROUP BY session_id
                ) first_ids ON ct.id = first_ids.id
            `;
            const firstMessages = await sequelize.query(query, {
                replacements: { projectId: pid },
                type: sequelize.QueryTypes.SELECT,
            });
            firstMessagesMap = new Map(firstMessages.map(m => [m.sessionId, m.userContent]));
        }

        const enrichedSessions = sessions.map(session => {
            const userContent = firstMessagesMap.get(session.sessionId);
            return {
                id: session.sessionId,
                sessionId: session.sessionId,
                name: userContent?.substring(0, 50) || `對話 ${session.sessionId.substring(0, 8)}`,
                messageCount: parseInt(session.messageCount, 10),
                createdAt: session.createdAt,
                updatedAt: session.updatedAt,
            };
        });

        res.json(enrichedSessions);
    } catch (error) {
        console.error('List SDL Coach sessions error:', error);
        res.status(500).json({ message: '讀取對話列表時發生錯誤', error: error.message });
    }
};

// DELETE /api/projects/:projectId/chat/sessions/:sessionId
// 刪除 session 下的所有訊息
exports.deleteSession = async (req, res) => {
    try {
        const { projectId, sessionId } = req.params;

        const deletedCount = await SdlCoachMessage.destroy({
            where: {
                projectId: parseInt(projectId, 10),
                sessionId,
            },
        });

        if (deletedCount === 0) {
            return res.status(404).json({ message: '找不到該對話' });
        }

        res.json({ message: '對話已刪除', deletedCount });
    } catch (error) {
        console.error('Delete SDL Coach session error:', error);
        res.status(500).json({ message: '刪除對話時發生錯誤', error: error.message });
    }
};

// POST /api/projects/:projectId/chat
// 建立一輪訊息（user + assistant 可分別給）
exports.create = async (req, res) => {
    try {
        const { projectId } = req.params;
        const {
            userId = null,
            username = null,
            userContent = null,
            assistantContent = null,
            assistantUsername = 'AI 導師',
            thinkingContent = null,
            sessionId = 'default',
            projectName: bodyProjectName = null,
        } = req.body || {};

        let projectName = bodyProjectName;
        if (!projectName && projectId) {
            try {
                const p = await Project.findByPk(projectId, { attributes: ['name'] });
                projectName = p?.name || null;
            } catch (_) {
                projectName = null;
            }
        }

        const created = await SdlCoachMessage.create({
            projectId: parseInt(projectId, 10),
            projectName,
            userId: userId ? parseInt(userId, 10) : null,
            username,
            userContent,
            assistantContent,
            assistantUsername: assistantUsername || 'AI 導師',
            thinkingContent,
            sessionId: sessionId || 'default',
        });
        res.status(201).json(created);
    } catch (error) {
        console.error('Create SDL Coach message error:', error);
        res.status(500).json({ message: '建立對話回合時發生錯誤', error: error.message });
    }
};

// PUT /api/projects/:projectId/chat/:id
// 補上 assistant 回應（支援 streaming 完成後回填）
exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            assistantContent,
            assistantUsername = 'AI 導師',
            thinkingContent,
        } = req.body || {};

        const turn = await SdlCoachMessage.findByPk(id);
        if (!turn) return res.status(404).json({ message: '回合不存在' });

        const updateData = {
            assistantUsername: assistantUsername || 'AI 導師',
        };
        if (assistantContent !== undefined) updateData.assistantContent = assistantContent;
        if (thinkingContent !== undefined) updateData.thinkingContent = thinkingContent;

        await turn.update(updateData);
        res.json(turn);
    } catch (error) {
        console.error('Update SDL Coach message error:', error);
        res.status(500).json({ message: '更新對話回合時發生錯誤', error: error.message });
    }
};
