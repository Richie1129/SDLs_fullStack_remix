const { GoogleGenAI } = require('@google/genai');

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
    || `你是專業的 AI 助手。

**重要格式要求**：
- 必須使用 Markdown 格式回覆
- 使用 ## 標題組織答案結構
- 使用 **粗體** 標記重要資訊
- 使用列表（-）讓內容更清晰
- 程式碼或檔名使用 \`反引號\`
- 使用繁體中文回覆`;

  let lastError = null;

  for (let i = 0; i < keyCandidates.length; i++) {
    const apiKey = keyCandidates[i];
    const keyAlias = i === 0 ? 'GEMINI_API_KEY' : 'GEMINI_API_KEY_2';
    try {
      console.log(`[Gemini] 使用金鑰別名: ${keyAlias}`);
      const ai = new GoogleGenAI({ apiKey });

      const result = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          systemInstruction,  // ✅ 正確：使用 API 的 systemInstruction 參數
          temperature: generationConfig.temperature,
          topP: generationConfig.topP,
          topK: generationConfig.topK,
          maxOutputTokens: generationConfig.maxOutputTokens,
          safetySettings,
        },
      });

      const text = result?.text || '';
      if (!text) throw new Error('空回應');
      console.log(`[Gemini] 呼叫成功（模型: ${modelName}，金鑰: ${keyAlias}）`);
      return { success: true, provider: modelName, content: text, usedKey: keyAlias };
    } catch (error) {
      const errMsg = error?.message || '未知錯誤';
      console.error(`Gemini API 呼叫失敗（${keyAlias}）:`, errMsg);
      lastError = new Error(`使用 ${keyAlias} 失敗: ${errMsg}`);
      if (i + 1 < keyCandidates.length) {
        const nextAlias = i + 1 === 0 ? 'GEMINI_API_KEY' : 'GEMINI_API_KEY_2';
        console.log(`[Gemini] 嘗試備援金鑰: ${nextAlias}`);
      }
    }
  }

  // All keys failed
  throw new Error(`Gemini API 呼叫失敗（含備援失敗）: ${lastError?.message || '無可用金鑰或未知錯誤'}`);
}

/**
 * ✅ 呼叫 Gemini API with Google Search Grounding
 * 只返回外部連結，不返回答案（避免與 RAGFlow 衝突）
 */
async function callGeminiGrounding(question, options = {}) {
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

  // Build key candidates
  const primaryKey = process.env.GEMINI_API_KEY;
  const secondaryKey = process.env.GEMINI_API_KEY_2;
  const keyCandidates = [primaryKey, secondaryKey].filter(Boolean);

  if (keyCandidates.length === 0) {
    throw new Error('GEMINI_API_KEY 或 GEMINI_API_KEY_2 未設定');
  }

  // ✅ 加入 systemInstruction 支援（保持與其他 Gemini 函數一致）
  const systemInstruction = options.systemInstruction ||
    '你是專業的資訊檢索助手。請搜尋相關資料並返回最相關的網頁連結。使用繁體中文回覆。';

  let lastError = null;

  for (let i = 0; i < keyCandidates.length; i++) {
    const apiKey = keyCandidates[i];
    const keyAlias = i === 0 ? 'GEMINI_API_KEY' : 'GEMINI_API_KEY_2';

    try {
      console.log(`[Gemini Grounding] 使用金鑰別名: ${keyAlias}`);

      // ✅ 使用新版 SDK
      const ai = new GoogleGenAI({ apiKey });

      // ✅ 啟用 Google Search 工具
      const response = await ai.models.generateContent({
        model: modelName,
        contents: question,
        config: {
          systemInstruction,  // ✅ 修復：加入 systemInstruction
          tools: [{ googleSearch: {} }],  // ✅ 啟用 grounding
        },
      });

      // 🔍 除錯：完整回應結構
      console.log(`[Gemini Grounding Debug] response 物件的所有 keys:`, Object.keys(response));
      console.log(`[Gemini Grounding Debug] response.candidates 存在:`, !!response.candidates);

      // ✅ 檢查 candidates[0] 的結構
      if (response.candidates && response.candidates[0]) {
        console.log(`[Gemini Grounding Debug] candidates[0] 的 keys:`, Object.keys(response.candidates[0]));
        console.log(`[Gemini Grounding Debug] candidates[0].groundingMetadata:`, JSON.stringify(response.candidates[0].groundingMetadata, null, 2));
      }

      console.log(`[Gemini Grounding Debug] 完整 response:`, JSON.stringify(response, null, 2));

      // ✅ groundingMetadata 在 candidates[0] 裡面
      const groundingMetadata = response.candidates?.[0]?.groundingMetadata || response.groundingMetadata;

      // 🔍 除錯：groundingMetadata
      console.log(`[Gemini Grounding Debug] groundingMetadata:`, JSON.stringify(groundingMetadata, null, 2));

      if (!groundingMetadata || !groundingMetadata.groundingChunks) {
        console.log(`[Gemini Grounding] 沒有找到外部連結（金鑰: ${keyAlias}）`);
        console.log(`[Gemini Grounding Debug] groundingMetadata 存在: ${!!groundingMetadata}`);
        console.log(`[Gemini Grounding Debug] groundingChunks 存在: ${!!groundingMetadata?.groundingChunks}`);
        return {
          success: true,
          externalLinks: [],
          usedKey: keyAlias
        };
      }

      // ✅ 提取網頁連結
      const externalLinks = [];
      const chunks = groundingMetadata.groundingChunks;

      // 🔍 除錯：chunks 結構
      console.log(`[Gemini Grounding Debug] groundingChunks 數量: ${chunks.length}`);
      chunks.forEach((chunk, idx) => {
        console.log(`[Gemini Grounding Debug] Chunk ${idx}:`, JSON.stringify(chunk, null, 2));
      });

      for (const chunk of chunks) {
        if (chunk.web) {
          externalLinks.push({
            title: chunk.web.title || '無標題',
            url: chunk.web.uri,
            snippet: '' // Gemini grounding 沒有 snippet，可以留空
          });
        } else {
          console.log(`[Gemini Grounding Debug] Chunk 沒有 web 屬性:`, chunk);
        }
      }

      console.log(`[Gemini Grounding] 成功取得 ${externalLinks.length} 個外部連結（金鑰: ${keyAlias}）`);
      console.log(`[Gemini Grounding Debug] 最終 externalLinks:`, JSON.stringify(externalLinks, null, 2));

      return {
        success: true,
        externalLinks: externalLinks.slice(0, 5), // 最多 5 個連結
        usedKey: keyAlias,
        webSearchQueries: groundingMetadata.webSearchQueries || []
      };

    } catch (error) {
      const errMsg = error?.message || '未知錯誤';
      console.error(`Gemini Grounding 呼叫失敗（${keyAlias}）:`, errMsg);
      lastError = new Error(`使用 ${keyAlias} 失敗: ${errMsg}`);

      if (i + 1 < keyCandidates.length) {
        const nextAlias = i + 1 === 0 ? 'GEMINI_API_KEY' : 'GEMINI_API_KEY_2';
        console.log(`[Gemini Grounding] 嘗試備援金鑰: ${nextAlias}`);
      }
    }
  }

  // All keys failed
  throw new Error(`Gemini Grounding 呼叫失敗（含備援失敗）: ${lastError?.message || '無可用金鑰或未知錯誤'}`);
}

module.exports = { callGeminiAPI, callGeminiGrounding };
