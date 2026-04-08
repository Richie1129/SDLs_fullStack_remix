const Submit = require('../models/submit');
const User = require('../models/user');
const Project = require('../models/project');
const Idea_wall = require('../models/idea_wall');
const Process = require('../models/process');
const Stage = require('../models/stage');
const { logSubmitChange, logSubmitFieldChanges } = require('../utils/submitChangeLogger');
const { logAudit } = require('../services/auditService');
const sequelize = require('../util/database');
const { createErrorResponse, getHttpStatusByErrorCode } = require('../constants/dailyErrorCodes');
const { invalidateProjectCache } = require('./assistant');
const apiCache = require('../services/apiCache');

// [Option B 隱藏] 四階段過濾服務
const { filterStage5Data, FOUR_STAGE_CONFIG } = require('../services/fourStageFilterService');

exports.createSubmit = async(req, res) => {
    const { content, projectId, projectid } = req.body;

    // Fix: Handle case sensitivity for projectId (frontend might send projectid)
    const pId = projectId || projectid;

    if (!content) {
        const errorResponse = createErrorResponse('EMPTY_CONTENT');
        const statusCode = getHttpStatusByErrorCode('EMPTY_CONTENT');
        return res.status(statusCode).json(errorResponse);
    }

    const t = await sequelize.transaction();
    try {
        // 從 DB 讀取專案當前階段（Row-level lock 防止並發推進）
        const project = await Project.findByPk(pId, {
            attributes: ['id', 'currentStage', 'currentSubStage', 'ProjectEnd'],
            transaction: t,
            lock: t.LOCK.UPDATE
        });

        if (!project) {
            await t.rollback();
            return res.status(404).json({ success: false, message: '專案不存在' });
        }

        if (project.ProjectEnd) {
            await t.rollback();
            return res.status(400).json({ success: false, message: '專案已完成，無法再提交' });
        }

        const currentStageInt = project.currentStage;
        const currentSubStageInt = project.currentSubStage;
        const stageKey = `${currentStageInt}-${currentSubStageInt}`;

        // 驗證前端送來的階段資訊
        const frontendStage = parseInt(req.body.currentStage);
        const frontendSubStage = parseInt(req.body.currentSubStage);
        if (isNaN(frontendStage) || isNaN(frontendSubStage)) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: '缺少必要的階段資訊 (currentStage, currentSubStage)'
            });
        }
        if (frontendStage !== currentStageInt || frontendSubStage !== currentSubStageInt) {
            await t.rollback();
            return res.status(409).json({
                success: false,
                message: '階段資訊已過期，其他組員可能已提交此階段，請重新整理頁面',
                currentStage: currentStageInt,
                currentSubStage: currentSubStageInt
            });
        }

        // 如果有檔案上傳（來自 MinIO 中介軟體）
        if (req.uploadedFiles && req.uploadedFiles.length > 0) {
            // 為每個檔案創建一筆 Submit 記錄
            const submitPromises = req.uploadedFiles.map(async (file) => {
                return Submit.create({
                    stage: stageKey,
                    content: content,
                    projectId: pId,
                    userId: req.userId,
                    fileName: file.fileName,
                    originalName: file.originalName,
                    fileUrl: file.url,
                    mimeType: file.mimeType,
                    fileSize: file.size
                }, { req, transaction: t });
            });

            await Promise.all(submitPromises);
        } else {
            // 沒有檔案上傳
            await Submit.create({
                stage: stageKey,
                content: content,
                projectId: pId,
                userId: req.userId,
            }, { req, transaction: t });
        }

        // 檢查並更新到下一階段
        const process = await Process.findAll({
            attributes: ['stage'],
            where: { projectId: pId },
            transaction: t
        });

        const stage = await Stage.findAll({
            attributes: ['sub_stage'],
            where: { id: process[0].stage[currentStageInt - 1] },
            transaction: t
        });

        // [Option B 隱藏] 使用四階段配置判斷完成狀態
        const maxStage = FOUR_STAGE_CONFIG.STAGE_MAX;  // 4
        const maxSubStage = FOUR_STAGE_CONFIG.SUB_STAGE_MAX;  // 3

        // 檢查是否到達最後一個子階段
        if (currentSubStageInt + 1 <= maxSubStage) {
            // 還有下一個子階段
            await Project.update({
                currentSubStage: currentSubStageInt + 1
            }, {
                where: { id: pId },
                individualHooks: true,
                req,
                transaction: t
            });

            // 防止重複建立 Idea_wall
            const nextStageKey = `${currentStageInt}-${currentSubStageInt + 1}`;
            const existingWall = await Idea_wall.findOne({
                where: { projectId: pId, stage: nextStageKey, type: 'project' },
                transaction: t
            });
            if (!existingWall) {
                await Idea_wall.create({
                    userId: req.userId,
                    projectId: pId,
                    stage: nextStageKey,
                    title: `${stage[0].sub_stage[currentSubStageInt]}`,
                    type: "project"
                }, { transaction: t });
            }
        } else {
            // 當前階段的子階段已完成，檢查是否有下一個主階段
            if (currentStageInt + 1 <= maxStage) {
                // 還有下一個主階段
                await Project.update({
                    currentStage: currentStageInt + 1,
                    currentSubStage: 1
                }, {
                    where: { id: pId },
                    individualHooks: true,
                    req,
                    transaction: t
                });

                const nextStage = await Stage.findAll({
                    attributes: ['sub_stage'],
                    where: { id: process[0].stage[currentStageInt] },
                    transaction: t
                });

                const nextStageKey = `${currentStageInt + 1}-1`;
                const existingWall = await Idea_wall.findOne({
                    where: { projectId: pId, stage: nextStageKey, type: 'project' },
                    transaction: t
                });
                if (!existingWall) {
                    await Idea_wall.create({
                        userId: req.userId,
                        projectId: pId,
                        stage: nextStageKey,
                        title: `${nextStage[0].sub_stage[0]}`,
                        type: "project"
                    }, { transaction: t });
                }
            } else {
                // [Option B 隱藏] 四階段全部完成（Stage 4-3），標記專案為完成狀態
                await Project.update({
                    ProjectEnd: true
                }, {
                    where: { id: pId },
                    individualHooks: true,
                    req,
                    transaction: t
                });

                const existingWall = await Idea_wall.findOne({
                    where: { projectId: pId, stage: 'completed', type: 'project' },
                    transaction: t
                });
                if (!existingWall) {
                    await Idea_wall.create({
                        userId: req.userId,
                        projectId: pId,
                        stage: "completed",
                        title: "專案已完成",
                        type: "project"
                    }, { transaction: t });
                }

                await t.commit();
                invalidateProjectCache(pId);
                // [Option B 隱藏] 返回 "done" 讓前端顯示完成提示
                return res.status(200).json({
                    success: true,
                    message: 'done'
                });
            }
        }

        await t.commit();

        // R2-H4: cache 清除移到 commit 之後，避免 commit 失敗時快取已被無效化
        invalidateProjectCache(pId);
        // R2-H5: 清除 apiCache（key 格式 projects:${userId}:${semester}）
        // 提交改變 currentStage，影響所有能看到此專案的使用者
        apiCache.delByPrefix('projects:');
        
        // Audit: Record submit creation
        await logAudit(req, {
            action: 'SUBMIT_CREATE',
            targetType: 'submit',
            targetId: null,
            projectId: pId,
            metadata: {
                stage: `${currentStageInt}-${currentSubStageInt}`,
                fileCount: req.uploadedFiles ? req.uploadedFiles.length : 0,
                hasContent: !!content
            }
        }).catch(() => {}); // Non-blocking
        
        res.status(200).json({
            success: true,
            message: 'Submit created successfully | 提交建立成功'
        });

    } catch (err) {
        console.error("❌ Submit creation failed | 提交建立失敗:", err);

        // 嘗試 rollback，如果失敗記錄關鍵錯誤
        try {
            await t.rollback();
        } catch (rollbackError) {
            console.error('❌❌❌ CRITICAL: Transaction rollback failed:', {
                originalError: err.message,
                rollbackError: rollbackError.message,
                projectId: pId,
                timestamp: new Date().toISOString()
            });
            // TODO: 觸發監控警報 (Sentry, CloudWatch 等)
        }

        const errorResponse = createErrorResponse('CREATE_FAILED', err.message);
        const statusCode = getHttpStatusByErrorCode('CREATE_FAILED');
        return res.status(statusCode).json(errorResponse);
    }
};

exports.getAllSubmit = async(req, res) => {
    const { projectId } = req.query;

    try {
        const allSubmit = await Submit.findAll({
            where: { projectId: projectId },
            include: [{
                model: User,
                attributes: ['id', 'username'],
            }],
            order: [['createdAt', 'ASC']]
        });

        // 在 JavaScript 中按階段排序
        allSubmit.sort((a, b) => {
            const [aStage, aSubStage] = a.stage.split('-').map(Number);
            const [bStage, bSubStage] = b.stage.split('-').map(Number);

            // 先按主階段排序
            if (aStage !== bStage) {
                return aStage - bStage;
            }
            // 再按子階段排序
            if (aSubStage !== bSubStage) {
                return aSubStage - bSubStage;
            }
            // 最後按創建時間排序
            return new Date(a.createdAt) - new Date(b.createdAt);
        });

        // 由於不再使用 BLOB，直接返回資料
        const submitsWithFileInfo = allSubmit.map(submit => submit.toJSON());

        // [Option B 隱藏] 過濾 Stage 5 資料，只返回 Stage 1-4
        const filteredSubmits = filterStage5Data(submitsWithFileInfo);
        res.status(200).json(filteredSubmits);

    } catch (error) {
        console.error("❌ Failed to get all submits | 取得所有提交失敗:", error);
        const errorResponse = createErrorResponse('QUERY_FAILED', error.message);
        const statusCode = getHttpStatusByErrorCode('QUERY_FAILED');
        res.status(statusCode).json(errorResponse);
    }
};

exports.getSubmit = async(req, res) => {
    const submitId = req.params.submitId;

    try {
        const submit = await Submit.findByPk(submitId);

        if (!submit) {
            const errorResponse = createErrorResponse('DAILY_NOT_FOUND', 'Submit not found');
            return res.status(404).json(errorResponse);
        }

        if (!submit.fileName) {
            return res.status(404).json({
                success: false,
                message: 'No file attached | 無檔案附件'
            });
        }

        // 返回檔案資訊，讓前端通過 MinIO URL 或預簽名 URL 下載
        res.status(200).json({
            fileName: submit.fileName,
            originalName: submit.originalName,
            fileUrl: submit.fileUrl,
            mimeType: submit.mimeType,
            fileSize: submit.fileSize
        });

    } catch (error) {
        console.error("❌ Failed to get submit | 取得提交失敗:", error);
        const errorResponse = createErrorResponse('QUERY_FAILED', error.message);
        const statusCode = getHttpStatusByErrorCode('QUERY_FAILED');
        res.status(statusCode).json(errorResponse);
    }
};

exports.updateSubmit = async (req, res) => {
    const submitId = req.params.submitId;
    const { content, changedBy } = req.body;

    const t = await sequelize.transaction();
    try {
        // H8: findByPk 移入 Transaction 並加 row lock 防止並發更新
        const submit = await Submit.findByPk(submitId, {
            transaction: t,
            lock: t.LOCK.UPDATE
        });
        if (!submit) {
            await t.rollback();
            const errorResponse = createErrorResponse('DAILY_NOT_FOUND', 'Submit not found');
            return res.status(404).json(errorResponse);
        }

        // 保存原始資料用於變更記錄
        const originalData = {
            content: submit.content,
            fileName: submit.fileName
        };

        // 1. 更新檔案（如果有）
        if (req.uploadedFile) {
            const file = req.uploadedFile;

            await submit.update({
                fileName: file.fileName,
                originalName: file.originalName,
                fileUrl: file.url,
                mimeType: file.mimeType,
                fileSize: file.size
            }, { req, transaction: t });

            // 記錄檔案變更
            try {
                await logSubmitChange({
                    submitId: submit.id,
                    changeType: 'update',
                    fieldName: 'file',
                    oldValue: originalData.fileName || '無檔案',
                    newValue: file.fileName,
                    changedBy: changedBy || '未知用戶',
                    projectId: submit.projectId,
                    description: `檔案從「${originalData.fileName || '無檔案'}」更新為「${file.originalName}」`
                });
            } catch (logError) {
                console.warn('記錄檔案變更失敗，但不影響主要功能:', logError);
            }
        }

        // 2. 更新文字內容（如果有）
        if (content !== undefined) {
            await submit.update({ content }, { req, transaction: t });

            // 記錄內容變更
            try {
                await logSubmitFieldChanges(
                    originalData,
                    { content },
                    submit.id,
                    changedBy || '未知用戶',
                    submit.projectId
                );
            } catch (logError) {
                console.warn('記錄內容變更失敗，但不影響主要功能:', logError);
            }
        }

        await t.commit();
        
        // Audit: Record submit update
        await logAudit(req, {
            action: 'SUBMIT_UPDATE',
            targetType: 'submit',
            targetId: submitId,
            projectId: submit.projectId,
            metadata: {
                hasFileUpdate: !!req.uploadedFile,
                hasContentUpdate: content !== undefined
            }
        }).catch(() => {}); // Non-blocking
        
        return res.status(200).json({
            success: true,
            message: "Submit updated successfully | 更新成功"
        });

    } catch (err) {
        console.error("❌ Submit update failed | 更新提交失敗:", err);

        try {
            await t.rollback();
        } catch (rollbackError) {
            console.error('❌❌❌ CRITICAL: Transaction rollback failed:', {
                originalError: err.message,
                rollbackError: rollbackError.message,
                submitId,
                timestamp: new Date().toISOString()
            });
            // TODO: 觸發監控警報
        }

        const errorResponse = createErrorResponse('UPDATE_FAILED', err.message);
        const statusCode = getHttpStatusByErrorCode('UPDATE_FAILED');
        return res.status(statusCode).json(errorResponse);
    }
};

// 取得提交變更記錄
exports.getSubmitChangeLogs = async (req, res) => {
    const { submitId } = req.params;

    try {
        const SubmitChangeLog = require('../models/submit_change_log');
        const changeLogs = await SubmitChangeLog.findAll({
            where: { submitId },
            order: [['createdAt', 'DESC']]
        });

        res.status(200).json(changeLogs);
    } catch (error) {
        console.error('❌ 取得提交變更記錄失敗:', error);

        // 如果是表不存在的錯誤，返回空陣列
        if (error.name === 'SequelizeDatabaseError' && error.message.includes('doesn\'t exist')) {
            console.log('submit_change_logs 表不存在，返回空記錄');
            return res.status(200).json([]);
        }

        const errorResponse = createErrorResponse('QUERY_FAILED', error.message);
        const statusCode = getHttpStatusByErrorCode('QUERY_FAILED');
        res.status(statusCode).json(errorResponse);
    }
};

exports.deleteSubmit = async (req, res) => {
    const { submitId } = req.params;

    try {
        const submit = await Submit.findByPk(submitId);
        if (!submit) {
            const errorResponse = createErrorResponse('DAILY_NOT_FOUND', 'Submit not found');
            return res.status(404).json(errorResponse);
        }

        // 先清理 MinIO 檔案
        try {
            const { extractSubmitFileNames, batchDeleteMinioFiles } = require('../utils/minioFileHelper');
            const fileNames = extractSubmitFileNames(submit);

            if (fileNames.length > 0) {
                await batchDeleteMinioFiles(fileNames);
            }
        } catch (fileCleanupError) {
            console.warn('MinIO file cleanup failed but continuing | MinIO 檔案清理失敗但繼續:', fileCleanupError.message);
        }

        // 記錄刪除操作
        try {
            await logSubmitChange({
                submitId: submit.id,
                changeType: 'delete',
                changedBy: req.user?.username || '未知用戶',
                projectId: submit.projectId,
                description: `刪除提交記錄 (階段: ${submit.stage})`
            });
        } catch (logError) {
            console.warn('記錄提交刪除失敗，但不影響主要功能:', logError);
        }

        // 刪除提交記錄（用 instance.destroy 讓 hooks 正常觸發）
        await submit.destroy({ req });
        
        // Audit: Record submit deletion
        await logAudit(req, {
            action: 'SUBMIT_DELETE',
            targetType: 'submit',
            targetId: submitId,
            projectId: submit.projectId,
            metadata: {
                stage: submit.stage
            }
        }).catch(() => {}); // Non-blocking

        return res.status(200).json({
            success: true,
            message: "Submit deleted successfully | 提交記錄刪除成功"
        });

    } catch (error) {
        console.error("❌ Submit deletion failed | 刪除提交記錄失敗:", error);
        const errorResponse = createErrorResponse('DELETE_FAILED', error.message);
        const statusCode = getHttpStatusByErrorCode('DELETE_FAILED');
        return res.status(statusCode).json(errorResponse);
    }
};
