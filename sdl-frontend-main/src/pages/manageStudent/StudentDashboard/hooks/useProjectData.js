import { useState, useEffect } from "react";
import { getKanbanColumns, getProjectActivity } from "../../../../api/kanban";
import { getNodes } from "../../../../api/nodes";
import { getIdeaWall } from "../../../../api/ideaWall";
import { getAllPersonalDaily, getAllTeamDaily } from "../../../../api/reflection";
import { getChatroomHistory } from "../../../../api/chatroom";
import { getRagMessageHistory } from "../../../../api/rag";
import { getProjectUser } from "../../../../api/users";
import { getProject } from "../../../../api/project";

/**
 * 自定義 Hook 用於獲取專案相關數據
 * @param {string} projectId - 專案ID
 * @param {string} userId - 用戶ID
 * @returns {object} 包含所有專案數據和載入狀態
 */
export const useProjectData = (projectId, userId) => {
  // 狀態管理
  const [projectInfo, setProjectInfo] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [allReflections, setAllReflections] = useState([]);
  const [teamReflections, setTeamReflections] = useState([]);
  const [teamAiInteractions, setTeamAiInteractions] = useState([]);
  const [personalReflections, setPersonalReflections] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [aiInteractions, setAiInteractions] = useState([]);
  const [projectActivities, setProjectActivities] = useState([]);
  const [ideaNodes, setIdeaNodes] = useState([]);
  const [kanbanTasks, setKanbanTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // 獲取所有專案資料
  useEffect(() => {
    const fetchProjectData = async () => {
      try {
        setLoading(true);
        
        // 並行獲取基本專案資料
        const [
          projectResponse,
          membersResponse,
          chatResponse,
          projectActivityResponse,
          kanbanResponse,
          ideaWallResponse
        ] = await Promise.allSettled([
          getProject(projectId),
          getProjectUser(projectId),
          getChatroomHistory(projectId),
          getProjectActivity(projectId),
          getKanbanColumns(projectId),
          getIdeaWall(projectId, "1-1")
        ]);

        // 處理基本資料
        const project = projectResponse.status === 'fulfilled' ? projectResponse.value : null;
        const members = membersResponse.status === 'fulfilled' ? membersResponse.value || [] : [];
        const chat = chatResponse.status === 'fulfilled' ? chatResponse.value || [] : [];
        const activity = projectActivityResponse.status === 'fulfilled' ? projectActivityResponse.value || [] : [];
        const kanban = kanbanResponse.status === 'fulfilled' ? kanbanResponse.value || [] : [];
        const ideaWall = ideaWallResponse.status === 'fulfilled' ? ideaWallResponse.value : null;

        setProjectInfo(project);
        setTeamMembers(members);
        setChatHistory(chat);
        setProjectActivities(activity);

        // 處理 Kanban 任務
        const tasks = [];
        kanban.forEach(column => {
          if (column.task && Array.isArray(column.task)) {
            column.task.forEach(task => {
              tasks.push({
                ...task,
                columnName: column.name
              });
            });
          }
        });
        setKanbanTasks(tasks);

        // 處理想法節點
        if (ideaWall && ideaWall.id) {
          try {
            const nodes = await getNodes(ideaWall.id);
            setIdeaNodes(nodes || []);
          } catch (error) {
            console.error("獲取想法節點失敗:", error);
            setIdeaNodes([]);
          }
        }

        // 獲取反思資料（個人和團隊）
        const [
          personalReflectionsResponse,
          teamReflectionsResponse
        ] = await Promise.allSettled([
          getAllPersonalDaily({ 
            projectId: projectId, 
            userId: userId,
            isTeacher: false 
          }),
          getAllTeamDaily({ params: { projectId: projectId } })
        ]);

        const personalRefl = personalReflectionsResponse.status === 'fulfilled' ? 
          personalReflectionsResponse.value || [] : [];
        const teamRefl = teamReflectionsResponse.status === 'fulfilled' ? 
          teamReflectionsResponse.value || [] : [];

        setPersonalReflections(personalRefl);
        setTeamReflections(teamRefl);

        // 獲取團隊所有成員的AI互動記錄
        if (members.length > 0) {
          const aiPromises = members.map(async (member) => {
            try {
              const aiData = await getRagMessageHistory(member.id);
              return aiData || [];
            } catch (error) {
              console.error(`獲取成員 ${member.username} AI記錄失敗:`, error);
              return [];
            }
          });

          const aiResults = await Promise.allSettled(aiPromises);
          const allAiInteractions = aiResults
            .filter(result => result.status === 'fulfilled')
            .flatMap(result => result.value);

          setTeamAiInteractions(allAiInteractions);

          // 獲取個人AI記錄
          try {
            const personalAi = await getRagMessageHistory(userId);
            setAiInteractions(personalAi || []);
          } catch (error) {
            console.error("獲取個人AI記錄失敗:", error);
            setAiInteractions([]);
          }
        }

      } catch (error) {
        console.error("獲取專案資料失敗:", error);
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchProjectData();
    }
  }, [projectId, userId]);

  return {
    // 數據
    projectInfo,
    teamMembers,
    allReflections,
    teamReflections,
    teamAiInteractions,
    personalReflections,
    chatHistory,
    aiInteractions,
    projectActivities,
    ideaNodes,
    kanbanTasks,
    
    // 狀態
    loading
  };
};
