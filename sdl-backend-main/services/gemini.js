/**
 * services/gemini.js — 向後相容封裝
 *
 * [Deprecated] 已遷移至 services/llmGateway.js
 * 此檔案僅為向後相容而保留，新程式碼請直接使用 llmGateway。
 */

const { callGeminiAPI, callGeminiGrounding } = require('./llmGateway');

module.exports = { callGeminiAPI, callGeminiGrounding };
