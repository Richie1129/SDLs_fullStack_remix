const User = require('../models/user');
const Project = require('../models/project');
const UserProject = require('../models/user_project');
const permissionCache = require('./permissionCache');

// 專案權限判斷只需要這幾個欄位，不載入整個 Project row
const PROJECT_PERMISSION_ATTRIBUTES = ['id', 'mentorId', 'is_open_for_viewing', 'allowed_classes', 'school_id'];

/**
 * 統一權限守衛系統 - 消除重複的權限檢查邏輯
 * "好代碼沒有特殊情況" - Linus Torvalds
 *
 * 效能：每個 (userId, projectId) 的關係結果會放進 permissionCache（TTL 30 秒），
 * 命中時不查任何 DB；未命中時查 UserProject（複合主鍵）與 Project（最小欄位），
 * 若呼叫端已提供 user（例如握手時的 socket.user）就不再查 User。
 */
class PermissionGuard {
    /**
     * 檢查用戶是否有專案權限
     * @param {number} userId - 用戶ID
     * @param {number} projectId - 專案ID
     * @param {string} action - 操作類型 ('read'|'write')
     * @param {Object} [options]
     * @param {Object} [options.user] - 已載入的使用者（例如 socket.user），id 需與 userId 相符；提供時省去 User 查詢
     * @returns {Promise<{hasPermission: boolean, readOnly?: boolean, error?: string, user?: Object}>}
     */
    static async checkProjectPermission(userId, projectId, action = 'write', options = {}) {
        // 基本參數驗證
        if (!userId || !projectId) {
            return {
                hasPermission: false,
                error: '缺少用戶ID或專案ID'
            };
        }

        try {
            const providedUser = (options && options.user && String(options.user.id) === String(userId))
                ? options.user
                : null;

            // 先看快取，命中就完全不碰 DB
            let relation = permissionCache.get(userId, projectId);
            let user = providedUser;

            if (!relation) {
                // 平行查詢：使用者（若未提供）、成員關係、專案最小欄位
                const [fetchedUser, membership, project] = await Promise.all([
                    // 未命中時一律重查 User（每對 userId:projectId 最多 30 秒一次 PK 查詢），
                    // 避免握手時載入的 socket.user 在班級或學校異動後過期
                    User.findByPk(userId),
                    UserProject.findOne({
                        where: { userId, projectId },
                        attributes: ['userId']
                    }),
                    Project.findByPk(projectId, { attributes: PROJECT_PERMISSION_ATTRIBUTES })
                ]);

                user = fetchedUser;
                relation = this._buildRelation(user, project, !!membership);
                permissionCache.set(userId, projectId, relation);
            }

            const permissionResult = this._evaluateRelation(relation, action);

            // 附加使用者資訊供調用方使用（快取命中且未提供 user 時可能為 undefined）
            return {
                ...permissionResult,
                user: user || undefined
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
     * 把 user / project / 成員關係壓成可快取的最小資訊
     * @private
     */
    static _buildRelation(user, project, isMember) {
        if (!user) return { status: 'NO_USER' };
        if (!project) return { status: 'NO_PROJECT' };

        // 指導教師以 mentorId 外鍵比對，避免 username 異動導致關聯斷裂
        const isMentor = project.mentorId != null && Number(project.mentorId) === Number(user.id);

        // 觀摩權限：同校且班級在允許清單內（判斷式與原本完全相同，只多了 includes 存在性保護）
        const canView = !!(project.is_open_for_viewing &&
            project.allowed_classes &&
            project.school_id !== null &&
            project.school_id === user.school_id &&
            typeof project.allowed_classes.includes === 'function' &&
            project.allowed_classes.includes(user.class));

        return { status: 'OK', isMember: !!isMember, isMentor, canView };
    }

    /**
     * 依關係與操作類型評估權限（純函式，不查 DB）
     * @private
     */
    static _evaluateRelation(relation, action) {
        if (!relation || relation.status === 'NO_USER') {
            return { hasPermission: false, error: '用戶不存在' };
        }
        if (relation.status === 'NO_PROJECT') {
            return { hasPermission: false, error: '專案不存在' };
        }

        // 專案成員或指導教師：完全權限
        if (relation.isMember || relation.isMentor) {
            return { hasPermission: true, readOnly: false };
        }

        // 觀摩：只讀
        if (relation.canView) {
            if (action === 'read') {
                return { hasPermission: true, readOnly: true };
            }
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
     * 評估專案權限的核心邏輯（保留舊介面：接受含 users 的 project instance）
     * @param {Object} user - 用戶對象
     * @param {Object} project - 專案對象（需含 users）
     * @param {string} action - 操作類型
     * @private
     */
    static _evaluateProjectPermission(user, project, action) {
        const isMember = Array.isArray(project?.users) &&
            project.users.some(projectUser => Number(projectUser.id) === Number(user?.id));
        return this._evaluateRelation(this._buildRelation(user, project, isMember), action);
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

            const permissionCheck = await this.checkProjectPermission(userId, projectId, action, { user: socket.user });

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

            // 注意：req.user 是 JWT payload，沒有 school_id / class，不能當作完整 user 傳入
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
