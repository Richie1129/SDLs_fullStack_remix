/**
 * 個人學習歷程 Controller
 *
 * 端點：
 * GET  /api/projects/:projectId/portfolio/student   — 取得個人資料
 * POST /api/projects/:projectId/portfolio/generate  — AI 敘事生成（SSE 串流）
 * POST /api/projects/:projectId/portfolio/feedback  — AI 寫作回饋（SSE 串流）
 *
 * AI fallback 鏈：vLLM Gemma-4 → vLLM GPT-OSS-20b → Gemini
 */

const {
  aggregateStudentPortfolioData,
  buildNarrativePrompt,
  streamNarrative,
  buildFeedbackPrompt,
  streamFeedback,
  buildOrganizePrompt,
  streamOrganize
} = require('../services/studentPortfolioService');
const UserProject = require('../models/user_project');

/**
 * 取得學生個人學習歷程資料
 */
exports.getStudentPortfolioData = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.userId;

    const data = await aggregateStudentPortfolioData(
      parseInt(projectId),
      parseInt(userId)
    );

    res.status(200).json({ success: true, data });
  } catch (err) {
    const statusMap = {
      USER_NOT_FOUND: 404,
      PROJECT_NOT_FOUND: 404,
      NOT_PROJECT_MEMBER: 403
    };
    const status = statusMap[err.message] || 500;
    console.error('❌ 個人學習歷程資料查詢失敗:', err);
    res.status(status).json({ success: false, error: err.message });
  }
};

/**
 * 取得學習敘事草稿
 */
exports.getDraft = async (req, res) => {
  try {
    const pid = parseInt(req.params.projectId, 10);
    const uid = parseInt(req.userId, 10);
    if (Number.isNaN(pid) || Number.isNaN(uid)) {
      return res.status(400).json({ success: false, error: 'INVALID_PARAMS' });
    }

    const record = await UserProject.findOne({
      where: { userId: uid, projectId: pid },
      attributes: ['narrative_draft', 'draft_updated_at']
    });

    if (!record) {
      return res.status(403).json({ success: false, error: 'NOT_PROJECT_MEMBER' });
    }

    res.status(200).json({
      success: true,
      data: {
        narrative_draft: record.narrative_draft || '',
        draft_updated_at: record.draft_updated_at
      }
    });
  } catch (err) {
    console.error('❌ 取得學習敘事草稿失敗:', err);
    res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR' });
  }
};

/**
 * 儲存學習敘事草稿（debounce 呼叫）
 */
exports.saveDraft = async (req, res) => {
  try {
    const pid = parseInt(req.params.projectId, 10);
    const uid = parseInt(req.userId, 10);
    if (Number.isNaN(pid) || Number.isNaN(uid)) {
      return res.status(400).json({ success: false, error: 'INVALID_PARAMS' });
    }

    const { narrativeText } = req.body;
    if (typeof narrativeText !== 'string') {
      return res.status(400).json({ success: false, error: 'INVALID_PAYLOAD' });
    }
    if (narrativeText.length > 20000) {
      return res.status(400).json({ success: false, error: 'DRAFT_TOO_LONG' });
    }

    const [updatedCount] = await UserProject.update(
      // 空字串存為 null，清空草稿
      { narrative_draft: narrativeText || null, draft_updated_at: new Date() },
      { where: { userId: uid, projectId: pid } }
    );

    if (updatedCount === 0) {
      return res.status(403).json({ success: false, error: 'NOT_PROJECT_MEMBER' });
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ 儲存學習敘事草稿失敗:', err);
    res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR' });
  }
};

/**
 * AI 敘事生成（SSE 串流）
 * fallback 鏈：vLLM Gemma-4 → vLLM GPT-OSS-20b → Gemini
 */
exports.generateNarrative = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.userId;

    const portfolioData = await aggregateStudentPortfolioData(
      parseInt(projectId),
      parseInt(userId)
    );

    const prompt = buildNarrativePrompt(portfolioData);

    await streamNarrative(prompt, res);
  } catch (err) {
    console.error('❌ AI 敘事生成失敗:', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
};

/**
 * AI 段落整合（SSE 串流）
 * 接收學生的碎片筆記，保留原字句僅整合段落結構
 */
exports.requestOrganize = async (req, res) => {
  try {
    const { narrativeText } = req.body;

    if (!narrativeText || !narrativeText.trim()) {
      return res.status(400).json({ success: false, error: 'EMPTY_NARRATIVE' });
    }
    if (narrativeText.length > 10000) {
      return res.status(400).json({ success: false, error: 'NARRATIVE_TOO_LONG' });
    }

    const prompt = buildOrganizePrompt(narrativeText);
    await streamOrganize(prompt, res);
  } catch (err) {
    console.error('❌ AI 段落整合失敗:', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
};

/**
 * AI 寫作回饋（SSE 串流）
 * 接收學生的敘事文字，回傳具體寫作改進建議
 */
exports.requestFeedback = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.userId;
    const { narrativeText } = req.body;

    if (!narrativeText || !narrativeText.trim()) {
      return res.status(400).json({ success: false, error: 'EMPTY_NARRATIVE' });
    }
    if (narrativeText.length > 10000) {
      return res.status(400).json({ success: false, error: 'NARRATIVE_TOO_LONG' });
    }

    const portfolioData = await aggregateStudentPortfolioData(
      parseInt(projectId),
      parseInt(userId)
    );

    const prompt = buildFeedbackPrompt(narrativeText, portfolioData);
    await streamFeedback(prompt, res);
  } catch (err) {
    console.error('❌ AI 寫作回饋生成失敗:', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
};
