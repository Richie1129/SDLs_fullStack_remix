const Submit = require('../models/submit');
const Project = require('../models/project');
const Idea_wall = require('../models/idea_wall');
const Process = require('../models/process');
const Stage = require('../models/stage');
const { logSubmitChange, logSubmitFieldChanges } = require('../utils/submitChangeLogger');

exports.createSubmit = async(req, res) => {
    const { currentStage, currentSubStage, content, projectId } = req.body;
    const currentStageInt = parseInt(currentStage);
    const currentSubStageInt = parseInt(currentSubStage);

    console.log('=== 創建提交 ===');
    console.log("接收到的資料:", req.body);
    console.log("接收到的檔案:", req.uploadedFiles);
    console.log('階段:', `${currentStageInt}-${currentSubStageInt}`);
    console.log('專案ID:', projectId);
    console.log('內容:', content);

    if (!content) {
        console.log('❌ 內容為空');
        return res.status(400).send({ message: '請填寫表單!' });
    }

    try {
        // 如果有檔案上傳（來自 MinIO 中介軟體）
        if (req.uploadedFiles && req.uploadedFiles.length > 0) {
            console.log(`📁 檢測到 ${req.uploadedFiles.length} 個檔案`);
            
            // 為每個檔案創建一筆 Submit 記錄
            const submitPromises = req.uploadedFiles.map(async (file, index) => {
                console.log(`處理檔案 ${index + 1}/${req.uploadedFiles.length}:`, {
                    fileName: file.fileName,
                    originalName: file.originalName,
                    url: file.url,
                    size: file.size
                });
                
                return Submit.create({
                    stage: `${currentStageInt}-${currentSubStageInt}`,
                    content: content,
                    projectId: projectId,
                    // 改為儲存 MinIO 相關資訊，而非 BLOB
                    fileName: file.fileName,        // MinIO 檔案名
                    originalName: file.originalName, // 原始檔案名
                    fileUrl: file.url,              // MinIO URL
                    mimeType: file.mimeType,        // 檔案類型
                    fileSize: file.size             // 檔案大小
                });
            });

            await Promise.all(submitPromises);
            console.log(`✅ 創建 Submit 成功 (${req.uploadedFiles.length} 個檔案)`);
            
        } else {
            console.log('📝 無檔案上傳，創建純文字提交');
            // 沒有檔案上傳
            await Submit.create({
                stage: `${currentStageInt}-${currentSubStageInt}`,
                content: content,
                projectId: projectId,
            });
            console.log('✅ 創建 Submit 成功 (無檔案)');
        }

        // 檢查並更新到下一階段
        const process = await Process.findAll({
            attributes: ['stage'],
            where: { projectId: projectId }
        });

        const stage = await Stage.findAll({
            attributes: ['sub_stage'],
            where: { id: process[0].stage[currentStageInt - 1] }
        });

        if (currentSubStageInt + 1 <= stage[0].sub_stage.length) {
            await Project.update({
                currentSubStage: currentSubStageInt + 1
            }, {
                where: { id: projectId }
            });

            await Idea_wall.create({
                userId: req.body.userId,
                projectId: projectId,
                stage: `${currentStageInt}-${currentSubStageInt + 1}`,
                title: `${stage[0].sub_stage[currentSubStageInt]}`,
                type: "project"
            });
        } else {
            if (currentStageInt + 1 <= process[0].stage.length) {
            await Project.update({
                currentStage: currentStageInt + 1,
                currentSubStage: 1
            }, {
                where: { id: projectId }
            });

                const nextStage = await Stage.findAll({
                    attributes: ['sub_stage'],
                    where: { id: process[0].stage[currentStageInt] }
                });

            await Idea_wall.create({
                    userId: req.body.userId,
                projectId: projectId,
                    stage: `${currentStageInt + 1}-1`,
                    title: `${nextStage[0].sub_stage[0]}`,
                    type: "project"
            });
            }
        }

        console.log('==================');
        res.status(200).send({ message: 'create success!' });

    } catch (err) {
        console.error("❌ 創建 Submit 失敗:", err);
        return res.status(500).send({ message: 'create failed!', error: err.message });
    }
};

exports.getAllSubmit = async(req, res) => {
    const { projectId } = req.query;
    console.log('=== 取得所有提交 ===');
    console.log("專案ID:", projectId);
    
    try {
        const allSubmit = await Submit.findAll({
            where: { projectId: projectId },
            order: [['createdAt', 'ASC']]
        });

        console.log(`找到 ${allSubmit.length} 筆提交記錄`);

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
        const submitsWithFileInfo = allSubmit.map(submit => {
            const submitJson = submit.toJSON();
            
            // 如果有檔案資訊，記錄日誌
            if (submitJson.fileName) {
                console.log("檔案資訊:", {
                    fileName: submitJson.fileName,
                    originalName: submitJson.originalName,
                    fileUrl: submitJson.fileUrl
                });
            }
            
            return submitJson;
        });

        console.log('✅ 成功取得所有提交');
        console.log('==================');
        res.status(200).json(submitsWithFileInfo);
        
    } catch (error) {
        console.error("❌ Error in getAllSubmit:", error);
        res.status(500).send({ message: '獲取項目失敗！' });
    }
};

exports.getSubmit = async(req, res) => {
    const submitId = req.params.submitId;
    console.log('=== 取得提交檔案 ===');
    console.log("提交ID:", submitId);
    
    try {
        const submit = await Submit.findByPk(submitId);
        
        if (!submit) {
            console.log('❌ Submit not found');
            return res.status(404).send({ message: 'Submit not found!' });
        }

        if (!submit.fileName) {
            console.log("❌ 無檔案附件");
            return res.status(404).send({ message: 'No file attached!' });
        }

        console.log("✅ 取得檔案資訊:", {
            fileName: submit.fileName,
            originalName: submit.originalName,
            fileUrl: submit.fileUrl
        });

        console.log('==================');
        
        // 返回檔案資訊，讓前端通過 MinIO URL 或預簽名 URL 下載
        res.status(200).json({
            fileName: submit.fileName,
            originalName: submit.originalName,
            fileUrl: submit.fileUrl,
            mimeType: submit.mimeType,
            fileSize: submit.fileSize
        });
        
    } catch (error) {
        console.error("❌ getSubmit 錯誤:", error);
        res.status(500).send({ message: 'get portfolio failed!', error: error.message });
    }
};

exports.updateSubmit = async (req, res) => {
    const submitId = req.params.submitId;
    const { content } = req.body;

    try {
        const submit = await Submit.findByPk(submitId);
        if (!submit) {
            return res.status(404).json({ message: "找不到該提交記錄" });
        }

        console.log('=== 更新提交 ===');
        console.log('提交ID:', submitId);
        console.log('新內容:', content);
        console.log('上傳的檔案:', req.uploadedFile);
  
        // 保存原始資料用於變更記錄
        const originalData = {
            content: submit.content,
            fileName: submit.fileName
        };
      
        // 1. 更新檔案（如果有）
        if (req.uploadedFile) {
            const file = req.uploadedFile;
            
            console.log('📁 檢測到新檔案上傳:', {
                fileName: file.fileName,
                originalName: file.originalName,
                url: file.url,
                size: file.size
            });
            
        await submit.update({
                fileName: file.fileName,
                originalName: file.originalName,
                fileUrl: file.url,
                mimeType: file.mimeType,
                fileSize: file.size
        });
        
        // 記錄檔案變更
        try {
          await logSubmitChange({
            submitId: submit.id,
            changeType: 'update',
            fieldName: 'file',
                    oldValue: originalData.fileName || '無檔案',
                    newValue: file.fileName,
                    changedBy: '使用者',
            projectId: submit.projectId,
                    description: `檔案從「${originalData.fileName || '無檔案'}」更新為「${file.originalName}」`
          });
        } catch (logError) {
          console.warn('記錄檔案變更失敗，但不影響主要功能:', logError);
        }
      }
  
      // 2. 更新文字內容（如果有）
      if (content !== undefined) {
        await submit.update({ content });
        
        // 記錄內容變更
        try {
          await logSubmitFieldChanges(
            originalData,
            { content },
            submit.id,
                    '使用者',
            submit.projectId
          );
        } catch (logError) {
          console.warn('記錄內容變更失敗，但不影響主要功能:', logError);
        }
      }
  
        console.log(`✅ 更新 Submit 成功: ${submitId}`);
        console.log('==================');
      return res.status(200).json({ message: "更新成功" });
        
    } catch (err) {
        console.error("❌ updateSubmit 錯誤:", err);
        return res.status(500).json({ message: "更新失敗", error: err.message });
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
        console.error('取得提交變更記錄失敗:', error);
        
        // 如果是表不存在的錯誤，返回空陣列
        if (error.name === 'SequelizeDatabaseError' && error.message.includes('doesn\'t exist')) {
            console.log('submit_change_logs表不存在，返回空記錄');
            return res.status(200).json([]);
        }
        
        res.status(500).json({ message: '取得變更記錄失敗', error: error.message });
    }
};

exports.deleteSubmit = async (req, res) => {
    const { submitId } = req.params;
    
    try {
        const submit = await Submit.findByPk(submitId);
        if (!submit) {
            return res.status(404).json({ message: "提交記錄未找到" });
        }

        console.log('=== 刪除提交記錄 ===');
        console.log('提交ID:', submitId);
        console.log('階段:', submit.stage);
        console.log('專案ID:', submit.projectId);
        
        // 先清理 MinIO 檔案
        try {
            const { extractSubmitFileNames, batchDeleteMinioFiles } = require('../utils/minioFileHelper');
            const fileNames = extractSubmitFileNames(submit);
            
            if (fileNames.length > 0) {
                console.log(`📁 提交記錄 ${submitId} 發現 ${fileNames.length} 個檔案需要刪除:`, fileNames);
                const deleteResult = await batchDeleteMinioFiles(fileNames);
                console.log(`🗑️ MinIO 檔案清理結果: ${deleteResult.success} 成功, ${deleteResult.failed} 失敗`);
            } else {
                console.log(`📁 提交記錄 ${submitId} 沒有發現需要清理的檔案`);
            }
        } catch (fileCleanupError) {
            console.warn('⚠️ MinIO 檔案清理過程中發生錯誤，但繼續刪除提交記錄:', fileCleanupError.message);
        }

        // 記錄刪除操作
        try {
            await logSubmitChange({
                submitId: submit.id,
                changeType: 'delete',
                changedBy: '使用者',
                projectId: submit.projectId,
                description: `刪除提交記錄 (階段: ${submit.stage})`
            });
        } catch (logError) {
            console.warn('記錄提交刪除失敗，但不影響主要功能:', logError);
        }

        // 刪除提交記錄
        await Submit.destroy({ where: { id: submitId } });
        console.log(`✅ 提交記錄 ${submitId} 刪除完成`);
        console.log('==================');
        
        return res.status(200).json({ message: "提交記錄刪除成功" });
        
    } catch (error) {
        console.error("❌ 刪除提交記錄錯誤:", error);
        return res.status(500).json({ message: "刪除失敗", error: error.message });
    }
};