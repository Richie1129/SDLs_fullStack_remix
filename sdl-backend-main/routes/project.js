// router for project
const controller = require('../controllers/project');
const assistantController = require('../controllers/assistant');
const router = require('express').Router();
const { validateToken } = require('../middlewares/AuthMiddleware');
const chatTurnController = require('../controllers/chatTurns');
const { checkWritePermission } = require('../middlewares/projectViewingMiddleware');
const { 
    checkProjectViewingPermission, 
    checkTeacherRole, 
    checkProjectOwnerOrTeacher 
} = require('../middlewares/projectViewingMiddleware');

// 觀摩權限相關路由（具體路由需要放在動態路由之前）
router.get('/classes/list', validateToken, controller.getAllClasses);
router.get('/classes/:className/users-projects', validateToken, controller.getClassUsersAndProjects);
router.post('/batch-viewing-settings', validateToken, checkTeacherRole, controller.batchUpdateViewingSettings);
router.patch('/:id/viewing-settings', validateToken, checkProjectOwnerOrTeacher, controller.updateViewingSettings);
router.get('/:id/viewable', validateToken, controller.checkViewingPermission);

// 現有路由
router.get('/', validateToken, controller.getAllProject);  // 添加 validateToken 中間件
router.get('/mentor/:mentor', controller.getProjectsByMentor);
router.get('/:projectId', controller.getProject);
// Aggregated project content for AI assistant
// router.get('/:projectId/content', validateToken, checkProjectViewingPermission, assistantController.getProjectContent);

// Project chat history and turns (AssistantChat)
router.get('/:projectId/chat', validateToken, checkProjectViewingPermission, chatTurnController.listByProject);
router.post('/:projectId/chat', validateToken, checkProjectViewingPermission, checkWritePermission, chatTurnController.create);
router.put('/:projectId/chat/:id', validateToken, checkProjectViewingPermission, checkWritePermission, chatTurnController.update);
router.post('/', controller.createProject);
router.post('/referral', controller.inviteForProject)
router.put("/:projectId", controller.updateProject);
router.delete("/:projectId", controller.deleteProject);

// router.put('/:projectId', controller.updateProject);
// router.delete('/:projectId', controller.deleteProject);

module.exports = router;
