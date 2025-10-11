const Process = require('../models/process');
const Stage = require('../models/stage');
const Sub_stage = require('../models/sub_stage');

exports.getSubStage = async (req, res) => {
    try {
        const projectId = req.body.projectId;
        const currentStage = parseInt(req.body.currentStage);
        const currentSubStage = parseInt(req.body.currentSubStage);

        if (!projectId || isNaN(currentStage) || isNaN(currentSubStage)) {
            return res.status(400).json({
                error: 'Invalid parameters | 參數無效',
                message: 'projectId, currentStage, and currentSubStage are required'
            });
        }

        const process = await Process.findAll({
            attributes: ['id', 'stage'],
            where: { projectId: projectId },
        });

        if (!process || process.length === 0) {
            return res.status(404).json({
                error: 'Process not found | 流程未找到',
                message: 'No process found for this project'
            });
        }

        if (!process[0].stage || !Array.isArray(process[0].stage) || currentStage < 1 || currentStage > process[0].stage.length) {
            return res.status(400).json({
                error: 'Invalid stage index | 階段索引無效',
                message: 'Current stage index out of bounds'
            });
        }

        const stageId = process[0].stage[currentStage - 1];
        const stage = await Stage.findAll({
            attributes: ['id', 'name', 'sub_stage'],
            where: { id: stageId },
        });

        if (!stage || stage.length === 0) {
            return res.status(404).json({
                error: 'Stage not found | 階段未找到',
                message: 'No stage found with this id'
            });
        }

        if (!stage[0].sub_stage || !Array.isArray(stage[0].sub_stage) || currentSubStage < 1 || currentSubStage > stage[0].sub_stage.length) {
            return res.status(400).json({
                error: 'Invalid sub-stage index | 子階段索引無效',
                message: 'Current sub-stage index out of bounds'
            });
        }

        const sub_stageId = stage[0].sub_stage[currentSubStage - 1];
        const sub_stage = await Sub_stage.findAll({
            attributes: ['id', 'name', 'description', 'userSubmit'],
            where: { id: sub_stageId },
        });

        if (!sub_stage || sub_stage.length === 0) {
            return res.status(404).json({
                error: 'Sub-stage not found | 子階段未找到',
                message: 'No sub-stage found with this id'
            });
        }

        res.status(200).json(sub_stage[0]);

    } catch (error) {
        console.error('Error in getSubStage | 獲取子階段錯誤:', error);
        return res.status(500).json({
            error: 'Internal server error | 伺服器內部錯誤',
            message: 'Failed to get sub-stage information',
            details: error.message
        });
    }
}

exports.getWholeStage = async(req, res) => {
    try {
        const projectId = req.params.projectId;

        if (!projectId) {
            return res.status(400).json({
                error: 'Invalid parameters | 參數無效',
                message: 'projectId is required'
            });
        }

        // TODO: 實作獲取完整階段資訊的邏輯
        return res.status(501).json({
            error: 'Not implemented | 功能未實作',
            message: 'This endpoint is not yet implemented'
        });

    } catch (error) {
        console.error('Error in getWholeStage | 獲取完整階段錯誤:', error);
        return res.status(500).json({
            error: 'Internal server error | 伺服器內部錯誤',
            message: 'Failed to get whole stage information',
            details: error.message
        });
    }
}