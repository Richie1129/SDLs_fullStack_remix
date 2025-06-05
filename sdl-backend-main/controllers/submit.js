const Submit = require('../models/submit');
const Project = require('../models/project');
const Idea_wall = require('../models/idea_wall');
const Process = require('../models/process');
const Stage = require('../models/stage');
const fs = require('fs').promises;
const { logSubmitChange, logSubmitFieldChanges } = require('../utils/submitChangeLogger');

exports.createSubmit = async(req, res) => {
    const { currentStage, currentSubStage, content, projectId } = req.body;
    const currentStageInt = parseInt(currentStage);
    const currentSubStageInt = parseInt(currentSubStage);

    console.log("接收到的資料:", req.body); // 檢查 `req.body` 是否有接收到資料
    console.log("接收到的檔案:", req.files); // 檢查 `req.files` 是否有檔案上傳

    if (!content) {
        return res.status(404).send({ message: '請填寫表單!' });
    }

    try {
        // 如果有檔案上傳
        if (req.files && req.files.length > 0) {
            await Promise.all(req.files.map(async (item) => {
                console.log("正在處理檔案:", item);

                const fileData = await fs.readFile(item.path);
                
                return Submit.create({
                    stage: `${currentStageInt}-${currentSubStageInt}`,
                    content: content,
                    projectId: projectId,
                    fileData: fileData,
                    fileName: item.filename
                });
            }));
        } else {
            // 沒有檔案上傳
            await Submit.create({
                stage: `${currentStageInt}-${currentSubStageInt}`,
                content: content,
                projectId: projectId,
            });
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
                type: "project",
                projectId: projectId,
                stage: `${currentStageInt}-${currentSubStageInt + 1}`
            });

            return res.status(200).send({ message: 'create success!' });
        } else if (currentStageInt === process[0].stage.length && currentSubStageInt === stage[0].sub_stage.length) {
            await Project.update({
                ProjectEnd: true
            }, {
                where: { id: projectId }
            });
            return res.status(200).send({ message: 'done' });
        } else {
            await Project.update({
                currentStage: currentStageInt + 1,
                currentSubStage: 1
            }, {
                where: { id: projectId }
            });

            await Idea_wall.create({
                type: "project",
                projectId: projectId,
                stage: `${currentStageInt + 1}-${currentSubStageInt}`
            });

            return res.status(200).send({ message: 'create success!' });
        }

    } catch (err) {
        console.error("createSubmit 錯誤:", err);
        return res.status(500).send({ message: 'create failed!' });
    }
};

exports.getAllSubmit = async(req, res) => {
    const { projectId } = req.query;
    try {
        const allSubmit = await Submit.findAll({
            where: {
                projectId: projectId
            }
        });

        // 通过Promise.all异步转换所有BLOB数据
        const submitsWithBase64 = await Promise.all(allSubmit.map(async (submit) => {
            // 检查是否有fileData字段，且不为空
            const submitJson = submit.toJSON();
            // console.log(submitJson)
            if (submit.fileData) {
                // 将BLOB转换为Base64字符串
                console.log(submit.fileData)
                console.log("======================")

                // const base64Data = submit.fileData.toString('base64');
                // 返回修改后的对象（或者你可以选择添加一个新字段）
                return {
                    ...submit.toJSON(), // 其他字段不变
                    // fileData: base64Data // 替换fileData为其Base64字符串
                };
            } else {
                // 没有fileData字段或为空，直接返回原对象
                return submit.toJSON();
            }
        }));

        res.status(200).json(submitsWithBase64);
    } catch (error) {
        console.error("Error in getAllSubmit:", error);
        res.status(500).send({ message: '獲取項目失敗！' });
    }
};

exports.getSubmit = async(req, res) => {
    const submitId = req.params.submitId;
    console.log("submitId",submitId);
    const submit = await Submit.findByPk(submitId)
    if(submit.fileData === null){
        console.log("null");
        res.status(500).send({message: 'get protfolio failed!'});
    }else{
        console.log("dowwnload");
        console.log("fileData",submit.fileData)
        // res.download(`./daily_file/${submit.fileData.filename}`)
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

        await submit.update({ content });

        res.status(200).json({ message: "內容更新成功" });
    } catch (error) {
        console.error("更新內容失敗:", error);
        res.status(500).json({ message: "更新失敗" });
    }
};

exports.updateSubmit = async (req, res) => {
    const submitId = req.params.submitId;
    const { content } = req.body;
    try {
      const submit = await Submit.findByPk(submitId);
      if (!submit) return res.status(404).json({ message: "找不到該提交記錄" });
  
      // 記錄變更前的原始資料
      const originalData = { content: submit.content };
      
      // 1. 如果有新檔案
      if (req.files && req.files.length > 0) {
        // 這裡示範只取第一個檔案，你也可以遍歷多檔
        const file = req.files[0];
        const buffer = await fs.readFile(file.path);
        await submit.update({
          fileData: buffer,
          fileName: file.filename
        });
        
        // 記錄檔案變更
        try {
          await logSubmitChange({
            submitId: submit.id,
            changeType: 'update',
            fieldName: 'file',
            oldValue: submit.fileName || '無檔案',
            newValue: file.filename,
            changedBy: '使用者', // 這裡可以從token或session取得使用者名稱
            projectId: submit.projectId,
            description: `檔案從「${submit.fileName || '無檔案'}」更新為「${file.filename}」`
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
            '使用者', // 這裡可以從token或session取得使用者名稱
            submit.projectId
          );
        } catch (logError) {
          console.warn('記錄內容變更失敗，但不影響主要功能:', logError);
        }
      }
  
      return res.status(200).json({ message: "更新成功" });
    } catch (err) {
      console.error("updateSubmit 錯誤:", err);
      return res.status(500).json({ message: "更新失敗" });
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

// exports.getProfolioSubmit = async(req, res) => {
//     const { projectId } = req.query;
//     try {
//         const allSubmit = await Submit.findAll({
//             where: {
//                 projectId: projectId,
//                 stage: ['5-1', '5-2', '5-3', '5-4', '5-5']  // Assuming 'stage' is the correct field and these are the valid values
//             }
//         });

//         // Asynchronously convert all BLOB data, assuming this part works correctly in your current setup
//         const submitsWithBase64 = await Promise.all(allSubmit.map(async (submit) => {
//             // const submitJson = submit.toJSON();
//             // if (submit.fileData) {
//                 // Convert BLOB to Base64 string if needed, or handle as you see fit
//                 // const base64Data = submit.fileData.toString('base64');
//                 // return {
//                 //     ...submitJson,
//                 //     fileData: base64Data
//                 // };
//             // } else {
//                 return submit.toJSON();
//             // }
//         }));

//         res.status(200).json(submitsWithBase64);
//     } catch (error) {
//         console.error("Error in getAllSubmit:", error);
//         res.status(500).send({ message: '获取项目失败！' });
//     }
// };