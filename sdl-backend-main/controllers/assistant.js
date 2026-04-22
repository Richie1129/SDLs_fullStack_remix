/**
 * Assistant Controller
 *
 * 僅保留 1 個對外功能：
 *   - getExternalLinks    POST /api/assistant/grounding （科學助手 Gemini Grounding）
 */

const { callGeminiGrounding } = require('../services/llmGateway');
const { isAiEnabled } = require('../services/aiAccessService');
const { logAudit, summarizeText } = require('../services/auditService');

/**
 * POST /api/assistant/grounding
 * 透過 Gemini Grounding 取得網路延伸閱讀連結
 */
exports.getExternalLinks = async (req, res) => {
  const startedAt = Date.now();
  try {
    if (!(await isAiEnabled(req.userId))) {
      return res.status(403).json({ error: 'AI_DISABLED', message: 'AI 功能已停用，請聯絡管理員' });
    }

    const { question, projectId = null } = req.body;

    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ error: 'question 參數必須是非空字串' });
    }

    console.log(`🔗 [External Links] 收到請求，問題: "${question}"`);
    const result = await callGeminiGrounding(question);
    console.log(`✅ [External Links] 成功取得 ${result.externalLinks.length} 個連結`);

    logAudit(req, {
      action: 'ASSISTANT_GROUNDING_REQUEST',
      targetType: 'assistant_session',
      targetId: null,
      projectId: projectId ? Number(projectId) || null : null,
      metadata: {
        question: summarizeText(question),
        linkCount: result.externalLinks?.length || 0,
        queryCount: result.webSearchQueries?.length || 0,
        latencyMs: Date.now() - startedAt,
        success: true,
      },
    });

    res.status(200).json({
      success: true,
      externalLinks: result.externalLinks,
      webSearchQueries: result.webSearchQueries,
    });
  } catch (error) {
    console.error('❌ [External Links] 錯誤:', error);
    logAudit(req, {
      action: 'ASSISTANT_GROUNDING_REQUEST',
      targetType: 'assistant_session',
      targetId: null,
      projectId: req.body?.projectId ? Number(req.body.projectId) || null : null,
      metadata: {
        question: typeof req.body?.question === 'string' ? summarizeText(req.body.question) : null,
        linkCount: 0,
        latencyMs: Date.now() - startedAt,
        success: false,
        errorMessage: error?.message || null,
      },
    });
    res.status(200).json({
      success: false,
      externalLinks: [],
      error: error.message,
    });
  }
};
