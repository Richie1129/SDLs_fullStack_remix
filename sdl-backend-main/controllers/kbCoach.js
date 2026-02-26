/**
 * KB Coach Controller (AI-Scaffold Orchestrator - Phase 1 MVP)
 * 
 * 基於 Multi-Agent System 的知識翻新協作系統
 * 支援三種 Agent 人格：Improver, Synthesizer, Devil's Advocate
 * 
 * 設計哲學：
 * - "好品味"：統一的 AgentFactory 與 Schema，避免重複代碼
 * - 實用主義：Phase 1 僅實作手動觸發，為自動化鋪路
 * - 智能 Fallback：GPT-OSS-20b → Gemma-3 → Gemini 2.5 Flash
 */

const { GoogleGenAI } = require('@google/genai');
const axios = require('axios');
const { logAudit, clampMetadataSize, summarizeText } = require('../services/auditService');
const Node = require('../models/node');
const IdeaWall = require('../models/idea_wall');
const AiFeedback = require('../models/ai_feedback');
const KbCoachHistory = require('../models/kb_coach_history');
const { Op } = require('sequelize');

// 初始化Gemini客戶端
const genai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// vLLM 配置
const VLLM_CONFIGS = {
  'gpt-oss': {
    baseURL: process.env.HSUEH_VLLM_BASE_URL || 'https://vllm-210.hsueh.tw/v1',
    modelName: process.env.HSUEH_VLLM_MODEL_NAME || 'openai/gpt-oss-20b',
    displayName: 'GPT-OSS-20B'
  },
  'gemma': {
    baseURL: process.env.VLLM_BASE_URL || 'https://earth-vllmapi.agenticgrader.com/v1',
    modelName: process.env.VLLM_MODEL_NAME || 'ISTA-DASLab/gemma-3-27b-it-GPTQ-4b-128g',
    displayName: 'Gemma-3-27B'
  }
};

/**
 * Agent Personas & System Prompts
 */
const AGENT_PERSONAS = {
  IMPROVER: {
    role: 'Idea Improver',
    tone: 'Socratic, Curious, Encouraging',
    description: '針對單一或少數觀點，指出邏輯缺口，提出引導式問題。',
    prompt: `你是一位「想法改進者 (Idea Improver)」。
你的目標是幫助學生深化他們的單一想法。
語氣：蘇格拉底式、好奇、鼓勵性。

任務：
1. 仔細閱讀學生的想法。
2. 找出邏輯缺口、未解釋的假設或模糊的概念。
3. 提出 1-2 個具體的引導式問題，幫助他們澄清或深入。
4. 不要直接給答案，而是引導他們自己發現。`
  },
  SYNTHESIZER: {
    role: 'Synthesizer',
    tone: 'Objective, Clear, Structured',
    description: '針對多篇觀點，提取共識與張力，繪製知識地圖。',
    prompt: `你是一位「綜合者 (Synthesizer)」。
你的目標是整理社群中的多個觀點，找出共識與分歧。
語氣：客觀、清晰、結構化、像圖書館員。

任務：
1. 閱讀提供的所有相關想法。
2. 識別出主要的討論主題或流派。
3. 指出哪些觀點是互補的，哪些是衝突的。
4. 建議如何將這些碎片化的想法整合成一個更完整的理論。`
  },
  DEVIL: {
    role: "Devil's Advocate",
    tone: 'Polite Challenger, "What if..." scenarios',
    description: '針對過度一致的觀點，提出反例或不同視角。',
    prompt: `你是一位「魔鬼代言人 (Devil's Advocate)」。
你的目標是打破同溫層，挑戰過度一致的觀點，激發批判性思考。
語氣：禮貌的挑戰者、提供「如果...會怎樣」的情境。

任務：
1. 尋找討論中的盲點或過度自信的假設。
2. 提出一個反例或極端情境，測試理論的穩健性。
3. 問：「如果情況完全相反，會發生什麼？」
4. 保持尊重，挑戰的是「想法」而不是「人」。`
  }
};

/**
 * Generic Output Schema
 * 適用於所有 Agent 的通用結構
 * 第一層：isCoachable 判斷（false 時其他欄位可為空）
 * 第二層：正式回應內容（isCoachable 為 true 時才有意義）
 */
const AGENT_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    isCoachable: {
      type: 'boolean',
      description: '這個想法是否有足夠的實質內容讓 AI 提供有意義的引導。只有在內容完全空白、純亂碼或完全無法理解時才設為 false。判斷標準要寬鬆——哪怕只是一個半成形的想法，也應該設為 true。'
    },
    uncoachableReason: {
      type: 'string',
      description: '（僅在 isCoachable 為 false 時填寫）用友善的語氣說明為什麼無法提供引導，並具體建議學生可以補充什麼讓想法更完整。'
    },
    thinkingProcess: {
      type: 'string',
      description: '（isCoachable 為 true 時必填）你的逐步思考過程，必須使用繁體中文。格式：「步驟1：我觀察到... → 步驟2：因此我判斷... → 步驟3：所以我決定...」。說明你觀察到什麼、為何這樣判斷、以及為何選擇這種回應方式。'
    },
    content: {
      type: 'string',
      description: '（isCoachable 為 true 時必填）你要發布給學生的具體回應內容。請使用 Markdown 格式。'
    },
    suggestedActions: {
      type: 'array',
      description: '（isCoachable 為 true 時必填）建議學生採取的後續行動，必須提供至少 3 個不同類型的行動建議',
      minItems: 3,
      items: {
        type: 'object',
        properties: {
          label: { type: 'string', description: '按鈕文字（簡短具體，例如：「補充環境限制」、「加入反例」）' },
          actionType: { type: 'string', enum: ['REPLY', 'CREATE_NEW', 'READ_MORE'] },
          payload: { type: 'string', description: '行動的預填內容，讓學生可以直接延伸撰寫' }
        },
        required: ['label', 'actionType']
      }
    }
  },
  required: ['isCoachable']
};

/**
 * 使用括號平衡算法提取第一個完整的 JSON 物件
 * @param {string} text - 包含 JSON 的文字
 * @returns {object|null} - 提取並解析後的 JSON 物件，失敗返回 null
 */
function extractFirstJsonObject(text) {
  const startIndex = text.indexOf('{');
  if (startIndex === -1) return null;
  
  let bracketCount = 0;
  let inString = false;
  let escapeNext = false;
  
  for (let i = startIndex; i < text.length; i++) {
    const char = text[i];
    
    // 處理字串內的特殊字符
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      continue;
    }
    
    // 只在字串外才計算括號
    if (!inString) {
      if (char === '{') bracketCount++;
      if (char === '}') bracketCount--;
      
      // 找到完整的 JSON 物件
      if (bracketCount === 0) {
        const jsonString = text.substring(startIndex, i + 1);
        try {
          return JSON.parse(jsonString);
        } catch {
          return null;
        }
      }
    }
  }
  
  return null;
}

/**
 * 建構系統提示詞
 */
function buildSystemPrompt(agentType) {
  const persona = AGENT_PERSONAS[agentType] || AGENT_PERSONAS.IMPROVER;
  
  return `你是一個 Knowledge Building (KB) 協作系統中的 AI 代理人。
你的角色是：${persona.role}
你的語氣：${persona.tone}
你的任務描述：${persona.description}

**第一步：判斷這個想法是否有足夠內容讓你提供有意義的引導（isCoachable 判斷）**

判斷標準（非常寬鬆，只在以下極端情況才設為 false）：
1. 標題與內容加起來完全空白或只有空白字元
2. 內容是純亂碼、無意義符號或隨機數字，完全無法理解
3. 標題和內容都完全無法辨識是任何語言的詞彙

**重要：標準要非常寬鬆。一個字、一個片語、一個半成形的想法，都應該設 isCoachable: true。只有真正「什麼都沒有」才設 false。**

若判斷為 false：在 uncoachableReason 用友善語氣說明，並具體建議學生補充什麼（例如：「試著寫下你在思考什麼？你的核心論點是什麼？」），其他欄位留空。

**第二步（僅在 isCoachable 為 true 時執行）：**

${persona.prompt}

通用規則：
1. **引用**：如果參考了上下文中的特定想法，請明確引用（例如：「正如 @Alice 在 [標題] 中提到的...」）。
2. **簡潔**：回應要精簡有力，不要長篇大論。
3. **繁體中文**：所有欄位（包含 thinkingProcess、content、suggestedActions 的 label 與 payload）一律使用繁體中文，禁止使用英文。
4. **思考過程**：thinkingProcess 必須是逐步的推理，格式為「步驟1：... → 步驟2：... → 步驟3：...」，說明你觀察到什麼、如何判斷、以及為何選擇這樣回應。
5. **建議行動**：必須提供恰好 3 個不同方向的 suggestedActions，label 要具體（點名要做什麼），payload 要預填有實質內容的文字讓學生可以直接延伸，不要留空。

**重要：你必須嚴格按照以下 JSON Schema 格式輸出，不要包含任何額外的說明文字：**
\`\`\`json
{
  "isCoachable": true 或 false,
  "uncoachableReason": "（isCoachable 為 false 時填寫，否則省略此欄位）",
  "thinkingProcess": "（isCoachable 為 true 時填寫）逐步思考過程，必須用繁體中文，格式如：步驟1：我注意到... → 步驟2：因為... → 步驟3：所以我選擇...",
  "content": "（isCoachable 為 true 時填寫）你要發布給學生的回應。請使用 Markdown 格式。",
  "suggestedActions": [
    {
      "label": "按鈕文字1（具體行動，例如：補充某個論點）",
      "actionType": "CREATE_NEW",
      "payload": "預填的想法內容，讓學生可以直接延伸"
    },
    {
      "label": "按鈕文字2（不同方向的行動）",
      "actionType": "REPLY",
      "payload": "預填的回應內容"
    },
    {
      "label": "按鈕文字3（再另一個角度的行動）",
      "actionType": "CREATE_NEW",
      "payload": "預填的想法內容"
    }
  ]
}
\`\`\`

isCoachable 是必填欄位，請確保輸出是有效的 JSON 格式。`;
}

/**
 * 呼叫 vLLM 模型（通用函數）
 */
async function callVLLM(modelKey, systemPrompt, userPrompt, timeout = 30000) {
  const config = VLLM_CONFIGS[modelKey];
  if (!config) {
    throw new Error(`Unknown model key: ${modelKey}`);
  }

  try {
    const response = await axios.post(
      `${config.baseURL}/chat/completions`,
      {
        model: config.modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        // 明確要求 JSON 格式輸出
        response_format: { type: 'json_object' }
      },
      {
        timeout,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    const content = response.data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error(`${config.displayName} 返回空內容`);
    }

    // 智能 JSON 提取：處理多種返回格式
    let jsonData = null;
    
    try {
      // 1. 嘗試直接解析（純 JSON）
      jsonData = JSON.parse(content);
    } catch {
      // 2. 移除 markdown code block（```json ... ```）
      let cleaned = content.replace(/```(?:json)?\s*/gi, '').trim();
      
      try {
        jsonData = JSON.parse(cleaned);
      } catch {
        // 3. 使用括號平衡提取第一個完整的 JSON 物件
        jsonData = extractFirstJsonObject(content);
        if (!jsonData) {
          console.warn(`⚠️ ${config.displayName} JSON 提取失敗`);
          console.warn('原始內容:', content.substring(0, 300));
          throw new Error(`${config.displayName} 返回的內容無法解析為 JSON`);
        }
      }
    }
    
    return { data: jsonData, model: config.displayName };
  } catch (error) {
    console.warn(`⚠️ ${config.displayName} 失敗:`, error.message);
    throw error;
  }
}

/**
 * 呼叫 Gemini 模型
 */
async function callGemini(systemPrompt, userPrompt) {
  try {
    const result = await genai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: AGENT_OUTPUT_SCHEMA,
        temperature: 0.7,
      }
    });

    const responseText = result?.text || '';
    if (!responseText) {
      throw new Error('Gemini 返回空回應');
    }

    return { data: JSON.parse(responseText), model: 'Gemini-2.5-Flash' };
  } catch (error) {
    console.error('❌ Gemini 失敗:', error.message);
    throw error;
  }
}

/**
 * 智能 AI 調用 with Fallback
 * 優先順序: GPT-OSS-20b → Gemma-3-27b → Gemini-2.5-Flash
 */
async function callAIWithFallback(agentType, userPrompt) {
  const systemPrompt = buildSystemPrompt(agentType);
  const errors = [];

  // 第一層：GPT-OSS-20b
  try {
    console.log('🤖 嘗試使用 GPT-OSS-20B...');
    return await callVLLM('gpt-oss', systemPrompt, userPrompt);
  } catch (error) {
    errors.push({ model: 'GPT-OSS-20B', error: error.message });
    console.warn('⚠️ GPT-OSS-20B 失敗，fallback 到 Gemma-3');
  }

  // 第二層：Gemma-3-27b
  try {
    console.log('🤖 嘗試使用 Gemma-3-27B...');
    return await callVLLM('gemma', systemPrompt, userPrompt);
  } catch (error) {
    errors.push({ model: 'Gemma-3-27B', error: error.message });
    console.warn('⚠️ Gemma-3-27B 失敗，fallback 到 Gemini');
  }

  // 第三層：Gemini (最終 fallback)
  try {
    console.log('🤖 使用最終 fallback: Gemini-2.5-Flash');
    return await callGemini(systemPrompt, userPrompt);
  } catch (error) {
    errors.push({ model: 'Gemini-2.5-Flash', error: error.message });
    console.error('❌ 所有模型都失敗了:', errors);
    throw new Error(`所有 AI 模型都無法回應。錯誤摘要: ${errors.map(e => `${e.model}: ${e.error}`).join('; ')}`);
  }
}

/**
 * 主要API端點：提供KB Coach建議
 */
exports.provideGuidance = async (req, res) => {
  const startTime = Date.now();
  try {
    const {
      title, content, nodeId, relatedNodes = [], projectId, agentType = 'IMPROVER',
      helpSeekingIntent = null,
      triggerSource = 'manual',
      isOwner = true
    } = req.body;
    const userId = req.user?.id || req.body.userId || null;

    // 驗證 agentType
    if (!['IMPROVER', 'SYNTHESIZER', 'DEVIL'].includes(agentType)) {
        return res.status(400).json({ error: '無效的 Agent 類型' });
    }

    // 建構使用者提示詞
    let userPrompt = `當前焦點想法：
標題：${title || '無標題'}
內容：${content || '無內容'}
`;

    let contextNodes = [];

    // 優先使用 projectId 獲取全域上下文 (Sliding Window N=10)
    if (projectId) {
        try {
            const ideaWalls = await IdeaWall.findAll({
                where: { projectId: projectId },
                attributes: ['id']
            });
            
            if (ideaWalls.length > 0) {
                const ideaWallIds = ideaWalls.map(iw => iw.id);
                // 查詢專案中的最近 10 筆節點 (Sliding Window)
                contextNodes = await Node.findAll({
                    where: { 
                        ideaWallId: { [Op.in]: ideaWallIds },
                        // 排除當前節點
                        id: { [Op.ne]: nodeId || -1 } 
                    },
                    order: [['createdAt', 'DESC']],
                    limit: 10, 
                    attributes: ['title', 'content', 'owner', 'createdAt']
                });
            }
        } catch (dbError) {
            console.error('Error fetching project nodes for KB Coach:', dbError);
            contextNodes = relatedNodes; 
        }
    } else {
        contextNodes = relatedNodes;
    }

    // 加入上下文
    if (contextNodes.length > 0) {
      const relatedContext = contextNodes
        .map(node => {
            const nodeTitle = node.title || '無標題';
            const nodeContent = (node.content || '').substring(0, 300);
            const nodeOwner = node.owner || '同學';
            const timeStr = node.createdAt ? ` (${new Date(node.createdAt).toLocaleDateString()})` : '';
            return `- [作者: ${nodeOwner}${timeStr}] ${nodeTitle}: ${nodeContent}`;
        })
        .join('\n');
      userPrompt += `\n\n最近的討論上下文 (Sliding Window N=10)：\n${relatedContext}`;
    }

    // 根據求助意圖調整 AI 回應策略
    if (helpSeekingIntent === 'stuck') {
      userPrompt += '\n\n【學生求助意圖提示】這位學生表示目前感到卡住，不確定如何繼續發展想法。請以更循序漸進、引導式的方式提問，優先幫助他釐清問題所在，避免過度挑戰或給出太多同步的批評。';
    }

    // 根據是否為節點擁有者調整 AI 角色定位
    if (!isOwner) {
      userPrompt += '\n\n【角色提示】查看此節點的使用者不是節點的作者，而是社群中的其他學習者。請幫助他：(1) 理解這個想法的核心論點、(2) 思考它與自己既有知識或社群其他想法的關係、(3) 形成一個有建設性的回應觀點。建議行動應以 REPLY（回應這個節點）為主，有助推進社群知識討論。';
    }

    // 呼叫 AI with Fallback (GPT-OSS → Gemma-3 → Gemini)
    const { data: coaching, model: usedModel } = await callAIWithFallback(agentType, userPrompt);
    const responseTimeMs = Date.now() - startTime;
    const sessionId = `${Date.now()}-${nodeId || 'no-node'}`;

    // isCoachable 第一層判斷：內容不足時直接返回，不進行 history 儲存
    if (coaching.isCoachable === false) {
      return res.status(200).json({
        isCoachable: false,
        uncoachableReason: coaching.uncoachableReason || '這個想法目前內容還不夠完整，AI 無法提供有意義的引導。'
      });
    }

    // 修正 vLLM 雙重跳脫問題：將字面上的 \n 轉換為真正的換行符號
    const sanitizeNewlines = (str) => (str || '').replace(/\\n/g, '\n');

    const responseData = {
      isCoachable: true,
      agentType,
      thinkingProcess: sanitizeNewlines(coaching.thinkingProcess),
      content: sanitizeNewlines(coaching.content),
      suggestedActions: coaching.suggestedActions || [],
      metadata: {
        nodeId,
        timestamp: new Date().toISOString(),
        model: usedModel,
        sessionId
      }
    };

    // 儲存到歷史記錄（非阻塞）
    try {
      await KbCoachHistory.create({
        projectId: projectId || null,
        ideaWallId: null, // 可從 nodeId 關聯獲取
        nodeId: nodeId || null,
        userId: userId,
        agentType: agentType,
        modelUsed: usedModel,
        nodeTitle: title || null,
        nodeContent: content || null,
        thinkingProcess: coaching.thinkingProcess,
        responseContent: coaching.content,
        suggestedActions: coaching.suggestedActions || [],
        contextCount: contextNodes.length,
        responseTimeMs: responseTimeMs,
        sessionId: sessionId,
        helpSeekingIntent: helpSeekingIntent,
        triggerSource: triggerSource
      });
    } catch (historyError) {
      console.error('Failed to save KB Coach history (non-blocking):', historyError);
    }

    // 審計日誌（非阻塞）
    try {
      await logAudit(req, {
        action: 'KB_COACH_GUIDANCE',
        targetType: 'idea_wall_node',
        targetId: nodeId || null,
        projectId: null,
        metadata: clampMetadataSize({
          input: {
            agentType,
            title: summarizeText(title),
            contextCount: contextNodes.length
          },
          output: {
            thinkingProcessLength: coaching.thinkingProcess?.length,
            contentLength: coaching.content?.length
          },
          provider: usedModel // 記錄實際使用的模型
        })
      });
    } catch (auditError) {
      console.error('Audit logging failed (non-blocking):', auditError);
    }

    res.status(200).json(responseData);

  } catch (error) {
    console.error('Error in KB Coach provideGuidance:', error);
    if (error.message?.includes('API key')) {
      return res.status(500).json({ error: 'AI服務設定錯誤，請聯繫管理員' });
    }
    res.status(500).json({ error: 'KB Coach處理時發生錯誤' });
  }
};

/**
 * 輔助端點：取得 Agent 列表 (Optional for frontend dynamic rendering)
 */
exports.getPrinciples = async (req, res) => {
    // 為了相容性保留此端點，但回傳 Agent 資訊
    res.status(200).json({
        agents: Object.keys(AGENT_PERSONAS).map(key => ({
            id: key,
            ...AGENT_PERSONAS[key]
        })),
        version: 'Phase 1 - Multi-Agent MVP'
    });
};

/**
 * Phase 3: 接收並儲存用戶回饋
 * POST /api/kb-coach/feedback
 */
exports.saveFeedback = async (req, res) => {
    try {
        const { projectId, ideaWallId, nodeId, agentType, feedbackType, responseId, userId } = req.body;

        // 驗證必要欄位
        if (!feedbackType || !['helpful', 'not_helpful'].includes(feedbackType)) {
            return res.status(400).json({ error: '無效的回饋類型' });
        }

        // 建立回饋記錄
        const feedback = await AiFeedback.create({
            projectId: projectId || null,
            ideaWallId: ideaWallId || null,
            nodeId: nodeId || null,
            agentType: agentType || 'UNKNOWN',
            feedbackType: feedbackType,
            userId: userId || null,
            sessionId: responseId || null
        });

        // 審計日誌（非阻塞）
        try {
            await logAudit(req, {
                action: 'AI_FEEDBACK_SUBMITTED',
                targetType: 'ai_feedback',
                targetId: feedback.id,
                projectId: projectId || null,
                metadata: clampMetadataSize({
                    agentType,
                    feedbackType,
                    nodeId
                })
            });
        } catch (auditError) {
            console.error('Audit logging failed (non-blocking):', auditError);
        }

        res.status(201).json({ 
            success: true, 
            message: '感謝您的回饋！',
            feedbackId: feedback.id 
        });

    } catch (error) {
        console.error('Error saving AI feedback:', error);
        res.status(500).json({ error: '儲存回饋時發生錯誤' });
    }
};

/**
 * Phase 3: 取得回饋統計 (供管理者查看)
 * GET /api/kb-coach/feedback/stats
 */
exports.getFeedbackStats = async (req, res) => {
    try {
        const { projectId } = req.query;

        const whereClause = projectId ? { projectId: parseInt(projectId) } : {};

        const stats = await AiFeedback.findAll({
            where: whereClause,
            attributes: [
                'agentType',
                'feedbackType',
                [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
            ],
            group: ['agentType', 'feedbackType'],
            raw: true
        });

        // 轉換成更友善的格式
        const result = {
            IMPROVER: { helpful: 0, not_helpful: 0 },
            SYNTHESIZER: { helpful: 0, not_helpful: 0 },
            DEVIL: { helpful: 0, not_helpful: 0 },
            total: { helpful: 0, not_helpful: 0 }
        };

        stats.forEach(row => {
            if (result[row.agentType]) {
                result[row.agentType][row.feedbackType] = parseInt(row.count);
            }
            result.total[row.feedbackType] += parseInt(row.count);
        });

        res.status(200).json(result);

    } catch (error) {
        console.error('Error getting feedback stats:', error);
        res.status(500).json({ error: '取得統計時發生錯誤' });
    }
};

/**
 * 查詢 KB Coach 歷史記錄
 * GET /api/kb-coach/history
 * 
 * Query Params:
 * - projectId: 專案 ID
 * - nodeId: 節點 ID
 * - userId: 使用者 ID
 * - agentType: Agent 類型 (IMPROVER, SYNTHESIZER, DEVIL)
 * - limit: 返回筆數（預設 20）
 */
exports.getHistory = async (req, res) => {
    try {
        const { projectId, nodeId, userId, agentType, limit = 20 } = req.query;

        // 建構查詢條件
        const whereClause = {};
        if (projectId) whereClause.projectId = parseInt(projectId);
        if (nodeId) whereClause.nodeId = parseInt(nodeId);
        if (userId) whereClause.userId = parseInt(userId);
        if (agentType) whereClause.agentType = agentType;

        const histories = await KbCoachHistory.findAll({
            where: whereClause,
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            attributes: [
                'id',
                'agentType',
                'modelUsed',
                'nodeTitle',
                'nodeContent',
                'thinkingProcess',
                'responseContent',
                'suggestedActions',
                'contextCount',
                'responseTimeMs',
                'sessionId',
                'createdAt'
            ]
        });

        res.status(200).json({
            total: histories.length,
            histories: histories.map(h => ({
                id: h.id,
                agentType: h.agentType,
                model: h.modelUsed,
                nodeTitle: h.nodeTitle,
                nodeContent: h.nodeContent ? h.nodeContent.substring(0, 200) : null, // 摘要
                thinkingProcess: h.thinkingProcess,
                responseContent: h.responseContent,
                suggestedActions: h.suggestedActions,
                contextCount: h.contextCount,
                responseTimeMs: h.responseTimeMs,
                sessionId: h.sessionId,
                timestamp: h.createdAt
            }))
        });

    } catch (error) {
        console.error('Error getting KB Coach history:', error);
        res.status(500).json({ error: '取得歷史記錄時發生錯誤' });
    }
};

/**
 * 查詢單筆歷史記錄詳情
 * GET /api/kb-coach/history/:id
 */
exports.getHistoryDetail = async (req, res) => {
    try {
        const { id } = req.params;

        const history = await KbCoachHistory.findByPk(id);

        if (!history) {
            return res.status(404).json({ error: '找不到此歷史記錄' });
        }

        res.status(200).json({
            id: history.id,
            agentType: history.agentType,
            model: history.modelUsed,
            nodeTitle: history.nodeTitle,
            nodeContent: history.nodeContent,
            thinkingProcess: history.thinkingProcess,
            responseContent: history.responseContent,
            suggestedActions: history.suggestedActions,
            contextCount: history.contextCount,
            responseTimeMs: history.responseTimeMs,
            sessionId: history.sessionId,
            timestamp: history.createdAt
        });

    } catch (error) {
        console.error('Error getting history detail:', error);
        res.status(500).json({ error: '取得詳情時發生錯誤' });
    }
};

