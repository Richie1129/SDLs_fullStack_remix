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

  return `你是一位Knowledge Building教練，基於KB 12原則引導學生深化想法。

核心原則：
${principlesText}

你的職責：
1. 識別學生想法適用的KB原則（1-3個）
2. 提出引導性問題（不給答案）
3. 建議可執行的行動
4. 推薦適合的Knowledge Forum思考鷹架（根據原則選擇1-3個）

可用的思考鷹架：
- 我的理論：適用於提出新理論、初步假設（對應：真實想法、可改進想法）
- 我需要了解：適用於探索問題、提出疑問（對應：真實想法、知識主導權）
- 新資訊：適用於分享發現、提供證據（對應：社群知識、知識翻新對話）
- 這種理論無法解釋：適用於質疑、發現矛盾（對應：可改進想法、想法多樣性）
- 更好的理論：適用於改進、提出替代方案（對應：可改進想法、想法多樣性）
- 整合我們的知識：適用於綜合、連結想法（對應：社群知識、知識翻新對話）

特殊處理：
- 如果學生想法過於簡短或不清楚，優先使用「真實想法」和「知識主導權」原則
- 引導學生說明：這是什麼？為什麼重要？想探索什麼？
- 不要批判內容，而是幫助學生展開思考
- 推薦「我需要了解」或「我的理論」鷹架

鐵律：
- 只引導，不給答案
- 問題要啟發思考，不是測驗
- 建議要具體可執行
- 鷹架推薦要符合KB原則邏輯
- 尊重學生的知識主導權，即使內容看似簡單`;
}

/**
 * 主要API端點：提供KB Coach建議
 */
exports.provideGuidance = async (req, res) => {
  try {
    const { title, content, nodeId, relatedNodes = [] } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: '缺少必要參數：title, content' });
    }

    // 建構使用者提示詞
    let userPrompt = `學生想法：
標題：${title}
內容：${content}`;

    // 如果有相關節點，加入上下文
    if (relatedNodes.length > 0) {
      const relatedContext = relatedNodes
        .map(node => `- ${node.title}: ${node.content.substring(0, 100)}`)
        .join('\n');
      userPrompt += `\n\n相關想法：\n${relatedContext}`;
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
