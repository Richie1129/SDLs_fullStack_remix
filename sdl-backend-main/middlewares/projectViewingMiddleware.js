const Project = require('../models/project');
const User = require('../models/user');

/**
 * 跨班觀摩權限檢查中介層
 * 檢查用戶對專案的訪問權限，並設定是否為只讀模式
 */
const checkProjectViewingPermission = async (req, res, next) => {
    try {
        const projectId = req.params.projectId || req.query.projectId || req.body.projectId;
        const userId = req.userId; // 假設從 AuthMiddleware 取得

        if (!projectId) {
            return res.status(400).json({ message: '缺少專案 ID' });
        }

        if (!userId) {
            return res.status(401).json({ message: '未認證用戶' });
        }

        // 取得專案資訊和用戶資訊
        const project = await Project.findByPk(projectId, {
            include: [{
                model: User,
                through: { attributes: [] }
            }]
        });

        if (!project) {
            return res.status(404).json({ message: '專案不存在' });
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: '用戶不存在' });
        }

        if (process.env.NODE_ENV === 'development') {
            console.log('=== 權限檢查 Debug ===');
            console.log('projectId:', projectId, 'userId:', userId);
        }

        // 檢查用戶是否為專案成員
        const isProjectMember = project.users.some(projectUser => projectUser.id === parseInt(userId));

        if (isProjectMember) {
            req.readOnly = false;
            req.hasViewingPermission = true;
            return next();
        }

        // 檢查是否為指導教師（以 mentorId 外鍵比對，避免 username 異動導致關聯斷裂）
        const isProjectMentor = project.mentorId === user.id;

        if (isProjectMentor) {
            req.readOnly = true;
            req.hasViewingPermission = true;
            return next();
        }

        // 檢查是否有跨班觀摩權限（同校且班級在允許清單內）
        const hasViewingPermission = project.is_open_for_viewing &&
            project.allowed_classes &&
            project.school_id !== null &&
            project.school_id === user.school_id &&
            project.allowed_classes.includes(user.class);

        if (hasViewingPermission) {
            req.readOnly = true;
            req.hasViewingPermission = true;
            return next();
        }
        return res.status(403).json({ 
            message: '無權限訪問此專案',
            code: 'INSUFFICIENT_PERMISSIONS'
        });

    } catch (error) {
        console.error('權限檢查錯誤:', error);
        return res.status(500).json({ 
            message: '權限檢查時發生錯誤'
        });
    }
};

/**
 * 檢查是否為教師角色的中介層
 */
const checkTeacherRole = async (req, res, next) => {
    try {
        const userId = req.userId;
        const user = await User.findByPk(userId);

        if (!user || user.role !== 'teacher') {
            return res.status(403).json({ 
                message: '僅限教師操作',
                code: 'TEACHER_ONLY' 
            });
        }

        next();
    } catch (error) {
        console.error('教師權限檢查錯誤:', error);
        return res.status(500).json({ 
            message: '權限檢查時發生錯誤'
        });
    }
};

/**
 * 檢查是否為專案創建者或教師的中介層
 */
const checkProjectOwnerOrTeacher = async (req, res, next) => {
    try {
        const projectId = req.params.projectId || req.params.id;
        const userId = req.userId;

        const user = await User.findByPk(userId);
        
        // 如果是教師，直接通過
        if (user.role === 'teacher') {
            return next();
        }

        // 檢查是否為專案成員（假設專案成員都有管理權限）
        const project = await Project.findByPk(projectId, {
            include: [{
                model: User,
                through: { attributes: [] }
            }]
        });

        if (!project) {
            return res.status(404).json({ message: '專案不存在' });
        }

        const isProjectMember = project.users.some(projectUser => projectUser.id === parseInt(userId));
        
        if (!isProjectMember) {
            return res.status(403).json({ 
                message: '僅限專案成員或教師操作',
                code: 'PROJECT_MEMBER_OR_TEACHER_ONLY' 
            });
        }

        next();
    } catch (error) {
        console.error('專案權限檢查錯誤:', error);
        return res.status(500).json({ 
            message: '權限檢查時發生錯誤'
        });
    }
};

/**
 * 檢查只讀模式權限的中介層
 * 如果用戶處於只讀模式（跨班觀摩），則阻止所有寫入操作
 *
 * 例外：
 * - 個人日誌/個人提交：創建者可以編輯自己的資源
 * - 小組日誌/專案提交：專案的所有成員都可以編輯
 */
const checkWritePermission = async (req, res, next) => {
    try {
        const userId = parseInt(req.userId);
        // 如果用戶已經在 checkProjectViewingPermission 中被確認為專案成員（readOnly = false），直接放行
        // 注意：指導教師是 readOnly = true，不會在此通過
        if (req.readOnly === false && req.hasViewingPermission === true) {
            return next();
        }

        // 處理 daily 相關操作（個人/小組日誌）
        if (req.dailyRecord && userId) {
            const projectId = req.dailyRecord.projectId;

            // 重新查詢專案成員資訊（確保資料正確）
            const project = await Project.findByPk(projectId, {
                include: [{
                    model: User,
                    through: { attributes: [] }
                }]
            });

            if (project) {
                const projectMemberIds = project.users ? project.users.map(u => u.id) : [];
                const isProjectMember = projectMemberIds.includes(userId);

                if (isProjectMember) {
                    return next();
                }

                if (req.dailyRecord.userId === userId) {
                    return next();
                }
            }
        }

        // 處理 submit 相關操作
        if (req.submitRecord && userId) {
            const projectId = req.submitRecord.projectId;

            // 重新查詢專案成員資訊
            const project = await Project.findByPk(projectId, {
                include: [{
                    model: User,
                    through: { attributes: [] }
                }]
            });

            if (project) {
                const projectMemberIds = project.users ? project.users.map(u => u.id) : [];
                const isProjectMember = projectMemberIds.includes(userId);

                if (isProjectMember) {
                    return next();
                }

                if (req.submitRecord.userId === userId) {
                    return next();
                }
            }
        }

        return res.status(403).json({
            message: '沒有權限進行此操作',
            code: 'WRITE_PERMISSION_DENIED'
        });
    } catch (error) {
        console.error('寫入權限檢查錯誤:', error);
        return res.status(500).json({
            message: '權限檢查時發生錯誤',
            error: error.message
        });
    }
};

module.exports = {
    checkProjectViewingPermission,
    checkTeacherRole,
    checkProjectOwnerOrTeacher,
    checkWritePermission
};
