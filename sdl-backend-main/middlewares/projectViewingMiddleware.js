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

        console.log('=== 權限檢查 Debug ===');
        console.log('projectId:', projectId);
        console.log('userId:', userId);
        console.log('user.username:', user.username);
        console.log('user.class:', user.class);
        console.log('project.mentor:', project.mentor);
        console.log('project.is_open_for_viewing:', project.is_open_for_viewing);
        console.log('project.allowed_classes:', project.allowed_classes);
        console.log('project members:', project.users.map(u => u.id));

        // 檢查用戶是否為專案成員
        const isProjectMember = project.users.some(projectUser => projectUser.id === parseInt(userId));
        console.log('isProjectMember:', isProjectMember);

        if (isProjectMember) {
            // 專案成員擁有完整權限
            req.readOnly = false;
            req.hasViewingPermission = true;
            console.log('權限通過：專案成員');
            return next();
        }

        // 檢查是否為指導教師
        const isProjectMentor = project.mentor === user.username;
        console.log('isProjectMentor:', isProjectMentor);

        if (isProjectMentor) {
            // 指導教師擁有完整權限
            req.readOnly = false;
            req.hasViewingPermission = true;
            console.log('權限通過：指導教師');
            return next();
        }

        // 檢查是否有跨班觀摩權限
        const hasViewingPermission = project.is_open_for_viewing && 
            project.allowed_classes && 
            project.allowed_classes.includes(user.class);
        console.log('hasViewingPermission:', hasViewingPermission);

        if (hasViewingPermission) {
            // 非成員但有觀摩權限 - 只讀模式
            req.readOnly = true;
            req.hasViewingPermission = true;
            console.log('權限通過：跨班觀摩');
            return next();
        }

        // 無任何權限
        console.log('權限被拒絕：無任何權限');
        return res.status(403).json({ 
            message: '無權限訪問此專案',
            code: 'INSUFFICIENT_PERMISSIONS'
        });

    } catch (error) {
        console.error('權限檢查錯誤:', error);
        return res.status(500).json({ 
            message: '權限檢查時發生錯誤',
            error: error.message 
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
            message: '權限檢查時發生錯誤',
            error: error.message 
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
            message: '權限檢查時發生錯誤',
            error: error.message 
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
        // 如果前面的 checkProjectViewingPermission 設置了 readOnly 標誌
        if (req.readOnly === true) {
            const userId = parseInt(req.userId);

            // 處理 daily 相關操作（個人/小組日誌）
            if (req.dailyRecord && userId) {
                const projectId = req.dailyRecord.projectId;

                // 檢查用戶是否為該日誌所屬專案的成員
                const project = await Project.findByPk(projectId, {
                    include: [{
                        model: User,
                        through: { attributes: [] }
                    }]
                });

                if (project) {
                    const isProjectMember = project.users.some(u => u.id === userId);

                    if (isProjectMember) {
                        console.log('權限通過：專案成員編輯日誌');
                        return next();
                    }

                    // 個人日誌：創建者可以編輯（即使不是當前專案成員）
                    if (req.dailyRecord.userId === userId) {
                        console.log('權限通過：日誌創建者編輯自己的日誌');
                        return next();
                    }
                }
            }

            // 處理 submit 相關操作
            if (req.submitRecord && userId) {
                const projectId = req.submitRecord.projectId;

                // 檢查用戶是否為該提交所屬專案的成員
                const project = await Project.findByPk(projectId, {
                    include: [{
                        model: User,
                        through: { attributes: [] }
                    }]
                });

                if (project) {
                    const isProjectMember = project.users.some(u => u.id === userId);

                    if (isProjectMember) {
                        console.log('權限通過：專案成員編輯提交');
                        return next();
                    }

                    // 個人提交：創建者可以編輯
                    if (req.submitRecord.userId === userId) {
                        console.log('權限通過：提交創建者編輯自己的提交');
                        return next();
                    }
                }
            }

            return res.status(403).json({
                message: '觀摩模式下無法進行編輯操作',
                code: 'READ_ONLY_MODE'
            });
        }

        next();
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
