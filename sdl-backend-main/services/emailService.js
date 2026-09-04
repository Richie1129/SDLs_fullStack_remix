const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendPasswordResetEmail = async (email, resetToken) => {
    // 檢查是否為演示環境
    if (!process.env.EMAIL_USER || process.env.EMAIL_USER.includes('demo') || process.env.EMAIL_USER.includes('example')) {
        const demoBase = process.env.FRONTEND_URL || 'http://localhost';
        const resetUrl = `${demoBase}/reset-password#token=${resetToken}`;
        // 明文連結只在 development / test 印出；其他環境若因 SMTP 設定缺失退回演示模式，只印遮蔽版，
        // 避免可直接使用的重設 token 落進容器日誌（DB 已只存雜湊，日誌不能成為新的外洩點）
        const printableUrl = (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test')
            ? resetUrl
            : `${demoBase}/reset-password#token=${String(resetToken).slice(0, 8)}…`;
        console.log('🔧 演示模式 - 模擬郵件發送');
        console.log(`📧 收件者: ${email}`);
        console.log(`🔗 重設連結: ${printableUrl}`);
        console.log('✅ 模擬郵件發送成功');

        return {
            success: true,
            messageId: `demo-${Date.now()}`,
            demoMode: true,
            resetUrl
        };
    }

    // token 放在 URL fragment（#token=）：瀏覽器不會把 fragment 送到伺服器，token 不會進 nginx access log
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password#token=${resetToken}`;

    const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: email,
        subject: 'SDL 密碼重設',
        html: `
            <!DOCTYPE html>
            <html lang="zh-TW">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>密碼重設</title>
                <style>
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        background-color: #f4f4f4;
                        margin: 0;
                        padding: 20px;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        background: white;
                        padding: 30px;
                        border-radius: 8px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                        border-bottom: 3px solid #007bff;
                        padding-bottom: 20px;
                    }
                    .reset-btn {
                        display: inline-block;
                        padding: 12px 30px;
                        background-color: #007bff;
                        color: white;
                        text-decoration: none;
                        border-radius: 5px;
                        margin: 20px 0;
                        font-weight: bold;
                    }
                    .warning {
                        background-color: #fff3cd;
                        padding: 15px;
                        border-left: 4px solid #ffc107;
                        margin: 20px 0;
                        border-radius: 4px;
                    }
                    .footer {
                        margin-top: 30px;
                        padding-top: 20px;
                        border-top: 1px solid #eee;
                        text-align: center;
                        color: #666;
                        font-size: 14px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>SDL 密碼重設</h1>
                    </div>

                    <p>您好，</p>

                    <p>我們收到了重設您帳號密碼的請求。請點擊下方按鈕來重設您的密碼：</p>

                    <div style="text-align: center;">
                        <a href="${resetUrl}" class="reset-btn">重設我的密碼</a>
                    </div>

                    <div class="warning">
                        <strong>⚠️ 重要提醒：</strong>
                        <ul>
                            <li>此連結將在 24 小時後失效</li>
                            <li>此連結僅能使用一次</li>
                            <li>如果您沒有要求重設密碼，請忽略此郵件</li>
                        </ul>
                    </div>

                    <p>或者，您也可以複製以下連結到瀏覽器地址欄：</p>
                    <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace;">
                        ${resetUrl}
                    </p>

                    <div class="footer">
                        <p>此為系統自動發送的郵件，請勿回覆。</p>
                        <p>如有問題，請聯繫系統管理員。</p>
                        <p>&copy; ${new Date().getFullYear()} SDL 學習平台</p>
                    </div>
                </div>
            </body>
            </html>
        `,
        text: `
SDL 密碼重設

您好，

我們收到了重設您帳號密碼的請求。請在 24 小時內點擊以下連結來重設您的密碼：

${resetUrl}

重要提醒：
- 此連結將在 24 小時後失效
- 此連結僅能使用一次
- 如果您沒有要求重設密碼，請忽略此郵件

此為系統自動發送的郵件，請勿回覆。

© ${new Date().getFullYear()} SDL 學習平台
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Password reset email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Failed to send password reset email:', error);
        throw new Error('郵件發送失敗，請稍後再試');
    }
};

const verifyEmailConfig = async () => {
    try {
        await transporter.verify();
        console.log('Email configuration is valid');
        return true;
    } catch (error) {
        console.error('Email configuration error:', error);
        return false;
    }
};

module.exports = {
    sendPasswordResetEmail,
    verifyEmailConfig
};