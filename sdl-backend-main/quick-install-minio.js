const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 快速安裝 MinIO 依賴項...');

try {
    // 檢查當前目錄的 package.json
    const packageJsonPath = path.join(__dirname, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
        console.error('❌ 找不到 package.json 文件');
        process.exit(1);
    }

    // 讀取 package.json
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // 檢查是否已經安裝了 MinIO 依賴項
    const requiredDeps = ['@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner', 'winston'];
    const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies[dep]);
    
    if (missingDeps.length === 0) {
        console.log('✅ 所有 MinIO 依賴項已安裝');
        return;
    }
    
    console.log('📦 安裝缺少的依賴項:', missingDeps);
    
    // 嘗試不同的安裝方法
    const installCommands = [
        'npm install ' + missingDeps.join(' '),
        'npm install --no-optional ' + missingDeps.join(' '),
        'npm install --legacy-peer-deps ' + missingDeps.join(' ')
    ];
    
    let success = false;
    
    for (const command of installCommands) {
        try {
            console.log(`🔄 嘗試執行: ${command}`);
            execSync(command, { stdio: 'inherit', cwd: __dirname });
            success = true;
            break;
        } catch (error) {
            console.log(`⚠️ 命令失敗，嘗試下一種方法...`);
        }
    }
    
    if (!success) {
        console.log('\n❌ 自動安裝失敗，請手動執行以下命令之一:');
        console.log('方法 1: npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner winston');
        console.log('方法 2: sudo npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner winston');
        console.log('方法 3: npm install --no-optional @aws-sdk/client-s3 @aws-sdk/s3-request-presigner winston');
        
        console.log('\n📖 完整設置指南:');
        console.log('1. 安裝依賴項 (上述命令之一)');
        console.log('2. 啟動 MinIO: docker run -d --name minio-dev -p 9000:9000 -p 9001:9001 -e "MINIO_ROOT_USER=minioadmin" -e "MINIO_ROOT_PASSWORD=minioadmin" minio/minio server /data --console-address ":9001"');
        console.log('3. 訪問 https://science.sdlswuret.com:9001 創建 sdl-files bucket');
        console.log('4. 重啟應用程式: npm run dev');
        
        process.exit(1);
    }
    
    console.log('\n✅ MinIO 依賴項安裝成功！');
    
    // 更新 package.json 確保版本正確
    const updatedPackageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    console.log('\n📋 已安裝的 MinIO 相關套件:');
    requiredDeps.forEach(dep => {
        if (updatedPackageJson.dependencies[dep]) {
            console.log(`  ✓ ${dep}: ${updatedPackageJson.dependencies[dep]}`);
        }
    });
    
    console.log('\n🎉 安裝完成！');
    console.log('\n📋 接下來的步驟:');
    console.log('1. 啟動 MinIO 服務 (如果尚未啟動):');
    console.log('   docker run -d --name minio-dev -p 9000:9000 -p 9001:9001 \\');
    console.log('     -e "MINIO_ROOT_USER=minioadmin" -e "MINIO_ROOT_PASSWORD=minioadmin" \\');
    console.log('     minio/minio server /data --console-address ":9001"');
    console.log('');
    console.log('2. 訪問 MinIO Console: https://science.sdlswuret.com:9001');
    console.log('   使用 minioadmin/minioadmin 登入');
    console.log('');
    console.log('3. 創建名為 "sdl-files" 的 bucket');
    console.log('');
    console.log('4. 測試連線: npm run test-minio');
    console.log('');
    console.log('5. 重啟應用程式: npm run dev');
    console.log('');
    console.log('現在上傳檔案時會在 console 顯示詳細的 MinIO 操作日誌！');
    
} catch (error) {
    console.error('❌ 安裝過程中發生錯誤:', error.message);
    process.exit(1);
} 