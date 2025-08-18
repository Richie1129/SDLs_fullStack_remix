require('dotenv').config()
const express = require('express');
const path = require('path');
const sequelize = require('./util/database');
const bodyParser = require('body-parser');
const cors = require("cors");
const { Op } = require('sequelize');
const Sequelize = require('sequelize');
// const moment = require('moment-timezone');
const app = express();
const http = require('http');
const { Server } = require('socket.io');
const { upload } = require('./middlewares/uploadMiddleware'); // 引用上傳中介軟體
const { uploadToMinio } = require('./middlewares/minioUploadMiddleware'); // 引用 MinIO 中介軟體
const { Socket } = require('dgram');
const server = http.createServer(app);
const Task = require('./models/task');
const Comment = require('./models/comment');
const Column = require('./models/column');
const Kanban = require('./models/kanban');
const Node = require('./models/node');
const Node_relation = require('./models/node_relation');
const Chatroom_message = require('./models/chatroom_message');
const Rag_message = require('./models/rag_message')
const Project = require('./models/project')
const QuestionMessage = require('./models/question_message')
const Announcement = require('./models/announcement');
const TaskChangeLog = require('./models/task_change_log');
const NodeChangeLog = require('./models/node_change_log');
const SubmitChangeLog = require('./models/submit_change_log');
const { logTaskChange, logFieldChanges } = require('./utils/taskChangeLogger');
const { logNodeChange, logNodeFieldChanges } = require('./utils/nodeChangeLogger');
const { logSubmitChange, logSubmitFieldChanges } = require('./utils/submitChangeLogger');
const axios = require('axios');
const https = require('https');
const { rm } = require('fs');
const User = require('./models/user');

const agent = new https.Agent({
    rejectUnauthorized: false, // 忽略證書驗證
});

const API_KEY = "ragflow-U0ZTc4MzdlZTJjYjExZWZiMzcyMDI0Mm"; // 從前端程式碼中提取的 API Key

/**
 * Socket.io 權限檢查函數
 * 檢查用戶對專案是否有寫入權限
 */
const checkSocketWritePermission = async (userId, projectId, socket = null) => {
    try {
        // 如果沒有提供 userId 但有 socket，嘗試從 socket 獲取
        if (!userId && socket) {
            userId = socket.userId;
        }
        
        if (!userId || !projectId) {
            return { hasPermission: false, error: '缺少用戶ID或專案ID' };
        }

        // 取得專案資訊和用戶資訊
        const project = await Project.findByPk(projectId, {
            include: [{
                model: User,
                through: { attributes: [] }
            }]
        });

        if (!project) {
            return { hasPermission: false, error: '專案不存在' };
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return { hasPermission: false, error: '用戶不存在' };
        }

        // 檢查用戶是否為專案成員
        const isProjectMember = project.users.some(projectUser => projectUser.id === parseInt(userId));

        if (isProjectMember) {
            return { hasPermission: true, readOnly: false };
        }

        // 檢查是否為指導教師
        const isProjectMentor = project.mentor === user.username;

        if (isProjectMentor) {
            return { hasPermission: true, readOnly: false };
        }

        // 檢查是否有跨班觀摩權限（只讀）
        const hasViewingPermission = project.is_open_for_viewing && 
            project.allowed_classes && 
            project.allowed_classes.includes(user.class);

        if (hasViewingPermission) {
            return { hasPermission: false, readOnly: true, error: '觀摩模式下無法進行編輯操作' };
        }

        // 無任何權限
        return { hasPermission: false, error: '無權限訪問此專案' };

    } catch (error) {
        console.error('Socket權限檢查錯誤:', error);
        return { hasPermission: false, error: '權限檢查時發生錯誤' };
    }
};

/**
 * 獲取當前用戶資訊的輔助函數
 */
const getCurrentUser = (socket, data) => {
    return socket.user || data.user || null;
};

/**
 * 獲取當前用戶ID的輔助函數
 */
const getCurrentUserId = (socket, data) => {
    return socket.userId || data.user?.id || null;
};


const io = new Server(server, {
    cors: {
        origin: ['https://science.sdlswuret.com'],
        methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
        credentials: true
    },
}); 

// Helper: build latest kanban data for a project (ordered columns and tasks)
async function buildKanbanData(projectId) {
    const kanbanRows = await Kanban.findAll({
        attributes: ['id', 'column'],
        where: { projectId }
    });
    if (!kanbanRows || kanbanRows.length === 0) return [];
    const { id: kanbanId, column: columnOrder } = kanbanRows[0];

    const columns = await Column.findAll({
        attributes: ['id', 'name', 'task'],
        where: { kanbanId }
    });

    // Map for quick lookup
    const colMap = new Map(columns.map(c => [c.id, c.toJSON ? c.toJSON() : c]));
    const orderedColumns = columnOrder
        .map(colId => colMap.get(colId))
        .filter(Boolean);

    // Attach ordered tasks per column
    for (let i = 0; i < orderedColumns.length; i++) {
        const col = orderedColumns[i];
        const taskIds = Array.isArray(col.task) ? col.task : [];
        if (taskIds.length === 0) {
            col.task = [];
            continue;
        }
        const tasks = await Task.findAll({
            attributes: ['id','title','content','labels','owner','assignees','images','files','createdAt','updatedAt'],
            where: { columnId: col.id }
        });
        const taskMap = new Map(tasks.map(t => [t.id, t.toJSON ? t.toJSON() : t]));
        col.task = taskIds.map(id => taskMap.get(id)).filter(Boolean);
    }

    return orderedColumns;
}

// Socket.io 身份驗證中間件
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth.token || socket.handshake.headers.accesstoken;
        
        if (!token) {
            console.log('Socket connection without token');
            return next(); // 允許連接但標記為未認證
        }

        const { verify } = require("jsonwebtoken");
        const validToken = verify(token, "importantsecret");
        
        if (validToken) {
            const user = await User.findByPk(validToken.id);
            socket.userId = validToken.id;
            socket.user = user;
            console.log(`Socket authenticated for user: ${user?.username} (ID: ${validToken.id})`);
        }
        
        next();
    } catch (error) {
        console.log('Socket authentication error:', error.message);
        next(); // 允許連接但標記為未認證
    }
});

app.use(cors({
    origin: ['https://science.sdlswuret.com'],
    methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true
}));

app.options('*', cors()); // 處理所有路由的預檢請求
app.set('io', io); // 確保在 socket.io 初始化後掛載
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
// 👇 確保 Express 解析 JSON
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));
// 靜態資源服務
app.use('/api/daily_file', express.static(path.join(__dirname, 'daily_file')));
console.log('Static file directory:', path.join(__dirname, 'daily_file'));


// 🔹 確保事件監聽器不會重複綁定
function ensureListener(socket, event, handler) {
    if (socket.listenerCount(event) === 0) {
        socket.on(event, handler);
    }
}

io.on("connection", (socket) => {
    console.log(`${socket.id} a user connected`);

    // 加入房間類型的事件，使用 `once()` 確保只執行一次
    socket.once("join_room", (data) => {
        socket.join(data);
        console.log(`${socket.id} joined room ${data}`);
    });

    socket.once("join_QuestionRoom", (roomId) => {
        socket.join(roomId);
        console.log(`Socket ${socket.id} joined QuestionRoom ${roomId}`);
    });

    socket.once("join_project", (data) => {
        socket.join(data);
        console.log(`${socket.id} joined project ${data}`);
    });

    //send message
    ensureListener(socket, "send_message", async (data) => {
        console.log(data);
        try {
            // 存儲消息到數據庫
            await Chatroom_message.create({
                message: data.message,
                author: data.author,
                userId: data.creator,
                projectId: data.room
            });
        } catch (error) {
            console.error("保存消息時出錯：", error);
        }
        socket.to(data.room).emit("receive_message", data);
    });
    // send QuestionMessage
    ensureListener(socket, "send_QuestionMessage", async (data) => {
        console.log("Question Message Received:", data);
        try {
            // 存儲消息到數據庫
            await QuestionMessage.create({
                message: data.message,
                author: data.author,
                questionId: data.questionId
            });
            // 發送消息到同一聊天室的其他用户

        } catch (error) {
            console.error("保存提问消息時出錯：", error);
        }
        socket.to(data.questionId).emit("receive_QuestionMessage", data);
    });
    // send rag_message
    ensureListener(socket, "rag_message", async (data) => {
        console.log("接收到的資料：", data); // 打印接收到的資料
        try {
            // 確保 creator 是有效的數字
            const userId = parseInt(data.creator) || 1;
            console.log("使用的 userId:", userId); // 記錄實際使用的 userId
            
            // 獲取用戶名稱，如果沒有則使用預設值
            const userName = data.userName || data.author || "未知用戶";
            console.log("使用的用戶名稱:", userName); // 記錄實際使用的用戶名稱
            
            // 獲取 sessionId，如果沒有則設為 null
            const sessionId = data.sessionId || null;
            console.log("使用的 sessionId:", sessionId); // 記錄實際使用的 sessionId
            
            // 獲取 RAGFlow session ID（從 RAGFlow 回應中提取）
            const ragflowSessionId = data.ragflowSessionId || null;
            console.log("使用的 RAGFlow sessionId:", ragflowSessionId);
            
            if (data.messageType === 'input') {
                // 當接收到 input_message 時，創建新的資料庫紀錄，並儲存其 ID
                const newMessage = await Rag_message.create({
                    input_message: data.message,  // 儲存 input_message
                    author: data.author,
                    userId: userId,  // 使用確認過的 userId
                    userName: userName,  // 儲存用戶名稱
                    sessionId: sessionId,  // 儲存 sessionId
                    // 儲存專案ID：優先使用 data.projectId，其次使用房間ID data.room
                    project_id: data.projectId || data.project_id || data.room || null
                });
    
                // 將訊息的 ID 返回前端，便於後續 response_message 更新
                socket.emit('input_stored', { id: newMessage.id });
            } else if (data.messageType === 'response') {
                // 當接收到 response_message 時，根據前端返回的 messageId 進行更新
                await Rag_message.update(
                    {
                        response_message: data.message,  // 更新 response_message
                        author: data.author || 'system',  // 如果未提供 author，設為 'system'
                        userName: userName,  // 更新用戶名稱
                        sessionId: sessionId,  // 更新 sessionId
                        ragflow_session_id: ragflowSessionId  // 更新 RAGFlow session ID
                    },
                    {
                        where: {
                            id: data.messageId,  // 根據 messageId 來匹配對應的 input_message
                            userId: userId  // 使用確認過的 userId
                        }
                    }
                );
            }
        } catch (error) {
            console.error("保存消息時出錯：", error);
        }
    
        // 將訊息發送到對應的房間
        if (data.room) {
            socket.to(data.room).emit("receive_rag_message", data);
        }
    });
    //create card
    socket.on("taskItemCreated", async (data) => {
        try {
            const { selectedcolumn, item, kanbanData, projectId, user } = data;
            // 優先使用 socket 中的用戶資訊，如果沒有則使用 data 中的
            const currentUser = socket.user || user;
            const extractedOwner = currentUser?.username || "未知";
            
            // 權限檢查
            const permissionCheck = await checkSocketWritePermission(socket.userId || user?.id, projectId, socket);
            if (!permissionCheck.hasPermission) {
                console.log(`🚫 用戶 ${extractedOwner} 嘗試創建卡片被拒絕: ${permissionCheck.error}`);
                socket.emit("taskCreationError", { 
                    message: permissionCheck.error,
                    code: permissionCheck.readOnly ? 'READ_ONLY_MODE' : 'INSUFFICIENT_PERMISSIONS'
                });
                return;
            }
            
            const columnId = kanbanData[selectedcolumn]?.id;

            const creatTask = await Task.create({
                title: item.title,
                content: item.content,
                labels: item.labels || [],
                assignees: item.assignees || [],
                owner: extractedOwner,  // 確保 owner 存在
                columnId: columnId,
            });
            console.log("creatTask", creatTask)
            
            const addIntoTaskArray = await Column.findByPk(creatTask.columnId)

            addIntoTaskArray.task = [...addIntoTaskArray.task, creatTask.id];

            await addIntoTaskArray.save()
                .then(() => console.log("success"))

            await Project.update({
                id: projectId
            }, {
                where: {
                    id: projectId
                }
            });

            // 廣播任務創建事件 - 只是告知任務已創建，讓前端刷新數據
            io.to(projectId).emit("taskItemCreated", {
                taskId: creatTask.id,
                columnId: columnId,
                projectId: projectId
            });
            
            io.to(projectId).emit("activityUpdate", {
                type: 'create',
                taskId: creatTask.id,
                taskTitle: creatTask.title,
                user: extractedOwner,
                timestamp: new Date(),
                columnName: kanbanData[selectedcolumn]?.name || '未知列表',
                taskDetails: {
                    content: creatTask.content,
                    labels: creatTask.labels,
                    assignees: creatTask.assignees
                }
            });
        } catch (error) {
            console.error("❌ 創建任務錯誤:", error);
        }
    });
    
    //update card
    ensureListener(socket, "cardUpdated", async (data) => {
        const { cardData, index, columnIndex, kanbanData, projectId, user } = data;
        try {
            const currentUser = getCurrentUser(socket, data);
            const changedBy = currentUser?.username || cardData.owner || "未知";
            
            // 權限檢查
            const permissionCheck = await checkSocketWritePermission(getCurrentUserId(socket, data), projectId, socket);
            if (!permissionCheck.hasPermission) {
                console.log(`🚫 用戶 ${changedBy} 嘗試更新卡片被拒絕: ${permissionCheck.error}`);
                socket.emit("taskUpdateError", { 
                    message: permissionCheck.error,
                    code: permissionCheck.readOnly ? 'READ_ONLY_MODE' : 'INSUFFICIENT_PERMISSIONS'
                });
                return;
            }
            
            // 取得原始資料以比較變更
            const originalTask = await Task.findByPk(cardData.id);

            // 使用交易同時更新 Task 與其關聯評論中的任務快照
            let updateTask;
            const t = await sequelize.transaction();
            try {
                updateTask = await Task.update({
                    ...cardData,
                    files: cardData.files || [], // 確保 files 欄位存在
                    images: cardData.images || [] // 確保 images 欄位存在
                }, {
                    where: { id: cardData.id },
                    transaction: t
                });

                // 若標題或內容有變更，同步更新關聯評論的反正規化快照
                if (originalTask && (originalTask.title !== cardData.title || originalTask.content !== cardData.content)) {
                    await Comment.update(
                        { task_title: cardData.title, task_content: cardData.content },
                        { where: { taskId: cardData.id }, transaction: t }
                    );
                }

                await t.commit();
            } catch (txErr) {
                await t.rollback();
                throw txErr;
            }
            
            // 記錄欄位變更
            if (originalTask) {
                await logFieldChanges(
                    originalTask.dataValues, 
                    cardData, 
                    cardData.id, 
                    changedBy, 
                    projectId
                );
            }
            
            await Project.update({
                id: projectId
            }, {
                where: {
                    id: projectId
                }
            });
            
            // 廣播任務更新事件與活動更新
            io.to(projectId).emit("taskItem", updateTask);
            
            // 取得任務所在的列表資訊
            const taskColumn = await Column.findOne({
                where: { id: originalTask.columnId },
                attributes: ['id', 'name']
            });
            
            // 取得最新的變更記錄以獲取詳細資訊
            const recentChanges = await TaskChangeLog.findAll({
                where: { 
                    taskId: cardData.id,
                    changeType: 'update'
                },
                order: [['createdAt', 'DESC']],
                limit: 5 // 取得最近5個變更記錄
            });
            
            io.to(projectId).emit("activityUpdate", {
                type: 'update',
                taskId: cardData.id,
                taskTitle: cardData.title,
                user: changedBy,
                timestamp: new Date(),
                columnName: taskColumn?.name || '未知列表',
                changes: recentChanges.map(change => ({
                    fieldName: change.fieldName,
                    oldValue: change.oldValue,
                    newValue: change.newValue,
                    description: change.description
                }))
            });
        } catch (error) {
            console.error("更新卡片失敗:", error);
        }
    });
    //Delete card
    ensureListener(socket, "cardDelete", async (data) => {
        const { cardData, index, columnIndex, kanbanData, projectId, user } = data;

        // Step 1: Retrieve the column and update it
        try {
            const currentUser = getCurrentUser(socket, data);
            const deletedBy = currentUser?.username || "未知";
            
            // 權限檢查
            const permissionCheck = await checkSocketWritePermission(getCurrentUserId(socket, data), projectId, socket);
            if (!permissionCheck.hasPermission) {
                console.log(`🚫 用戶 ${deletedBy} 嘗試刪除卡片被拒絕: ${permissionCheck.error}`);
                socket.emit("taskDeleteError", { 
                    message: permissionCheck.error,
                    code: permissionCheck.readOnly ? 'READ_ONLY_MODE' : 'INSUFFICIENT_PERMISSIONS'
                });
                return;
            }
            
            const column = await Column.findOne({
                where: {
                    id: columnIndex
                }
            });

            if (column) {
                console.log(`🗑️ 開始刪除任務 ${cardData.id} 及其相關檔案...`);
                
                // 先清理 MinIO 檔案
                try {
                    const { extractTaskFileNames, batchDeleteMinioFiles } = require('./utils/minioFileHelper');
                    
                    // 從前端傳來的 cardData 中提取檔案名稱
                    const fileNames = extractTaskFileNames(cardData);
                    
                    if (fileNames.length > 0) {
                        console.log(`📁 任務 ${cardData.id} 發現 ${fileNames.length} 個檔案需要刪除:`, fileNames);
                        const deleteResult = await batchDeleteMinioFiles(fileNames);
                        console.log(`🗑️ MinIO 檔案清理結果: ${deleteResult.success} 成功, ${deleteResult.failed} 失敗`);
                    } else {
                        console.log(`📁 任務 ${cardData.id} 沒有發現需要清理的檔案`);
                    }
                } catch (fileCleanupError) {
                    console.warn('⚠️ MinIO 檔案清理過程中發生錯誤，但繼續刪除任務:', fileCleanupError.message);
                }

                // 記錄任務刪除
                const changedBy = user?.username || cardData.owner || "未知";
                console.log(`🗑️ 任務刪除記錄: ${changedBy} 刪除了任務「${cardData.title}」`);
                
                // 寫入任務變更日誌
                try {
                    await logTaskChange({
                        taskId: cardData.id,
                        changeType: 'delete',
                        fieldName: null, // 刪除操作不涉及特定字段
                        oldValue: null,
                        newValue: null,
                        changedBy: changedBy,
                        projectId: projectId,
                        description: `刪除任務「${cardData.title}」`
                    });
                } catch (logError) {
                    console.error('⚠️ 任務變更日誌記錄失敗，但繼續處理刪除:', logError.message);
                }

                // Filter out the task ID from the tasks array
                const updatedTasks = column.task.filter(taskId => taskId !== cardData.id);

                // Update the column with the new tasks array
                await column.update({ task: updatedTasks });

                // Step 2: Destroy the task in the Task table after updating the column
                const updateTask = await Task.destroy({
                    where: {
                        id: cardData.id
                    }
                });
                await Project.update({
                    id: projectId
                }, {
                    where: {
                        id: projectId
                    }
                });
                
                console.log(`✅ 任務 ${cardData.id} 刪除完成`);
                
                // 廣播任務刪除事件與活動更新
                io.to(projectId).emit("taskItem", updateTask);
                io.to(projectId).emit("activityUpdate", {
                    type: 'delete',
                    taskId: cardData.id,
                    taskTitle: cardData.title,
                    user: changedBy,
                    timestamp: new Date(),
                    columnName: column.name,
                    taskDetails: {
                        content: cardData.content,
                        labels: cardData.labels,
                        assignees: cardData.assignees
                    }
                });

            } else {
                console.error('Column not found or column tasks undefined');
                // Optionally emit an error or handle it as necessary
            }
        } catch (error) {
            console.error('Error handling card delete:', error);
            // Handle errors and possibly emit error information to clients
        }
    });
    //drag card (minimal payload)
    ensureListener(socket, "cardItemDragged", async (data) => {
        const { destination, source, projectId, taskId, user } = data;
        
        // 權限檢查
        const draggedBy = user?.username || "未知";
        const permissionCheck = await checkSocketWritePermission(user?.id, projectId);
        if (!permissionCheck.hasPermission) {
            console.log(`🚫 用戶 ${draggedBy} 嘗試拖拽卡片被拒絕: ${permissionCheck.error}`);
            socket.emit("taskDragError", { 
                message: permissionCheck.error,
                code: permissionCheck.readOnly ? 'READ_ONLY_MODE' : 'INSUFFICIENT_PERMISSIONS'
            });
            return;
        }
        
        // 使用最小描述: columnId + index
        const sourceColumnId = parseInt(source.columnId);
        const destColumnId = parseInt(destination.columnId);
        
        console.log(`🔄 拖拽任務 ${taskId} 從列表 ${sourceColumnId} 移動到列表 ${destColumnId}`);

        // 載入來源與目標欄位
        const sourceColumn = await Column.findByPk(sourceColumnId);
        const destColumn = sourceColumnId === destColumnId ? sourceColumn : await Column.findByPk(destColumnId);
        if (!sourceColumn || !destColumn) {
            console.error(`❌ 找不到來源或目標欄位: source=${sourceColumnId}, dest=${destColumnId}`);
            return;
        }

        // 以欄位的 task 陣列為準進行重排
        const sourceTasks = Array.isArray(sourceColumn.task) ? [...sourceColumn.task] : [];
        const destTasks = sourceColumnId === destColumnId ? sourceTasks : (Array.isArray(destColumn.task) ? [...destColumn.task] : []);

        // 從來源移除
        const taskIndexInSource = sourceTasks.indexOf(parseInt(taskId));
        if (taskIndexInSource === -1 && source.index != null && source.index < sourceTasks.length) {
            // 後備依 index
            sourceTasks.splice(source.index, 1);
        } else if (taskIndexInSource > -1) {
            sourceTasks.splice(taskIndexInSource, 1);
        }

        // 插入到目標位置
        const insertAt = Math.max(0, Math.min(destination.index, destTasks.length));
        destTasks.splice(insertAt, 0, parseInt(taskId));

        // 記錄移動操作
        const srcName = sourceColumn.name;
        const dstName = destColumn.name;
        const changedBy = user?.username || '未知';
        // 只有當移動到不同欄位時才記錄
        if (sourceColumnId !== destColumnId) {
            console.log(`📝 任務移動記錄: 任務 ${taskId} 從 ${srcName} 移動到 ${dstName}`);

            // 取得任務標題以豐富描述
            let movedTaskTitle = undefined;
            try {
                const movedTask = await Task.findByPk(taskId);
                movedTaskTitle = movedTask?.title;
            } catch (e) {
                // 忽略取得標題的錯誤
            }
            try {
                await logTaskChange({
                    taskId: taskId,
                    changeType: 'move',
                    fieldName: 'column',
                    changedBy,
                    projectId: projectId,
                    oldValue: srcName,
                    newValue: dstName,
                    description: `將任務「${movedTaskTitle || taskId}」從「${srcName}」移動到「${dstName}」`
                });
            } catch (logError) {
                console.error('⚠️ 任務變更日誌記錄失敗，但繼續處理拖拽:', logError.message);
            }
        }

        // 更新數據庫 - 使用實際的 column ID
        try {
            // 更新來源與目標欄位的排序
            await Column.update({ task: sourceTasks }, { where: { id: sourceColumnId } });
            if (sourceColumnId !== destColumnId) {
                await Column.update({ task: destTasks }, { where: { id: destColumnId } });
                await Task.update({ columnId: destColumnId }, { where: { id: taskId } });
                console.log(`✅ 任務 ${taskId} 的 columnId 已更新為 ${destColumnId}`);
            } else {
                // 同欄位內移動
                await Column.update({ task: destTasks }, { where: { id: destColumnId } });
            }
            
            // 更新專案時間戳
            await Project.update({
                id: projectId
            }, {
                where: {
                    id: projectId
                }
            });
            
            console.log(`✅ 拖拽操作完成: 任務 ${taskId}`);
            
        } catch (error) {
            console.error('❌ 拖拽操作數據庫更新失敗:', error);
        }
        
        // 廣播更新給其他客戶端（以最新資料為準）
        const latest = await buildKanbanData(projectId);
        io.to(projectId).emit("dragtaskItem", latest);

        // 只有當移動到不同欄位時才廣播活動更新
        if (sourceColumnId !== destColumnId) {
            io.to(projectId).emit("activityUpdate", {
                type: 'move',
                taskId: taskId,
                taskTitle: undefined,
                user: changedBy,
                from: srcName,
                to: dstName,
                timestamp: new Date()
            });
        }
    });
    //create column
    ensureListener(socket, "ColumnCreated", async (data) => {
        try {
            const { projectId, newGroupName, user } = data;
            const createdBy = user?.username || "未知";
            
            // 權限檢查
            const permissionCheck = await checkSocketWritePermission(user?.id, projectId);
            if (!permissionCheck.hasPermission) {
                console.log(`🚫 用戶 ${createdBy} 嘗試創建列表被拒絕: ${permissionCheck.error}`);
                socket.emit("columnCreateError", { 
                    message: permissionCheck.error,
                    code: permissionCheck.readOnly ? 'READ_ONLY_MODE' : 'INSUFFICIENT_PERMISSIONS'
                });
                return;
            }
            
            // 依據 projectId 找到對應的 Kanban 記錄
            const kanbanRowForCreate = await Kanban.findOne({ where: { projectId } });
            if (!kanbanRowForCreate) {
                console.error(`❌ 找不到專案 ${projectId} 的 Kanban 記錄，無法建立列表`);
                socket.emit("columnCreateError", { message: 'Kanban not found' });
                return;
            }

            const createColumn = await Column.create({
                name: newGroupName,
                task: [],
                kanbanId: kanbanRowForCreate.id
            })

            kanbanRowForCreate.column = [...(kanbanRowForCreate.column || []), createColumn.id];
            await kanbanRowForCreate.save()
                .then(() => console.log("success"))
            // io.sockets.emit("ColumnCreatedSuccess", addIntoColumnArray);
            await Project.update({
                id: projectId
            }, {
                where: {
                    id: projectId
                }
            });

            io.to(projectId).emit("ColumnCreatedSuccess", kanbanRowForCreate);

            // 發送即時活動更新（顯示於 ActivityStream）
            io.to(projectId).emit("activityUpdate", {
                type: 'create',
                user: createdBy,
                timestamp: new Date(),
                description: `使用者 ${createdBy} 建立了新列表「${newGroupName}」`
            });

        } catch (error) {
            console.error("處理 ColumnCreated 時出錯：", error);
        }
    })
    //drag column - accept minimal payload { projectId, columnOrder }
    ensureListener(socket, "columnOrderChanged", async (data) => {
        const { projectId, columnOrder, kanbanData, kanbanId, user } = data;
        const changedBy = user?.username || "未知";
        
        // 權限檢查
        const roomProjectId = projectId || kanbanId; // backward compat
        const permissionCheck = await checkSocketWritePermission(user?.id, roomProjectId);
        if (!permissionCheck.hasPermission) {
            console.log(`🚫 用戶 ${changedBy} 嘗試變更列表順序被拒絕: ${permissionCheck.error}`);
            socket.emit("columnOrderChangeError", { 
                message: permissionCheck.error,
                code: permissionCheck.readOnly ? 'READ_ONLY_MODE' : 'INSUFFICIENT_PERMISSIONS'
            });
            return;
        }

        // 計算新的欄位順序（支援舊/新格式）
        let newOrder = [];
        if (Array.isArray(columnOrder)) {
            newOrder = columnOrder.map(id => parseInt(id));
        } else if (Array.isArray(kanbanData)) {
            newOrder = kanbanData.map(c => parseInt(c.id));
        }

        try {
            const kanbanRow = await Kanban.findOne({ where: { projectId: roomProjectId } });
            if (!kanbanRow) throw new Error('Kanban not found');
            await Kanban.update({ column: newOrder }, { where: { id: kanbanRow.id } });
            await Project.update({ id: roomProjectId }, { where: { id: roomProjectId } });

            // Emit latest full data
            const latest = await buildKanbanData(roomProjectId);
            io.to(roomProjectId).emit("columnOrderUpdated", latest);
            console.log("Columns updated successfully in Kanban table.");
        } catch (error) {
            console.error("Error updating columns in Kanban table:", error);
        }

        // 發送即時活動更新（顯示於 ActivityStream）
        io.to(roomProjectId).emit("activityUpdate", {
            type: 'update',
            user: changedBy,
            timestamp: new Date(),
            description: `使用者 ${changedBy} 調整了列表順序`
        });
    });
    //Delete column
    ensureListener(socket, "ColumnDelete", async (data) => {
        const { columnData, kanbanId } = data;
        // 從 socket 或傳入資料取得目前使用者
        const currentUser = getCurrentUser(socket, data);
        const deletedBy = currentUser?.username || "未知";
        
        // 權限檢查（優先使用 socket 上的 userId）
        const permissionCheck = await checkSocketWritePermission(getCurrentUserId(socket, data), kanbanId, socket);
        if (!permissionCheck.hasPermission) {
            console.log(`🚫 用戶 ${deletedBy} 嘗試刪除列表被拒絕: ${permissionCheck.error}`);
            socket.emit("columnDeleteError", { 
                message: permissionCheck.error,
                code: permissionCheck.readOnly ? 'READ_ONLY_MODE' : 'INSUFFICIENT_PERMISSIONS'
            });
            return;
        }
        
        // console.log("columnData:", columnData);
        // console.log("kanbanId:", kanbanId);

        try {
            // Step 1: Update the Kanban table by removing the column ID from the columns array
            // 注意：前端傳來的 kanbanId 實際上是 projectId
            const kanban = await Kanban.findOne({ where: { projectId: kanbanId } });

            if (kanban) {
                const updatedColumns = kanban.column.filter(columnId => columnId !== columnData.id);
                await kanban.update({ column: updatedColumns });

                // Step 2: Delete all tasks associated with the column
                try {
                    // 首先從 columnData.task 中提取所有任務的 ID（兼容 ID 與物件）
                    const rawTasks = Array.isArray(columnData.task) ? columnData.task : [];
                    const taskIds = rawTasks.map(t => (t && typeof t === 'object') ? t.id : t).filter(Boolean);
                    console.log(`🗑️ 開始刪除欄位 ${columnData.name} 中的 ${taskIds.length} 個任務及其檔案...`);

                    // 批量清理 MinIO 檔案
                    try {
                        const { extractTaskFileNames, batchDeleteMinioFiles } = require('./utils/minioFileHelper');
                        const allFileNames = [];
                        let tasksForCleanup = rawTasks;
                        // 若為 ID 陣列，從 DB 取回完整任務資料
                        if (tasksForCleanup.length > 0 && (typeof tasksForCleanup[0] !== 'object' || tasksForCleanup[0] === null)) {
                            tasksForCleanup = await Task.findAll({ where: { id: { [Op.in]: taskIds } } });
                        }
                        for (const task of tasksForCleanup) {
                            const taskFileNames = extractTaskFileNames(task);
                            allFileNames.push(...taskFileNames);
                        }

                        // 移除重複的檔案名
                        const uniqueFileNames = [...new Set(allFileNames)];
                        
                        if (uniqueFileNames.length > 0) {
                            console.log(`📁 欄位 ${columnData.name} 發現 ${uniqueFileNames.length} 個檔案需要刪除:`, uniqueFileNames);
                            const deleteResult = await batchDeleteMinioFiles(uniqueFileNames);
                            console.log(`🗑️ MinIO 檔案清理結果: ${deleteResult.success} 成功, ${deleteResult.failed} 失敗`);
                        } else {
                            console.log(`📁 欄位 ${columnData.name} 沒有發現需要清理的檔案`);
                        }
                    } catch (fileCleanupError) {
                        console.warn('⚠️ MinIO 檔案清理過程中發生錯誤，但繼續刪除任務:', fileCleanupError.message);
                    }

                    // 然后使用這些 ID 来删除 Task 表中的相關紀錄
                    const deleteTasks = await Task.destroy({
                        where: {
                            id: {
                                [Op.in]: taskIds // 使用 Op.in 来指定一组 ID
                            }
                        }
                    });

                    console.log(`✅ 已成功删除任務，任務ID:`, taskIds);
                } catch (error) {
                    console.error("删除任務時發生錯誤:", error);
                }

                // Step 3: Delete the column itself
                const deleteColumn = await Column.destroy({
                    where: {
                        id: columnData.id
                    }
                });
                await Project.update({
                    id: kanbanId
                }, {
                    where: {
                        id: kanbanId
                    }
                });
                // Emit the updated kanban and column info to all clients
                // io.sockets.emit("columnDeleted", { kanbanId, updatedColumns, deletedColumnId: columnData.id });
                io.to(kanbanId).emit("columnDeleted", { kanbanId, updatedColumns, deletedColumnId: columnData.id });

                console.log("Column and its tasks deleted successfully.");
            } else {
                console.error("Kanban not found with ID:", kanbanId);
                // Optionally emit an error or handle it as necessary
            }
        } catch (error) {
            console.error("Error handling column delete:", error);
            // Handle errors and possibly emit error information to clients
        }
    });
    //Create Submit
    ensureListener(socket, 'taskSubmitted', (data) => {
        console.log('Task submitted:', data);
        // 將事件廣播到所有連接的客戶端，除了發送消息的客戶端
        // io.sockets.emit("taskItems", addIntoTaskArray);

        socket.broadcast.emit('refreshKanban', data);
    });
    //create nodes
    ensureListener(socket, "nodeCreate", async (data) => {
        const { title, content, ideaWallId, owner, from_id, projectId, colorindex, user } = data;
        const createdBy = user?.username || owner || "未知";
        
        // 權限檢查
        const permissionCheck = await checkSocketWritePermission(user?.id, projectId);
        if (!permissionCheck.hasPermission) {
            console.log(`🚫 用戶 ${createdBy} 嘗試創建節點被拒絕: ${permissionCheck.error}`);
            socket.emit("nodeCreateError", { 
                message: permissionCheck.error,
                code: permissionCheck.readOnly ? 'READ_ONLY_MODE' : 'INSUFFICIENT_PERMISSIONS'
            });
            return;
        }
        try {
            const createdNode = await Node.create({
                title: title,
                content: content,
                ideaWallId: ideaWallId,
                owner: owner,
                colorindex: colorindex
            });

            // 記錄節點創建
            try {
                await logNodeChange({
                    nodeId: createdNode.id,
                    changeType: 'create',
                    changedBy: owner,
                    projectId: projectId,
                    description: `創建新節點「${createdNode.title}」`
                });
            } catch (logError) {
                console.warn('記錄節點創建失敗，但不影響主要功能:', logError);
            }

            if (from_id) {
                const nodeRelation = await Node_relation.create({
                    from_id: from_id,
                    to_id: createdNode.id,
                    ideaWallId: ideaWallId
                });
            }

            await Project.update({
                id: projectId
            }, {
                where: {
                    id: projectId
                }
            });

            // 廣播新節點到所有相關的客戶端
            io.to(projectId).emit("nodeUpdated", createdNode);
            console.log("已廣播新節點:", createdNode);
        } catch (error) {
            console.error("創建節點時發生錯誤:", error);
        }
    });
    //Update nodes
    ensureListener(socket, "nodeUpdate", async (data) => {
        const { title, content, id, projectId, owner, user } = data;
        const updatedBy = user?.username || owner || "未知";
        
        // 權限檢查
        const permissionCheck = await checkSocketWritePermission(user?.id, projectId);
        if (!permissionCheck.hasPermission) {
            console.log(`🚫 用戶 ${updatedBy} 嘗試更新節點被拒絕: ${permissionCheck.error}`);
            socket.emit("nodeUpdateError", { 
                message: permissionCheck.error,
                code: permissionCheck.readOnly ? 'READ_ONLY_MODE' : 'INSUFFICIENT_PERMISSIONS'
            });
            return;
        }
        try {
            // 取得原始資料以比較變更
            const originalNode = await Node.findByPk(id);
            
            const createdNode = await Node.update(
                {
                    title: title,
                    content: content
                },
                {
                    where: {
                        id: id
                    }
                }
            );

            // 記錄欄位變更
            if (originalNode) {
                try {
                    await logNodeFieldChanges(
                        originalNode.dataValues, 
                        { title, content }, 
                        id, 
                        owner || originalNode.owner, 
                        projectId
                    );
                } catch (logError) {
                    console.warn('記錄節點變更失敗，但不影響主要功能:', logError);
                }
            }

            await Project.update({
                id: projectId
            }, {
                where: {
                    id: projectId
                }
            });
            // io.sockets.emit("nodeUpdated", createdNode);
            io.to(projectId).emit("nodeUpdated", createdNode);

        } catch (error) {
            console.error("更新節點時發生錯誤:", error);
        }
    })
    //Delete nodes
    ensureListener(socket, "nodeDelete", async (data) => {
        const { id, projectId, owner, title, user } = data;
        const deletedBy = user?.username || owner || "未知";
        
        // 權限檢查
        const permissionCheck = await checkSocketWritePermission(user?.id, projectId);
        if (!permissionCheck.hasPermission) {
            console.log(`🚫 用戶 ${deletedBy} 嘗試刪除節點被拒絕: ${permissionCheck.error}`);
            socket.emit("nodeDeleteError", { 
                message: permissionCheck.error,
                code: permissionCheck.readOnly ? 'READ_ONLY_MODE' : 'INSUFFICIENT_PERMISSIONS'
            });
            return;
        }
        
        try {
            const deleteNode = await Node.destroy(
                {
                    where: {
                        id: id
                    }
                }
            );
            await Project.update({
                id: projectId
            }, {
                where: {
                    id: projectId
                }
            });
            io.sockets.emit("nodeUpdated", deleteNode);
            // io.to(projectId).emit("nodeUpdated", deleteNode);

        } catch (error) {
            console.error("刪除節點時發生錯誤:", error);
        }
    })
    // 廣播公告
    ensureListener(socket, "emitAnnouncement", async (data) => {
        console.log("收到公告廣播請求:", data);
        const { title, content, author, projectId } = data;

        try {
            // 儲存公告至資料庫
            const newAnnouncement = await Announcement.create({
                title,
                content,
                author,
                projectId: projectId === 'all' ? null : projectId,
            });

            console.log("公告已成功儲存並廣播:", newAnnouncement);

            // 廣播到所有用戶或特定房間
            if (projectId === 'all' || !projectId) {
                io.emit("receiveAnnouncement", newAnnouncement);
            } else {
                io.to(projectId.toString()).emit("receiveAnnouncement", newAnnouncement);
            }
        } catch (error) {
            console.error("公告儲存或廣播失敗:", error.message);
        }
    });

    socket.on("disconnect", () => {
        console.log(`${socket.id} a user disconnected`);
        socket.removeAllListeners();  // 這行確保所有監聽器被移除，防止記憶體洩漏
    });    
});

// 檔案上傳路由 - 使用 MinIO
app.post('/api/upload', uploadToMinio('files', 10), (req, res) => {
    console.log('MinIO uploaded files:', req.uploadedFiles);
    try {
        if (!req.uploadedFiles || req.uploadedFiles.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }

        const files = req.uploadedFiles.map((file) => ({
            url: file.url,
            fileName: file.fileName,
            originalName: file.originalName,
            mimeType: file.mimeType,
            size: file.size
        }));

        res.status(200).json({ 
            message: '檔案上傳成功',
            files 
        });
    } catch (error) {
        console.error('檔案上傳失敗:', error);
        res.status(500).json({ message: '檔案上傳失敗', error: error.message });
    }
});

app.post('/proxy/api/v1/chats/:chatId/sessions', async (req, res) => {
    try {
        const { chatId } = req.params;
        console.log("req.body", req.body)
        console.log("chatId", chatId)
        console.log("testingCHaTTTTTTTTTTT")
        const response = await axios.post(
            `https://140.115.126.193/api/v1/chats/${chatId}/sessions`,
            req.body,
            {
                headers: {
                    Authorization: `Bearer ${API_KEY}`,
                    "Content-Type": "application/json",
                },
                httpsAgent: agent, // 忽略證書驗證
            }
        );
        console.log("response", response)
        console.log("-----------------------------")
        res.json(response.data);
    } catch (error) {
        console.error("代理請求失敗 (sessions):", error.message);
        res.status(500).json({ message: "代理請求失敗", error: error.message });
    }
});

app.post('/proxy/api/v1/chats/:chatId/completions', async (req, res) => {
    try {
        const { chatId } = req.params;
        const response = await axios.post(
            `https://140.115.126.193/api/v1/chats/${chatId}/completions`,
            req.body,
            {
                headers: {
                    Authorization: `Bearer ${API_KEY}`,
                    "Content-Type": "application/json",
                },
                httpsAgent: agent, // 忽略證書驗證
            }
        );
        res.json(response.data);
    } catch (error) {
        console.error("代理請求失敗 (completions):", error.message);
        res.status(500).json({ message: "代理請求失敗", error: error.message });
    }
});

// 新增：代理 DELETE 請求用於刪除 RAGFlow 會話
app.delete('/proxy/api/v1/chats/:chatId/sessions/:sessionId', async (req, res) => {
    try {
        const { chatId, sessionId } = req.params;
        console.log("代理刪除會話請求 - chatId:", chatId, "sessionId:", sessionId);
        
        const response = await axios.delete(
            `https://140.115.126.193/api/v1/chats/${chatId}/sessions/${sessionId}`,
            {
                headers: {
                    Authorization: `Bearer ${API_KEY}`,
                    "Content-Type": "application/json",
                },
                httpsAgent: agent, // 忽略證書驗證
            }
        );
        
        console.log("RAGFlow 會話刪除成功:", response.data);
        res.json(response.data);
    } catch (error) {
        console.error("代理請求失敗 (delete sessions):", error.message);
        console.error("錯誤詳情:", error.response?.data);
        res.status(error.response?.status || 500).json({ 
            message: "代理請求失敗", 
            error: error.message,
            details: error.response?.data 
        });
    }
});

//api routes
app.use('/api/users', require('./routes/user'));
app.use('/api/projects', require('./routes/project'))
app.use('/api/kanbans', require('./routes/kanban'))
app.use('/api/ideaWall', require('./routes/ideaWall'))
app.use('/api/node', require('./routes/node'))
app.use('/api/daily', require('./routes/daily'))
app.use('/api/submit', require('./routes/submit'))
app.use('/api/stage', require('./routes/stage'))
app.use('/api/chatroom', require('./routes/chatroom'))
app.use('/api/question', require('./routes/question'))
app.use('/api/announcements', require('./routes/announcement'));
app.use('/api/rag_message', require('./routes/rag_message'));
app.use('/api/llm', require('./routes/llm'));
app.use('/api/file', require('./routes/file'));  // MinIO 檔案管理路由
app.use('/api', require('./routes/comments'));   // 任務評論/附件/按讚

//error handling
app.use((error, req, res, next) => {
    console.log(error);
    const status = error.statusCode || 500;
    const message = error.message;
    res.status(status).json({ message: message });
});

console.log('Models loaded:', Object.keys(sequelize.models));

// sync database
console.log("syncing database---------------------------------------------------------------------")
// sequelize.sync({ alter: true })  // {force:true} {alter:true}
//     .then(result => {
//         console.log("Database connected");
//         console.log("Database structure synced");
//         console.log("All tables created/recreated successfully");
//     })
//     .catch(err => {
//         console.log("Database sync error:", err);
//     });

server.listen(3000, () => {
    console.log("✅ 伺服器已啟動，監聽端口 3000");
    console.log("🔗 Socket.IO 已初始化並準備連接");
    console.log("📂 所有路由已加載完成");
});
