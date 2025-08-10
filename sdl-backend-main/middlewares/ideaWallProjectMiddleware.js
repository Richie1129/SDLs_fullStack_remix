const IdeaWall = require('../models/idea_wall');
const Node = require('../models/node');

/**
 * 從 ideaWallId 獲取 projectId 的中介層
 * 用於 node 相關路由，將 ideaWallId 轉換為 projectId 供權限檢查使用
 */
const getProjectIdFromIdeaWall = async (req, res, next) => {
    try {
        const ideaWallId = req.params.ideaWallId || req.body.ideaWallId || req.query.ideaWallId;
        
        if (!ideaWallId) {
            return res.status(400).json({ message: '缺少 ideaWallId 參數' });
        }

        // 從資料庫查詢 ideaWall 以獲取 projectId
        const ideaWall = await IdeaWall.findByPk(ideaWallId);
        
        if (!ideaWall) {
            return res.status(404).json({ message: '想法牆不存在' });
        }

        // 將 projectId 設置到 req.params 中，供後續的權限中間件使用
        req.params.projectId = ideaWall.projectId;
        req.body.projectId = ideaWall.projectId;
        req.query.projectId = ideaWall.projectId;
        
        next();
    } catch (error) {
        console.error('獲取 projectId 錯誤:', error);
        return res.status(500).json({ 
            message: '獲取專案資訊時發生錯誤',
            error: error.message 
        });
    }
};

/**
 * 從 nodeId 獲取 projectId 的中介層
 * 用於 node change logs 路由
 */
const getProjectIdFromNode = async (req, res, next) => {
    try {
        const nodeId = req.params.nodeId || req.body.nodeId || req.query.nodeId;
        
        if (!nodeId) {
            return res.status(400).json({ message: '缺少 nodeId 參數' });
        }

        // 從資料庫查詢 node 以獲取 ideaWallId
        const node = await Node.findByPk(nodeId);
        
        if (!node) {
            return res.status(404).json({ message: '節點不存在' });
        }

        // 再查詢 ideaWall 以獲取 projectId
        const ideaWall = await IdeaWall.findByPk(node.ideaWallId);
        
        if (!ideaWall) {
            return res.status(404).json({ message: '關聯的想法牆不存在' });
        }

        // 將 projectId 設置到 req.params 中，供後續的權限中間件使用
        req.params.projectId = ideaWall.projectId;
        req.body.projectId = ideaWall.projectId;
        req.query.projectId = ideaWall.projectId;
        
        next();
    } catch (error) {
        console.error('從 nodeId 獲取 projectId 錯誤:', error);
        return res.status(500).json({ 
            message: '獲取專案資訊時發生錯誤',
            error: error.message 
        });
    }
};

/**
 * 從 submitId 獲取 projectId 的中介層
 * 用於 submit 相關路由
 */
const getProjectIdFromSubmit = async (req, res, next) => {
    try {
        const Submit = require('../models/submit');
        const submitId = req.params.submitId || req.body.submitId || req.query.submitId;
        
        if (!submitId) {
            return res.status(400).json({ message: '缺少 submitId 參數' });
        }

        // 從資料庫查詢 submit 以獲取 projectId
        const submit = await Submit.findByPk(submitId);
        
        if (!submit) {
            return res.status(404).json({ message: '提交不存在' });
        }

        // 將 projectId 設置到 req 中，供後續的權限中間件使用
        req.params.projectId = submit.projectId;
        req.body.projectId = submit.projectId;
        req.query.projectId = submit.projectId;
        
        next();
    } catch (error) {
        console.error('從 submitId 獲取 projectId 錯誤:', error);
        return res.status(500).json({ 
            message: '獲取專案資訊時發生錯誤',
            error: error.message 
        });
    }
};

module.exports = { getProjectIdFromIdeaWall, getProjectIdFromNode, getProjectIdFromSubmit };
