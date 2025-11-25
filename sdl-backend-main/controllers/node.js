const Node = require('../models/node');
const Node_relation = require('../models/node_relation');
const NodeChangeLog = require('../models/node_change_log');
const { Op } = require('sequelize');

// Phase 2: Orchestrator 整合
const IdeaWall = require('../models/idea_wall');
const { orchestrate } = require('../services/orchestrator');

exports.createNode = async(req, res) => {
    const title = req.body.title;
    const content = req.body.content;
    const ideaWallId = req.body.ideaWallId;
    
    try {
        // 建立節點
        const result = await Node.create({
            title: title,
            content: content,
            ideaWallId: ideaWallId
        }, { req });
        
        // 立即回應使用者（不阻塞）
        res.status(200).json(result);
        
        // ================================================================
        // Phase 2 Hook: 非同步觸發 Orchestrator 分析
        // Linus 原則：「零破壞性 - 失敗不影響正常流程」
        // ================================================================
        setImmediate(async () => {
            try {
                // 取得 projectId
                const ideaWall = await IdeaWall.findByPk(ideaWallId);
                if (ideaWall && ideaWall.projectId) {
                    console.log(`🔔 [Hook] New node created, triggering Orchestrator...`);
                    await orchestrate(ideaWallId, ideaWall.projectId);
                }
            } catch (orchError) {
                // 靜默失敗，不影響使用者體驗
                console.error('Orchestrator hook failed (non-blocking):', orchError.message);
            }
        });
        
    } catch (err) {
        console.error('createNode error:', err);
        res.status(500).json({ error: err.message });
    }
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

exports.getNodeRelation = async (req, res) => {
    const ideaWallId = req.params.ideaWallId;
    try {
        // 先找出此 ideaWall 的所有節點 ID
        const nodes = await Node.findAll({
            attributes: ['id'],
            where: { ideaWallId }
        });
        const nodeIds = nodes.map(n => n.id);

        if (nodeIds.length === 0) {
            return res.status(200).json([]);
        }

        // 僅回傳同一想法牆中的節點關係
        const relations = await Node_relation.findAll({
            attributes: ['from_id', 'to_id'],
            where: {
                from_id: { [Op.in]: nodeIds },
                to_id: { [Op.in]: nodeIds }
            }
        });

        const temp = relations.map(item => ({ from: item.from_id, to: item.to_id }));
        res.status(200).json(temp);
    } catch (err) {
        console.error('getNodeRelation 錯誤:', err);
        res.status(500).json({ error: err.message });
    }
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
        
        // 先找出這些想法牆中的所有節點 ID
        const nodes = await Node.findAll({
            attributes: ['id'],
            where: { ideaWallId: { [Op.in]: ideaWallIds } }
        });
        const nodeIds = nodes.map(n => n.id);

        if (nodeIds.length === 0) {
            return res.status(200).json([]);
        }

        // 找到這些節點之間的所有關係（皆來自同一專案的想法牆）
        const relations = await Node_relation.findAll({
            attributes: ['from_id', 'to_id'],
            where: {
                from_id: { [Op.in]: nodeIds },
                to_id: { [Op.in]: nodeIds }
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

exports.createNodeRelation = async (req, res) => {
    const from_id = req.body.from_id;
    const to_id = req.body.to_id;

    try {
        // 驗證兩個節點存在且屬於同一想法牆（避免跨牆連結）
        const nodes = await Node.findAll({
            attributes: ['id', 'ideaWallId'],
            where: { id: { [Op.in]: [from_id, to_id] } }
        });

        if (nodes.length !== 2) {
            return res.status(404).json({ message: 'from_id 或 to_id 節點不存在' });
        }

        const [n1, n2] = nodes;
        if (n1.ideaWallId !== n2.ideaWallId) {
            return res.status(400).json({ message: '兩節點不屬於同一想法牆' });
        }

        const result = await Node_relation.create({ from_id, to_id });
        res.status(200).json(result);
    } catch (err) {
        console.error('createNodeRelation 錯誤:', err);
        res.status(500).json({ error: err.message });
    }
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
