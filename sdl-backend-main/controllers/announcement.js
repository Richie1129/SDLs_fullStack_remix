//conrollers/announcement.js
const { Op } = require('sequelize');
const Announcement = require('../models/announcement');
const Project = require('../models/project');
const User = require('../models/user');

// 發佈公告
exports.createAnnouncement = async (req, res) => {
    try {
        const { title, content, author, projectId } = req.body;

        console.log("接收到的請求數據:", { title, content, author, projectId });

        if (!title || !content || !author || projectId === undefined) {
            console.log("缺少必要字段:", { title, content, author, projectId });
            return res.status(400).json({ message: '缺少必要欄位', missingFields: { title, content, author, projectId } });
        }

        // 檢查是否為學生模式
        const isStudentMode = typeof projectId === 'string' && projectId.startsWith('student_');
        let finalProjectId;

        if (isStudentMode) {
            // 學生模式：提取學生ID
            const studentId = projectId.replace('student_', '');
            console.log("學生模式，目標學生ID:", studentId);
            
            // 驗證學生是否存在
            const student = await User.findByPk(studentId);
            if (!student) {
                return res.status(404).json({ message: '指定的學生不存在' });
            }
            
            // 在學生模式下，我們將 projectId 設為負數的學生ID，用於區分
            finalProjectId = -parseInt(studentId);
        } else {
            // 專案模式：正常處理
            finalProjectId = projectId === 'all' ? null : projectId;
        }

        const newAnnouncement = await Announcement.create({
            title,
            content,
            author,
            projectId: finalProjectId,
        });

        if (newAnnouncement) {
            console.log("公告成功儲存至資料庫:", newAnnouncement);
        } else {
            console.error("公告儲存至資料庫失敗: 未返回新記錄");
        }

        // Socket 廣播邏輯
        if (isStudentMode) {
            // 學生模式：只發送給特定學生
            const studentId = projectId.replace('student_', '');
            console.log(`向學生 ${studentId} 發送公告`);
            req.app.get('io').to(`user_${studentId}`).emit('receiveAnnouncement', newAnnouncement);
        } else if (!finalProjectId) {
            // 全域公告：發送給所有人
            req.app.get('io').emit('receiveAnnouncement', newAnnouncement);
        } else {
            // 特定專案公告：發送給專案成員
            req.app.get('io').to(finalProjectId.toString()).emit('receiveAnnouncement', newAnnouncement);
        }

        res.status(201).json({ message: '公告發布成功', announcement: newAnnouncement });
    } catch (error) {
        console.error("公告儲存失敗，出錯資訊:", error.message, error.stack);
        res.status(500).json({ message: '公告發布失敗', error: error.message, stack: error.stack });
    }
};

// 獲取公告
exports.getAnnouncements = async (req, res) => {
    try {
        const { projectId } = req.query;
        const userId = req.query.userId || req.headers['user-id']; // 可以從查詢參數或headers獲取

        console.log("正在加載公告，projectId:", projectId, "userId:", userId);

        let whereCondition = {};
        
        if (projectId && projectId !== 'all') {
            // 獲取特定專案的公告 + 全域公告 + 發給當前用戶的個人公告
            const conditions = [
                { projectId: projectId }, // 專案公告
                { projectId: null }        // 全域公告
            ];
            
            // 如果有用戶ID，也包含發給該用戶的個人公告
            if (userId) {
                conditions.push({ projectId: -parseInt(userId) }); // 個人公告
            }
            
            whereCondition = { [Op.or]: conditions };
        } else {
            // 如果是總覽頁面或沒有指定專案，顯示所有公告（但排除個人公告）
            if (userId) {
                whereCondition = {
                    [Op.or]: [
                        { projectId: { [Op.gte]: 0 } }, // 專案公告（包含 null）
                        { projectId: null },            // 全域公告
                        { projectId: -parseInt(userId) } // 該用戶的個人公告
                    ]
                };
            }
        }

        const announcements = await Announcement.findAll({
            where: whereCondition,
            order: [['createdAt', 'DESC']],
        });

        console.log("公告列表加載成功:", announcements);
        res.status(200).json({ announcements });
    } catch (error) {
        console.error('無法加載公告:', error);
        res.status(500).json({ message: '載入公告失敗', error: error.message });
    }
};

