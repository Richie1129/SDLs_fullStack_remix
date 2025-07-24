// 5Rs 反思工具函式

// 檢查內容是否為 5Rs 格式
export const is5RsFormat = (content) => {
  try {
    const parsed = JSON.parse(content);
    return parsed.type === "5Rs_reflection" && parsed.data;
  } catch {
    return false;
  }
};

// 解析 5Rs 內容
export const parse5RsContent = (content) => {
  try {
    const parsed = JSON.parse(content);
    if (parsed.type === "5Rs_reflection") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
};

// 建構 5Rs JSON 字串
export const build5RsContent = (data, feedback = null) => {
  const content = {
    type: "5Rs_reflection",
    version: "1.0",
    data: {
      reporting: data.reporting || "",
      responding: data.responding || "",
      relating: data.relating || "",
      reasoning: data.reasoning || "",
      reconstructing: data.reconstructing || ""
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // 如果有 AI 反饋，則添加到內容中
  if (feedback) {
    content.feedback = {
      reporting: feedback.reporting || "",
      responding: feedback.responding || "",
      relating: feedback.relating || "",
      reasoning: feedback.reasoning || "",
      reconstructing: feedback.reconstructing || "",
      overall: feedback.overall || "",
      suggestions: feedback.suggestions || [],
      provider: feedback.provider || "AI",
      analysisDate: feedback.analysisDate || new Date().toISOString()
    };
  }

  return JSON.stringify(content, null, 2);
};

// 從 5Rs JSON 中提取純文字內容（用於搜尋或預覽）
export const extract5RsText = (content) => {
  const parsed = parse5RsContent(content);
  if (!parsed) return content;
  
  const { data } = parsed;
  return [
    data.reporting,
    data.responding,
    data.relating,
    data.reasoning,
    data.reconstructing
  ].filter(text => text && text.trim()).join('\n\n');
};

// 計算 5Rs 完成度
export const calculate5RsCompleteness = (content) => {
  const parsed = parse5RsContent(content);
  if (!parsed) return { completed: 0, total: 5, percentage: 0 };
  
  const { data } = parsed;
  const fields = ['reporting', 'responding', 'relating', 'reasoning', 'reconstructing'];
  const completed = fields.filter(field => data[field] && data[field].trim()).length;
  
  return {
    completed,
    total: fields.length,
    percentage: Math.round((completed / fields.length) * 100)
  };
};

// 5Rs 框架定義（與後端保持一致）
export const FIVE_R_FRAMEWORK = {
  reporting: {
    title: "Reporting (報告)",
    description: "描述性地敘述一個情境、事件或問題",
    placeholder: "請描述性地敘述一個情境、事件或問題。發生了什麼？涉及了什麼？",
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
    placeholder: "請表達您對這個情境的情感反應和個人感受...",
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
    placeholder: "請將這個經驗與您過去的經驗、理論知識或個人價值觀建立連結...",
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
    placeholder: "請分析和探索這個情境的深層原因，從不同角度進行思考...",
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
    placeholder: "請基於前面的反思，制定具體的學習計劃和未來行動方案...",
    guidingQuestions: [
      "你從這個經驗中學到了什麼？",
      "下次遇到類似情況，你會怎麼做？",
      "你需要發展哪些技能或知識？",
      "這個經驗如何影響你未來的行動計劃？"
    ]
  }
};

// 驗證 5Rs 資料格式
export const validate5RsData = (data) => {
  const errors = [];
  const requiredFields = ['reporting', 'responding', 'relating', 'reasoning', 'reconstructing'];
  
  requiredFields.forEach(field => {
    if (!data[field] || typeof data[field] !== 'string') {
      errors.push(`${FIVE_R_FRAMEWORK[field].title} 欄位必須是字串`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// 格式化 5Rs 內容用於顯示
export const format5RsForDisplay = (content) => {
  const parsed = parse5RsContent(content);
  if (!parsed) return null;
  
  const { data, feedback = {} } = parsed;
  const formatted = {};
  
  Object.keys(FIVE_R_FRAMEWORK).forEach(key => {
    formatted[key] = {
      title: FIVE_R_FRAMEWORK[key].title,
      content: data[key] || "",
      feedback: feedback[key] || "",
      hasContent: !!(data[key] && data[key].trim()),
      hasFeedback: !!(feedback[key] && feedback[key].trim())
    };
  });
  
  return {
    sections: formatted,
    overallFeedback: feedback.overall || "",
    suggestions: feedback.suggestions || [],
    hasOverallFeedback: !!(feedback.overall && feedback.overall.trim()),
    provider: feedback.provider || "",
    analysisDate: feedback.analysisDate || "",
    completeness: calculate5RsCompleteness(content)
  };
};
