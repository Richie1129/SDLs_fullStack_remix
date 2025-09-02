const ChatTurn = require('../models/chat_turn');

// GET /api/projects/:projectId/chat
exports.listByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const rows = await ChatTurn.findAll({
      where: { projectId: parseInt(projectId, 10) },
      order: [['createdAt', 'ASC']],
    });
    res.json(rows);
  } catch (error) {
    console.error('List chat turns error:', error);
    res.status(500).json({ message: '讀取歷史訊息時發生錯誤', error: error.message });
  }
};

// POST /api/projects/:projectId/chat
// Creates a chat turn. Body may include user and/or assistant content.
exports.create = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId = null, username = null, userContent = null, assistantContent = null, assistantUsername = 'AI 導師' } = req.body || {};

    const created = await ChatTurn.create({
      projectId: parseInt(projectId, 10),
      userId: userId ? parseInt(userId, 10) : null,
      username,
      userContent,
      assistantContent,
      assistantUsername: assistantUsername || 'AI 導師',
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
    const { assistantContent, assistantUsername = 'AI 導師' } = req.body || {};
    const turn = await ChatTurn.findByPk(id);
    if (!turn) return res.status(404).json({ message: '回合不存在' });
    await turn.update({ assistantContent, assistantUsername: assistantUsername || 'AI 導師' });
    res.json(turn);
  } catch (error) {
    console.error('Update chat turn error:', error);
    res.status(500).json({ message: '更新對話回合時發生錯誤', error: error.message });
  }
};

