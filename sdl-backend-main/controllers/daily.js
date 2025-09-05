//controllers/daily.js
const Daily_personal = require('../models/daily_personal');
const Daily_team = require('../models/daily_team');
const { logAudit, summarizeText, clampMetadataSize } = require('../services/auditService');
const { deleteFileFromMinio } = require('../config/minio');

exports.getPersonalDaily = async (req, res) => {
    const { userId, projectId, isTeacher } = req.query;

    try {
        let personalDaily;

        if (isTeacher === "true") {
            // 教師端：獲取該 projectId 內所有學生的個人日誌
            personalDaily = await Daily_personal.findAll({
                where: { projectId }
            });
        } else {
            // 學生端：僅獲取自己(userId)的日誌
            personalDaily = await Daily_personal.findAll({
                where: { projectId, userId }
            });
        }

        res.status(200).json(personalDaily);
    } catch (err) {
        console.error("取得個人日誌失敗:", err);
        res.status(500).json({ message: "獲取日誌失敗", error: err });
    }
};

exports.createPersonalDaily = async (req, res) => {
    const { userId, projectId, title, content } = req.body;
    
    if (!title) {
        return res.status(400).send({ message: 'please enter title!' });
    }

    if (!content) {
        return res.status(400).send({ message: 'please fill in the form!' });
    }

    console.log('=== 創建個人日誌 ===');
    console.log('用戶ID:', userId);
    console.log('專案ID:', projectId);
    console.log('標題:', title);
    console.log('內容:', content);
    console.log('上傳的檔案:', req.uploadedFiles);
    
    try {
        // 檢查是否有上傳的檔案（來自 MinIO 中介軟體）
        if (req.uploadedFiles && req.uploadedFiles.length > 0) {
            console.log(`📁 檢測到 ${req.uploadedFiles.length} 個檔案`);
            
            // 有檔案上傳 - 為每個檔案創建一筆記錄
            const dailyPromises = req.uploadedFiles.map(async (file, index) => {
                console.log(`處理檔案 ${index + 1}/${req.uploadedFiles.length}:`, {
                    fileName: file.fileName,
                    originalName: file.originalName,
                    url: file.url,
                    size: file.size
                });
                
                return Daily_personal.create({
                        userId: userId,
                        projectId: projectId,
                        title: title,
                        content: content,
                    // 改為儲存 MinIO 相關資訊，而非 BLOB
                    fileName: file.fileName,        // MinIO 檔案名
                    originalName: file.originalName, // 原始檔案名
                    fileUrl: file.url,              // MinIO URL
                    mimeType: file.mimeType,        // 檔案類型
                    fileSize: file.size             // 檔案大小
                        }, { req }).then(async (created) => {
                            // 檢查是否為 5Rs 反思，若是則在 after 中附上 5Rs 初始值（僅建立時）
                            let fiveRsAfter = null;
                            try {
                                const parsed = JSON.parse(content || '{}');
                                if (parsed && parsed.type === '5Rs_reflection' && parsed.data) {
                                    fiveRsAfter = parsed.data;
                                }
                            } catch (_) {}

                            await logAudit(req, {
                                action: 'DAILY_PERSONAL_CREATE',
                                targetType: 'daily_personal',
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
            });

            await Promise.all(dailyPromises);
            console.log(`✅ 創建個人日誌成功 (${req.uploadedFiles.length} 個檔案)`);
            
    } else {
            console.log('📝 無檔案上傳，創建純文字日誌');
            // 沒有檔案上傳
        const created = await Daily_personal.create({
            userId: userId,
            projectId: projectId,
            title: title,
            content: content,
            }, { req });
            // 檢查是否為 5Rs 反思，若是則在 after 中附上 5Rs 初始值（僅建立時）
            let fiveRsAfterNoFile = null;
            try {
                const parsed = JSON.parse(content || '{}');
                if (parsed && parsed.type === '5Rs_reflection' && parsed.data) {
                    fiveRsAfterNoFile = parsed.data;
                }
            } catch (_) {}

            await logAudit(req, {
                action: 'DAILY_PERSONAL_CREATE',
                targetType: 'daily_personal',
                targetId: created.id,
                projectId: parseInt(projectId, 10) || null,
                metadata: clampMetadataSize({ after: { title: summarizeText(title || ''), content: summarizeText(content || ''), ...(fiveRsAfterNoFile ? { fiveRs: fiveRsAfterNoFile } : {}) } })
            });
            console.log('✅ 創建個人日誌成功 (無檔案)');
        }

        console.log('==================');
                return res.status(200).send({ message: 'create success!' });
        
    } catch (err) {
        console.error('❌ 創建個人日誌失敗:', err);
        return res.status(500).send({ message: 'create failed!', error: err.message });
    }
};

exports.getTeamDaily = async (req, res) => {
    const { projectId } = req.query;
    
    try {
    const teamDaily = await Daily_team.findAll({
        where: {
            projectId: projectId,
        }
        });
        
        console.log('取得團隊日誌成功');
        res.status(200).json(teamDaily);
        
    } catch (err) {
        console.error('取得團隊日誌失敗:', err);
        res.status(500).json({ message: '取得團隊日誌失敗', error: err.message });
}
};

exports.createTeamDaily = async (req, res) => {
    const { userId, projectId, title, content, creator } = req.body;
    
    if (!title) {
        return res.status(400).send({ message: 'please enter title!' });
    }

    console.log('=== 創建團隊日誌 ===');
    console.log('用戶ID:', userId);
    console.log('專案ID:', projectId);
    console.log('創建者:', creator);
    console.log('標題:', title);
    console.log('內容:', content);
    console.log('上傳的檔案:', req.uploadedFiles);
    
    try {
        // 檢查是否有上傳的檔案（來自 MinIO 中介軟體）
        if (req.uploadedFiles && req.uploadedFiles.length > 0) {
            console.log(`📁 檢測到 ${req.uploadedFiles.length} 個檔案`);
            
            // 有檔案上傳 - 為每個檔案創建一筆記錄
            const dailyPromises = req.uploadedFiles.map(async (file, index) => {
                console.log(`處理檔案 ${index + 1}/${req.uploadedFiles.length}:`, {
                    fileName: file.fileName,
                    originalName: file.originalName,
                    url: file.url,
                    size: file.size
                });
                
                return Daily_team.create({
                        userId: userId,
                        projectId: projectId,
                        title: title,
                        content: content,
                        creator: creator,
                    // 改為儲存 MinIO 相關資訊
                    fileName: file.fileName,        // MinIO 檔案名
                    originalName: file.originalName, // 原始檔案名
                    fileUrl: file.url,              // MinIO URL
                    mimeType: file.mimeType,        // 檔案類型
                    fileSize: file.size             // 檔案大小
                        }).then(async (created) => {
                            try {
                                await logAudit(req, {
                                    action: 'DAILY_TEAM_CREATE',
                                    targetType: 'daily_team',
                                    targetId: created.id,
                                    projectId: parseInt(projectId, 10) || null,
                                    metadata: clampMetadataSize({
                                        after: {
                                            title: summarizeText(title || ''),
                                            content: summarizeText(content || ''),
                                            file: { name: file.originalName || file.fileName, size: file.size, mimeType: file.mimeType }
                                        }
                                    })
                                });
                            } catch (_) {}
                            return created;
                        });
            });

            await Promise.all(dailyPromises);
            console.log(`✅ 創建團隊日誌成功 (${req.uploadedFiles.length} 個檔案)`);
            
    } else {
            console.log('📝 無檔案上傳，創建純文字日誌');
            // 沒有檔案上傳
        const created = await Daily_team.create({
            userId: userId,
            projectId: projectId,
            title: title,
            content: content,
            creator: creator,
            });
            try {
                await logAudit(req, {
                    action: 'DAILY_TEAM_CREATE',
                    targetType: 'daily_team',
                    targetId: created.id,
                    projectId: parseInt(projectId, 10) || null,
                    metadata: clampMetadataSize({ after: { title: summarizeText(title || ''), content: summarizeText(content || '') } })
                });
            } catch (_) {}
            console.log('✅ 創建團隊日誌成功 (無檔案)');
        }

        console.log('==================');
                return res.status(200).send({ message: 'create success!' });
        
    } catch (err) {
        console.error('❌ 創建團隊日誌失敗:', err);
        return res.status(500).send({ message: 'create failed!', error: err.message });
    }
};

exports.updatePersonalDaily = async (req, res) => {
    const { id } = req.params;
    const { title, content } = req.body;

    try {
        const daily = await Daily_personal.findOne({ where: { id } });
        if (!daily) {
            return res.status(404).json({ message: "日誌未找到" });
        }
        const before = { title: daily.title, content: daily.content, fileName: daily.fileName, mimeType: daily.mimeType, fileSize: daily.fileSize };

        console.log('=== 更新個人日誌 ===');
        console.log('日誌ID:', id);
        console.log('新標題:', title);
        console.log('新內容:', content);
        console.log('上傳的單檔:', req.uploadedFile);
        console.log('上傳的多檔:', req.uploadedFiles);

        // 將單檔與多檔統一處理
        const incomingFiles = Array.isArray(req.uploadedFiles) && req.uploadedFiles.length > 0
          ? req.uploadedFiles
          : (req.uploadedFile ? [req.uploadedFile] : []);

        // 若有上傳檔案（單檔或多檔）
        if (incomingFiles.length > 0) {
            console.log(`📁 檢測到 ${incomingFiles.length} 個檔案上傳`);

            // 只將第一個檔案更新到原有記錄
            const firstFile = incomingFiles[0];

            const updateData = {
                title,
                content,
                fileName: firstFile.fileName,
                originalName: firstFile.originalName,
                fileUrl: firstFile.url,
                mimeType: firstFile.mimeType,
                fileSize: firstFile.size
            };

            await daily.update(updateData, { req });

            // 針對 5Rs 反思：解析 before/after，產出欄位級差異
            let fiveRsDiff = null;
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
                        if (String(b) !== String(a)) {
                            changed[k] = { before: String(b), after: String(a) };
                        }
                    }
                    if (Object.keys(changed).length > 0) fiveRsDiff = changed;
                }
            } catch (_) {}

            await logAudit(req, {
                action: 'DAILY_PERSONAL_UPDATE',
                targetType: 'daily_personal',
                targetId: daily.id,
                projectId: daily.projectId || null,
                metadata: clampMetadataSize({
                    changed: Object.keys(updateData),
                    diff: {
                        title: { before: summarizeText(before.title || ''), after: summarizeText(title || '') },
                        content: { before: summarizeText(before.content || ''), after: summarizeText(content || '') },
                        file: {
                            before: { name: before.fileName || null, size: before.fileSize || null, mimeType: before.mimeType || null },
                            after: { name: firstFile.fileName, size: firstFile.size, mimeType: firstFile.mimeType }
                        },
                        ...(fiveRsDiff ? { fiveRs: fiveRsDiff } : {})
                    }
                })
            });
            console.log(`✅ 更新個人日誌成功: ${id} (包含檔案: ${firstFile.originalName || firstFile.fileName})`);

            // 如果有其他檔案，創建新的記錄（維持既有行為）
            if (incomingFiles.length > 1) {
                const additionalFiles = incomingFiles.slice(1);
                console.log(`📎 創建額外的 ${additionalFiles.length} 個檔案記錄`);

                const additionalPromises = additionalFiles.map((file, index) => {
                    return Daily_personal.create({
                        userId: daily.userId,
                        projectId: daily.projectId,
                        title: `${title} (附件 ${index + 2})`,
                        content: content,
                        fileName: file.fileName,
                        originalName: file.originalName,
                        fileUrl: file.url,
                        mimeType: file.mimeType,
                        fileSize: file.size
                    }, { req }).then(async (created) => {
                        await logAudit(req, {
                            action: 'DAILY_PERSONAL_CREATE',
                            targetType: 'daily_personal',
                            targetId: created.id,
                            projectId: daily.projectId || null,
                            metadata: clampMetadataSize({ after: { title: summarizeText(created.title || ''), content: summarizeText(content || ''), file: { name: file.originalName || file.fileName, size: file.size, mimeType: file.mimeType } } })
                        });
                        return created;
                    });
                });

                await Promise.all(additionalPromises);
                console.log(`✅ 創建額外檔案記錄成功`);
            }
        } else {
            // 沒有檔案上傳，只更新文字內容
            console.log('📝 無檔案上傳，僅更新文字內容');
            let updateData = { title, content };

            await daily.update(updateData, { req });

            // 針對 5Rs 反思：解析 before/after，產出欄位級差異
            let fiveRsDiff2 = null;
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
                        if (String(b) !== String(a)) {
                            changed[k] = { before: String(b), after: String(a) };
                        }
                    }
                    if (Object.keys(changed).length > 0) fiveRsDiff2 = changed;
                }
            } catch (_) {}

            await logAudit(req, {
                action: 'DAILY_PERSONAL_UPDATE',
                targetType: 'daily_personal',
                targetId: daily.id,
                projectId: daily.projectId || null,
                metadata: clampMetadataSize({
                    changed: Object.keys(updateData),
                    diff: {
                        title: { before: summarizeText(before.title || ''), after: summarizeText(title || '') },
                        content: { before: summarizeText(before.content || ''), after: summarizeText(content || '') },
                        ...(fiveRsDiff2 ? { fiveRs: fiveRsDiff2 } : {})
                    }
                })
            });
            console.log(`✅ 更新個人日誌成功: ${id}`);
        }
        
        console.log('==================');
        
        return res.status(200).json({ message: "更新成功", data: daily });
        
    } catch (error) {
        console.error("❌ 更新個人日誌錯誤:", error);
        return res.status(500).json({ message: "更新失敗", error: error.message });
    }
};

exports.updateTeamDaily = async (req, res) => {
    console.log("收到的 params:", req.params);
    console.log("收到的請求:", req.body);
    
    const { id } = req.params;
    const { title, content } = req.body;
    
    try {
        const daily = await Daily_team.findOne({ where: { id } });
        if (!daily) {
            return res.status(404).json({ message: "小組日誌未找到" });
        }

        console.log('=== 更新團隊日誌 ===');
        console.log('日誌ID:', id);
        console.log('新標題:', title);
        console.log('新內容:', content);
        console.log('上傳的檔案:', req.uploadedFile);
        
        let updateData = { title, content };
        
        // 如果有新檔案上傳，更新檔案資訊
        if (req.uploadedFile) {
            console.log('📁 檢測到新檔案上傳:', {
                fileName: req.uploadedFile.fileName,
                originalName: req.uploadedFile.originalName,
                url: req.uploadedFile.url,
                size: req.uploadedFile.size
            });
            
            updateData.fileName = req.uploadedFile.fileName;
            updateData.originalName = req.uploadedFile.originalName;
            updateData.fileUrl = req.uploadedFile.url;
            updateData.mimeType = req.uploadedFile.mimeType;
            updateData.fileSize = req.uploadedFile.size;
        }

        const before = { title: daily.title, content: daily.content, fileName: daily.fileName, mimeType: daily.mimeType, fileSize: daily.fileSize };
        await daily.update(updateData, { req });
        await logAudit(req, {
            action: 'DAILY_TEAM_UPDATE',
            targetType: 'daily_team',
            targetId: daily.id,
            projectId: daily.projectId || null,
            metadata: clampMetadataSize({
                changed: Object.keys(updateData),
                diff: {
                    title: { before: summarizeText(before.title || ''), after: summarizeText(title || '') },
                    content: { before: summarizeText(before.content || ''), after: summarizeText(content || '') },
                    ...(req.uploadedFile ? { file: { before: { name: before.fileName || null, size: before.fileSize || null, mimeType: before.mimeType || null }, after: { name: req.uploadedFile.fileName, size: req.uploadedFile.size, mimeType: req.uploadedFile.mimeType } } } : {})
                }
            })
        });
        console.log(`✅ 更新團隊日誌成功: ${id}`);
        console.log('==================');
        
        return res.status(200).json({ message: "更新成功", data: daily });
        
    } catch (error) {
        console.error("❌ 更新團隊日誌錯誤:", error);
        return res.status(500).json({ message: "更新失敗", error: error.message });
    }
};

// 單獨刪除個人日誌附件
exports.removePersonalAttachment = async (req, res) => {
    const { id } = req.params;
    try {
        const daily = await Daily_personal.findOne({ where: { id } });
        if (!daily) {
            return res.status(404).json({ message: '個人日誌未找到' });
        }

        const before = {
            fileName: daily.fileName,
            originalName: daily.originalName,
            fileUrl: daily.fileUrl,
            mimeType: daily.mimeType,
            fileSize: daily.fileSize,
        };

        // 先刪除 MinIO 檔案（若存在）
        if (daily.fileName) {
            try {
                await deleteFileFromMinio(daily.fileName);
                console.log(`🗑️ 已刪除 MinIO 檔案: ${daily.fileName}`);
            } catch (e) {
                console.warn('⚠️ 刪除 MinIO 檔案時發生錯誤，將繼續清理資料庫欄位:', e.message);
            }
        }

        // 清空資料庫中的附件欄位
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
            action: 'DAILY_PERSONAL_ATTACHMENT_REMOVE',
            targetType: 'daily_personal',
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

        return res.status(200).json({ message: '附件已移除', data: daily });
    } catch (error) {
        console.error('❌ 移除個人日誌附件失敗:', error);
        return res.status(500).json({ message: '移除附件失敗', error: error.message });
    }
};

// 單獨刪除小組日誌附件
exports.removeTeamAttachment = async (req, res) => {
    const { id } = req.params;
    try {
        const daily = await Daily_team.findOne({ where: { id } });
        if (!daily) {
            return res.status(404).json({ message: '小組日誌未找到' });
        }

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
                console.log(`🗑️ 已刪除 MinIO 檔案: ${daily.fileName}`);
            } catch (e) {
                console.warn('⚠️ 刪除 MinIO 檔案時發生錯誤，將繼續清理資料庫欄位:', e.message);
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
            action: 'DAILY_TEAM_ATTACHMENT_REMOVE',
            targetType: 'daily_team',
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

        return res.status(200).json({ message: '附件已移除', data: daily });
    } catch (error) {
        console.error('❌ 移除小組日誌附件失敗:', error);
        return res.status(500).json({ message: '移除附件失敗', error: error.message });
    }
};

exports.deletePersonalDaily = async (req, res) => {
    const { id } = req.params;
    
    try {
        const daily = await Daily_personal.findOne({ where: { id } });
        if (!daily) {
            return res.status(404).json({ message: "個人日誌未找到" });
        }

        console.log('=== 刪除個人日誌 ===');
        console.log('日誌ID:', id);
        console.log('標題:', daily.title);
        
        // 先清理 MinIO 檔案
        let fileNames = [];
        try {
            const { extractDailyFileNames, batchDeleteMinioFiles } = require('../utils/minioFileHelper');
            fileNames = extractDailyFileNames(daily);
            
            if (fileNames.length > 0) {
                console.log(`📁 個人日誌 ${id} 發現 ${fileNames.length} 個檔案需要刪除:`, fileNames);
                const deleteResult = await batchDeleteMinioFiles(fileNames);
                console.log(`🗑️ MinIO 檔案清理結果: ${deleteResult.success} 成功, ${deleteResult.failed} 失敗`);
            } else {
                console.log(`📁 個人日誌 ${id} 沒有發現需要清理的檔案`);
            }
        } catch (fileCleanupError) {
            console.warn('⚠️ MinIO 檔案清理過程中發生錯誤，但繼續刪除日誌:', fileCleanupError.message);
        }

        // Audit: delete daily personal (before)
        await logAudit(req, {
            action: 'DAILY_PERSONAL_DELETE',
            targetType: 'daily_personal',
            targetId: daily.id,
            projectId: daily.projectId || null,
            metadata: clampMetadataSize({ before: { title: summarizeText(daily.title || ''), content: summarizeText(daily.content || ''), files: fileNames } })
        });

        // 刪除日誌記錄（用 instance.destroy 讓 hooks/一致行為）
        await daily.destroy({ req });
        console.log(`✅ 個人日誌 ${id} 刪除完成`);
        console.log('==================');
        
        return res.status(200).json({ message: "個人日誌刪除成功" });
        
    } catch (error) {
        console.error("❌ 刪除個人日誌錯誤:", error);
        return res.status(500).json({ message: "刪除失敗", error: error.message });
    }
};

exports.deleteTeamDaily = async (req, res) => {
    const { id } = req.params;
    
    try {
        const daily = await Daily_team.findOne({ where: { id } });
        if (!daily) {
            return res.status(404).json({ message: "團隊日誌未找到" });
        }

        console.log('=== 刪除團隊日誌 ===');
        console.log('日誌ID:', id);
        console.log('標題:', daily.title);
        console.log('創建者:', daily.creator);
        
        // 先清理 MinIO 檔案
        let fileNames = [];
        try {
            const { extractDailyFileNames, batchDeleteMinioFiles } = require('../utils/minioFileHelper');
            fileNames = extractDailyFileNames(daily);
            
            if (fileNames.length > 0) {
                console.log(`📁 團隊日誌 ${id} 發現 ${fileNames.length} 個檔案需要刪除:`, fileNames);
                const deleteResult = await batchDeleteMinioFiles(fileNames);
                console.log(`🗑️ MinIO 檔案清理結果: ${deleteResult.success} 成功, ${deleteResult.failed} 失敗`);
            } else {
                console.log(`📁 團隊日誌 ${id} 沒有發現需要清理的檔案`);
            }
        } catch (fileCleanupError) {
            console.warn('⚠️ MinIO 檔案清理過程中發生錯誤，但繼續刪除日誌:', fileCleanupError.message);
        }

        // Audit: delete daily team (before)
        await logAudit(req, {
            action: 'DAILY_TEAM_DELETE',
            targetType: 'daily_team',
            targetId: daily.id,
            projectId: daily.projectId || null,
            metadata: clampMetadataSize({ before: { title: summarizeText(daily.title || ''), content: summarizeText(daily.content || ''), files: fileNames } })
        });

        // 刪除日誌記錄（用 instance.destroy 讓 hooks/一致行為）
        await daily.destroy({ req });
        console.log(`✅ 團隊日誌 ${id} 刪除完成`);
        console.log('==================');
        
        return res.status(200).json({ message: "團隊日誌刪除成功" });
        
    } catch (error) {
        console.error("❌ 刪除團隊日誌錯誤:", error);
        return res.status(500).json({ message: "刪除失敗", error: error.message });
    }
};
