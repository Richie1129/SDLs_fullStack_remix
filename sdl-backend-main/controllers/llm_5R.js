// 引入必要的套件
const axios = require('axios'); // 用於 GPT API 呼叫
const { GoogleGenerativeAI } = require('@google/generative-ai'); // 用於 Gemini API 呼叫
require('dotenv').config(); // 載入環境變數

// 5Rs 反思框架的詳細定義
const FIVE_R_FRAMEWORK = {
  reporting: {
    title: "Reporting (報告)",
    description: "描述性地敘述一個情境、事件或問題",
    guidingQuestions: [
      "發生了什麼？",
      "涉及了什麼人事物？",
      "在什麼時間和地點發生？",
      "具體的情況是怎樣的？"
    ]
  },
  responding: {
    title: "Responding (回應)",
    description: "表達對情境、事件或問題的情感或個人反應",
    guidingQuestions: [
      "你當時的感受是什麼？",
      "這個經驗讓你有什麼樣的情緒反應？",
      "你對這個情況的第一印象是什麼？",
      "這個經驗是否讓你感到驚訝、困惑或興奮？"
    ]
  },
  relating: {
    title: "Relating (關聯)",
    description: "將當前的個人或理論理解與情境、事件或問題建立關聯",
    guidingQuestions: [
      "這個經驗與你過去的經驗有什麼相似或不同之處？",
      "你可以將哪些理論或概念應用到這個情況中？",
      "這個經驗如何與你的個人價值觀或信念相關？",
      "你從中看到了什麼模式或連結？"
    ]
  },
  reasoning: {
    title: "Reasoning (推論)",
    description: "對情境、事件或問題進行探索、質疑或解釋",
    guidingQuestions: [
      "為什麼會發生這種情況？",
      "有哪些潛在的原因或因素？",
      "你可以從不同的角度如何解釋這個情況？",
      "如果情況有所不同，結果會如何改變？"
    ]
  },
  reconstructing: {
    title: "Reconstructing (重建)",
    description: "基於理性理解，得出結論並制定未來行動計劃",
    guidingQuestions: [
      "你從這個經驗中學到了什麼？",
      "下次遇到類似情況，你會怎麼做？",
      "你需要發展哪些技能或知識？",
      "這個經驗如何影響你未來的行動計劃？"
    ]
  }
};

// 建構 5Rs 分析的 Prompt
function build5RsAnalysisPrompt(studentContent) {
  return `你是一位經驗豐富的教育輔導員，專精於 5Rs 反思模型指導。請以專業、具體、溫暖且具可操作性的方式，分析以下學生的 5Rs 反思，並僅輸出有效 JSON（不包含額外說明或 Markdown）。

輸出語言：繁體中文。
輸出格式：只回傳 JSON，且需符合下列鍵值結構與型別。

— 5Rs 框架定義（供你參考）：
1) Reporting (報告)：${FIVE_R_FRAMEWORK.reporting.description}
2) Responding (回應)：${FIVE_R_FRAMEWORK.responding.description}
3) Relating (關聯)：${FIVE_R_FRAMEWORK.relating.description}
4) Reasoning (推論)：${FIVE_R_FRAMEWORK.reasoning.description}
5) Reconstructing (重建)：${FIVE_R_FRAMEWORK.reconstructing.description}

— 反思深度評分標準（1–5 分，供你評估每個 R）：
1 分＝僅重述事件、無個人思考；
3 分＝有基本連結與初步解釋，但深度有限；
5 分＝能夠連結經驗/理論、多角度推論，並提出具體可行的未來行動。

— 學生提交的內容：
Reporting：${studentContent.reporting || '未填寫'}
Responding：${studentContent.responding || '未填寫'}
Relating：${studentContent.relating || '未填寫'}
Reasoning：${studentContent.reasoning || '未填寫'}
Reconstructing：${studentContent.reconstructing || '未填寫'}

— 產出要求：
1) 逐一回饋五個區塊，避免僅重述學生原文；
2) 指出每個區塊的優勢與可改進處，並提出1–2個引導問題；
3) 若某區塊「未填寫」或內容極少，請提供「簡短填寫模板」協助學生補全；
4) 給出每個區塊的反思深度分數（1–5）；
5) 提供整體評估與3–5條可操作建議；
6) 僅回傳有效 JSON，且不得輸出其他文字。

— JSON 輸出結構（請完全遵守鍵名與型別；其中五個區塊的文字回饋須為簡潔段落文字）：
{
  "reporting": "對 Reporting 的具體回饋（段落文字）",
  "responding": "對 Responding 的具體回饋（段落文字）",
  "relating": "對 Relating 的具體回饋（段落文字）",
  "reasoning": "對 Reasoning 的具體回饋（段落文字）",
  "reconstructing": "對 Reconstructing 的具體回饋（段落文字）",
  "overall": "整體反思的綜合評估與建議（段落文字）",
  "suggestions": ["具體可操作建議1","具體可操作建議2","具體可操作建議3"],

  "overall_assessment": "（可選）精煉總結，點出核心優勢與主要改進方向",
  "strengths": ["（可選）本次反思的優勢1","優勢2"],
  "improvements": ["（可選）主要可改進方向1","方向2"],
  "scores": {
    "reporting": 1,
    "responding": 1,
    "relating": 1,
    "reasoning": 1,
    "reconstructing": 1
  },
  "questions": {
    "reporting": ["（可選）引導問題1"],
    "responding": ["（可選）引導問題1"],
    "relating": ["（可選）引導問題1"],
    "reasoning": ["（可選）引導問題1"],
    "reconstructing": ["（可選）引導問題1"]
  },
  "templates": {
    "reporting": "（如未填寫）可直接套用的簡短填寫模板",
    "responding": "（如未填寫）可直接套用的簡短填寫模板",
    "relating": "（如未填寫）可直接套用的簡短填寫模板",
    "reasoning": "（如未填寫）可直接套用的簡短填寫模板",
    "reconstructing": "（如未填寫）可直接套用的簡短填寫模板"
  }
}

請確保：
• 使用繁體中文；
• 僅輸出 JSON；
• JSON 可被嚴格解析；
• 不要杜撰未提供的事實；
• 每個區塊的文字回饋以2–4句為宜。`;
}

// GPT API 呼叫函數
async function callGPTAPI(prompt) {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini', // 使用 gpt-4o-mini 模型
        messages: [
          {
            role: 'system',
            content: '你是一位專業的教育輔導員，擅長 5Rs 反思指導。請全程使用繁體中文，語氣溫暖且務實。重要：僅回傳有效 JSON，不要輸出任何額外文字或 Markdown。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7, // 設定生成溫度
        max_tokens: 2000 // 設定最大輸出 token 數
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, // 從環境變數獲取 API Key
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      provider: 'gpt-4o-mini',
      content: response.data.choices[0].message.content // 返回 AI 生成的內容
    };
  } catch (error) {
    console.error('GPT API 呼叫失敗:', error.response?.data || error.message);
    throw new Error(`GPT API 呼叫失敗: ${error.response?.data?.error?.message || error.message}`);
  }
}

// GPT-4.1-Nano API 呼叫函數
async function callGPTNanoAPI(prompt) {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4.1-nano', // 使用 gpt-4.1-nano 模型
        messages: [
          {
            role: 'system',
            content: '你是一位專業的教育輔導員，擅長 5Rs 反思指導。請全程使用繁體中文，語氣溫暖且務實。重要：僅回傳有效 JSON，不要輸出任何額外文字或 Markdown。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7, // 設定生成溫度
        max_tokens: 2000 // 設定最大輸出 token 數
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, // 從環境變數獲取 API Key
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      provider: 'gpt-4.1-nano',
      content: response.data.choices[0].message.content // 返回 AI 生成的內容
    };
  } catch (error) {
    console.error('GPT-4.1-Nano API 呼叫失敗:', error.response?.data || error.message);
    throw new Error(`GPT-4.1-Nano API 呼叫失敗: ${error.response?.data?.error?.message || error.message}`);
  }
}

// Gemini API 呼叫函數 (已更新為直接使用 Node.js SDK)
async function callGeminiAPI(prompt) {
  try {
    const apiKey = process.env.GEMINI_API_KEY; // 從環境變數獲取 API Key
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not found in environment variables");
    }

    // 初始化 GoogleGenerativeAI 客戶端
    const genAI = new GoogleGenerativeAI(apiKey);

    // 獲取 Gemini 模型實例
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // 設定生成配置
    const generationConfig = {
      temperature: 0.7,
      topP: 1,
      topK: 1,
      maxOutputTokens: 2048,
    };

    // 設定安全設定
    const safetySettings = [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    ];

    // 呼叫 Gemini API
    const result = await model.generateContent({
      contents: [{ parts: [{ text: prompt }] }], // 將 prompt 作為內容傳遞
      generationConfig,
      safetySettings,
    });

    const response = await result.response; // 獲取 API 回應
    const text = response.text(); // 提取回應中的文字內容

    return {
      success: true,
      provider: "gemini-2.0-flash",
      content: text, // 返回 AI 生成的內容
    };

  } catch (error) {
    console.error('Gemini API 呼叫失敗:', error.message);
    throw new Error(`Gemini API 呼叫失敗: ${error.message}`);
  }
}

const { logAudit, clampMetadataSize, summarizeText } = require('../services/auditService');

// 主要的 5Rs 分析功能 (作為 Express.js 路由處理器)
exports.analyze5RsReflection = async (req, res) => {
  try {
    const { studentContent, preferredProvider = 'auto' } = req.body;

    // 驗證輸入
    if (!studentContent) {
      return res.status(400).json({
        success: false,
        message: '請提供學生的 5Rs 反思內容'
      });
    }

    // Log 使用者的反思內容
    console.log('=== 5Rs AI 分析開始 ===');
    console.log('使用者反思內容:', JSON.stringify(studentContent, null, 2));
    console.log('偏好的提供者:', preferredProvider);

    // 建構分析提示
    const analysisPrompt = build5RsAnalysisPrompt(studentContent);
    console.log('=== 生成的 Prompt ===');
    console.log(analysisPrompt);
    console.log('========================');

    let result;

    // 根據偏好選擇 API 提供者
    if (preferredProvider === 'auto') {
      try {
        console.log('自動模式：嘗試使用 Gemini API...');
        result = await callGeminiAPI(analysisPrompt);
        console.log('Gemini API 成功，使用模型:', result.provider);
      } catch (geminiError) {
        console.log('Gemini 失敗，嘗試使用 GPT-4.1-Nano API...');
        try {
          result = await callGPTNanoAPI(analysisPrompt);
          console.log('GPT-4.1-Nano 成功，使用模型:', result.provider);
        } catch (nanoError) {
          console.log('Nano 也失敗，改用 GPT-4o-mini API...');
          result = await callGPTAPI(analysisPrompt);
          console.log('GPT-4o-mini 成功，使用模型:', result.provider);
        }
      }
    } else if (preferredProvider === 'gpt') {
      try {
        console.log('嘗試使用 GPT-4o-mini API...');
        result = await callGPTAPI(analysisPrompt);
        console.log('GPT-4o-mini API 成功，使用模型:', result.provider);
      } catch (error) {
        console.log('GPT-4o-mini API 失敗，嘗試使用 Gemini API...');
        result = await callGeminiAPI(analysisPrompt);
        console.log('Gemini API 成功，使用模型:', result.provider);
      }
    } else if (preferredProvider === 'gpt-nano') {
      try {
        console.log('嘗試使用 GPT-4.1-Nano API...');
        result = await callGPTNanoAPI(analysisPrompt);
        console.log('GPT-4.1-Nano API 成功，使用模型:', result.provider);
      } catch (error) {
        console.log('GPT-4.1-Nano API 失敗，嘗試使用 GPT-4o-mini API...');
        result = await callGPTAPI(analysisPrompt);
        console.log('GPT-4o-mini API 成功，使用模型:', result.provider);
      }
    } else if (preferredProvider === 'gemini') {
      try {
        console.log('嘗試使用 Gemini API...');
        result = await callGeminiAPI(analysisPrompt);
        console.log('Gemini API 成功，使用模型:', result.provider);
      } catch (error) {
        console.log('Gemini API 失敗，嘗試使用 GPT-4.1-Nano API...');
        result = await callGPTNanoAPI(analysisPrompt);
        console.log('GPT-4.1-Nano API 成功，使用模型:', result.provider);
      }
    } else {
      return res.status(400).json({
        success: false,
        message: '不支援的 API 提供者。請使用 "gpt", "gpt-nano", "gemini", 或 "auto"'
      });
    }

    // 解析 AI 回應
    console.log('=== AI 原始回應 ===');
    console.log('使用的模型:', result.provider);
    console.log('原始回應內容:', result.content);
    console.log('==================');

    let feedback;
    try {
      // 嘗試解析 JSON 回應
      // 使用正則表達式來提取 JSON 字符串，即使回應中包含額外的文字
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        feedback = JSON.parse(jsonMatch[0]);
        console.log('成功解析 JSON 回應:', JSON.stringify(feedback, null, 2));
      } else {
        // 如果無法解析為 JSON，建立預設結構
        console.log('無法解析為 JSON，使用預設結構');
        feedback = {
          overall: result.content,
          reporting: "",
          responding: "",
          relating: "",
          reasoning: "",
          reconstructing: "",
          suggestions: []
        };
      }
    } catch (parseError) {
      console.error('解析 AI 回應失敗:', parseError);
      // 如果解析失敗，也建立預設結構，將原始內容放入 overall
      feedback = {
        overall: result.content,
        reporting: "",
        responding: "",
        relating: "",
        reasoning: "",
        reconstructing: "",
        suggestions: []
      };
    }

    // 返回分析結果
    const finalResponse = {
      success: true,
      provider: result.provider,
      feedback: feedback,
      analysisDate: new Date().toISOString()
    };

    console.log('=== 最終回應 ===');
    console.log('回應資料:', JSON.stringify(finalResponse, null, 2));
    console.log('=== 5Rs AI 分析結束 ===');

    try {
      await logAudit(req, {
        action: 'ASSISTANT_5RS_ANALYZE',
        targetType: 'assistant',
        targetId: null,
        projectId: null,
        metadata: clampMetadataSize({
          input: Object.fromEntries(Object.entries(studentContent || {}).map(([k, v]) => [k, summarizeText(String(v || ''))])),
          provider: result.provider
        })
      });
    } catch (_) {}

    res.status(200).json(finalResponse);

  } catch (error) {
    console.error('5Rs 分析失敗:', error);
    res.status(500).json({
      success: false,
      message: '分析過程中發生錯誤',
      error: error.message
    });
  }
};

// 獲取 5Rs 框架資訊
exports.get5RsFramework = (req, res) => {
  res.status(200).json({
    success: true,
    framework: FIVE_R_FRAMEWORK
  });
};

// 驗證 5Rs 內容格式
exports.validate5RsContent = (req, res) => {
  const { content } = req.body;

  try {
    // 嘗試解析 JSON
    const parsed = JSON.parse(content);

    // 檢查是否為 5Rs 格式
    const is5Rs = parsed.type === "5Rs_reflection" && parsed.data;

    if (is5Rs) {
      // 檢查每個 R 的完整性
      const requiredFields = ['reporting', 'responding', 'relating', 'reasoning', 'reconstructing'];
      const missingFields = requiredFields.filter(field => !parsed.data[field]);

      const resp = {
        success: true,
        is5RsFormat: true,
        completeness: {
          total: requiredFields.length,
          completed: requiredFields.length - missingFields.length,
          missing: missingFields
        },
        data: parsed.data
      };
      try {
        logAudit(req, {
          action: 'ASSISTANT_5RS_VALIDATE',
          targetType: 'assistant',
          targetId: null,
          projectId: null,
          metadata: clampMetadataSize({
            is5RsFormat: true,
            missing: missingFields,
            sample: Object.fromEntries(Object.entries(parsed.data || {}).slice(0, 2).map(([k, v]) => [k, summarizeText(String(v || ''))]))
          })
        });
      } catch (_) {}
      res.status(200).json(resp);
    } else {
      const resp = {
        success: true,
        is5RsFormat: false,
        message: '內容不是 5Rs 反思格式'
      };
      try { logAudit(req, { action: 'ASSISTANT_5RS_VALIDATE', targetType: 'assistant', metadata: clampMetadataSize({ is5RsFormat: false }) }); } catch (_) {}
      res.status(200).json(resp);
    }
  } catch (error) {
    const resp = {
      success: true,
      is5RsFormat: false,
      message: '內容不是有效的 JSON 格式，可能是傳統文字格式'
    };
    try { logAudit(req, { action: 'ASSISTANT_5RS_VALIDATE', targetType: 'assistant', metadata: clampMetadataSize({ is5RsFormat: false, parseError: true }) }); } catch (_) {}
    res.status(200).json(resp);
  }
};
