/**
 * KB Coach Controller
 * 
 * 基於Knowledge Building 12原則的AI教練系統
 * 使用Gemini 2.5 Flash Function Calling提供引導式問題
 * 
 * 設計哲學：
 * - "好品味"：一次API呼叫消除兩階段特殊情況
 * - 零破壞性：獨立控制器，不影響現有llm.js
 * - 實用主義：信任Gemini Function Calling，不做防禦性編程
 */

const { GoogleGenAI } = require('@google/genai');
const { logAudit, clampMetadataSize, summarizeText } = require('../services/auditService');
const Node = require('../models/node');
const IdeaWall = require('../models/idea_wall');
const { Op } = require('sequelize');

// 初始化Gemini客戶端
const genai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

/**
 * Knowledge Forum 思考鷹架
 * 與KB原則對應，提供具體的寫作支架
 */
const KF_SCAFFOLDS = {
  MY_THEORY: { text: '我的理論：', label: '我的理論', kbPrinciples: ['real_ideas', 'improvable_ideas'] },
  NEED_TO_UNDERSTAND: { text: '我需要了解：', label: '我需要了解', kbPrinciples: ['real_ideas', 'epistemic_agency'] },
  NEW_INFO: { text: '新資訊：', label: '新資訊', kbPrinciples: ['community_knowledge', 'kb_discourse'] },
  THEORY_LIMITATION: { text: '這種理論無法解釋：', label: '這種理論無法解釋', kbPrinciples: ['improvable_ideas', 'idea_diversity'] },
  BETTER_THEORY: { text: '更好的理論：', label: '更好的理論', kbPrinciples: ['improvable_ideas', 'idea_diversity'] },
  INTEGRATE_KNOWLEDGE: { text: '整合我們的知識：', label: '整合我們的知識', kbPrinciples: ['community_knowledge', 'kb_discourse'] }
};

/**
 * KB 12原則的核心6個（Phase 1實作）
 */
const KB_PRINCIPLES = {
  REAL_IDEAS: {
    id: 'real_ideas',
    name: '真實想法，真實問題',
    description: '知識問題源於努力理解世界，想法與實際接觸的事物一樣真實',
    keywords: ['好奇心', '真實世界', '個人關心']
  },
  IMPROVABLE_IDEAS: {
    id: 'improvable_ideas',
    name: '可改進的想法',
    description: '所有想法都可改進，持續提高品質、連貫性和實用性',
    keywords: ['成長心態', '迭代', '改進']
  },
  IDEA_DIVERSITY: {
    id: 'idea_diversity',
    name: '想法多樣性',
    description: '不同想法創造動態環境，對比和互補促進想法演化',
    keywords: ['多元觀點', '對比', '互補']
  },
  EPISTEMIC_AGENCY: {
    id: 'epistemic_agency',
    name: '知識主導權',
    description: '學生對自己的想法負責，決定學習成果和過程',
    keywords: ['自主', '責任', '協商']
  },
  COMMUNITY_KNOWLEDGE: {
    id: 'community_knowledge',
    name: '社群知識，集體責任',
    description: '對共同目標的貢獻受到重視，集體推進知識',
    keywords: ['協作', '共同責任', '知識共享']
  },
  KB_DISCOURSE: {
    id: 'kb_discourse',
    name: '知識翻新對話',
    description: '協作交流帶來更好的解決方案，推進理解到超越個人的水平',
    keywords: ['對話', '協作', '集體智慧']
  }
};

/**
 * Gemini Function Calling Schema
 * 結構化輸出保證格式穩定
 */
const KB_COACHING_SCHEMA = {
  type: 'object',
  properties: {
    principles: {
      type: 'array',
      description: '適用的KB原則ID列表（從6個核心原則中選擇）',
      items: {
        type: 'string',
        enum: ['real_ideas', 'improvable_ideas', 'idea_diversity', 'epistemic_agency', 'community_knowledge', 'kb_discourse']
      }
    },
    questions: {
      type: 'array',
      description: '引導性問題（不包含答案）。範例：「你認為X和Y之間的關係是什麼？」',
      items: { type: 'string' },
      minItems: 2,
      maxItems: 4
    },
    suggestions: {
      type: 'array',
      description: '可執行的建議行動',
      items: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['CREATE_NODE', 'CONNECT_IDEA', 'RESEARCH_TOPIC', 'COLLABORATE']
          },
          description: { type: 'string' },
          reason: { type: 'string' }
        },
        required: ['action', 'description', 'reason']
      },
      maxItems: 3
    },
    recommendedScaffolds: {
      type: 'array',
      description: '推薦的Knowledge Forum思考鷹架（根據適用的KB原則推薦）',
      items: {
        type: 'string',
        enum: ['我的理論：', '我需要了解：', '新資訊：', '這種理論無法解釋：', '更好的理論：', '整合我們的知識：']
      },
      maxItems: 3
    }
  },
  required: ['principles', 'questions', 'suggestions']
};

/**
 * 建構系統提示詞
 */
function buildSystemPrompt() {
  const principlesText = Object.values(KB_PRINCIPLES)
    .map(p => `- ${p.name}：${p.description}`)
    .join('\n');

  return `你是一位與學生並肩作戰的 Knowledge Building (KB) 協作者。你的目標是透過「連結」與「提問」來推進社群的知識邊界。

核心原則（內化於心，無需對學生說教）：
${principlesText}

你的核心任務：
1. **織網 (Weaving)**：你擁有「全域記憶」。你必須找出當前想法與**過去任何時間點**的其他想法之間的關聯。
   - **強制要求**：如果發現相關的舊想法，**必須**明確引用：「這讓我想起 [作者] 在 [標題] 提到的...」。
   - 尋找矛盾、互補或重複的觀點。
2. **向上提升 (Rise Above)**：不要停留在事實層面。
   - 如果學生在描述現象，問他們背後的機制。
   - 如果學生在爭論細節，問他們如何整合出一個更通用的理論。
3. **把球丟回去 (Epistemic Agency)**：
   - 不要告訴他們做什麼，而是問他們：「考慮到 [某個舊觀點]，你覺得你的理論需要調整嗎？」

你的輸出要求：
1. **識別原則**：(系統內部使用，選出最相關的即可)。
2. **引導問題**：提出 2-3 個像「對話」一樣的問題。
   - 語氣要自然，像是在聊天，而不是考試。
   - **必須**包含具體的引用（如果有的話）。
3. **建議行動**：具體、可執行。
   - 如果建議「建立新節點」，請說明這個新節點應該解決什麼問題（例如：「整合你和 Bob 的觀點」）。
4. **推薦鷹架**：推薦最能幫助他們「下一步」的鷹架。

可用的思考鷹架：
- 我的理論：提出假設。
- 我需要了解：提出問題。
- 新資訊：提供證據。
- 這種理論無法解釋：指出矛盾。
- 更好的理論：改進觀點。
- 整合我們的知識：綜合整理。

鐵律：
- **禁止說教**。不要說「根據 KB 原則...」。
- **禁止廢話**。直接切入想法的內容。
- **必須引用**。利用你看到的歷史上下文，這是你最大的價值。
- **語氣**：好奇、平視、具啟發性。`;
}

/**
 * 主要API端點：提供KB Coach建議
 */
exports.provideGuidance = async (req, res) => {
  try {
    const { title, content, nodeId, relatedNodes = [], projectId } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: '缺少必要參數：title, content' });
    }

    // 建構使用者提示詞
    let userPrompt = `學生想法：
標題：${title}
內容：${content}`;

    let contextNodes = [];

    // 優先使用 projectId 獲取全域上下文 (Deep Context)
    if (projectId) {
        try {
            const ideaWalls = await IdeaWall.findAll({
                where: { projectId: projectId },
                attributes: ['id']
            });
            
            if (ideaWalls.length > 0) {
                const ideaWallIds = ideaWalls.map(iw => iw.id);
                // 查詢專案中的所有節點 (限制 500 筆，倒序)
                contextNodes = await Node.findAll({
                    where: { 
                        ideaWallId: { [Op.in]: ideaWallIds },
                        // 排除當前節點
                        id: { [Op.ne]: nodeId || -1 } 
                    },
                    order: [['createdAt', 'DESC']],
                    limit: 500, 
                    attributes: ['title', 'content', 'owner', 'createdAt']
                });
            }
        } catch (dbError) {
            console.error('Error fetching project nodes for KB Coach:', dbError);
            // Fallback to relatedNodes if DB fails
            contextNodes = relatedNodes; 
        }
    } else {
        // Fallback for legacy frontend
        contextNodes = relatedNodes;
    }

    // 如果有相關節點，加入上下文
    if (contextNodes.length > 0) {
      const relatedContext = contextNodes
        .map(node => {
            const nodeTitle = node.title || '無標題';
            const nodeContent = (node.content || '').substring(0, 300); // 增加上下文長度
            const nodeOwner = node.owner || '同學';
            const timeStr = node.createdAt ? ` (${new Date(node.createdAt).toLocaleDateString()})` : '';
            return `- [作者: ${nodeOwner}${timeStr}] ${nodeTitle}: ${nodeContent}`;
        })
        .join('\n');
      userPrompt += `\n\n社群中的歷史想法（這是你的全域記憶，請從中尋找關聯）：\n${relatedContext}`;
    }

    // 呼叫Gemini Function Calling
    const result = await genai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: buildSystemPrompt() + '\n\n' + userPrompt }] }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: KB_COACHING_SCHEMA,
        temperature: 0.7,
      }
    });

    const responseText = result?.text || '';
    if (!responseText) {
      throw new Error('Gemini API返回空回應');
    }

    const coaching = JSON.parse(responseText);

    // 豐富化原則資訊
    const enrichedPrinciples = coaching.principles.map(id => {
      const principle = Object.values(KB_PRINCIPLES).find(p => p.id === id);
      return principle || { id, name: '未知原則', description: '' };
    });

    const responseData = {
      principles: enrichedPrinciples,
      questions: coaching.questions,
      suggestions: coaching.suggestions,
      recommendedScaffolds: coaching.recommendedScaffolds || [],
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
            title: summarizeText(title),
            content: summarizeText(content),
            relatedNodesCount: relatedNodes.length
          },
          output: {
            principlesCount: coaching.principles.length,
            questionsCount: coaching.questions.length,
            suggestionsCount: coaching.suggestions.length
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

    // 如果是Gemini API錯誤
    if (error.message?.includes('API key')) {
      return res.status(500).json({ error: 'AI服務設定錯誤，請聯繫管理員' });
    }

    res.status(500).json({ error: 'KB Coach處理時發生錯誤' });
  }
};

/**
 * 輔助端點：取得KB原則列表
 */
exports.getPrinciples = async (req, res) => {
  try {
    res.status(200).json({
      principles: Object.values(KB_PRINCIPLES),
      version: 'Phase 1 - Core 6 Principles'
    });
  } catch (error) {
    console.error('Error in getPrinciples:', error);
    res.status(500).json({ error: '取得原則列表時發生錯誤' });
  }
};
