#!/usr/bin/env node
// Admin 通關密碼雜湊產生器（一次性工具）
//
// 用途：
//   將你要當作 "通關密碼" 的字串雜湊後印出，貼進 .env 的 ADMIN_RECOVERY_HASH。
//   執行後明文字串不會留在任何檔案裡。
//
// 使用（兩種模式）：
//   A. 互動模式（推薦，密碼完全不進 shell history）：
//      docker exec -it <api容器名> node scripts/hash-recovery.js
//      → 腳本 prompt「請輸入通關密碼」，打字不回顯
//   B. Argv 模式（給 CI/自動化）：
//      node scripts/hash-recovery.js '你的通關密碼'
//
// 注意：
//   1. 通關密碼建議 ≥ 12 字元，與 admin 登入密碼不同
//   2. 只貼 hash 到 .env（用單引號包住 bcrypt 值），明文只留在你腦袋裡
//   3. Argv 模式下記得清理 shell history：history -d <N>

const bcrypt = require('bcrypt');
const { promptHidden } = require('./_promptHidden');

const SALT_ROUNDS = 12;

async function main() {
    let passphrase = process.argv[2];

    if (!passphrase) {
        passphrase = await promptHidden('請輸入通關密碼（打字不會顯示）：');
    }

    if (!passphrase) {
        console.error('錯誤：未輸入通關密碼');
        process.exit(1);
    }

    if (passphrase.length < 12) {
        console.error('錯誤：通關密碼長度建議至少 12 字元（目前 ' + passphrase.length + ' 字元）');
        process.exit(1);
    }

    const hash = await bcrypt.hash(passphrase, SALT_ROUNDS);

    console.log('');
    console.log('========================================');
    console.log('請將下行整串貼到 .env 檔案（hash 用單引號包住）：');
    console.log('========================================');
    console.log("ADMIN_RECOVERY_HASH='" + hash + "'");
    console.log('========================================');
    console.log('');
    console.log('提醒：');
    console.log('  1. 這個 hash 是 bcrypt 格式，外露也無法還原明文');
    console.log('  2. 明文通關密碼請自行記住，不要寫進任何檔案');
    console.log('  3. 單引號一定要保留，避免 docker compose 把 $ 當變數展開');
    console.log('');
}

main().catch(err => {
    console.error('產生 hash 失敗：', err.message);
    process.exit(1);
});
