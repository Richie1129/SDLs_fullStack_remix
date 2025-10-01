const controller = require('../controllers/user');
const router = require('express').Router();
const { validateToken } = require('../middlewares/AuthMiddleware');

//CRUD Routes /users
router.get('/', controller.getUsers);
router.get('/teachers', controller.getTeachers);
router.get('/me', validateToken, controller.getCurrentUser);
router.get('/:userId', controller.getUser);
router.get('/project/:projectId', controller.getProjectUsers)
router.post('/batch-project-users', validateToken, controller.batchGetProjectUsers);
router.post('/login', controller.loginUser);
router.post('/register', controller.registerUser);
router.put('/profile', validateToken, controller.updateUserProfile);
router.put('/password', validateToken, controller.updateUserPassword);

module.exports = router;