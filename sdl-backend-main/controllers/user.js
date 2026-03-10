const User = require('../models/user');
const Project = require('../models/project');
const School = require('../models/school');
const RefreshToken = require('../models/refresh_token');
const Task = require('../models/task');
const Node = require('../models/node');
const bcrypt = require('bcrypt');
const saltRounds = 10;
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
        const users = await User.findAll({
            attributes: ['id', 'username', 'account', 'email', 'role', 'class', 'seatNumber', 'school_id'],
        });
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
        const user = await User.findByPk(userId);
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

        // 記錄用戶查看個人資料
        logAudit(req, {
            action: 'USER_VIEW_PROFILE',
            targetType: 'user',
            targetId: userId,
            actorId: userId,
            metadata: { role: user.role }
        }).catch(err => console.error('Audit log error:', err));

        res.status(200).json(user);
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
        const { username, account, email, password, role, seatNumber, school_id } = req.body;
        const classField = req.body.class;
        const schoolId = school_id || null;

        logger.info({ account, email, role, class: classField }, '收到註冊請求');

        // 檢查用戶是否已經存在
        const existingUser = await User.findOne({ where: { account } });
        if (existingUser) {
            return res.status(400).json({ message: '該用戶已存在，請嘗試其他用戶名稱。' });
        }

        // 加密密碼
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 創建新用戶
        const result = await User.create({
            username,
            account,
            email,
            password: hashedPassword,
            role,
            class: classField,
            seatNumber,
            school_id: schoolId
        });

        const accessToken = sign(
            { account: result.account, id: result.id, role: result.role, username: result.username },
            config.jwt.secret,
            { expiresIn: config.jwt.expiresIn }
        );

        // 記錄用戶註冊
        logAudit(req, {
            action: 'USER_REGISTER',
            targetType: 'user',
            targetId: result.id,
            actorId: result.id,
            metadata: { account: result.account, role: result.role, email: result.email }
        }).catch(() => { });

        res.status(201).json({ accessToken, account: result.account, id: result.id });
    } catch (err) {
        console.error('Registration error:', err);
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

        // 更新用戶資料
        const [updatedRowsCount] = await User.update({
            username: newUsername,
            email: email || '',
            class: classField || '',
            seatNumber: seatNumber || ''
        }, {
            where: { id: userId }
        });

        if (updatedRowsCount === 0) {
            return res.status(400).json({ message: '用戶資料更新失敗' });
        }

        // 如果 username 有變更，使用事務同步更新所有該用戶建立的卡片和節點的 owner 欄位
        if (oldUsername !== newUsername) {
            const transaction = await sequelize.transaction();
            try {
                // 更新卡片 owner
                const taskUpdateResult = await Task.update({
                    owner: newUsername
                }, {
                    where: { owner: oldUsername },
                    transaction
                });

                // 更新節點 owner
                const nodeUpdateResult = await Node.update({
                    owner: newUsername
                }, {
                    where: { owner: oldUsername },
                    transaction
                });

                await transaction.commit();
                console.log(`已將用戶 ${oldUsername} 的所有資料更新為 ${newUsername}:`);
                console.log(`- 卡片: ${taskUpdateResult[0]} 筆`);
                console.log(`- 節點: ${nodeUpdateResult[0]} 筆`);
            } catch (error) {
                await transaction.rollback();
                console.error('更新相關資料失敗，已回滾事務:', error);
                throw new Error('用戶名稱更新失敗：無法同步更新相關資料');
            }
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

        if (newPassword.length < 6) {
            return res.status(400).json({ message: '新密碼長度不能少於6個字符' });
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


