/**
 * ActivityStream 活動描述生成工具
 * 
 * 功能：
 * - 根據活動類型（任務、列表、節點、評論）生成人類可讀的描述文字
 * - 處理 5 種來源：task, column, node, comment, project_comment
 * - 支援多種操作類型：create, update, delete, move, connect, disconnect
 */

/**
 * 內容截取輔助函數
 * @param {string} content - 要截取的內容
 * @param {number} maxLength - 最大長度（預設 30）
 * @returns {string} 截取後的內容
 */
export const truncateContent = (content, maxLength = 30) => {
    if (!content || typeof content !== 'string') return '';
    return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
};

/**
 * 格式化變更摘要
 * @param {Array} changes - 變更記錄陣列
 * @returns {string} 格式化後的摘要文字
 */
export const formatChangesSummary = (changes) => {
    if (!changes || changes.length === 0) return '';
    
    const summary = changes.map(change => {
        switch (change.fieldName) {
            case 'title':
                return '標題';
            case 'content':
                return '內容';
            case 'assignees':
                return '指派成員';
            case 'labels':
                return '標籤';
            default:
                return change.fieldName;
        }
    }).join('、');
    
    return `更新了 ${summary}`;
};

/**
 * 處理評論活動描述
 * @param {Object} activity - 活動物件
 * @param {string} changeType - 變更類型
 * @returns {string} 描述文字
 */
const getCommentDescription = (activity, changeType) => {
    const commentPreview = activity.comment?.contentPreview || '評論內容';
    const taskTitle = activity.task?.title || '未知任務';
    
    switch (changeType) {
        case 'comment_create':
            return `在任務「${taskTitle}」中新增了評論: "${commentPreview}"`;
        case 'comment_update':
            const commentId = activity.comment?.id;
            const beforeContent = activity.comment?.beforeContentPreview;
            const afterContent = activity.comment?.contentPreview;
            
            // 數據驗證和處理
            const hasValidContent = beforeContent && afterContent && 
                typeof beforeContent === 'string' && typeof afterContent === 'string' && 
                beforeContent.trim() !== afterContent.trim();
            
            if (hasValidContent) {
                const beforeTruncated = truncateContent(beforeContent);
                const afterTruncated = truncateContent(afterContent);
                return `在任務「${taskTitle}」中更新了評論${commentId ? ` #${commentId}` : ''}: "${beforeTruncated}" → "${afterTruncated}"`;
            }
            
            // 回退邏輯
            const displayContent = afterContent || commentPreview;
            const truncatedContent = truncateContent(displayContent);
            return `在任務「${taskTitle}」中更新了評論${commentId ? ` #${commentId}` : ''}: "${truncatedContent}"`;
            
        case 'comment_delete':
            return `在任務「${taskTitle}」中刪除了評論: "${commentPreview}"`;
        default:
            return `在任務「${taskTitle}」中對評論進行了${changeType}操作`;
    }
};

/**
 * 處理專案評論活動描述
 * @param {Object} activity - 活動物件
 * @param {string} changeType - 變更類型
 * @returns {string} 描述文字
 */
const getProjectCommentDescription = (activity, changeType) => {
    const commentPreview = activity.comment?.contentPreview || '評論內容';
    const projectName = activity.project?.name || '未知專案';
    
    switch (changeType) {
        case 'project_comment_create':
            return `在專案「${projectName}」中新增了評論: "${commentPreview}"`;
        case 'project_comment_update':
            const projectCommentId = activity.comment?.id;
            const projectBeforeContent = activity.comment?.beforeContentPreview;
            const projectAfterContent = activity.comment?.contentPreview;
            
            // 驗證專案評論更新內容
            const hasValidProjectContent = projectBeforeContent && projectAfterContent && 
                typeof projectBeforeContent === 'string' && typeof projectAfterContent === 'string' && 
                projectBeforeContent.trim() !== projectAfterContent.trim();
            
            if (hasValidProjectContent) {
                const beforeTruncated = truncateContent(projectBeforeContent);
                const afterTruncated = truncateContent(projectAfterContent);
                return `在專案「${projectName}」中更新了評論${projectCommentId ? ` #${projectCommentId}` : ''}: "${beforeTruncated}" → "${afterTruncated}"`;
            }
            
            // 回退邏輯
            const displayContent = projectAfterContent || commentPreview;
            const truncatedContent = truncateContent(displayContent);
            return `在專案「${projectName}」中更新了評論${projectCommentId ? ` #${projectCommentId}` : ''}: "${truncatedContent}"`;
            
        case 'project_comment_delete':
            return `在專案「${projectName}」中刪除了評論: "${commentPreview}"`;
        default:
            return `在專案「${projectName}」中對評論進行了${changeType}操作`;
    }
};

/**
 * 處理節點活動描述
 * @param {Object} activity - 活動物件
 * @param {string} changeType - 變更類型
 * @returns {string} 描述文字
 */
const getNodeDescription = (activity, changeType) => {
    const nodeTitle = activity.node?.title || 
                     activity.nodeTitle || 
                     activity.nodeData?.title ||
                     '未知節點';
    const nodeType = activity.node?.type || 
                   activity.nodeType || 
                   activity.nodeData?.type ||
                   'unknown';
    
    switch (changeType) {
        case 'create':
            // 備用邏輯：根據 nodeType 判斷（用於實時事件）
            if (nodeType === 'extension') {
                return `延伸了節點「${nodeTitle}」`;
            } else {
                return `創建了新節點「${nodeTitle}」`;
            }
        case 'update':
            if (activity.changes && activity.changes.length > 0) {
                const changesSummary = activity.changes.map(change => {
                    switch (change.fieldName) {
                        case 'title':
                            return '標題';
                        case 'content':
                            return '內容';
                        case 'position':
                            return '位置';
                        case 'connections':
                            return '連接';
                        default:
                            return change.fieldName;
                    }
                }).join('、');
                return `更新了節點「${nodeTitle}」的${changesSummary}`;
            }
            return `更新了節點「${nodeTitle}」`;
        case 'delete':
            return `刪除了節點「${nodeTitle}」`;
        case 'move':
            return `移動了節點「${nodeTitle}」的位置`;
        case 'connect':
            const targetNode = activity.targetNodeTitle || '另一個節點';
            return `將節點「${nodeTitle}」連接到「${targetNode}」`;
        case 'disconnect':
            const disconnectedNode = activity.targetNodeTitle || '另一個節點';
            return `斷開節點「${nodeTitle}」與「${disconnectedNode}」的連接`;
        default:
            return `節點「${nodeTitle}」進行了${changeType}操作`;
    }
};

/**
 * 處理列表活動描述
 * @param {Object} activity - 活動物件
 * @param {string} changeType - 變更類型
 * @returns {string} 描述文字
 */
const getColumnDescription = (activity, changeType) => {
    // 優先從多個可能的來源獲取列表名稱
    const columnName = activity.column?.name || 
                      activity.columnName || 
                      activity.columnData?.name ||
                      '未知列表';
    
    switch (changeType) {
        case 'create':
            return `創建了新列表「${columnName}」`;
        case 'delete':
            // 列表刪除時顯示更詳細的資訊
            let deleteMessage = `刪除了列表「${columnName}」`;
            
            // 檢查多種可能的任務數量來源
            const taskCount = activity.columnData?.taskCount || 
                             (activity.columnData?.task ? activity.columnData.task.length : 0);
            
            if (taskCount > 0) {
                deleteMessage += ` (包含 ${taskCount} 個任務)`;
            } else if (taskCount === 0) {
                deleteMessage += ` (空列表)`;
            }
            
            return deleteMessage;
        case 'reorder':
            return `調整了列表順序`;
        default:
            return `列表「${columnName}」進行了${changeType}操作`;
    }
};

/**
 * 處理任務活動描述
 * @param {Object} activity - 活動物件
 * @param {string} changeType - 變更類型
 * @returns {string} 描述文字
 */
const getTaskDescription = (activity, changeType) => {
    let taskTitle = activity.taskTitle || (activity.task && activity.task.title);
    
    // 如果沒有任務標題，嘗試從描述中提取
    if (!taskTitle && activity.description) {
        let titleMatch;
        
        // 嘗試不同的模式來提取任務標題
        if (changeType === 'move') {
            titleMatch = activity.description.match(/將任務「(.+?)」從/);
        } else if (changeType === 'create') {
            titleMatch = activity.description.match(/創建新任務「(.+?)」/);
        } else if (changeType === 'delete') {
            titleMatch = activity.description.match(/刪除了任務「(.+?)」/);
        } else if (changeType === 'update') {
            titleMatch = activity.description.match(/任務「(.+?)」:/);
        }
        
        if (titleMatch) {
            taskTitle = titleMatch[1];
        }
    }
    
    // 如果仍然沒有標題，使用預設值
    if (!taskTitle) {
        taskTitle = `任務 #${activity.taskId || activity.task?.id || '未知'}`;
    }
    
    switch (changeType) {
        case 'create':
            let createDesc = `在「${activity.columnName || '未知列表'}」中創建了任務「${taskTitle}」`;
            if (activity.taskDetails) {
                const details = [];
                if (activity.taskDetails.assignees && activity.taskDetails.assignees.length > 0) {
                    const assigneeNames = activity.taskDetails.assignees
                        .map(a => a.username || a.userId || a)
                        .filter(name => name)
                        .join(', ');
                    if (assigneeNames) {
                        details.push(`指派給: ${assigneeNames}`);
                    }
                }
                if (activity.taskDetails.labels && activity.taskDetails.labels.length > 0) {
                    details.push(`標籤: ${activity.taskDetails.labels.map(l => l.content).join(', ')}`);
                }
                if (details.length > 0) {
                    createDesc += ` (${details.join(', ')})`;
                }
            }
            return createDesc;
        
        case 'update':
            if (activity.changes && activity.changes.length > 0) {
                // 如果只有一個變更，顯示詳細描述
                if (activity.changes.length === 1) {
                    const change = activity.changes[0];
                    
                    // 針對不同欄位提供更詳細的描述
                    if (change.fieldName === 'content') {
                        const columnInfo = activity.columnName ? ` （位於「${activity.columnName}」）` : '';
                        if (!change.oldValue && change.newValue) {
                            const preview = change.newValue.length > 30 ? 
                                change.newValue.substring(0, 30) + '...' : change.newValue;
                            return `在任務「${taskTitle}」中新增了內容: "${preview}"${columnInfo}`;
                        } else if (change.oldValue && change.newValue) {
                            const preview = change.newValue.length > 30 ? 
                                change.newValue.substring(0, 30) + '...' : change.newValue;
                            return `將任務「${taskTitle}」的內容更新為: "${preview}"${columnInfo}`;
                        }
                    }
                    
                    // 使用後端提供的描述，但加上任務標題
                    if (change.description) {
                        return `任務「${taskTitle}」: ${change.description}`;
                    }
                    
                    return `更新了任務「${taskTitle}」的${change.fieldName}`;
                }
                // 多個變更，顯示摘要
                const summary = formatChangesSummary(activity.changes);
                return `任務「${taskTitle}」: ${summary}`;
            }
            return `更新了任務「${taskTitle}」`;
        
        case 'delete':
            // 如果有現成的描述，直接使用（已包含列表資訊）
            if (activity.description) {
                return activity.description;
            }
            // 備用邏輯（用於沒有描述的舊記錄）
            let deleteDesc = `刪除了任務「${taskTitle}」`;
            if (activity.columnName) {
                deleteDesc += `（來自「${activity.columnName}」）`;
            }
            return deleteDesc;
        
        case 'move':
            // 統一處理移動操作的描述，無論是實時事件還是資料庫記錄
            const fromColumn = activity.from || '未知來源';
            const toColumn = activity.to || '未知目標';
            return `將任務「${taskTitle}」從「${fromColumn}」移動到「${toColumn}」`;
        
        default:
            return '進行了某項操作';
    }
};

/**
 * 獲取活動描述（主入口函式）
 * @param {Object} activity - 活動物件
 * @returns {string} 人類可讀的活動描述
 */
export const getActivityDescription = (activity) => {
    // 統一處理 activity.type (Socket事件) 和 activity.changeType (資料庫記錄)
    const changeType = activity.type || activity.changeType;
    const source = activity.source; // 'task', 'column', 'node', 'comment', 'project_comment'
    
    // 如果已經有描述且不是移動操作，直接使用
    // 對於刪除操作，始終優先使用 description（包含列表資訊）
    if (activity.description && (changeType === 'delete' || changeType !== 'move')) {
        return activity.description;
    }

    // 處理評論活動
    if (source === 'comment') {
        return getCommentDescription(activity, changeType);
    }
    
    // 處理專案評論活動
    if (source === 'project_comment') {
        return getProjectCommentDescription(activity, changeType);
    }
    
    // 處理節點活動
    if (source === 'node') {
        return getNodeDescription(activity, changeType);
    }
    
    // 處理列表活動
    if (source === 'column') {
        return getColumnDescription(activity, changeType);
    }
    
    // 處理任務活動
    return getTaskDescription(activity, changeType);
};
