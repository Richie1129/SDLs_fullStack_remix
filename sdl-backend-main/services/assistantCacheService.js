/**
 * Assistant 快取服務模組
 * 
 * [Refactored] 從 controllers/assistant.js 中提取出
 * ProjectContext 快取系統和 getProjectContext 函數。
 * 
 * 職責：
 * - 管理 ProjectContext 的快取（TTL 5 分鐘）
 * - 組裝 ProjectContext（整合所有資料來源）
 * - 提供快取清除介面（供外部事件觸發）
 */

const ASSISTANT_CONFIG = require("../config/assistant");
const logger = require("../config/logger");
const {
    getStageMeta,
    getCompleteStageStructure,
    getStageCompletionStatus,
    getKanbanSnapshot,
    getIdeaWallSnapshot,
    getSubmissions,
} = require("./assistantDataService");

// ============================================================================
// ProjectContext 快取系統
// ============================================================================

const projectContextCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 分鐘

/**
 * 取得 ProjectContext（帶快取）
 */
async function getProjectContext(projectId, projectData, forceRefresh = false) {
    const cacheKey = `project_${projectId}`;
    const now = Date.now();

    // 快取命中且未過期
    if (!forceRefresh) {
        const cached = projectContextCache.get(cacheKey);
        if (cached && (now - cached.timestamp) < CACHE_TTL) {
            logger.info(`[Cache Hit] ProjectContext 從快取載入 (${projectId})`);
            return cached.data;
        }
    }

    // 快取未命中或強制刷新
    logger.info(`[Cache Miss] 開始撈取 ProjectContext (${projectId})`);

    const [stageMeta, stageStructure, stageCompletion, kanban, ideaWall, submissions] = await Promise.all([
        getStageMeta(projectData.project),
        getCompleteStageStructure(projectId),
        getStageCompletionStatus(projectId, projectData.project.currentStage, projectData.project.currentSubStage),
        getKanbanSnapshot(projectId),
        getIdeaWallSnapshot(projectId),
        getSubmissions(projectId),
    ]);

    const projectContext = {
        專案名稱: projectData.project.name,
        專案描述: projectData.project.describe || '無描述',
        當前階段: `${projectData.project.currentStage || '未設定'}/${projectData.project.currentSubStage || '未設定'}`,

        階段要求: {
            hasData: !!stageMeta,
            階段名稱: stageMeta?.stageName || null,
            子階段名稱: stageMeta?.meta.name || null,
            子階段說明: stageMeta?.meta.description || null,
            需填寫欄位: stageMeta?.meta.requiredFields || []
        },

        完整階段結構: {
            hasData: !!stageStructure && stageStructure.length > 0,
            總階段數: stageStructure?.length || 0,
            所有階段: stageStructure || [],
            當前階段ID: projectData.project.currentStage,
            當前子階段ID: projectData.project.currentSubStage
        },

        階段完成狀態: stageCompletion || { hasData: false, message: "無階段完成資料" },

        看板狀況: {
            hasData: kanban.length > 0,
            總欄位數: kanban.length,
            總任務數: kanban.reduce((sum, col) => sum + col.tasks.length, 0),
            欄位詳情: kanban.map(col => ({
                欄位名稱: col.name,
                任務數量: col.tasks.length,
                任務列表: col.tasks.slice(0, ASSISTANT_CONFIG.PROMPT_KANBAN_TASKS_LIMIT).map(t => ({
                    標題: t.title,
                    內容: t.content ? t.content.substring(0, ASSISTANT_CONFIG.PROMPT_TASK_CONTENT_LIMIT) : '',
                    負責人: t.assignees?.map(a => a.username).join(', ') || '未指派',
                    標籤: t.labels?.join(', ') || '無',
                }))
            }))
        },

        想法牆: {
            hasData: ideaWall.total > 0,
            總節點數: ideaWall.total,
            想法列表: ideaWall.nodes.slice(0, ASSISTANT_CONFIG.PROMPT_IDEA_NODES_LIMIT).map(n => ({
                標題: n.title,
                內容: n.content ? n.content.substring(0, ASSISTANT_CONFIG.PROMPT_IDEA_CONTENT_LIMIT) : '',
                作者: n.owner,
                建立時間: n.createdAt,
            }))
        },

        最近提交記錄: {
            hasData: submissions.length > 0,
            總數: submissions.length,
            記錄列表: submissions.slice(0, ASSISTANT_CONFIG.PROMPT_SUBMISSIONS_LIMIT).map(s => ({
                階段: s.stage,
                內容摘要: typeof s.content === 'string'
                    ? s.content.substring(0, ASSISTANT_CONFIG.PROMPT_SUBMIT_CONTENT_LIMIT)
                    : JSON.stringify(s.content).substring(0, ASSISTANT_CONFIG.PROMPT_SUBMIT_CONTENT_LIMIT),
                提交時間: s.createdAt,
            }))
        },
    };

    // 存入快取
    projectContextCache.set(cacheKey, { data: projectContext, timestamp: now });
    logger.info(`[Cache Store] ProjectContext 已快取 (${projectId})`);

    // 定期清理過期快取
    if (projectContextCache.size > 100) {
        cleanExpiredCache();
    }

    return projectContext;
}

/**
 * 清理過期的快取條目
 */
function cleanExpiredCache() {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, value] of projectContextCache.entries()) {
        if (now - value.timestamp >= CACHE_TTL) {
            projectContextCache.delete(key);
            cleaned++;
        }
    }
    if (cleaned > 0) {
        logger.info(`[Cache Clean] 清理 ${cleaned} 個過期快取條目`);
    }
}

/**
 * 手動清除特定專案的快取（供外部更新事件使用）
 */
function invalidateProjectCache(projectId) {
    const cacheKey = `project_${projectId}`;
    const deleted = projectContextCache.delete(cacheKey);
    if (deleted) {
        logger.info(`[Cache Invalidate] 已清除 ProjectContext 快取 (${projectId})`);
    }
}

module.exports = {
    getProjectContext,
    invalidateProjectCache,
    cleanExpiredCache,
};
