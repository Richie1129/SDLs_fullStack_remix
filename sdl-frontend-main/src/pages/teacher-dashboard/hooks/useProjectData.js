import { useState, useEffect } from "react";
import { apiAdapter } from "../utils/apiAdapter";
import { DataNormalizer } from "../utils/DataNormalizer";

/**
 * 專案和活動資料的專門 Hook
 * 負責獲取和管理專案、任務、想法牆、聊天等資料
 */
export const useProjectData = (projectId, userRole) => {
  const [projectData, setProjectData] = useState({
    tasks: [],
    nodes: [],
    nodeRelations: [],
    chatrooms: [],
    chatHistory: [],
    projectActivity: [],
    allProjects: [],
    allProjectMembers: {},
    projectName: "",
    loading: true,
    error: null
  });

  useEffect(() => {
    if (!projectId) {
      console.warn("❌ projectId 未定義");
      setProjectData(prev => ({ ...prev, loading: false, error: "缺少 projectId" }));
      return;
    }

    const fetchProjectData = async () => {
      try {
        setProjectData(prev => ({ ...prev, loading: true, error: null }));

        const normalizer = new DataNormalizer();
        const currentUsername = localStorage.getItem("username");

        console.log("🏗️ 開始獲取專案相關資料...", { projectId, userRole });

        // 並行獲取專案基本資料
        const [
          kanbanResult,
          ideaWallResult,
          chatResult,
          activityResult,
          projectsResult
        ] = await Promise.all([
          apiAdapter.getKanbanData(projectId),
          apiAdapter.getIdeaWallData(projectId),
          apiAdapter.getChatData(projectId),
          apiAdapter.getProjectActivityData(projectId),
          apiAdapter.getUserProjects(currentUsername)
        ]);

        // 正規化資料
        const { tasks } = normalizer.normalizeKanbanData(
          kanbanResult.success ? kanbanResult.data : []
        );

        const { nodes, relations } = normalizer.normalizeIdeaWallData(
          ideaWallResult.success ? ideaWallResult.data.nodes : [],
          ideaWallResult.success ? ideaWallResult.data.relations : []
        );

        const { chatrooms, chatHistory } = normalizer.normalizeChatData(
          chatResult.success ? chatResult.data.chatrooms : [],
          chatResult.success ? chatResult.data.chatHistoryMap : {}
        );

        const projectActivity = normalizer.normalizeProjectActivity(
          activityResult.success ? activityResult.data : []
        );

        const allProjects = normalizer.normalizeProjectList(
          projectsResult.success ? projectsResult.data : []
        );

        // 獲取專案名稱
        let projectName = `專案 ${projectId}`;
        const currentProject = allProjects.find(p => p.id === projectId);
        if (currentProject) {
          projectName = currentProject.name || currentProject.title || projectName;
        }

        // 獲取所有專案成員
        const membersResult = await apiAdapter.getAllProjectMembers(allProjects);
        const allProjectMembers = membersResult.success ? membersResult.data : {};

        const result = {
          tasks,
          nodes,
          nodeRelations: relations,
          chatrooms,
          chatHistory,
          projectActivity,
          allProjects,
          allProjectMembers,
          projectName,
          loading: false,
          error: null
        };

        console.log("✅ 專案資料獲取完成:", {
          專案名稱: projectName,
          任務數量: tasks.length,
          想法節點: nodes.length,
          聊天記錄: chatHistory.length,
          使用的想法牆格式: ideaWallResult.usedStage || 'N/A'
        });

        setProjectData(result);

      } catch (error) {
        console.error("❌ 專案資料獲取失敗:", error);
        setProjectData(prev => ({
          ...prev,
          loading: false,
          error: error.message || "專案資料獲取失敗"
        }));
      }
    };

    fetchProjectData();
  }, [projectId, userRole]);

  return projectData;
};