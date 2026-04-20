#!/usr/bin/env node
// Admin 帳號 seed 腳本（idempotent）
//
// 用途：建立或更新 admin 帳號（role='admin'）。
//   - 若帳號不存在 → 新建
//   - 若帳號已存在 → 更新密碼
//
// 使用（兩種模式）：
//   A. 互動模式（推薦，密碼完全不進 shell history）：
//      docker exec -it <api容器名> node scripts/seed-admin.js
//      → 腳本 prompt 輸入帳號 / Email / 姓名 / 密碼（密碼打字不回顯）
//   B. Env var 模式（給 CI/自動化）：
//      docker exec -e ADMIN_ACCOUNT=admintsai -e ADMIN_EMAIL=... -e ADMIN_PASSWORD=... <api容器名> node scripts/seed-admin.js
//      缺的欄位會切回互動 prompt
//
// 容器名稱依環境切換：
//   - dev：    sdl_dev-api-1
//   - admin：  sdl_admin-api-1
//   - prod：   sdls_fullstack_remix_v3_lazyinwork-api-1（或部署時實際名稱）

require('dotenv').config();
const bcrypt = require('bcrypt');
const { promptHidden, promptVisible } = require('./_promptHidden');

const User = require('../models/user');
const sequelize = require('../util/database');

const SALT_ROUNDS = 10;

async function main() {
    let account = process.env.ADMIN_ACCOUNT;
    let email = process.env.ADMIN_EMAIL;
    let username = process.env.ADMIN_USERNAME;
    let password = process.env.ADMIN_PASSWORD;

    if (!account) account = await promptVisible('帳號', 'admintsai');
    if (!email) email = await promptVisible('Email', 'admin@sdl.local');
    if (!username) username = await promptVisible('使用者名稱', '系統管理員');
    if (!password) password = await promptHidden('密碼（打字不會顯示）：');

    if (!account || !email || !password) {
        console.error('錯誤：帳號、Email、密碼為必填');
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
