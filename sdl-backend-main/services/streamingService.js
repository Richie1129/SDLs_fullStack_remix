const OpenAI = require('openai');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * 使用 OpenAI 串流式回傳 AI 回答
 *
 * @param {Array} messages - OpenAI 格式的訊息陣列
 * @param {Object} res - Express response 物件
 * @param {Object} options - 額外選項 (model, temperature)
 */
async function streamOpenAIResponse(messages, res, options = {}) {
  const { model = 'gpt-4o-mini', temperature = 0.7 } = options;

  console.log(`🤖 [OpenAI] 開始串流回應 - 使用模型: ${model}`);
  console.log(`📝 [OpenAI] Messages 數量: ${messages.length}`);

  try {
    // 設定 SSE (Server-Sent Events) headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // 關閉 nginx buffering

    console.log('✅ [OpenAI] SSE headers 已設定');

    // 呼叫 OpenAI streaming API
    console.log('🚀 [OpenAI] 開始呼叫 OpenAI API...');
    const stream = await openai.chat.completions.create({
      model,
      messages,
      stream: true,
      temperature,
    });
    console.log('✅ [OpenAI] API 回應成功');

    // 逐塊處理回應
    let chunkCount = 0;
    let totalChars = 0;

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      chunkCount++;

      if (content) {
        totalChars += content.length;
        // 用 SSE 格式傳送資料
        res.write(`data: ${JSON.stringify({
          type: 'content',
          content
        })}\n\n`);
      }

      // 檢查是否完成
      if (chunk.choices[0]?.finish_reason === 'stop') {
        console.log(`✅ [OpenAI] 串流完成 - 總共 ${chunkCount} 個 chunks, ${totalChars} 個字元`);
        res.write(`data: ${JSON.stringify({
          type: 'done',
          message: 'Stream completed'
        })}\n\n`);
      }
    }

    res.end();

  } catch (error) {
    console.error('❌ [OpenAI] 串流錯誤:', error);
    console.error('❌ [OpenAI] 錯誤詳情:', {
      message: error.message,
      status: error.status,
    });

    // 傳送錯誤訊息
    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: '抱歉，AI 服務暫時無法回應，請稍後再試'
    })}\n\n`);
    res.end();
  }
}

/**
 * 使用 Gemini 串流式回傳 AI 回答
 *
 * @param {String} prompt - 完整的 prompt
 * @param {Object} res - Express response 物件
 * @param {Object} options - 額外選項 (model)
 */
async function streamGeminiResponse(prompt, res, options = {}) {
  const { model = 'gemini-2.5-flash' } = options;

  console.log(`🤖 [Gemini] 開始串流回應 - 使用模型: ${model}`);
  console.log(`📝 [Gemini] Prompt 長度: ${prompt.length} 字元`);

  try {
    // 設定 SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    console.log('✅ [Gemini] SSE headers 已設定');

    console.log('✅ [Gemini] 準備呼叫串流 API');

    // Gemini streaming - 使用新版 SDK API
    console.log('🚀 [Gemini] 開始呼叫 generateContentStream...');
    const stream = await genAI.models.generateContentStream({
      model,
      contents: prompt
    });
    console.log('✅ [Gemini] generateContentStream 回應成功');

    // 逐塊處理回應
    let chunkCount = 0;
    let totalChars = 0;

    for await (const chunk of stream) {
      const text = chunk.text || '';
      chunkCount++;

      if (text) {
        totalChars += text.length;
        res.write(`data: ${JSON.stringify({
          type: 'content',
          content: text
        })}\n\n`);
      }
    }

    console.log(`✅ [Gemini] 串流完成 - 總共 ${chunkCount} 個 chunks, ${totalChars} 個字元`);

    res.write(`data: ${JSON.stringify({
      type: 'done',
      message: 'Stream completed'
    })}\n\n`);

    res.end();

  } catch (error) {
    console.error('❌ [Gemini] 串流錯誤:', error);
    console.error('❌ [Gemini] 錯誤詳情:', {
      message: error.message,
      status: error.status,
      statusText: error.statusText,
    });

    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: '抱歉，AI 服務暫時無法回應，請稍後再試'
    })}\n\n`);
    res.end();
  }
}

module.exports = {
  streamOpenAIResponse,
  streamGeminiResponse,
};
