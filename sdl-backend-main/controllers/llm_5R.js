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
  return `你是一位經驗豐富的教育輔導員，專精於 5Rs 反思模型指導。請根據以下 5Rs 框架分析學生的反思日誌，並提供建設性的回饋。

## 5Rs 反思框架定義：

1. **Reporting (報告)**：${FIVE_R_FRAMEWORK.reporting.description}
2. **Responding (回應)**：${FIVE_R_FRAMEWORK.responding.description}
3. **Relating (關聯)**：${FIVE_R_FRAMEWORK.relating.description}
4. **Reasoning (推論)**：${FIVE_R_FRAMEWORK.reasoning.description}
5. **Reconstructing (重建)**：${FIVE_R_FRAMEWORK.reconstructing.description}

## 學生提交的 5Rs 反思內容：

**Reporting (報告)**：
${studentContent.reporting || '未填寫'}

**Responding (回應)**：
${studentContent.responding || '未填寫'}

**Relating (關聯)**：
${studentContent.relating || '未填寫'}

**Reasoning (推論)**：
${studentContent.reasoning || '未填寫'}

**Reconstructing (重建)**：
${studentContent.reconstructing || '未填寫'}

## 請提供分析與回饋：

請針對每個部分提供具體的、建設性的回饋，特別注意：
1. 評估每個部分的反思深度
2. 指出學生的優點和可改進之處
3. 提供引導性問題來幫助學生深化思考
4. 給予整體的反思品質評估

請以 JSON 格式回應，結構如下：
{
  "reporting": "針對 Reporting 部分的回饋",
  "responding": "針對 Responding 部分的回饋",
  "relating": "針對 Relating 部分的回饋",
  "reasoning": "針對 Reasoning 部分的回饋",
  "reconstructing": "針對 Reconstructing 部分的回饋",
  "overall": "整體反思的評估和建議",
  "suggestions": [
    "具體的改進建議1",
    "具體的改進建議2",
    "具體的改進建議3"
  ]
}`;
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
            content: '你是一位專業的教育輔導員，擅長使用 5Rs 反思框架指導學生進行深度反思。請提供專業、建設性且溫暖的回饋。'
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
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

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
    if (preferredProvider === 'gpt' || preferredProvider === 'auto') {
      try {
        console.log('嘗試使用 GPT API...');
        result = await callGPTAPI(analysisPrompt);
        console.log('GPT API 成功，使用模型:', result.provider);
      } catch (error) {
        console.log('GPT API 失敗，嘗試使用 Gemini API...');
        if (preferredProvider === 'auto') {
          result = await callGeminiAPI(analysisPrompt);
          console.log('Gemini API 成功，使用模型:', result.provider);
        } else {
          throw error; // 如果明確指定 GPT 但失敗，則拋出錯誤
        }
      }
    } else if (preferredProvider === 'gemini') {
      try {
        console.log('嘗試使用 Gemini API...');
        result = await callGeminiAPI(analysisPrompt);
        console.log('Gemini API 成功，使用模型:', result.provider);
      } catch (error) {
        console.log('Gemini API 失敗，嘗試使用 GPT API...');
        result = await callGPTAPI(analysisPrompt);
        console.log('GPT API 成功，使用模型:', result.provider);
      }
    } else {
      return res.status(400).json({
        success: false,
        message: '不支援的 API 提供者。請使用 "gpt", "gemini", 或 "auto"'
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

      res.status(200).json({
        success: true,
        is5RsFormat: true,
        completeness: {
          total: requiredFields.length,
          completed: requiredFields.length - missingFields.length,
          missing: missingFields
        },
        data: parsed.data
      });
    } else {
      res.status(200).json({
        success: true,
        is5RsFormat: false,
        message: '內容不是 5Rs 反思格式'
      });
    }
  } catch (error) {
    res.status(200).json({
      success: true,
      is5RsFormat: false,
      message: '內容不是有效的 JSON 格式，可能是傳統文字格式'
    });
  }
};