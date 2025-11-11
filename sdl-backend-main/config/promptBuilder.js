/**
 * PromptBuilder - 統一的 Prompt 生成器
 *
 * 設計原則（Linus 哲學）：
 * 1. 資料準備與格式化分離
 * 2. 消除特殊情況判斷
 * 3. 一次性處理，避免重複計算
 *
 * 版本：v2.0
 * 變更記錄：2025-01-11 - 重構三個重複函數為單一類
 */

// 為了避免循環依賴，直接內聯這些常數和函數
// 原始定義在 assistantPrompts.js

/**
 * 核心角色定義
 */
const ASSISTANT_ROLE = '你是一個專案助理 AI，專門協助使用者了解和管理他們的學習專案。';

/**
 * 思考過程指示
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
 * 取得回答準則
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
 * Prompt 建構器類別
 * 核心：資料預處理一次，輸出格式化多次
 */
class PromptBuilder {
    /**
     * @param {Object} params
     * @param {string} params.userName - 使用者名字
     * @param {Object} params.projectContext - 專案完整資料
     * @param {Array} params.chatHistory - 對話歷史
     * @param {number} params.chatHistoryLimit - 對話歷史顯示數量限制
     */
    constructor({ userName, projectContext, chatHistory, chatHistoryLimit = 5 }) {
        // 資料準備階段：所有邏輯只執行一次
        this.userName = userName;
        this.projectJson = JSON.stringify(projectContext, null, 2); // 只 stringify 一次
        this.formattedHistory = this._formatHistory(chatHistory, chatHistoryLimit);
        this.guidelines = getAnswerGuidelines(userName);
    }

    /**
     * 格式化對話歷史
     * 消除特殊情況：空陣列直接返回 null，不需要 if 判斷
     *
     * @private
     * @param {Array} history - 對話歷史
     * @param {number} limit - 顯示數量限制
     * @returns {string|null} 格式化的對話記錄，或 null
     */
    _formatHistory(history, limit) {
        if (!history || history.length === 0) {
            return null; // 消除特殊情況
        }

        return history
            .slice(-limit)
            .map(h => `${h.username || h.role}: ${h.content}`)
            .join('\n');
    }

    /**
     * 建構核心內容（所有格式共用）
     *
     * @private
     * @returns {Object} 核心內容物件
     */
    _buildCore() {
        return {
            role: ASSISTANT_ROLE,
            thinking: THINKING_INSTRUCTION,
            userName: this.userName,
            projectData: this.projectJson,
            history: this.formattedHistory,
            guidelines: this.guidelines
        };
    }

    /**
     * 生成 Gemini 格式 Prompt
     *
     * @param {string} message - 使用者問題
     * @returns {string} 完整的 Prompt
     */
    forGemini(message) {
        const core = this._buildCore();

        // 格式化輸出：Gemini 偏好 Markdown 標題
        return `${core.role}

${core.thinking}

## 使用者資訊：
- 使用者名字：${core.userName}

## 專案完整資料：
${core.projectData}

${core.history ? `## 最近的對話紀錄：
${core.history}
` : ''}
${core.guidelines}

## 使用者問題：
${message}`;
    }

    /**
     * 生成 OpenAI 格式 System Content
     *
     * @param {string} message - 使用者問題（可選，某些情況下 system message 不包含使用者問題）
     * @returns {string} System message 內容
     */
    forOpenAI(message = null) {
        const core = this._buildCore();

        // 格式化輸出：OpenAI 偏好較少的 Markdown
        let content = `${core.role}

${core.thinking}

使用者資訊：
- 使用者名字：${core.userName}

以下是專案的完整資料：
${core.projectData}

${core.history ? `\n最近的對話紀錄：\n${core.history}` : ''}

${core.guidelines.replace('## ', '')}`;

        // 如果提供了 message，加入使用者問題
        if (message) {
            content += `\n\n## 使用者問題：\n${message}`;
        }

        return content;
    }

    /**
     * 生成 Structured Output 格式 Prompt
     * 不需要 XML 標籤指示，因為結構由 responseSchema 保證
     *
     * @param {string} message - 使用者問題
     * @returns {string} 簡化的 Prompt
     */
    forStructured(message) {
        const core = this._buildCore();

        return `${core.role}

## 回答要求：

你的回答會以 JSON 格式輸出，包含兩個欄位：
1. **thinking**（推理過程）：簡要分析問題、資料來源、推理過程和結論方向（3-5 句話）
2. **answer**（正式答案）：回答使用者問題，第一句稱呼使用者名字

## 使用者資訊：
- 使用者名字：${core.userName}

## 專案完整資料：
${core.projectData}

${core.history ? `## 最近的對話紀錄：
${core.history}
` : ''}
${core.guidelines}

## 使用者問題：
${message}`;
    }

    /**
     * 取得預處理的資料（用於除錯或其他用途）
     *
     * @returns {Object} 預處理資料
     */
    getPreprocessedData() {
        return {
            userName: this.userName,
            projectJson: this.projectJson,
            formattedHistory: this.formattedHistory,
            guidelines: this.guidelines
        };
    }
}

module.exports = PromptBuilder;
