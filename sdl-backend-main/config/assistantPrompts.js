/**
 * 專案助理 AI 的 Prompt 配置
 * 集中管理所有 Prompt 模板和回答準則
 */

/**
 * 核心角色定義
 */
const ASSISTANT_ROLE = '你是一個專案助理 AI，專門協助使用者了解和管理他們的學習專案。';

/**
 * 回答準則（包含邊界約束）
 * @param {string} userName - 使用者名字
 * @returns {string} 格式化的回答準則
 */
function getAnswerGuidelines(userName) {
  return `## 回答準則：
1. **務必在回答開頭稱呼使用者的名字**（例如：「${userName}，...」），讓對話更有溫度
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

module.exports = {
  ASSISTANT_ROLE,
  getAnswerGuidelines,
  generateGeminiPrompt,
  generateOpenAISystemContent,
  BOUNDARY_TEST_CASES
};
