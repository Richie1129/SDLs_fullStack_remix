const express = require('express');
const axios = require('axios');
const https = require('https');
const config = require('../config');
const { logAudit, clampMetadataSize, summarizeText } = require('../services/auditService');

const router = express.Router();

// 創建 HTTPS 代理（根據配置決定是否驗證 SSL）
const agent = new https.Agent({
    rejectUnauthorized: config.ssl.verify
});

/**
 * RAGFlow API 代理路由
 * 重構自 index.js 的硬編碼實現
 */

// 創建 RAGFlow 會話
router.post('/:chatId/sessions', async (req, res) => {
    try {
        const { chatId } = req.params;
        console.log("RAGFlow 創建會話 - chatId:", chatId, "body:", req.body);

        const response = await axios.post(
            `${config.ragflow.baseUrl}/api/v1/chats/${chatId}/sessions`,
            req.body,
            {
                headers: {
                    Authorization: `Bearer ${config.apiKeys.ragflow}`,
                    "Content-Type": "application/json",
                },
                httpsAgent: agent,
            }
        );

        console.log("RAGFlow 會話創建成功:", response.data);

        // 記錄審計日誌
        try {
            await logAudit(req, {
                action: 'ASSISTANT_SESSION_CREATE',
                targetType: 'assistant_session',
                targetId: response?.data?.id || null,
                projectId: null,
                metadata: clampMetadataSize({
                    chatId,
                    request: { body: summarizeText(JSON.stringify(req.body || {})) },
                    response: { hasData: !!response?.data }
                })
            });
        } catch (auditError) {
            console.warn('審計日誌記錄失敗:', auditError.message);
        }

        res.status(200).json(response.data);
    } catch (error) {
        console.error("RAGFlow 代理請求失敗 (sessions):", error.message);
        res.status(error.response?.status || 500).json({ 
            message: "代理請求失敗", 
            error: error.message,
            details: error.response?.data 
        });
    }
});

// RAGFlow 完成請求
router.post('/:chatId/completions', async (req, res) => {
    try {
        const { chatId } = req.params;
        console.log("RAGFlow 完成請求 - chatId:", chatId);

        const response = await axios.post(
            `${config.ragflow.baseUrl}/api/v1/chats/${chatId}/completions`,
            req.body,
            {
                headers: {
                    Authorization: `Bearer ${config.apiKeys.ragflow}`,
                    "Content-Type": "application/json",
                },
                httpsAgent: agent,
            }
        );

        // 記錄審計日誌
        try {
            await logAudit(req, {
                action: 'ASSISTANT_COMPLETION',
                targetType: 'assistant',
                targetId: chatId,
                projectId: null,
                metadata: clampMetadataSize({
                    chatId,
                    prompt: summarizeText(JSON.stringify(req.body || {})),
                    response: { hasData: !!response?.data }
                })
            });
        } catch (auditError) {
            console.warn('審計日誌記錄失敗:', auditError.message);
        }

        res.status(200).json(response.data);
    } catch (error) {
        console.error("RAGFlow 代理請求失敗 (completions):", error.message);
        res.status(error.response?.status || 500).json({ 
            message: "代理請求失敗", 
            error: error.message,
            details: error.response?.data 
        });
    }
});

// 刪除 RAGFlow 會話
router.delete('/:chatId/sessions/:sessionId', async (req, res) => {
    try {
        const { chatId, sessionId } = req.params;
        console.log("RAGFlow 刪除會話 - chatId:", chatId, "sessionId:", sessionId);
        
        const response = await axios.delete(
            `${config.ragflow.baseUrl}/api/v1/chats/${chatId}/sessions/${sessionId}`,
            {
                headers: {
                    Authorization: `Bearer ${config.apiKeys.ragflow}`,
                    "Content-Type": "application/json",
                },
                httpsAgent: agent,
            }
        );
        
        console.log("RAGFlow 會話刪除成功:", response.data);
        
        // 記錄審計日誌
        try {
            await logAudit(req, {
                action: 'ASSISTANT_SESSION_DELETE',
                targetType: 'assistant_session',
                targetId: sessionId,
                projectId: null,
                metadata: clampMetadataSize({ chatId, sessionId })
            });
        } catch (auditError) {
            console.warn('審計日誌記錄失敗:', auditError.message);
        }

        res.status(200).json(response.data);
    } catch (error) {
        console.error("RAGFlow 代理請求失敗 (delete sessions):", error.message);
        res.status(error.response?.status || 500).json({ 
            message: "代理請求失敗", 
            error: error.message,
            details: error.response?.data 
        });
    }
});

// 健康檢查端點
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        ragflowUrl: config.ragflow.baseUrl,
        hasApiKey: !!config.apiKeys.ragflow,
        sslVerify: config.ssl.verify
    });
});

module.exports = router;