const router = require('express').Router();
const { validateToken } = require('../middlewares/AuthMiddleware');
const { requireAdmin } = require('../middlewares/requireAdmin');
const controller = require('../controllers/adminController');

// 所有 admin 路由必須先通過 validateToken + requireAdmin
router.use(validateToken, requireAdmin);

router.get('/users', controller.listUsers);
router.put('/users/:userId/reset-password', controller.resetUserPassword);
router.patch('/users/:userId/ai-access', controller.toggleAiAccess);
router.patch('/users/:userId/role', controller.updateUserRole);

module.exports = router;
