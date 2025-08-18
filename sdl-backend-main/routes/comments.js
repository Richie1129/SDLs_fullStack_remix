const express = require('express');
const router = express.Router();
const controller = require('../controllers/comments');
const { validateToken } = require('../middlewares/AuthMiddleware');
const { checkProjectViewingPermission, checkWritePermission } = require('../middlewares/projectViewingMiddleware');
const { uploadToMinio } = require('../middlewares/minioUploadMiddleware');

// helper: derive projectId from taskId for permission checks
const getProjectIdFromTask = async (req, res, next) => {
  try {
    const Task = require('../models/task');
    const Column = require('../models/column');
    const Kanban = require('../models/kanban');
    const taskId = req.params.taskId || req.body.taskId || req.params.commentIdTaskId;

    if (!taskId) return res.status(400).json({ message: '缺少 taskId 參數' });

    const task = await Task.findByPk(taskId, {
      include: [{
        model: Column,
        include: [{ model: Kanban, attributes: ['projectId'] }]
      }]
    });

    if (!task || !task.column || !task.column.kanban) {
      return res.status(404).json({ message: '任務或相關專案不存在' });
    }

    req.params.projectId = task.column.kanban.projectId;
    req.body.projectId = task.column.kanban.projectId;
    req.query.projectId = task.column.kanban.projectId;
    next();
  } catch (error) {
    console.error('從 taskId 獲取 projectId 錯誤:', error);
    return res.status(500).json({ message: '獲取專案資訊時發生錯誤', error: error.message });
  }
};

// GET: list comments by task (read-only allowed)
router.get('/tasks/:taskId/comments', validateToken, getProjectIdFromTask, checkProjectViewingPermission, controller.listByTask);

// POST: create comment with optional attachments (write required)
// 允許具有檢視權限(含觀摩者)發表評論，移除寫入權限限制
router.post('/tasks/:taskId/comments', validateToken, getProjectIdFromTask, checkProjectViewingPermission, uploadToMinio('files', 10), controller.create);

// helper: derive projectId from commentId
const getProjectIdFromComment = async (req, res, next) => {
  try {
    const Comment = require('../models/comment');
    const Task = require('../models/task');
    const Column = require('../models/column');
    const Kanban = require('../models/kanban');
    const { commentId } = req.params;

    const comment = await Comment.findByPk(commentId, {
      include: [{
        model: Task,
        include: [{
          model: Column,
          include: [{ model: Kanban, attributes: ['projectId'] }]
        }]
      }]
    });

    const projectId = comment?.task?.column?.kanban?.projectId;
    if (!projectId) return res.status(404).json({ message: '無法解析評論所屬專案' });

    req.params.projectId = projectId;
    req.body.projectId = projectId;
    req.query.projectId = projectId;
    next();
  } catch (error) {
    console.error('從 commentId 獲取 projectId 錯誤:', error);
    return res.status(500).json({ message: '獲取專案資訊時發生錯誤', error: error.message });
  }
};

// PUT: update comment content (author only) — allow with viewing permission
router.put('/comments/:commentId', validateToken, getProjectIdFromComment, checkProjectViewingPermission, controller.update);

// DELETE: delete comment (author only) — allow with viewing permission
router.delete('/comments/:commentId', validateToken, getProjectIdFromComment, checkProjectViewingPermission, controller.remove);

// POST: toggle like — allow with viewing permission
router.post('/comments/:commentId/like', validateToken, getProjectIdFromComment, checkProjectViewingPermission, controller.toggleLike);

module.exports = router;
