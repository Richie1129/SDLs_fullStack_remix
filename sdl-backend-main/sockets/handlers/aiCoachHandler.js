/**
 * AI Coach Socket Handler (Phase 3)
 * 
 * Linus 式設計哲學：
 * "Simple is better. The best code is the code you don't write."
 * 
 * 職責：
 * - 處理 AI 助教建議的即時通知
 * - 廣播 Orchestrator 決策給前端
 * - 收集 Feedback 數據
 * 
 * 事件清單：
 * - aiCoachSuggestion: Orchestrator 觸發建議時發送
 * - aiCoachFeedback: 學生提交對 AI 回應的評價
 */

const { SocketHandlerFactory } = require('../socketHandlers');
const { writeSocketErrorReport } = require('../../utils/errorHandler');

/**
 * AI Coach Socket 事件處理器
 */
class AiCoachHandler {
    /**
     * 註冊所有 AI Coach 相關的 Socket 事件
     */
    static registerEvents(io, socket) {
        // 接收學生對 AI 回應的 Feedback
        socket.on('aiCoachFeedback', async (data) => {
            await AiCoachHandler.handleFeedback(socket, data);
        });

        // 注意：join_project 已由 messageHandler 處理
        // 這裡不需要重複註冊，避免混淆房間名稱
    }

    /**
     * 處理學生對 AI 回應的 Feedback
     * 
     * @param {Object} socket - Socket instance
     * @param {Object} data - { projectId, ideaWallId, agentType, feedbackType, responseId, userId }
     */
    static async handleFeedback(socket, data) {
        const { projectId, ideaWallId, nodeId, agentType, feedbackType, responseId, userId } = data;
        
        try {
            // 動態引入避免循環依賴
            const AiFeedback = require('../../models/ai_feedback');
            
            await AiFeedback.create({
                projectId: projectId || null,
                ideaWallId: ideaWallId || null,
                nodeId: nodeId || null,
                agentType: agentType || 'UNKNOWN',
                feedbackType: feedbackType, // 'helpful' | 'not_helpful'
                sessionId: responseId || null,
                userId: userId || null
            });

            console.log(`👍 AI Feedback recorded: ${feedbackType} for ${agentType} in project ${projectId}`);
            
            this.socket.emit('aiCoachFeedbackResponse', {
                success: true,
                message: '感謝你的回饋！',
                code: 'FEEDBACK_RECORDED'
            });

        } catch (error) {
            console.error('Error recording AI feedback:', error);
            writeSocketErrorReport(error, 'aiCoachFeedback', this.socket.user);
            this.socket.emit('aiCoachFeedbackResponse', {
                success: false,
                message: '記錄回饋時發生錯誤',
                code: 'FEEDBACK_ERROR'
            });
        }
    }

    /**
     * 發送 AI 建議通知到特定專案
     * 
     * 這個方法由 Orchestrator 呼叫，不是 Socket 事件
     * 
     * @param {Object} io - Socket.io server instance
     * @param {number} projectId - 專案 ID
     * @param {Object} suggestion - 建議內容 { action, role, reason, analysis }
     */
    static broadcastSuggestion(io, projectId, suggestion) {
        // 注意：messageHandler 使用 projectId 作為房間名（不是 `project-${projectId}`）
        const roomName = String(projectId);
        
        io.to(roomName).emit('aiSuggestion', {
            type: 'AI_COACH_SUGGESTION',
            timestamp: new Date().toISOString(),
            projectId,
            ...suggestion
        });

        console.log(`📢 AI suggestion broadcasted to room ${roomName}: ${suggestion.role}`);
    }
}

module.exports = AiCoachHandler;
