    setSocketIO,
    getSocketIO,
    // Phase 3: IdeaWall Chat Orchestration
    orchestrateChat
};

/**
 * Phase 3: IdeaWall Chat Orchestrator
 * 
 * @param {Object} newMessage - The message object created by the user
 */
async function orchestrateChat(newMessage) {
    // 1. Ignore AI's own messages to prevent loops
    if (newMessage.isAiIntervention) {
        return;
    }

    const wallId = newMessage.ideaWallId;
    console.log(`🕵️ [Chat Orchestrator] Analyzing activity in Wall #${wallId}...`);

    try {
        // 2. Check if we should intervene
        const should = await shouldInterveneChat(wallId);
        
        if (should) {
            console.log(`🚀 [Chat Orchestrator] DECISION -> INTERVENE in Wall #${wallId}`);
            // Phase 4 will implement the actual AI generation here.
            // For Phase 3, we just log it and emit a debug event.
            triggerChatIntervention(wallId, newMessage.relatedNodeId);
        } else {
            console.log(`zzz [Chat Orchestrator] DECISION -> WAIT in Wall #${wallId}`);
        }
    } catch (error) {
        console.error('❌ [Chat Orchestrator] Error:', error);
    }
}

/**
 * The Gatekeeper for Chat: Decides if AI should intervene based on rules
 * @param {number} wallId 
 * @returns {Promise<boolean>}
 */
async function shouldInterveneChat(wallId) {
    // Rule 1: Cooling Period
    // Find the last AI intervention in this wall
    const lastIntervention = await IdeaWallMessage.findOne({
        where: {
            ideaWallId: wallId,
            isAiIntervention: true
        },
        order: [['createdAt', 'DESC']]
    });

    if (lastIntervention) {
        const lastTime = new Date(lastIntervention.createdAt).getTime();
        const now = Date.now();
        const diffMinutes = (now - lastTime) / (1000 * 60);

        if (diffMinutes < CHAT_CONFIG.COOLING_PERIOD_MINUTES) {
            console.log(`✋ [Chat Orchestrator] Cooling down (${diffMinutes.toFixed(1)}/${CHAT_CONFIG.COOLING_PERIOD_MINUTES} mins)`);
            return false;
        }
    }

    // Rule 2: Accumulation
    // Count user messages since the last intervention (or from the beginning)
    const whereClause = {
        ideaWallId: wallId,
        isAiIntervention: false
    };

    if (lastIntervention) {
        whereClause.createdAt = {
            [Op.gt]: lastIntervention.createdAt
        };
    }

    const messageCount = await IdeaWallMessage.count({
        where: whereClause
    });

    if (messageCount < CHAT_CONFIG.MIN_MESSAGES_THRESHOLD) {
        console.log(`✋ [Chat Orchestrator] Not enough messages (${messageCount}/${CHAT_CONFIG.MIN_MESSAGES_THRESHOLD})`);
        return false;
    }

    return true;
}

/**
 * Placeholder for Phase 4 Chat Intervention
 */
async function triggerChatIntervention(wallId, relatedNodeId) {
    // In Phase 4, this will call the LLM Service
    console.log('✨ [MOCK] AI is generating a chat response...');
    
    // For MVP verification, we can emit a special socket event to the frontend
    // to show that the Orchestrator is "thinking" or "watching".
    if (socketIO) {
        socketIO.to(`ideawall_${wallId}`).emit('ORCHESTRATOR_DEBUG', {
            status: 'TRIGGERED',
            wallId,
            timestamp: new Date()
        });
    }
}
