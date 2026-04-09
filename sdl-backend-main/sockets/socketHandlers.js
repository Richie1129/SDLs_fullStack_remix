const PermissionGuard = require('../auth/PermissionGuard');
const { logAudit } = require('../services/auditService');

/**
 * Socket 事件處理器基礎類別
 * 消除重複的權限檢查和錯誤處理邏輯
 */
class BaseSocketHandler {
    constructor(io, socket) {
        this.io = io;
        this.socket = socket;
    }

    /**
     * 權限裝飾器 - 為所有需要權限的操作提供統一檢查
     * @param {string} action - 操作類型 ('read'|'write')
     * @param {Function} handler - 實際的事件處理函數
     */
    withPermission(action = 'write') {
        return async (data) => {
            const userId = this.socket.userId || data.user?.id;
            const projectId = data.projectId || data.kanbanId;

            try {
                const permissionCheck = await PermissionGuard.checkProjectPermission(userId, projectId, action);
                
                if (!permissionCheck.hasPermission) {
                    const errorPayload = {
                        message: permissionCheck.error,
                        code: permissionCheck.readOnly ? 'READ_ONLY_MODE' : 'INSUFFICIENT_PERMISSIONS'
                    };
                    
                    this.emitError(data.eventType || 'operation', errorPayload);
                    return;
                }

                // 將權限資訊和請求上下文附加到 data
                data._permission = permissionCheck;
                data._reqContext = PermissionGuard.createRequestContext(this.socket, data);
                
                return data;
            } catch (error) {
                console.error('權限檢查失敗:', error);
                this.emitError(data.eventType || 'operation', { 
                    message: '權限檢查時發生錯誤',
                    code: 'PERMISSION_CHECK_ERROR'
                });
                return null;
            }
        };
    }

    /**
     * 統一的錯誤發送方法
     */
    emitError(eventType, errorPayload) {
        // 支援多種錯誤事件名稱格式
        const errorEvents = [
            `${eventType}Error`,
            `${eventType}CreatedError`,  // 向後相容
            `${eventType}UpdateError`,
            `${eventType}DeleteError`
        ];

        errorEvents.forEach(event => {
            this.socket.emit(event, errorPayload);
        });
    }

    /**
     * 統一的成功發送方法
     */
    emitSuccess(eventType, successPayload) {
        // 支援多種成功事件名稱格式
        const successEvents = [
            `${eventType}Success`,
            `${eventType}CreatedSuccess`,  // 向後相容
            `${eventType}UpdateSuccess`,
            `${eventType}DeleteSuccess`
        ];

        successEvents.forEach(event => {
            this.socket.emit(event, successPayload);
        });
    }

    /**
     * H14: 驗證 Column 確實屬於聲稱的 projectId
     * 防止使用者操作不屬於自己專案的資源
     */
    async verifyColumnProject(columnId, claimedProjectId) {
        const Column = require('../models/column');
        const Kanban = require('../models/kanban');
        const column = await Column.findByPk(columnId, {
            include: [{ model: Kanban, attributes: ['id', 'projectId'] }]
        });
        if (!column || !column.kanban) return false;
        return String(column.kanban.projectId) === String(claimedProjectId);
    }

    /**
     * H14: 驗證 Task 確實屬於聲稱的 projectId
     */
    async verifyTaskProject(taskId, claimedProjectId) {
        const Task = require('../models/task');
        const Column = require('../models/column');
        const Kanban = require('../models/kanban');
        const task = await Task.findByPk(taskId, {
            include: [{
                model: Column,
                include: [{ model: Kanban, attributes: ['id', 'projectId'] }]
            }]
        });
        if (!task || !task.column || !task.column.kanban) return false;
        return String(task.column.kanban.projectId) === String(claimedProjectId);
    }

    /**
     * 廣播到專案房間
     */
    broadcastToProject(projectId, event, data) {
        // 修正：io.to() 已包含房間內所有 socket（含發送者），不需額外 emit
        // 若發送者未加入房間，先確保加入
        if (!this.socket.rooms.has(String(projectId))) {
            this.socket.join(String(projectId));
        }
        this.io.to(String(projectId)).emit(event, data);
    }

    /**
     * 獲取當前用戶資訊
     */
    getCurrentUser(data) {
        return this.socket.user || data.user;
    }

    /**
     * 獲取當前用戶名稱
     */
    getCurrentUsername(data) {
        const user = this.getCurrentUser(data);
        return user?.username || "未知";
    }

    /**
     * 記錄審計日誌
     */
    async logAudit(action, targetType, targetId, projectId, metadata = {}) {
        try {
            await logAudit({
                userId: this.socket.userId,
                user: this.socket.user,
                headers: { 'user-agent': 'socket' },
                ip: this.socket.handshake?.address
            }, {
                action,
                targetType,
                targetId,
                projectId,
                metadata
            });
        } catch (error) {
            console.warn('審計日誌記錄失敗:', error.message);
        }
    }
}

/**
 * Socket 事件處理器工廠
 * 提供一致的事件註冊介面
 */
class SocketHandlerFactory {
    static create(io, socket) {
        return new BaseSocketHandler(io, socket);
    }

    /**
     * 註冊帶權限檢查的事件處理器
     * @param {Object} socket - Socket 實例
     * @param {string} eventName - 事件名稱
     * @param {Function} handler - 處理函數
     * @param {string} permission - 權限類型 ('read'|'write')
     */
    static registerProtectedEvent(socket, eventName, handler, permission = 'write') {
        const baseHandler = this.create(socket.io || socket.server, socket);
        
        socket.on(eventName, async (data) => {
            data.eventType = eventName;
            const authorizedData = await baseHandler.withPermission(permission)(data);
            if (authorizedData) {
                await handler.call(baseHandler, authorizedData);
            }
        });
    }

    /**
     * 註冊簡單事件處理器（無權限檢查）
     */
    static registerSimpleEvent(socket, eventName, handler) {
        const baseHandler = this.create(socket.io || socket.server, socket);
        
        socket.on(eventName, async (data) => {
            await handler.call(baseHandler, data);
        });
    }

    /**
     * 註冊一次性事件（如加入房間）
     */
    static registerOnceEvent(socket, eventName, handler) {
        const baseHandler = this.create(socket.io || socket.server, socket);
        
        socket.once(eventName, async (data) => {
            await handler.call(baseHandler, data);
        });
    }
}

module.exports = { 
    BaseSocketHandler, 
    SocketHandlerFactory 
};