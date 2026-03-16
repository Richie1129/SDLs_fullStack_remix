const controller = require('../controllers/user');
const router = require('express').Router();
const { validateToken } = require('../middlewares/AuthMiddleware');

//CRUD Routes /users
router.get('/', validateToken, controller.getUsers);
router.get('/teachers', validateToken, controller.getTeachers);
router.get('/me', validateToken, controller.getCurrentUser);
router.get('/project/:projectId', validateToken, controller.getProjectUsers);
router.get('/:userId', validateToken, controller.getUser);
router.post('/batch-project-users', validateToken, controller.batchGetProjectUsers);
router.post('/login', controller.loginUser);
router.post('/register', controller.registerUser);
router.get('/teacher/my-students', validateToken, controller.getTeacherStudents);
router.put('/profile', validateToken, controller.updateUserProfile);
router.put('/password', validateToken, controller.updateUserPassword);
router.put('/:userId/reset-password', validateToken, controller.adminResetPassword);

module.exports = router;