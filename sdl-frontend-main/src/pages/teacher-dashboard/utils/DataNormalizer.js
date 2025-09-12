import {
  normalizeUserData,
  normalizeTimestamp,
  normalizeTaskData,
  normalizeNodeData,
  normalizeChatMessage,
  normalizeReflectionData,
  normalizeSubmissionData,
  normalizeDataArray,
  createUserLookup,
  enhanceWithUserInfo
} from './dataUtils';

/**
 * 統一的資料正規化處理器
 * 負責將所有 API 回應標準化為一致的格式
 */
export class DataNormalizer {
  constructor() {
    this.userLookup = {};
  }

  /**
   * 設定使用者對照表
   */
  setUserLookup(students) {
    this.userLookup = createUserLookup(students);
  }

  /**
   * 正規化看板欄位和任務資料
   */
  normalizeKanbanData(columnData) {
    if (!Array.isArray(columnData)) return { tasks: [], columns: [] };

    let allTasks = [];
    const columns = [];

    columnData.forEach(column => {
      // 正規化欄位資料
      const normalizedColumn = {
        id: column.id,
        title: column.title || column.name,
        name: column.title || column.name
      };
      columns.push(normalizedColumn);

      // 處理該欄位的任務
      const tasks = column.kanban_tasks || column.task || [];
      if (Array.isArray(tasks)) {
        const normalizedTasks = tasks.map(task => 
          normalizeTaskData(task, normalizedColumn)
        );
        allTasks.push(...normalizedTasks);
      }
    });

    // 按欄位ID排序
    allTasks.sort((a, b) => (a.columnId || 0) - (b.columnId || 0));

    return { tasks: allTasks, columns };
  }

  /**
   * 正規化想法牆和節點資料
   */
  normalizeIdeaWallData(nodesData, relationsData = []) {
    const nodes = normalizeDataArray(nodesData, normalizeNodeData);
    const relations = normalizeDataArray(relationsData, normalizeTimestamp);

    return { nodes, relations };
  }

  /**
   * 正規化學生資料
   */
  normalizeStudentData(studentsData) {
    const students = normalizeDataArray(studentsData, normalizeUserData);
    this.setUserLookup(students);
    return students;
  }

  /**
   * 正規化反思記錄
   */
  normalizeReflections(reflectionsData) {
    const reflections = normalizeDataArray(reflectionsData, normalizeReflectionData);
    return enhanceWithUserInfo(reflections, this.userLookup);
  }

  /**
   * 正規化聊天室和聊天記錄
   */
  normalizeChatData(chatroomsData, chatHistoryMap = {}) {
    const chatrooms = normalizeDataArray(chatroomsData, normalizeUserData);
    
    let allChatHistory = [];
    chatrooms.forEach(chatroom => {
      const history = chatHistoryMap[chatroom.id] || [];
      const normalizedHistory = history.map(message => 
        normalizeChatMessage(message, chatroom)
      );
      allChatHistory.push(...normalizedHistory);
    });

    return { 
      chatrooms, 
      chatHistory: enhanceWithUserInfo(allChatHistory, this.userLookup)
    };
  }

  /**
   * 正規化提交資料
   */
  normalizeSubmissions(submissionsData) {
    const submissions = normalizeDataArray(submissionsData, normalizeSubmissionData);
    return enhanceWithUserInfo(submissions, this.userLookup);
  }

  /**
   * 正規化專案活動資料
   */
  normalizeProjectActivity(activityData) {
    return normalizeDataArray(activityData, (activity) => {
      const normalized = normalizeUserData(activity);
      const timestamped = normalizeTimestamp(normalized);
      
      return {
        ...timestamped,
        type: activity.type || activity.activity_type || 'unknown',
        description: activity.description || activity.message || ''
      };
    });
  }

  /**
   * 正規化專案列表資料
   */
  normalizeProjectList(projectsData) {
    return normalizeDataArray(projectsData, (project) => ({
      ...project,
      name: project.name || project.title || `專案 ${project.id}`,
      title: project.title || project.name || `專案 ${project.id}`
    }));
  }

  /**
   * 處理 Promise.allSettled 結果
   */
  handleSettledPromise(result, defaultValue = []) {
    return result.status === 'fulfilled' ? (result.value || defaultValue) : defaultValue;
  }

  /**
   * 主要的資料正規化方法
   * 處理整個 dashboard 所需的所有資料
   */
  normalizeAllData(promiseResults) {
    const [
      columnData,
      ,  // ideaWallData - 暫未使用
      studentsData,
      reflectionsData,
      chatroomsData,
      submissionsData,
      projectActivityData,
      allProjectsData,
      nodesData,
      relationsData,
      chatHistoryMap = {}
    ] = promiseResults.map(result => this.handleSettledPromise(result));

    // 先正規化學生資料以建立對照表
    const students = this.normalizeStudentData(studentsData);

    // 正規化各種資料
    const { tasks, columns } = this.normalizeKanbanData(columnData);
    const { nodes, relations } = this.normalizeIdeaWallData(nodesData, relationsData);
    const reflections = this.normalizeReflections(reflectionsData);
    const { chatrooms, chatHistory } = this.normalizeChatData(chatroomsData, chatHistoryMap);
    const submissions = this.normalizeSubmissions(submissionsData);
    const projectActivity = this.normalizeProjectActivity(projectActivityData);
    const allProjects = this.normalizeProjectList(allProjectsData);

    return {
      tasks,
      columns,
      nodes,
      relations,
      students,
      reflections,
      chatrooms,
      chatHistory,
      submissions,
      projectActivity,
      allProjects,
      userLookup: this.userLookup
    };
  }
}

// 導出單例實例
export const dataNomalizer = new DataNormalizer();