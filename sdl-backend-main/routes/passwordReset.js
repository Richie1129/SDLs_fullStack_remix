const express = require('express');
const router = express.Router();
const {
    requestPasswordReset,
    validateResetToken,
    resetPassword
} = require('../controllers/passwordReset');

router.post('/forgot-password', requestPasswordReset);

router.get('/reset-password/:token', validateResetToken);

router.post('/reset-password', resetPassword);

module.exports = router;