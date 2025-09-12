import { useMemo } from "react";
import { formatRelativeTime } from "../utils";
import { calculateProgress } from "../utils";
import { is5RsFormat, extract5RsText, calculate5RsCompleteness } from "../../../utils/5RsUtils.js";

/**
 * 自定義 Hook 用於計算學生相關指標
 * @param {object} data - 從 useProjectData 獲取的數據
 * @param {string} userName - 用戶名
 * @param {string} projectId - 專案ID
 * @param {string} userId - 用戶ID
 * @returns {object} 包含所有計算後的指標
 */
export function useStudentMetrics(data, userName, projectId, userId) {
  // 為數據提供默認值，防止 undefined 錯誤
  const {
    teamAiInteractions = [],
    ideaNodes = [],
    kanbanTasks = [],
    personalReflections = [],
    teamReflections = [],
    teamMembers = [],
    chatHistory = [],
    aiInteractions = [],
    // 新命名的資料來源（優先使用），來自 rag_messages
    ragMessages = undefined,
    ragMessagesTeam = undefined,
    // 新增：跨組評論資料來源（假設提供）
    peerComments = [],
    projectActivities = [],
    projectInfo = null,
    submissions = [],
    usageSummary = null
  } = data || {};

  // 計算小組統計數據
  const teamStats = useMemo(() => {
    const projectIdStr = String(projectId || '');
    const teamAiInteractionsInProject = (Array.isArray(teamAiInteractions) ? teamAiInteractions : []).filter(a => {
        const pid = String(a?.projectId ?? a?.project_id ?? '');
        return pid && pid === projectIdStr;
    });

    return {
      // 1. 專案中所有成員對科學助手使用次數
      teamAiInteractions: teamAiInteractionsInProject.length,
      
      // 2. 想法節點數
      ideaNodes: ideaNodes.length,
      
      // 3. 看板卡片數
      kanbanTasks: kanbanTasks.length,
      
      // 4. 反思日誌(專案中個人)
      personalReflections: personalReflections.length,
      
      // 5. 反思日誌總計(團隊)
      teamReflections: teamReflections.length
    };
  }, [teamAiInteractions, ideaNodes, kanbanTasks, personalReflections, teamReflections, projectId]);

  // 學生個人資料（基於真實資料計算）
  const personalData = useMemo(() => {
    try {
      // 安全的篩選函數，避免在資料未載入時出錯
      const safeFilter = (arr, filterFn) => {
        if (!Array.isArray(arr)) return [];
        try {
          return arr.filter(filterFn);
        } catch (error) {
          console.error('篩選錯誤:', error);
          return [];
        }
      };

      // 安全獲取 Kanban 任務的列名
      const getAllColumnNames = () => {
        if (!Array.isArray(kanbanTasks) || kanbanTasks.length === 0) {
          return [];
        }
        try {
          return [...new Set(kanbanTasks.map(task => task?.columnName).filter(Boolean))];
        } catch (error) {
          console.error('獲取列名錯誤:', error);
          return [];
        }
      };

      // 安全計算任務狀態統計
      const getTasksByStatus = () => {
        try {
          const tasksByStatus = {};
          const allColumnNames = getAllColumnNames();
          
          allColumnNames.forEach(columnName => {
            tasksByStatus[columnName] = safeFilter(kanbanTasks, task => task?.columnName === columnName);
          });
          
          return tasksByStatus;
        } catch (error) {
          console.error('計算任務狀態錯誤:', error);
          return {};
        }
      };

      // 安全計算本週反思數
      const getWeeklyReflections = () => {
        try {
          return safeFilter(personalReflections, reflection => {
            if (!reflection?.createdAt) return false;
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            return new Date(reflection.createdAt) > oneWeekAgo;
          }).length;
        } catch (error) {
          console.error('計算週反思數錯誤:', error);
          return 0;
        }
      };

      // 安全計算聊天訊息數
      const getChatMessages = () => {
        try {
          return safeFilter(chatHistory, chat => chat?.author === userName).length;
        } catch (error) {
          console.error('計算聊天訊息數錯誤:', error);
          return 0;
        }
      };

      // 以 projectInfo 為主，避免依賴 localStorage
      const stage = Number(projectInfo?.currentStage) || 0;
      const subStage = Number(projectInfo?.currentSubStage) || 0;
      const progressPct = calculateProgress(stage, subStage);
      const projectIdStr = String(projectId || '');

      // 計算最後活動時間（多來源取最大值）
      const timestamps = [];
      const pushTime = (t) => { if (t) timestamps.push(new Date(t).getTime()); };
      (Array.isArray(personalReflections) ? personalReflections : []).forEach(r => pushTime(r?.updatedAt || r?.createdAt));
      (Array.isArray(kanbanTasks) ? kanbanTasks : []).forEach(t => pushTime(t?.updatedAt || t?.createdAt));
      (Array.isArray(chatHistory) ? chatHistory : []).forEach(m => pushTime(m?.createdAt));
      (Array.isArray(aiInteractions) ? aiInteractions : []).forEach(a => {
        const pid = String(a?.projectId ?? a?.project_id ?? '');
        if (pid && pid === projectIdStr) pushTime(a?.createdAt);
      });
      (Array.isArray(projectActivities) ? projectActivities : []).forEach(a => pushTime(a?.createdAt));
      (Array.isArray(ideaNodes) ? ideaNodes : []).forEach(n => pushTime(n?.createdAt));
      const lastActivityTs = timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : null;

      // QA 問題數：以聊天歷史中屬於自己的訊息數為估計（同專案）
      const qaCount = getChatMessages();

      // 篩選出屬於當前專案的個人 AI 互動
      const personalAiInteractionsInProject = safeFilter(aiInteractions, a => {
        const pid = String(a?.projectId ?? a?.project_id ?? '');
        return pid && pid === projectIdStr;
      });

      // 依活動紀錄近似估算學習時長與平均每次
      const normalizeId = (x) => (x == null ? null : String(x));
      const meId = normalizeId(userId);
      const meName = userName || '';
      const eventTimes = [];
      const pushEvent = (t) => { if (t) eventTimes.push(new Date(t).getTime()); };

      // 反思
      (Array.isArray(personalReflections) ? personalReflections : []).forEach(r => {
        const uid = normalizeId(r?.userId ?? r?.user_id ?? r?.authorId);
        const uname = r?.userName ?? r?.username ?? r?.author ?? '';
        if ((uid && uid === meId) || (uname && uname === meName)) pushEvent(r?.createdAt);
      });
      // 任務（自己指派或自己建立）
      (Array.isArray(kanbanTasks) ? kanbanTasks : []).forEach(t => {
        const assigned = Array.isArray(t?.assignees) && t.assignees.some((a) => {
          if (a == null) return false;
          if (typeof a === 'string') return a === meName || a === meId;
          if (typeof a === 'number') return String(a) === meId;
          return String(a.id ?? a.userId ?? '') === meId || (a.username ?? a.name ?? a.userName ?? '') === meName;
        });
        const createdBy = t?.userId === userId || t?.user_id === userId || t?.owner === meName || t?.created_by === meName;
        if (assigned || createdBy) {
          pushEvent(t?.createdAt);
          pushEvent(t?.updatedAt);
        }
      });
      // 聊天
      (Array.isArray(chatHistory) ? chatHistory : []).forEach(c => {
        const uid = normalizeId(c?.userId ?? c?.user_id);
        const uname = c?.author ?? c?.username ?? c?.user_name ?? '';
        if ((uid && uid === meId) || (uname && uname === meName)) pushEvent(c?.createdAt);
      });
      // AI 互動
      (Array.isArray(personalAiInteractionsInProject) ? personalAiInteractionsInProject : []).forEach(a => {
        const uid = normalizeId(a?.userId ?? a?.uid);
        const uname = a?.userName ?? a?.username ?? a?.author ?? '';
        if (((uid && uid === meId) || (uname && uname === meName))) {
          pushEvent(a?.createdAt);
        }
      });
      // 專案活動
      (Array.isArray(projectActivities) ? projectActivities : []).forEach(a => {
        const uname = a?.changedBy ?? a?.user ?? '';
        const uid = normalizeId(a?.userId ?? a?.user_id);
        if ((uid && uid === meId) || (uname && uname === meName)) pushEvent(a?.createdAt);
      });
      // 想法節點
      (Array.isArray(ideaNodes) ? ideaNodes : []).forEach(n => {
        const uid = normalizeId(n?.ownerId ?? n?.userId ?? n?.user_id);
        const uname = n?.owner ?? n?.username ?? n?.user_name ?? '';
        if ((uid && uid === meId) || (uname && uname === meName)) pushEvent(n?.createdAt);
      });
      // 歷程檔案提交
      (Array.isArray(data?.submissions) ? data.submissions : []).forEach(s => {
        const uid = normalizeId(s?.userId ?? s?.user_id);
        if (uid && uid === meId) pushEvent(s?.createdAt);
      });

      // Session 化計算
      eventTimes.sort((a, b) => a - b);
      const INACTIVITY_GAP_MS = 45 * 60 * 1000; // 45 分鐘
      const MIN_SESSION_MS = 10 * 60 * 1000;   // 至少 10 分鐘
      const MAX_SESSION_MS = 4 * 60 * 60 * 1000; // 最多 4 小時
      const sessions = [];
      let startAt = null, lastAt = null;
      for (const t of eventTimes) {
        if (startAt === null) { startAt = t; lastAt = t; continue; }
        if (t - lastAt > INACTIVITY_GAP_MS) {
          const raw = lastAt - startAt;
          sessions.push(Math.max(MIN_SESSION_MS, Math.min(MAX_SESSION_MS, raw)));
          startAt = t; lastAt = t;
        } else {
          lastAt = t;
        }
      }
      if (startAt !== null) {
        const raw = lastAt - startAt;
        sessions.push(Math.max(MIN_SESSION_MS, Math.min(MAX_SESSION_MS, raw)));
      }
      // 近似值
      const totalHoursApprox = sessions.length ? (sessions.reduce((s, d) => s + d, 0) / 3600000) : 0;
      const avgHoursApprox = sessions.length ? (totalHoursApprox / sessions.length) : 0;
      let totalStudyTime = Number(totalHoursApprox.toFixed(1));
      let averageSessionTime = Number(avgHoursApprox.toFixed(1));

      // 若後端有精準統計，優先使用
      if (usageSummary && typeof usageSummary.totalSeconds === 'number') {
        const th = usageSummary.totalSeconds / 3600;
        totalStudyTime = Number(th.toFixed(1));
      }
      if (usageSummary && typeof usageSummary.averageSeconds === 'number' && usageSummary.sessionCount > 0) {
        const ah = usageSummary.averageSeconds / 3600;
        averageSessionTime = Number(ah.toFixed(1));
      }

      return {
        id: 1,
        name: userName || "學習者",
        projectId: projectId || '',
        projectName: projectInfo?.name || "",
        currentStage: stage,
        currentSubStage: subStage,
        progressPercentage: progressPct,
        lastActivity: lastActivityTs,
        weeklyReflections: getWeeklyReflections(),
        ideaNodes: Array.isArray(ideaNodes) ? ideaNodes.length : 0,
        status: "active",
        teamRole: "組員",
        chatMessages: getChatMessages(),
        qaQuestions: qaCount,
        aiInteractions: personalAiInteractionsInProject.length,
        totalStudyTime,
        averageSessionTime,
        
        // 動態任務統計 - 基於真實的Kanban列表
        tasksByStatus: getTasksByStatus(),
        allColumnNames: getAllColumnNames(),
        
        completedTasks: safeFilter(kanbanTasks, task => {
          const status = (task?.status || task?.columnName || '').toLowerCase();
          return status.includes('完成') || status.includes('done') || 
                 status.includes('完畢') || status.includes('finished') ||
                 status.includes('completed') || status === '完成';
        }).length,
        
        pendingTasks: safeFilter(kanbanTasks, task => {
          const status = (task?.status || task?.columnName || '').toLowerCase();
          return !(status.includes('完成') || status.includes('done') || 
                   status.includes('完畢') || status.includes('finished') ||
                   status.includes('completed') || status === '完成');
        }).length,
        
        totalTasks: Array.isArray(kanbanTasks) ? kanbanTasks.length : 0
      };
    } catch (error) {
      console.error('個人資料計算錯誤:', error);
      return {
        id: 1,
        name: userName || "學習者",
        projectId: projectId || '',
        projectName: projectInfo?.name || "",
        currentStage: Number(projectInfo?.currentStage) || 0,
        currentSubStage: Number(projectInfo?.currentSubStage) || 0,
        progressPercentage: 0,
        lastActivity: null,
        weeklyReflections: 0,
        ideaNodes: 0,
        status: "active",
        teamRole: "組員",
        chatMessages: 0,
        qaQuestions: 0,
        aiInteractions: 0,
        totalStudyTime: null,
        averageSessionTime: null,
        tasksByStatus: {},
        allColumnNames: [],
        completedTasks: 0,
        pendingTasks: 0,
        totalTasks: 0
      };
    }
  }, [kanbanTasks, personalReflections, ideaNodes, chatHistory, aiInteractions, userName, projectInfo?.name, projectId]);

  // 學習軌跡資料（基於真實資料）
  const learningTrack = useMemo(() => {
    try {
      const activities = [];
      
      // 安全處理反思活動 - 顯示具體標題和內容摘要
      if (Array.isArray(personalReflections) && personalReflections.length > 0) {
        personalReflections.slice(0, 10).forEach(reflection => {
          if (!reflection || !reflection.createdAt) return;
          
          // 產生內容預覽：若為 5Rs JSON，提取純文字而非原始物件字串
          let contentPreview = '無內容預覽';
          if (typeof reflection.content === 'string' && reflection.content.trim()) {
            try {
              if (is5RsFormat(reflection.content)) {
                const plain = extract5RsText(reflection.content) || '';
                const preview = plain.length > 50 ? (plain.substring(0, 50) + '...') : (plain || '');
                const comp = calculate5RsCompleteness(reflection.content);
                contentPreview = `5Rs 反思（完成度 ${comp.completed}/${comp.total}）- ${preview || '（尚無可顯示內容）'}`;
              } else {
                contentPreview = reflection.content.length > 50
                  ? reflection.content.substring(0, 50) + '...'
                  : reflection.content;
              }
            } catch (_) {
              // 後備：直接截斷原字串
              contentPreview = reflection.content.length > 50
                ? reflection.content.substring(0, 50) + '...'
                : reflection.content;
            }
          }
          
          activities.push({
            date: new Date(reflection.createdAt).toISOString().split('T')[0],
            time: new Date(reflection.createdAt).toLocaleTimeString('zh-TW', { 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            action: `提交學習反思`,
            detail: `標題：${reflection.title || '無標題'} - ${contentPreview}`,
            author: reflection.userName || userName || '匿名',
            type: 'reflection',
            createdAt: reflection.createdAt
          });
        });
      }

      // 安全處理想法節點活動 - 顯示節點標題和內容
      if (Array.isArray(ideaNodes) && ideaNodes.length > 0) {
        ideaNodes.slice(0, 10).forEach(node => {
          if (!node || !node.createdAt) return;
          
          const contentPreview = node.content ? 
            (node.content.length > 40 ? 
              node.content.substring(0, 40) + '...' : 
              node.content) : '無內容描述';
          
          activities.push({
            date: new Date(node.createdAt).toISOString().split('T')[0],
            time: new Date(node.createdAt).toLocaleTimeString('zh-TW', { 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            action: `創建想法節點`,
            detail: `「${node.title || '無標題'}」 - ${contentPreview}`,
            author: node.owner || node.username || node.user_name || '匿名',
            type: 'idea',
            createdAt: node.createdAt
          });
        });
      }

      // 安全處理任務活動 - 顯示任務創建和更新
      if (Array.isArray(kanbanTasks) && kanbanTasks.length > 0) {
        kanbanTasks.slice(0, 8).forEach(task => {
          if (!task || !(task.updatedAt || task.createdAt)) return;
          
          const isOwner = task.owner === userName;
          const isAssignee = task.assignees?.includes(userName);
          
          if (isOwner || isAssignee) {
            const taskPreview = task.content ? 
              (task.content.length > 45 ? 
                task.content.substring(0, 45) + '...' : 
                task.content) : '無任務描述';
            
            const actionType = isOwner ? '創建任務' : '參與任務';
            
            activities.push({
              date: new Date(task.updatedAt || task.createdAt).toISOString().split('T')[0],
              time: new Date(task.updatedAt || task.createdAt).toLocaleTimeString('zh-TW', { 
                hour: '2-digit', 
                minute: '2-digit' 
              }),
              action: actionType,
              detail: `「${task.title || '無標題'}」 - ${taskPreview} (狀態: ${task.status || '未知'})`,
              author: task.owner || '未知',
              type: 'task',
              createdAt: task.updatedAt || task.createdAt
            });
          }
        });
      }

      // 安全處理聊天活動 - 顯示聊天內容摘要
      if (Array.isArray(chatHistory) && chatHistory.length > 0) {
        chatHistory
          .filter(chat => chat && chat.author === userName && chat.createdAt)
          .slice(0, 8)
          .forEach(chat => {
            const messagePreview = chat.message ? 
              (chat.message.length > 35 ? 
                chat.message.substring(0, 35) + '...' : 
                chat.message) : '發送了一則訊息';
            
            activities.push({
              date: new Date(chat.createdAt).toISOString().split('T')[0],
              time: new Date(chat.createdAt).toLocaleTimeString('zh-TW', { 
                hour: '2-digit', 
                minute: '2-digit' 
              }),
              action: `參與小組討論`,
              detail: `「${messagePreview}」`,
              author: chat.author,
              type: 'chat',
              createdAt: chat.createdAt
            });
          });
      }

      // 安全處理 AI 互動活動 - 顯示問題內容
      if (Array.isArray(aiInteractions) && aiInteractions.length > 0) {
        aiInteractions
          .filter(interaction => {
            if (!interaction || !interaction.createdAt) return false;
            const pid = String(interaction?.projectId ?? interaction?.project_id ?? '');
            return pid && pid === String(projectId);
          })
          .slice(0, 8)
          .forEach(interaction => {
            if (!interaction || !interaction.createdAt) return;
          
            const questionPreview = interaction.input_message ? 
              (interaction.input_message.length > 40 ? 
                interaction.input_message.substring(0, 40) + '...' : 
                interaction.input_message) : '向AI助手提問';
          
            activities.push({
              date: new Date(interaction.createdAt).toISOString().split('T')[0],
              time: new Date(interaction.createdAt).toLocaleTimeString('zh-TW', { 
                hour: '2-digit', 
                minute: '2-digit' 
              }),
              action: `諮詢AI助手`,
              detail: `問題：「${questionPreview}」`,
              author: interaction.userName || userName || '匿名',
              type: 'ai',
              createdAt: interaction.createdAt
            });
          });
      }

      // 安全處理專案活動記錄 - 顯示具體變更
      if (Array.isArray(projectActivities) && projectActivities.length > 0) {
        projectActivities.slice(0, 5).forEach(activity => {
          if (!activity || !activity.createdAt) return;
          
          let actionDetail = '執行了專案操作';
          
          if (activity.changeType) {
            switch (activity.changeType) {
              case 'CREATE':
                actionDetail = `創建了「${activity.task?.title || '新項目'}」`;
                break;
              case 'UPDATE':
                actionDetail = `更新了「${activity.task?.title || '項目'}」`;
                break;
              case 'DELETE':
                actionDetail = `刪除了「${activity.task?.title || '項目'}」`;
                break;
              case 'MOVE':
                actionDetail = `移動了「${activity.task?.title || '項目'}」`;
                break;
              default:
                actionDetail = activity.description || activity.action || '執行了操作';
            }
          }
          
          activities.push({
            date: new Date(activity.createdAt).toISOString().split('T')[0],
            time: new Date(activity.createdAt).toLocaleTimeString('zh-TW', { 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            action: `專案變更`,
            detail: actionDetail,
            author: activity.changedBy || activity.user || '系統',
            type: 'progress',
            createdAt: activity.createdAt
          });
        });
      }

      // 如果沒有任何活動，提供預設的空狀態
      if (activities.length === 0) {
        return [{
          date: new Date().toISOString().split('T')[0],
          activities: [{
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('zh-TW', { 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            action: '歡迎加入專案',
            detail: '開始您的學習旅程！快建立您的第一個想法或反思吧。',
            author: '系統',
            type: 'welcome',
            createdAt: new Date().toISOString()
          }]
        }];
      }

      // 按時間排序並分組
      const sortedActivities = activities
        .filter(activity => activity && activity.createdAt) // 確保有時間戳且不為空
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 25); // 增加顯示數量

      // 如果過濾後沒有活動，返回空狀態
      if (sortedActivities.length === 0) {
        return [{
          date: new Date().toISOString().split('T')[0],
          activities: [{
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('zh-TW', { 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            action: '歡迎加入專案',
            detail: '開始您的學習旅程！快建立您的第一個想法或反思吧。',
            author: '系統',
            type: 'welcome',
            createdAt: new Date().toISOString()
          }]
        }];
      }

      // 按日期分組
      const groupedByDate = {};
      sortedActivities.forEach(activity => {
        if (activity && activity.date) {
          if (!groupedByDate[activity.date]) {
            groupedByDate[activity.date] = [];
          }
          groupedByDate[activity.date].push(activity);
        }
      });

      // 轉換為陣列格式
      const result = Object.keys(groupedByDate)
        .sort((a, b) => new Date(b) - new Date(a))
        .slice(0, 7) // 顯示最近7天
        .map(date => ({
          date,
          activities: groupedByDate[date] || []
        }));

      return result.length > 0 ? result : [{
        date: new Date().toISOString().split('T')[0],
        activities: [{
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString('zh-TW', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          action: '歡迎加入專案',
          detail: '開始您的學習旅程！快建立您的第一個想法或反思吧。',
          author: '系統',
          type: 'welcome',
          createdAt: new Date().toISOString()
        }]
      }];
      
    } catch (error) {
      console.error('學習軌跡處理錯誤:', error);
      return [{
        date: new Date().toISOString().split('T')[0],
        activities: [{
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString('zh-TW', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          action: '載入中',
          detail: '正在載入學習活動...',
          author: '系統',
          type: 'loading',
          createdAt: new Date().toISOString()
        }]
      }];
    }
  }, [personalReflections, ideaNodes, kanbanTasks, chatHistory, aiInteractions, projectActivities, userName]);

  // 團隊成員資料（基於真實資料）
  const teammates = useMemo(() => {
    if (!Array.isArray(teamMembers) || !userId) return [];

    const normalized = (v) => (v == null ? '' : String(v));

    return teamMembers
      .filter(member => member && member.id && String(member.id) !== String(userId))
      .map(member => {
        const name = member.username || member.name || "匿名成員";
        const mid = member.id;
        const stage = Number(member.currentStage) || 0;
        const subStage = Number(member.currentSubStage) || 0;
        const progress = calculateProgress(stage, subStage);

        // 收集該成員最近活動
        const times = [];
        const push = (t) => { if (t) times.push(new Date(t).getTime()); };

        (Array.isArray(kanbanTasks) ? kanbanTasks : []).forEach(t => {
          const assigned = Array.isArray(t?.assignees) && t.assignees.some(a => {
            if (a == null) return false;
            if (typeof a === 'string') return a === normalized(name);
            if (typeof a === 'number') return String(a) === String(mid);
            return String(a.id ?? a.userId ?? '') === String(mid) || (a.username ?? a.name ?? a.userName ?? '') === name;
          });
          const createdBy = t?.userId === mid || t?.user_id === mid || t?.owner === name || t?.created_by === name;
          if (assigned || createdBy) push(t?.updatedAt || t?.createdAt);
        });
        (Array.isArray(personalReflections) ? personalReflections : []).forEach(r => {
          if (r?.userId === mid || r?.user_id === mid || r?.userName === name) push(r?.createdAt);
        });
        (Array.isArray(ideaNodes) ? ideaNodes : []).forEach(n => {
          if (n?.userId === mid || n?.user_id === mid || n?.owner === name || n?.username === name) push(n?.createdAt);
        });
        (Array.isArray(chatHistory) ? chatHistory : []).forEach(c => {
          if (c?.userId === mid || c?.user_id === mid || c?.author === name || c?.username === name) push(c?.createdAt);
        });

        const lastTs = times.length ? new Date(Math.max(...times)) : null;
        const lastSeen = lastTs ? formatRelativeTime(lastTs.toISOString()) : '無活動';

        let status = 'inactive';
        if (progress >= 80) status = 'excellent';
        else if (progress >= 50) status = 'active';
        else status = 'attention';

        return {
          name,
          role: member.role || "研究員",
          progress,
          status,
          lastSeen
        };
      });
  }, [teamMembers, userId, kanbanTasks, personalReflections, ideaNodes, chatHistory]);

  // 學習目標（基於真實資料和預設目標）
  const learningGoals = useMemo(() => {
    const normalizeId = (x) => (x == null ? null : String(x));
    const meId = normalizeId(userId);
    const meName = userName || '';
    const currentStage = Number(projectInfo?.currentStage) || 0;
    const currentSubStage = Number(projectInfo?.currentSubStage) || 0;

    const assigneesIncludesMe = (assignees) => {
      if (!Array.isArray(assignees)) return false;
      return assignees.some((a) => {
        if (a == null) return false;
        if (typeof a === 'string') return a === meName || a === meId;
        if (typeof a === 'number') return String(a) === meId;
        return String(a.id ?? a.userId ?? '') === meId || (a.username ?? a.name ?? a.userName ?? '') === meName;
      });
    };

    // Counts
    const personalIdeaCount = Array.isArray(ideaNodes)
      ? ideaNodes.filter((n) => {
          const owner = n?.owner ?? n?.username ?? n?.user_name ?? '';
          const ownerId = normalizeId(n?.ownerId ?? n?.userId);
          return owner === meName || (ownerId && ownerId === meId);
        }).length
      : 0;

    const tasksAssignedToMe = Array.isArray(kanbanTasks)
      ? kanbanTasks.filter((t) => assigneesIncludesMe(t?.assignees))
      : [];
    const tasksCompletedByMe = tasksAssignedToMe.filter((t) => {
      const s = (t?.status || t?.columnName || '').toLowerCase();
      return (
        s.includes('完成') || s.includes('done') || s.includes('完畢') || s.includes('finished') || s.includes('completed') || s === '完成'
      );
    }).length;

    const personalReflList = Array.isArray(personalReflections)
      ? personalReflections.filter((r) => {
          const author = r?.userName ?? r?.author ?? r?.username ?? '';
          const authorId = normalizeId(r?.userId ?? r?.authorId);
          return author === meName || (authorId && authorId === meId);
        })
      : [];
    const personalReflCount = personalReflList.length;

    const personalSubmissionsCount = Array.isArray(submissions)
      ? submissions.filter((s) => normalizeId(s?.userId ?? s?.user_id) === meId).length
      : 0;

    const projectIdStr = String(projectId);
    const personalRag = Array.isArray(ragMessages) ? ragMessages : (Array.isArray(aiInteractions) ? aiInteractions : []);
    const personalAiCount = personalRag.filter((it) => {
      const pid = normalizeId(it?.projectId ?? it?.project_id);
      const uid = normalizeId(it?.userId ?? it?.uid);
      const uname = it?.userName ?? it?.username ?? it?.author ?? '';
      // 必須嚴格匹配專案 ID
      return pid === projectIdStr && ((uid && uid === meId) || (uname && uname === meName));
    }).length;

    const personalChatCount = Array.isArray(chatHistory)
      ? chatHistory.filter((c) => c?.author === meName || normalizeId(c?.userId ?? c?.user_id) === meId).length
      : 0;

    const myCommentsCount = Array.isArray(data?.projectComments)
      ? data.projectComments.filter((c) => {
          const uid = normalizeId(c?.user?.id ?? c?.userId);
          const uname = c?.user?.username ?? c?.username ?? c?.author ?? '';
          return (uid && uid === meId) || (uname && uname === meName);
        }).length
      : 0;

    // Activity streak (last 7 days with any activity)
    const days = new Set();
    const pushDay = (d) => { if (!d) return; const dt = new Date(d); days.add(dt.toISOString().split('T')[0]); };
    personalReflList.forEach((r) => pushDay(r?.createdAt));
    tasksAssignedToMe.forEach((t) => pushDay(t?.updatedAt || t?.createdAt));
    (Array.isArray(ideaNodes) ? ideaNodes : []).forEach((n) => {
      const owner = n?.owner ?? n?.username ?? n?.user_name ?? '';
      const ownerId = normalizeId(n?.ownerId ?? n?.userId);
      if (owner === meName || (ownerId && ownerId === meId)) pushDay(n?.createdAt);
    });
    (Array.isArray(chatHistory) ? chatHistory : []).forEach((c) => {
      if (c?.author === meName || normalizeId(c?.userId ?? c?.user_id) === meId) pushDay(c?.createdAt);
    });
    personalRag.forEach((a) => {
      const uid = normalizeId(a?.userId ?? a?.uid);
      const uname = a?.userName ?? a?.username ?? a?.author ?? '';
      if ((uid && uid === meId) || (uname && uname === meName)) pushDay(a?.createdAt);
    });
    const last7 = Array.from(days).filter((d) => {
      const dt = new Date(d);
      const now = new Date();
      return (now - dt) / (1000 * 60 * 60 * 24) <= 7;
    }).length;

    // Goal from goal/milestone tasks completed by me
    const isGoalTask = (t) => {
      const title = (t?.title || '').toLowerCase();
      const column = (t?.columnName || t?.status || '').toLowerCase();
      return (
        title.includes('goal') || title.includes('目標') || title.includes('milestone') ||
        column.includes('目標') || column.includes('milestone')
      );
    };
    const goalTasksAssignedToMe = tasksAssignedToMe.filter(isGoalTask);
    const goalTasksDoneByMe = goalTasksAssignedToMe.filter((t) => {
      const s = (t?.status || t?.columnName || '').toLowerCase();
      return s.includes('done') || s.includes('完成') || s.includes('finished') || s.includes('completed');
    }).length;

    // Next substage progress target
    const currentPct = calculateProgress(currentStage, currentSubStage);
    const nextTarget = currentSubStage >= 3
      ? calculateProgress(currentStage + 1, 1)
      : calculateProgress(currentStage, currentSubStage + 1);
    const denom = Math.max(1, nextTarget);
    const towardNextPct = Math.min(100, Math.round((currentPct / denom) * 100));

    // Build 10 goals with progress 0-100
    const make = (id, title, current, target, priority = 'medium') => ({
      id, title, current, target, progress: Math.max(0, Math.min(100, Math.round((current / Math.max(1, target)) * 100))), priority
    });

    const goals = [
      make('g1', '發表想法節點 5 個', personalIdeaCount, 5, 'medium'),
      make('g2', '完成指派任務 3 個', tasksCompletedByMe, 3, 'high'),
      make('g3', '撰寫個人反思 3 篇', personalReflCount, 3, 'high'),
      make('g4', '上傳歷程檔案 2 份', personalSubmissionsCount, 2, 'medium'),
      make('g5', '使用科學助手 5 次', personalAiCount, 5, 'medium'),
      make('g6', '參與小組討論 5 則', personalChatCount, 5, 'low'),
      make('g7', '給予同儕評論 3 則', myCommentsCount, 3, 'medium'),
      make('g8', '連續 5 天有學習活動', last7, 5, 'medium'),
      make('g9', '完成 2 張學習目標卡', goalTasksDoneByMe, 2, 'high'),
      { id: 'g10', title: '達成下一個階段里程碑', current: currentPct, target: nextTarget, progress: towardNextPct, priority: 'high' }
    ];

    return goals;
  }, [
    ideaNodes,
    kanbanTasks,
    personalReflections,
    submissions,
    aiInteractions,
    ragMessages,
    chatHistory,
    data?.projectComments,
    projectInfo?.currentStage,
    projectInfo?.currentSubStage,
    userId,
    userName,
    projectId
  ]);

  // 近期成就（基於真實資料，分級：銅/銀/金） - 團隊與個人雙軌
  const achievements = useMemo(() => {
    // Helpers
    const thresholds = {
      idea: { bronze: 5, silver: 15, gold: 30 },
      task: { bronze: 5, silver: 15, gold: 30 },
      reflection: { bronze: 1, silver: 5, gold: 10 },
      ai: { bronze: 10, silver: 30, gold: 60 },
      peer_review: { bronze: 3, silver: 10, gold: 25 },
    };

    const levelFor = (count, t) => {
      if (count >= t.gold) return 'gold';
      if (count >= t.silver) return 'silver';
      if (count >= t.bronze) return 'bronze';
      return 'none';
    };

    const nextFor = (count, t) => {
      if (count < t.bronze) return { nextLevel: 'bronze', nextTarget: t.bronze };
      if (count < t.silver) return { nextLevel: 'silver', nextTarget: t.silver };
      if (count < t.gold) return { nextLevel: 'gold', nextTarget: t.gold };
      return { nextLevel: null, nextTarget: t.gold };
    };

    const makeAchievement = (key, title, type, count, t) => {
      const level = levelFor(count, t);
      const { nextLevel, nextTarget } = nextFor(count, t);
      const progressPercent = Math.min(100, Math.round((count / t.gold) * 100));
      return {
        key,
        title,
        type,
        level,
        current: count,
        thresholds: t,
        nextLevel,
        nextTarget,
        progressPercent,
        description:
          type === 'idea'
            ? `已建立 ${count}/${t.gold} 個想法節點`
            : type === 'task'
            ? `已參與 ${count}/${t.gold} 個任務`
            : type === 'reflection'
            ? `已撰寫 ${count}/${t.gold} 篇反思日誌`
            : type === 'ai'
            ? `已進行 ${count}/${t.gold} 次 AI 互動`
            : `已收到 ${count}/${t.gold} 則跨組評論`,
      };
    };

    // Status helpers
    const isTaskDone = (status) => {
      const s = (status || '').toString().toLowerCase();
      return (
        s.includes('完成') ||
        s.includes('done') ||
        s.includes('完畢') ||
        s.includes('finished') ||
        s.includes('completed') ||
        s === '完成'
      );
    };

    const normalizeId = (x) => (x == null ? null : String(x));
    const meId = normalizeId(userId);
    const meName = userName || '';

    const assigneesIncludesMe = (assignees) => {
      if (!Array.isArray(assignees)) return false;
      return assignees.some((a) => {
        if (a == null) return false;
        if (typeof a === 'string') {
          return a === meName || a === meId;
        }
        if (typeof a === 'number') {
          return String(a) === meId;
        }
        // object
        return (
          String(a.id ?? a.userId ?? '') === meId ||
          (a.username ?? a.name ?? a.userName ?? '') === meName
        );
      });
    };

    // Data sources
    const reflectionLogsTeam = Array.isArray(data?.reflectionLogs)
      ? data.reflectionLogs
      : Array.isArray(personalReflections)
        ? personalReflections
        : [];

    // Team counts
    const teamIdeaCount = Array.isArray(ideaNodes) ? ideaNodes.length : 0;
    // 任務執行家（團隊）：計算專案內所有任務總數
    const teamTaskCount = Array.isArray(kanbanTasks) ? kanbanTasks.length : 0;
    const teamReflectionCount = reflectionLogsTeam.length;

    // AI interactions - scoped by project
    const normalizeProjectId = (pid) => (pid == null ? null : String(pid));
    const currentProjectId = normalizeProjectId(projectId);
    const personalRag = Array.isArray(ragMessages) ? ragMessages : (Array.isArray(aiInteractions) ? aiInteractions : []);
    const teamRag = Array.isArray(ragMessagesTeam) ? ragMessagesTeam : (Array.isArray(teamAiInteractions) ? teamAiInteractions : []);

    const projectAiInteractionsTeam = teamRag.filter((it) => normalizeProjectId(it?.projectId ?? it?.project_id) === currentProjectId);
    const teamAiCount = projectAiInteractionsTeam.length;

    // Personal counts
    const personalIdeaCount = Array.isArray(ideaNodes)
      ? ideaNodes.filter((n) => {
          const owner = n?.owner ?? n?.username ?? n?.user_name ?? '';
          const ownerId = normalizeId(n?.ownerId ?? n?.userId);
          return owner === meName || (ownerId && ownerId === meId);
        }).length
      : 0;

    // 任務執行家（個人）：計算所有指派給該學生的任務總數
    const personalTaskCount = Array.isArray(kanbanTasks)
      ? kanbanTasks.filter((t) => assigneesIncludesMe(t?.assignees)).length
      : 0;

    const personalReflectionsList = Array.isArray(personalReflections)
      ? personalReflections.filter((r) => {
          const author = r?.userName ?? r?.author ?? r?.username ?? '';
          const authorId = normalizeId(r?.userId ?? r?.authorId);
          return author === meName || (authorId && authorId === meId);
        })
      : [];
    const personalReflectionCount = personalReflectionsList.length;

    const projectAiInteractionsPersonal = personalRag.filter((it) => normalizeProjectId(it?.projectId ?? it?.project_id) === currentProjectId);
    const personalAiCount = projectAiInteractionsPersonal.filter((it) => {
      const uid = normalizeId(it?.userId ?? it?.uid);
      const uname = it?.userName ?? it?.username ?? it?.author ?? '';
      return (uid && uid === meId) || (uname && uname === meName);
    }).length;

    // 人氣專案（團隊）：計算收到的外部（跨組）評論數
    const projectPeerComments = Array.isArray(peerComments) ? peerComments : [];
    // 若有評論者所屬專案ID，優先以專案ID判斷；否則排除本專案成員即視為跨組評論
    const teamMemberIdSet = new Set(
      (Array.isArray(teamMembers) ? teamMembers : []).map((m) => String(m?.id ?? ''))
    );

    const teamPeerReviewCount = projectPeerComments.filter((c) => {
      const commenterPid = normalizeProjectId(c?.commenterProjectId ?? c?.commenter_project_id);
      if (commenterPid != null) {
        return commenterPid !== currentProjectId;
      }
      const commenterId = c?.user?.id ?? c?.userId;
      return commenterId != null && !teamMemberIdSet.has(String(commenterId));
    }).length;

    // Build results
    const team = [
      makeAchievement('idea_creator_team', '想法創造者', 'idea', teamIdeaCount, thresholds.idea),
      makeAchievement('task_master_team', '任務執行家', 'task', teamTaskCount, thresholds.task),
      makeAchievement('reflective_thinker_team', '深度反思者', 'reflection', teamReflectionCount, thresholds.reflection),
      makeAchievement('ai_explorer_team', 'AI 探險家', 'ai', teamAiCount, thresholds.ai),
      makeAchievement('peer_review_team', '人氣專案', 'peer_review', teamPeerReviewCount, thresholds.peer_review),
    ];

    const personal = [
      makeAchievement('idea_creator_personal', '想法創造者', 'idea', personalIdeaCount, thresholds.idea),
      makeAchievement('task_master_personal', '任務執行家', 'task', personalTaskCount, thresholds.task),
      makeAchievement('reflective_thinker_personal', '深度反思者', 'reflection', personalReflectionCount, thresholds.reflection),
      makeAchievement('ai_explorer_personal', 'AI 探險家', 'ai', personalAiCount, thresholds.ai),
    ];

    return { team, personal };
  }, [
    data?.reflectionLogs,
    personalReflections,
    ideaNodes,
    kanbanTasks,
    aiInteractions,
    teamAiInteractions,
    ragMessages,
    ragMessagesTeam,
    peerComments,
    userId,
    userName,
    projectId,
  ]);

  return {
    teamStats,
    personalData,
    learningTrack,
    teammates,
    learningGoals,
    achievements
  };
}
