const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
    requestPasswordReset,
    validateResetToken,
    resetPassword
} = require('../controllers/passwordReset');

const resetPasswordLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 30,
    message: { message: '密碼重設請求次數過多，請稍後再試' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV !== 'production',
});

router.post('/forgot-password', requestPasswordReset);

router.get('/reset-password/:token', validateResetToken);  // 不限制：只是驗證 token

router.post('/reset-password', resetPasswordLimiter, resetPassword);

module.exports = router;