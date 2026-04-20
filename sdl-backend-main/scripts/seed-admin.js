#!/usr/bin/env node
// Admin 帳號 seed 腳本（idempotent）
//
// 用途：建立或更新 admin 帳號（role='admin'）。
//   - 若帳號不存在 → 新建
//   - 若帳號已存在 → 更新密碼
//
// 使用（在容器內執行，需為單行指令，勿貼成多行）：
//   docker exec -it sdl_dev-api-1 sh -c 'ADMIN_ACCOUNT=admintsai ADMIN_EMAIL=admin@sdl.local ADMIN_USERNAME=系統管理員 ADMIN_PASSWORD="你的明文密碼" node scripts/seed-admin.js'
//
// 容器名稱依環境切換：
//   - dev 環境：    sdl_dev-api-1
//   - admin 環境：  sdl_admin-api-1
//   - prod 環境：   sdl_prod-api-1（或部署時實際名稱）
//
// 注意：
//   1. 貼到 terminal 時**必須保持單行**，多行貼上時 shell 會把前幾行的 VAR=value
//      當作「指令」執行（不會 export 到 node process），導致 ADMIN_* 環境變數為空
//   2. 明文密碼僅存在於這條指令的環境變數，不會寫入任何檔案
//   3. 執行後建議清理 shell history：history -c

require('dotenv').config();
const bcrypt = require('bcrypt');

const User = require('../models/user');
const sequelize = require('../util/database');

const SALT_ROUNDS = 10;

async function main() {
    const account = process.env.ADMIN_ACCOUNT;
    const email = process.env.ADMIN_EMAIL;
    const username = process.env.ADMIN_USERNAME || '系統管理員';
    const password = process.env.ADMIN_PASSWORD;

    if (!account || !email || !password) {
        console.error('錯誤：請設定環境變數 ADMIN_ACCOUNT / ADMIN_EMAIL / ADMIN_PASSWORD');
        console.error('範例：');
        console.error('  ADMIN_ACCOUNT=admintsai ADMIN_EMAIL=admin@sdl.local ADMIN_PASSWORD=xxx node scripts/seed-admin.js');
        process.exit(1);
    }

    if (password.length < 8) {
        console.error('錯誤：密碼長度需 ≥ 8');
        process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const existing = await User.findOne({ where: { account } });

    if (existing) {
        if (existing.role !== 'admin') {
            console.error('拒絕：帳號 ' + account + ' 存在但 role 是 ' + existing.role + '，不是 admin');
            console.error('若確定要升級為 admin，請手動處理 DB');
            process.exit(1);
        }
        await existing.update({ password: hashedPassword, email, username });
        console.log('已更新 admin 帳號：' + account);
    } else {
        await User.create({
            account,
            email,
            username,
            password: hashedPassword,
            role: 'admin',
            aiEnabled: true
        });
        console.log('已建立 admin 帳號：' + account);
    }

    await sequelize.close();
}

main().catch(err => {
    console.error('seed 失敗：', err.message);
    process.exit(1);
});
