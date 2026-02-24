/**
 * 個人學習歷程路由
 */

const router = require('express').Router();
const controller = require('../controllers/studentPortfolio');
const { validateToken } = require('../middlewares/AuthMiddleware');
const { checkProjectViewingPermission } = require('../middlewares/projectViewingMiddleware');

// 取得個人學習歷程資料
router.get(
  '/projects/:projectId/portfolio/student',
  validateToken,
  checkProjectViewingPermission,
  controller.getStudentPortfolioData
);

// AI 敘事生成（SSE 串流）
router.post(
  '/projects/:projectId/portfolio/generate',
  validateToken,
  checkProjectViewingPermission,
  controller.generateNarrative
);

module.exports = router;
