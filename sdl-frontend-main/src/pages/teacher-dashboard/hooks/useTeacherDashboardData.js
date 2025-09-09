import { useState, useEffect } from "react";
import { getKanbanColumns, getProjectActivity } from "../../../api/kanban";
import { getNodes, getNodeRelation } from "../../../api/nodes";
import { getIdeaWall } from "../../../api/ideaWall";
import { getProjectUser } from "../../../api/users";
import { getAllPersonalDaily } from "../../../api/reflection";
import { getAllChatrooms } from "../../../api/question";
import { getChatroomHistory } from "../../../api/chatroom";
import { getAllSubmit } from "../../../api/submit";
import { getProjectsByMentor } from "../../../api/project";
import { getUsageSummary } from "../../../api/usage";
import { getRagMessageHistory } from "../../../api/rag";

export const useTeacherDashboardData = (projectId, userRole) => {
  const [realData, setRealData] = useState({
    tasks: [],
    nodes: [],
    nodeRelations: [],
    projectName: "",
    students: [],
    reflections: [],
    chatrooms: [],
    chatHistory: [],
    submissions: [],
    projectActivity: [],
    allProjects: [],
    loading: true
  });

  const [allProjectMembers, setAllProjectMembers] = useState({});

  useEffect(() => {
    if (!projectId) {
      console.warn("❌ projectId 未定義");
      return;
    }

    const fetchRealData = async () => {
      try {
        setRealData(prev => ({ ...prev, loading: true }));
        
        // 獲取當前用戶身份和資訊
        const currentUserId = localStorage.getItem("userId");
        const currentUsername = localStorage.getItem("username");
        const isTeacher = userRole === 'teacher';
        
        // 並行獲取所有資料
        const [
          columnData,
          ideaWallData,
          studentsData,
          reflectionsData,
          chatroomsData,
          submissionsData,
          projectActivityData,
          allProjectsData
        ] = await Promise.allSettled([
          getKanbanColumns(projectId),
          getIdeaWall(projectId, 1),
          getProjectUser(projectId),
          getAllPersonalDaily({ 
            projectId: projectId, 
            userId: currentUserId, 
            isTeacher: isTeacher 
          }),
          getAllChatrooms(projectId),
          getAllSubmit({ 
            params: { projectId: projectId }
          }),
          getProjectActivity(projectId),
          currentUsername ? getProjectsByMentor(currentUsername) : Promise.resolve([])
        ]);

        // 處理看板任務
        let allTasks = [];
        if (columnData.status === 'fulfilled' && columnData.value) {
          columnData.value.forEach(column => {
            const tasks = column.kanban_tasks || column.task || [];
            if (Array.isArray(tasks)) {
              const tasksWithStatus = tasks.map(task => ({
                ...task,
                status: column.title || column.name,
                columnId: column.id
              }));
              allTasks.push(...tasksWithStatus);
            }
          });
          allTasks.sort((a, b) => a.columnId - b.columnId);
        }

        // 處理想法節點
        let allNodes = [];
        let allRelations = [];
        let fetchedIdeaWallIds = [];
        
        // 嘗試多種 stage 格式獲取想法牆數據
        try {
          console.log("🎯 嘗試使用 stage '1-1' 獲取想法牆");
          const correctIdeaWallData = await getIdeaWall(projectId, "1-1");
          console.log("✅ 取得的 IdeaWall Data:", correctIdeaWallData);

          if (correctIdeaWallData && correctIdeaWallData.id) {
            fetchedIdeaWallIds = [correctIdeaWallData.id];
            console.log("📢 取得 Nodes, ideaWallIds:", fetchedIdeaWallIds);

            const nodePromises = fetchedIdeaWallIds.map(id => getNodes(id));
            const allNodeData = await Promise.all(nodePromises);
            allNodes = allNodeData.flat();
            console.log("✅ Nodes Data:", allNodes);

            // 取得節點關聯
            const relationPromises = fetchedIdeaWallIds.map(id => getNodeRelation(id));
            const allRelationData = await Promise.all(relationPromises);
            allRelations = allRelationData.flat();
            console.log("✅ Node Relations Data:", allRelations);
          }
        } catch (nodeError) {
          console.warn("⚠️ Stage '1-1' 想法牆節點資料獲取失敗:", nodeError);
        }

        // 如果失敗，嘗試其他 stage 格式
        if (allNodes.length === 0) {
          const stageFormats = ["1-2", "1-3", "2-1", "2-2", "2-3", "3-1", "3-2", "3-3"];
          for (const stageFormat of stageFormats) {
            try {
              console.log(`🎯 嘗試 stage '${stageFormat}' 獲取想法牆和節點`);
              const ideaWall = await getIdeaWall(projectId, stageFormat);
              if (ideaWall && ideaWall.id) {
                const nodeData = await getNodes(ideaWall.id);
                const relationData = await getNodeRelation(ideaWall.id);
                if (nodeData && nodeData.length > 0) {
                  allNodes = nodeData;
                  allRelations = relationData || [];
                  fetchedIdeaWallIds = [ideaWall.id];
                  console.log(`✅ Stage '${stageFormat}' 節點獲取成功:`, allNodes.length);
                  break;
                }
              }
            } catch (error) {
              console.warn(`⚠️ Stage '${stageFormat}' 失敗:`, error);
            }
          }
        }

        // 獲取聊天記錄
        let allChatHistory = [];
        if (chatroomsData.status === 'fulfilled' && chatroomsData.value) {
          for (const chatroom of chatroomsData.value) {
            try {
              const history = await getChatroomHistory(chatroom.id);
              if (history && Array.isArray(history)) {
                allChatHistory.push(...history.map(msg => ({
                  ...msg,
                  chatroomId: chatroom.id,
                  chatroomTitle: chatroom.title
                })));
              }
            } catch (chatError) {
              console.warn(`⚠️ 聊天室 ${chatroom.id} 歷史記錄獲取失敗:`, chatError);
            }
          }
        }

        // 獲取專案名稱
        let projectName = `專案 ${projectId}`;
        if (allProjectsData.status === 'fulfilled' && allProjectsData.value) {
          const currentProject = allProjectsData.value.find(p => p.id === projectId);
          if (currentProject) {
            projectName = currentProject.name || currentProject.title || projectName;
          }
        }

        // 學生對照表（id -> student）
        const studentsList = studentsData.status === 'fulfilled' ? (studentsData.value || []) : [];
        const studentById = Array.isArray(studentsList)
          ? studentsList.reduce((acc, s) => {
              if (s && (s.id !== undefined && s.id !== null)) acc[s.id] = s;
              return acc;
            }, {})
          : {};

        // 將 items 以學生資料補強使用者名稱
        const augmentWithUserInfo = (items, studentMap, userIdKey = 'userId') => {
          if (!Array.isArray(items)) return [];
          return items.map(item => {
            const uid = item?.[userIdKey];
            const student = uid ? studentMap[uid] : undefined;
            const username = item.username || item.user_name || student?.username || student?.name;
            return { ...item, userId: uid ?? item.userId, username };
          });
        };

        // 原始資料
        const baseReflections = reflectionsData.status === 'fulfilled' ? (reflectionsData.value || []) : [];
        const baseSubmissions = submissionsData.status === 'fulfilled' ? (submissionsData.value || []) : [];

        // 依據實際 API：反思有 userId；提交目前後端未提供 userId（等待後端補上）
        const reflectionsWithUser = augmentWithUserInfo(baseReflections, studentById, 'userId');
        const submissionsWithUser = augmentWithUserInfo(baseSubmissions, studentById, 'userId');

        // 取得各學生 AI 互動次數（簡易聚合）
        let aiCountByUserId = {};
        try {
          const ragPromises = studentsList.map(async (stu) => {
            try {
              const msgs = await getRagMessageHistory(stu.id);
              aiCountByUserId[stu.id] = Array.isArray(msgs) ? msgs.length : 0;
            } catch (e) {
              aiCountByUserId[stu.id] = 0;
            }
          });
          await Promise.all(ragPromises);
        } catch (e) {
          aiCountByUserId = {};
        }

        // 取得各學生使用時長統計
        let usageByUserId = {};
        try {
          const usagePromises = studentsList.map(async (stu) => {
            try {
              const summary = await getUsageSummary({ userId: stu.id, projectId });
              usageByUserId[stu.id] = summary?.totalSeconds || 0;
            } catch (e) {
              usageByUserId[stu.id] = 0;
            }
          });
          await Promise.all(usagePromises);
        } catch (e) {
          usageByUserId = {};
        }

        const finalData = {
          tasks: allTasks,
          nodes: allNodes,
          nodeRelations: allRelations,
          projectName: projectName,
          students: studentsList,
          reflections: reflectionsWithUser,
          chatrooms: chatroomsData.status === 'fulfilled' ? (chatroomsData.value || []) : [],
          chatHistory: allChatHistory,
          submissions: submissionsWithUser,
          projectActivity: projectActivityData.status === 'fulfilled' ? (projectActivityData.value || []) : [],
          allProjects: allProjectsData.status === 'fulfilled' ? (allProjectsData.value || []) : [],
          usageByUserId,
          aiCountByUserId,
          loading: false
        };

        console.log("📊 教師管理儀表板資料總覽:", {
          學生數量: finalData.students.length,
          專案數量: finalData.allProjects.length,
          任務數量: finalData.tasks.length,
          想法節點數量: finalData.nodes.length,
          反思記錄數量: finalData.reflections.length,
          聊天記錄數量: finalData.chatHistory.length
        });

        setRealData(finalData);

      } catch (error) {
        console.error("❌ 資料獲取失敗:", error);
        setRealData(prev => ({ ...prev, loading: false }));
      }
    };

    fetchRealData();
  }, [projectId, userRole]);

  // 獲取所有專案的成員資料
  useEffect(() => {
    if (realData.allProjects.length === 0 || realData.loading) return;

    const fetchAllProjectMembers = async () => {
      const memberPromises = realData.allProjects.map(async (project) => {
        try {
          const members = await getProjectUser(project.id);
          return { projectId: project.id, members: members || [] };
        } catch (error) {
          console.warn(`⚠️ 專案 ${project.id} 成員資料獲取失敗:`, error);
          return { projectId: project.id, members: [] };
        }
      });

      const allMembersData = await Promise.all(memberPromises);
      const membersMap = {};
      allMembersData.forEach(({ projectId, members }) => {
        membersMap[projectId] = members;
      });
      
      setAllProjectMembers(membersMap);
    };

    fetchAllProjectMembers();
  }, [realData.allProjects, realData.loading]);

  return { realData, allProjectMembers };
};
