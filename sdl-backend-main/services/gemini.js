const { GoogleGenerativeAI } = require('@google/generative-ai');

async function callGeminiAPI(prompt, options = {}) {
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

    const systemInstruction = '你是專業的AI助手，請使用繁體中文回覆用戶的問題。';

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
