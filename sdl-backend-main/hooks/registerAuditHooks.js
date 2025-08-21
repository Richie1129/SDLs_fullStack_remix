const { logAudit, safeDiff, summarizeText, clampMetadataSize } = require('../services/auditService');
const Task = require('../models/task');
const Comment = require('../models/comment');
const Column = require('../models/column');
const Kanban = require('../models/kanban');
const Project = require('../models/project');
const Node = require('../models/node');
const Submit = require('../models/submit');
const IdeaWall = require('../models/idea_wall');

async function resolveProjectIdFromTask(task) {
  try {
    if (!task || !task.columnId) return null;
    const column = await Column.findByPk(task.columnId);
    if (!column) return null;
    const kanban = await Kanban.findByPk(column.kanbanId);
    return kanban?.projectId || null;
  } catch (_) { return null; }
}

async function resolveProjectIdFromComment(comment) {
  try {
    // comment has taskId
    const task = await Task.findByPk(comment.taskId);
    return await resolveProjectIdFromTask(task);
  } catch (_) { return null; }
}

function attachHooks(model, { createAction, updateAction, deleteAction, targetType, resolveProjectId }) {
  model.addHook('afterCreate', async (instance, options) => {
    const req = options?.req || null;
    const projectId = await resolveProjectId(instance);
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
    const req = options?.req || null;
    const before = instance._previousDataValues || {};
    const after = instance.dataValues || {};
    const diff = safeDiff(before, after);
    const projectId = await resolveProjectId(instance);
    await logAudit(req, {
      action: updateAction,
      targetType,
      targetId: instance.id,
      projectId,
      metadata: clampMetadataSize({ changed: instance.changed?.() || [], diff })
    });
  });

  model.addHook('afterDestroy', async (instance, options) => {
    const req = options?.req || null;
    const projectId = await resolveProjectId(instance);
    const before = instance.dataValues || {};
    if (typeof before.content === 'string') before.content = summarizeText(before.content);
    await logAudit(req, {
      action: deleteAction,
      targetType,
      targetId: instance.id,
      projectId,
      metadata: clampMetadataSize({ before })
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
    resolveProjectId: async (node) => {
      try {
        const wall = await IdeaWall.findByPk(node?.ideaWallId);
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

module.exports = { registerAuditHooks };
