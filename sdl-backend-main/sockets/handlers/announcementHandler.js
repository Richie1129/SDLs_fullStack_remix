const { SocketHandlerFactory } = require('../socketHandlers');
const { writeSocketErrorReport } = require('../../utils/errorHandler');
const Announcement = require('../../models/announcement');
const auditService = require('../../services/auditService');
const { canAccessProject, toPositiveInt } = require('../../middlewares/projectAccess');

/**
 * 公告相關 Socket 事件處理器
 */
class AnnouncementHandler {
    /**
     * 註冊所有公告相關的 Socket 事件
     */
    static registerEvents(io, socket) {
        // 廣播公告
        SocketHandlerFactory.registerSimpleEvent(
            socket,
            'emitAnnouncement',
            this.handleAnnouncementBroadcast
        );
    }

    /**
     * 處理公告廣播
     */
    static async handleAnnouncementBroadcast(data) {
        console.log("收到公告廣播請求:", data);

        // 角色檢查：只有教師可以發送公告
        if (this.socket.user?.role !== 'teacher') {
            console.warn(`非教師用戶嘗試發送公告: ${this.socket.user?.username || 'unknown'}`);
            this.socket.emit('announcementError', {
                message: '只有教師可以發送公告',
                code: 'INSUFFICIENT_ROLE'
            });
            return;
        }

        const { title, content, author, projectId, userId } = data;

        // 範圍檢查：指定專案時，教師必須是該專案的成員／指導教師（admin 不受限）；'all' 為全域公告
        const isGlobal = projectId === 'all' || !projectId;
        const targetProjectId = isGlobal ? null : toPositiveInt(projectId);
        if (!isGlobal && !targetProjectId) {
            this.socket.emit('announcementError', { message: '無效的專案 ID', code: 'INVALID_PROJECT_ID' });
            return;
        }
        if (targetProjectId && !(await canAccessProject(this.socket.user?.id, targetProjectId))) {
            console.warn(`教師嘗試對非自己指導的專案發送公告: user=${this.socket.user?.id} project=${targetProjectId}`);
            this.socket.emit('announcementError', {
                message: '只能對自己指導的專案發送公告',
                code: 'PERMISSION_DENIED'
            });
            return;
        }

        try {
            // 儲存公告至資料庫
            const newAnnouncement = await Announcement.create({
                title,
                content,
                author,
                projectId: targetProjectId,
            });

            console.log("公告已成功儲存:", newAnnouncement);

            // 廣播到所有用戶或特定房間
            if (isGlobal) {
                this.io.emit("receiveAnnouncement", newAnnouncement);
            } else {
                this.io.to(String(targetProjectId)).emit("receiveAnnouncement", newAnnouncement);
            }

            console.log(`✅ 公告廣播成功: ${title}`);
            
            // 記錄審計事件（非阻塞）
            const req = {
                user: { id: userId || null },
                ip: this.socket.handshake.address,
                headers: { 'user-agent': this.socket.handshake.headers['user-agent'] || 'socket-client' }
            };
            
            auditService.logAudit(req, {
                action: 'SOCKET_ANNOUNCEMENT_EMIT',
                targetType: 'Announcement',
                targetId: newAnnouncement.id,
                result: 'success',
                metadata: {
                    title: title,
                    author: author,
                    projectId: projectId === 'all' ? 'all' : projectId,
                    broadcast: projectId === 'all' || !projectId ? 'global' : 'project-specific'
                }
            }).catch(auditError => {
                console.error('記錄審計事件失敗（公告廣播）:', auditError);
            });

        } catch (error) {
            console.error("公告儲存或廣播失敗:", error.message);
            writeSocketErrorReport(error, 'emitAnnouncement', this.socket.user);
        }
    }
}

module.exports = AnnouncementHandler;