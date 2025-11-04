/**
 * 學習歷程匯出路由
 */

const router = require('express').Router();
const controller = require('../controllers/export');
const { validateToken } = require('../middlewares/AuthMiddleware');
const { checkProjectViewingPermission } = require('../middlewares/projectViewingMiddleware');

/**
 * 獲取專案匯出資料
 * GET /api/projects/:projectId/export-data
 *
 * 認證：需要 JWT Token
 * 權限：需要專案查看權限
 *
 * 回應格式：
 * {
 *   success: true,
 *   data: {
 *     basicInfo: { ... },
 *     members: [ ... ],
 *     submits: { ... },
 *     reflections: { ... },
 *     ideaWalls: { ... },
 *     kanban: { ... },
 *     statistics: { ... }
 *   }
 * }
 */
router.get(
  '/projects/:projectId/export-data',
  validateToken,
  checkProjectViewingPermission,
  controller.getExportData
);

module.exports = router;
