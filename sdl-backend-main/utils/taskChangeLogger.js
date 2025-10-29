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
    const fieldsToTrack = ['title', 'content', 'assignees', 'labels', 'files', 'images'];
    const changes = [];

    // 提取檔案/圖片名稱的輔助函數
    const extractFileName = (path) => {
        if (!path) return '';
        const fileName = path.split('/').pop();
        return fileName.replace(/^\d+-[a-z0-9]+-/, '');
    };

    for (const field of fieldsToTrack) {
        const oldValue = oldData[field];
        const newValue = newData[field];

        // 處理陣列類型的比較
        if (Array.isArray(oldValue) && Array.isArray(newValue)) {
            if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
                let oldValueToStore = JSON.stringify(oldValue);
                let newValueToStore = JSON.stringify(newValue);

                // 對於 files 和 images，只保存檔案名稱
                if (field === 'files' || field === 'images') {
                    const oldFileNames = oldValue.map(extractFileName);
                    const newFileNames = newValue.map(extractFileName);
                    oldValueToStore = JSON.stringify(oldFileNames);
                    newValueToStore = JSON.stringify(newFileNames);
                }

                changes.push({
                    fieldName: field,
                    oldValue: oldValueToStore,
                    newValue: newValueToStore,
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
        case 'files':
            try {
                const oldFiles = Array.isArray(oldValue) ? oldValue : (oldValue ? JSON.parse(oldValue) : []);
                const newFiles = Array.isArray(newValue) ? newValue : (newValue ? JSON.parse(newValue) : []);

                // 提取檔案名稱的輔助函數
                const extractFileName = (path) => {
                    if (!path) return '';
                    // 從路徑中提取檔案名稱
                    const fileName = path.split('/').pop();
                    // 移除時間戳前綴 (例如：1761660718240-8peenx635pe-檔案.pdf -> 檔案.pdf)
                    return fileName.replace(/^\d+-[a-z0-9]+-/, '');
                };

                // 找出新增和刪除的檔案
                const addedFiles = newFiles.filter(f => !oldFiles.includes(f));
                const removedFiles = oldFiles.filter(f => !newFiles.includes(f));

                if (addedFiles.length > 0 && removedFiles.length === 0) {
                    const fileNames = addedFiles.map(extractFileName).join('、');
                    return `上傳了檔案：${fileNames}`;
                } else if (removedFiles.length > 0 && addedFiles.length === 0) {
                    const fileNames = removedFiles.map(extractFileName).join('、');
                    return `刪除了檔案：${fileNames}`;
                } else if (addedFiles.length > 0 && removedFiles.length > 0) {
                    const added = addedFiles.map(extractFileName).join('、');
                    const removed = removedFiles.map(extractFileName).join('、');
                    return `更新了檔案（新增：${added}；刪除：${removed}）`;
                } else {
                    return '更新了檔案';
                }
            } catch (error) {
                return '更新了檔案';
            }
        case 'images':
            try {
                const oldImages = Array.isArray(oldValue) ? oldValue : (oldValue ? JSON.parse(oldValue) : []);
                const newImages = Array.isArray(newValue) ? newValue : (newValue ? JSON.parse(newValue) : []);

                // 提取圖片名稱的輔助函數
                const extractImageName = (path) => {
                    if (!path) return '';
                    // 從路徑中提取圖片名稱
                    const imageName = path.split('/').pop();
                    // 移除時間戳前綴 (例如：1761660718240-8peenx635pe-圖片.jpg -> 圖片.jpg)
                    return imageName.replace(/^\d+-[a-z0-9]+-/, '');
                };

                // 找出新增和刪除的圖片
                const addedImages = newImages.filter(img => !oldImages.includes(img));
                const removedImages = oldImages.filter(img => !newImages.includes(img));

                if (addedImages.length > 0 && removedImages.length === 0) {
                    const imageNames = addedImages.map(extractImageName).join('、');
                    return `上傳了圖片：${imageNames}`;
                } else if (removedImages.length > 0 && addedImages.length === 0) {
                    const imageNames = removedImages.map(extractImageName).join('、');
                    return `刪除了圖片：${imageNames}`;
                } else if (addedImages.length > 0 && removedImages.length > 0) {
                    const added = addedImages.map(extractImageName).join('、');
                    const removed = removedImages.map(extractImageName).join('、');
                    return `更新了圖片（新增：${added}；刪除：${removed}）`;
                } else {
                    return '更新了圖片';
                }
            } catch (error) {
                return '更新了圖片';
            }
        default:
            return `${fieldName} 已更新`;
    }
}

module.exports = {
    logTaskChange,
    logFieldChanges
}; 