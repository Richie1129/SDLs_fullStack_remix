const { verify } = require("jsonwebtoken");
const User = require('../models/user');
const config = require('../config');

// 處理器
const TaskHandler = require('./handlers/taskHandler');
const ColumnHandler = require('./handlers/columnHandler');
const MessageHandler = require('./handlers/messageHandler');
const NodeHandler = require('./handlers/nodeHandler');
const AnnouncementHandler = require('./handlers/announcementHandler');

/**
 * Socket.IO 管理器 - 統一管理所有 Socket 事件和認證
 * 重構自 index.js 巨型檔案
 */
class SocketManager {
    constructor(io) {
        this.io = io;
        this.setupAuthentication();
        this.setupConnectionHandler();
    }

    /**
     * 設定 Socket.IO 身份驗證中間件
     */
    setupAuthentication() {
        this.io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token || socket.handshake.headers.accesstoken;
                
                if (!token) {
                    console.log('Socket connection without token');
                    return next(); // 允許連接但標記為未認證
                }

                const validToken = verify(token, config.jwt.secret);
                
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
    }

    /**
     * 設定連接處理器
     */
    setupConnectionHandler() {
        this.io.on("connection", (socket) => {
            console.log(`${socket.id} user connected`);

            // 註冊所有事件處理器
            this.registerAllHandlers(socket);

            // 設定斷線處理
            socket.on("disconnect", () => {
                console.log(`${socket.id} user disconnected`);
                socket.removeAllListeners(); // 防止記憶體洩漏
            });
        });
    }

    /**
     * 註冊所有事件處理器
     * 這裡統一管理所有 Socket 事件，避免散布在各處
     */
    registerAllHandlers(socket) {
        try {
            // 任務相關事件
            TaskHandler.registerEvents(this.io, socket);
            
            // 欄位相關事件
            ColumnHandler.registerEvents(this.io, socket);
            
            // 訊息相關事件
            MessageHandler.registerEvents(this.io, socket);
            
            // 節點相關事件
            NodeHandler.registerEvents(this.io, socket);
            
            // 公告相關事件
            AnnouncementHandler.registerEvents(this.io, socket);

            console.log(`✅ 所有事件處理器已註冊完成 for ${socket.id}`);

        } catch (error) {
            console.error('註冊事件處理器時發生錯誤:', error);
        }
    }

    /**
     * 獲取連接統計資訊
     */
    getStats() {
        const sockets = this.io.sockets.sockets;
        const authenticatedUsers = Array.from(sockets.values())
            .filter(socket => socket.userId)
            .map(socket => ({
                id: socket.userId,
                username: socket.user?.username,
                socketId: socket.id
            }));

        return {
            totalConnections: sockets.size,
            authenticatedUsers: authenticatedUsers.length,
            users: authenticatedUsers
        };
    }

    /**
     * 廣播到所有連接
     */
    broadcast(event, data) {
        this.io.emit(event, data);
    }

    /**
     * 廣播到特定房間
     */
    broadcastToRoom(roomId, event, data) {
        this.io.to(roomId).emit(event, data);
    }
}

module.exports = SocketManager;