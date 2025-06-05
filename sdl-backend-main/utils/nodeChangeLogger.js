const NodeChangeLog = require('../models/node_change_log');

/**
 * 記錄節點變更
 * @param {Object} params - 變更參數
 */
async function logNodeChange({
    nodeId,
    changeType,
    fieldName = null,
    oldValue = null,
    newValue = null,
    changedBy,
    projectId,
    description = null
}) {
    try {
        const changeLog = await NodeChangeLog.create({
            nodeId,
            changeType,
            fieldName,
            oldValue: oldValue ? String(oldValue) : null,
            newValue: newValue ? String(newValue) : null,
            changedBy,
            projectId,
            description
        });
        
        console.log(`✅ 節點變更記錄已儲存: ${changeType} - Node ${nodeId} by ${changedBy}`);
        return changeLog;
    } catch (error) {
        console.error('❌ 儲存節點變更記錄失敗:', error);
        throw error;
    }
}

/**
 * 比較節點差異並記錄變更
 */
async function logNodeFieldChanges(oldData, newData, nodeId, changedBy, projectId) {
    const fieldsToTrack = ['title', 'content'];
    const changes = [];
    
    for (const field of fieldsToTrack) {
        const oldValue = oldData[field];
        const newValue = newData[field];
        
        if (oldValue !== newValue) {
            changes.push({
                fieldName: field,
                oldValue: String(oldValue || ''),
                newValue: String(newValue || ''),
                description: getNodeFieldChangeDescription(field, oldValue, newValue)
            });
        }
    }
    
    // 批量記錄變更
    for (const change of changes) {
        await logNodeChange({
            nodeId,
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
 * 生成節點欄位變更描述
 */
function getNodeFieldChangeDescription(fieldName, oldValue, newValue) {
    switch (fieldName) {
        case 'title':
            return `標題從「${oldValue}」改為「${newValue}」`;
        case 'content':
            return '內容已更新';
        default:
            return `${fieldName} 已更新`;
    }
}

module.exports = {
    logNodeChange,
    logNodeFieldChanges
}; 