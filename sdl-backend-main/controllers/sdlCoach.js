// SDL Coach Controller — 自主學習助手
//
// 用途：以「科學探究五階段 × 課綱」知識小抄為系統提示，提供學生學習方法論建議。
// 與既有 rag_message（科展 RAG）互補：
//   - rag_message → 查前人研究案例、具體實驗設計
//   - sdlCoach    → 學習方法論、探究鷹架、五階段引導
//
// 參考文件：docs/sdl-coach-knowledge-base.md

const fs = require('fs');
const path = require('path');
const { callWithFallback } = require('../services/llmGateway');
const { logAudit } = require('../services/auditService');

// 載入知識小抄（啟動時讀取一次，避免每次請求都讀檔）
const KNOWLEDGE_BASE_PATH = path.join(__dirname, '..', 'docs', 'sdl-coach-knowledge-base.md');
let KNOWLEDGE_BASE = '';
try {
    KNOWLEDGE_BASE = fs.readFileSync(KNOWLEDGE_BASE_PATH, 'utf8');
    console.log(`[SDL Coach] 知識小抄載入成功: ${KNOWLEDGE_BASE.length} chars`);
} catch (err) {
    console.error('[SDL Coach] 知識小抄載入失敗:', err.message);
}

const VALID_STAGES = ['定標', '擇策', '監評', '調節', '學習歷程'];

const MAX_QUESTION_LEN = 2000;
const MAX_CONTEXT_LEN = 3000;

// 清理輸入，移除常見 prompt injection 嘗試
function sanitize(text) {
    if (!text || typeof text !== 'string') return '';
    return text
        .replace(/(?:忽略|無視|跳過|覆蓋|override|ignore|disregard|forget).*(?:指令|規則|instructions?|rules?|above|以上|前面)/gi, '[已過濾]')
        .replace(/(?:system|系統|assistant|助手)\s*[:：]/gi, '[已過濾]')
        .trim();
}

// 建構系統提示：小抄 + 身分角色設定
function buildSystemInstruction() {
    if (!KNOWLEDGE_BASE) {
        return '你是自主學習助手，請以繁體中文回答學生的科學探究問題。';
    }
    return `${KNOWLEDGE_BASE}

---

【執行守則】
- 你是上方知識小抄所描述的「自主學習助手」。上方小抄是你的內部知識參考，**不可**在回應中複誦整段原文。
- 全程繁體中文。
- 語氣溫暖但務實，像一位經驗豐富的高中自然科老師。
- 單次回覆不超過 300 字（除非學生明確要求更詳細）。
- 回答格式建議：1) 幫學生定位階段 2) 1-3 個具體鷹架提問或行動 3) 結尾一句回饋問題。
- 禁止捏造文獻或研究結論。
- 禁止直接幫學生想題目 / 寫步驟 / 寫報告段落；用蘇格拉底式提問引導學生自己產出。`;
}

// 建構使用者提示：問題 + 階段 + 脈絡
function buildUserPrompt({ question, currentStage, context }) {
    const parts = [];

    if (currentStage && VALID_STAGES.includes(currentStage)) {
        parts.push(`【學生目前所在階段】${currentStage}`);
    }

    if (context) {
        parts.push(`【當前任務脈絡】\n${sanitize(context).slice(0, MAX_CONTEXT_LEN)}`);
    }

    parts.push(`【學生問題】\n${sanitize(question).slice(0, MAX_QUESTION_LEN)}`);
    parts.push('\n請依執行守則回答。');

    return parts.join('\n\n');
}

/**
 * POST /api/sdl-coach/ask
 * Body: { question, currentStage?, context?, projectId? }
 */
exports.askCoach = async (req, res) => {
    const { question, currentStage, context, projectId } = req.body || {};

    if (!question || typeof question !== 'string' || !question.trim()) {
        return res.status(400).json({
            success: false,
            message: '請提供學生問題 (question)'
        });
    }

    if (question.length > MAX_QUESTION_LEN) {
        return res.status(400).json({
            success: false,
            message: `問題長度不得超過 ${MAX_QUESTION_LEN} 字`
        });
    }

    if (currentStage && !VALID_STAGES.includes(currentStage)) {
        return res.status(400).json({
            success: false,
            message: `currentStage 必須為: ${VALID_STAGES.join('、')}`
        });
    }

    const systemPrompt = buildSystemInstruction();
    const userPrompt = buildUserPrompt({ question, currentStage, context });

    try {
        // Fallback 鏈: Gemma-4 → GPT-OSS-20B → Gemini-3.1 (DEFAULT_FALLBACK_CHAIN)
        const result = await callWithFallback({
            systemPrompt,
            userPrompt
        });

        res.json({
            success: true,
            answer: result.content,
            provider: result.model,
            stage: currentStage || null
        });

        // 審計追蹤：SDL Coach 提問
        logAudit(req, {
            action: 'SDL_COACH_ASK',
            targetType: 'SdlCoach',
            targetId: projectId || null,
            metadata: {
                questionLength: question.length,
                stage: currentStage || null,
                hasContext: !!context,
                provider: result.model
            }
        }).catch(err => {
            console.error('[Audit] 記錄 SDL_COACH_ASK 失敗:', err.message);
        });

    } catch (err) {
        console.error('[SDL Coach] 呼叫 LLM 失敗:', err.message);
        res.status(500).json({
            success: false,
            message: '自主學習助手暫時無法回應，請稍後再試',
            error: err.message
        });
    }
};

/**
 * GET /api/sdl-coach/health
 * 健康檢查：確認知識小抄已載入
 */
exports.health = (req, res) => {
    res.json({
        success: true,
        knowledgeBaseLoaded: KNOWLEDGE_BASE.length > 0,
        knowledgeBaseSize: KNOWLEDGE_BASE.length,
        validStages: VALID_STAGES
    });
};
