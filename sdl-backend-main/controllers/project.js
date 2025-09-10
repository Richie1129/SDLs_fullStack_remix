//controllers for project
const Project = require('../models/project')
const User = require('../models/user')
const Kanban = require('../models/kanban');
const Column = require('../models/column');
const Task = require('../models/task');
const Daily_personal = require('../models/daily_personal');
const Daily_team = require('../models/daily_team');
const Submit = require('../models/submit');
const shortid = require('shortid')
const Idea_wall = require('../models/idea_wall');
const Process = require('../models/process');
const Stage = require('../models/stage');
const Sub_stage = require('../models/sub_stage');
const User_project = require('../models/user_project');
const sequelize = require('../util/database');

exports.getProject = async (req, res) => {
    const projectId = req.params.projectId;
    await Project.findByPk(projectId)
        .then(result => {
            res.status(200).json(result)
        })
        .catch(err => console.log(err));
}

exports.getAllProject = async (req, res) => {
    try {
        const { viewable_by } = req.query;
        // 支援 query.userId 或由驗證中介層掛上的 req.userId
        const rawUserId = typeof req.query.userId !== 'undefined' ? req.query.userId : req.userId;

        console.log('=== getAllProject Debug ===');
        console.log('req.query.userId:', req.query.userId);
        console.log('req.userId:', req.userId);
        console.log('viewable_by:', viewable_by);

        // 分支：可觀摩專案查詢
        if (viewable_by) {
            console.log('[getAllProject] 轉交至 getViewableProjects');
            return exports.getViewableProjects(req, res);
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

        console.log('[getAllProject] 查詢用戶參與的專案 userId:', userId);
        const projects = await Project.findAll({
            include: [{
                model: User,
                attributes: ['id', 'username', 'class'],
                where: { id: userId },
                through: { attributes: [] }
            }]
        });

        console.log('[getAllProject] 專案數量:', projects.length);
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
    console.log("mentorName:",mentorName)
    try {
        const projects = await Project.findAll({
            where: { mentor: mentorName }
        });

        if (projects.length === 0) {
            return res.status(404).json({ message: '沒有找到該導師的項目' });
        }

        res.status(200).json(projects);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: '內部服務器錯誤' });
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

        const createdProject = await Project.create({
            name: projectName,
            describe: projectdescribe,
            mentor: projectMentor,
            referral_code: referral_code,
            currentStage: 1,
            currentSubStage: 1
        }, { transaction: t, req });

        const userId = req.body.userId;
        const creater = await User.findByPk(userId, { transaction: t });
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
            "研究紀錄表格": "file"
        },
        stageId: stage2.id
    }, { transaction: t });
    const sub_stage_2_3 = await Sub_stage.create({
        name: "規劃研究排程",
        description: "這個階段的目標是為了合理安排研究活動的時間表，確保研究工作有秩序地進行。在這個階段你可以制定詳細的研究計畫和時間線，包括各階段的開始和結束日期，以及關鍵活動和里程碑。",
        userSubmit: {
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
            "實驗記錄": "file",
        },
        stageId: stage3.id
    }, { transaction: t });
    const sub_stage_3_2 = await Sub_stage.create({
        name: "分析資料與繪圖",
        description: "這個階段的目標是為了對收集到的資料進行系統性分析，透過圖表形式展示研究結果。在這個階段你可以使用統計軟體或手動方法對資料進行分析，包括描述性統計、相關性分析等，並製作圖表來直觀展示分析結果。",
        userSubmit: {
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
            "研究討論": "file",
        },
        stageId: stage4.id
    }, { transaction: t });
    const sub_stage_4_3 = await Sub_stage.create({
        name: "撰寫研究結論",
        description: "這個階段的目標是為了總結研究的主要發現，討論研究的意義、限制和未來研究的方向。在這個階段你可以基於研究結果和討論，撰寫結論部分，明確指出研究的貢獻和後續研究的建議。",
        userSubmit: {
            "研究結論": "file",
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
        // 查找具有给定邀请码的项目
        const referralProject = await Project.findOne({
            where: {
                referral_code: referral_Code
            }
        });

        // 检查是否找到了项目
        if (!referralProject) {
            console.log('Project not found for referral code:', referral_Code);
            return res.status(404).json({ message: '邀請碼不存在!' });
        }
        console.log("projectId:", referralProject.id); // 添加日志输出
        console.log("userId:", userId); // 添加日志输出
        // 检查用户是否已经存在于项目中
        const userProject = await User_project.findOne({
            where: {
                projectId: referralProject.id,
                userId: userId
            }

        });
        console.log("userProject:", userProject); // 添加日志输出

        if (userProject) {
            console.log('User already exists in project!');
            return res.status(400).json({ message: '你已經是此活動的其中一員!' });
        }

        // 找到用户
        const invitedUser = await User.findByPk(userId);
        if (!invitedUser) {
            console.log('User not found:', userId);
            return res.status(404).json({ message: 'User not found!' });
        }

        // 将用户加入项目
        await referralProject.addUser(invitedUser);

        console.log('Successfully invited user to project!');
        // 成功邀请用户加入项目
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

        // 將學生加入專案（使用交易以確保全部或全部不成功）
        const t = await sequelize.transaction();
        try {
            await project.addUsers(students, { transaction: t });
            await t.commit();
        } catch (txErr) {
            await t.rollback();
            throw txErr;
        }

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
        } = require('../utils/minioFileHelper');

        // 收集所有需要刪除的檔案名稱
        const allFileNames = [];

        try {
            // 1. 收集任務相關檔案
            const kanban = await Kanban.findOne({ where: { projectId } });
            if (kanban && kanban.column) {
                for (const columnId of kanban.column) {
                    const column = await Column.findByPk(columnId);
                    if (column && column.task) {
                        for (const taskId of column.task) {
                            const task = await Task.findByPk(taskId);
                            if (task) {
                                const taskFileNames = extractTaskFileNames(task);
                                allFileNames.push(...taskFileNames);
                                console.log(`📋 任務 ${taskId} 發現 ${taskFileNames.length} 個檔案`);
                            }
                        }
                    }
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

// exports.inviteForProject = async( req, res) => {
//     const referral_Code = req.body.referral_Code;
//     const userId = req.body.userId;
//     console.log(userId);
//     if(!referral_Code){
//         return res.status(404).send({message: 'please enter referral code!'})
//     }
//     const referralProject = await Project.findOne({
//         where:{
//             referral_code:referral_Code
//         }
//     })
//     const invited = await User.findByPk(userId);
//     const userProjectAssociations = await referralProject.addUser(invited)
//     .then(() => {
//             return res.status(200).send({message: 'invite success!'})
//     })
//     .catch(err => {
//         console.log(err);
//         return res.status(500).send({message: 'invite failed!'})
//     });

// }





// exports.updateProject = async(req, res) => {
//     const projectId = req.body.projectId;
//     const projectName = req.body.projectName;
//     const projectdescribe = req.body.projectdescribe;
//     const projectMentor = req.body.projectMentor;
//     const userId = req.body.userId
//     Project.findByPk(projectId)
//     .then(project =>{
//         if(!project){
//             return res.status(404).json({ message: 'Project not found!' });
//         }
//         project.name = projectName;
//         project.describe = projectdescribe;
//         project.mentor = projectMentor;
//         project.userId = userId;
//         return project.save();
//     })
//     .then(() => {
//         res.status(200).json({message: 'project updated!'});
//     })
//     .catch(err => console.log(err));
// }

// exports.deleteProject = async(req, res) => {
//     const projectId = req.body.projectId;
//     User.findByPk(projectId)
//         .then(project =>{
//             if (!project) {
//                 return res.status(404).json({ message: 'project not found!' });
//             }
//             return User.destroy({
//                 where: {
//                 id: projectId
//                 }
//             });
//         })
//         .then(result => {
//             res.status(200).json({ message: 'project deleted!' });
//         })
//         .catch(err => console.log(err));
// }

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

        // 檢查觀摩權限
        const hasViewingPermission = project.is_open_for_viewing && 
            project.allowed_classes && 
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
        const { viewable_by } = req.query;
        const userId = req.userId;

        if (!viewable_by) {
            return res.status(400).json({ message: '缺少 viewable_by 參數' });
        }

        // 驗證用戶權限（確保用戶查詢自己班級的可觀摩專案）
        console.log('=== getViewableProjects Debug ===');
        console.log('userId:', userId);
        console.log('viewable_by:', viewable_by);
        
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

        // 查詢可觀摩的專案
        const projects = await Project.findAll({
            where: {
                is_open_for_viewing: true
            },
            include: [{
                model: User,
                through: { attributes: [] },
                attributes: ['id', 'username', 'class']
            }]
        });

        // 篩選允許指定班級觀摩的專案
        const viewableProjects = projects.filter(project => 
            project.allowed_classes && 
            project.allowed_classes.includes(viewable_by)
        );

        // 格式化回傳資料
        const formattedProjects = viewableProjects.map(project => ({
            id: project.id,
            name: project.name,
            describe: project.describe,
            mentor: project.mentor,
            currentStage: project.currentStage,
            currentSubStage: project.currentSubStage,
            createdAt: project.createdAt,
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
        const classes = await User.findAll({
            attributes: ['class'],
            where: {
                class: {
                    [require('sequelize').Op.ne]: null
                }
            },
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
    console.log('查詢班級:', className);
    
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
        
        // 2. 獲取這些用戶參與的所有專案
        const userIds = classUsers.map(user => user.id);
        console.log('用戶ID列表:', userIds);
        
        const projects = await Project.findAll({
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
                'allowed_classes'
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
