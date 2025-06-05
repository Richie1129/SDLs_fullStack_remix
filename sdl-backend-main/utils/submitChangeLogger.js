const SubmitChangeLog = require('../models/submit_change_log');

/**
 * 記錄提交變更
 * @param {Object} params - 變更參數
 */
async function logSubmitChange({
    submitId,
    changeType,
    fieldName = null,
    oldValue = null,
    newValue = null,
    changedBy,
    projectId,
    description = null
}) {
    try {
        const changeLog = await SubmitChangeLog.create({
            submitId,
            changeType,
            fieldName,
            oldValue: oldValue ? String(oldValue) : null,
            newValue: newValue ? String(newValue) : null,
            changedBy,
            projectId,
            description
        });
        
        console.log(`✅ 提交變更記錄已儲存: ${changeType} - Submit ${submitId} by ${changedBy}`);
        return changeLog;
    } catch (error) {
        console.error('❌ 儲存提交變更記錄失敗:', error);
        throw error;
    }
}

/**
 * 比較提交差異並記錄變更
 */
async function logSubmitFieldChanges(oldData, newData, submitId, changedBy, projectId) {
    const fieldsToTrack = ['content'];
    const changes = [];
    
    for (const field of fieldsToTrack) {
        const oldValue = oldData[field];
        const newValue = newData[field];
        
        // 處理JSON格式的content欄位
        if (field === 'content') {
            const oldContent = typeof oldValue === 'string' ? oldValue : JSON.stringify(oldValue);
            const newContent = typeof newValue === 'string' ? newValue : JSON.stringify(newValue);
            
            if (oldContent !== newContent) {
                changes.push({
                    fieldName: field,
                    oldValue: oldContent,
                    newValue: newContent,
                    description: '內容已更新'
                });
            }
        } else if (oldValue !== newValue) {
            changes.push({
                fieldName: field,
                oldValue: String(oldValue || ''),
                newValue: String(newValue || ''),
                description: getSubmitFieldChangeDescription(field, oldValue, newValue)
            });
        }
    }
    
    // 批量記錄變更
    for (const change of changes) {
        await logSubmitChange({
            submitId,
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
 * 生成提交欄位變更描述
 */
function getSubmitFieldChangeDescription(fieldName, oldValue, newValue) {
    switch (fieldName) {
        case 'content':
            return '內容已更新';
        default:
            return `${fieldName} 已更新`;
    }
}

module.exports = {
    logSubmitChange,
    logSubmitFieldChanges
}; 