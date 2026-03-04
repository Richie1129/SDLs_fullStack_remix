//controllers for project - Basic CRUD operations
const Project = require('../../models/project')
const User = require('../../models/user')
const Kanban = require('../../models/kanban');
const Column = require('../../models/column');
const Task = require('../../models/task');
const Daily_personal = require('../../models/daily_personal');
const Daily_team = require('../../models/daily_team');
const Submit = require('../../models/submit');
const shortid = require('shortid')
const Idea_wall = require('../../models/idea_wall');
const Process = require('../../models/process');
const Stage = require('../../models/stage');
const Sub_stage = require('../../models/sub_stage');
const User_project = require('../../models/user_project');
const sequelize = require('../../util/database');
const projectViewingController = require('./projectViewingController');
const { getTaiwanSemester } = require('../../utils/semesterUtils');
const { logAudit } = require('../../services/auditService');

exports.getProject = async (req, res) => {
    try {
        const projectId = req.params.projectId;
        const result = await Project.findByPk(projectId);
        if (!result) {
            return res.status(404).json({ message: '專案未找到' });
        }
        res.status(200).json(result);
    } catch (err) {
        console.error('Error fetching project:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
}

exports.getAllProject = async (req, res) => {
    try {
        const { viewable_by, semester } = req.query;
        // 支援 query.userId 或由驗證中介層掛上的 req.userId
        const rawUserId = typeof req.query.userId !== 'undefined' ? req.query.userId : req.userId;

        // 決定學期過濾條件（預設為當前學期，'all' 表示不過濾）
        const semesterFilter = semester || getTaiwanSemester();

        console.log('=== getAllProject Debug ===');
        console.log('req.query.userId:', req.query.userId);
        console.log('req.userId:', req.userId);
        console.log('viewable_by:', viewable_by);
        console.log('semester:', semesterFilter);

        // 分支：可觀摩專案查詢
        if (viewable_by) {
            console.log('[getAllProject] 轉交至 getViewableProjects');
            // 確保 semester 參數傳遞給 getViewableProjects
            req.query.semester = semesterFilter;
            return projectViewingController.getViewableProjects(req, res);
        }

        // 分支：用戶參與的專案
        // 防呆：沒有 userId 直接回覆 400，避免 ORM where: { id: undefined } 造成例外
        if (typeof rawUserId === 'undefined' || rawUserId === null || rawUserId === '') {
            return res.status(400).json({ message: '缺少 userId 參數' });
        }

        const userId = Number(rawUserId);
        if (!Number.isInteger(userId) || userId <= 0) {
            return res.status(400).json({ message: 'userId 參數格式不正確' });
        }

        // 建立學期過濾條件
        const whereClause = semesterFilter !== 'all' ? { semester: semesterFilter } : {};

        console.log('[getAllProject] 查詢用戶參與的專案 userId:', userId, 'semester:', semesterFilter);
        const projects = await Project.findAll({
            where: whereClause,
            include: [{
                model: User,
                attributes: ['id', 'username', 'class'],
                where: { id: userId },
                through: { attributes: [] }
            }]
        });

        console.log('[getAllProject] 專案數量:', projects.length);
        
        // 記錄學生查看儀表板/專案列表
        logAudit(req, {
            action: 'STUDENT_VIEW_DASHBOARD',
            targetType: 'user',
            targetId: userId,
            actorId: userId,
            metadata: { projectCount: projects.length, semester: semesterFilter }
        }).catch(err => console.error('Audit log error:', err));
        
        return res.status(200).json(projects);
    } catch (error) {
        console.error('取得專案列表錯誤:', error);
        return res.status(500).json({
            message: '取得專案列表時發生錯誤',
            error: error.message
        });
    }
};

exports.getProjectsByMentor = async (req, res) => {
    const mentorName = req.params.mentor; // 從 URL 參數中獲取 mentor 名字
    const semester = req.query.semester || getTaiwanSemester();
    console.log("mentorName:", mentorName, "semester:", semester);
    try {
        const whereClause = { mentor: mentorName };
        if (semester !== 'all') {
            whereClause.semester = semester;
        }

        const projects = await Project.findAll({
            where: whereClause
        });

        // 記錄教師查看專案列表
        if (req.userId) {
            logAudit(req, {
                action: 'TEACHER_VIEW_PROJECTS',
                targetType: 'project',
                targetId: null,
                actorId: req.userId,
                metadata: { mentor: mentorName, semester, projectCount: projects.length }
            }).catch(err => console.error('Audit log error:', err));
        }

        // 空學期是正常情況，回傳空陣列而非 404
        res.status(200).json(projects);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: '內部服務器錯誤' });
    }
};

/**
 * 取得教師所有專案的可用學期列表
 * GET /projects/mentor/:mentor/semesters
 */
exports.getAvailableSemesters = async (req, res) => {
    try {
        const mentorName = req.params.mentor;
        const semesters = await Project.findAll({
            where: { mentor: mentorName },
            attributes: [[sequelize.fn('DISTINCT', sequelize.col('semester')), 'semester']],
            order: [[sequelize.col('semester'), 'DESC']],
            raw: true
        });

        res.status(200).json({
            semesters: semesters.map(s => s.semester),
            currentSemester: getTaiwanSemester()
        });
    } catch (error) {
        console.error('取得學期列表錯誤:', error);
        res.status(500).json({ message: '取得學期列表時發生錯誤' });
    }
};

exports.createProject = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const projectName = req.body.projectName;
        const projectdescribe = req.body.projectdescribe;
        const projectMentor = req.body.projectMentor;
        const referral_code = shortid.generate();
        const projectMentorId = req.body.projectMentorId;
        if (!projectName || !projectdescribe || !projectMentor) {
            await t.rollback();
            return res.status(404).send({ message: '請輸入完整資料!' })
        }

        const userId = req.body.userId;
        const creater = await User.findByPk(userId, { transaction: t });

        const createdProject = await Project.create({
            name: projectName,
            describe: projectdescribe,
            mentor: projectMentor,
            referral_code: referral_code,
            currentStage: 1,
            currentSubStage: 1,
            semester: getTaiwanSemester(),
            school_id: creater ? creater.school_id : null
        }, { transaction: t, req });
        await createdProject.addUser(creater, { transaction: t });

        // initialize kanban
        const kanban = await Kanban.create({ column: [], projectId: createdProject.id }, { transaction: t });
        const todo = await Column.create({ name: "待處理", task: [], kanbanId: kanban.id }, { transaction: t });
        const inProgress = await Column.create({ name: "進行中", task: [], kanbanId: kanban.id }, { transaction: t });
        const Completed = await Column.create({ name: "完成", task: [], kanbanId: kanban.id }, { transaction: t });

        const kanbanInst = await Kanban.findByPk(kanban.id, { transaction: t });
        kanbanInst.column = [todo.id, inProgress.id, Completed.id];
        await kanbanInst.save({ transaction: t });

        // 簡化：每個專案只需要一個想法牆，不分階段
        await Idea_wall.create({
            name: `${createdProject.name}-想法牆`,
            type: "project",
            projectId: createdProject.id,
            stage: null // 不再使用階段概念
        }, { transaction: t });

        // initialize process
        const process = await Process.create({
            stage: [],
            projectId: createdProject.id
        }, { transaction: t });

        const stage1 = await Stage.create({
            name: "定標",
            sub_stage: [],
            processId: process.id
        }, { transaction: t });
        const stage2 = await Stage.create({
            name: "擇策",
            sub_stage: [],
            processId: process.id
        }, { transaction: t });
        const stage3 = await Stage.create({
            name: "監評",
            sub_stage: [],
            processId: process.id
        }, { transaction: t });
        const stage4 = await Stage.create({
            name: "調節",
            sub_stage: [],
            processId: process.id
        }, { transaction: t });
        const stage5 = await Stage.create({
            name: "學習歷程",
            sub_stage: [],
            processId: process.id
        }, { transaction: t });

        const processInst = await Process.findByPk(process.id, { transaction: t });
        processInst.stage = [stage1.id, stage2.id, stage3.id, stage4.id, stage5.id];
        await processInst.save({ transaction: t });

        const sub_stage_1_1 = await Sub_stage.create({
            name: "提出研究主題",
            description: "這個階段的目標是為了確定研究的主題範圍，並確保主題具有研究價值和實務意義。在這個階段你可以先進行文獻回顧，識別研究領域中的空白或爭議點，再透過討論和思考縮小研究範圍，最後再和小組成員一起確定出一個具體的研究主題。",
            userSubmit: {
                "提議主題": "input",
                "主題來源": "input",
                "提議原因": "textarea",
                "附加檔案": "file",
            },
        stageId: stage1.id
    }, { transaction: t })
    const sub_stage_1_2 = await Sub_stage.create({
        name: "提出研究目的",
        description: "這個階段的目標是為了明確研究旨在解決的問題或達到的效果，闡述研究的重要性。在這個階段你可以基於研究主題去細化研究的目標與期望成果，其中也包括了理論與實務層面的貢獻。",
        userSubmit: {
            "提議題目": "input",
            "提議原因": "textarea",
            "相關資料": "textarea",
            "附加檔案": "file",
        },
        stageId: stage1.id
    }, { transaction: t });
    const sub_stage_1_3 = await Sub_stage.create({
        name: "提出研究問題",
        description: "這個階段的目標是為了定義清晰、具體的研究問題，指導研究的方向與範圍。在這個階段你可以根據研究目的，提出可操作的研究問題，同時確保問題具有明確性和可研究性。",
        userSubmit: {
            "研究假設": "textarea",
            "對應的研究變因": "textarea",
            "附加檔案": "file",
        },
        stageId: stage1.id
    }, { transaction: t });
    const stage1Inst = await Stage.findByPk(stage1.id, { transaction: t });
    stage1Inst.sub_stage = [sub_stage_1_1.id, sub_stage_1_2.id, sub_stage_1_3.id];
    await stage1Inst.save({ transaction: t });

    const sub_stage_2_1 = await Sub_stage.create({
        name: "訂定研究構想表",
        description: "這個階段的目標是為了建立研究架構和方法論基礎，明確研究的理論背景和假設。在這個階段你可以一步步地發展出研究概念框架，其中包括了研究假設、變數定義和預期的研究模型。",
        userSubmit: {
            "研究材料與工具": "textarea",
            "研究步驟": "textarea",
            "記錄方式": "textarea",
            "附加檔案": "file",
        },
        stageId: stage2.id
    }, { transaction: t });
    const sub_stage_2_2 = await Sub_stage.create({
        name: "設計研究記錄表格",
        description: "這個階段的目標是為了為收集資料和記錄研究過程提供標準化工具。在這個階段你可以根據研究問題和方法，設計資料收集表格和記錄表，包括但不限於問卷、訪談記錄和實驗資料表。",
        userSubmit: {
            "資料收集方式": "textarea",
            "記錄表設計說明": "textarea",
            "預計樣本規模": "input",
            "研究紀錄表格": "file"
        },
        stageId: stage2.id
    }, { transaction: t });
    const sub_stage_2_3 = await Sub_stage.create({
        name: "規劃研究排程",
        description: "這個階段的目標是為了合理安排研究活動的時間表，確保研究工作有秩序地進行。在這個階段你可以制定詳細的研究計畫和時間線，包括各階段的開始和結束日期，以及關鍵活動和里程碑。",
        userSubmit: {
            "時程規劃說明": "textarea",
            "團隊分工": "textarea",
            "重要里程碑": "textarea",
            "研究時程規劃表": "file",
        },
        stageId: stage2.id
    }, { transaction: t });

    const stage2Inst = await Stage.findByPk(stage2.id, { transaction: t });
    stage2Inst.sub_stage = [sub_stage_2_1.id, sub_stage_2_2.id, sub_stage_2_3.id];
    await stage2Inst.save({ transaction: t });

    const sub_stage_3_1 = await Sub_stage.create({
        name: "進行嘗試性研究",
        description: "這個階段的目標是為了透過初步的研究活動，驗證研究方法的可行性和有效性。在這個階段你可以在小範圍內實施研究設計，收集和分析數據，評估研究方法和工具的適用性。",
        userSubmit: {
            "嘗試性研究過程": "textarea",
            "初步結果": "textarea",
            "調整計畫": "textarea",
            "實驗記錄": "file",
        },
        stageId: stage3.id
    }, { transaction: t });
    const sub_stage_3_2 = await Sub_stage.create({
        name: "分析資料與繪圖",
        description: "這個階段的目標是為了對收集到的資料進行系統性分析，透過圖表形式展示研究結果。在這個階段你可以使用統計軟體或手動方法對資料進行分析，包括描述性統計、相關性分析等，並製作圖表來直觀展示分析結果。",
        userSubmit: {
            "資料描述": "textarea",
            "分析方法": "textarea",
            "圖表說明": "textarea",
            "資料分析檔案": "file",
        },
        stageId: stage3.id
    }, { transaction: t });
    const sub_stage_3_3 = await Sub_stage.create({
        name: "撰寫研究成果",
        description: "這個階段的目標是為了詳細記錄研究過程和發現，包括資料分析、討論和結論。在這個階段你可以整理分析數據，撰寫研究報告的各個部分，包括引言、方法、結果、討論和結論。",
        userSubmit: {
            "研究成果": "input",
            "結果說明": "textarea",
            "應注意和改進事項": "textarea",
            "附加檔案": "file",
        },
        stageId: stage3.id
    }, { transaction: t });

    const stage3Inst = await Stage.findByPk(stage3.id, { transaction: t });
    stage3Inst.sub_stage = [sub_stage_3_1.id, sub_stage_3_2.id, sub_stage_3_3.id];
    await stage3Inst.save({ transaction: t });

    const sub_stage_4_1 = await Sub_stage.create({
        name: "檢視研究進度",
        description: "這個階段的目標是為了定期回顧研究工作的進展，確保研究按計畫進行。在這個階段你可以定期檢視研究行程和成果，評估是否需要調整研究方向或方法。",
        userSubmit: {
            "進度是否按規劃完成?": "input",
            "如何改進獲改善?": "textarea",
        },
        stageId: stage4.id
    }, { transaction: t });
    const sub_stage_4_2 = await Sub_stage.create({
        name: "進行研究討論",
        description: "這個階段的目標是為了與導師、同儕或研究小組討論研究發現和問題，以獲得回饋和建議哦。在這個階段你可以組織研究討論會，呈現研究結果，收集與整合回饋意見，對研究進行深入分析與完善。",
        userSubmit: {
            "討論內容": "textarea",
            "不同觀點": "textarea",
            "改進想法": "textarea",
            "研究討論檔案": "file",
        },
        stageId: stage4.id
    }, { transaction: t });
    const sub_stage_4_3 = await Sub_stage.create({
        name: "撰寫研究結論",
        description: "這個階段的目標是為了總結研究的主要發現，討論研究的意義、限制和未來研究的方向。在這個階段你可以基於研究結果和討論，撰寫結論部分，明確指出研究的貢獻和後續研究的建議。",
        userSubmit: {
            "研究結論": "textarea",
            "研究貢獻": "textarea",
            "研究限制": "textarea",
            "未來建議": "textarea",
            "研究結論檔案": "file",
        },
        stageId: stage4.id
    }, { transaction: t });
    const stage4Inst = await Stage.findByPk(stage4.id, { transaction: t });
    stage4Inst.sub_stage = [sub_stage_4_1.id, sub_stage_4_2.id, sub_stage_4_3.id];
    await stage4Inst.save({ transaction: t });

    const sub_stage_5_1 = await Sub_stage.create({
        name: "封面製作",
        description: "封面製作的目的是為學習歷程檔案提供一個引人注目的開始，反映出檔案的主題和內容精神。它首先給讀者留下視覺上的印象，有助於建立檔案的專業形象。",
        userSubmit: {
            "封面檔案": "file",
        },
        stageId: stage5.id
    }, { transaction: t });
    const sub_stage_5_2 = await Sub_stage.create({
        name: "摘要撰寫",
        description: "摘要的目的是提供一個簡短而全面的學習歷程概述，包括學習目標、主要活動、獲得的學習成果等，讓讀者快速了解整個學習歷程的精髓。",
        userSubmit: {
            "歷程摘要": "textarea",
        },
        stageId: stage5.id
    }, { transaction: t });
    const sub_stage_5_3 = await Sub_stage.create({
        name: "目錄編制",
        description: "目錄編制的目的是為了提供一個清晰的學習歷程架構概覽，使讀者能夠快速找到感興趣的部分。",
        userSubmit: {
            "歷程目錄": "textarea",
        },
        stageId: stage5.id
    }, { transaction: t });
    const sub_stage_5_4 = await Sub_stage.create({
        name: "內容撰寫",
        description: "內容撰寫的目的是深入記錄和分析學習過程中的各項活動、發現、思考和反思，以展現學習者的學習深度和廣度。",
        userSubmit: {
            "引言": "textarea",
            "理論背景": "textarea",
            "方法論": "textarea",
            "結果": "textarea",
            "討論": "textarea",
            "結論": "textarea",
        },
        stageId: stage5.id
    }, { transaction: t });
    const sub_stage_5_5 = await Sub_stage.create({
        name: "反思撰寫",
        description: "反思撰寫的目的是促進學習者對自己學習過程的深入思考，包括反思學習成果、過程中的挑戰、學到的課程以及未來的學習計劃。",
        userSubmit: {
            "當初為何要參加?": "textarea",
            "印象深刻的經驗": "textarea",
            "面臨的挑戰": "textarea",
            "過程中學會什麼?": "textarea",
            "過程中展現了什麼特質、能力?": "textarea",
            "如何應用於未來的學習或實踐中?": "textarea",
        },
        stageId: stage5.id
    }, { transaction: t });
    const stage5Inst = await Stage.findByPk(stage5.id, { transaction: t });
    stage5Inst.sub_stage = [sub_stage_5_1.id, sub_stage_5_2.id, sub_stage_5_3.id, sub_stage_5_4.id, sub_stage_5_5.id];
    await stage5Inst.save({ transaction: t });

        await t.commit();
        return res.status(200).send({ message: '活動創建成功!' })
    } catch (err) {
        console.error('createProject transaction failed:', err);
        try { await t.rollback(); } catch (_) {}
        return res.status(500).json({ message: '活動創建失敗', error: err.message });
    }
}

exports.updateProject = async (req, res) => {
    const projectId = req.params.projectId;
    const { projectName, projectdescribe, projectMentor } = req.body;

    try {
        const project = await Project.findByPk(projectId);
        if (!project) {
            return res.status(404).json({ message: '找不到此活動！' });
        }

        // 更新專案資訊
        project.name = projectName;
        project.describe = projectdescribe;
        project.mentor = projectMentor;

        await project.save();

        res.status(200).json({ message: '活動更新成功！', project });
    } catch (error) {
        console.error("更新專案錯誤:", error);
        res.status(500).json({ message: '活動更新失敗！' });
    }
};

exports.deleteProject = async (req, res) => {
    const projectId = req.params.projectId;

    try {
        const project = await Project.findByPk(projectId);
        if (!project) {
            return res.status(404).json({ message: "專案不存在！" });
        }

        console.log(`🗑️ 開始刪除專案 ${projectId} 及其所有相關檔案...`);

        // 導入 MinIO 清理工具
        const {
            batchDeleteMinioFiles,
            extractTaskFileNames,
            extractDailyFileNames,
            extractSubmitFileNames
        } = require('../../utils/minioFileHelper');

        // 收集所有需要刪除的檔案名稱
        const allFileNames = [];

        try {
            // 1. 收集任務相關檔案 - 使用 Eager Loading 避免 N+1 查詢
            const kanban = await Kanban.findOne({ where: { projectId } });

            if (kanban && kanban.column && kanban.column.length > 0) {
                // 批量查詢所有 Columns 和 Tasks (1 query instead of N+M queries)
                const columns = await Column.findAll({
                    where: { id: kanban.column },
                    attributes: ['id', 'task']
                });

                // 收集所有 task IDs
                const allTaskIds = columns
                    .filter(col => col.task && col.task.length > 0)
                    .flatMap(col => col.task);

                if (allTaskIds.length > 0) {
                    // 批量查詢所有 Tasks
                    const tasks = await Task.findAll({
                        where: { id: allTaskIds },
                        attributes: ['id', 'images', 'files']
                    });

                    // 提取所有檔案名
                    tasks.forEach(task => {
                        const taskFileNames = extractTaskFileNames(task);
                        allFileNames.push(...taskFileNames);
                        console.log(`📋 任務 ${task.id} 發現 ${taskFileNames.length} 個檔案`);
                    });
                }
            }

            // 2. 收集個人日誌檔案
            const personalDailies = await Daily_personal.findAll({ where: { projectId } });
            for (const daily of personalDailies) {
                const dailyFileNames = extractDailyFileNames(daily);
                allFileNames.push(...dailyFileNames);
                console.log(`📝 個人日誌 ${daily.id} 發現 ${dailyFileNames.length} 個檔案`);
            }

            // 3. 收集團隊日誌檔案
            const teamDailies = await Daily_team.findAll({ where: { projectId } });
            for (const daily of teamDailies) {
                const dailyFileNames = extractDailyFileNames(daily);
                allFileNames.push(...dailyFileNames);
                console.log(`👥 團隊日誌 ${daily.id} 發現 ${dailyFileNames.length} 個檔案`);
            }

            // 4. 收集提交記錄檔案
            const submits = await Submit.findAll({ where: { projectId } });
            for (const submit of submits) {
                const submitFileNames = extractSubmitFileNames(submit);
                allFileNames.push(...submitFileNames);
                console.log(`📤 提交記錄 ${submit.id} 發現 ${submitFileNames.length} 個檔案`);
            }

            // 移除重複的檔案名
            const uniqueFileNames = [...new Set(allFileNames)];
            console.log(`🗂️ 總共發現 ${uniqueFileNames.length} 個唯一檔案需要刪除`);

            // 批量刪除 MinIO 檔案
            if (uniqueFileNames.length > 0) {
                const deleteResult = await batchDeleteMinioFiles(uniqueFileNames);
                console.log(`🗑️ MinIO 檔案清理結果: ${deleteResult.success} 成功, ${deleteResult.failed} 失敗`);
            }

        } catch (fileCleanupError) {
            console.warn('⚠️ MinIO 檔案清理過程中發生錯誤，但繼續刪除專案:', fileCleanupError.message);
        }

        // 刪除相關數據庫記錄（使用交易以確保一致性）
        console.log('🗄️ 開始清理資料庫記錄...');
        const t = await sequelize.transaction();
        try {
            await User_project.destroy({ where: { projectId }, transaction: t });
            await Kanban.destroy({ where: { projectId }, transaction: t });
            await Project.destroy({ where: { id: projectId }, individualHooks: true, req, transaction: t });
            await t.commit();
            console.log(`✅ 專案 ${projectId} 刪除完成`);
            return res.status(200).json({ message: "專案刪除成功！" });
        } catch (txErr) {
            await t.rollback();
            throw txErr;
        }
    } catch (error) {
        console.error("刪除專案錯誤:", error);
        res.status(500).json({ message: "無法刪除專案！" });
    }
};


