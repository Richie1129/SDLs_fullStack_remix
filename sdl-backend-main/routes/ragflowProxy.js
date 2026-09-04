const express = require('express');
const axios = require('axios');
const https = require('https');
const config = require('../config');
const { logAudit, clampMetadataSize, summarizeText } = require('../services/auditService');
const { validateToken } = require('../middlewares/AuthMiddleware');
const { requireAiEnabled } = require('../services/aiAccessService');

const router = express.Router();

// 創建 HTTPS 代理（根據配置決定是否驗證 SSL；production 一律驗證，見 config/index.js）
const agent = new https.Agent({
    rejectUnauthorized: config.ssl.verify
});

// 路徑參數白名單：chatId / sessionId 會直接拼進上游 URL，
// 不限制字元就能用 ../ 或 ? 把請求導到 RAGFlow 的其他端點（路徑穿越）。
const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
function validatePathIds(...names) {
    return function validatePathIds(req, res, next) {
        for (const name of names) {
            if (!ID_PATTERN.test(String(req.params[name] ?? ''))) {
                return res.status(400).json({ message: `無效的 ${name}`, code: 'INVALID_PATH_ID' });
            }
        }
        next();
    };
}

/**
 * RAGFlow API 代理路由
 * 重構自 index.js 的硬編碼實現
 */

// 創建 RAGFlow 會話
router.post('/:chatId/sessions', validateToken, validatePathIds('chatId'), async (req, res) => {
    try {
        const { chatId } = req.params;

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
        console.error("RAGFlow 代理請求失敗 (sessions):", error.message, error.response?.data);
        res.status(error.response?.status || 500).json({ message: "代理請求失敗" });
    }
});

// RAGFlow 完成請求
router.post('/:chatId/completions', validateToken, validatePathIds('chatId'), requireAiEnabled, async (req, res) => {
    try {
        const { chatId } = req.params;

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
        console.error("RAGFlow 代理請求失敗 (completions):", error.message, error.response?.data);
        res.status(error.response?.status || 500).json({ message: "代理請求失敗" });
    }
});

// 刪除 RAGFlow 會話
router.delete('/:chatId/sessions/:sessionId', validateToken, validatePathIds('chatId', 'sessionId'), async (req, res) => {
    try {
        const { chatId, sessionId } = req.params;

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
        console.error("RAGFlow 代理請求失敗 (delete sessions):", error.message, error.response?.data);
        res.status(error.response?.status || 500).json({ message: "代理請求失敗" });
    }
});

// RAGFlow 檢索請求
router.post('/retrieval', validateToken, requireAiEnabled, async (req, res) => {
    try {
        const response = await axios.post(
            `${config.ragflow.baseUrl}/api/v1/retrieval`,
            req.body,
            {
                headers: {
                    Authorization: `Bearer ${config.apiKeys.ragflow}`,
                    "Content-Type": "application/json",
                },
                httpsAgent: agent,
            }
        );

        res.status(200).json(response.data);
    } catch (error) {
        console.error("RAGFlow 代理請求失敗 (retrieval):", error.message, error.response?.data);
        res.status(error.response?.status || 500).json({ message: "代理請求失敗" });
    }
});

// 健康檢查端點（不需要認證，供 Docker/基礎設施監控使用，不暴露內部配置）
router.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
});

module.exports = router;
