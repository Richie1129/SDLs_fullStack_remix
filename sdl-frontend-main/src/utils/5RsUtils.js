// 5Rs 反思工具函式

// 所有 R 的欄位鍵值
export const ALL_R_KEYS = ['reporting', 'responding', 'relating', 'reasoning', 'reconstructing'];

// 基礎層（建議填寫）與進階層（選填）分組
export const R_TIERS = {
  core: ['reporting', 'responding'],       // 描述與情感 — 入門反思
  advanced: ['relating', 'reasoning', 'reconstructing'], // 連結、推論、重建 — 深度反思
};

// 儲存的最低欄位數
export const MIN_REQUIRED_FIELDS = 2;

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
      analysisDate: feedback.analysisDate || new Date().toISOString(),
      // 新增可選欄位（若存在則保存）
      overall_assessment: feedback.overall_assessment || "",
      strengths: feedback.strengths || [],
      improvements: feedback.improvements || [],
      scores: feedback.scores || {},
      questions: feedback.questions || {},
      templates: feedback.templates || {},
      encouragement: feedback.encouragement || {}
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
  if (!parsed) return { completed: 0, total: ALL_R_KEYS.length, percentage: 0 };

  const { data } = parsed;
  const completed = ALL_R_KEYS.filter(field => data[field] && data[field].trim()).length;

  return {
    completed,
    total: ALL_R_KEYS.length,
    percentage: Math.round((completed / ALL_R_KEYS.length) * 100)
  };
};

// 5Rs 框架定義（與後端保持一致）
export const FIVE_R_FRAMEWORK = {
  reporting: {
    title: "Reporting (報告)",
    description: "描述性地敘述一個情境、事件或問題",
    placeholder: "請描述性地敘述一個情境、事件或問題。發生了什麼？涉及了什麼？",
    tier: 'core',
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
    tier: 'core',
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
    tier: 'advanced',
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
    tier: 'advanced',
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
    tier: 'advanced',
    guidingQuestions: [
      "你從這個經驗中學到了什麼？",
      "下次遇到類似情況，你會怎麼做？",
      "你需要發展哪些技能或知識？",
      "這個經驗如何影響你未來的行動計劃？"
    ]
  }
};

// 每個欄位的最低有效字數（中文字元）
export const MIN_FIELD_CHARS = 10;

// 檢查單一欄位內容品質（前端 + 後端共用邏輯）
export const checkFieldQuality = (text) => {
  if (!text || typeof text !== 'string') return { valid: false, reason: 'empty' };
  const trimmed = text.trim();
  if (!trimmed) return { valid: false, reason: 'empty' };

  // 過短（少於 MIN_FIELD_CHARS 個字元）
  if (trimmed.length < MIN_FIELD_CHARS) return { valid: false, reason: 'too_short' };

  // 純數字或純符號
  if (/^[\d\s.,;:!?@#$%^&*()_+\-=\[\]{}|\\/<>~`'"]+$/.test(trimmed)) {
    return { valid: false, reason: 'no_text' };
  }

  // 重複字元（如 aaaa、哈哈哈哈哈哈哈哈）
  // 判斷方式：去重後的字元數 < 原始長度的 30%
  const uniqueChars = new Set(trimmed.replace(/\s/g, '')).size;
  const nonSpaceLen = trimmed.replace(/\s/g, '').length;
  if (nonSpaceLen >= 6 && uniqueChars / nonSpaceLen < 0.3) {
    return { valid: false, reason: 'repetitive' };
  }

  return { valid: true, reason: null };
};

// 驗證 5Rs 資料格式（漸進式：至少填寫 MIN_REQUIRED_FIELDS 個欄位，含品質檢查）
export const validate5RsData = (data) => {
  const errors = [];

  // 檢查型別：有填的欄位必須是字串
  ALL_R_KEYS.forEach(field => {
    if (data[field] !== undefined && data[field] !== '' && typeof data[field] !== 'string') {
      errors.push(`${FIVE_R_FRAMEWORK[field].title} 欄位必須是字串`);
    }
  });

  // 品質檢查：有內容的欄位必須通過品質門檻
  ALL_R_KEYS.forEach(field => {
    const text = data[field];
    if (!text || !text.trim()) return; // 空的不檢查
    const quality = checkFieldQuality(text);
    if (!quality.valid) {
      const reasons = {
        too_short: `內容過短，請至少寫 ${MIN_FIELD_CHARS} 個字`,
        no_text: '請輸入有意義的文字內容',
        repetitive: '請避免重複輸入相同的文字',
      };
      errors.push(`${FIVE_R_FRAMEWORK[field].title}：${reasons[quality.reason] || '內容無效'}`);
    }
  });

  // 檢查最低數量（通過品質檢查的欄位才算）
  const qualityFilledCount = ALL_R_KEYS.filter(f => {
    const text = data[f];
    return text && text.trim() && checkFieldQuality(text).valid;
  }).length;
  if (qualityFilledCount < MIN_REQUIRED_FIELDS) {
    errors.push(`請至少填寫 ${MIN_REQUIRED_FIELDS} 個有效的反思層次`);
  }

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
  const scores = feedback.scores || {};
  const followupQuestions = feedback.questions || {};
  const fillTemplates = feedback.templates || {};
  const formatted = {};
  
  Object.keys(FIVE_R_FRAMEWORK).forEach(key => {
    formatted[key] = {
      title: FIVE_R_FRAMEWORK[key].title,
      content: data[key] || "",
      feedback: feedback[key] || "",
      hasContent: !!(data[key] && data[key].trim()),
      hasFeedback: !!(feedback[key] && feedback[key].trim()),
      score: typeof scores[key] === 'number' ? scores[key] : null,
      questions: Array.isArray(followupQuestions[key]) ? followupQuestions[key] : [],
      template: typeof fillTemplates[key] === 'string' ? fillTemplates[key] : ""
    };
  });
  
  return {
    sections: formatted,
    overallFeedback: feedback.overall || "",
    suggestions: feedback.suggestions || [],
    overallAssessment: feedback.overall_assessment || "",
    strengths: feedback.strengths || [],
    improvements: feedback.improvements || [],
    hasOverallFeedback: !!(feedback.overall && feedback.overall.trim()),
    provider: feedback.provider || "",
    analysisDate: feedback.analysisDate || "",
    completeness: calculate5RsCompleteness(content)
  };
};
