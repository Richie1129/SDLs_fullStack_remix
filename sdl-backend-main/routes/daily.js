const controller = require('../controllers/daily');
const router = require('express').Router();
const { uploadToMinio, uploadSingleToMinio } = require('../middlewares/minioUploadMiddleware');
// const { upload } = require('../middlewares/uploadMiddleware'); // 原版本 - 暫時註解

router.get('/', controller.getPersonalDaily); 
router.get('/team', controller.getTeamDaily);

// 使用 MinIO 中介軟體
router.post('/', uploadToMinio('attachFile'), controller.createPersonalDaily);
router.post('/team', uploadToMinio('attachFile'), controller.createTeamDaily);
router.put('/personal/:id', uploadSingleToMinio('attachFile'), controller.updatePersonalDaily);
router.put('/team/:id', uploadSingleToMinio('attachFile'), controller.updateTeamDaily);

module.exports = router;