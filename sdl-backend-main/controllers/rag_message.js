// controller for rag_message
const Rag_message = require('../models/rag_message');

// 根據 userId 取得所有 RAG 訊息歷史
exports.getRagMessageHistory = async (req, res) => {
    const userId = req.params.userId;
    console.log("取得用戶 RAG 訊息歷史，userId:", userId);

    try {
        const messages = await Rag_message.findAll({
            attributes: ['id', 'userId', 'userName', 'input_message', 'response_message', 'sessionId', 'createdAt'],
            where: { userId: userId },
            order: [['createdAt', 'ASC']]
        });

        console.log("找到的訊息數量:", messages.length);
        res.status(200).json(messages);
    } catch (err) {
        console.error("取得歷史紀錄錯誤:", err);
        res.status(500).json({ error: '無法取得歷史紀錄' });
    }
};

// 根據 userId 和 sessionId 取得特定會話的訊息歷史
exports.getRagMessageBySession = async (req, res) => {
    const { userId, sessionId } = req.params;
    console.log("取得特定會話的 RAG 訊息，userId:", userId, "sessionId:", sessionId);

    try {
        // 先嘗試取得基本欄位
        let attributes = ['id', 'userId', 'userName', 'input_message', 'response_message', 'sessionId', 'createdAt'];
        
        // 檢查是否存在 ragflow_session_id 欄位
        try {
            const tableDescription = await Rag_message.describe();
            if (tableDescription.ragflow_session_id) {
                attributes.push('ragflow_session_id');
                console.log("已包含 ragflow_session_id 欄位");
            } else {
                console.log("ragflow_session_id 欄位尚未存在，使用基本欄位");
            }
        } catch (describeError) {
            console.log("無法檢查表結構，使用基本欄位:", describeError.message);
        }

        const messages = await Rag_message.findAll({
            attributes: attributes,
            where: { 
                userId: userId,
                sessionId: sessionId 
            },
            order: [['createdAt', 'ASC']]
        });

        console.log("找到的會話訊息數量:", messages.length);
        res.status(200).json(messages);
    } catch (err) {
        console.error("取得會話歷史紀錄錯誤:", err);
        res.status(500).json({ error: '無法取得會話歷史紀錄', details: err.message });
    }
};

// 根據 userId 取得所有不同的 sessionId（用於顯示會話列表）
exports.getUserSessions = async (req, res) => {
    const userId = req.params.userId;
    console.log("取得用戶的所有會話列表，userId:", userId);

    try {
        // 先獲取所有該用戶的訊息，然後在 JavaScript 中處理去重
        const messages = await Rag_message.findAll({
            attributes: ['sessionId', 'userName', 'createdAt'],
            where: { 
                userId: userId,
                sessionId: { [require('sequelize').Op.not]: null }
            },
            order: [['createdAt', 'DESC']]
        });

        // 在 JavaScript 中進行去重處理
        const sessionMap = new Map();
        
        messages.forEach(message => {
            if (!sessionMap.has(message.sessionId)) {
                sessionMap.set(message.sessionId, {
                    sessionId: message.sessionId,
                    userName: message.userName,
                    lastActivity: message.createdAt
                });
            }
        });

        // 轉換為數組並按時間排序
        const sessions = Array.from(sessionMap.values()).sort(
            (a, b) => new Date(b.lastActivity) - new Date(a.lastActivity)
        );

        console.log("找到的會話數量:", sessions.length);
        res.status(200).json(sessions);
    } catch (err) {
        console.error("取得會話列表錯誤:", err);
        res.status(500).json({ error: '無法取得會話列表' });
    }
};

// 測試端點
exports.testConnection = async (req, res) => {
    const userId = req.params.userId;
    console.log("測試連接，userId:", userId);
    
    try {
        const count = await Rag_message.count({
            where: { userId: userId }
        });
        
        res.status(200).json({ 
            message: "連接成功", 
            userId: userId,
            totalMessages: count 
        });
    } catch (err) {
        console.error("測試連接錯誤:", err);
        res.status(500).json({ error: '測試連接失敗', details: err.message });
    }
};

// 根據 userId 和 sessionId 取得 RAGFlow session ID
exports.getRagflowSessionId = async (req, res) => {
    const { userId, sessionId } = req.params;
    console.log("取得 RAGFlow session ID，userId:", userId, "sessionId:", sessionId);

    try {
        // 先嘗試取得基本欄位
        let attributes = ['ragflow_session_id'];
        
        const message = await Rag_message.findOne({
            attributes: attributes,
            where: { 
                userId: userId,
                sessionId: sessionId 
            },
            order: [['createdAt', 'DESC']]
        });

        if (message && message.ragflow_session_id) {
            console.log("找到 RAGFlow session ID:", message.ragflow_session_id);
            res.status(200).json({ ragflow_session_id: message.ragflow_session_id });
        } else {
            console.log("未找到對應的 RAGFlow session ID");
            res.status(404).json({ error: '未找到對應的 RAGFlow session ID' });
        }
    } catch (err) {
        console.error("取得 RAGFlow session ID 錯誤:", err);
        res.status(500).json({ error: '無法取得 RAGFlow session ID', details: err.message });
    }
};

// 新增：根據 userId 和 sessionId 刪除特定會話的所有訊息
exports.deleteSessionMessages = async (req, res) => {
    const { userId, sessionId } = req.params;
    console.log("刪除會話訊息，userId:", userId, "sessionId:", sessionId);

    try {
        // 刪除該會話的所有訊息
        const deletedCount = await Rag_message.destroy({
            where: { 
                userId: userId,
                sessionId: sessionId 
            }
        });

        console.log("已刪除的訊息數量:", deletedCount);
        
        if (deletedCount > 0) {
            res.status(200).json({ 
                message: "會話訊息已成功刪除", 
                deletedCount: deletedCount 
            });
        } else {
            res.status(404).json({ 
                message: "未找到要刪除的會話訊息" 
            });
        }
    } catch (err) {
        console.error("刪除會話訊息錯誤:", err);
        res.status(500).json({ 
            error: '無法刪除會話訊息', 
            details: err.message 
        });
    }
};

// 新增：創建新會話並保存開場白
exports.createNewSession = async (req, res) => {
    const { userId, sessionId, userName } = req.body;
    console.log("創建新會話，userId:", userId, "sessionId:", sessionId, "userName:", userName);

    try {
        const openingMessage = "嗨！我是一位專門輔導高中生科學探究與實作的自然科學導師。我會用適合高中生的語言，保持專業的同時，幫助你探索自然科學的奧秘，並引導你選擇一個有興趣的科展主題，以及更深入了解你的研究問題。什麼可以幫到你的嗎？";
        
        // 創建一條開場白記錄
        const newMessage = await Rag_message.create({
            input_message: null,  // 沒有用戶輸入
            response_message: openingMessage,  // 系統開場白
            author: "科學助手",
            userId: userId,
            userName: userName,
            sessionId: sessionId
        });

        console.log("新會話創建成功，ID:", newMessage.id);
        res.status(200).json({ 
            message: "新會話創建成功", 
            sessionId: sessionId,
            messageId: newMessage.id
        });
    } catch (err) {
        console.error("創建新會話錯誤:", err);
        res.status(500).json({ 
            error: '無法創建新會話', 
            details: err.message 
        });
    }
};