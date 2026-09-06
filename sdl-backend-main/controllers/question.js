const Question = require('../models/question')
const QuestionMessage = require('../models/question_message')
const { logAudit } = require('../services/auditService');
const { isTeacherOrAdmin, isAdmin, getProjectAccess, toPositiveInt } = require('../middlewares/projectAccess');

/**
 * 問答室是學生向老師的私訊：本人、admin、或該專案的指導教師（mentor）才可查看／刪除。
 * 教師不再對所有專案放行（2026-09-05，future-list F021）。
 * questionRecord 由 middlewares/projectAccess.js 的 getProjectIdFromQuestion 掛在 req.questionRecord。
 */
async function canAccessQuestionRecord(userId, questionRecord) {
    if (!questionRecord) return false;
    if (questionRecord.userId === userId) return true;
    if (await isAdmin(userId)) return true;
    if (questionRecord.projectId) {
        const access = await getProjectAccess(userId, questionRecord.projectId);
        if (access.level === 'mentor') return true;
    }
    return false;
}

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
        if (!(await canAccessQuestionRecord(req.userId, req.questionRecord))) {
            return res.status(403).json({ message: '無權查看此問答室', code: 'PERMISSION_DENIED' });
        }

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
    const { title, projectId } = req.body;
    const userId = req.userId; // 一律取自已驗證的 token，避免用 body 的 userId 冒名建立聊天室
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
    try {
        const { message } = req.body;
        const questionId = toPositiveInt(req.body.questionId);
        if (!message) {
            return res.status(400).json({ message: '請輸入訊息內容', code: 'EMPTY_MESSAGE' });
        }
        if (!questionId) {
            return res.status(400).json({ message: '缺少或無效的 questionId', code: 'INVALID_QUESTION_ID' });
        }

        // 只能對自己有權存取的問答室發言（questionId 來自 body，不可信）
        const question = await Question.findByPk(questionId, { attributes: ['id', 'projectId', 'userId'] });
        if (!question) {
            return res.status(404).json({ message: '問答室不存在', code: 'QUESTION_NOT_FOUND' });
        }
        if (!(await canAccessQuestionRecord(req.userId, question))) {
            return res.status(403).json({ message: '無權在此問答室發言', code: 'PERMISSION_DENIED' });
        }

        // author 只是前端用來區分訊息樣式的字面值（'teacher' / 'student'），
        // 改由 DB 角色推導，不採信 body，避免學生冒充教師發言
        const author = (await isTeacherOrAdmin(req.userId)) ? 'teacher' : 'student';

        const msg = await QuestionMessage.create({ message, author, questionId });

        // 記錄審計事件（非阻塞）
        logAudit(req, {
            action: 'CHATROOM_MESSAGE_SEND',
            targetType: 'QuestionMessage',
            targetId: msg.id,
            projectId: question.projectId ?? null,
            metadata: {
                questionId,
                author,
                messageLength: message.length
            }
        }).catch(err => {
            console.error('記錄審計事件失敗（發送聊天室訊息）:', err);
        });

        return res.status(200).send({ message: 'create success!' });
    } catch (err) {
        console.error('建立聊天室訊息失敗:', err);
        return res.status(500).json({ message: '發送訊息失敗', code: 'CREATE_MESSAGE_FAILED' });
    }
}


exports.deleteChatroom = async (req, res) => {
    const questionId = req.params.questionId;
    try {
        const chatroom = req.questionRecord || await Question.findByPk(questionId);
        if (!chatroom) {
            return res.status(404).send({ message: 'Chatroom not found!' });
        }

        if (!(await canAccessQuestionRecord(req.userId, chatroom))) {
            return res.status(403).json({ message: '無權刪除此問答室', code: 'PERMISSION_DENIED' });
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