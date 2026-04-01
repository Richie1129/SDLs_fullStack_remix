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

// 取得學習敘事草稿
router.get(
  '/projects/:projectId/portfolio/draft',
  validateToken,
  checkProjectViewingPermission,
  controller.getDraft
);

// 儲存學習敘事草稿
router.put(
  '/projects/:projectId/portfolio/draft',
  validateToken,
  checkProjectViewingPermission,
  controller.saveDraft
);

// AI 敘事生成（SSE 串流）
router.post(
  '/projects/:projectId/portfolio/generate',
  validateToken,
  checkProjectViewingPermission,
  controller.generateNarrative
);

// AI 段落整合（SSE 串流）— 保留原字句，只整合段落結構
router.post(
  '/projects/:projectId/portfolio/organize',
  validateToken,
  checkProjectViewingPermission,
  controller.requestOrganize
);

// AI 寫作回饋（SSE 串流）
router.post(
  '/projects/:projectId/portfolio/feedback',
  validateToken,
  checkProjectViewingPermission,
  controller.requestFeedback
);

module.exports = router;
