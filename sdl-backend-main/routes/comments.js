const express = require('express');
const router = express.Router();
const controller = require('../controllers/comments');
const { validateToken } = require('../middlewares/AuthMiddleware');
const { checkProjectViewingPermission, checkWritePermission } = require('../middlewares/projectViewingMiddleware');
const { getProjectIdFromTask, getProjectIdFromComment } = require('../middlewares/projectAccess');
const { uploadToMinio } = require('../middlewares/minioUploadMiddleware');


// GET: list comments by task (read-only allowed)
router.get('/tasks/:taskId/comments', validateToken, getProjectIdFromTask, checkProjectViewingPermission, controller.listByTask);

// POST: create comment with optional attachments (write required)
// 允許具有檢視權限(含觀摩者)發表評論，移除寫入權限限制
router.post('/tasks/:taskId/comments', validateToken, getProjectIdFromTask, checkProjectViewingPermission, uploadToMinio('files', 10), controller.create);


// PUT: update comment content (author only) — allow with viewing permission
router.put('/comments/:commentId', validateToken, getProjectIdFromComment, checkProjectViewingPermission, controller.update);

// DELETE: delete comment (author only) — allow with viewing permission
router.delete('/comments/:commentId', validateToken, getProjectIdFromComment, checkProjectViewingPermission, controller.remove);

// POST: toggle like — allow with viewing permission
router.post('/comments/:commentId/like', validateToken, getProjectIdFromComment, checkProjectViewingPermission, controller.toggleLike);

module.exports = router;
