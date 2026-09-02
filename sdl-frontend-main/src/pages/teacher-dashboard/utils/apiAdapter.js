import { getKanbanColumns, getProjectActivity } from "../../../api/kanban";
import { getNodes, getNodeRelation } from "../../../api/nodes";
import { getIdeaWall } from "../../../api/ideaWall";
import { getProjectUser, batchGetProjectUsers } from "../../../api/users";
import { getAllPersonalDaily } from "../../../api/reflection";
import { getAllChatrooms } from "../../../api/question";
import { getChatroomHistory } from "../../../api/chatroom";
import { getAllSubmit } from "../../../api/submit";
import { getProjectsByMentor } from "../../../api/project";
import { getUsageSummary } from "../../../api/usage";
import { getRagMessageHistory } from "../../../api/rag";
import { getCurrentUsername, getUserForSocket, isCurrentUser } from '../../../utils/userUtils';
import { getCurrentUserId } from '../../../utils/authUtils';

/**
 * API 適配器 - 統一處理所有API呼叫
 * 提供一致的錯誤處理和資料格式
 */
export class ApiAdapter {
  constructor() {
    // 設定預設的重試次數和延遲
    this.retryCount = 3;
    this.retryDelay = 1000;
    
    // Stage 格式配置 - 智慧化而非硬編碼試錯
    this.stageFormats = ["1-1", "1-2", "1-3", "2-1", "2-2", "2-3", "3-1", "3-2", "3-3"];
  }

  /**
   * 基礎的API呼叫包裝器，包含重試邏輯
   */
  async callWithRetry(apiFunction, ...args) {
    let lastError;
    
    for (let i = 0; i < this.retryCount; i++) {
      try {
        const result = await apiFunction(...args);
        return { success: true, data: result, error: null };
      } catch (error) {
        lastError = error;
        console.warn(`API調用失敗 (嘗試 ${i + 1}/${this.retryCount}):`, error);
        
        // 如果不是最後一次嘗試，等待後重試
        if (i < this.retryCount - 1) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * (i + 1)));
        }
      }
    }
    
    return { success: false, data: null, error: lastError };
  }

  /**
   * 看板資料獲取
   */
  async getKanbanData(projectId) {
    return await this.callWithRetry(getKanbanColumns, projectId);
  }

  /**
   * 智慧想法牆資料獲取
   * 使用配置驅動而非試錯邏輯
   */
  async getIdeaWallData(projectId, preferredStage = "1-1") {
    // 先嘗試偏好的 stage 格式
    let result = await this.callWithRetry(getIdeaWall, projectId, preferredStage);
    
    if (result.success && result.data?.id) {
      const nodesResult = await this.callWithRetry(getNodes, result.data.id);
      const relationsResult = await this.callWithRetry(getNodeRelation, result.data.id);
      
      return {
        success: true,
        data: {
          ideaWall: result.data,
          nodes: nodesResult.success ? nodesResult.data : [],
          relations: relationsResult.success ? relationsResult.data : []
        },
        usedStage: preferredStage
      };
    }

    // 如果偏好格式失敗，嘗試其他格式
    for (const stageFormat of this.stageFormats) {
      if (stageFormat === preferredStage) continue; // 已經試過了
      
      result = await this.callWithRetry(getIdeaWall, projectId, stageFormat);
      
      if (result.success && result.data?.id) {
        const nodesResult = await this.callWithRetry(getNodes, result.data.id);
        const relationsResult = await this.callWithRetry(getNodeRelation, result.data.id);
        
        if (nodesResult.success && nodesResult.data?.length > 0) {
          return {
            success: true,
            data: {
              ideaWall: result.data,
              nodes: nodesResult.data,
              relations: relationsResult.success ? relationsResult.data : []
            },
            usedStage: stageFormat
          };
        }
      }
    }

    return { 
      success: false, 
      data: { ideaWall: null, nodes: [], relations: [] }, 
      error: new Error('無法獲取想法牆資料') 
    };
  }

  /**
   * 學生資料獲取
   */
  async getStudentData(projectId) {
    return await this.callWithRetry(getProjectUser, projectId);
  }

  /**
   * 反思記錄獲取
   */
  async getReflectionData(projectId, userId, isTeacher) {
    return await this.callWithRetry(getAllPersonalDaily, {
      projectId,
      userId,
      isTeacher
    });
  }

  /**
   * 聊天室資料獲取
   */
  async getChatData(projectId) {
    const chatroomsResult = await this.callWithRetry(getAllChatrooms, projectId);
    
    if (!chatroomsResult.success) {
      return { success: false, data: { chatrooms: [], chatHistory: [] } };
    }

    const chatrooms = chatroomsResult.data || [];
    const chatHistoryMap = {};

    // 並行獲取所有聊天室的歷史記錄
    const historyPromises = chatrooms.map(async (chatroom) => {
      const historyResult = await this.callWithRetry(getChatroomHistory, chatroom.id);
      if (historyResult.success) {
        chatHistoryMap[chatroom.id] = historyResult.data || [];
      }
    });

    await Promise.all(historyPromises);

    return { 
      success: true, 
      data: { chatrooms, chatHistoryMap } 
    };
  }

  /**
   * 提交資料獲取
   */
  async getSubmissionData(projectId) {
    return await this.callWithRetry(getAllSubmit, {
      params: { projectId }
    });
  }

  /**
   * 專案活動獲取
   */
  async getProjectActivityData(projectId) {
    return await this.callWithRetry(getProjectActivity, projectId);
  }

  /**
   * 使用者專案列表獲取
   */
  async getUserProjects(username) {
    if (!username) {
      return { success: true, data: [] };
    }
    return await this.callWithRetry(getProjectsByMentor, username);
  }

  /**
   * 批量獲取學生的AI互動和使用時長資料
   */
  async getStudentMetrics(students, projectId) {
    if (!Array.isArray(students) || students.length === 0) {
      return { success: true, data: { aiCountByUserId: {}, usageByUserId: {} } };
    }

    const aiCountByUserId = {};
    const usageByUserId = {};

    // 並行獲取所有學生的指標
    const promises = students.map(async (student) => {
      // AI 互動次數
      try {
        const ragResult = await this.callWithRetry(getRagMessageHistory, student.id, { projectId });
        aiCountByUserId[student.id] = ragResult.success && Array.isArray(ragResult.data) 
          ? ragResult.data.length 
          : 0;
      } catch (error) {
        aiCountByUserId[student.id] = 0;
      }

      // 使用時長統計
      try {
        const usageResult = await this.callWithRetry(getUsageSummary, { 
          userId: student.id, 
          projectId 
        });
        usageByUserId[student.id] = usageResult.success 
          ? (usageResult.data?.totalSeconds || 0)
          : 0;
      } catch (error) {
        usageByUserId[student.id] = 0;
      }
    });

    await Promise.all(promises);

    return { 
      success: true, 
      data: { aiCountByUserId, usageByUserId } 
    };
  }

  /**
   * 所有專案成員資料獲取 - 使用批次 API 優化
   */
  async getAllProjectMembers(projects) {
    if (!Array.isArray(projects) || projects.length === 0) {
      return { success: true, data: {} };
    }

    try {
      const projectIds = projects.map(p => p.id);
      console.log('[apiAdapter] 開始批次載入成員，專案數:', projectIds.length);

      // 使用批次 API 一次獲取所有專案的用戶
      const usersByProject = await batchGetProjectUsers(projectIds);

      console.log('[apiAdapter] 成員載入完成，專案數:', Object.keys(usersByProject).length);

      return { success: true, data: usersByProject };
    } catch (error) {
      console.error('[apiAdapter] 載入成員失敗:', error);
      return { success: false, data: {} };
    }
  }

  /**
   * 主要的資料獲取方法 - 協調所有API呼叫
   */
  async fetchAllDashboardData(projectId, userRole) {
    if (!projectId) {
      throw new Error("projectId 是必需的");
    }

    // 獲取當前使用者資訊
    const currentUserId = getCurrentUserId();
    const currentUsername = getCurrentUsername();
    const isTeacher = userRole === 'teacher';

    console.log("🚀 開始獲取儀表板資料...", { projectId, userRole, currentUserId });

    try {
      // 第一階段：獲取基本資料（並行執行以提高效能）
      const [
        kanbanResult,
        ideaWallResult,
        studentsResult,
        reflectionsResult,
        chatResult,
        submissionsResult,
        activityResult,
        projectsResult
      ] = await Promise.all([
        this.getKanbanData(projectId),
        this.getIdeaWallData(projectId),
        this.getStudentData(projectId),
        this.getReflectionData(projectId, currentUserId, isTeacher),
        this.getChatData(projectId),
        this.getSubmissionData(projectId),
        this.getProjectActivityData(projectId),
        this.getUserProjects(currentUsername)
      ]);

      // 第二階段：基於學生資料獲取額外指標
      const students = studentsResult.success ? studentsResult.data : [];
      const metricsResult = await this.getStudentMetrics(students, projectId);

      // 第三階段：獲取所有專案成員
      const projects = projectsResult.success ? projectsResult.data : [];
      const membersResult = await this.getAllProjectMembers(projects);

      // 組合結果
      const result = {
        kanban: kanbanResult,
        ideaWall: ideaWallResult,
        students: studentsResult,
        reflections: reflectionsResult,
        chat: chatResult,
        submissions: submissionsResult,
        activity: activityResult,
        projects: projectsResult,
        metrics: metricsResult,
        members: membersResult
      };

      console.log("✅ 儀表板資料獲取完成", {
        學生數量: students.length,
        專案數量: projects.length,
        想法牆格式: ideaWallResult.usedStage || 'N/A'
      });

      return result;

    } catch (error) {
      console.error("❌ 儀表板資料獲取失敗:", error);
      throw error;
    }
  }
}

// 導出單例實例
export const apiAdapter = new ApiAdapter();