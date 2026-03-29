const User = require('../models/user');
const Project = require('../models/project');

/**
 * 統一權限守衛系統 - 消除重複的權限檢查邏輯
 * "好代碼沒有特殊情況" - Linus Torvalds
 */
class PermissionGuard {
    /**
     * 檢查用戶是否有專案權限
     * @param {number} userId - 用戶ID
     * @param {number} projectId - 專案ID  
     * @param {string} action - 操作類型 ('read'|'write')
     * @returns {Promise<{hasPermission: boolean, readOnly?: boolean, error?: string, user?: Object, project?: Object}>}
     */
    static async checkProjectPermission(userId, projectId, action = 'write') {
        // 基本參數驗證
        if (!userId || !projectId) {
            return { 
                hasPermission: false, 
                error: '缺少用戶ID或專案ID' 
            };
        }

        try {
            // 平行查詢用戶和專案資訊（效能優化）
            const [user, project] = await Promise.all([
                User.findByPk(userId),
                Project.findByPk(projectId, {
                    include: [{
                        model: User,
                        through: { attributes: [] }
                    }]
                })
            ]);

            // 檢查實體存在性
            if (!user) {
                return { hasPermission: false, error: '用戶不存在' };
            }

            if (!project) {
                return { hasPermission: false, error: '專案不存在' };
            }

            // 權限檢查邏輯統一化
            const permissionResult = this._evaluateProjectPermission(user, project, action);
            
            // 附加用戶和專案資訊供調用方使用
            return {
                ...permissionResult,
                user,
                project
            };

        } catch (error) {
            console.error('權限檢查時發生錯誤:', error);
            return { 
                hasPermission: false, 
                error: '權限檢查時發生錯誤' 
            };
        }
    }

    /**
     * 評估專案權限的核心邏輯
     * @param {Object} user - 用戶對象
     * @param {Object} project - 專案對象
     * @param {string} action - 操作類型
     * @private
     */
    static _evaluateProjectPermission(user, project, action) {
        // 檢查是否為專案成員（完全權限）
        const isProjectMember = project.users.some(
            projectUser => projectUser.id === parseInt(user.id)
        );

        if (isProjectMember) {
            return { hasPermission: true, readOnly: false };
        }

        // 檢查是否為指導教師（以 mentorId 外鍵比對，避免 username 異動導致關聯斷裂）
        const isProjectMentor = project.mentorId === user.id;

        if (isProjectMentor) {
            return { hasPermission: true, readOnly: false };
        }

        // 檢查觀摩權限（只讀，同校且班級在允許清單內）
        const hasViewingPermission = project.is_open_for_viewing &&
            project.allowed_classes &&
            project.school_id !== null &&
            project.school_id === user.school_id &&
            project.allowed_classes.includes(user.class);

        if (hasViewingPermission) {
            // 對於讀取操作，允許觀摩用戶
            if (action === 'read') {
                return { hasPermission: true, readOnly: true };
            }
            // 對於寫入操作，拒絕並說明原因
            return { 
                hasPermission: false, 
                readOnly: true, 
                error: '觀摩模式下無法進行編輯操作' 
            };
        }

        // 無任何權限
        return { 
            hasPermission: false, 
            error: '無權限訪問此專案' 
        };
    }

    /**
     * Socket.IO 權限中介軟體
     * 為 Socket 事件提供統一的權限檢查
     * @param {string} action - 操作類型
     * @returns {Function} 中介軟體函數
     */
    static socketPermissionMiddleware(action = 'write') {
        return async (socket, data, next) => {
            const userId = socket.userId || data.user?.id;
            const projectId = data.projectId || data.kanbanId;

            const permissionCheck = await this.checkProjectPermission(userId, projectId, action);
            
            if (!permissionCheck.hasPermission) {
                const errorPayload = {
                    message: permissionCheck.error,
                    code: permissionCheck.readOnly ? 'READ_ONLY_MODE' : 'INSUFFICIENT_PERMISSIONS'
                };
                
                socket.emit(`${data.eventType || 'operation'}Error`, errorPayload);
                return; // 阻止事件處理
            }

            // 將權限資訊附加到 data 中供處理器使用
            data._permission = permissionCheck;
            next();
        };
    }

    /**
     * Express 路由權限中介軟體
     * @param {string} action - 操作類型
     * @returns {Function} Express 中介軟體函數
     */
    static httpPermissionMiddleware(action = 'write') {
        return async (req, res, next) => {
            const userId = req.userId || req.user?.id;
            const projectId = req.params.projectId || req.body.projectId;

            if (!userId) {
                return res.status(401).json({ error: '未認證的請求' });
            }

            const permissionCheck = await this.checkProjectPermission(userId, projectId, action);
            
            if (!permissionCheck.hasPermission) {
                return res.status(403).json({
                    error: permissionCheck.error,
                    code: permissionCheck.readOnly ? 'READ_ONLY_MODE' : 'INSUFFICIENT_PERMISSIONS'
                });
            }

            // 將權限資訊附加到 request 中
            req.permission = permissionCheck;
            next();
        };
    }

    /**
     * 創建用戶上下文（用於審計日誌）
     * @param {Object} socket - Socket 實例或 HTTP request
     * @param {Object} data - 資料對象
     * @returns {Object} 標準化的請求上下文
     */
    static createRequestContext(socket, data = {}) {
        // Socket.IO 上下文
        if (socket.id) {
            return {
                userId: socket.userId || data.user?.id,
                user: socket.user || data.user,
                headers: { 'user-agent': 'socket' },
                ip: socket.handshake?.address
            };
        }
        
        // HTTP 上下文
        return {
            userId: socket.userId || socket.user?.id,
            user: socket.user,
            headers: socket.headers,
            ip: socket.ip
        };
    }
}

module.exports = PermissionGuard;