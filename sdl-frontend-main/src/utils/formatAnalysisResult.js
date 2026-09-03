import { escapeHtml } from './htmlEscape';

/**
 * 把 5Rs 反思的 AI 分析結果組成 SweetAlert2 `html:` 用的字串。
 *
 * 安全要求：feedback 內容全部來自 LLM 回應（可被 prompt injection 操控），
 * 每一個插值都必須經過 escapeHtml，否則就是 XSS。此函式獨立成模組是為了讓測試能鎖住這件事。
 *
 * @param {object} feedback  LLM 回傳的分析結果（overall_assessment / suggestions / strengths / improvements / analysisDate）
 * @param {string} [provider]  模型名稱
 * @returns {string} HTML 字串
 */
export function formatAnalysisResult(feedback, provider) {
  let htmlContent = `
    <div style="text-align: left; max-height: 400px; overflow-y: auto;">
      <div style="margin-bottom: 16px; padding: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; color: white;">
        <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: bold;">AI 分析報告</h3>
        <p style="margin: 0; font-size: 14px; opacity: 0.9;">使用模型：${escapeHtml(provider || 'AI')}</p>
      </div>
  `;

  // 整體評估
  if (feedback.overall_assessment) {
    htmlContent += `
      <div style="margin-bottom: 16px; padding: 12px; background: #f8fafc; border-left: 4px solid #3b82f6; border-radius: 4px;">
        <h4 style="margin: 0 0 8px 0; color: #1e40af; font-size: 16px;">整體評估</h4>
        <p style="margin: 0; color: #374151; line-height: 1.5;">${escapeHtml(feedback.overall_assessment)}</p>
      </div>
    `;
  }

  // 建議列表
  if (feedback.suggestions && feedback.suggestions.length > 0) {
    htmlContent += `
      <div style="margin-bottom: 16px; padding: 12px; background: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 4px;">
        <h4 style="margin: 0 0 12px 0; color: #15803d; font-size: 16px;">個人化建議</h4>
        <ul style="margin: 0; padding-left: 20px; color: #374151;">
    `;
    feedback.suggestions.forEach(suggestion => {
      htmlContent += `<li style="margin-bottom: 8px; line-height: 1.5;">${escapeHtml(suggestion)}</li>`;
    });
    htmlContent += `</ul></div>`;
  }

  // 強項
  if (feedback.strengths && feedback.strengths.length > 0) {
    htmlContent += `
      <div style="margin-bottom: 16px; padding: 12px; background: #fefce8; border-left: 4px solid #eab308; border-radius: 4px;">
        <h4 style="margin: 0 0 12px 0; color: #a16207; font-size: 16px;">發現的強項</h4>
        <ul style="margin: 0; padding-left: 20px; color: #374151;">
    `;
    feedback.strengths.forEach(strength => {
      htmlContent += `<li style="margin-bottom: 8px; line-height: 1.5;">${escapeHtml(strength)}</li>`;
    });
    htmlContent += `</ul></div>`;
  }

  // 改進建議
  if (feedback.improvements && feedback.improvements.length > 0) {
    htmlContent += `
      <div style="margin-bottom: 16px; padding: 12px; background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px;">
        <h4 style="margin: 0 0 12px 0; color: #dc2626; font-size: 16px;">改進方向</h4>
        <ul style="margin: 0; padding-left: 20px; color: #374151;">
    `;
    feedback.improvements.forEach(improvement => {
      htmlContent += `<li style="margin-bottom: 8px; line-height: 1.5;">${escapeHtml(improvement)}</li>`;
    });
    htmlContent += `</ul></div>`;
  }

  // 分析時間 + 僅供參考聲明
  htmlContent += `
    <div style="margin-top: 16px; padding: 8px; background: #f9fafb; border-radius: 4px; text-align: center;">
  `;
  if (feedback.analysisDate) {
    const date = new Date(feedback.analysisDate);
    htmlContent += `<small style="color: #6b7280;">分析時間：${escapeHtml(date.toLocaleString('zh-TW'))}</small><br/>`;
  }
  htmlContent += `
      <small style="color: #9ca3af;">以上 AI 分析結果僅供參考，不作為正式評量依據</small>
    </div>
  `;

  htmlContent += `</div>`;
  return htmlContent;
}

export default formatAnalysisResult;
