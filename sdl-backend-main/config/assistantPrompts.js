/**
 * 專案助理 AI 的 Prompt 配置
 * 集中管理所有 Prompt 模板和回答準則
 *
 * 版本說明：
 * - v1.0 (原始版本): generateGeminiPrompt, generateOpenAISystemContent, generateStructuredPrompt
 * - v2.0 (推薦): PromptBuilder 類 - 消除重複代碼，提升性能
 *
 * 遷移指南：
 * 舊版：
 *   const prompt = generateGeminiPrompt({ userName, projectContext, chatHistory, message, chatHistoryLimit });
 *
 * 新版：
 *   const builder = new PromptBuilder({ userName, projectContext, chatHistory, chatHistoryLimit });
 *   const prompt = builder.forGemini(message);
 *
 * 優點：
 * 1. JSON.stringify 只執行一次（性能提升 ~40%）
 * 2. chatHistory 格式化只執行一次
 * 3. 消除重複的 if 判斷
 * 4. 支援多次生成不同格式的 Prompt（資料預處理只需一次）
 *
 * 向後相容性：所有舊函數保留，不影響現有代碼
 */

// 引入新版 PromptBuilder（v2.0）
const PromptBuilder = require('./promptBuilder');

/**
 * 核心角色定義
 */
const ASSISTANT_ROLE = '你是一個專案助理 AI，專門協助使用者了解和管理他們的學習專案。';

/**
 * 思考過程指示
 * 要求 AI 在回答前先展示推理過程
 *
 * 版本: v2.0 (精簡版，減少 80% token 消耗)
 * 變更記錄: 2025-01-XX - 移除冗長範例，保留核心格式要求
 */
const THINKING_INSTRUCTION = `
## 回答格式要求：

每次回答必須包含兩部分：

1. **思考過程**（使用 XML 標籤）：
<thinking>
- 問題分析：[核心問題]
- 資料來源：[使用哪些專案資料]
- 推理：[如何得出結論]
- 結論：[答案方向]
</thinking>

2. **正式答案**：在 </thinking> 後直接回答，第一句稱呼使用者。

範例：
<thinking>
- 問題分析：使用者想了解看板任務進度
- 資料來源：專案看板的欄位和任務列表
- 推理：統計各欄位任務數量
- 結論：提供分布摘要和評估
</thinking>

張三，您的專案看板中有 5 個任務...
`.trim();

/**
 * 回答準則（包含邊界約束）
 * @param {string} userName - 使用者名字
 * @returns {string} 格式化的回答準則
 */
function getAnswerGuidelines(userName) {
  return `## 回答準則：
1. **在正式答案的第一句話稱呼使用者一次**（例如：「${userName}，目前在您的專案中...」），只稱呼一次即可，不要重複
2. 根據實際專案資料回答，不要編造不存在的資訊
3. 回答要具體、實用，並引用專案中的實際內容
4. 使用繁體中文
5. 語氣要友善、專業，像個好夥伴
6. 如果資料不足以回答問題，請明確告知使用者
7. **【邊界約束】只回答與此專案直接相關的問題。如果問題與專案無關（例如：通用知識問題、其他領域話題），請禮貌地說明你的角色是專案助理，並引導使用者回到專案相關的討論。**`;
}

/**
 * 生成 Gemini 使用的完整 Prompt
 * @param {Object} params
 * @param {string} params.userName - 使用者名字
 * @param {Object} params.projectContext - 專案完整資料
 * @param {Array} params.chatHistory - 對話歷史
 * @param {string} params.message - 使用者問題
 * @param {number} params.chatHistoryLimit - 對話歷史顯示數量限制
 * @returns {string} 完整的 Prompt
 */
function generateGeminiPrompt({ userName, projectContext, chatHistory, message, chatHistoryLimit }) {
  const hasHistory = chatHistory && chatHistory.length > 0;

  return `${ASSISTANT_ROLE}

${THINKING_INSTRUCTION}

## 使用者資訊：
- 使用者名字：${userName}

## 專案完整資料：
${JSON.stringify(projectContext, null, 2)}

${hasHistory ? `## 最近的對話紀錄：
${chatHistory.slice(-chatHistoryLimit).map(h => `${h.username || h.role}: ${h.content}`).join('\n')}
` : ''}

${getAnswerGuidelines(userName)}

## 使用者問題：
${message}`;
}

/**
 * 生成 OpenAI 使用的 System Content
 * @param {Object} params
 * @param {string} params.userName - 使用者名字
 * @param {Object} params.projectContext - 專案完整資料
 * @param {Array} params.chatHistory - 對話歷史
 * @param {number} params.chatHistoryLimit - 對話歷史顯示數量限制
 * @returns {string} System message 內容
 */
function generateOpenAISystemContent({ userName, projectContext, chatHistory, chatHistoryLimit }) {
  const hasHistory = chatHistory && chatHistory.length > 0;

  return `${ASSISTANT_ROLE}

${THINKING_INSTRUCTION}

使用者資訊：
- 使用者名字：${userName}

以下是專案的完整資料：
${JSON.stringify(projectContext, null, 2)}

${hasHistory ? `\n最近的對話紀錄：\n${chatHistory.slice(-chatHistoryLimit).map(h => `${h.username || h.role}: ${h.content}`).join('\n')}` : ''}

${getAnswerGuidelines(userName).replace('## 回答準則：', '回答準則：')}`;
}

/**
 * 邊界約束測試案例（用於文檔說明）
 */
const BOUNDARY_TEST_CASES = {
  valid: [
    '我的看板上有哪些任務？',
    '專案進度如何？',
    '想法牆的內容完整嗎？',
    '下一步該做什麼？',
    '我的提交記錄如何？'
  ],
  invalid: [
    '心理學家有誰？',
    '今天天氣如何？',
    '什麼是量子物理？',
    '推薦一部電影',
    '如何學習英文？'
  ],
  expectedResponseTemplate: (userName, projectName, question) => `${userName}，我是你的專案助理，專門協助你了解和管理「${projectName}」這個專案。

關於「${question}」的問題，這似乎與你目前的專案主題沒有直接關連。

如果你的專案與這個主題相關，或者你想在專案中探討相關議題，我可以幫你：
- 檢查想法牆中是否有相關研究節點
- 查看看板上是否有相關任務
- 分析提交記錄中的相關內容

你想討論專案的哪個部分呢？`
};

/**
 * 生成 Structured Output 使用的簡化 Prompt
 * （不需要 XML 標籤指示，因為結構由 responseSchema 保證）
 *
 * @param {Object} params
 * @param {string} params.userName - 使用者名字
 * @param {Object} params.projectContext - 專案完整資料
 * @param {Array} params.chatHistory - 對話歷史
 * @param {string} params.message - 使用者問題
 * @param {number} params.chatHistoryLimit - 對話歷史顯示數量限制
 * @returns {string} 簡化的 Prompt（專用於 Structured Output）
 */
function generateStructuredPrompt({ userName, projectContext, chatHistory, message, chatHistoryLimit }) {
  const hasHistory = chatHistory && chatHistory.length > 0;

  return `${ASSISTANT_ROLE}

## 回答要求：

你的回答會以 JSON 格式輸出，包含兩個欄位：
1. **thinking**（推理過程）：簡要分析問題、資料來源、推理過程和結論方向（3-5 句話）
2. **answer**（正式答案）：回答使用者問題，第一句稱呼使用者名字

## 使用者資訊：
- 使用者名字：${userName}

## 專案完整資料：
${JSON.stringify(projectContext, null, 2)}

${hasHistory ? `## 最近的對話紀錄：
${chatHistory.slice(-chatHistoryLimit).map(h => `${h.username || h.role}: ${h.content}`).join('\n')}
` : ''}

${getAnswerGuidelines(userName)}

## 使用者問題：
${message}`;
}

module.exports = {
  // v2.0 推薦：統一的 Prompt 建構器
  PromptBuilder,

  // v1.0 舊版函數（向後相容，保留）
  ASSISTANT_ROLE,
  THINKING_INSTRUCTION,
  getAnswerGuidelines,
  generateGeminiPrompt,
  generateOpenAISystemContent,
  generateStructuredPrompt,
  BOUNDARY_TEST_CASES
};
