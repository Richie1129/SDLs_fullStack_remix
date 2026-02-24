/**
 * 個人學習歷程 Controller
 *
 * 端點：
 * GET  /api/projects/:projectId/portfolio/student  — 取得個人資料
 * POST /api/projects/:projectId/portfolio/generate — AI 敘事生成（SSE 串流）
 *
 * AI fallback 鏈：vLLM Gemma-3 → vLLM GPT-OSS-20b → Gemini
 */

const {
  aggregateStudentPortfolioData,
  buildNarrativePrompt,
  streamNarrative
} = require('../services/studentPortfolioService');

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
 * AI 敘事生成（SSE 串流）
 * fallback 鏈：vLLM Gemma-3 → vLLM GPT-OSS-20b → Gemini
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
