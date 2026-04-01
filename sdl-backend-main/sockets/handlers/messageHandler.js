const { SocketHandlerFactory } = require('../socketHandlers');
const { writeSocketErrorReport } = require('../../utils/errorHandler');
const Chatroom_message = require('../../models/chatroom_message');
const Rag_message = require('../../models/rag_message');
const QuestionMessage = require('../../models/question_message');
const auditService = require('../../services/auditService');

/**
 * 訊息相關 Socket 事件處理器
 */
class MessageHandler {
    /**
     * 註冊所有訊息相關的 Socket 事件
     */
    static registerEvents(io, socket) {
        // 一般聊天訊息
        SocketHandlerFactory.registerSimpleEvent(
            socket,
            'send_message',
            this.handleChatMessage
        );

        // 問答訊息
        SocketHandlerFactory.registerSimpleEvent(
            socket,
            'send_QuestionMessage',
            this.handleQuestionMessage
        );

        // RAG 訊息
        SocketHandlerFactory.registerSimpleEvent(
            socket,
            'rag_message',
            this.handleRagMessage
        );

        // 房間相關事件
        SocketHandlerFactory.registerSimpleEvent(socket, 'join_room', this.handleJoinRoom);
        SocketHandlerFactory.registerSimpleEvent(socket, 'join_QuestionRoom', this.handleJoinQuestionRoom);
        SocketHandlerFactory.registerSimpleEvent(socket, 'join_project', this.handleJoinProject);
    }

    /**
     * 處理一般聊天訊息
     */
    static async handleChatMessage(data) {
        console.log('收到聊天訊息:', data);
        
        try {
            // 存儲訊息到資料庫
            await Chatroom_message.create({
                message: data.message,
                author: data.author,
                userId: data.creator,
                projectId: data.room
            });
            
            // 記錄審計事件（非阻塞）
            const req = {
                user: { id: data.creator },
                ip: this.socket.handshake.address,
                headers: { 'user-agent': this.socket.handshake.headers['user-agent'] || 'socket-client' }
            };
            
            auditService.logAudit(req, {
                action: 'SOCKET_MESSAGE_SENT',
                targetType: 'Message',
                targetId: null,
                result: 'success',
                metadata: {
                    projectId: data.room,
                    author: data.author,
                    messageLength: data.message ? data.message.length : 0
                }
            }).catch(auditError => {
                console.error('記錄審計事件失敗（聊天訊息）:', auditError);
            });
        } catch (error) {
            console.error("保存訊息時出錯：", error);
            writeSocketErrorReport(error, 'send_message', socket.user);
        }

        // 廣播訊息到房間
        this.socket.to(data.room).emit("receive_message", data);
    }

    /**
     * 處理問答訊息
     */
    static async handleQuestionMessage(data) {
        console.log("收到問答訊息:", data);
        
        try {
            // 存儲訊息到資料庫
            await QuestionMessage.create({
                message: data.message,
                author: data.author,
                questionId: data.questionId
            });
            
            // 記錄審計事件（非阻塞）
            const req = {
                user: { id: data.creator || null },
                ip: this.socket.handshake.address,
                headers: { 'user-agent': this.socket.handshake.headers['user-agent'] || 'socket-client' }
            };
            
            auditService.logAudit(req, {
                action: 'SOCKET_QUESTION_MESSAGE_SENT',
                targetType: 'QuestionMessage',
                targetId: data.questionId,
                result: 'success',
                metadata: {
                    questionId: data.questionId,
                    author: data.author,
                    messageLength: data.message ? data.message.length : 0
                }
            }).catch(auditError => {
                console.error('記錄審計事件失敗（問答訊息）:', auditError);
            });
        } catch (error) {
            console.error("保存問答訊息時出錯：", error);
            writeSocketErrorReport(error, 'send_QuestionMessage', socket.user);
        }

        // 發送訊息到同一聊天室的其他用戶
        this.socket.to(data.questionId).emit("receive_QuestionMessage", data);
    }

    /**
     * 處理 RAG 訊息
     */
    static async handleRagMessage(data) {
        console.log("收到 RAG 訊息：", data);
        
        try {
            // 確保 creator 是有效的數字
            const userId = parseInt(data.creator) || 1;
            const userName = data.userName || data.author || "未知用戶";
            const sessionId = data.sessionId || null;
            const ragflowSessionId = data.ragflowSessionId || null;
            
            console.log(`處理 RAG 訊息 - 用戶: ${userName} (${userId}), 會話: ${sessionId}`);
            
            if (data.messageType === 'input') {
                // 當接收到 input_message 時，創建新的資料庫紀錄
                const newMessage = await Rag_message.create({
                    input_message: data.message,
                    author: data.author,
                    userId: userId,
                    userName: userName,
                    sessionId: sessionId,
                    project_id: data.projectId || data.project_id || data.room || null
                });

                // 將訊息的 ID 返回前端，便於後續 response_message 更新
                this.socket.emit('input_stored', { id: newMessage.id });
                
                // 記錄審計事件（非阻塞） - RAG 輸入訊息
                const req = {
                    user: { id: userId },
                    ip: this.socket.handshake.address,
                    headers: { 'user-agent': this.socket.handshake.headers['user-agent'] || 'socket-client' }
                };
                
                auditService.logAudit(req, {
                    action: 'SOCKET_RAG_MESSAGE_SENT',
                    targetType: 'RagMessage',
                    targetId: newMessage.id,
                    result: 'success',
                    metadata: {
                        messageType: 'input',
                        projectId: data.projectId || data.project_id || data.room || null,
                        sessionId: sessionId,
                        userName: userName,
                        messageLength: data.message ? data.message.length : 0
                    }
                }).catch(auditError => {
                    console.error('記錄審計事件失敗（RAG 輸入訊息）:', auditError);
                });
                
            } else if (data.messageType === 'response') {
                // 當接收到 response_message 時，根據前端返回的 messageId 進行更新
                // ✅ 儲存 reference 和 externalLinks
                await Rag_message.update(
                    {
                        response_message: data.message,
                        author: data.author || 'system',
                        userName: userName,
                        sessionId: sessionId,
                        ragflow_session_id: ragflowSessionId,
                        reference_data: data.reference || null,
                        external_links: data.externalLinks || null
                    },
                    {
                        where: {
                            id: data.messageId,
                            userId: userId
                        }
                    }
                );
                
                console.log(`✅ 已儲存 reference_data 和 external_links 到資料庫 (messageId: ${data.messageId})`);
                
                // 記錄審計事件（非阻塞） - RAG 回應訊息
                const req = {
                    user: { id: userId },
                    ip: this.socket.handshake.address,
                    headers: { 'user-agent': this.socket.handshake.headers['user-agent'] || 'socket-client' }
                };
                
                auditService.logAudit(req, {
                    action: 'SOCKET_RAG_MESSAGE_SENT',
                    targetType: 'RagMessage',
                    targetId: data.messageId,
                    result: 'success',
                    metadata: {
                        messageType: 'response',
                        sessionId: sessionId,
                        ragflowSessionId: ragflowSessionId,
                        userName: userName,
                        hasReference: !!data.reference,
                        hasExternalLinks: !!data.externalLinks,
                        messageLength: data.message ? data.message.length : 0
                    }
                }).catch(auditError => {
                    console.error('記錄審計事件失敗（RAG 回應訊息）:', auditError);
                });
            }
        } catch (error) {
            console.error("保存 RAG 訊息時出錯：", error);
            writeSocketErrorReport(error, 'rag_message', socket.user);
        }

        // 將訊息發送到對應的房間
        if (data.room) {
            this.socket.to(data.room).emit("receive_rag_message", data);
        }
    }

    /**
     * 處理加入房間
     */
    static async handleJoinRoom(roomId) {
        this.socket.join(roomId);
        console.log(`${this.socket.id} 加入房間 ${roomId}`);
    }

    /**
     * 處理加入問答房間
     */
    static async handleJoinQuestionRoom(roomId) {
        this.socket.join(roomId);
        console.log(`Socket ${this.socket.id} 加入問答房間 ${roomId}`);
    }

    /**
     * 處理加入專案
     */
    static async handleJoinProject(projectId) {
        this.socket.join(projectId);
        console.log(`${this.socket.id} 加入專案 ${projectId}`);
    }
}

module.exports = MessageHandler;