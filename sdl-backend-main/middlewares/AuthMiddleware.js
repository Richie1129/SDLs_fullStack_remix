const { verify } = require("jsonwebtoken");
const config = require('../config');

const validateToken = async(req, res, next) =>{
    const accessToken = await req.header("accessToken");
    console.log('=== AuthMiddleware Debug ===');
    console.log('accessToken:', accessToken);

    if(!accessToken) {
        return res.status(401).json({
            error: "未提供認證令牌",
            code: "NO_TOKEN"
        });
    }

    try{
        const validToken = verify(accessToken, config.jwt.secret);
        console.log('validToken:', validToken);
        req.user = validToken;
        req.userId = validToken.id; // 設置 userId 供其他控制器使用
        console.log('req.userId set to:', req.userId);
        if(validToken){
            return next();
        }
    }
    catch (err){
        console.log('JWT verification error:', err.name, err.message);

        // 區分不同的 JWT 錯誤類型
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: "認證令牌已過期",
                code: "TOKEN_EXPIRED"
            });
        }

        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({
                error: "無效的認證令牌",
                code: "INVALID_TOKEN"
            });
        }

        // 其他未知錯誤
        return res.status(401).json({
            error: "認證驗證失敗",
            code: "AUTH_FAILED"
        });
    }
};

module.exports = { validateToken };
