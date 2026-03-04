/**
 * Chat LLM Service — IdeaWall 聊天 AI 介入
 *
 * [Refactored] AI 呼叫邏輯已遷移至 llmGateway
 */

const { callGemini } = require('./llmGateway');

const PRIMARY_MODEL = "gemini-2.5-flash";

/**
 * Generate AI intervention for IdeaWall Chat
 * @param {Array} contextMessages - Array of recent messages
 * @param {Object} relatedNode - The node being discussed (optional)
 * @param {Array} wallNodes - List of all nodes in the wall (optional, for global context)
 * @returns {Promise<string|null>} - The generated message or null
 */
async function generateChatIntervention(contextMessages, relatedNode, wallNodes = []) {
    const systemPrompt = buildSystemPrompt(relatedNode, wallNodes);
    const userPrompt = buildUserPrompt(contextMessages);

    try {
        console.log(`🧠 [Chat LLM] Using Model: ${PRIMARY_MODEL}`);
        const result = await callGemini({
            prompt: [{ role: 'user', parts: [{ text: userPrompt }] }],
            systemInstruction: systemPrompt,
            model: PRIMARY_MODEL,
        });
        return result.content || '';
    } catch (error) {
        console.error(`❌ [Chat LLM] Gemini model failed:`, error.message);
        return null;
    }
}

function buildSystemPrompt(relatedNode, wallNodes = []) {
    let prompt = `You are an expert Knowledge Building facilitator (Idea Improver) in a collaborative learning environment.
Your goal is to help students deepen their understanding, connect ideas, and improve their theories.

Role:
- You are NOT a search engine. Do not just give answers.
- You are a facilitator. Ask questions, point out contradictions, or suggest connections.
- Be concise. Students are chatting, so keep it short (under 100 words).
- Tone: Encouraging, curious, but intellectually challenging.

Context:
The students are discussing in an "Idea Wall".`;

    if (relatedNode) {
        prompt += `
They are specifically discussing a Node titled "${relatedNode.title}".
Node Content: "${relatedNode.content || 'No content'}"
`;
    } else {
        prompt += `
They are discussing in the general channel of the Idea Wall.
`;
        if (wallNodes && wallNodes.length > 0) {
            prompt += `
Here is a summary of the ideas (Nodes) currently on the wall. Use this to suggest connections or point out gaps:
${wallNodes.map(n => `- [Node #${n.id}] ${n.title} (by ${n.owner}): ${n.content ? n.content.substring(0, 150) : 'No content'}...`).join('\n')}
`;
        }
    }

    prompt += `
Instructions:
1. Analyze the recent conversation.
2. Identify if there is a need for intervention (e.g., shallow agreement, confusion, missed connection).
3. If the conversation is going well, you can just offer a brief encouraging observation or a "Rise-Above" suggestion.
4. If the conversation is stuck, ask a scaffolding question.
5. Output ONLY the message content to be sent to the students.
`;

    return prompt;
}

function buildUserPrompt(messages) {
    let prompt = "Here is the recent conversation transcript:\n\n";

    messages.forEach(msg => {
        const sender = msg.User ? (msg.User.username || msg.User.account) : "Unknown";
        const role = msg.isAiIntervention ? "AI" : "Student";
        prompt += `[${role}] ${sender}: ${msg.content}\n`;
    });

    prompt += "\nBased on this transcript, generate a helpful intervention message.";
    return prompt;
}

/**
 * Generate a summary of the Idea Wall content
 * @param {Array} nodes - List of nodes
 * @returns {Promise<string>}
 */
async function generateWallSummary(nodes) {
    if (!nodes || nodes.length === 0) {
        return "目前牆上還沒有任何想法節點。";
    }

    const systemPrompt = `You are an expert summarizer for a collaborative learning platform.
Your goal is to provide a concise summary of the current ideas on the "Idea Wall" for the students.
Language: Traditional Chinese (繁體中文).
Length: Under 100 words.
Format: Plain text, friendly tone.`;

    const userPrompt = `Here are the current nodes on the wall:
${nodes.map(n => `- ${n.title}: ${n.content ? n.content.substring(0, 100) : ''}`).join('\n')}

Please summarize the main themes or topics being discussed.`;

    try {
        const result = await callGemini({
            prompt: [{ role: 'user', parts: [{ text: userPrompt }] }],
            systemInstruction: systemPrompt,
            model: PRIMARY_MODEL,
        });
        return result.content || '';
    } catch (error) {
        console.error('Summary generation failed:', error.message);
        return `目前牆上有 ${nodes.length} 個想法節點，主要關於: ${nodes.slice(0, 3).map(n => n.title).join(', ')}...`;
    }
}

module.exports = {
    generateChatIntervention,
    generateWallSummary
};
