const { callVLLM, callGeminiAPI, parseJsonResponse } = require('./llmGateway');
const { Op } = require('sequelize');

class AITaskAssistantService {

  /**
   * Collect 5-layer context for a task
   */
  async collectTaskContext(taskId, projectId, models) {
    const { Task, Project, User, Comment } = models;
    const Kanban = require('../models/kanban');
    const Column = require('../models/column');

    const task = await Task.findByPk(taskId);

    if (!task) {
      throw new Error('Task not found');
    }

    const project = await Project.findByPk(projectId, {
      include: [{
        model: Kanban,
        include: [{
          model: Column,
          include: [Task]
        }]
      }]
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Flatten all tasks from all columns
    const allProjectTasks = [];
    if (project.kanban && project.kanban.columns) {
      for (const column of project.kanban.columns) {
        if (column.tasks) {
          allProjectTasks.push(...column.tasks);
        }
      }
    }

    const comments = await Comment.findAll({
      where: { taskId: taskId },
      include: [
        {
          model: User,
          attributes: ['id', 'username']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    // Layer 1: Card direct info
    const cardInfo = {
      id: task.id,
      title: task.title || '',
      content: task.content || '',
      assignees: task.assignees || [],
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      columnIndex: task.columnIndex,
      comments: comments || [],
      hasFiles: (task.files && task.files.length > 0),
      hasImages: (task.images && task.images.length > 0)
    };

    // Layer 2: Position context
    const columnNames = ['TODO', 'IN_PROGRESS', 'DONE'];
    const positionContext = {
      column: columnNames[task.columnIndex] || 'UNKNOWN',
      adjacentTasks: this._getAdjacentTasks(allProjectTasks, task)
    };

    // Layer 3: Project context
    const projectContext = {
      projectName: project.name,
      projectDescription: project.describe || '',
      projectStage: project.currentStage || 'unknown',
      totalTasks: allProjectTasks.length,
      completedTasks: allProjectTasks.filter(t => t.columnIndex === 2).length
    };

    // Layer 4: Behavior context (simplified for now)
    const behaviorContext = {
      commentsCount: comments.length,
      hasUnansweredComments: comments.some(c => !c.replies || c.replies.length === 0)
    };

    // Layer 5: Time context
    const timeContext = {
      daysSinceCreated: this._calculateDaysDiff(task.createdAt, new Date()),
      daysSinceUpdated: this._calculateDaysDiff(task.updatedAt, new Date()),
      isStale: this._calculateDaysDiff(task.updatedAt, new Date()) > 3
    };

    return {
      task: cardInfo,
      position: positionContext,
      project: projectContext,
      behavior: behaviorContext,
      time: timeContext
    };
  }

  /**
   * Detect task issues based on context
   */
  detectTaskIssues(context) {
    const issues = [];

    // Issue 1: Stale task
    if (context.time.daysSinceUpdated > 3 && context.position.column !== 'DONE') {
      issues.push({
        type: 'stale_task',
        severity: context.time.daysSinceUpdated > 7 ? 'high' : 'medium',
        message: `Task has not been updated for ${context.time.daysSinceUpdated} days`
      });
    }

    // Issue 2: No assignee
    if (!context.task.assignees || context.task.assignees.length === 0) {
      issues.push({
        type: 'no_assignee',
        severity: 'high',
        message: 'No assignee assigned'
      });
    }

    // Issue 3: Incomplete description
    if (!context.task.content || context.task.content.length < 30) {
      issues.push({
        type: 'incomplete_description',
        severity: 'medium',
        message: 'Task description is too short'
      });
    }

    // Issue 4: Unanswered comments
    if (context.behavior.hasUnansweredComments) {
      issues.push({
        type: 'unanswered_comments',
        severity: 'medium',
        message: 'There are unanswered comments'
      });
    }

    return issues;
  }

  /**
   * Determine help-seeking type based on metacognitive state and answers
   */
  determineHelpSeekingType(selectedState, answers, askedSources, skippedThinking) {
    let score = 0;

    // Rule 1: Metacognitive state scores
    const stateScores = {
      'not_started': -2,
      'thought_unclear': 0,
      'initial_idea': +2,
      'specific_problem': +2,
      'asked_peers': +3
    };
    score += stateScores[selectedState] || 0;

    // Rule 2: If answered questions
    if (answers && Object.keys(answers).length > 0) {
      score += 2;
    }

    // Rule 3: If asked human sources
    if (askedSources && Array.isArray(askedSources)) {
      if (!askedSources.includes('還沒問任何人')) {
        score += 2;
      }
    }

    // Rule 4: If skipped thinking
    if (skippedThinking) {
      score -= 3;
    }

    // Determine type based on score
    if (score >= 2) {
      return 'adaptive';
    } else if (score <= -2) {
      return 'expedient';
    } else {
      return 'mixed';
    }
  }

  /**
   * Build AI prompt based on context and help-seeking type
   */
  buildPrompt(context, selectedState, answers, helpSeekingType) {
    const stateDescriptions = {
      'not_started': '我還沒開始思考這個問題',
      'thought_unclear': '我想過但不確定方向',
      'initial_idea': '我有初步想法，想確認可行性',
      'specific_problem': '我遇到具體的問題或障礙',
      'asked_peers': '我問過同學/老師，想要第二意見'
    };

    const prompt = `你是一個學習引導 AI，協助學生進行自主學習專案。

**第一步：先判斷這張卡片是否為合理的學習任務**

請根據以下資訊判斷：
- 專案名稱：${context.project.projectName}
- 專案描述：${context.project.projectDescription || '（尚無描述）'}
- 當前探究階段：${context.project.projectStage}
- 卡片標題：${context.task.title}
- 卡片描述：${context.task.content || '（尚無描述）'}

判斷標準（以下任一條件成立即為不相關）：
1. 卡片標題或描述為亂碼、純數字、無意義符號
2. 卡片內容明顯與這個專案的探究主題毫無關係
3. 卡片描述過於空泛（完全無描述且標題意義不明），無法給予有效引導

如果判斷為不相關，請將 isRelevant 設為 false，並在 irrelevantReason 說明原因，其餘欄位設為空值。

**若判斷相關，請依以下原則生成建議**：
1. **促進 Instrumental/Adaptive Help-Seeking**：給予提示和引導，而非直接答案
2. **鼓勵向真人求助**：主動建議學生向同儕或教師討論
3. **促進深度思考**：用問題引導學生思考「為什麼」
4. **避免過度依賴**：提醒學生這只是「一種」可能的方向

**當前任務脈絡**：
- 任務標題：${context.task.title}
- 任務描述：${context.task.content || '（尚無描述）'}
- 任務狀態：${context.position.column}
- 創建時間：${context.time.daysSinceCreated} 天前
- 最後更新：${context.time.daysSinceUpdated} 天前
- 負責人：${context.task.assignees.map(a => a.username).join('、') || '（尚未指派）'}
- 專案階段：${context.project.projectStage}
- 專案名稱：${context.project.projectName}

**學生的求助狀態**：
- 元認知狀態：${stateDescriptions[selectedState]}
- 求助類型：${helpSeekingType}
- 學生回答：${JSON.stringify(answers)}

${helpSeekingType === 'adaptive' ? `
這位學生展現良好的求助策略（已思考過問題或向他人求助）。
請給予較深入的提示和引導性問題。
` : helpSeekingType === 'expedient' ? `
這位學生可能想直接獲得答案而非理解。
請特別強調：
1. 先自己思考的重要性
2. 為什麼不直接給答案
3. 引導向真人求助
4. 提供思考問題而非步驟
` : ''}

請生成回應，包含以下結構（使用 JSON 格式）：
{
  "isRelevant": true 或 false,
  "irrelevantReason": "（僅在 isRelevant 為 false 時填寫，說明為何這張卡片無法提供有效引導）",
  "summary": "對學生狀態的簡短摘要（1-2 句話）",
  "thinkingDirections": [
    {
      "title": "思考方向標題",
      "description": "具體的思考提示（2-3 句話）",
      "reasoning": "為什麼這樣建議的原因"
    }
  ],
  "humanHelpSuggestions": [
    "建議向某某同學討論某某方面",
    "在想法牆發起某某討論",
    "詢問老師關於某某的具體要求"
  ],
  "detailedSteps": [
    {
      "title": "步驟標題",
      "description": "步驟說明",
      "reasoning": "為什麼需要這個步驟"
    }
  ]
}

請確保回應是有效的 JSON 格式，不要包含任何其他文字。`;

    return prompt;
  }

  /**
   * Parse AI response content to JSON
   * [Refactored] 委派給 llmGateway.parseJsonResponse
   */
  _parseAIResponse(raw) {
    const parsed = parseJsonResponse(raw);
    if (!parsed) throw new Error('AI 回應無法解析為 JSON');
    return parsed;
  }

  /**
   * Call AI with fallback chain: HSUEH_VLLM → VLLM → Gemini
   */
  async generateSuggestions(context, selectedState, answers, askedSources, skippedThinking) {
    const helpSeekingType = this.determineHelpSeekingType(
      selectedState, answers, askedSources, skippedThinking
    );

    const prompt = this.buildPrompt(context, selectedState, answers, helpSeekingType);
    const systemInstruction = `你是專業的學習助理 AI。
你的回應必須是有效的 JSON 格式，不包含任何 markdown 標記或其他文字。
使用繁體中文回覆。`;

    // [Refactored] Provider chain via llmGateway
    const providers = [
      {
        name: 'GPT-OSS-20B',
        enabled: !!process.env.HSUEH_VLLM_BASE_URL,
        call: async () => {
          const result = await callVLLM('gpt-oss', { systemPrompt: systemInstruction, userPrompt: prompt });
          return result.content;
        }
      },
      {
        name: 'Gemma-4-26B',
        enabled: !!process.env.VLLM_BASE_URL,
        call: async () => {
          const result = await callVLLM('gemma', { systemPrompt: systemInstruction, userPrompt: prompt });
          return result.content;
        }
      },
      {
        name: 'Gemini',
        enabled: true,
        call: async () => {
          const result = await callGeminiAPI(prompt, {
            systemInstruction,
            generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
          });
          if (!result.success) throw new Error('Gemini API call failed');
          return result.content;
        }
      }
    ];

    for (const provider of providers) {
      if (!provider.enabled) continue;
      try {
        console.log(`[AI Task Assistant] Trying ${provider.name}...`);
        const raw = await provider.call();
        const suggestions = this._parseAIResponse(raw);
        console.log(`[AI Task Assistant] ${provider.name} succeeded`);

        // 如果 AI 判斷卡片內容不相關，提前返回
        if (suggestions.isRelevant === false) {
          console.log(`[AI Task Assistant] Card deemed irrelevant: ${suggestions.irrelevantReason}`);
          return { helpSeekingType, suggestions, isRelevant: false };
        }

        return { helpSeekingType, suggestions, isRelevant: true };
      } catch (error) {
        console.warn(`[AI Task Assistant] ${provider.name} failed: ${error.message}`);
      }
    }

    // All providers failed - static fallback
    console.error('[AI Task Assistant] All providers failed');
    return {
      helpSeekingType,
      suggestions: {
        summary: '抱歉，AI 分析遇到問題。建議你先和團隊討論這個任務。',
        thinkingDirections: [
          {
            title: '和團隊討論',
            description: '召集團隊成員，一起討論這個任務的目標和做法',
            reasoning: '團隊討論能激發更多想法'
          }
        ],
        humanHelpSuggestions: [
          '向同學請教類似經驗',
          '詢問老師的建議',
          '在想法牆發起討論'
        ],
        detailedSteps: []
      }
    };
  }

  // Helper methods

  _getAdjacentTasks(tasks, currentTask) {
    const sortedTasks = tasks
      .filter(t => t.columnIndex === currentTask.columnIndex)
      .sort((a, b) => a.id - b.id);

    const currentIndex = sortedTasks.findIndex(t => t.id === currentTask.id);

    return {
      before: currentIndex > 0 ? sortedTasks[currentIndex - 1] : null,
      after: currentIndex < sortedTasks.length - 1 ? sortedTasks[currentIndex + 1] : null
    };
  }

  _calculateDaysDiff(date1, date2) {
    const diffTime = Math.abs(date2 - date1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
}

module.exports = new AITaskAssistantService();
