#!/usr/bin/env node
// Admin 通關密碼雜湊產生器（一次性工具）
//
// 用途：
//   將你要當作 "通關密碼" 的字串雜湊後印出，貼進 .env 的 ADMIN_RECOVERY_HASH。
//   執行後明文字串不會留在任何檔案裡。
//
// 使用：
//   cd sdl-backend-main
//   node scripts/hash-recovery.js '你的通關密碼'
//
// 注意：
//   1. 通關密碼建議 ≥ 20 字元，與 admin 登入密碼不同
//   2. 結束後清理 shell history：`history -d <N>` 或 `history -c`
//   3. 只貼 hash 到 .env，明文只留在你腦袋裡

const bcrypt = require('bcrypt');

const SALT_ROUNDS = 12;

async function main() {
    const passphrase = process.argv[2];

    if (!passphrase) {
        console.error('用法：node scripts/hash-recovery.js \'你的通關密碼\'');
        process.exit(1);
    }

    if (passphrase.length < 12) {
        console.error('錯誤：通關密碼長度建議至少 12 字元（目前 ' + passphrase.length + ' 字元）');
        process.exit(1);
    }

    const hash = await bcrypt.hash(passphrase, SALT_ROUNDS);

    console.log('');
    console.log('========================================');
    console.log('請將下行整串貼到 .env 檔案：');
    console.log('========================================');
    console.log('ADMIN_RECOVERY_HASH=' + hash);
    console.log('========================================');
    console.log('');
    console.log('提醒：');
    console.log('  1. 這個 hash 是 bcrypt 格式，外露也無法還原明文');
    console.log('  2. 明文通關密碼請自行記住，不要寫進任何檔案');
    console.log('  3. 建議清理你剛才跑這支腳本的 shell history');
    console.log('');
}

main().catch(err => {
    console.error('產生 hash 失敗：', err.message);
    process.exit(1);
});
