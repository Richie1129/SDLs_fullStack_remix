/**
 * LLM Gateway — 統一 AI 模型呼叫入口
 *
 * 從以下檔案提取並整合的共用邏輯：
 *   - controllers/kbCoach.js     (callVLLM, callGemini, callAIWithFallback)
 *   - controllers/llm_5R.js      (callVLLMGemmaAPI, callHsuehVLLMAPI, callGeminiAPI)
 *   - services/gemini.js         (callGeminiAPI, callGeminiGrounding)
 *   - services/aiTaskAssistantService.js (_callVLLM)
 *   - services/chatLlmService.js (callGemini)
 *
 * 設計原則 (Kaizen — Standardized Work)：
 *   - 單一負責：所有 LLM 呼叫從此處發出
 *   - 單一 GoogleGenAI 實例（Singleton，減少記憶體配置）
 *   - 標準化 fallback 鏈
 *   - 統一錯誤處理和日誌格式
 *   - 向後相容：暴露與舊版相同的介面
 */

const axios = require('axios');
const { GoogleGenAI } = require('@google/genai');

const logger = require('../config/logger');

// ============================================================================
// vLLM 模型配置（集中管理）
// ============================================================================

const VLLM_MODELS = {
    'gpt-oss': {
        baseURL: process.env.HSUEH_VLLM_BASE_URL || 'https://hsueh-vllmapi.agenticgrader.com/v1',
        modelName: process.env.HSUEH_VLLM_MODEL_NAME || 'ISTA-DASLab/Meta-Llama-3.1-8B-Instruct-GPTQ-INT4',
        apiKey: process.env.HSUEH_VLLM_API_KEY || '',
        displayName: 'GPT-OSS-20B',
    },
    'gemma': {
        baseURL: process.env.VLLM_BASE_URL || 'https://vllm-193.hsueh.tw/v1',
        modelName: process.env.VLLM_MODEL_NAME || '/models/gemma-4-26B-A4B-it',
        apiKey: process.env.VLLM_API_KEY || 'dummy',
        displayName: 'Gemma-4-26B',
    },
};

// ============================================================================
// Gemini 配置（Singleton）
// ============================================================================

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite-preview';

/** @returns {string[]} 可用的 Gemini API key 列表 */
function getGeminiKeys() {
    return [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_2].filter(Boolean);
}

/** Lazy-init：每把 key 用獨立的 client，支援 key rotation fallback */
const _geminiClients = {};
function getGeminiClient(apiKey) {
    if (!_geminiClients[apiKey]) {
        _geminiClients[apiKey] = new GoogleGenAI({ apiKey });
    }
    return _geminiClients[apiKey];
}

// ============================================================================
// 預設安全策略
// ============================================================================

const DEFAULT_SAFETY_SETTINGS = [
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
];

// ============================================================================
// 工具函數：JSON 提取
// ============================================================================

/**
 * 使用括號平衡算法從文字中提取第一個完整的 JSON 物件。
 * 從 kbCoach.js 提取的通用邏輯。
 *
 * @param {string} text
 * @returns {object|null}
 */
function extractFirstJsonObject(text) {
    const startIdx = text.indexOf('{');
    if (startIdx === -1) return null;

    let depth = 0;
    let inString = false;
    let escapeNext = false;

    for (let i = startIdx; i < text.length; i++) {
        const char = text[i];
        if (escapeNext) { escapeNext = false; continue; }
        if (char === '\\') { escapeNext = true; continue; }
        if (char === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (char === '{') depth++;
        if (char === '}') depth--;
        if (depth === 0) {
            try {
                return JSON.parse(text.substring(startIdx, i + 1));
            } catch {
                return null;
            }
        }
    }
    return null;
}

/**
 * 從 LLM 原始回應中安全地解析 JSON。
 * 支援：純 JSON、markdown code block 包裝、混雜文字。
 *
 * @param {string} raw
 * @returns {object|null}
 */
function parseJsonResponse(raw) {
    if (!raw) return null;

    // 1. 直接解析
    try { return JSON.parse(raw); } catch { /* continue */ }

    // 2. 移除 markdown code block
    const cleaned = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
    try { return JSON.parse(cleaned); } catch { /* continue */ }

    // 3. 括號平衡提取
    return extractFirstJsonObject(raw);
}

// ============================================================================
// 核心：vLLM 呼叫
// ============================================================================

/**
 * 呼叫 vLLM 模型（OpenAI-Compatible API）
 *
 * @param {string} modelKey - 模型 key（'gpt-oss' | 'gemma'）
 * @param {object} options
 * @param {string} options.systemPrompt - 系統提示詞
 * @param {string} options.userPrompt - 使用者提示詞
 * @param {number} [options.timeout=30000] - 請求超時 (ms)
 * @param {number} [options.temperature=0.7]
 * @param {number} [options.maxTokens=2000]
 * @param {boolean} [options.jsonMode=false] - 是否要求 JSON 回應
 * @returns {Promise<{content: string, model: string, parsed?: object}>}
 */
async function callVLLM(modelKey, options = {}) {
    const config = VLLM_MODELS[modelKey];
    if (!config) {
        throw new Error(`[LLM Gateway] Unknown vLLM model key: ${modelKey}`);
    }

    const {
        systemPrompt = '',
        userPrompt = '',
        timeout = 30000,
        temperature = 0.7,
        maxTokens = 2000,
        jsonMode = false,
    } = options;

    const requestBody = {
        model: config.modelName,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ],
        temperature,
        max_tokens: maxTokens,
    };

    if (jsonMode) {
        requestBody.response_format = { type: 'json_object' };
    }

    const headers = { 'Content-Type': 'application/json' };
    if (config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    try {
        const response = await axios.post(
            `${config.baseURL}/chat/completions`,
            requestBody,
            { timeout, headers }
        );

        const content = response.data?.choices?.[0]?.message?.content;
        const finishReason = response.data?.choices?.[0]?.finish_reason;
        if (!content) {
            throw new Error(`${config.displayName} 返回空內容`);
        }

        const result = { content, model: config.displayName, finishReason };

        // 如果請求 JSON 模式，嘗試解析
        if (jsonMode) {
            const parsed = parseJsonResponse(content);
            if (!parsed) {
                logger.warn({ modelKey, rawContent: content.substring(0, 300) },
                    `[LLM Gateway] ${config.displayName} JSON 解析失敗`);
                throw new Error(`${config.displayName} 返回的內容無法解析為 JSON`);
            }
            result.parsed = parsed;
        }

        return result;
    } catch (error) {
        const errMsg = error.response?.data?.error?.message || error.message;
        logger.warn(`[LLM Gateway] ${config.displayName} 失敗: ${errMsg}`);
        throw new Error(`${config.displayName} 呼叫失敗: ${errMsg}`);
    }
}

// ============================================================================
// 核心：Gemini 呼叫
// ============================================================================

/**
 * 呼叫 Gemini 模型（支援多 key fallback）
 *
 * @param {object} options
 * @param {string} options.prompt - 使用者提示內容（string 或 contents array）
 * @param {string} [options.systemInstruction] - 系統指示
 * @param {number} [options.temperature=0.7]
 * @param {number} [options.maxOutputTokens=2048]
 * @param {object} [options.responseSchema] - 結構化輸出 schema
 * @param {string} [options.responseMimeType] - 回應 MIME type
 * @param {Array}  [options.tools] - Gemini tools（如 googleSearch）
 * @param {Array}  [options.safetySettings]
 * @param {string} [options.model] - 覆寫模型名稱
 * @returns {Promise<{content: string, model: string, usedKey: string, raw?: object}>}
 */
async function callGemini(options = {}) {
    const {
        prompt,
        systemInstruction,
        temperature = 0.7,
        maxOutputTokens = 2048,
        topP = 1,
        topK = 1,
        responseSchema,
        responseMimeType,
        tools,
        safetySettings = DEFAULT_SAFETY_SETTINGS,
        model = GEMINI_MODEL,
    } = options;

    const keys = getGeminiKeys();
    if (keys.length === 0) {
        throw new Error('[LLM Gateway] GEMINI_API_KEY 未設定');
    }

    let lastError = null;

    for (let i = 0; i < keys.length; i++) {
        const apiKey = keys[i];
        const keyAlias = i === 0 ? 'PRIMARY' : `BACKUP_${i}`;

        try {
            const client = getGeminiClient(apiKey);

            const config = {
                temperature,
                topP,
                topK,
                maxOutputTokens,
                safetySettings,
            };

            if (systemInstruction) {
                config.systemInstruction = systemInstruction;
            }
            if (responseSchema) {
                config.responseSchema = responseSchema;
                config.responseMimeType = responseMimeType || 'application/json';
            }
            if (tools) {
                config.tools = tools;
            }

            const result = await client.models.generateContent({
                model,
                contents: prompt,
                config,
            });

            const text = result?.text || '';
            if (!text && !result?.candidates) {
                throw new Error('Gemini 返回空回應');
            }

            return {
                content: text,
                model,
                usedKey: keyAlias,
                raw: result,
            };
        } catch (error) {
            const errMsg = error?.message || '未知錯誤';
            logger.warn(`[LLM Gateway] Gemini (${keyAlias}) 失敗: ${errMsg}`);
            lastError = error;

            if (i + 1 < keys.length) {
                logger.info(`[LLM Gateway] 嘗試備援金鑰...`);
            }
        }
    }

    throw new Error(`[LLM Gateway] Gemini 所有金鑰都失敗: ${lastError?.message}`);
}

// ============================================================================
// 高階：Fallback 鏈
// ============================================================================

/**
 * 預設 fallback 鏈順序
 * @type {Array<{type: 'vllm'|'gemini', key?: string, label: string}>}
 */
const DEFAULT_FALLBACK_CHAIN = [
    { type: 'vllm', key: 'gemma', label: 'Gemma-4-26B' },
    { type: 'vllm', key: 'gpt-oss', label: 'GPT-OSS-20B' },
    { type: 'gemini', label: 'Gemini-3.1-Flash-Lite-Preview' },
];

/**
 * 帶 fallback 鏈的 AI 呼叫
 *
 * @param {object} options
 * @param {string} options.systemPrompt
 * @param {string} options.userPrompt
 * @param {boolean} [options.jsonMode=false]
 * @param {object} [options.responseSchema] - Gemini 專用
 * @param {Array}  [options.fallbackChain] - 自訂 fallback 順序
 * @param {number} [options.timeout=30000]
 * @returns {Promise<{content: string, model: string, parsed?: object}>}
 */
async function callWithFallback(options = {}) {
    const {
        systemPrompt,
        userPrompt,
        jsonMode = false,
        responseSchema,
        fallbackChain = DEFAULT_FALLBACK_CHAIN,
        timeout = 30000,
        maxTokens,        // 可選：傳入則覆寫 vLLM 預設 2000 / Gemini 預設 2048
    } = options;

    const errors = [];

    for (const step of fallbackChain) {
        try {
            logger.info(`[LLM Gateway] 嘗試使用 ${step.label}...`);

            if (step.type === 'vllm') {
                const result = await callVLLM(step.key, {
                    systemPrompt,
                    userPrompt,
                    timeout,
                    jsonMode,
                    ...(maxTokens ? { maxTokens } : {}),
                });
                // 統一回傳格式
                return {
                    content: result.parsed ? JSON.stringify(result.parsed) : result.content,
                    model: result.model,
                    parsed: result.parsed || undefined,
                    data: result.parsed || undefined, // 向後相容 kbCoach 的 { data, model } 格式
                    finishReason: result.finishReason,
                };
            }

            if (step.type === 'gemini') {
                const geminiOpts = {
                    prompt: [{ role: 'user', parts: [{ text: userPrompt }] }],
                    systemInstruction: systemPrompt,
                    temperature: 0.7,
                    ...(maxTokens ? { maxOutputTokens: maxTokens } : {}),
                };

                if (responseSchema) {
                    // Gemini 結構化輸出
                    geminiOpts.responseMimeType = 'application/json';
                    geminiOpts.responseSchema = responseSchema;
                }

                const result = await callGemini(geminiOpts);

                let parsed = null;
                if (jsonMode || responseSchema) {
                    parsed = parseJsonResponse(result.content);
                }

                return {
                    content: result.content,
                    model: result.model,
                    parsed: parsed || undefined,
                    data: parsed || undefined,
                };
            }
        } catch (error) {
            errors.push({ model: step.label, error: error.message });
            logger.warn(`[LLM Gateway] ${step.label} 失敗，嘗試下一個 fallback`);
        }
    }

    const summary = errors.map(e => `${e.model}: ${e.error}`).join('; ');
    throw new Error(`[LLM Gateway] 所有模型都失敗: ${summary}`);
}

// ============================================================================
// 向後相容 API
// ============================================================================

/**
 * 向後相容：與原本 services/gemini.js 的 callGeminiAPI 相同介面
 */
async function callGeminiAPI(prompt, options = {}) {
    const systemInstruction = options.systemInstruction
        || `你是專業的 AI 助手。

**重要格式要求**：
- 必須使用 Markdown 格式回覆
- 使用 ## 標題組織答案結構
- 使用 **粗體** 標記重要資訊
- 使用列表（-）讓內容更清晰
- 程式碼或檔名使用 \`反引號\`
- 使用繁體中文回覆`;

    const result = await callGemini({
        prompt,
        systemInstruction,
        temperature: options.generationConfig?.temperature || 0.7,
        topP: options.generationConfig?.topP || 1,
        topK: options.generationConfig?.topK || 1,
        maxOutputTokens: options.generationConfig?.maxOutputTokens || 2048,
        safetySettings: options.safetySettings,
    });

    return {
        success: true,
        provider: result.model,
        content: result.content,
        usedKey: result.usedKey,
    };
}

/**
 * 向後相容：與原本 services/gemini.js 的 callGeminiGrounding 相同介面
 */
async function callGeminiGrounding(question, options = {}) {
    const systemInstruction = options.systemInstruction
        || '你是專業的資訊檢索助手。請搜尋相關資料並返回最相關的網頁連結。使用繁體中文回覆。';

    const result = await callGemini({
        prompt: question,
        systemInstruction,
        tools: [{ googleSearch: {} }],
    });

    // 解析 grounding metadata
    const groundingMetadata = result.raw?.candidates?.[0]?.groundingMetadata
        || result.raw?.groundingMetadata;

    if (!groundingMetadata || !groundingMetadata.groundingChunks) {
        return { success: true, externalLinks: [], usedKey: result.usedKey };
    }

    const externalLinks = groundingMetadata.groundingChunks
        .filter(chunk => chunk.web)
        .map(chunk => ({
            title: chunk.web.title || '無標題',
            url: chunk.web.uri,
            snippet: '',
        }));

    return {
        success: true,
        externalLinks: externalLinks.slice(0, 5),
        usedKey: result.usedKey,
        webSearchQueries: groundingMetadata.webSearchQueries || [],
    };
}

// ============================================================================
// Exports
// ============================================================================

module.exports = {
    // 核心 API
    callVLLM,
    callGemini,
    callWithFallback,

    // 工具
    parseJsonResponse,
    extractFirstJsonObject,

    // 向後相容
    callGeminiAPI,
    callGeminiGrounding,

    // 配置（供外部讀取）
    VLLM_MODELS,
    GEMINI_MODEL,
    DEFAULT_FALLBACK_CHAIN,
};
