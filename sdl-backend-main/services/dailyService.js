const Daily_personal = require('../models/daily_personal');
const Daily_team = require('../models/daily_team');
const { logAudit, summarizeText, clampMetadataSize } = require('../services/auditService');
const { deleteFileFromMinio } = require('../config/minio');
const { extractDailyFileNames, batchDeleteMinioFiles } = require('../utils/minioFileHelper');

/**
 * 獲取日誌列表
 */
const getDailies = async (Model, where, include = []) => {
    return await Model.findAll({
        where,
        include,
        order: [['createdAt', 'DESC']]
    });
};

/**
 * 建立日誌（支援多檔案上傳）
 */
const createDaily = async (type, data, files, req) => {
    const { userId, projectId, title, content, creator, stage } = data;
    const Model = type === 'personal' ? Daily_personal : Daily_team;
    const action = type === 'personal' ? 'DAILY_PERSONAL_CREATE' : 'DAILY_TEAM_CREATE';
    const targetType = type === 'personal' ? 'daily_personal' : 'daily_team';

    if (files && files.length > 0) {
        const promises = files.map(async (file) => {
            const created = await Model.create({
                userId,
                projectId,
                title,
                content,
                creator, // 僅團隊日誌使用
                stage,
                fileName: file.fileName,
                originalName: file.originalName,
                fileUrl: file.url,
                mimeType: file.mimeType,
                fileSize: file.size
            }, { req });

            let fiveRsAfter = null;
            if (type === 'personal') {
                try {
                    const parsed = JSON.parse(content || '{}');
                    if (parsed && parsed.type === '5Rs_reflection' && parsed.data) {
                        fiveRsAfter = parsed.data;
                    }
                } catch (_) {}
            }

            await logAudit(req, {
                action,
                targetType,
                targetId: created.id,
                projectId: parseInt(projectId, 10) || null,
                metadata: clampMetadataSize({
                    after: {
                        title: summarizeText(title || ''),
                        content: summarizeText(content || ''),
                        file: { name: file.originalName || file.fileName, size: file.size, mimeType: file.mimeType },
                        ...(fiveRsAfter ? { fiveRs: fiveRsAfter } : {})
                    }
                })
            });
            return created;
        });

        return await Promise.all(promises);
    } else {
        const created = await Model.create({
            userId,
            projectId,
            title,
            content,
            creator,
            stage
        }, { req });

        let fiveRsAfter = null;
        if (type === 'personal') {
            try {
                const parsed = JSON.parse(content || '{}');
                if (parsed && parsed.type === '5Rs_reflection' && parsed.data) {
                    fiveRsAfter = parsed.data;
                }
            } catch (_) {}
        }

        await logAudit(req, {
            action,
            targetType,
            targetId: created.id,
            projectId: parseInt(projectId, 10) || null,
            metadata: clampMetadataSize({
                after: {
                    title: summarizeText(title || ''),
                    content: summarizeText(content || ''),
                    ...(fiveRsAfter ? { fiveRs: fiveRsAfter } : {})
                }
            })
        });
        return [created];
    }
};

/**
 * 更新日誌
 */
const updateDaily = async (type, id, data, files, req) => {
    const { title, content, stage } = data;
    const Model = type === 'personal' ? Daily_personal : Daily_team;
    const action = type === 'personal' ? 'DAILY_PERSONAL_UPDATE' : 'DAILY_TEAM_UPDATE';
    const targetType = type === 'personal' ? 'daily_personal' : 'daily_team';

    const daily = await Model.findOne({ where: { id } });
    if (!daily) return null;

    const before = { 
        title: daily.title, 
        content: daily.content, 
        fileName: daily.fileName, 
        mimeType: daily.mimeType, 
        fileSize: daily.fileSize 
    };

    let updateData = { title, content, stage };
    let firstFile = null;

    if (files && files.length > 0) {
        firstFile = files[0];
        updateData = {
            ...updateData,
            fileName: firstFile.fileName,
            originalName: firstFile.originalName,
            fileUrl: firstFile.url,
            mimeType: firstFile.mimeType,
            fileSize: firstFile.size
        };
    }

    await daily.update(updateData, { req });

    // 5Rs 差異分析 (僅個人日誌)
    let fiveRsDiff = null;
    if (type === 'personal') {
        try {
            const beforeJson = JSON.parse(before.content || '{}');
            const afterJson = JSON.parse(content || '{}');
            if ((beforeJson && beforeJson.type === '5Rs_reflection') || (afterJson && afterJson.type === '5Rs_reflection')) {
                const beforeData = (beforeJson && beforeJson.data) || {};
                const afterData = (afterJson && afterJson.data) || {};
                const keys = ['reporting', 'responding', 'relating', 'reasoning', 'reconstructing'];
                const changed = {};
                for (const k of keys) {
                    const b = beforeData?.[k] ?? '';
                    const a = afterData?.[k] ?? '';
                    if (String(b) !== String(a)) changed[k] = { before: String(b), after: String(a) };
                }
                if (Object.keys(changed).length > 0) fiveRsDiff = changed;
            }
        } catch (_) {}
    }

    await logAudit(req, {
        action,
        targetType,
        targetId: daily.id,
        projectId: daily.projectId || null,
        metadata: clampMetadataSize({
            changed: Object.keys(updateData),
            diff: {
                title: { before: summarizeText(before.title || ''), after: summarizeText(title || '') },
                content: { before: summarizeText(before.content || ''), after: summarizeText(content || '') },
                ...(firstFile ? {
                    file: {
                        before: { name: before.fileName || null, size: before.fileSize || null, mimeType: before.mimeType || null },
                        after: { name: firstFile.fileName, size: firstFile.size, mimeType: firstFile.mimeType }
                    }
                } : {}),
                ...(fiveRsDiff ? { fiveRs: fiveRsDiff } : {})
            }
        })
    });

    // 處理額外檔案
    if (files && files.length > 1) {
        const additionalFiles = files.slice(1);
        const additionalPromises = additionalFiles.map(async (file, index) => {
            const created = await Model.create({
                userId: daily.userId,
                projectId: daily.projectId,
                title: `${title} (附件 ${index + 2})`,
                content: content,
                creator: daily.creator,
                stage,
                fileName: file.fileName,
                originalName: file.originalName,
                fileUrl: file.url,
                mimeType: file.mimeType,
                fileSize: file.size
            }, { req });

            await logAudit(req, {
                action: type === 'personal' ? 'DAILY_PERSONAL_CREATE' : 'DAILY_TEAM_CREATE',
                targetType,
                targetId: created.id,
                projectId: daily.projectId || null,
                metadata: clampMetadataSize({
                    after: {
                        title: summarizeText(created.title || ''),
                        content: summarizeText(content || ''),
                        file: { name: file.originalName || file.fileName, size: file.size, mimeType: file.mimeType }
                    }
                })
            });
            return created;
        });
        await Promise.all(additionalPromises);
    }

    return daily;
};

/**
 * 刪除日誌
 */
const deleteDaily = async (type, id, req) => {
    const Model = type === 'personal' ? Daily_personal : Daily_team;
    const action = type === 'personal' ? 'DAILY_PERSONAL_DELETE' : 'DAILY_TEAM_DELETE';
    const targetType = type === 'personal' ? 'daily_personal' : 'daily_team';

    const daily = await Model.findOne({ where: { id } });
    if (!daily) return null;

    let fileNames = [];
    try {
        fileNames = extractDailyFileNames(daily);
        if (fileNames.length > 0) {
            await batchDeleteMinioFiles(fileNames);
        }
    } catch (e) {
        console.warn('MinIO cleanup error:', e.message);
    }

    await logAudit(req, {
        action,
        targetType,
        targetId: daily.id,
        projectId: daily.projectId || null,
        metadata: clampMetadataSize({
            before: {
                title: summarizeText(daily.title || ''),
                content: summarizeText(daily.content || ''),
                files: fileNames
            }
        })
    });

    return await daily.destroy({ req });
};

/**
 * 移除附件
 */
const removeAttachment = async (type, id, req) => {
    const Model = type === 'personal' ? Daily_personal : Daily_team;
    const action = type === 'personal' ? 'DAILY_PERSONAL_ATTACHMENT_REMOVE' : 'DAILY_TEAM_ATTACHMENT_REMOVE';
    const targetType = type === 'personal' ? 'daily_personal' : 'daily_team';

    const daily = await Model.findOne({ where: { id } });
    if (!daily) return null;

    const before = {
        fileName: daily.fileName,
        originalName: daily.originalName,
        fileUrl: daily.fileUrl,
        mimeType: daily.mimeType,
        fileSize: daily.fileSize,
    };

    if (daily.fileName) {
        try {
            await deleteFileFromMinio(daily.fileName);
        } catch (e) {
            console.warn('MinIO delete error:', e.message);
        }
    }

    await daily.update({
        fileName: null,
        originalName: null,
        fileUrl: null,
        mimeType: null,
        fileSize: null,
        fileData: null,
        filename: null,
    }, { req });

    await logAudit(req, {
        action,
        targetType,
        targetId: daily.id,
        projectId: daily.projectId || null,
        metadata: clampMetadataSize({
            diff: {
                file: {
                    before,
                    after: { fileName: null, originalName: null, fileUrl: null, mimeType: null, fileSize: null }
                }
            }
        })
    });

    return daily;
};

module.exports = {
    getDailies,
    createDaily,
    updateDaily,
    deleteDaily,
    removeAttachment
};
