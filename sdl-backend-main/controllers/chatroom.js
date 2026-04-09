// const  Chatroom_message  = require('../models/chatroom_message'); // 确保路径正确
const Chatroom_message = require('../models/chatroom_message')

exports.getChatroomHistory = async (req, res) => {
    const projectId = req.params.projectId;
    console.log("Chatroom_message",Chatroom_message); // 查看输出，确保它不是 undefined

    try {
        const result = await Chatroom_message.findAll({
            where: { projectId: projectId },
            order: [['createdAt', 'ASC']]
        });
        res.status(200).json(result);
    } catch (err) {
        console.error('取得聊天室歷史訊息失敗:', err);
        res.status(500).json({ message: '取得聊天室歷史訊息失敗' });
    }
};
