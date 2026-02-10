const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const genai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const { logAudit, clampMetadataSize, summarizeText } = require('../services/auditService');

exports.generateIdea = async (req, res) => {
  try {
    const { title, content } = req.body;

    // 第一階段：判斷最適合的想法發展類型
    const classificationPrompt = `學生提出了以下想法，請判斷其最適合進行哪一種想法發展類型，並簡述原因：

標題：${title}
內容：${content}

請回覆以下 JSON 格式：
{
  "type": "請填寫以下之一：新構想 / 初始想法、延伸與補充、質疑與反駁、支持與贊同、統整與整合、反思與再評估、提供資料與資訊",
  "reason": "請簡要說明為何選擇這種類型"
}`;

    const classificationResult = await genai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [{ text: classificationPrompt }]
        }
      ],
      config: {
        systemInstruction: {
          parts: [{
            text: "你是一位熟悉教育理論的AI助手，請幫助判斷學生的想法最適合發展的方向，並用JSON格式回覆。"
          }]
        },
        temperature: 0.3,
        responseMimeType: 'application/json'
      }
    });

    const classificationText = classificationResult.text || '';
    const classificationResponse = JSON.parse(classificationText);
    const { type, reason } = classificationResponse;

    // 第二階段：根據發展類型進行具體引導
    const guidancePrompt = `學生的想法如下：
標題：${title}
內容：${content}

你剛剛判斷此想法適合的發展類型為：「${type}」。請根據這個類型，以一個問題或思考提示引導學生進一步發展他們的想法。請只回覆以下格式：
{
  "title": "引導提問或啟發性回饋的標題",
  "content": "你希望學生思考的引導問題或提醒"
}`;

    const completion = await genai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [{ text: guidancePrompt }]
        }
      ],
      config: {
        systemInstruction: {
          parts: [{
            text: `你是一位善於提問與引導的學習夥伴，根據學生的想法與判斷出的想法發展類型，提出具引導性的提問或回饋。請不要給出結論或答案，只提供一個鼓勵學生思考的問題或想法擴展的啟發。`
          }]
        },
        temperature: 0.7,
        responseMimeType: 'application/json'
      }
    });

    const responseText = completion.text || '';
    const parsedResponse = JSON.parse(responseText);

    const responseWithOwner = {
      ...parsedResponse,
      owner: "想法發展助手"
    };

    try {
      await logAudit(req, {
        action: 'ASSISTANT_IDEA_GENERATE',
        targetType: 'assistant',
        targetId: null,
        projectId: null,
        metadata: clampMetadataSize({
          input: { title: summarizeText(title || ''), content: summarizeText(content || '') },
          classification: { type, reason: summarizeText(reason || '') },
          output: { title: summarizeText(responseWithOwner.title || ''), content: summarizeText(responseWithOwner.content || '') },
          provider: 'gemini:gemini-2.5-flash'
        })
      });
    } catch (_) {}
    res.status(200).json(responseWithOwner);
  } catch (error) {
    console.error('Error in generateIdea:', error);
    res.status(500).json({ error: '生成想法時發生錯誤' });
  }
};
