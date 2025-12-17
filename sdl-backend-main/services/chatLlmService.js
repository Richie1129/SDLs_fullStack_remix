const { GoogleGenAI } = require('@google/genai');
const OpenAI = require('openai');

// Initialize Clients
const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const PRIMARY_MODEL = "gemini-2.5-flash";
const FALLBACK_MODEL = "gpt-5-nano"; // User requested fallback
const SAFE_FALLBACK_MODEL = "gpt-4o-mini"; // Real fallback if gpt-5-nano doesn't exist

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
        console.log(`🧠 [Chat LLM] Trying Primary Model: ${PRIMARY_MODEL}`);
        return await callGemini(PRIMARY_MODEL, systemPrompt, userPrompt);
    } catch (primaryError) {
        console.warn(`⚠️ [Chat LLM] Primary Model ${PRIMARY_MODEL} failed:`, primaryError.message);
        
        try {
            console.log(`🧠 [Chat LLM] Trying Fallback Model: ${FALLBACK_MODEL}`);
            return await callOpenAI(FALLBACK_MODEL, systemPrompt, userPrompt);
        } catch (fallbackError) {
            console.warn(`⚠️ [Chat LLM] Fallback Model ${FALLBACK_MODEL} failed:`, fallbackError.message);
            
            try {
                console.log(`🧠 [Chat LLM] Trying Safe Fallback Model: ${SAFE_FALLBACK_MODEL}`);
                return await callOpenAI(SAFE_FALLBACK_MODEL, systemPrompt, userPrompt);
            } catch (finalError) {
                console.error(`❌ [Chat LLM] All models failed.`);
                return null;
            }
        }
    }
}

async function callGemini(modelName, systemPrompt, userPrompt) {
    // Use the new @google/genai SDK syntax
    const result = await genai.models.generateContent({
        model: modelName,
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        config: {
            systemInstruction: { parts: [{ text: systemPrompt }] }
        }
    });

    // Robust response extraction
    if (typeof result.text === 'function') {
        return result.text();
    }
    
    if (result.candidates && result.candidates.length > 0) {
        const candidate = result.candidates[0];
        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
            return candidate.content.parts[0].text;
        }
    }

    // Fallback: return stringified result if structure is unknown
    return JSON.stringify(result);
}

async function callOpenAI(modelName, systemPrompt, userPrompt) {
    const completion = await openai.chat.completions.create({
        model: modelName,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ],
    });

    return completion.choices[0].message.content;
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
        return await callGemini(PRIMARY_MODEL, systemPrompt, userPrompt);
    } catch (error) {
        console.warn('Summary generation failed, trying fallback...');
        try {
            return await callOpenAI(FALLBACK_MODEL, systemPrompt, userPrompt);
        } catch (e) {
            return `目前牆上有 ${nodes.length} 個想法節點，主要關於: ${nodes.slice(0, 3).map(n => n.title).join(', ')}...`;
        }
    }
}

module.exports = {
    generateChatIntervention,
    generateWallSummary
};
