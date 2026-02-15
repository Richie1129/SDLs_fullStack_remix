const IdeaWallMessage = require('../models/idea_wall_message');
const User = require('../models/user');
const { Op } = require("sequelize");
const { orchestrateChat } = require('../services/orchestrator');
const { logAudit } = require('../services/auditService');

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

        // Phase 3: Trigger Shadow Orchestrator (Async, Fire-and-Forget)
        // We pass the plain object to avoid Sequelize instance issues if any
        orchestrateChat(message.toJSON()).catch(err => {
            console.error('Orchestrator Trigger Error:', err);
        });
        
        // Audit: Record idea wall message creation (non-blocking)
        setImmediate(async () => {
            try {
                const IdeaWall = require('../models/idea_wall');
                const ideaWall = await IdeaWall.findByPk(wallId);
                
                await logAudit(req, {
                    action: 'IDEA_WALL_MESSAGE_CREATE',
                    targetType: 'idea_wall_message',
                    targetId: message.id,
                    projectId: ideaWall?.projectId || null,
                    metadata: {
                        ideaWallId: wallId,
                        relatedNodeId: relatedNodeId || null,
                        messageLength: content?.length || 0
                    }
                }).catch(() => {});
            } catch (auditError) {
                console.error('Audit log failed (non-blocking):', auditError.message);
            }
        });

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
