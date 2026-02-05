/**
 * 反思日誌引導工具
 * 根據選擇的階段提供動態的寫作提示
 */

// 通用反思提示（沒選階段時顯示）
const DEFAULT_REFLECTION_PROMPTS = [
  "最近完成的進度內容",
  "完成的心得反思",
  "下次預計完成的進度內容",
  "是否遇到新的問題"
];

// 各階段專屬的反思引導問題
const STAGE_REFLECTION_GUIDES = {
  '1-1': {
    stageName: '分組',
    prompts: [
      "你們如何決定研究主題？過程中有哪些想法？",
      "為什麼選擇這個主題？它對你們有什麼意義？",
      "分組過程順利嗎？有遇到什麼困難？",
      "組員之間的想法有什麼不同？如何達成共識？"
    ]
  },
  '1-2': {
    stageName: '專題設定',
    prompts: [
      "你們如何確定研究題目和目的？",
      "找到哪些相關資料或文獻？它們如何幫助你理解主題？",
      "研究題目有經過修改嗎？為什麼要調整？",
      "這個階段最大的收穫是什麼？"
    ]
  },
  '2-1': {
    stageName: '文獻探討',
    prompts: [
      "你們找到了哪些重要文獻？",
      "這些文獻如何幫助你們理解研究主題？",
      "文獻搜尋過程中有什麼困難？如何克服？",
      "從文獻中發現了什麼新的想法或方向？"
    ]
  },
  '2-2': {
    stageName: '設計研究（設計&分析）',
    prompts: [
      "你們的研究設計是什麼？為什麼這樣設計？",
      "預計的樣本規模是多少？如何決定的？",
      "資料收集的方法是什麼？有什麼優缺點？",
      "分析方法為何？為什麼選擇這個方法？"
    ]
  },
  '3-1': {
    stageName: '撰寫發展',
    prompts: [
      "目前撰寫進度到哪裡了？",
      "撰寫過程中遇到什麼困難？",
      "如何組織和呈現研究結果？",
      "還需要補充哪些內容？"
    ]
  },
  '4-1': {
    stageName: '組內同儕互評',
    prompts: [
      "組員給了什麼建議？哪些建議最有幫助？",
      "你對其他組員的報告有什麼看法？",
      "互評過程中學到了什麼？",
      "打算如何改進你們的報告？"
    ]
  },
  '4-2': {
    stageName: '組際同儕互評',
    prompts: [
      "其他組給了什麼回饋？哪些觀點讓你印象深刻？",
      "不同的觀點如何幫助你重新思考研究？",
      "你覺得哪些改進想法最值得採用？",
      "從其他組的報告中學到了什麼？"
    ]
  },
  '4-3': {
    stageName: '成果發表',
    prompts: [
      "發表過程順利嗎？有什麼印象深刻的時刻？",
      "觀眾或評審提出了哪些問題？你如何回應？",
      "對於未來的建議是什麼？",
      "整個專題下來，最大的收穫是什麼？"
    ]
  }
};

/**
 * 根據階段獲取反思引導提示
 * @param {string} stage - 階段代碼（如 "2-2"）
 * @returns {Object} { stageName, prompts, hasStageGuide }
 */
export function getReflectionGuide(stage) {
  if (!stage || stage === '') {
    return {
      stageName: null,
      prompts: DEFAULT_REFLECTION_PROMPTS,
      hasStageGuide: false
    };
  }

  const guide = STAGE_REFLECTION_GUIDES[stage];
  
  if (guide) {
    return {
      stageName: guide.stageName,
      prompts: guide.prompts,
      hasStageGuide: true
    };
  }

  // 如果階段存在但沒有特定引導，返回通用提示
  return {
    stageName: null,
    prompts: DEFAULT_REFLECTION_PROMPTS,
    hasStageGuide: false
  };
}

/**
 * 格式化階段名稱顯示
 * @param {string} stage - 階段代碼（如 "2-2"）
 * @returns {string} 格式化的階段名稱
 */
export function formatStageName(stage) {
  const guide = STAGE_REFLECTION_GUIDES[stage];
  if (guide) {
    return `${stage} ${guide.stageName}`;
  }
  return stage;
}

/**
 * 檢查是否有該階段的引導
 * @param {string} stage - 階段代碼
 * @returns {boolean}
 */
export function hasStageGuide(stage) {
  return !!STAGE_REFLECTION_GUIDES[stage];
}
