// 共用工具：從 stdin 讀取不回顯的密碼
// 供 seed-admin.js / hash-recovery.js / admin-recover.js 使用

const readline = require('readline');
const { Writable } = require('stream');

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

function promptVisible(question, defaultValue = '') {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    const suffix = defaultValue ? ` (${defaultValue})` : '';
    return new Promise(resolve => {
        rl.question(`${question}${suffix}：`, answer => {
            rl.close();
            resolve(answer.trim() || defaultValue);
        });
    });
}

module.exports = { promptHidden, promptVisible };
