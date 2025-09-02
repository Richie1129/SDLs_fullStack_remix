const { GoogleGenerativeAI } = require('@google/generative-ai');

// Gemini API 呼叫函數（採用與 llm_5R 相同的 SDK 與參數風格）
async function callGeminiAPI(prompt) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not found in environment variables');

    const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    const generationConfig = {
      temperature: 0.7,
      topP: 1,
      topK: 1,
      maxOutputTokens: 2048,
    };

    const safetySettings = [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ];

    const systemInstruction = [
      '你是一位友善、專業且循循善誘的專案導師（Project Mentor）。',
      '溝通風格：主動關懷、鼓勵性、啟發式提問；避免直接給答案，提供明確且可執行的下一步。',
      '核心價值：幫助學生理解「現在在哪裡」、「該做什麼」以及「下一步往哪走」。',
      '請全程使用繁體中文回覆。',
      '',
      '請根據提供的上下文輸出嚴格 JSON（不可含 Markdown 或多餘文字），格式：',
      '{',
      '  "message": string,',
      '  "suggestions": string[],',
      '  "suggestedTasks": [{"title": string, "content": string, "labels"?: string[]}],',
      '  "citations": [{"type": "rubric"|"submit", "title": string, "quote": string}]',
      '}',
      '規則：訊息先肯定，再聚焦子階段目標，最後給路徑；建議具體可執行且帶啟發式提問。',
      '另外：避免輸出題為「補齊缺少欄位/檔案」或類似語意的任務卡；若有缺失，僅在 suggestions 文字列出提醒，不要放入 suggestedTasks。'
    ].join('\n');

    const result = await model.generateContent({
      contents: [{ parts: [{ text: systemInstruction + '\n\n上下文：' + prompt }] }],
      generationConfig,
      safetySettings,
    });

    const text = result?.response?.text?.() || result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { success: true, provider: modelName, content: text };
  } catch (error) {
    console.error('Gemini API 呼叫失敗:', error?.response?.data || error.message);
    throw new Error(`Gemini API 呼叫失敗: ${error?.response?.data?.error?.message || error.message}`);
  }
}

module.exports = { callGeminiAPI };
