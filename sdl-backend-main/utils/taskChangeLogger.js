const TaskChangeLog = require('../models/task_change_log');

/**
 * 記錄任務變更
 * @param {Object} params - 變更參數
 * @param {number} params.taskId - 任務ID
 * @param {string} params.changeType - 變更類型 (create, update, move, delete)
 * @param {string} params.fieldName - 變更欄位名稱
 * @param {string} params.oldValue - 舊值
 * @param {string} params.newValue - 新值
 * @param {string} params.changedBy - 變更者
 * @param {number} params.projectId - 專案ID
 * @param {string} params.description - 變更描述
 */
async function logTaskChange({
    taskId,
    changeType,
    fieldName = null,
    oldValue = null,
    newValue = null,
    changedBy,
    projectId,
    description = null
}) {
    try {
        const changeLog = await TaskChangeLog.create({
            taskId,
            changeType,
            fieldName,
            oldValue: oldValue ? String(oldValue) : null,
            newValue: newValue ? String(newValue) : null,
            changedBy,
            projectId,
            description
        });
        
        console.log(`✅ 變更記錄已儲存: ${changeType} - Task ${taskId} by ${changedBy}`);
        return changeLog;
    } catch (error) {
        console.error('❌ 儲存變更記錄失敗:', error);
        throw error;
    }
}

/**
 * 比較物件差異並記錄變更
 * @param {Object} oldData - 舊資料
 * @param {Object} newData - 新資料
 * @param {number} taskId - 任務ID
 * @param {string} changedBy - 變更者
 * @param {number} projectId - 專案ID
 */
async function logFieldChanges(oldData, newData, taskId, changedBy, projectId) {
    const fieldsToTrack = ['title', 'content', 'assignees', 'labels'];
    const changes = [];
    
    for (const field of fieldsToTrack) {
        const oldValue = oldData[field];
        const newValue = newData[field];
        
        // 處理陣列類型的比較
        if (Array.isArray(oldValue) && Array.isArray(newValue)) {
            if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
                changes.push({
                    fieldName: field,
                    oldValue: JSON.stringify(oldValue),
                    newValue: JSON.stringify(newValue),
                    description: getFieldChangeDescription(field, oldValue, newValue)
                });
            }
        } else if (oldValue !== newValue) {
            changes.push({
                fieldName: field,
                oldValue: String(oldValue || ''),
                newValue: String(newValue || ''),
                description: getFieldChangeDescription(field, oldValue, newValue)
            });
        }
    }
    
    // 批量記錄變更
    for (const change of changes) {
        await logTaskChange({
            taskId,
            changeType: 'update',
            fieldName: change.fieldName,
            oldValue: change.oldValue,
            newValue: change.newValue,
            changedBy,
            projectId,
            description: change.description
        });
    }
    
    return changes;
}

/**
 * 生成欄位變更描述
 */
function getFieldChangeDescription(fieldName, oldValue, newValue) {
    switch (fieldName) {
        case 'title':
            return `標題從「${oldValue}」改為「${newValue}」`;
        case 'content':
            return '內容已更新';
        case 'assignees':
            const oldAssignees = Array.isArray(oldValue) ? oldValue.map(a => a.username).join(', ') : '';
            const newAssignees = Array.isArray(newValue) ? newValue.map(a => a.username).join(', ') : '';
            return `指派成員從「${oldAssignees}」改為「${newAssignees}」`;
        case 'labels':
            return '標籤已更新';
        default:
            return `${fieldName} 已更新`;
    }
}

module.exports = {
    logTaskChange,
    logFieldChanges
}; 