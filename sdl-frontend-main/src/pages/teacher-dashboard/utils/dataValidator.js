/**
 * 資料驗證工具
 * 確保資料完整性和一致性
 */

// 基本資料型別檢查
export const validators = {
  isString: (value) => typeof value === 'string' && value.length > 0,
  isNumber: (value) => typeof value === 'number' && !isNaN(value),
  isArray: (value) => Array.isArray(value),
  isObject: (value) => value && typeof value === 'object' && !Array.isArray(value),
  isDate: (value) => value && (value instanceof Date || !isNaN(Date.parse(value))),
  isPositiveNumber: (value) => validators.isNumber(value) && value >= 0,
  isValidId: (value) => validators.isNumber(value) || validators.isString(value)
};

// 使用者資料驗證
export const validateUserData = (user) => {
  const errors = [];
  
  if (!user) {
    return ['使用者資料為空'];
  }

  if (!validators.isValidId(user.id) && !validators.isValidId(user.userId)) {
    errors.push('缺少有效的使用者ID');
  }

  if (!validators.isString(user.username) && !validators.isString(user.name)) {
    errors.push('缺少有效的使用者名稱');
  }

  return errors;
};

// 任務資料驗證
export const validateTaskData = (task) => {
  const errors = [];
  
  if (!task) {
    return ['任務資料為空'];
  }

  if (!validators.isValidId(task.id)) {
    errors.push('任務ID無效');
  }

  if (!validators.isString(task.title) && !validators.isString(task.name)) {
    errors.push('任務標題無效');
  }

  if (task.assignees && !validators.isArray(task.assignees)) {
    errors.push('指派者資料格式錯誤');
  }

  return errors;
};

// 想法節點資料驗證
export const validateNodeData = (node) => {
  const errors = [];
  
  if (!node) {
    return ['節點資料為空'];
  }

  if (!validators.isValidId(node.id)) {
    errors.push('節點ID無效');
  }

  if (!validators.isString(node.content) && !validators.isString(node.title)) {
    errors.push('節點內容無效');
  }

  return errors;
};

// 反思記錄驗證
export const validateReflectionData = (reflection) => {
  const errors = [];
  
  if (!reflection) {
    return ['反思記錄為空'];
  }

  if (!validators.isValidId(reflection.id)) {
    errors.push('反思記錄ID無效');
  }

  if (!validators.isValidId(reflection.userId) && !validators.isValidId(reflection.user_id)) {
    errors.push('反思記錄缺少使用者ID');
  }

  return errors;
};

// 聊天訊息驗證
export const validateChatMessage = (message) => {
  const errors = [];
  
  if (!message) {
    return ['聊天訊息為空'];
  }

  if (!validators.isValidId(message.id)) {
    errors.push('訊息ID無效');
  }

  if (!validators.isString(message.content) && !validators.isString(message.message)) {
    errors.push('訊息內容無效');
  }

  return errors;
};

// 專案資料驗證
export const validateProjectData = (project) => {
  const errors = [];
  
  if (!project) {
    return ['專案資料為空'];
  }

  if (!validators.isValidId(project.id)) {
    errors.push('專案ID無效');
  }

  if (!validators.isString(project.name) && !validators.isString(project.title)) {
    errors.push('專案名稱無效');
  }

  return errors;
};

// 批量資料驗證
export const validateDataArray = (items, validator, itemType = '項目') => {
  if (!validators.isArray(items)) {
    return [`${itemType}資料不是陣列格式`];
  }

  const errors = [];
  items.forEach((item, index) => {
    const itemErrors = validator(item);
    if (itemErrors.length > 0) {
      errors.push(`${itemType} ${index + 1}: ${itemErrors.join(', ')}`);
    }
  });

  return errors;
};

// 資料完整性檢查
export const checkDataIntegrity = (data) => {
  const report = {
    isValid: true,
    errors: [],
    warnings: [],
    stats: {}
  };

  // 檢查學生資料
  if (data.students) {
    const studentErrors = validateDataArray(data.students, validateUserData, '學生');
    if (studentErrors.length > 0) {
      report.errors.push(...studentErrors);
      report.isValid = false;
    }
    report.stats.studentsCount = data.students.length;
  }

  // 檢查任務資料
  if (data.tasks) {
    const taskErrors = validateDataArray(data.tasks, validateTaskData, '任務');
    if (taskErrors.length > 0) {
      report.errors.push(...taskErrors);
      report.isValid = false;
    }
    report.stats.tasksCount = data.tasks.length;
  }

  // 檢查想法節點
  if (data.nodes) {
    const nodeErrors = validateDataArray(data.nodes, validateNodeData, '想法節點');
    if (nodeErrors.length > 0) {
      report.errors.push(...nodeErrors);
      report.isValid = false;
    }
    report.stats.nodesCount = data.nodes.length;
  }

  // 檢查反思記錄
  if (data.reflections) {
    const reflectionErrors = validateDataArray(data.reflections, validateReflectionData, '反思記錄');
    if (reflectionErrors.length > 0) {
      report.errors.push(...reflectionErrors);
      report.isValid = false;
    }
    report.stats.reflectionsCount = data.reflections.length;
  }

  // 檢查聊天記錄
  if (data.chatHistory) {
    const chatErrors = validateDataArray(data.chatHistory, validateChatMessage, '聊天訊息');
    if (chatErrors.length > 0) {
      report.errors.push(...chatErrors);
      report.isValid = false;
    }
    report.stats.chatMessagesCount = data.chatHistory.length;
  }

  // 檢查專案資料
  if (data.allProjects) {
    const projectErrors = validateDataArray(data.allProjects, validateProjectData, '專案');
    if (projectErrors.length > 0) {
      report.errors.push(...projectErrors);
      report.isValid = false;
    }
    report.stats.projectsCount = data.allProjects.length;
  }

  // 資料關聯性檢查
  if (data.students && data.reflections) {
    const studentIds = new Set(data.students.map(s => s.userId || s.id));
    const orphanedReflections = data.reflections.filter(r => 
      !studentIds.has(r.userId) && !studentIds.has(r.user_id)
    );
    
    if (orphanedReflections.length > 0) {
      report.warnings.push(`發現 ${orphanedReflections.length} 個無法關聯到學生的反思記錄`);
    }
  }

  if (data.students && data.tasks) {
    const studentIds = new Set(data.students.map(s => s.userId || s.id));
    const studentNames = new Set(data.students.map(s => s.username || s.name));
    
    const orphanedTasks = data.tasks.filter(task => {
      const hasValidAssignee = task.assignees && task.assignees.some(a => 
        studentIds.has(a.userId || a.id) || studentNames.has(a.username || a.name)
      );
      const hasValidCreator = studentIds.has(task.userId) || studentNames.has(task.username);
      
      return !hasValidAssignee && !hasValidCreator;
    });
    
    if (orphanedTasks.length > 0) {
      report.warnings.push(`發現 ${orphanedTasks.length} 個無法關聯到學生的任務`);
    }
  }

  return report;
};

// 清理資料 - 移除無效項目
export const sanitizeData = (data) => {
  const sanitized = { ...data };

  // 清理學生資料
  if (sanitized.students) {
    sanitized.students = sanitized.students.filter(student => {
      const errors = validateUserData(student);
      return errors.length === 0;
    });
  }

  // 清理任務資料
  if (sanitized.tasks) {
    sanitized.tasks = sanitized.tasks.filter(task => {
      const errors = validateTaskData(task);
      return errors.length === 0;
    });
  }

  // 清理節點資料
  if (sanitized.nodes) {
    sanitized.nodes = sanitized.nodes.filter(node => {
      const errors = validateNodeData(node);
      return errors.length === 0;
    });
  }

  // 清理反思記錄
  if (sanitized.reflections) {
    sanitized.reflections = sanitized.reflections.filter(reflection => {
      const errors = validateReflectionData(reflection);
      return errors.length === 0;
    });
  }

  // 清理聊天記錄
  if (sanitized.chatHistory) {
    sanitized.chatHistory = sanitized.chatHistory.filter(message => {
      const errors = validateChatMessage(message);
      return errors.length === 0;
    });
  }

  return sanitized;
};

// 資料品質報告
export const generateDataQualityReport = (data) => {
  const integrity = checkDataIntegrity(data);
  const cleanData = sanitizeData(data);
  
  return {
    original: {
      integrity,
      totalItems: Object.values(integrity.stats).reduce((sum, count) => sum + count, 0)
    },
    cleaned: {
      stats: Object.keys(integrity.stats).reduce((acc, key) => {
        const cleanKey = key.replace('Count', '');
        acc[key] = cleanData[cleanKey]?.length || 0;
        return acc;
      }, {}),
      totalItems: Object.values(cleanData).reduce((sum, arr) => 
        Array.isArray(arr) ? sum + arr.length : sum, 0
      )
    },
    recommendations: [
      ...integrity.errors.length > 0 ? ['修正資料完整性錯誤'] : [],
      ...integrity.warnings.length > 0 ? ['檢查資料關聯性警告'] : [],
      integrity.isValid ? '資料品質良好' : '建議進行資料清理'
    ]
  };
};