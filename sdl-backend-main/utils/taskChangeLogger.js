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
            if (!oldValue && newValue) {
                // 新增內容時，顯示內容摘要
                const contentPreview = newValue.length > 50 ? 
                    newValue.substring(0, 50) + '...' : newValue;
                return `新增了任務內容: "${contentPreview}"`;
            } else if (oldValue && !newValue) {
                return '清空了任務內容';
            } else if (oldValue && newValue) {
                // 更新內容時，顯示新內容的預覽
                const newContentPreview = newValue.length > 50 ? 
                    newValue.substring(0, 50) + '...' : newValue;
                return `更新了任務內容為: "${newContentPreview}"`;
            }
            return '更新了任務內容';
        case 'assignees':
            try {
                const oldAssignees = Array.isArray(oldValue) ? oldValue : (oldValue ? JSON.parse(oldValue) : []);
                const newAssignees = Array.isArray(newValue) ? newValue : (newValue ? JSON.parse(newValue) : []);
                
                const oldNames = oldAssignees.map(a => a.username || a.userId || a).filter(name => name).join(', ');
                const newNames = newAssignees.map(a => a.username || a.userId || a).filter(name => name).join(', ');
                
                if (!oldNames && newNames) {
                    return `指派給: ${newNames}`;
                } else if (oldNames && !newNames) {
                    return `取消指派: ${oldNames}`;
                } else if (oldNames !== newNames) {
                    return `指派成員從「${oldNames}」改為「${newNames}」`;
                } else {
                    return '更新了指派成員';
                }
            } catch (error) {
                return '更新了指派成員';
            }
        case 'labels':
            try {
                const oldLabels = Array.isArray(oldValue) ? oldValue : (oldValue ? JSON.parse(oldValue) : []);
                const newLabels = Array.isArray(newValue) ? newValue : (newValue ? JSON.parse(newValue) : []);
                
                const oldLabelNames = oldLabels.map(l => l.content || l).join(', ');
                const newLabelNames = newLabels.map(l => l.content || l).join(', ');
                
                if (!oldLabelNames && newLabelNames) {
                    return `添加標籤: ${newLabelNames}`;
                } else if (oldLabelNames && !newLabelNames) {
                    return `移除標籤: ${oldLabelNames}`;
                } else {
                    return `標籤從「${oldLabelNames}」改為「${newLabelNames}」`;
                }
            } catch (error) {
                return '更新了標籤';
            }
        default:
            return `${fieldName} 已更新`;
    }
}

module.exports = {
    logTaskChange,
    logFieldChanges
}; 