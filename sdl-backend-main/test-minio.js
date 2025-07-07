require('dotenv').config();
const { s3Client, uploadFileToMinio, checkFileExists, BUCKET_NAME } = require('./config/minio');

// 測試 MinIO 連線和基本功能
async function testMinIOConnection() {
    console.log('🔄 開始測試 MinIO 連線...');
    console.log(`📊 配置資訊:
    - Endpoint: ${process.env.MINIO_ENDPOINT || "http://localhost:9000"}
    - Access Key: ${process.env.MINIO_ACCESS_KEY || "minioadmin"}
    - Bucket: ${BUCKET_NAME}
    `);

    try {
        // 測試檔案上傳
        console.log('📤 測試檔案上傳...');
        const testContent = Buffer.from('Hello MinIO! 這是一個測試檔案。', 'utf8');
        const testFileName = `test-${Date.now()}.txt`;
        
        const uploadResult = await uploadFileToMinio(testContent, testFileName, 'text/plain');
        console.log('✅ 檔案上傳成功:', uploadResult);

        // 測試檔案存在檢查
        console.log('🔍 測試檔案存在檢查...');
        const exists = await checkFileExists(testFileName);
        console.log('✅ 檔案存在檢查:', exists ? '檔案存在' : '檔案不存在');

        console.log('\n🎉 MinIO 測試完成！所有功能正常。');
        console.log('\n📋 接下來的步驟:');
        console.log('1. 啟動你的應用程式: npm run dev');
        console.log('2. 測試檔案上傳 API: POST /api/upload');
        console.log('3. 查看 MinIO Console: http://localhost:9001');

    } catch (error) {
        console.error('❌ MinIO 測試失敗:', error.message);
        console.log('\n🔧 請檢查以下設定:');
        console.log('1. MinIO 服務是否啟動');
        console.log('2. 環境變數是否正確設定');
        console.log('3. Bucket 是否已創建');
        console.log('4. 網路連線是否正常');
    }
}

// 執行測試
if (require.main === module) {
    testMinIOConnection();
}

module.exports = { testMinIOConnection }; 