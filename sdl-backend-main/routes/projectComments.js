const express = require('express');
const router = express.Router();
const controller = require('../controllers/projectComments');
const { validateToken } = require('../middlewares/AuthMiddleware');
const { checkProjectViewingPermission } = require('../middlewares/projectViewingMiddleware');
const { uploadToMinio } = require('../middlewares/minioUploadMiddleware');
const ProjectComment = require('../models/project_comment');

// Helper: derive projectId from project comment id
const getProjectIdFromProjectComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const comment = await ProjectComment.findByPk(commentId);
    if (!comment) return res.status(404).json({ message: '評論不存在' });
    const projectId = comment.projectId;
    if (!projectId) return res.status(404).json({ message: '無法解析評論所屬專案' });
    req.params.projectId = projectId;
    req.body.projectId = projectId;
    req.query.projectId = projectId;
    next();
  } catch (error) {
    console.error('從 project comment 獲取 projectId 錯誤:', error);
    return res.status(500).json({ message: '獲取專案資訊時發生錯誤', error: error.message });
  }
};

// List comments for a project — allow viewing permission
router.get('/projects/:projectId/comments', validateToken, checkProjectViewingPermission, controller.listByProject);

// Create a comment — allow viewing permission (like task comments)
router.post('/projects/:projectId/comments', validateToken, checkProjectViewingPermission, controller.create);

// Update/Delete/Like — validate via derived projectId then check permission
router.put('/project-comments/:commentId', validateToken, getProjectIdFromProjectComment, checkProjectViewingPermission, controller.update);
router.delete('/project-comments/:commentId', validateToken, getProjectIdFromProjectComment, checkProjectViewingPermission, controller.remove);
router.post('/project-comments/:commentId/like', validateToken, getProjectIdFromProjectComment, checkProjectViewingPermission, controller.toggleLike);

// Attachments upload (MinIO)
router.post(
  '/project-comments/:commentId/attachments',
  validateToken,
  getProjectIdFromProjectComment,
  checkProjectViewingPermission,
  uploadToMinio('files', 10),
  controller.addAttachments
);

module.exports = router;
