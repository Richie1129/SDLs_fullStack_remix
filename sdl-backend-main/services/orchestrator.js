/**
 * Orchestrator Service (Phase 2 - The Silent Brain)
 * 
 * Linus 式設計哲學：
 * "This is the real meat of the system."
 * 
 * 職責：
 * 1. 讀取討論上下文（Sliding Window N=10）
 * 2. 呼叫 DiscussionAnalyzer 計算指標
 * 3. 應用決策規則（Rule Engine）
 * 4. 檢查冷卻機制
 * 5. 決定是否介入 & 選擇 Agent
 * 6. 如需介入，自動呼叫 KB Coach 生成回應
 * 
 * 零破壞性保證：
 * - 背景執行，不阻塞使用者操作
 * - 失敗靜默（不影響正常發文流程）
 * - 可透過環境變數 ORCHESTRATOR_ENABLED=false 關閉
 */

const { GoogleGenAI } = require('@google/genai');
const Node = require('../models/node');
const IdeaWall = require('../models/idea_wall');
const { Op } = require('sequelize');
const { analyzeDiscussion, classifyDiscussion } = require('./discussionAnalyzer');
const { getCooldownManager } = require('../utils/cooldownManager');
const { logAudit, clampMetadataSize } = require('./auditService');

// 引入 KB Coach 的 Agent Personas（重用 Phase 1 代碼）
const kbCoachController = require('../controllers/kbCoach');

// 初始化Gemini客戶端
const genai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// ============================================================================
// 配置參數
// ============================================================================
const ORCHESTRATOR_ENABLED = process.env.ORCHESTRATOR_ENABLED !== 'false'; // 預設啟用
const SLIDING_WINDOW_SIZE = 10; // 分析最近 N 篇貼文
const AUTO_POST_ENABLED = process.env.ORCHESTRATOR_AUTO_POST === 'true'; // 預設不自動發文

/**
 * 決策規則引擎
 * 
 * Linus: "規則引擎聽起來很炫，但其實就是一堆 if-else。別過度設計。"
 * 
 * @param {Object} analysis - DiscussionAnalyzer 的分析結果
 * @param {string} discussionType - classifyDiscussion 的結果
 * @returns {Object|null} - { action: 'TRIGGER', role: '...', reason: '...' } 或 null
 */
function applyDecisionRules(analysis, discussionType) {
    const { depth, diversity, convergence, raw } = analysis;

    // ========================================================================
    // 規則 1: 淺層討論 -> Trigger Idea Improver
    // ========================================================================
    if (discussionType === 'SHALLOW') {
        return {
            action: 'TRIGGER',
            role: 'IMPROVER',
            reason: `淺層討論（深度分數: ${depth}，平均長度: ${raw.avgLength}字）- 需要引導深化`
        };
    }

    // ========================================================================
    // 規則 2: 同溫層 -> Trigger Devil's Advocate
    // ========================================================================
    if (discussionType === 'ECHO_CHAMBER') {
        return {
            action: 'TRIGGER',
            role: 'DEVIL',
            reason: `同溫層風險（多樣性: ${diversity}, 收斂度: ${convergence}）- 需要挑戰觀點`
        };
    }

    // ========================================================================
    // 規則 3: 資訊過載 -> Trigger Synthesizer
    // ========================================================================
    if (discussionType === 'OVERLOAD') {
        return {
            action: 'TRIGGER',
            role: 'SYNTHESIZER',
            reason: `資訊過載（${raw.nodeCount}篇貼文，收斂度: ${convergence}）- 需要整合觀點`
        };
    }

    // ========================================================================
    // 規則 4: 健康討論 -> 保持靜默
    // ========================================================================
    return {
        action: 'WAIT',
        reason: `討論品質良好（深度: ${depth}, 多樣性: ${diversity}）- 暫不介入`
    };
}

/**
 * 主要分析函數：分析討論並決定是否介入
 * 
 * @param {number} ideaWallId - 討論串 ID
 * @param {number} projectId - 專案 ID（用於取得上下文）
 * @returns {Promise<Object>} - 決策結果
 */
async function analyzeAndDecide(ideaWallId, projectId) {
    try {
        // ====================================================================
        // Step 0: 檢查 Orchestrator 是否啟用
        // ====================================================================
        if (!ORCHESTRATOR_ENABLED) {
            return { action: 'DISABLED', reason: 'Orchestrator disabled via config' };
        }

        // ====================================================================
        // Step 1: 讀取討論上下文（Sliding Window）
        // ====================================================================
        const ideaWalls = await IdeaWall.findAll({
            where: { projectId: projectId },
            attributes: ['id']
        });

        if (ideaWalls.length === 0) {
            return { action: 'WAIT', reason: 'No idea walls found for this project' };
        }

        const ideaWallIds = ideaWalls.map(iw => iw.id);
        
        const contextNodes = await Node.findAll({
            where: { 
                ideaWallId: { [Op.in]: ideaWallIds }
            },
            order: [['createdAt', 'DESC']],
            limit: SLIDING_WINDOW_SIZE,
            attributes: ['id', 'title', 'content', 'owner', 'createdAt']
        });

        if (contextNodes.length === 0) {
            return { action: 'WAIT', reason: 'No nodes to analyze' };
        }

        const totalNodeCount = await Node.count({
            where: { ideaWallId: { [Op.in]: ideaWallIds } }
        });

        // ====================================================================
        // Step 2: 檢查冷卻機制
        // ====================================================================
        const cooldownManager = getCooldownManager();
        const canIntervene = cooldownManager.canIntervene(ideaWallId, totalNodeCount);

        if (!canIntervene) {
            const status = cooldownManager.getStatus(ideaWallId);
            return { 
                action: 'COOLDOWN', 
                reason: `仍在冷卻中（剩餘 ${Math.round(status.cooldownRemaining)} 分鐘）`,
                cooldownStatus: status
            };
        }

        // ====================================================================
        // Step 3: 分析討論品質
        // ====================================================================
        const analysis = analyzeDiscussion(contextNodes);
        const discussionType = classifyDiscussion(analysis);

        // ====================================================================
        // Step 4: 應用決策規則
        // ====================================================================
        const decision = applyDecisionRules(analysis, discussionType);

        // ====================================================================
        // Step 5: 記錄審計日誌
        // ====================================================================
        try {
            await logAudit(null, {
                action: 'ORCHESTRATOR_DECISION',
                targetType: 'idea_wall',
                targetId: ideaWallId,
                projectId: projectId,
                metadata: clampMetadataSize({
                    decision: decision.action,
                    role: decision.role || null,
                    reason: decision.reason,
                    analysis: {
                        depth: analysis.depth,
                        diversity: analysis.diversity,
                        convergence: analysis.convergence,
                        nodeCount: analysis.raw.nodeCount
                    },
                    discussionType
                })
            });
        } catch (auditError) {
            console.error('Orchestrator audit logging failed (non-blocking):', auditError);
        }

        // ====================================================================
        // Step 6: 如果需要介入，記錄冷卻
        // ====================================================================
        if (decision.action === 'TRIGGER') {
            cooldownManager.recordIntervention(ideaWallId, totalNodeCount);
        }

        return {
            ...decision,
            analysis,
            discussionType,
            contextNodeCount: contextNodes.length,
            totalNodeCount
        };

    } catch (error) {
        console.error('Orchestrator analysis failed:', error);
        return { 
            action: 'ERROR', 
            reason: error.message,
            error: true
        };
    }
}

/**
 * 自動生成並發布 AI 回應（Phase 2 擴充功能）
 * 
 * @param {number} ideaWallId
 * @param {number} projectId
 * @param {string} agentRole - 'IMPROVER' | 'SYNTHESIZER' | 'DEVIL'
 * @param {Array} contextNodes - 上下文節點
 * @returns {Promise<Object>} - 生成的回應內容
 */
async function generateAndPostResponse(ideaWallId, projectId, agentRole, contextNodes) {
    try {
        // 建構焦點節點（最新的一篇）
        const focusNode = contextNodes[0];
        
        // 呼叫 KB Coach 的 provideGuidance（重用 Phase 1 代碼）
        const mockReq = {
            body: {
                title: focusNode.title,
                content: focusNode.content,
                nodeId: focusNode.id,
                projectId: projectId,
                relatedNodes: contextNodes.slice(1, 10).map(n => ({
                    title: n.title,
                    content: n.content,
                    owner: n.owner
                })),
                agentType: agentRole
            }
        };

        // 模擬 res 物件以接收回應
        let coachingResult = null;
        const mockRes = {
            status: (code) => ({
                json: (data) => {
                    coachingResult = data;
                }
            })
        };

        await kbCoachController.provideGuidance(mockReq, mockRes);

        if (!coachingResult) {
            throw new Error('KB Coach failed to generate response');
        }

        // ====================================================================
        // Phase 2: 暫不自動發布，只返回建議內容
        // 實際發文由 Phase 3 整合前端通知機制
        // ====================================================================
        if (AUTO_POST_ENABLED) {
            // TODO: Phase 3 - 建立新節點
            console.log('🤖 [Orchestrator] Auto-posting is enabled but not implemented yet (Phase 3)');
        }

        return {
            success: true,
            coaching: coachingResult,
            autoPosted: false,
            message: 'AI 建議已生成，等待人工審核或 Phase 3 自動發布機制'
        };

    } catch (error) {
        console.error('Orchestrator auto-response failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * 完整的 Orchestrator 工作流程
 * 
 * @param {number} ideaWallId
 * @param {number} projectId
 * @returns {Promise<Object>}
 */
async function orchestrate(ideaWallId, projectId) {
    console.log(`🧠 [Orchestrator] Analyzing ideaWall ${ideaWallId} in project ${projectId}...`);

    const decision = await analyzeAndDecide(ideaWallId, projectId);

    console.log(`🧠 [Orchestrator] Decision: ${decision.action} - ${decision.reason}`);

    // 如果決定介入，生成回應
    if (decision.action === 'TRIGGER' && decision.role) {
        console.log(`🤖 [Orchestrator] Triggering ${decision.role}...`);
        
        // 重新取得上下文（因為 analyzeAndDecide 沒有返回完整節點）
        const ideaWalls = await IdeaWall.findAll({
            where: { projectId: projectId },
            attributes: ['id']
        });
        const ideaWallIds = ideaWalls.map(iw => iw.id);
        const contextNodes = await Node.findAll({
            where: { ideaWallId: { [Op.in]: ideaWallIds } },
            order: [['createdAt', 'DESC']],
            limit: SLIDING_WINDOW_SIZE,
            attributes: ['id', 'title', 'content', 'owner', 'createdAt']
        });

        const response = await generateAndPostResponse(ideaWallId, projectId, decision.role, contextNodes);
        
        return {
            ...decision,
            response
        };
    }

    return decision;
}

module.exports = {
    orchestrate,
    analyzeAndDecide,
    generateAndPostResponse,
    // 匯出供測試使用
    applyDecisionRules,
    ORCHESTRATOR_ENABLED
};
