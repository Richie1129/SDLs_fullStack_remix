const { SocketHandlerFactory } = require('../socketHandlers');
const Announcement = require('../../models/announcement');

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
        const { title, content, author, projectId } = data;

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

        } catch (error) {
            console.error("公告儲存或廣播失敗:", error.message);
        }
    }
}

module.exports = AnnouncementHandler;