const Chatroom_message = require('../models/chatroom_message')

const { Op } = require('sequelize');

// 預設只回最新 N 筆（B9：聊天史隨學期線性成長，不能整段撈）
const CHATROOM_HISTORY_DEFAULT_LIMIT = 200;
const CHATROOM_HISTORY_MAX_LIMIT = 500;

/**
 * GET /api/chatroom/:projectId
 * 回傳格式不變：訊息陣列，依 createdAt 由舊到新。
 * 可選 query：
 * - limit：最多幾筆（預設 200，上限 500）
 * - before：訊息 id，只取 id 小於此值的更早訊息（往前翻頁用）
 */
exports.getChatroomHistory = async (req, res) => {
    const projectId = req.params.projectId;

    const parsedLimit = parseInt(req.query.limit, 10);
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, CHATROOM_HISTORY_MAX_LIMIT)
        : CHATROOM_HISTORY_DEFAULT_LIMIT;
    const parsedBefore = parseInt(req.query.before, 10);
    const before = Number.isFinite(parsedBefore) && parsedBefore > 0 ? parsedBefore : null;

    try {
        const where = { projectId };
        if (before) where.id = { [Op.lt]: before };

        // 先以新到舊取最後 N 筆，再反轉成舊到新，維持既有回應順序
        const rows = await Chatroom_message.findAll({
            where,
            order: [['createdAt', 'DESC'], ['id', 'DESC']],
            limit,
        });
        rows.reverse();
        res.status(200).json(rows);
    } catch (err) {
        console.error('取得聊天室歷史訊息失敗:', err);
        res.status(500).json({ message: '取得聊天室歷史訊息失敗' });
    }
};
