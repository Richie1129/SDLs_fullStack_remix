const { SocketHandlerFactory } = require('../socketHandlers');
const { writeSocketErrorReport } = require('../../utils/errorHandler');
const Announcement = require('../../models/announcement');
const auditService = require('../../services/auditService');

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
        const { title, content, author, projectId, userId } = data;

        try {
            // 儲存公告至資料庫
            const newAnnouncement = await Announcement.create({
                title,
                content,
                author,
                projectId: projectId === 'all' ? null : projectId,
            });

            console.log("公告已成功儲存:", newAnnouncement);

            // 廣播到所有用戶或特定房間
            if (projectId === 'all' || !projectId) {
                this.io.emit("receiveAnnouncement", newAnnouncement);
            } else {
                this.io.to(projectId.toString()).emit("receiveAnnouncement", newAnnouncement);
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
            writeSocketErrorReport(error, 'emitAnnouncement', socket.user);
        }
    }
}

module.exports = AnnouncementHandler;