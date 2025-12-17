const IdeaWallMessage = require('../models/idea_wall_message');
const User = require('../models/user');
const { Op } = require("sequelize");

exports.createMessage = async (req, res) => {
    const { wallId } = req.params;
    const { content, relatedNodeId } = req.body;
    
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const senderId = req.user.id;

    try {
        const message = await IdeaWallMessage.create({
            content,
            senderId,
            ideaWallId: wallId,
            relatedNodeId: relatedNodeId || null,
            isAiIntervention: false
        });

        // Fetch the created message with sender info to return and emit
        const messageWithSender = await IdeaWallMessage.findByPk(message.id, {
            include: [{
                model: User,
                attributes: ['id', 'username', 'account'] // Only send necessary user info
            }]
        });

        // Emit socket event
        const io = req.app.get('io');
        if (io) {
            // Emit to the specific IdeaWall room
            // Note: Frontend needs to join this room: `ideawall_${wallId}`
            io.to(`ideawall_${wallId}`).emit('EVENT_IDEA_WALL_MSG', messageWithSender);
        }

        res.status(201).json(messageWithSender);
    } catch (error) {
        console.error('Create IdeaWall Message Error:', error);
        res.status(500).json({ error: 'Failed to create message' });
    }
};

exports.getMessages = async (req, res) => {
    const { wallId } = req.params;
    const { nodeId } = req.query;

    try {
        const whereClause = {
            ideaWallId: wallId
        };

        if (nodeId) {
            whereClause.relatedNodeId = nodeId;
        }

        const messages = await IdeaWallMessage.findAll({
            where: whereClause,
            include: [{
                model: User,
                attributes: ['id', 'username', 'account']
            }],
            order: [['createdAt', 'ASC']]
        });

        res.status(200).json(messages);
    } catch (error) {
        console.error('Get IdeaWall Messages Error:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
};
