const express = require('express');
const router = express.Router();
const controller = require('../controllers/kanban');

router.get('/:projectId', controller.getKanban);
router.get('/columns/:columnId', controller.getKanbanTask);
router.get('/tasks/:taskId/changes', controller.getTaskChangeLogs);
router.get('/projects/:projectId/activity', controller.getProjectActivity);
//router.post('/', controller.createKanban);
// router.put('/:projectId', controller.updateKanban);
// router.delete('/:projectId', controller.deleteKanban);

module.exports = router;