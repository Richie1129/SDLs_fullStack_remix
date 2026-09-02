//controllers for project - Viewing Permission Management
const Project = require('../../models/project')
const User = require('../../models/user')
const User_project = require('../../models/user_project');
const permissionCache = require('../../auth/permissionCache');
const sequelize = require('../../util/database');
const { logAudit } = require('../../services/auditService');
const { getTaiwanSemester } = require('../../utils/semesterUtils');

/**
 * 設定專案的觀摩權限（僅限教師或專案成員）
 * PATCH /projects/:id/viewing-settings
 */
exports.updateViewingSettings = async (req, res) => {
    try {
        const projectId = req.params.id;
        const { is_open_for_viewing, allowed_classes } = req.body;

        // 驗證輸入
        if (typeof is_open_for_viewing !== 'boolean') {
            return res.status(400).json({
                message: 'is_open_for_viewing 必須是布林值'
            });
        }

        if (is_open_for_viewing && (!allowed_classes || !Array.isArray(allowed_classes) || allowed_classes.length === 0)) {
            return res.status(400).json({
                message: '開放觀摩時必須設定至少一個可觀摩的班級'
            });
        }

        const project = await Project.findByPk(projectId);
        if (!project) {
            return res.status(404).json({ message: '專案不存在' });
        }

        // 更新觀摩設定
        project.is_open_for_viewing = is_open_for_viewing;
        project.allowed_classes = is_open_for_viewing ? allowed_classes : null;

        await project.save();

        // 觀摩權限改變，讓 socket 權限快取失效
        permissionCache.invalidateProject(project.id);
        
        // 記錄審計事件（非阻塞）
        logAudit(req, {
            action: 'PROJECT_VIEWING_UPDATE',
            targetType: 'Project',
            targetId: project.id,
            projectId: project.id,
            metadata: {
                projectName: project.name,
                is_open_for_viewing,
                allowed_classes: project.allowed_classes
            }
        }).catch(err => {
            console.error('記錄審計事件失敗（專案觀摩設定）:', err);
        });

        res.status(200).json({
            message: '觀摩權限設定更新成功',
            project: {
                id: project.id,
                name: project.name,
                is_open_for_viewing: project.is_open_for_viewing,
                allowed_classes: project.allowed_classes
            }
        });
    } catch (error) {
        console.error('更新觀摩設定錯誤:', error);
        res.status(500).json({
            message: '更新觀摩設定時發生錯誤',
            error: error.message
        });
    }
};

/**
 * 檢查用戶是否有專案觀摩權限
 * GET /projects/:id/viewable
 */
exports.checkViewingPermission = async (req, res) => {
    try {
        const projectId = req.params.id;
        const userId = req.userId; // 從 AuthMiddleware 取得

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

        // 檢查是否為專案成員
        const isProjectMember = project.users.some(projectUser => projectUser.id === parseInt(userId));

        if (isProjectMember) {
            return res.status(200).json({
                hasPermission: true,
                permissionType: 'member',
                readOnly: false,
                message: '專案成員，擁有完整權限'
            });
        }

        // 檢查觀摩權限（同校且班級在允許清單內）
        const hasViewingPermission = project.is_open_for_viewing &&
            project.allowed_classes &&
            project.school_id !== null &&
            project.school_id === user.school_id &&
            project.allowed_classes.includes(user.class);

        if (hasViewingPermission) {
            return res.status(200).json({
                hasPermission: true,
                permissionType: 'viewer',
                readOnly: true,
                message: '具有觀摩權限，僅可瀏覽'
            });
        }

        return res.status(200).json({
            hasPermission: false,
            permissionType: 'none',
            readOnly: false,
            message: '無權限訪問此專案'
        });

    } catch (error) {
        console.error('檢查觀摩權限錯誤:', error);
        res.status(500).json({
            message: '檢查權限時發生錯誤',
            error: error.message
        });
    }
};

/**
 * 取得指定班級可觀摩的專案列表
 * GET /projects?viewable_by=classId
 */
exports.getViewableProjects = async (req, res) => {
    try {
        const { viewable_by, semester } = req.query;
        const userId = req.userId;
        const semesterFilter = semester || getTaiwanSemester();

        if (!viewable_by) {
            return res.status(400).json({ message: '缺少 viewable_by 參數' });
        }

        // 驗證用戶權限（確保用戶查詢自己班級的可觀摩專案）
        console.log('=== getViewableProjects Debug ===');
        console.log('userId:', userId);
        console.log('viewable_by:', viewable_by);
        console.log('semester:', semesterFilter);

        const user = await User.findByPk(userId);
        console.log('user found:', user ? user.dataValues : 'null');

        if (!user) {
            return res.status(404).json({ message: '用戶不存在' });
        }

        // 暫時放寬權限檢查，允許所有用戶查詢觀摩專案
        console.log('user.role:', user.role);
        console.log('user.class:', user.class);

        // if (user.role !== 'teacher' && user.class !== viewable_by) {
        //     return res.status(403).json({
        //         message: '只能查詢自己班級的可觀摩專案'
        //     });
        // }

        // 查詢用戶參與的專案ID，用於排除自己的專案
        const userProjects = await User_project.findAll({
            where: { userId: userId },
            attributes: ['projectId']
        });
        const userProjectIds = userProjects.map(up => up.projectId);
        console.log('User participated projects:', userProjectIds);

        // 建立查詢條件（加入學期過濾）
        const whereClause = { is_open_for_viewing: true };
        if (semesterFilter !== 'all') {
            whereClause.semester = semesterFilter;
        }

        // 查詢可觀摩的專案
        const projects = await Project.findAll({
            where: whereClause,
            include: [{
                model: User,
                through: { attributes: [] },
                attributes: ['id', 'username', 'class']
            }]
        });

        // 篩選允許指定班級觀摩的專案（同校或雙方皆無學校、班級在允許清單、且排除自己的專案）
        const viewableProjects = projects.filter(project => {
            if (!project.allowed_classes) return false;
            if (!project.allowed_classes.includes(viewable_by)) return false;
            if (userProjectIds.includes(project.id)) return false;

            // 同校檢查：雙方都有 school_id 時必須一致；任一方為 null 則跳過
            const bothHaveSchool = project.school_id !== null && user.school_id !== null;
            if (bothHaveSchool && project.school_id !== user.school_id) return false;

            return true;
        });

        // 格式化回傳資料
        const formattedProjects = viewableProjects.map(project => ({
            id: project.id,
            name: project.name,
            describe: project.describe,
            mentor: project.mentor,
            currentStage: project.currentStage,
            currentSubStage: project.currentSubStage,
            createdAt: project.createdAt,
            semester: project.semester,
            members: project.users.map(user => ({
                id: user.id,
                username: user.username,
                class: user.class
            }))
        }));

        res.status(200).json({
            message: '取得可觀摩專案成功',
            projects: formattedProjects,
            count: formattedProjects.length
        });

    } catch (error) {
        console.error('取得可觀摩專案錯誤:', error);
        res.status(500).json({
            message: '取得可觀摩專案時發生錯誤',
            error: error.message
        });
    }
};

/**
 * 取得所有班級列表（用於觀摩設定）
 * GET /projects/classes/list
 */
exports.getAllClasses = async (req, res) => {
    console.log('=== getAllClasses 控制器被調用 ===');
    console.log('請求標頭:', req.headers);
    console.log('請求路徑:', req.path);
    console.log('請求方法:', req.method);
    console.log('完整 URL:', req.originalUrl);

    try {
        console.log('開始查詢用戶班級資料...');
        // 只取同一學校的班級清單（避免跨校班級混入）
        const currentUser = await User.findByPk(req.userId);
        const whereClause = {
            class: { [require('sequelize').Op.ne]: null }
        };
        if (currentUser && currentUser.school_id) {
            whereClause.school_id = currentUser.school_id;
        }

        const classes = await User.findAll({
            attributes: ['class'],
            where: whereClause,
            group: ['class'],
            raw: true
        });

        console.log('查詢到的班級資料:', classes);
        const classList = classes.map(item => item.class).filter(Boolean).sort();
        console.log('處理後的班級列表:', classList);

        const response = {
            message: '取得班級列表成功',
            classes: classList
        };
        console.log('準備發送響應:', response);

        // 記錄教師查看班級列表
        if (req.userId) {
            logAudit(req, {
                action: 'TEACHER_VIEW_CLASS_LIST',
                targetType: 'system',
                targetId: null,
                actorId: req.userId,
                metadata: { classCount: classList.length }
            }).catch(err => console.error('Audit log error:', err));
        }

        res.status(200).json(response);
    } catch (error) {
        console.error('取得班級列表錯誤:', error);
        res.status(500).json({
            message: '取得班級列表時發生錯誤',
            error: error.message
        });
    }
};

/**
 * 根據班級名稱獲取該班級的用戶和他們的專案
 * GET /projects/classes/:className/users-projects
 */
exports.getClassUsersAndProjects = async (req, res) => {
    console.log('=== getClassUsersAndProjects 控制器被調用 ===');
    const className = req.params.className;
    const semester = req.query.semester || getTaiwanSemester();
    console.log('查詢班級:', className, '學期:', semester);

    try {
        // 1. 獲取該班級的所有用戶
        const classUsers = await User.findAll({
            where: { class: className },
            attributes: ['id', 'username', 'class', 'seatNumber'],
            raw: true
        });

        console.log(`${className} 班級的用戶:`, classUsers);

        if (classUsers.length === 0) {
            return res.status(200).json({
                message: '該班級沒有用戶',
                users: [],
                projects: []
            });
        }

        // 2. 獲取這些用戶參與的所有專案（加入學期過濾）
        const userIds = classUsers.map(user => user.id);
        console.log('用戶ID列表:', userIds);

        const projectWhereClause = {};
        if (semester !== 'all') {
            projectWhereClause.semester = semester;
        }

        const projects = await Project.findAll({
            where: projectWhereClause,
            include: [{
                model: User,
                attributes: ['id', 'username', 'class', 'seatNumber'],
                where: {
                    id: {
                        [require('sequelize').Op.in]: userIds
                    }
                },
                through: { attributes: [] }
            }],
            attributes: [
                'id',
                'name',
                'describe',
                'mentor',
                'currentStage',
                'currentSubStage',
                'createdAt',
                'updatedAt',
                // 觀摩設定相關欄位，供前端 Modal 初始化狀態
                'is_open_for_viewing',
                'allowed_classes',
                'semester'
            ]
        });

        // 3. 排除重複的專案（因為一個專案可能有多個該班級的用戶）
        const uniqueProjects = [];
        const projectIds = new Set();

        projects.forEach(project => {
            if (!projectIds.has(project.id)) {
                projectIds.add(project.id);
                uniqueProjects.push({
                    id: project.id,
                    name: project.name,
                    describe: project.describe,
                    mentor: project.mentor,
                    currentStage: project.currentStage,
                    currentSubStage: project.currentSubStage,
                    createdAt: project.createdAt,
                    updatedAt: project.updatedAt,
                    // 將觀摩設定欄位一併回傳，供前端初始化
                    is_open_for_viewing: project.is_open_for_viewing,
                    allowed_classes: project.allowed_classes,
                    semester: project.semester,
                    classMembers: project.users.filter(user => user.class === className)
                });
            }
        });

        console.log(`${className} 班級相關的唯一專案:`, uniqueProjects);

        res.status(200).json({
            message: `成功獲取 ${className} 班級的用戶和專案`,
            className: className,
            users: classUsers,
            projects: uniqueProjects
        });

    } catch (error) {
        console.error('獲取班級用戶和專案時發生錯誤:', error);
        res.status(500).json({
            message: '獲取班級用戶和專案時發生錯誤',
            error: error.message
        });
    }
};

/**
 * 批量設定觀摩權限 - 讓目標班級能觀摩來源班級的所有專案
 * POST /projects/batch-viewing-settings
 */
exports.batchUpdateViewingSettings = async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const { sourceClass, targetClasses, mentorName, semester } = req.body;
        const semesterFilter = semester || getTaiwanSemester();

        // 驗證輸入
        if (!sourceClass || !Array.isArray(targetClasses) || targetClasses.length === 0) {
            await t.rollback();
            return res.status(400).json({
                message: '請提供來源班級和目標班級列表'
            });
        }

        if (!mentorName) {
            await t.rollback();
            return res.status(400).json({
                message: '請提供指導老師名稱'
            });
        }

        console.log(`批量設定觀摩: ${sourceClass} → ${targetClasses.join(', ')} (學期: ${semesterFilter})`);

        // 1. 取得來源班級的所有用戶
        const sourceUsers = await User.findAll({
            where: { class: sourceClass },
            attributes: ['id'],
            transaction: t
        });

        if (sourceUsers.length === 0) {
            await t.rollback();
            return res.status(404).json({ message: '來源班級沒有用戶' });
        }

        const sourceUserIds = sourceUsers.map(user => user.id);

        // 2. 取得這些用戶參與的專案(需要是指定老師指導的，且為指定學期)
        // 先以 mentorName 查出教師 id，再用 mentorId 外鍵過濾（防止 username 異動導致關聯斷裂）
        const mentorUser = await User.findOne({
            where: { username: mentorName },
            attributes: ['id'],
            transaction: t
        });
        const projectWhereClause = mentorUser
            ? { mentorId: mentorUser.id }
            : { mentor: mentorName }; // fallback：mentor id 尚未回填時仍可用
        if (semesterFilter !== 'all') {
            projectWhereClause.semester = semesterFilter;
        }

        const projects = await Project.findAll({
            where: projectWhereClause,
            include: [{
                model: User,
                where: {
                    id: {
                        [require('sequelize').Op.in]: sourceUserIds
                    }
                },
                through: { attributes: [] }
            }],
            transaction: t
        });

        if (projects.length === 0) {
            await t.rollback();
            return res.status(404).json({
                message: `${mentorName} 老師在 ${sourceClass} 班級沒有指導的專案`
            });
        }

        console.log(`找到 ${projects.length} 個 ${sourceClass} 班級的專案`);

        // 3. 批量更新觀摩設定 (使用 Promise.all 並行處理)
        const updatePromises = projects.map(async (project) => {
            const currentAllowed = project.allowed_classes || [];

            // 合併現有允許的班級和新的目標班級(去重)
            const newAllowed = [...new Set([...currentAllowed, ...targetClasses])];

            project.is_open_for_viewing = true;
            project.allowed_classes = newAllowed;

            await project.save({ transaction: t });
            permissionCache.invalidateProject(project.id);

            return {
                projectId: project.id,
                projectName: project.name,
                previousAllowed: currentAllowed,
                newAllowed: newAllowed
            };
        });

        const updateResults = await Promise.all(updatePromises);

        await t.commit();
        
        // 記錄審計事件（非阻塞）
        logAudit(req, {
            action: 'PROJECT_VIEWING_BATCH_UPDATE',
            targetType: 'Project',
            targetId: null,
            projectId: null,
            metadata: {
                sourceClass,
                targetClasses,
                mentorName,
                updatedCount: updateResults.length,
                projectIds: updateResults.map(r => r.projectId)
            }
        }).catch(err => {
            console.error('記錄審計事件失敗（批量觀摩設定）:', err);
        });

        res.status(200).json({
            message: `成功設定 ${projects.length} 個專案的觀摩權限`,
            sourceClass,
            targetClasses,
            updatedProjects: updateResults.length,
            details: updateResults
        });

    } catch (error) {
        await t.rollback();
        console.error('批量設定觀摩權限錯誤:', error);
        res.status(500).json({
            message: '批量設定觀摩權限時發生錯誤',
            error: error.message
        });
    }
};
