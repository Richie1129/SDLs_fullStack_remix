/**
 * Structured Streaming Service (Experimental)
 *
 * 使用 Gemini 3.1 的 Structured Output 功能，確保 AI 輸出符合預期格式
 *
 * 優勢：
 * - 零文字解析（no regex, no XML parsing）
 * - 結構化資料保證（LLM 直接輸出 JSON）
 * - 消除 fallback 需求
 *
 * 限制：
 * - 需要 Gemini 3.1+
 * - JSON streaming 需要特殊處理
 *
 * @version 1.0.0 (Experimental)
 */

const { GoogleGenAI, Type } = require('@google/genai');
require('dotenv').config();

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * 使用 Gemini Structured Output 串流回傳 AI 回答
 *
 * 與舊版本的主要差異：
 * - 使用 responseSchema 強制 JSON 格式
 * - 不需要 XML 解析或 fallback
 * - 保證輸出包含 thinking 和 answer 欄位
 *
 * @param {String} prompt - 完整的 prompt
 * @param {Object} res - Express response 物件
 * @param {Object} options - 額外選項 (model, systemInstruction)
 * @returns {Object} { thinkingContent, assistantContent }
 */
async function streamGeminiResponseStructured(prompt, res, options = {}) {
  const { model = 'gemini-3.1-flash-lite-preview', systemInstruction } = options;

  console.log(`🧪 [Gemini Structured] 開始串流回應 - 使用模型: ${model}`);
  console.log(`📝 [Gemini Structured] Prompt 長度: ${prompt.length} 字元`);

  try {
    // 設定 SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    console.log('✅ [Gemini Structured] SSE headers 已設定');
    console.log('🚀 [Gemini Structured] 開始呼叫 generateContentStream (Structured Output)...');

    // 定義回應結構（核心改進：強制 LLM 輸出 JSON）
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        thinking: {
          type: Type.STRING,
          description: '推理過程：問題分析、資料來源、推理、結論'
        },
        answer: {
          type: Type.STRING,
          description: '正式答案（必須使用 Markdown 格式）：回答使用者問題，使用 ## 標題、**粗體**、列表等格式'
        }
      },
      required: ['thinking', 'answer'],
      propertyOrdering: ['thinking', 'answer']
    };

    // ✅ 建構 API 請求配置
    const streamConfig = {
      model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema
      }
    };

    // 如果有 systemInstruction，加入到 config 中
    if (systemInstruction) {
      streamConfig.config.systemInstruction = systemInstruction;
      console.log('✅ [Gemini Structured] 已設定 systemInstruction (Markdown 格式)');
    }

    const stream = await genAI.models.generateContentStream(streamConfig);

    console.log('✅ [Gemini Structured] API 回應成功');

    // 累積 JSON chunks（streaming JSON 需要完整解析）
    let jsonBuffer = '';
    let chunkCount = 0;
    let totalChars = 0;

    for await (const chunk of stream) {
      const text = chunk.text || '';
      chunkCount++;
      totalChars += text.length;

      if (text) {
        jsonBuffer += text;
      }
    }

    console.log(`📦 [Gemini Structured] 收到完整 JSON - ${jsonBuffer.length} 字元`);

    // 解析完整 JSON
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(jsonBuffer);
    } catch (parseError) {
      console.error('❌ [Gemini Structured] JSON 解析失敗:', parseError);
      throw new Error('Structured Output JSON 解析失敗');
    }

    const { thinking, answer } = parsedResponse;

    if (!thinking || !answer) {
      console.warn('⚠️ [Gemini Structured] 缺少必要欄位', { thinking: !!thinking, answer: !!answer });
      throw new Error('Structured Output 缺少必要欄位');
    }

    // 發送思考過程（一次性完整發送）
    console.log(`💭 [Gemini Structured] 思考過程長度: ${thinking.length} 字元`);
    res.write(`data: ${JSON.stringify({
      type: 'thinking',
      content: thinking
    })}\n\n`);

    // 發送答案（模擬 streaming，提升 UX）
    const answerChunks = chunkText(answer, 20); // 每 20 字元一個 chunk
    for (const chunk of answerChunks) {
      res.write(`data: ${JSON.stringify({
        type: 'content',
        content: chunk
      })}\n\n`);
      // 微小延遲，模擬真實 streaming
      await sleep(30);
    }

    console.log(`✅ [Gemini Structured] 串流完成 - 總共 ${chunkCount} chunks, ${totalChars} 字元`);
    console.log(`📊 [Gemini Structured] 思考: ${thinking.length} 字元, 答案: ${answer.length} 字元`);

    res.write(`data: ${JSON.stringify({
      type: 'done',
      message: 'Stream completed (Structured Output)'
    })}\n\n`);

    res.end();

    return { thinkingContent: thinking.trim(), assistantContent: answer.trim() };

  } catch (error) {
    console.error('❌ [Gemini Structured] 錯誤:', error);
    console.error('❌ [Gemini Structured] 錯誤詳情:', {
      message: error.message,
      status: error.status,
      statusText: error.statusText,
    });

    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: '抱歉，AI 服務暫時無法回應，請稍後再試'
    })}\n\n`);
    res.end();

    throw error;
  }
}

/**
 * 將文字切割成 chunks（模擬 streaming）
 * @param {string} text - 要切割的文字
 * @param {number} chunkSize - 每個 chunk 的大小
 * @returns {string[]} - chunk 陣列
 */
function chunkText(text, chunkSize = 20) {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.substring(i, i + chunkSize));
  }
  return chunks;
}

/**
 * 延遲函數
 * @param {number} ms - 延遲毫秒數
 * @returns {Promise}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  streamGeminiResponseStructured,
};
