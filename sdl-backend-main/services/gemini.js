const { GoogleGenerativeAI } = require('@google/generative-ai');

async function callGeminiAPI(prompt, options = {}) {
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

  // Build key candidates: primary then secondary
  const primaryKey = process.env.GEMINI_API_KEY;
  const secondaryKey = process.env.GEMINI_API_KEY_2;
  const keyCandidates = [primaryKey, secondaryKey].filter(Boolean);

  if (keyCandidates.length === 0) {
    throw new Error('GEMINI_API_KEY 或 GEMINI_API_KEY_2 未設定');
  }

  const generationConfig = {
    temperature: 0.7,
    topP: 1,
    topK: 1,
    maxOutputTokens: 2048,
    ...(options.generationConfig || {}),
  };

  const safetySettings = options.safetySettings || [
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  ];

  const systemInstruction = options.systemInstruction
    || '你是專業的AI助手，請使用繁體中文回覆用戶的問題。';

  let lastError = null;

  for (let i = 0; i < keyCandidates.length; i++) {
    const apiKey = keyCandidates[i];
    const keyAlias = i === 0 ? 'GEMINI_API_KEY' : 'GEMINI_API_KEY_2';
    try {
      console.log(`[Gemini] 使用金鑰別名: ${keyAlias}`);
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: modelName });

      const result = await model.generateContent({
        contents: [{ parts: [{ text: systemInstruction + '\n\n上下文：' + prompt }] }],
        generationConfig,
        safetySettings,
      });

      const text = result?.response?.text?.() || result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!text) throw new Error('空回應');
      console.log(`[Gemini] 呼叫成功（模型: ${modelName}，金鑰: ${keyAlias}）`);
      return { success: true, provider: modelName, content: text, usedKey: keyAlias };
    } catch (error) {
      // Keep the last error, then try next key if available
      const errMsg = error?.response?.data?.error?.message || error?.message || '未知錯誤';
      console.error(`Gemini API 呼叫失敗（${keyAlias}）:`, error?.response?.data || errMsg);
      lastError = new Error(`使用 ${keyAlias} 失敗: ${errMsg}`);
      if (i + 1 < keyCandidates.length) {
        const nextAlias = i + 1 === 0 ? 'GEMINI_API_KEY' : 'GEMINI_API_KEY_2';
        console.log(`[Gemini] 嘗試備援金鑰: ${nextAlias}`);
      }
      // Continue loop to try secondary key if exists
    }
  }

  // All keys failed
  throw new Error(`Gemini API 呼叫失敗（含備援失敗）: ${lastError?.message || '無可用金鑰或未知錯誤'}`);
}

module.exports = { callGeminiAPI };
