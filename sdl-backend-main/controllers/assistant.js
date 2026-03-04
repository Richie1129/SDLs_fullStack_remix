/**
 * Assistant Controller
 * 
 * [Refactored] 從 1,301 行精簡至 ~350 行。
 * 資料查詢/快取邏輯已提取至：
 *   - services/assistantDataService.js  (資料查詢、LLM 分析)
 *   - services/assistantCacheService.js (ProjectContext 快取)
 * 
 * 本檔案僅保留 3 個 API Controller 函數：
 *   - getGuidance        POST /assistant/guidance
 *   - chatWithStreaming   POST /api/assistant/chat
 *   - getExternalLinks    POST /api/assistant/grounding
 */

const ChatTurn = require("../models/chat_turn");

const { callGeminiGrounding } = require("../services/llmGateway");
const { streamGeminiResponse } = require("../services/streamingService");
const { streamGeminiResponseStructured } = require("../services/structuredStreamingService");
const ASSISTANT_CONFIG = require("../config/assistant");
const { PromptBuilder } = require("../config/assistantPrompts");
const { logAudit } = require("../services/auditService");

// [Refactored] 從 services 匯入
const {
  estimateTokenCount,
  getProjectBasicsAndUserRole,
  getStageMeta,
  getKanbanSnapshot,
  getIdeaWallSnapshot,
  getSubmissions,
  getChatHistory,
  getActivitySummary,
  analyzeProjectStateWithLLM,
  generateReportFromAnalysis,
} = require("../services/assistantDataService");

const {
  getProjectContext,
  invalidateProjectCache,
} = require("../services/assistantCacheService");

// 匯出快取管理函數（供其他 controller 使用）
module.exports.invalidateProjectCache = invalidateProjectCache;

// ============================================================================
// API Controllers
// ============================================================================

/**
 * 生成 AI 指導建議
 * POST /assistant/guidance
 */
exports.getGuidance = async (req, res) => {
  try {
    const { projectId, userMessage } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: "Project ID is required | 需要專案ID" });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "User authentication required | 需要使用者驗證" });
    }

    const projectData = await getProjectBasicsAndUserRole(projectId, userId);
    if (!projectData) {
      return res.status(404).json({ error: "Project not found or access denied | 專案不存在或無權限" });
    }

    // 撈取所有資料
    const [stageMeta, kanbanSnapshot, ideaWallSnapshot, submissions, chatHistory, activitySummary] = await Promise.all([
      getStageMeta(projectData.project),
      getKanbanSnapshot(projectId),
      getIdeaWallSnapshot(projectId),
      getSubmissions(projectId),
      getChatHistory(projectId),
      getActivitySummary(projectId),
    ]);

    // LLM 智能分析專案狀態
    const projectBasics = {
      name: projectData.project.name,
      description: projectData.project.describe,
      currentStage: projectData.project.currentStage,
      currentSubStage: projectData.project.currentSubStage,
    };

    const projectAnalysis = await analyzeProjectStateWithLLM({
      kanban: kanbanSnapshot,
      ideaWall: ideaWallSnapshot,
      submissions,
      stageMeta,
      projectBasics,
      activitySummary,
    });

    const detailedMessage = await generateReportFromAnalysis(projectAnalysis, projectBasics, userMessage);

    // 簡化的專案摘要
    const projectSummary = {
      projectBasics,
      user: projectData.user,
      stageMeta,
      analysis: projectAnalysis,
      stats: {
        kanbanColumns: kanbanSnapshot.length,
        totalTasks: kanbanSnapshot.reduce((sum, col) => sum + col.tasks.length, 0),
        ideaNodes: ideaWallSnapshot.total,
        submissions: submissions.length,
        recentActivity: activitySummary.taskChanges.total,
      },
    };

    const response = {
      message: detailedMessage,
      projectData: projectSummary,
      followup: {
        questions: [
          "需要我協助規劃下一步工作嗎？",
          "想討論看板中的任務安排嗎？",
          "需要我分析想法牆的內容嗎？",
        ],
      },
      ...(projectAnalysis.degradedMode && {
        warning: {
          type: 'DEGRADED_SERVICE',
          message: 'AI 服務暫時不可用，目前顯示基本統計資料',
          details: projectAnalysis.degradedReason
        }
      })
    };

    res.status(200).json(response);

    // 審計追蹤
    logAudit(req, {
      action: 'ASSISTANT_GUIDANCE_REQUEST',
      targetType: 'Project',
      targetId: projectId,
      projectId: projectId,
      metadata: {
        projectName: projectData.project.name,
        userMessage: userMessage ? userMessage.substring(0, 100) : null,
        messageLength: userMessage ? userMessage.length : 0,
        responseLength: detailedMessage ? detailedMessage.length : 0,
        degradedMode: projectAnalysis.degradedMode || false,
        stats: {
          kanbanColumns: kanbanSnapshot.length,
          totalTasks: kanbanSnapshot.reduce((sum, col) => sum + col.tasks.length, 0),
          ideaNodes: ideaWallSnapshot.total,
          submissions: submissions.length
        }
      }
    }).catch(err => {
      console.error('❌ [Audit] 記錄 ASSISTANT_GUIDANCE_REQUEST 失敗:', err.message);
    });
  } catch (error) {
    console.error("Guidance generation failed | 指導建議生成失敗:", error);
    res.status(500).json({
      error: "Failed to generate guidance | 指導建議生成失敗",
      message: "抱歉，暫時無法回應，請稍後再試。",
    });
  }
};

/**
 * 聊天功能（支援 streaming）
 * POST /api/assistant/chat
 */
exports.chatWithStreaming = async (req, res) => {
  try {
    const { projectId, message, provider = 'gemini', sessionId = 'default' } = req.body;
    const userId = req.user?.id;

    console.log('🤖 [Assistant Chat] 收到請求:', { projectId, message, provider, userId, sessionId });

    // 驗證
    if (!userId) {
      console.log('❌ [Assistant Chat] 驗證失敗: 未登入');
      return res.status(401).json({ error: '請先登入' });
    }
    if (!projectId || !message) {
      console.log('❌ [Assistant Chat] 驗證失敗: 缺少參數');
      return res.status(400).json({ error: '需要 projectId 和 message' });
    }

    // 取得專案資料
    console.log('📂 [Assistant Chat] 開始取得專案資料...');
    const projectData = await getProjectBasicsAndUserRole(projectId, userId);
    if (!projectData) {
      console.log('❌ [Assistant Chat] 專案不存在或無權限');
      return res.status(404).json({ error: '找不到專案或沒有權限' });
    }
    console.log('✅ [Assistant Chat] 專案資料取得成功:', projectData.project.name);

    const userName = projectData.user.username || '同學';
    console.log('👤 [Assistant Chat] 使用者名字:', userName);

    // 使用快取系統取得 projectContext
    const [projectContext, chatHistory] = await Promise.all([
      getProjectContext(projectId, projectData),
      getChatHistory(projectId),
    ]);
    console.log('✅ [Assistant Chat] 所有資料撈取完成');

    // 初始化 PromptBuilder
    const promptBuilder = new PromptBuilder({
      userName,
      projectContext,
      chatHistory,
      chatHistoryLimit: ASSISTANT_CONFIG.PROMPT_CHAT_HISTORY_LIMIT
    });

    // 使用 Gemini
    if (provider === 'gemini' || !provider) {
      console.log('🚀 [Assistant Chat] 使用 Gemini 開始串流...');

      const systemInstruction = `你是專業的專案導師 AI 助手。

**重要格式要求（必須嚴格遵守）**：
- 必須使用 Markdown 格式回覆
- 使用 ## 或 ### 標題組織答案結構
- 使用 **粗體** 標記重要資訊（如任務名稱、階段名稱、關鍵數字）
- 使用列表（- 或 1.）讓內容更清晰
- 程式碼或檔名使用 \`反引號\`
- 需要比較時使用表格格式
- 使用繁體中文回覆`;

      const useStructuredOutput = process.env.USE_STRUCTURED_OUTPUT === 'true';
      let result;

      if (useStructuredOutput) {
        console.log('🧪 [Assistant Chat] 啟用 Structured Output 模式');

        try {
          const structuredPrompt = promptBuilder.forStructured(message);
          const promptTokens = estimateTokenCount(structuredPrompt);
          const contextSize = JSON.stringify(projectContext).length;
          console.log(`📊 [Token Monitor] Prompt 大小: ${contextSize} 字元 (Structured), ~${promptTokens} tokens`);

          result = await streamGeminiResponseStructured(structuredPrompt, res, {
            model: 'gemini-2.5-flash',
            systemInstruction
          });
          console.log('✅ [Assistant Chat] Structured Output 成功');
        } catch (structuredError) {
          console.warn('⚠️ [Assistant Chat] Structured Output 失敗，fallback 到傳統方法');
          console.error('  錯誤詳情:', structuredError.message);
          const prompt = promptBuilder.forGemini(message);
          result = await streamGeminiResponse(prompt, res, {
            model: 'gemini-2.5-flash',
            systemInstruction
          });
        }
      } else {
        console.log('📝 [Assistant Chat] 使用傳統 XML 解析模式（預設）');
        const prompt = promptBuilder.forGemini(message);
        const promptTokens = estimateTokenCount(prompt);
        const contextSize = JSON.stringify(projectContext).length;
        console.log(`📊 [Token Monitor] Prompt 大小: ${contextSize} 字元, ~${promptTokens} tokens`);

        result = await streamGeminiResponse(prompt, res, {
          model: 'gemini-2.5-flash',
          systemInstruction
        });
      }

      // 儲存對話（非阻塞）
      if (result && (result.thinkingContent || result.assistantContent)) {
        ChatTurn.create({
          projectId: parseInt(projectId, 10),
          projectName: projectData.project.name,
          userId: parseInt(userId, 10),
          username: userName,
          userContent: message,
          assistantContent: result.assistantContent || '',
          thinkingContent: result.thinkingContent || null,
          assistantUsername: 'AI 導師',
          sessionId: sessionId || 'default'
        }).catch(err => {
          console.error('❌ [Assistant Chat] 儲存對話失敗:', err);
        });

        logAudit(req, {
          action: 'ASSISTANT_CHAT_REQUEST',
          targetType: 'Project',
          targetId: parseInt(projectId, 10),
          projectId: parseInt(projectId, 10),
          metadata: {
            projectName: projectData.project.name,
            provider: 'gemini',
            sessionId: sessionId || 'default',
            message: message.substring(0, 100),
            messageLength: message.length,
            responseLength: result.assistantContent ? result.assistantContent.length : 0,
            hasThinking: !!result.thinkingContent,
            useStructuredOutput: process.env.USE_STRUCTURED_OUTPUT === 'true'
          }
        }).catch(err => {
          console.error('❌ [Audit] 記錄 ASSISTANT_CHAT_REQUEST 失敗:', err.message);
        });
      }

    } else {
      return res.status(400).json({ error: 'provider 必須是 "gemini"' });
    }

  } catch (error) {
    console.error('Chat streaming error:', error);

    if (res.writableEnded) {
      console.log('⚠️ Response already ended, skipping error write');
      return;
    }

    if (!res.headersSent) {
      res.status(500).json({
        error: '發生錯誤',
        message: '抱歉，AI 服務暫時無法回應，請稍後再試'
      });
    } else {
      try {
        res.write(`data: ${JSON.stringify({
          type: 'error',
          error: '發生錯誤，請稍後再試'
        })}\n\n`);
        res.end();
      } catch (writeError) {
        console.error('❌ Error writing to already-ended stream:', writeError.message);
      }
    }
  }
};

/**
 * 取得外部延伸閱讀連結（使用 Gemini Grounding）
 * POST /api/assistant/grounding
 */
exports.getExternalLinks = async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ error: 'question 參數必須是非空字串' });
    }

    console.log(`🔗 [External Links] 收到請求，問題: "${question}"`);
    const result = await callGeminiGrounding(question);
    console.log(`✅ [External Links] 成功取得 ${result.externalLinks.length} 個連結`);

    res.status(200).json({
      success: true,
      externalLinks: result.externalLinks,
      webSearchQueries: result.webSearchQueries
    });

  } catch (error) {
    console.error('❌ [External Links] 錯誤:', error);
    res.status(200).json({
      success: false,
      externalLinks: [],
      error: error.message
    });
  }
};
