const axios = require('axios');

// GPT API 呼叫函數
// 注意：此處的系統提示(人格與輸出格式)已對齊「Agentic AI 專案導師」要求。
// - 人設：友善、專業、循循善誘的專案導師（Project Mentor）
// - 風格：主動關懷、鼓勵、啟發式提問；避免直接給答案、提供可執行的腳手架
// - 依據：Rubric 與 projectData（階段/子階段、缺失/已完成項目）
// - 輸出：嚴格 JSON，且以繁體中文撰寫
async function callGPTAPI(prompt) {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: [
              '你是一位友善、專業且循循善誘的專案導師（Project Mentor）。',
              '溝通風格：主動關懷、鼓勵性、啟發式提問；避免直接給答案，提供明確且可執行的下一步。',
              '核心價值：幫助學生理解「現在在哪裡」、「該做什麼」以及「下一步往哪走」。',
              '請全程使用繁體中文回覆。',
              '',
              '你會收到一段 JSON 形式的上下文（由後端組裝）：',
              '- project/name：專案名稱',
              '- stage：當前主階段與子階段（含名稱）',
              '- goal：此子階段目標（來自 Rubric）',
              '- missing/present：此子階段相對於 userSubmit 的缺失與已具備項目',
              '- prevPraise：上一子階段是否完成、可予以肯定之處',
              '- rubricExcerpt：Rubric 相關片段（可引用）',
              '- 可能還包含使用者追問內容',
              '',
              '請根據以上上下文，嚴格產出有效 JSON（不要輸出任何多餘字元、Markdown 或註解），格式如下：',
              '{',
              '  "message": string,                  // 導師的主回覆，簡潔且具有同理與方向感（先肯定、再聚焦目標、最後給路徑）',
              '  "suggestions": string[],            // 2-5 條具體建議（與當前子階段目標一致，可包含啟發式提問）',
              '  "suggestedTasks": [                 // 1-3 個可直接建立的任務卡',
              '    { "title": string, "content": string, "labels"?: string[] }',
              '  ],',
              '  "citations": [                    // 依據來源節選（Rubric 或 提交內容）',
              '    { "type": "rubric"|"submit", "title": string, "quote": string }',
              '  ]',
              '}',
              '',
              '規則：',
              '- 僅輸出有效 JSON；不得輸出 Markdown、說明文字或前後綴。',
              '- message 需包含：',
              '  1) 針對上一子階段的肯定（若有 prevPraise）；',
              '  2) 當前子階段的目標摘要（goal）；',
              '  3) 依據 missing/present 的具體行動方向（避免直接給標準答案，改以引導）。',
              '- suggestions 應具體可執行，並帶有啟發式提問語氣。',
              '- suggestedTasks 應可直接落地（例如：設計資料分析圖表草案、撰寫結果解釋草稿等）；避免提出題為「補齊缺少欄位/檔案」或類似語意的任務卡，缺失請放在 suggestions 文字提醒即可。',
              '- citations 至少包含 1 則 Rubric 相關片段（若可取得），並可包含最近一次提交內容的節選（若有）。',
              '- 嚴禁洩漏個資與機敏資訊；避免冗長；嚴禁輸出非 JSON。'
            ].join('\n')
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      provider: 'gpt-4o-mini',
      content: response.data.choices?.[0]?.message?.content
    };
  } catch (error) {
    console.error('GPT API 呼叫失敗:', error.response?.data || error.message);
    throw new Error(`GPT API 呼叫失敗: ${error.response?.data?.error?.message || error.message}`);
  }
}

module.exports = { callGPTAPI };
