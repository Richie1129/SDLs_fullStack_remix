//conrollers/announcement.js
const { Op } = require('sequelize');
const Announcement = require('../models/announcement');
const Project = require('../models/project');
const User = require('../models/user');
const { logAudit } = require('../services/auditService');

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
            if (projectId === 'all' || projectId === null) {
                finalProjectId = null; // 全域公告
            } else {
                // 轉換為整數並驗證專案是否存在
                finalProjectId = parseInt(projectId, 10);

                if (isNaN(finalProjectId)) {
                    return res.status(400).json({
                        message: '無效的專案 ID',
                        providedProjectId: projectId
                    });
                }

                // 驗證專案是否存在
                const project = await Project.findByPk(finalProjectId);
                if (!project) {
                    return res.status(404).json({
                        message: '指定的專案不存在',
                        projectId: finalProjectId
                    });
                }
            }
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

        // 記錄公告建立
        logAudit(req, {
            action: 'ANNOUNCEMENT_CREATE',
            targetType: 'announcement',
            targetId: newAnnouncement.id,
            metadata: {
                title,
                author,
                projectId: finalProjectId,
                isStudentMode,
                scope: isStudentMode ? 'student' : (finalProjectId ? 'project' : 'global')
            }
        }).catch(() => {});

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

// 刪除公告
exports.deleteAnnouncement = async (req, res) => {
    const { id } = req.params;

    try {
        // 從中間件獲取已驗證的公告（避免重複查詢）
        const announcement = req.announcementToDelete || await Announcement.findOne({ where: { id } });

        if (!announcement) {
            console.log(`❌ 找不到公告 ID: ${id}`);
            return res.status(404).json({ message: '找不到指定的公告' });
        }

        console.log('=== 刪除公告 ===');
        console.log('公告ID:', id);
        console.log('標題:', announcement.title);
        console.log('作者:', announcement.author);
        console.log('專案ID:', announcement.projectId);

        // 判斷公告類型
        let announcementType;
        if (announcement.projectId === null) {
            announcementType = 'global';
        } else if (announcement.projectId < 0) {
            announcementType = 'student';
        } else {
            announcementType = 'project';
        }

        // 記錄刪除前的審計日誌
        await logAudit(req, {
            action: 'ANNOUNCEMENT_DELETE',
            targetType: 'announcement',
            targetId: announcement.id,
            projectId: announcement.projectId > 0 ? announcement.projectId : null,
            result: 'success',
            metadata: {
                title: announcement.title,
                author: announcement.author,
                projectId: announcement.projectId,
                announcementType: announcementType,
                deletedAt: new Date().toISOString()
            }
        }).catch((auditError) => {
            console.error('❌ 記錄審計日誌失敗:', auditError);
        });

        // 刪除公告
        await announcement.destroy();

        console.log(`✅ 公告 ${id} 刪除成功`);
        console.log('==================');

        // Socket 廣播刪除事件
        const io = req.app.get('io');
        if (announcementType === 'global') {
            // 全域公告：廣播給所有人
            io.emit('announcementDeleted', { id: announcement.id });
        } else if (announcementType === 'student') {
            // 學生公告：只發送給特定學生
            const studentId = Math.abs(announcement.projectId);
            io.to(`user_${studentId}`).emit('announcementDeleted', { id: announcement.id });
        } else {
            // 專案公告：發送給專案成員
            io.to(announcement.projectId.toString()).emit('announcementDeleted', { id: announcement.id });
        }

        res.status(200).json({
            message: '公告刪除成功',
            deletedId: announcement.id
        });

    } catch (error) {
        console.error('❌ 刪除公告失敗:', error);

        // 記錄失敗的審計日誌
        await logAudit(req, {
            action: 'ANNOUNCEMENT_DELETE',
            targetType: 'announcement',
            targetId: id,
            result: 'failure',
            metadata: {
                error: error.message,
                stack: error.stack
            }
        }).catch(() => {});

        res.status(500).json({
            message: '刪除公告失敗',
            error: error.message
        });
    }
};

