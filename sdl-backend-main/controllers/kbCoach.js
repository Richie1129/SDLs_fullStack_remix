/**
 * KB Coach Controller (AI-Scaffold Orchestrator - Phase 1 MVP)
 * 
 * 基於 Multi-Agent System 的知識翻新協作系統
 * 支援三種 Agent 人格：Improver, Synthesizer, Devil's Advocate
 * 
 * 設計哲學：
 * - "好品味"：統一的 AgentFactory 與 Schema，避免重複代碼
 * - 實用主義：Phase 1 僅實作手動觸發，為自動化鋪路
 */

const { GoogleGenAI } = require('@google/genai');
const { logAudit, clampMetadataSize, summarizeText } = require('../services/auditService');
const Node = require('../models/node');
const IdeaWall = require('../models/idea_wall');
const AiFeedback = require('../models/ai_feedback');
const { Op } = require('sequelize');

// 初始化Gemini客戶端
const genai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

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
 */
const AGENT_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    thinkingProcess: {
      type: 'string',
      description: '你的思考過程 (Chain of Thought)。解釋你觀察到了什麼，以及為什麼決定這樣回應。'
    },
    content: {
      type: 'string',
      description: '你要發布給學生的具體回應內容。請使用 Markdown 格式。'
    },
    suggestedActions: {
      type: 'array',
      description: '建議學生採取的後續行動',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string', description: '按鈕文字' },
          actionType: { type: 'string', enum: ['REPLY', 'CREATE_NEW', 'READ_MORE'] },
          payload: { type: 'string', description: '行動的參數或預填內容' }
        },
        required: ['label', 'actionType']
      }
    }
  },
  required: ['thinkingProcess', 'content', 'suggestedActions']
};

/**
 * 建構系統提示詞
 */
function buildSystemPrompt(agentType) {
  const persona = AGENT_PERSONAS[agentType] || AGENT_PERSONAS.IMPROVER;
  
  return `你是一個 Knowledge Building (KB) 協作系統中的 AI 代理人。
你的角色是：${persona.role}
你的語氣：${persona.tone}
你的任務描述：${persona.description}
${persona.prompt}

通用規則：
1. **引用**：如果參考了上下文中的特定想法，請明確引用（例如：「正如 @Alice 在 [標題] 中提到的...」）。
2. **簡潔**：回應要精簡有力，不要長篇大論。
3. **繁體中文**：始終使用繁體中文回應。`;
}

/**
 * 主要API端點：提供KB Coach建議
 */
exports.provideGuidance = async (req, res) => {
  try {
    const { title, content, nodeId, relatedNodes = [], projectId, agentType = 'IMPROVER' } = req.body;

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

    // 呼叫Gemini Function Calling
    const result = await genai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: buildSystemPrompt(agentType) + '\n\n' + userPrompt }] }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: AGENT_OUTPUT_SCHEMA,
        temperature: 0.7,
      }
    });

    const responseText = result?.text || '';
    if (!responseText) {
      throw new Error('Gemini API返回空回應');
    }

    const coaching = JSON.parse(responseText);

    const responseData = {
      agentType,
      thinkingProcess: coaching.thinkingProcess,
      content: coaching.content,
      suggestedActions: coaching.suggestedActions || [],
      metadata: {
        nodeId,
        timestamp: new Date().toISOString(),
        model: 'gemini-2.5-flash'
      }
    };

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
          provider: 'gemini-2.5-flash'
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
