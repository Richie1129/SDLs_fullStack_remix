const ColumnChangeLog = require('../models/column_change_log');

/**
 * 記錄列表變更
 * @param {Object} params - 變更參數
 * @param {number} params.columnId - 列表ID
 * @param {string} params.changeType - 變更類型 (create, update, delete, reorder)
 * @param {string} params.fieldName - 變更欄位名稱
 * @param {string} params.oldValue - 舊值
 * @param {string} params.newValue - 新值
 * @param {string} params.changedBy - 變更者
 * @param {number} params.projectId - 專案ID
 * @param {string} params.description - 變更描述
 */
async function logColumnChange({
    columnId,
    changeType,
    fieldName = null,
    oldValue = null,
    newValue = null,
    changedBy,
    projectId,
    description = null
}) {
    try {
        const changeLog = await ColumnChangeLog.create({
            columnId,
            changeType,
            fieldName,
            oldValue: oldValue ? String(oldValue) : null,
            newValue: newValue ? String(newValue) : null,
            changedBy,
            projectId,
            description
        });
        
        console.log(`✅ 列表變更記錄已儲存: ${changeType} - Column ${columnId} by ${changedBy}`);
        return changeLog;
    } catch (error) {
        console.error('❌ 儲存列表變更記錄失敗:', error);
        throw error;
    }
}

/**
 * 記錄列表重新排序
 * @param {number[]} oldOrder - 舊的排序
 * @param {number[]} newOrder - 新的排序  
 * @param {string} changedBy - 變更者
 * @param {number} projectId - 專案ID
 */
async function logColumnReorder(oldOrder, newOrder, changedBy, projectId) {
    try {
        await logColumnChange({
            columnId: null, // 重新排序影響多個列表，不指定特定ID
            changeType: 'reorder',
            fieldName: 'order',
            oldValue: JSON.stringify(oldOrder),
            newValue: JSON.stringify(newOrder),
            changedBy,
            projectId,
            description: `調整了列表順序`
        });
    } catch (error) {
        console.error('❌ 記錄列表重新排序失敗:', error);
        throw error;
    }
}

module.exports = {
    logColumnChange,
    logColumnReorder
};