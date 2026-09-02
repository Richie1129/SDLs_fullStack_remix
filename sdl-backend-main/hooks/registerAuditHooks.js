const { logAudit, safeDiff, summarizeText, clampMetadataSize } = require('../services/auditService');
const Task = require('../models/task');
const Comment = require('../models/comment');
const Column = require('../models/column');
const Kanban = require('../models/kanban');
const Project = require('../models/project');
const Node = require('../models/node');
const Submit = require('../models/submit');
const IdeaWall = require('../models/idea_wall');

// 只動到時間戳的欄位；一次更新若只改了這些，代表沒有實質內容變更，不需要寫 audit
const TIMESTAMP_ONLY_FIELDS = new Set(['updatedAt', 'createdAt']);

/**
 * 判斷這次更新是否只碰到時間戳（例如 Project.update({ updatedAt }) 這種「touch」）
 * changedFields 來自 instance.changed()，diff 來自 safeDiff(before, after)。
 * 兩者聯集裡只要有任何非時間戳欄位就視為實質變更。
 */
function isTimestampOnlyUpdate(changedFields, diff) {
  const keys = new Set([
    ...(Array.isArray(changedFields) ? changedFields : []),
    ...Object.keys(diff && typeof diff === 'object' ? diff : {}),
  ]);
  for (const key of keys) {
    if (!TIMESTAMP_ONLY_FIELDS.has(key)) return false;
  }
  return true;
}

/**
 * 由 Task 解析 projectId。
 * 優先使用呼叫端已驗證並透過 options.projectId 傳入的值；
 * 否則一句 JOIN（Column -> Kanban）取 projectId，取代原本 Column、Kanban 各查一次。
 */
async function resolveProjectIdFromTask(task, options) {
  try {
    if (options?.projectId) return options.projectId;
    if (!task || !task.columnId) return null;
    const column = await Column.findByPk(task.columnId, {
      attributes: ['id'],
      include: [{ model: Kanban, attributes: ['projectId'] }],
    });
    return column?.kanban?.projectId || null;
  } catch (_) { return null; }
}

/**
 * 由 Comment 解析 projectId：一句 JOIN（Task -> Column -> Kanban）
 */
async function resolveProjectIdFromComment(comment, options) {
  try {
    if (options?.projectId) return options.projectId;
    if (!comment || !comment.taskId) return null;
    const task = await Task.findByPk(comment.taskId, {
      attributes: ['id', 'columnId'],
      include: [{
        model: Column,
        attributes: ['id'],
        include: [{ model: Kanban, attributes: ['projectId'] }],
      }],
    });
    return task?.column?.kanban?.projectId || null;
  } catch (_) { return null; }
}

function attachHooks(model, { createAction, updateAction, deleteAction, targetType, resolveProjectId }) {
  model.addHook('afterCreate', async (instance, options) => {
    const req = options?.req || null;
    const projectId = await resolveProjectId(instance, options);
    // build summarized metadata.after
    const afterRaw = instance.toJSON?.() || instance.dataValues || {};
    const after = { ...afterRaw };
    if (typeof after.content === 'string') after.content = summarizeText(after.content);
    await logAudit(req, {
      action: createAction,
      targetType,
      targetId: instance.id,
      projectId,
      metadata: clampMetadataSize({ after })
    });
  });

  model.addHook('afterUpdate', async (instance, options) => {
    // 呼叫端明確標記略過（例如只是 touch updatedAt）
    if (options?.auditSkip === true) return;

    const req = options?.req || null;
    const before = instance._previousDataValues || {};
    const after = instance.dataValues || {};
    const diff = safeDiff(before, after);
    const changed = instance.changed?.() || [];

    // 只動到 updatedAt 的更新沒有審計價值，直接略過（B3：PROJECT_UPDATE 寫入放大的來源）
    if (isTimestampOnlyUpdate(changed, diff)) return;

    const projectId = await resolveProjectId(instance, options);
    await logAudit(req, {
      action: updateAction,
      targetType,
      targetId: instance.id,
      projectId,
      metadata: clampMetadataSize({ changed, diff })
    });
  });

  model.addHook('afterDestroy', async (instance, options) => {
    const req = options?.req || null;
    const projectId = await resolveProjectId(instance, options);
    const before = instance.dataValues || {};
    if (typeof before.content === 'string') before.content = summarizeText(before.content);

    // 針對評論刪除，增強 metadata 以包含任務/專案資訊
    let enhancedMetadata = { before };

    if (targetType === 'comment' && instance.taskId) {
      try {
        const task = await Task.findByPk(instance.taskId, {
          attributes: ['id', 'title']
        });
        if (task) {
          enhancedMetadata.taskTitle = task.title;
          enhancedMetadata.taskId = task.id;
          console.log('評論刪除 - 已保存任務資訊到 metadata:', {
            taskTitle: task.title,
            taskId: task.id,
            commentId: instance.id
          });
        }
      } catch (e) {
        console.warn('評論刪除時獲取任務資訊失敗:', e.message);
      }
    }

    await logAudit(req, {
      action: deleteAction,
      targetType,
      targetId: instance.id,
      projectId,
      metadata: clampMetadataSize(enhancedMetadata)
    });
  });
}

function registerAuditHooks() {
  attachHooks(Task, {
    createAction: 'TASK_CREATE',
    updateAction: 'TASK_UPDATE',
    deleteAction: 'TASK_DELETE',
    targetType: 'task',
    resolveProjectId: resolveProjectIdFromTask,
  });

  attachHooks(Comment, {
    createAction: 'COMMENT_CREATE',
    updateAction: 'COMMENT_UPDATE',
    deleteAction: 'COMMENT_DELETE',
    targetType: 'comment',
    resolveProjectId: resolveProjectIdFromComment,
  });

  // Project
  attachHooks(Project, {
    createAction: 'PROJECT_CREATE',
    updateAction: 'PROJECT_UPDATE',
    deleteAction: 'PROJECT_DELETE',
    targetType: 'project',
    resolveProjectId: async (p) => p?.id || null,
  });

  // Node (IdeaWall -> projectId)
  attachHooks(Node, {
    createAction: 'NODE_CREATE',
    updateAction: 'NODE_UPDATE',
    deleteAction: 'NODE_DELETE',
    targetType: 'node',
    resolveProjectId: async (node, options) => {
      try {
        if (options?.projectId) return options.projectId;
        const wall = await IdeaWall.findByPk(node?.ideaWallId, { attributes: ['id', 'projectId'] });
        return wall?.projectId || null;
      } catch (_) { return null; }
    },
  });

  // Submit (has projectId column)
  attachHooks(Submit, {
    createAction: 'SUBMIT_CREATE',
    updateAction: 'SUBMIT_UPDATE',
    deleteAction: 'SUBMIT_DELETE',
    targetType: 'submit',
    resolveProjectId: async (s) => s?.projectId || null,
  });
}

module.exports = { registerAuditHooks, isTimestampOnlyUpdate, resolveProjectIdFromTask, resolveProjectIdFromComment };
