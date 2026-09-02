//controllers for project - Member Management
const Project = require('../../models/project')
const User = require('../../models/user')
const User_project = require('../../models/user_project');
const permissionCache = require('../../auth/permissionCache');
const sequelize = require('../../util/database');
const { logAudit } = require('../../services/auditService');
const apiCache = require('../../services/apiCache');

exports.inviteForProject = async (req, res) => {
    const referral_Code = req.body.referral_Code;
    const userId = req.body.userId;

    console.log('Referral Code:', referral_Code);
    console.log('User ID:', userId);

    if (!referral_Code) {
        console.log('Referral code is missing!');
        return res.status(400).json({ message: '請輸入邀請碼!' });
    }

    try {
        // 查找具有給定邀請碼的項目
        const referralProject = await Project.findOne({
            where: {
                referral_code: referral_Code
            }
        });

        // 檢查是否找到了項目
        if (!referralProject) {
            console.log('Project not found for referral code:', referral_Code);
            return res.status(404).json({ message: '邀請碼不存在!' });
        }
        // 找到用户
        const invitedUser = await User.findByPk(userId);
        if (!invitedUser) {
            return res.status(404).json({ message: 'User not found!' });
        }

        // H5: 使用 findOrCreate 防止 TOCTOU 競態條件
        const [, created] = await User_project.findOrCreate({
            where: {
                projectId: referralProject.id,
                userId: userId
            },
            defaults: {
                projectId: referralProject.id,
                userId: userId
            }
        });

        if (!created) {
            return res.status(400).json({ message: '你已經是此活動的其中一員!' });
        }

        // 成員關係改變，讓 socket 權限快取失效
        permissionCache.invalidatePair(userId, referralProject.id);

        console.log('Successfully invited user to project!');

        // 清除該學生的專案列表快取
        apiCache.delByPrefix(`projects:${userId}`);

        // 記錄審計事件（非阻塞）
        logAudit(req, {
            action: 'PROJECT_MEMBER_ADD',
            targetType: 'User',
            targetId: userId,
            projectId: referralProject.id,
            metadata: {
                projectName: referralProject.name,
                invitedUser: invitedUser.username,
                userId: userId,
                method: 'referral_code'
            }
        }).catch(err => {
            console.error('記錄審計事件失敗（成員加入）:', err);
        });

        // 成功邀請用戶加入項目
        return res.status(200).json({ message: '成功加入活動!' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error!' });
    }
};

exports.assignStudentsToGroup = async (req, res) => {
    const { studentIds, projectId } = req.body;

    try {
        const project = await Project.findByPk(projectId);
        if (!project) {
            return res.status(404).json({ message: '專案未找到' });
        }

        const students = await User.findAll({
            where: {
                id: studentIds,
                role: 'student'
            }
        });

        if (students.length !== studentIds.length) {
            return res.status(400).json({ message: '部分學生ID無效或學生不存在' });
        }

        // 將學生加入專案
        await project.addUsers(students);

        // 成員關係改變，讓 socket 權限快取失效
        permissionCache.invalidateProject(project.id);
        
        // 清除所有被分配學生的專案列表快取
        for (const sid of studentIds) {
            apiCache.delByPrefix(`projects:${sid}`);
        }

        // 記錄審計事件（非阻塞）
        logAudit(req, {
            action: 'PROJECT_MEMBER_ADD',
            targetType: 'User',
            targetId: null,
            projectId: projectId,
            metadata: {
                projectName: project.name,
                addedCount: students.length,
                studentIds: studentIds,
                studentNames: students.map(s => s.username),
                method: 'batch_assign'
            }
        }).catch(err => {
            console.error('記錄審計事件失敗（批量分配學生）:', err);
        });

        return res.status(200).json({ message: '學生成功分配到專案' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: '內部伺服器錯誤' });
    }
};

exports.getAllStudents = async (req, res) => {
    try {
        const students = await User.findAll({
            where: {
                role: 'student'
            }
        });
        res.status(200).json(students);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: '內部伺服器錯誤' });
    }
};

