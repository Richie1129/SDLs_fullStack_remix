/**
 * Teacher Analytics Agent Controller
 */

const logger = require('../config/logger');
const TeacherAnalysisReport = require('../models/teacher_analysis_report');
const {
    analyzeProject,
    getGeminiCooldown,
} = require('../services/teacherAnalyticsAgent');

const HISTORY_LIMIT = 10;

// ============================================================================
// GET /api/teacher-agent/status/:projectId
// ============================================================================

async function getCooldownStatus(req, res) {
    const projectId = parseInt(req.params.projectId, 10);
    if (!projectId) return res.status(400).json({ message: 'projectId 無效' });

    const cooldown = await getGeminiCooldown(projectId);
    return res.json({
        geminiOnCooldown: cooldown.onCooldown,
        cooldownUntil: cooldown.cooldownUntil,
        remainingMs: cooldown.remainingMs,
        cooldownMinutes: Math.ceil(cooldown.remainingMs / 60000),
    });
}

// ============================================================================
// GET /api/teacher-agent/history/:projectId
// ============================================================================

async function getHistory(req, res) {
    const projectId = parseInt(req.params.projectId, 10);
    if (!projectId) return res.status(400).json({ message: 'projectId 無效' });

    const reports = await TeacherAnalysisReport.findAll({
        where: { projectId },
        attributes: ['id', 'model', 'content', 'snapshot', 'createdAt'],
        order: [['createdAt', 'DESC']],
        limit: HISTORY_LIMIT,
    });

    return res.json(reports);
}

// ============================================================================
// POST /api/teacher-agent/analyze/:projectId
// ============================================================================

async function startAnalysis(req, res) {
    const projectId = parseInt(req.params.projectId, 10);
    if (!projectId) {
        return res.status(400).json({ message: 'projectId 無效' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const sendEvent = (eventType, data) => {
        res.write(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    req.on('close', () => {
        logger.info(`[TeacherAgent] 客戶端中斷連線，projectId=${projectId}`);
    });

    try {
        logger.info(`[TeacherAgent] 開始分析，projectId=${projectId}, userId=${req.userId}`);

        const platformSpecific = req.body?.platformSpecific === true;
        const { model, content, snapshot } = await analyzeProject(projectId, res, { platformSpecific });

        // 儲存報告到資料庫（DB 記錄即為 Gemini 冷卻的依據）
        if (content) {
            await TeacherAnalysisReport.create({
                projectId,
                userId: req.userId,
                model,
                content,
                snapshot,
            });
            logger.info(`[TeacherAgent] 報告已儲存，projectId=${projectId}, model=${model}`);
        }

        const cooldown = await getGeminiCooldown(projectId);

        sendEvent('done', {
            model,
            geminiOnCooldown: cooldown.onCooldown,
            cooldownUntil: cooldown.cooldownUntil,
            cooldownMinutes: Math.ceil(cooldown.remainingMs / 60000),
            timestamp: new Date().toISOString(),
        });

        logger.info(`[TeacherAgent] 分析完成，projectId=${projectId}, model=${model}`);
    } catch (error) {
        logger.error({ err: error }, `[TeacherAgent] 分析失敗，projectId=${projectId}`);
        sendEvent('error', { message: error.message || '分析過程發生錯誤，請稍後再試' });
    } finally {
        res.end();
    }
}

module.exports = { getCooldownStatus, getHistory, startAnalysis };
