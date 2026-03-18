const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Fallback parser for plain text thinking format
 * Detects patterns like:
 *   thinking
 *   1. 問題分析：...
 *   2. 相關資料：...
 *
 * Returns { hasThinking, thinkingContent, remainingContent }
 */
function parsePlainTextThinking(text) {
  // Pattern 1: Starts with "thinking" (case insensitive) followed by numbered list
  const pattern1 = /^thinking\s*\n+((?:\d+\.\s*[^:：]+[:：][^\n]+\n*)+)/i;

  // Pattern 2: Starts with numbered thinking points without "thinking" keyword
  // but before any user name or formal answer
  const pattern2 = /^((?:\d+\.\s*問題分析[:：][^\n]+\n+\d+\.\s*相關資料[:：][^\n]+\n+\d+\.\s*推理過程[:：][^\n]+\n+\d+\.\s*結論方向[:：][^\n]+\n*))/;

  let match = text.match(pattern1) || text.match(pattern2);

  if (match) {
    const thinkingContent = match[1].trim();
    const remainingContent = text.slice(match[0].length).trim();

    console.log(`🔧 [Fallback Parser] 偵測到純文字 thinking 格式，長度: ${thinkingContent.length}`);

    return {
      hasThinking: true,
      thinkingContent,
      remainingContent
    };
  }

  return {
    hasThinking: false,
    thinkingContent: '',
    remainingContent: text
  };
}

/**
 * 使用 Gemini 串流式回傳 AI 回答
 *
 * @param {String} prompt - 完整的 prompt
 * @param {Object} res - Express response 物件
 * @param {Object} options - 額外選項 (model, systemInstruction)
 * @returns {Object} { thinkingContent, assistantContent } - 累積的思考過程和最終答案
 */
async function streamGeminiResponse(prompt, res, options = {}) {
  const { model = 'gemini-3.1-flash-lite-preview', systemInstruction } = options;

  console.log(`🤖 [Gemini] 開始串流回應 - 使用模型: ${model}`);
  console.log(`📝 [Gemini] Prompt 長度: ${prompt.length} 字元`);

  try {
    // 設定 SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    console.log('✅ [Gemini] SSE headers 已設定');
    console.log('🚀 [Gemini] 開始呼叫 generateContentStream...');

    // ✅ 使用正確的 Gemini API 結構
    const streamConfig = {
      model,
      contents: prompt,
      config: {}
    };

    // 如果有 systemInstruction，加入到 config 中
    if (systemInstruction) {
      streamConfig.config.systemInstruction = systemInstruction;
      console.log('✅ [Gemini] 已設定 systemInstruction (Markdown 格式)');
    }

    const stream = await genAI.models.generateContentStream(streamConfig);
    console.log('✅ [Gemini] generateContentStream 回應成功');

    // State machine for parsing <thinking> tags
    // Support flexible tag formats: <thinking>, <Thinking>, < thinking >, etc.
    const thinkingStartRegex = /<thinking\s*>/i;
    const thinkingEndRegex = /<\/thinking\s*>/i;
    
    let buffer = '';
    let inThinking = false;
    let thinkingContent = '';
    let assistantContent = '';
    let chunkCount = 0;
    let totalChars = 0;

    for await (const chunk of stream) {
      const text = chunk.text || '';
      chunkCount++;

      if (text) {
        totalChars += text.length;
        buffer += text;

        // Check for <thinking> tag (case-insensitive, allows spaces)
        if (thinkingStartRegex.test(buffer) && !inThinking) {
          const match = buffer.match(thinkingStartRegex);
          const splitIndex = match.index + match[0].length;
          const beforeThinking = buffer.substring(0, match.index);
          
          // Send any content before <thinking> as normal content
          if (beforeThinking.trim()) {
            assistantContent += beforeThinking;
            res.write(`data: ${JSON.stringify({
              type: 'content',
              content: beforeThinking
            })}\n\n`);
          }

          inThinking = true;
          buffer = buffer.substring(splitIndex);
          thinkingContent = '';
          console.log(`🔍 [Gemini] 偵測到 <thinking> 標籤，開始收集思考內容`);
          continue;
        }

        // Check for </thinking> tag (case-insensitive, allows spaces)
        if (thinkingEndRegex.test(buffer) && inThinking) {
          const match = buffer.match(thinkingEndRegex);
          thinkingContent += buffer.substring(0, match.index);

          // Send complete thinking content as one message
          console.log(`💭 [Gemini] 思考過程長度: ${thinkingContent.length} 字元`);
          console.log(`💭 [Gemini] 思考內容預覽: ${thinkingContent.substring(0, 100)}...`);
          res.write(`data: ${JSON.stringify({
            type: 'thinking',
            content: thinkingContent.trim()
          })}\n\n`);

          inThinking = false;
          buffer = buffer.substring(match.index + match[0].length);

          // Send content after </thinking>
          if (buffer.trim()) {
            assistantContent += buffer;
            res.write(`data: ${JSON.stringify({
              type: 'content',
              content: buffer
            })}\n\n`);
            buffer = '';
          }
          continue;
        }

        // Normal mode: send content directly
        if (!inThinking) {
          assistantContent += buffer;
          res.write(`data: ${JSON.stringify({
            type: 'content',
            content: buffer
          })}\n\n`);
          buffer = '';
        }
        // In thinking mode: accumulate but don't send yet
      }
    }

    // Handle remaining buffer
    if (buffer.trim()) {
      if (inThinking) {
        thinkingContent += buffer;
        console.log(`💭 [Gemini] 思考過程長度: ${thinkingContent.length} 字元`);
        res.write(`data: ${JSON.stringify({
          type: 'thinking',
          content: thinkingContent.trim()
        })}\n\n`);
      } else {
        assistantContent += buffer;
        res.write(`data: ${JSON.stringify({
          type: 'content',
          content: buffer
        })}\n\n`);
      }
    }

    // Fallback: If no thinking content detected via XML tags, try plain text parsing
    if (!thinkingContent && assistantContent) {
      console.log(`🔍 [Gemini] 未偵測到 <thinking> 標籤，嘗試 fallback parsing...`);
      const parsed = parsePlainTextThinking(assistantContent);

      if (parsed.hasThinking) {
        // Found thinking in plain text format
        thinkingContent = parsed.thinkingContent;
        assistantContent = parsed.remainingContent;

        // Send thinking content
        res.write(`data: ${JSON.stringify({
          type: 'thinking',
          content: thinkingContent
        })}\n\n`);

        console.log(`✅ [Gemini] Fallback 成功 - 思考: ${thinkingContent.length} 字元, 答案: ${assistantContent.length} 字元`);
      } else {
        // MONITORING: Complete failure - no XML tags, no plain text pattern
        console.warn(`⚠️ [Gemini] THINKING 解析完全失敗`, {
          provider: 'gemini',
          model,
          assistantContentPreview: assistantContent.substring(0, 150),
          totalLength: assistantContent.length,
          timestamp: new Date().toISOString()
        });
        // TODO: Send to monitoring system (e.g., Sentry, CloudWatch)
      }
    }

    console.log(`✅ [Gemini] 串流完成 - 總共 ${chunkCount} chunks, ${totalChars} 字元`);
    console.log(`📊 [Gemini] 思考: ${thinkingContent.length} 字元, 答案: ${assistantContent.length} 字元`);

    res.write(`data: ${JSON.stringify({
      type: 'done',
      message: 'Stream completed'
    })}\n\n`);

    res.end();

    return { thinkingContent: thinkingContent.trim(), assistantContent: assistantContent.trim() };

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

    throw error;
  }
}

module.exports = {
  streamGeminiResponse,
};
