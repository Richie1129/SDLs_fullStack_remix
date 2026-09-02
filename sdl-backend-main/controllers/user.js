const { Op } = require('sequelize');
const User = require('../models/user');
const permissionCache = require('../auth/permissionCache');
const Project = require('../models/project');
const School = require('../models/school');
const RefreshToken = require('../models/refresh_token');
const Task = require('../models/task');
const Node = require('../models/node');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const apiCache = require('../services/apiCache'); // P2: API 快取
const { sign } = require('jsonwebtoken');
const crypto = require('crypto');
const sequelize = require('../util/database'); // 引入 Sequelize 實例以支援事務
const config = require('../config');
const { logAudit } = require('../services/auditService');
const logger = require('../config/logger');
const { writeErrorReport } = require('../utils/errorHandler');

//get all users
exports.getUsers = async (req, res) => {
    try {
        // H2: 根據角色限制回傳欄位 — 學生只能看到基本資訊
        const role = req.user?.role; // 來自 AuthMiddleware (JWT decoded)
        const attributes = role === 'teacher'
            ? ['id', 'username', 'account', 'email', 'role', 'class', 'seatNumber', 'school_id']
            : ['id', 'username', 'role', 'class'];

        // B9：支援可選篩選（role / class / search / limit），未帶參數時維持回傳全部
        const where = {};
        if (typeof req.query.role === 'string' && req.query.role.trim()) where.role = req.query.role.trim();
        if (typeof req.query.class === 'string' && req.query.class.trim()) where.class = req.query.class.trim();
        if (typeof req.query.search === 'string' && req.query.search.trim()) {
            const keyword = `%${req.query.search.trim()}%`;
            where[Op.or] = [
                { username: { [Op.iLike]: keyword } },
                { account: { [Op.iLike]: keyword } },
            ];
        }
        const parsedLimit = parseInt(req.query.limit, 10);
        const queryOptions = { attributes, where, order: [['id', 'ASC']] };
        if (Number.isFinite(parsedLimit) && parsedLimit > 0) queryOptions.limit = Math.min(parsedLimit, 1000);

        const users = await User.findAll(queryOptions);
        res.status(200).json({ user: users });
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
}

//get all teachers
exports.getTeachers = async (req, res) => {
    try {
        const users = await User.findAll({
            where: { role: 'teacher' },
            attributes: ['id', 'username', 'account', 'email', 'school_id'],
            include: [{
                model: School,
                as: 'school',
                attributes: ['name', 'city'],
                required: false
            }]
        });
        res.status(200).json({ user: users });
    } catch (err) {
        console.error('Error fetching teachers:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}


//get user by id
exports.getUser = async (req, res) => {
    try {
        const userId = req.params.userId;
        const user = await User.findByPk(userId, {
            attributes: { exclude: ['password'] }
        });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json({ user: user });
    } catch (err) {
        console.error('Error fetching user:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
}

//get current user from token
exports.getCurrentUser = async (req, res) => {
    try {
        const userId = req.userId; // 來自 AuthMiddleware
        const cacheKey = `me:${userId}`;

        // P2: 先查快取（TTL 60s，個人資料不常變動）
        const cached = apiCache.get(cacheKey);
        if (cached) return res.status(200).json(cached);

        const user = await User.findByPk(userId, {
            attributes: ['id', 'username', 'account', 'email', 'role', 'class', 'seatNumber', 'school_id'],
            include: [{
                model: School,
                as: 'school',
                attributes: ['id', 'name', 'city'],
                required: false
            }]
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const userData = user.toJSON();
        apiCache.set(cacheKey, userData, 60); // 快取 60 秒

        // 記錄用戶查看個人資料
        logAudit(req, {
            action: 'USER_VIEW_PROFILE',
            targetType: 'user',
            targetId: userId,
            actorId: userId,
            metadata: { role: user.role }
        }).catch(err => console.error('Audit log error:', err));

        res.status(200).json(userData);
    } catch (error) {
        console.error('Error fetching current user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

// login user
exports.loginUser = async (req, res) => {
    try {
        const { account, password } = req.body;

        // 驗證輸入
        if (!account || !password) {
            return res.status(400).json({ message: '帳號和密碼為必填項' });
        }

        // 使用 findOne 而非 findAll
        const user = await User.findOne({
            where: { account },
            attributes: ['id', 'account', 'email', 'username', 'password', 'role', 'class', 'seatNumber']
        });

        // 用戶不存在
        if (!user) {
            // 記錄登入失敗 (用戶不存在)
            logAudit(req, {
                action: 'USER_LOGIN_FAILED',
                targetType: 'user',
                targetId: null,
                metadata: { reason: 'user_not_found', account }
            }).catch(() => { });
            writeErrorReport({ message: `登入失敗：帳號不存在 (${account})`, isOperational: true }, req, 401);
            return res.status(401).json({ message: '帳號或密碼錯誤' });
        }

        // 驗證密碼
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            // 記錄登入失敗 (密碼錯誤)
            logAudit(req, {
                action: 'USER_LOGIN_FAILED',
                targetType: 'user',
                targetId: user.id,
                metadata: { reason: 'invalid_password', account }
            }).catch(() => { });
            writeErrorReport({ message: `登入失敗：密碼錯誤 (帳號: ${account})`, isOperational: true }, req, 401);
            return res.status(401).json({ message: '帳號或密碼錯誤' });
        }

        // 生成 Access Token
        const accessToken = sign(
            { account: user.account, id: user.id, role: user.role, username: user.username },
            config.jwt.secret,
            { expiresIn: config.jwt.expiresIn }
        );

        // 生成 Refresh Token
        const refreshToken = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setTime(expiresAt.getTime() + config.jwt.refreshExpiresIn * 1000); // 轉換秒為毫秒

        // 儲存 Refresh Token 到資料庫
        await RefreshToken.create({
            userId: user.id,
            token: refreshToken,
            expiresAt
        });

        // 記錄登入成功
        logAudit(req, {
            action: 'USER_LOGIN_SUCCESS',
            targetType: 'user',
            targetId: user.id,
            actorId: user.id,
            metadata: { account, role: user.role }
        }).catch(() => { });

        // 返回用戶資料（不包含密碼）
        res.status(200).json({
            accessToken,
            refreshToken,  // 新增 refreshToken
            account: user.account,
            email: user.email,
            username: user.username,
            id: user.id,
            role: user.role,
            class: user.class,
            seatNumber: user.seatNumber
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: '伺服器內部錯誤' });
    }
}

// register user
exports.registerUser = async (req, res) => {
    try {
        const { username, account, email, password, seatNumber, school_id } = req.body;
        const classField = req.body.class;
        const schoolId = school_id || null;

        // 安全：角色一律由伺服器決定，忽略 body 的 role。
        // teacher 只能由 admin 後台（PATCH /api/admin/users/:id/role）開通，admin 只能由 scripts/seed-admin.js 建立。
        const role = 'student';
        const requestedRole = req.body.role;
        if (requestedRole && requestedRole !== 'student') {
            logger.warn({ account, requestedRole }, '註冊請求夾帶非 student 角色，已忽略');
        }

        logger.info({ account, email, role, class: classField }, '收到註冊請求');

        // 檢查用戶是否已經存在
        const existingUser = await User.findOne({ where: { account } });
        if (existingUser) {
            return res.status(400).json({ message: '該用戶已存在，請嘗試其他用戶名稱。' });
        }

        // 驗證密碼強度
        if (!password || password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
            return res.status(400).json({ message: '密碼至少需要 8 個字元，並包含英文字母與數字' });
        }

        // 加密密碼
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 使用 transaction 確保 User + RefreshToken 原子寫入
        const t = await sequelize.transaction();
        try {
            const result = await User.create({
                username,
                account,
                email,
                password: hashedPassword,
                role,
                class: classField,
                seatNumber,
                school_id: schoolId
            }, { transaction: t });

            const accessToken = sign(
                { account: result.account, id: result.id, role: result.role, username: result.username },
                config.jwt.secret,
                { expiresIn: config.jwt.expiresIn }
            );

            // 生成 Refresh Token（與登入流程一致）
            const refreshToken = crypto.randomUUID();
            const expiresAt = new Date();
            expiresAt.setTime(expiresAt.getTime() + config.jwt.refreshExpiresIn * 1000);

            await RefreshToken.create({
                userId: result.id,
                token: refreshToken,
                expiresAt
            }, { transaction: t });

            await t.commit();

            // 記錄用戶註冊（非阻塞）
            logAudit(req, {
                action: 'USER_REGISTER',
                targetType: 'user',
                targetId: result.id,
                actorId: result.id,
                metadata: { account: result.account, role: result.role, email: result.email }
            }).catch(() => { });

            res.status(201).json({
                accessToken,
                refreshToken,
                account: result.account,
                email: result.email,
                username: result.username,
                id: result.id,
                role: result.role,
                class: result.class,
                seatNumber: result.seatNumber
            });
        } catch (innerErr) {
            await t.rollback();
            throw innerErr;
        }
    } catch (err) {
        logger.error(err, '註冊失敗');
        res.status(500).json({ message: '內部錯誤，無法創建新用戶。' });
    }
}

//update user profile (excluding password)
exports.updateUserProfile = async (req, res) => {
    try {
        const userId = req.userId; // 來自 AuthMiddleware
        const { username, email, class: classField, seatNumber } = req.body;

        // 驗證輸入
        if (!username || username.trim() === '') {
            return res.status(400).json({ message: '姓名不能為空' });
        }

        // 獲取用戶的舊 username
        const currentUser = await User.findByPk(userId, {
            attributes: ['username']
        });

        if (!currentUser) {
            return res.status(404).json({ message: '用戶未找到' });
        }

        const oldUsername = currentUser.username;
        const newUsername = username.trim();

        // H7: 全部放在同一個 Transaction 中，確保原子操作
        const transaction = await sequelize.transaction();
        try {
            // 更新用戶資料
            const [updatedRowsCount] = await User.update({
                username: newUsername,
                email: email || '',
                class: classField || '',
                seatNumber: seatNumber || ''
            }, {
                where: { id: userId },
                transaction
            });

            if (updatedRowsCount === 0) {
                await transaction.rollback();
                return res.status(400).json({ message: '用戶資料更新失敗' });
            }

            // 如果 username 有變更，同步更新所有該用戶建立的卡片和節點的 owner 欄位
            if (oldUsername !== newUsername) {
                await Task.update(
                    { owner: newUsername },
                    { where: { owner: oldUsername }, transaction }
                );

                await Node.update(
                    { owner: newUsername },
                    { where: { owner: oldUsername }, transaction }
                );
            }

            await transaction.commit();
            // 班級或學校可能變更，讓 socket 權限快取失效
            permissionCache.invalidateUser(userId);
        } catch (txErr) {
            await transaction.rollback();
            throw txErr;
        }

        // 記錄個人資料更新
        logAudit(req, {
            action: 'PROFILE_UPDATE',
            targetType: 'user',
            targetId: userId,
            metadata: {
                usernameChanged: oldUsername !== newUsername,
                oldUsername,
                newUsername
            }
        }).catch(() => { });

        apiCache.del(`me:${userId}`); // 清除個人資料快取

        // 返回更新後的用戶資料
        const updatedUser = await User.findByPk(userId, {
            attributes: ['id', 'username', 'account', 'email', 'role', 'class', 'seatNumber']
        });

        res.status(200).json({
            message: '個人資料更新成功',
            user: updatedUser
        });

    } catch (error) {
        console.error('更新用戶資料失敗:', error);
        res.status(500).json({ message: '伺服器內部錯誤' });
    }
};

//update user password
exports.updateUserPassword = async (req, res) => {
    try {
        const userId = req.userId; // 來自 AuthMiddleware
        const { currentPassword, newPassword } = req.body;

        // 驗證輸入
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: '當前密碼和新密碼都是必需的' });
        }

        if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
            return res.status(400).json({ message: '密碼至少需要 8 個字元，並包含英文字母與數字' });
        }

        // 查找用戶
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: '用戶未找到' });
        }

        // 驗證當前密碼
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);

        if (!isCurrentPasswordValid) {
            return res.status(400).json({ message: '當前密碼不正確' });
        }

        // 加密新密碼
        const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

        // 更新密碼
        const [updatedRowsCount] = await User.update({
            password: hashedNewPassword
        }, {
            where: { id: userId }
        });

        if (updatedRowsCount === 0) {
            return res.status(404).json({ message: '密碼更新失敗' });
        }

        apiCache.del(`me:${userId}`); // 密碼更新後清除快取

        // 記錄密碼更新
        logAudit(req, {
            action: 'PASSWORD_UPDATE',
            targetType: 'user',
            targetId: userId,
            metadata: { updatedAt: new Date().toISOString() }
        }).catch(() => { });

        res.status(200).json({ message: '密碼更新成功' });

    } catch (error) {
        console.error('更新密碼失敗:', error);
        res.status(500).json({ message: '伺服器內部錯誤' });
    }
};




// 取得此老師所有指導專案的學生列表（跨專案去重）
exports.getTeacherStudents = async (req, res) => {
    try {
        if (req.user?.role !== 'teacher') {
            return res.status(403).json({ message: '權限不足' });
        }

        // 找出此老師指導的所有專案
        const projects = await Project.findAll({
            where: { mentorId: req.user.id },
            attributes: ['id', 'name']
        });

        if (projects.length === 0) {
            return res.status(200).json([]);
        }

        const projectIds = projects.map(p => p.id);

        // 取得這些專案的所有學生（去重）
        const students = await User.findAll({
            attributes: ['id', 'username', 'account', 'class', 'seatNumber', 'passwordResetAt'],
            where: { role: 'student' },
            include: [{
                model: Project,
                attributes: ['id', 'name'],
                where: { id: projectIds },
                through: { attributes: [] }
            }]
        });

        // 整理回傳格式：每個學生帶上所屬專案列表
        const result = students.map(s => ({
            id: s.id,
            username: s.username,
            account: s.account,
            class: s.class,
            seatNumber: s.seatNumber,
            projects: s.projects.map(p => ({ id: p.id, name: p.name })),
            passwordResetAt: s.passwordResetAt || null
        }));

        res.status(200).json(result);
    } catch (error) {
        logger.error({ error: error.message }, '取得老師學生列表失敗');
        res.status(500).json({ message: '伺服器內部錯誤' });
    }
};

// 老師重設學生密碼（產生臨時密碼）
exports.adminResetPassword = async (req, res) => {
    try {
        // 只有 teacher 可以呼叫
        if (req.user?.role !== 'teacher') {
            return res.status(403).json({ message: '權限不足，僅教師可重設學生密碼' });
        }

        const targetUserId = req.params.userId;

        const targetUser = await User.findByPk(targetUserId, {
            attributes: ['id', 'username', 'account', 'role']
        });

        if (!targetUser) {
            return res.status(404).json({ message: '找不到該使用者' });
        }

        // 只能重設學生密碼，不能重設其他老師
        if (targetUser.role !== 'student') {
            return res.status(403).json({ message: '只能重設學生密碼' });
        }

        // M13: 驗證教師與學生有共同專案（確保師生關係）
        const Project = require('../models/project');
        const teacherProjects = await Project.findAll({
            attributes: ['id'],
            include: [{
                model: User,
                attributes: [],
                where: { id: req.userId }
            }]
        });
        const teacherProjectIds = teacherProjects.map(p => p.id);

        if (teacherProjectIds.length > 0) {
            const studentInTeacherProject = await Project.findOne({
                attributes: ['id'],
                where: { id: teacherProjectIds },
                include: [{
                    model: User,
                    attributes: [],
                    where: { id: targetUserId }
                }]
            });

            // 也檢查教師是否為 mentor
            const mentorProject = await Project.findOne({
                attributes: ['id'],
                where: { mentorId: req.userId },
                include: [{
                    model: User,
                    attributes: [],
                    where: { id: targetUserId }
                }]
            });

            if (!studentInTeacherProject && !mentorProject) {
                return res.status(403).json({ message: '只能重設自己指導的學生密碼' });
            }
        } else {
            // 教師沒有任何專案，也檢查 mentor 關係
            const mentorProject = await Project.findOne({
                attributes: ['id'],
                where: { mentorId: req.userId },
                include: [{
                    model: User,
                    attributes: [],
                    where: { id: targetUserId }
                }]
            });
            if (!mentorProject) {
                return res.status(403).json({ message: '只能重設自己指導的學生密碼' });
            }
        }

        // 產生臨時密碼：SDL + 6 位隨機數字
        const randomDigits = Math.floor(100000 + Math.random() * 900000);
        const tempPassword = `SDL${randomDigits}`;

        const hashedPassword = await bcrypt.hash(tempPassword, saltRounds);

        await User.update({ password: hashedPassword, passwordResetAt: new Date() }, { where: { id: targetUserId } });

        logAudit(req, {
            action: 'ADMIN_PASSWORD_RESET',
            targetType: 'user',
            targetId: targetUserId,
            metadata: { resetBy: req.userId, targetAccount: targetUser.account }
        }).catch(() => { });

        res.status(200).json({
            message: '密碼重設成功',
            tempPassword,
            username: targetUser.username
        });

    } catch (error) {
        logger.error({ error: error.message }, '老師重設密碼失敗');
        res.status(500).json({ message: '伺服器內部錯誤' });
    }
};

exports.getProjectUsers = async (req, res) => {
    try {
        const projectId = req.params.projectId;
        const result = await User.findAll({
            attributes: ['id', 'username', 'class', 'seatNumber'],
            include: [{
                model: Project,
                attributes: [],
                where: {
                    id: projectId
                },
            }]
        });
        res.status(200).json(result);
    } catch (err) {
        console.error('Error fetching project users:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
}

// 批次獲取多個專案的用戶（解決 N+1 查詢問題）
exports.batchGetProjectUsers = async (req, res) => {
    try {
        const { projectIds } = req.body;

        console.log('[batchGetProjectUsers] 收到請求，projectIds:', projectIds);

        // 驗證輸入
        if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
            return res.status(400).json({
                message: 'projectIds 必須是非空陣列'
            });
        }

        console.log('[batchGetProjectUsers] 開始查詢資料庫...');

        // 單次查詢獲取所有專案的用戶
        const users = await User.findAll({
            attributes: ['id', 'username', 'class', 'seatNumber'],
            include: [{
                model: Project,
                attributes: ['id', 'name'],
                where: {
                    id: projectIds
                },
                through: { attributes: [] }
            }]
        });

        console.log('[batchGetProjectUsers] 查詢完成，找到用戶數:', users.length);

        // 將結果按專案 ID 分組
        const usersByProject = {};
        users.forEach(user => {
            const projects = user.Projects || user.projects || [];

            if (!projects || projects.length === 0) {
                console.warn('[batchGetProjectUsers] 用戶無關聯專案:', user.id);
                return;
            }

            projects.forEach(project => {
                if (!usersByProject[project.id]) {
                    usersByProject[project.id] = [];
                }
                usersByProject[project.id].push({
                    id: user.id,
                    username: user.username,
                    class: user.class,
                    seatNumber: user.seatNumber,
                    projectId: project.id
                });
            });
        });

        console.log('[batchGetProjectUsers] 資料處理完成，專案數:', Object.keys(usersByProject).length);

        res.status(200).json(usersByProject);
    } catch (error) {
        console.error('[batchGetProjectUsers] 錯誤詳情:');
        console.error('  訊息:', error.message);
        console.error('  堆疊:', error.stack);
        console.error('  完整錯誤:', error);

        res.status(500).json({
            message: '伺服器內部錯誤',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}


