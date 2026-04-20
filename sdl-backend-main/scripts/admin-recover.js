#!/usr/bin/env node
// Admin 密碼救援腳本（緊急使用）
//
// 用途：
//   當 admin 忘記登入密碼時，憑通關密碼重設 admin 的登入密碼。
//   通關密碼透過 stdin 互動輸入（不留 shell history），
//   與 .env 的 ADMIN_RECOVERY_HASH 做 bcrypt 比對。
//
// 使用：
//   docker exec -it sdl_admin-api-1 node scripts/admin-recover.js
//
// 流程：
//   1. 腳本 prompt 你輸入通關密碼（不顯示）
//   2. 比對 ADMIN_RECOVERY_HASH，通過即產生新臨時密碼
//   3. 臨時密碼印在 terminal，admin 用此登入後自行修改
//   4. 寫入 audit log：ADMIN_RECOVERY_TRIGGERED

require('dotenv').config();
const readline = require('readline');
const bcrypt = require('bcrypt');
const { Writable } = require('stream');

const User = require('../models/user');
const AuditEvent = require('../models/audit_event');
const sequelize = require('../util/database');

const ADMIN_ACCOUNT = process.env.ADMIN_ACCOUNT || 'admintsai';
const SALT_ROUNDS = 10;

// 讀取密碼但不回顯
function promptHidden(question) {
    const mutableStdout = new Writable({
        write(chunk, encoding, callback) {
            if (!this.muted) process.stdout.write(chunk, encoding);
            callback();
        }
    });
    mutableStdout.muted = false;

    const rl = readline.createInterface({
        input: process.stdin,
        output: mutableStdout,
        terminal: true
    });

    return new Promise(resolve => {
        rl.question(question, answer => {
            rl.close();
            process.stdout.write('\n');
            resolve(answer);
        });
        mutableStdout.muted = true;
    });
}

function generateTempPassword() {
    const digits = Math.floor(100000 + Math.random() * 900000);
    return `SDL${digits}`;
}

async function main() {
    const recoveryHash = process.env.ADMIN_RECOVERY_HASH;

    if (!recoveryHash) {
        console.error('錯誤：環境變數 ADMIN_RECOVERY_HASH 未設定');
        console.error('請先跑 node scripts/hash-recovery.js 產生 hash 貼進 .env');
        process.exit(1);
    }

    console.log('=== Admin 密碼救援 ===');
    console.log('將重設帳號：' + ADMIN_ACCOUNT);
    console.log('');

    const passphrase = await promptHidden('請輸入通關密碼：');

    if (!passphrase) {
        console.error('錯誤：未輸入通關密碼');
        process.exit(1);
    }

    const matched = await bcrypt.compare(passphrase, recoveryHash);
    if (!matched) {
        console.error('通關密碼錯誤');
        process.exit(1);
    }

    const adminUser = await User.findOne({ where: { account: ADMIN_ACCOUNT } });
    if (!adminUser) {
        console.error('找不到 admin 帳號：' + ADMIN_ACCOUNT);
        console.error('請先跑 node scripts/seed-admin.js 建立 admin');
        process.exit(1);
    }

    if (adminUser.role !== 'admin') {
        console.error('帳號 ' + ADMIN_ACCOUNT + ' 的 role 不是 admin，拒絕執行');
        process.exit(1);
    }

    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, SALT_ROUNDS);

    await adminUser.update({
        password: hashedPassword,
        passwordResetAt: new Date()
    });

    try {
        await AuditEvent.create({
            action: 'ADMIN_RECOVERY_TRIGGERED',
            actorId: adminUser.id,
            targetType: 'user',
            targetId: String(adminUser.id),
            metadata: { account: ADMIN_ACCOUNT, method: 'cli_recovery' }
        });
    } catch (err) {
        console.warn('警告：audit log 寫入失敗（不影響重設結果）:', err.message);
    }

    console.log('');
    console.log('========================================');
    console.log('重設成功。新臨時密碼：');
    console.log('  ' + tempPassword);
    console.log('========================================');
    console.log('請 admin 用此密碼登入後立即修改。');
    console.log('');

    await sequelize.close();
}

main().catch(err => {
    console.error('執行失敗：', err.message);
    process.exit(1);
});
