/**
 * 生產環境部署檢查腳本
 * 驗證環境變數和配置是否適合生產環境部署
 */

const config = require('./config');

console.log('🏭 生產環境部署檢查\n');

let hasErrors = false;
let hasWarnings = false;

// 檢查關鍵環境變數
console.log('📋 環境變數檢查:');

const requiredInProduction = [
    { key: 'JWT_SECRET', current: config.jwt.secret, risk: 'HIGH' },
    { key: 'RAGFLOW_API_KEY', current: config.apiKeys.ragflow, risk: 'HIGH' }
];

const recommended = [
    { key: 'SSL_VERIFY', current: config.ssl.verify, expected: true, risk: 'MEDIUM' },
    { key: 'NODE_ENV', current: process.env.NODE_ENV, expected: 'production', risk: 'LOW' }
];

// 檢查必要環境變數
requiredInProduction.forEach(item => {
    if (!item.current || item.current.includes('your_') || item.current.includes('change_this')) {
        console.log(`   ❌ ${item.key}: 未設定或使用預設值 (風險: ${item.risk})`);
        hasErrors = true;
    } else {
        console.log(`   ✅ ${item.key}: 已設定`);
    }
});

// 檢查建議設定
recommended.forEach(item => {
    if (item.current !== item.expected) {
        console.log(`   ⚠️  ${item.key}: ${item.current} (建議: ${item.expected}, 風險: ${item.risk})`);
        hasWarnings = true;
    } else {
        console.log(`   ✅ ${item.key}: ${item.current}`);
    }
});

// 檢查 API Keys
console.log('\n🔑 API Keys 檢查:');
const apiKeys = config.apiKeys;
Object.entries(apiKeys).forEach(([key, value]) => {
    if (!value) {
        console.log(`   ⚠️  ${key}: 未設定`);
        hasWarnings = true;
    } else if (value.includes('your_') || value.includes('change_this')) {
        console.log(`   ❌ ${key}: 使用預設值，需要設定真實 API key`);
        hasErrors = true;
    } else {
        console.log(`   ✅ ${key}: 已設定`);
    }
});

// 檢查資料庫配置
console.log('\n🗄️  資料庫配置檢查:');
const dbConfig = config.database;
if (dbConfig.host === 'localhost' && process.env.NODE_ENV === 'production') {
    console.log('   ⚠️  資料庫主機設為 localhost，確認是否正確');
    hasWarnings = true;
} else {
    console.log(`   ✅ 資料庫主機: ${dbConfig.host}`);
}

console.log(`   ✅ 資料庫: ${dbConfig.database}`);
console.log(`   ✅ 用戶: ${dbConfig.username}`);

// 總結
console.log('\n📊 檢查結果:');
if (hasErrors) {
    console.log('❌ 發現嚴重問題，建議修復後再部署');
    process.exit(1);
} else if (hasWarnings) {
    console.log('⚠️  發現建議改進項目，但可以部署');
    console.log('   建議在生產環境優化這些設定');
} else {
    console.log('✅ 所有檢查通過，可以安全部署！');
}

console.log('\n💡 部署提醒:');
console.log('   1. 確保生產環境設定了正確的環境變數');
console.log('   2. 不要在生產環境使用 .env 檔案');
console.log('   3. 使用 process manager (如 PM2) 管理 Node.js 進程');
console.log('   4. 定期監控日誌和效能');