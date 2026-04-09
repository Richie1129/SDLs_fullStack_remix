const Question = require('../models/question')
const QuestionMessage = require('../models/question_message')
const { logAudit } = require('../services/auditService');

exports.getAllChatrooms = async (req, res) => {
    const projectId = req.params.projectId;

    try {
        const result = await Question.findAll({
            where: { projectId: projectId }
        });
        res.status(200).json(result);
    } catch (err) {
        console.error('取得所有聊天室失敗:', err);
        res.status(500).json({ message: '取得聊天室列表失敗' });
    }
};

exports.getUserChatrooms = async (req, res) => {
    const projectId = req.params.projectId;
    const userId = req.params.userId;

    try {
        const result = await Question.findAll({
            where: {
                projectId: projectId,
                userId: userId
            }
        });
        res.status(200).json(result);
    } catch (err) {
        console.error('取得用戶聊天室失敗:', err);
        res.status(500).json({ message: '取得用戶聊天室失敗' });
    }
};

exports.getMessages = async (req, res) => {
    const questionId = req.params.questionId;

    try {
        const result = await QuestionMessage.findAll({
            where: { questionId: questionId }
        });
        res.status(200).json(result);
    } catch (err) {
        console.error('取得聊天室訊息失敗:', err);
        res.status(500).json({ message: '取得聊天室訊息失敗' });
    }
};

exports.createChatroom = async (req, res) => {
    const { title, userId, projectId } = req.body;
    if (!title) {
        return res.status(404).send({ message: 'please enter title!' })
    }

    await Question.create({
        userId: userId,
        projectId: projectId,
        title: title,
    })
        .then((chatroom) => {
            // 記錄審計事件（非阻塞）
            logAudit(req, {
                action: 'CHATROOM_CREATE',
                targetType: 'Question',
                targetId: chatroom.id,
                projectId: projectId,
                metadata: {
                    title: title,
                    userId: userId,
                    projectId: projectId
                }
            }).catch(err => {
                console.error('記錄審計事件失敗（建立聊天室）:', err);
            });
            return res.status(200).send({ message: 'create success!' });
        })
        .catch(err => {
            console.log(err);
            return res.status(500).send({ message: 'create failed!' });
        });
}

exports.createMessage = async (req, res) => {
    const { message, author, questionId } = req.body;
    if (!message) {
        return res.status(404).send({ message: 'please enter title!' })
    }
    if (!author) {
        return res.status(404).send({ message: 'please enter author!' })
    }

    await QuestionMessage.create({
        message: message,
        author: author,
        questionId: questionId,
    })
        .then((msg) => {
            // 記錄審計事件（非阻塞）
            logAudit(req, {
                action: 'CHATROOM_MESSAGE_SEND',
                targetType: 'QuestionMessage',
                targetId: msg.id,
                projectId: null,
                metadata: {
                    questionId: questionId,
                    author: author,
                    messageLength: message ? message.length : 0
                }
            }).catch(err => {
                console.error('記錄審計事件失敗（發送聊天室訊息）:', err);
            });
            return res.status(200).send({ message: 'create success!' });
        })
        .catch(err => {
            console.log(err);
            return res.status(500).send({ message: 'create failed!' });
        });
}


exports.deleteChatroom = async (req, res) => {
    const questionId = req.params.questionId;
    try {
        const chatroom = await Question.findByPk(questionId);
        if (!chatroom) {
            return res.status(404).send({ message: 'Chatroom not found!' });
        }

        await Question.destroy({
            where: { id: questionId }
        });
        await QuestionMessage.destroy({
            where: { questionId: questionId }
        });

        res.status(200).send({ message: 'Chatroom deleted successfully!' });
    } catch (err) {
        console.log(err);
        res.status(500).send({ message: 'Failed to delete chatroom.' });
    }
}