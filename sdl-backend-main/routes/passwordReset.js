const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
    requestPasswordReset,
    validateResetToken,
    resetPassword
} = require('../controllers/passwordReset');

// 未設定 NODE_ENV 視為生產（與 routes/metrics.js 一致）：只有明確 development / test 才跳過限流
const isNonProdEnv = () => process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

const resetPasswordLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 30,
    message: { message: '密碼重設請求次數過多，請稍後再試' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: isNonProdEnv,
});

// 驗證端點未認證、每次都查 DB 且回傳 email／username／account：寬鬆限流即可，UUID v4 本身無法暴力猜測
const validateTokenLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    message: { message: '請求次數過多，請稍後再試' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: isNonProdEnv,
});

router.post('/forgot-password', requestPasswordReset);

// 驗證改用 POST、token 放 body：不進 nginx access log、瀏覽器歷史與 Referer（2026-09-05 資安審查）
router.post('/reset-password/validate', validateTokenLimiter, validateResetToken);

router.post('/reset-password', resetPasswordLimiter, resetPassword);

module.exports = router;