/**
 * Phase 2 Socket.IO 審計追蹤測試腳本
 * 測試項目：
 * 1. Socket.IO 聊天訊息審計追蹤 (SOCKET_MESSAGE_SENT)
 * 2. Socket.IO 問答訊息審計追蹤 (SOCKET_QUESTION_MESSAGE_SENT)
 * 3. Socket.IO RAG 訊息審計追蹤 - 輸入 (SOCKET_RAG_MESSAGE_SENT)
 * 4. Socket.IO RAG 訊息審計追蹤 - 回應 (SOCKET_RAG_MESSAGE_SENT)
 * 5. Socket.IO 公告廣播審計追蹤 (SOCKET_ANNOUNCEMENT_EMIT)
 */

require('dotenv').config();
const io = require('socket.io-client');
const { Sequelize, Op } = require('sequelize');
const path = require('path');

// 設定資料庫連線
const sequelize = new Sequelize(
    process.env.PG_NAME || 'postgres',
    process.env.PG_USER || 'postgres',
    process.env.PG_PASSWORD || 'postgres',
    {
        host: process.env.PG_HOST || 'localhost',
        port: process.env.PG_PORT || 5432,
        dialect: 'postgres',
        logging: false
    }
);

// 定義資料庫模型（僅查詢用）
const AuditEvent = sequelize.define('audit_event', {
    id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
    timestamp: { type: Sequelize.DATE, allowNull: false },
    actorId: { type: Sequelize.BIGINT },
    actorRole: { type: Sequelize.TEXT },
    actorName: { type: Sequelize.TEXT },
    action: { type: Sequelize.TEXT, allowNull: false },
    targetType: { type: Sequelize.TEXT, allowNull: false },
    targetId: { type: Sequelize.TEXT },
    projectId: { type: Sequelize.BIGINT },
    requestId: { type: Sequelize.TEXT },
    ip: { type: Sequelize.STRING },
    userAgent: { type: Sequelize.TEXT },
    source: { type: Sequelize.TEXT, defaultValue: 'server' },
    metadata: { type: Sequelize.JSONB }
}, {
    tableName: 'audit_events',
    timestamps: true
});

const ChatroomMessage = sequelize.define('chatroom_message', {
    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    message: Sequelize.TEXT,
    author: Sequelize.STRING,
    userId: Sequelize.INTEGER,
    projectId: Sequelize.INTEGER
}, {
    tableName: 'chatroom_messages',
    timestamps: true
});

const QuestionMessage = sequelize.define('question_message', {
    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    message: Sequelize.TEXT,
    author: Sequelize.STRING,
    questionId: Sequelize.INTEGER
}, {
    tableName: 'question_messages',
    timestamps: true
});

const RagMessage = sequelize.define('rag_message', {
    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    input_message: Sequelize.TEXT,
    response_message: Sequelize.TEXT,
    author: Sequelize.STRING,
    userId: Sequelize.INTEGER,
    userName: Sequelize.STRING,
    sessionId: Sequelize.STRING,
    project_id: Sequelize.INTEGER
}, {
    tableName: 'rag_messages',
    timestamps: true
});

const Announcement = sequelize.define('announcement', {
    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    title: Sequelize.STRING,
    content: Sequelize.TEXT,
    author: Sequelize.STRING,
    projectId: Sequelize.INTEGER
}, {
    tableName: 'announcements',
    timestamps: true
});

// 測試配置
const TEST_CONFIG = {
    serverUrl: 'http://localhost:3000',
    testUserId: 999, // 測試用戶 ID
    testProjectId: 888, // 測試專案 ID
    testQuestionId: 777, // 測試問題 ID
    testSessionId: 'test-session-' + Date.now()
};

// 全局測試狀態
let testResults = [];
let socket = null;

// Helper: 等待時間
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: 連接 Socket.IO
async function connectSocket() {
    return new Promise((resolve, reject) => {
        socket = io(TEST_CONFIG.serverUrl, {
            transports: ['websocket'],
            reconnection: false
        });
        
        socket.on('connect', () => {
            console.log('✅ Socket.IO 連線成功');
            resolve(socket);
        });
        
        socket.on('connect_error', (error) => {
            console.error('❌ Socket.IO 連線失敗:', error.message);
            reject(error);
        });
        
        setTimeout(() => reject(new Error('Socket 連線超時')), 5000);
    });
}

// Helper: 記錄測試結果
function logTestResult(testName, passed, details = '') {
    testResults.push({ testName, passed, details });
    const icon = passed ? '✅' : '❌';
    console.log(`${icon} ${testName}: ${details}`);
}

// Helper: 查詢審計事件
async function queryAuditEvent(action, targetType = null, metadata = {}) {
    await delay(500); // 等待審計事件寫入
    
    const whereCondition = {
        action,
        actorId: TEST_CONFIG.testUserId,
        timestamp: {
            [Op.gte]: new Date(Date.now() - 10000) // 最近 10 秒內
        }
    };
    
    if (targetType) {
        whereCondition.targetType = targetType;
    }
    
    const events = await AuditEvent.findAll({
        where: whereCondition,
        order: [['timestamp', 'DESC']]
    });
    
    return events;
}

// 測試 1: Socket.IO 聊天訊息
async function test1_chatMessage() {
    console.log('\n📝 測試 1: Socket.IO 聊天訊息審計追蹤');
    
    try {
        const testMessage = {
            message: 'Phase 2 Test Message at ' + new Date().toISOString(),
            author: 'TestUser',
            creator: TEST_CONFIG.testUserId,
            room: TEST_CONFIG.testProjectId
        };
        
        // 發送聊天訊息
        socket.emit('send_message', testMessage);
        
        // 等待處理
        await delay(1000);
        
        // 查詢審計事件
        const auditEvents = await queryAuditEvent('SOCKET_MESSAGE_SENT', 'Message');
        
        if (auditEvents.length > 0) {
            const event = auditEvents[0];
            const hasCorrectMetadata = event.metadata.projectId === TEST_CONFIG.testProjectId
                && event.metadata.author === 'TestUser';
            
            logTestResult(
                '聊天訊息審計追蹤',
                hasCorrectMetadata,
                `找到 ${auditEvents.length} 筆審計事件，metadata 正確: ${hasCorrectMetadata}`
            );
        } else {
            logTestResult('聊天訊息審計追蹤', false, '未找到審計事件');
        }
    } catch (error) {
        logTestResult('聊天訊息審計追蹤', false, `錯誤: ${error.message}`);
    }
}

// 測試 2: Socket.IO 問答訊息
async function test2_questionMessage() {
    console.log('\n📝 測試 2: Socket.IO 問答訊息審計追蹤');
    
    try {
        const testMessage = {
            message: 'Phase 2 Question Test at ' + new Date().toISOString(),
            author: 'TestUser',
            creator: TEST_CONFIG.testUserId,
            questionId: TEST_CONFIG.testQuestionId
        };
        
        // 發送問答訊息
        socket.emit('send_QuestionMessage', testMessage);
        
        // 等待處理
        await delay(1000);
        
        // 查詢審計事件
        const auditEvents = await queryAuditEvent('SOCKET_QUESTION_MESSAGE_SENT', 'QuestionMessage');
        
        if (auditEvents.length > 0) {
            const event = auditEvents[0];
            const hasCorrectMetadata = event.metadata.questionId === TEST_CONFIG.testQuestionId
                && event.metadata.author === 'TestUser';
            
            logTestResult(
                '問答訊息審計追蹤',
                hasCorrectMetadata,
                `找到 ${auditEvents.length} 筆審計事件，metadata 正確: ${hasCorrectMetadata}`
            );
        } else {
            logTestResult('問答訊息審計追蹤', false, '未找到審計事件');
        }
    } catch (error) {
        logTestResult('問答訊息審計追蹤', false, `錯誤: ${error.message}`);
    }
}

// 測試 3: Socket.IO RAG 訊息 - 輸入
async function test3_ragMessageInput() {
    console.log('\n📝 測試 3: Socket.IO RAG 訊息審計追蹤 - 輸入');
    
    try {
        const testMessage = {
            message: 'Phase 2 RAG Input Test at ' + new Date().toISOString(),
            author: 'TestUser',
            userName: 'TestUser',
            creator: TEST_CONFIG.testUserId,
            messageType: 'input',
            sessionId: TEST_CONFIG.testSessionId,
            projectId: TEST_CONFIG.testProjectId,
            room: TEST_CONFIG.testProjectId
        };
        
        // 監聽輸入儲存回應
        let inputStoredId = null;
        socket.once('input_stored', (data) => {
            inputStoredId = data.id;
            console.log(`📌 RAG 輸入訊息 ID: ${inputStoredId}`);
        });
        
        // 發送 RAG 輸入訊息
        socket.emit('rag_message', testMessage);
        
        // 等待處理
        await delay(1000);
        
        // 查詢審計事件
        const auditEvents = await queryAuditEvent('SOCKET_RAG_MESSAGE_SENT', 'RagMessage');
        
        // 篩選 input 類型的事件
        const inputEvents = auditEvents.filter(e => e.metadata.messageType === 'input');
        
        if (inputEvents.length > 0) {
            const event = inputEvents[0];
            const hasCorrectMetadata = event.metadata.sessionId === TEST_CONFIG.testSessionId
                && event.metadata.messageType === 'input'
                && event.metadata.userName === 'TestUser';
            
            logTestResult(
                'RAG 輸入訊息審計追蹤',
                hasCorrectMetadata,
                `找到 ${inputEvents.length} 筆審計事件，metadata 正確: ${hasCorrectMetadata}`
            );
            
            // 儲存 ID 供測試 4 使用
            TEST_CONFIG.testRagMessageId = inputStoredId || event.targetId;
        } else {
            logTestResult('RAG 輸入訊息審計追蹤', false, '未找到審計事件');
        }
    } catch (error) {
        logTestResult('RAG 輸入訊息審計追蹤', false, `錯誤: ${error.message}`);
    }
}

// 測試 4: Socket.IO RAG 訊息 - 回應
async function test4_ragMessageResponse() {
    console.log('\n📝 測試 4: Socket.IO RAG 訊息審計追蹤 - 回應');
    
    if (!TEST_CONFIG.testRagMessageId) {
        logTestResult('RAG 回應訊息審計追蹤', false, '缺少 messageId（測試 3 失敗）');
        return;
    }
    
    try {
        const testMessage = {
            message: 'Phase 2 RAG Response Test: This is an AI response.',
            author: 'AIBot',
            userName: 'TestUser',
            creator: TEST_CONFIG.testUserId,
            messageType: 'response',
            messageId: TEST_CONFIG.testRagMessageId,
            sessionId: TEST_CONFIG.testSessionId,
            ragflowSessionId: 'ragflow-' + TEST_CONFIG.testSessionId,
            reference: [{ title: 'Test Reference', content: 'Test Content' }],
            externalLinks: ['https://example.com/test']
        };
        
        // 發送 RAG 回應訊息
        socket.emit('rag_message', testMessage);
        
        // 等待處理
        await delay(1000);
        
        // 查詢審計事件
        const auditEvents = await queryAuditEvent('SOCKET_RAG_MESSAGE_SENT', 'RagMessage');
        
        // 篩選 response 類型的事件
        const responseEvents = auditEvents.filter(e => e.metadata.messageType === 'response');
        
        if (responseEvents.length > 0) {
            const event = responseEvents[0];
            const hasCorrectMetadata = event.metadata.sessionId === TEST_CONFIG.testSessionId
                && event.metadata.messageType === 'response'
                && event.metadata.hasReference === true
                && event.metadata.hasExternalLinks === true;
            
            logTestResult(
                'RAG 回應訊息審計追蹤',
                hasCorrectMetadata,
                `找到 ${responseEvents.length} 筆審計事件，metadata 正確: ${hasCorrectMetadata}`
            );
        } else {
            logTestResult('RAG 回應訊息審計追蹤', false, '未找到審計事件');
        }
    } catch (error) {
        logTestResult('RAG 回應訊息審計追蹤', false, `錯誤: ${error.message}`);
    }
}

// 測試 5: Socket.IO 公告廣播
async function test5_announcementBroadcast() {
    console.log('\n📝 測試 5: Socket.IO 公告廣播審計追蹤');
    
    try {
        const testAnnouncement = {
            title: 'Phase 2 Test Announcement',
            content: 'This is a test announcement for Phase 2 at ' + new Date().toISOString(),
            author: 'TestAdmin',
            userId: TEST_CONFIG.testUserId,
            projectId: 'all' // 全域公告
        };
        
        // 監聽公告接收
        let receivedAnnouncement = false;
        socket.once('receiveAnnouncement', (data) => {
            receivedAnnouncement = true;
            console.log(`📌 收到公告廣播: ${data.title}`);
        });
        
        // 發送公告廣播
        socket.emit('emitAnnouncement', testAnnouncement);
        
        // 等待處理
        await delay(1000);
        
        // 查詢審計事件
        const auditEvents = await queryAuditEvent('SOCKET_ANNOUNCEMENT_EMIT', 'Announcement');
        
        if (auditEvents.length > 0) {
            const event = auditEvents[0];
            const hasCorrectMetadata = event.metadata.title === 'Phase 2 Test Announcement'
                && event.metadata.author === 'TestAdmin'
                && event.metadata.broadcast === 'global';
            
            logTestResult(
                '公告廣播審計追蹤',
                hasCorrectMetadata && receivedAnnouncement,
                `找到 ${auditEvents.length} 筆審計事件，metadata 正確: ${hasCorrectMetadata}，廣播接收: ${receivedAnnouncement}`
            );
        } else {
            logTestResult('公告廣播審計追蹤', false, '未找到審計事件');
        }
    } catch (error) {
        logTestResult('公告廣播審計追蹤', false, `錯誤: ${error.message}`);
    }
}

// 清理測試資料
async function cleanupTestData() {
    console.log('\n🧹 清理測試資料...');
    
    try {
        // 刪除測試的聊天訊息
        const deletedChatMessages = await ChatroomMessage.destroy({
            where: {
                userId: TEST_CONFIG.testUserId,
                createdAt: {
                    [Op.gte]: new Date(Date.now() - 60000) // 最近 1 分鐘內
                }
            }
        });
        
        // 刪除測試的問答訊息
        const deletedQuestionMessages = await QuestionMessage.destroy({
            where: {
                questionId: TEST_CONFIG.testQuestionId,
                createdAt: {
                    [Op.gte]: new Date(Date.now() - 60000)
                }
            }
        });
        
        // 刪除測試的 RAG 訊息
        const deletedRagMessages = await RagMessage.destroy({
            where: {
                userId: TEST_CONFIG.testUserId,
                sessionId: TEST_CONFIG.testSessionId
            }
        });
        
        // 刪除測試的公告
        const deletedAnnouncements = await Announcement.destroy({
            where: {
                author: 'TestAdmin',
                title: { [Op.like]: 'Phase 2 Test%' }
            }
        });
        
        console.log(`✅ 清理完成: ${deletedChatMessages} 聊天訊息, ${deletedQuestionMessages} 問答訊息, ${deletedRagMessages} RAG 訊息, ${deletedAnnouncements} 公告`);
    } catch (error) {
        console.error('❌ 清理測試資料失敗:', error.message);
    }
}

// 主測試流程
async function runTests() {
    console.log('🚀 開始執行 Phase 2 Socket.IO 審計追蹤測試\n');
    console.log('測試配置:', TEST_CONFIG);
    
    try {
        // 連線資料庫
        await sequelize.authenticate();
        console.log('✅ 資料庫連線成功\n');
        
        // 連接 Socket.IO
        await connectSocket();
        
        // 執行測試
        await test1_chatMessage();
        await test2_questionMessage();
        await test3_ragMessageInput();
        await test4_ragMessageResponse();
        await test5_announcementBroadcast();
        
        // 生成測試報告
        console.log('\n' + '='.repeat(60));
        console.log('📊 測試結果摘要');
        console.log('='.repeat(60));
        
        const passedTests = testResults.filter(r => r.passed).length;
        const totalTests = testResults.length;
        const passRate = ((passedTests / totalTests) * 100).toFixed(1);
        
        testResults.forEach((result, index) => {
            const icon = result.passed ? '✅' : '❌';
            console.log(`${index + 1}. ${icon} ${result.testName}`);
            if (result.details) {
                console.log(`   ${result.details}`);
            }
        });
        
        console.log('\n' + '='.repeat(60));
        console.log(`通過率: ${passedTests}/${totalTests} (${passRate}%)`);
        console.log('='.repeat(60) + '\n');
        
        // 清理測試資料
        await cleanupTestData();
        
        // 關閉連線
        if (socket) {
            socket.disconnect();
            console.log('✅ Socket.IO 連線已關閉');
        }
        
        await sequelize.close();
        console.log('✅ 資料庫連線已關閉');
        
        // 退出
        process.exit(passedTests === totalTests ? 0 : 1);
        
    } catch (error) {
        console.error('❌ 測試執行失敗:', error);
        
        if (socket) {
            socket.disconnect();
        }
        
        await sequelize.close();
        process.exit(1);
    }
}

// 執行測試
runTests();
