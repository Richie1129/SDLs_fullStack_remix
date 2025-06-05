const controller = require('../controllers/submit');
const router = require('express').Router();
const {upload} = require('../middlewares/uploadMiddleware')

router.post('/', upload.array("attachFile"), controller.createSubmit);
router.get('/', controller.getAllSubmit);
router.get('/:submitId', controller.getSubmit)
// router.get('/:submitId/profolio', controller.getProfolioSubmit)
router.put('/:submitId', upload.array("attachFile"), controller.updateSubmit);
router.get('/:submitId/changes', controller.getSubmitChangeLogs);
module.exports = router;