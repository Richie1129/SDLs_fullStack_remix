const Idea_wall = require('../models/idea_wall');
const Node = require('../models/node');
const { generateWallSummary } = require('../services/chatLlmService');
const { Op } = require("sequelize");

exports.getWallContext = async (req, res) => {
    const { wallId } = req.params;
    
    try {
        // 1. Fetch Nodes (Limit 30 for summary)
        const nodes = await Node.findAll({
            where: { ideaWallId: wallId },
            attributes: ['id', 'title', 'content', 'owner'],
            limit: 30,
            order: [['updatedAt', 'DESC']]
        });

        // 2. Generate Summary
        // In a real production system, we should cache this summary in Redis or DB
        // and only regenerate if nodes have changed or after X minutes.
        // For MVP, we generate on fly but handle errors gracefully.
        const summary = await generateWallSummary(nodes);

        res.status(200).json({
            nodeCount: nodes.length, // Note: this is limited by query limit, ideally count all
            summary: summary,
            recentNodes: nodes.slice(0, 5).map(n => n.title)
        });
    } catch (error) {
        console.error('Get Wall Context Error:', error);
        res.status(500).json({ error: 'Failed to generate context' });
    }
};

//to do name change to stage substage
exports.getIdeaWall = async(req, res) =>{
    const projectId = req.params.projectId;
    // stage 參數已廢棄，每個專案只有一個想法牆
    console.log("=== getIdeaWall Debug (簡化版) ===");
    console.log("projectId:", projectId);
    
    try {
        // 直接查找專案的想法牆（應該只有一個）
        const result = await Idea_wall.findOne({
            where: { projectId: projectId },
            order: [['id', 'ASC']] // 確保一致性
        });
        
        console.log("找到的想法牆:", result);
        if (result) {
            console.log("想法牆 ID:", result.id);
            console.log("想法牆名稱:", result.name);
        } else {
            console.log("未找到專案想法牆，projectId:", projectId);
            return res.status(404).json({ 
                error: `專案 ${projectId} 沒有想法牆`,
                code: 'IDEA_WALL_NOT_FOUND' 
            });
        }
        
        res.status(200).json(result);
    } catch (err) {
        console.error("getIdeaWall 錯誤:", err);
        res.status(500).json({ error: err.message });
    }
}

exports.getAllIdeaWall = async(req, res) =>{
    const projectId = req.query.projectId;
    await Idea_wall.findAll({
        where:{
            projectId:projectId
        }
    })
    .then(result =>{
        console.log(result);
        res.status(200).json(result)
    })
    .catch(err => console.log(err));
}

exports.createIdeaWall = async(req, res) =>{
    try {
        // 檢查是否為只讀模式（觀摩者）
        if (req.readOnly) {
            return res.status(403).json({ 
                message: '觀摩模式下無法創建想法牆內容',
                code: 'READ_ONLY_MODE'
            });
        }

        const projectId = req.body.projectId;
        const name = req.body.name;
        const stage = req.body.stage;
        
        const result = await Idea_wall.create({
            name: name,
            type: "project",
            projectId: projectId,
            stage: stage
        });
        
        console.log(result);
        res.status(200).json(result);
    } catch (error) {
        console.error('創建想法牆錯誤:', error);
        res.status(500).json({ 
            message: '創建想法牆時發生錯誤',
            error: error.message 
        });
    }
};