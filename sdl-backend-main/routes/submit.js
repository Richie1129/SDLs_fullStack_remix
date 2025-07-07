const controller = require('../controllers/submit');
const router = require('express').Router();
const { uploadToMinio, uploadSingleToMinio } = require('../middlewares/minioUploadMiddleware');
// const { upload } = require('../middlewares/uploadMiddleware'); // 原版本 - 暫時註解

// 使用 MinIO 中介軟體
router.post('/', uploadToMinio('attachFile'), controller.createSubmit);
router.get('/', controller.getAllSubmit);
router.get('/:submitId', controller.getSubmit);
router.put('/:submitId', uploadSingleToMinio('attachFile'), controller.updateSubmit);
router.get('/:submitId/changes', controller.getSubmitChangeLogs);

module.exports = router;