const ChatTurn = require('../models/chat_turn');
const Project = require('../models/project');
const { Op } = require('sequelize');
const sequelize = require('../util/database');

// GET /api/projects/:projectId/chat
// Query param: sessionId (optional, defaults to 'default')
exports.listByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { sessionId = 'default' } = req.query;

    const rows = await ChatTurn.findAll({
      where: {
        projectId: parseInt(projectId, 10),
        sessionId: sessionId || 'default'
      },
      order: [['createdAt', 'ASC']],
      // Include thinkingContent and sessionId for new Project Assistant feature
      attributes: ['id', 'projectId', 'projectName', 'userId', 'username',
                   'userContent', 'assistantContent', 'assistantUsername',
                   'thinkingContent', 'sessionId', 'createdAt', 'updatedAt'],
    });
    res.json(rows);
  } catch (error) {
    console.error('List chat turns error:', error);
    res.status(500).json({ message: '讀取歷史訊息時發生錯誤', error: error.message });
  }
};

// GET /api/projects/:projectId/chat/sessions
// List all unique sessions for a project with metadata
exports.listSessions = async (req, res) => {
  try {
    const { projectId } = req.params;
    const pid = parseInt(projectId, 10);

    // Query to get distinct sessions with first message as session name
    const sessions = await ChatTurn.findAll({
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
    let firstMessagesMap = new Map();
    
    if (sessions.length > 0) {
        // Use a raw query to find the first user message content for each session efficiently
        // Finds the message with the minimum ID (earliest) for each session where userContent exists
        const query = `
            SELECT ct.sessionId, ct.userContent
            FROM chat_turns ct
            INNER JOIN (
                SELECT MIN(id) as id
                FROM chat_turns
                WHERE projectId = :projectId 
                AND userContent IS NOT NULL
                GROUP BY sessionId
            ) first_ids ON ct.id = first_ids.id
        `;
        
        const firstMessages = await sequelize.query(query, {
            replacements: { projectId: pid },
            type: sequelize.QueryTypes.SELECT
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
    console.error('List sessions error:', error);
    res.status(500).json({ message: '讀取對話列表時發生錯誤', error: error.message });
  }
};

// DELETE /api/projects/:projectId/chat/sessions/:sessionId
// Delete all chat turns in a session
exports.deleteSession = async (req, res) => {
  try {
    const { projectId, sessionId } = req.params;

    const deletedCount = await ChatTurn.destroy({
      where: {
        projectId: parseInt(projectId, 10),
        sessionId: sessionId,
      },
    });

    if (deletedCount === 0) {
      return res.status(404).json({ message: '找不到該對話' });
    }

    res.json({ message: '對話已刪除', deletedCount });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ message: '刪除對話時發生錯誤', error: error.message });
  }
};

// POST /api/projects/:projectId/chat
// Creates a chat turn. Body may include user and/or assistant content.
exports.create = async (req, res) => {
  try {
    const { projectId } = req.params;
    const {
      userId = null,
      username = null,
      userContent = null,
      assistantContent = null,
      assistantUsername = 'AI 導師',
      thinkingContent = null,  // Support thinking content
      sessionId = 'default',  // Support sessionId (defaults to 'default' for backward compatibility)
      projectName: bodyProjectName = null
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

    const created = await ChatTurn.create({
      projectId: parseInt(projectId, 10),
      projectName,
      userId: userId ? parseInt(userId, 10) : null,
      username,
      userContent,
      assistantContent,
      assistantUsername: assistantUsername || 'AI 導師',
      thinkingContent,  // Include thinking content
      sessionId: sessionId || 'default',  // Include sessionId
    });
    res.status(201).json(created);
  } catch (error) {
    console.error('Create chat turn error:', error);
    res.status(500).json({ message: '建立對話回合時發生錯誤', error: error.message });
  }
};

// PUT /api/projects/:projectId/chat/:id
// Completes a chat turn by adding/updating assistant content
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      assistantContent,
      assistantUsername = 'AI 導師',
      thinkingContent  // Support thinking content update
    } = req.body || {};

    const turn = await ChatTurn.findByPk(id);
    if (!turn) return res.status(404).json({ message: '回合不存在' });

    // Build update object with only provided fields
    const updateData = {
      assistantUsername: assistantUsername || 'AI 導師'
    };
    if (assistantContent !== undefined) updateData.assistantContent = assistantContent;
    if (thinkingContent !== undefined) updateData.thinkingContent = thinkingContent;

    await turn.update(updateData);
    res.json(turn);
  } catch (error) {
    console.error('Update chat turn error:', error);
    res.status(500).json({ message: '更新對話回合時發生錯誤', error: error.message });
  }
};
