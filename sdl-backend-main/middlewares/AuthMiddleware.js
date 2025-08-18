const { verify } = require("jsonwebtoken");

const validateToken = async(req, res, next) =>{
    const accessToken = await req.header("accessToken");
    console.log('=== AuthMiddleware Debug ===');
    console.log('accessToken:', accessToken);

    if(!accessToken) return res.status(404).json({error:"User not logged in!"});

    try{
        const validToken = verify(accessToken, "importantsecret");
        console.log('validToken:', validToken);
        req.user = validToken;
        req.userId = validToken.id; // 設置 userId 供其他控制器使用
        console.log('req.userId set to:', req.userId);
        if(validToken){
            return next();
        }
    } 
    catch (err){
        console.log('JWT verification error:', err);
        return res.json({error: err});
    }
};

module.exports = { validateToken };