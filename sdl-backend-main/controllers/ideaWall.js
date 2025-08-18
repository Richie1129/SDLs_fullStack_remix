const Idea_wall = require('../models/idea_wall');
const { Op } = require("sequelize");

//to do name change to stage substage
exports.getIdeaWall = async(req, res) =>{
    const projectId = req.params.projectId;
    const stage = req.params.stage;
    console.log("=== getIdeaWall Debug ===");
    console.log("projectId:", projectId);
    console.log("stage:", stage);
    
    await Idea_wall.findOne({
        where:{
            [Op.and]: [
                { projectId:projectId },
                { stage:stage }
            ]   
        }
    })
    .then(result =>{
        console.log("找到的想法牆:", result);
        if (result) {
            console.log("想法牆 ID:", result.id);
            console.log("想法牆名稱:", result.name);
        }
        res.status(200).json(result)
    })
    .catch(err => {
        console.error("getIdeaWall 錯誤:", err);
        res.status(500).json({ error: err.message });
    });
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