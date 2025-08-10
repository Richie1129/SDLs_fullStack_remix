const Node = require('../models/node');
const Node_relation = require('../models/node_relation');
const NodeChangeLog = require('../models/node_change_log');

exports.createNode = async(req, res) => {
    const title = req.body.title;
    const content = req.body.content;
    const ideaWallId = req.body.ideaWallId;
    await Node.create({
        title:title,
        content:content,
        ideaWallId:ideaWallId
    }).then(result =>{
        res.status(200).json(result)
    })
    .catch(err => console.log(err));
}

exports.getNodes = async(req, res) => {
    const ideaWallId = req.params.ideaWallId
    console.log('=== getNodes Debug ===');
    console.log('請求的 ideaWallId:', ideaWallId);
    
    await Node.findAll({
        where:{
            ideaWallId:ideaWallId
        }
    }).then(result =>{
        console.log('找到的節點數量:', result.length);
        console.log('節點詳情:', result.map(node => ({
            id: node.id,
            title: node.title,
            ideaWallId: node.ideaWallId
        })));
        res.status(200).json(result)
    })
    .catch(err => {
        console.error('getNodes 錯誤:', err);
        res.status(500).json({ error: err.message });
    });
}

// 新增：獲取專案所有階段的節點
exports.getProjectNodes = async(req, res) => {
    const projectId = req.params.projectId;
    console.log('=== getProjectNodes Debug ===');
    console.log('請求的 projectId:', projectId);
    
    try {
        // 首先找到該專案的所有想法牆
        const ideaWalls = await require('../models/idea_wall').findAll({
            where: {
                projectId: projectId
            }
        });
        
        console.log('找到的想法牆:', ideaWalls.map(iw => ({ id: iw.id, stage: iw.stage })));
        
        if (ideaWalls.length === 0) {
            return res.status(200).json([]);
        }
        
        // 獲取所有想法牆的 ID
        const ideaWallIds = ideaWalls.map(iw => iw.id);
        
        // 找到這些想法牆中的所有節點
        const nodes = await Node.findAll({
            where: {
                ideaWallId: ideaWallIds
            }
        });
        
        console.log('找到的節點數量:', nodes.length);
        res.status(200).json(nodes);
        
    } catch (error) {
        console.error('getProjectNodes 錯誤:', error);
        res.status(500).json({ error: error.message });
    }
}

exports.getNodeRelation = async(req, res) => {
    const ideaWallId = req.params.ideaWallId
    await Node_relation.findAll({
        attributes:[
            'from_id', 
            'to_id'
        ],
        where:{
            ideaWallId:ideaWallId
        }
    }).then(result =>{
        const temp = [];
        result.map( item => {
            temp.push({
                "from":item.from_id,
                "to":item.to_id
            });
        })
        res.status(200).json(temp)
    })
    .catch(err => console.log(err));
}

// 新增：獲取專案所有階段的節點關係
exports.getProjectNodeRelation = async(req, res) => {
    const projectId = req.params.projectId;
    console.log('=== getProjectNodeRelation Debug ===');
    console.log('請求的 projectId:', projectId);
    
    try {
        // 首先找到該專案的所有想法牆
        const ideaWalls = await require('../models/idea_wall').findAll({
            where: {
                projectId: projectId
            }
        });
        
        if (ideaWalls.length === 0) {
            return res.status(200).json([]);
        }
        
        // 獲取所有想法牆的 ID
        const ideaWallIds = ideaWalls.map(iw => iw.id);
        
        // 找到這些想法牆中的所有節點關係
        const relations = await Node_relation.findAll({
            attributes: ['from_id', 'to_id'],
            where: {
                ideaWallId: ideaWallIds
            }
        });
        
        const temp = [];
        relations.map(item => {
            temp.push({
                "from": item.from_id,
                "to": item.to_id
            });
        });
        
        console.log('找到的關係數量:', temp.length);
        res.status(200).json(temp);
        
    } catch (error) {
        console.error('getProjectNodeRelation 錯誤:', error);
        res.status(500).json({ error: error.message });
    }
}

exports.createNodeRelation = async(req, res) => {
    const from_id = req.body.from_id;
    const to_id = req.body.to_id;
    const ideaWallId = req.body.ideaWallId;
    await Node_relation.create({
        from_id:from_id,
        to_id:to_id,
        ideaWallId:ideaWallId
    }).then(result =>{
        res.status(200).json(result)
    })
    .catch(err => console.log(err));
}

// 取得節點變更記錄
exports.getNodeChangeLogs = async (req, res) => {
    const { nodeId } = req.params;
    
    try {
        const changeLogs = await NodeChangeLog.findAll({
            where: { nodeId },
            order: [['createdAt', 'DESC']]
        });
        
        res.status(200).json(changeLogs);
    } catch (error) {
        console.error('取得節點變更記錄失敗:', error);
        
        // 如果是表不存在的錯誤，返回空陣列
        if (error.name === 'SequelizeDatabaseError' && error.message.includes('doesn\'t exist')) {
            console.log('node_change_logs表不存在，返回空記錄');
            return res.status(200).json([]);
        }
        
        res.status(500).json({ message: '取得變更記錄失敗', error: error.message });
    }
};
