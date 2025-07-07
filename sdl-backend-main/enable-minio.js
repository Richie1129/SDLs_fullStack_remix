const fs = require('fs');
const path = require('path');

console.log('🔄 啟用 MinIO 功能...');

// 需要修改的檔案和對應的替換規則
const filesToModify = [
    {
        file: 'index.js',
        replacements: [
            {
                search: '// const { uploadToMinio } = require(\'./middlewares/minioUploadMiddleware\'); // 引用 MinIO 中介軟體 - 暫時註解，等依賴項安裝後再啟用',
                replace: 'const { uploadToMinio } = require(\'./middlewares/minioUploadMiddleware\'); // 引用 MinIO 中介軟體'
            },
            {
                search: '// 檔案上傳路由 (暫時使用原版本，等 MinIO 依賴安裝後再啟用)\napp.post(\'/api/upload\', upload.array(\'files\', 10), (req, res) => {\n    console.log(\'Uploaded files:\', req.files);\n    try {\n        if (!req.files || req.files.length === 0) {\n            return res.status(400).json({ message: \'No files uploaded\' });\n        }\n\n        const files = req.files.map((file) => ({\n            url: `/daily_file/${file.filename}`,\n            originalName: file.originalname,\n            mimeType: file.mimetype,\n        }));\n\n        res.status(200).json({ files });\n    } catch (error) {\n        console.error(\'檔案上傳失敗:\', error);\n        res.status(500).json({ message: \'檔案上傳失敗\', error: error.message });\n    }\n});',
                replace: '// 檔案上傳路由 - 使用 MinIO\napp.post(\'/api/upload\', uploadToMinio(\'files\', 10), (req, res) => {\n    console.log(\'MinIO uploaded files:\', req.uploadedFiles);\n    try {\n        if (!req.uploadedFiles || req.uploadedFiles.length === 0) {\n            return res.status(400).json({ message: \'No files uploaded\' });\n        }\n\n        const files = req.uploadedFiles.map((file) => ({\n            url: file.url,\n            fileName: file.fileName,\n            originalName: file.originalName,\n            mimeType: file.mimeType,\n            size: file.size\n        }));\n\n        res.status(200).json({ \n            message: \'檔案上傳成功\',\n            files \n        });\n    } catch (error) {\n        console.error(\'檔案上傳失敗:\', error);\n        res.status(500).json({ message: \'檔案上傳失敗\', error: error.message });\n    }\n});'
            },
            {
                search: '// app.use(\'/api/file\', require(\'./routes/file\'));  // MinIO 檔案管理路由 - 暫時註解，等依賴項安裝後再啟用',
                replace: 'app.use(\'/api/file\', require(\'./routes/file\'));  // MinIO 檔案管理路由'
            }
        ]
    },
    {
        file: 'routes/daily.js',
        replacements: [
            {
                search: '// const { uploadToMinio, uploadSingleToMinio } = require(\'../middlewares/minioUploadMiddleware\'); // 暫時註解\nconst { upload } = require(\'../middlewares/uploadMiddleware\'); // 使用原版本',
                replace: 'const { uploadToMinio, uploadSingleToMinio } = require(\'../middlewares/minioUploadMiddleware\');\n// const { upload } = require(\'../middlewares/uploadMiddleware\'); // 原版本 - 暫時註解'
            },
            {
                search: '// 暫時使用原來的 upload 中介軟體\nrouter.post(\'/\', upload.array("attachFile"), controller.createPersonalDaily);\nrouter.post(\'/team\', upload.array("attachFile"), controller.createTeamDaily);\nrouter.put(\'/:id\', controller.updatePersonalDaily);\nrouter.put(\'/team/:id\', controller.updateTeamDaily);',
                replace: '// 使用 MinIO 中介軟體\nrouter.post(\'/\', uploadToMinio(\'attachFile\'), controller.createPersonalDaily);\nrouter.post(\'/team\', uploadToMinio(\'attachFile\'), controller.createTeamDaily);\nrouter.put(\'/personal/:id\', uploadSingleToMinio(\'attachFile\'), controller.updatePersonalDaily);\nrouter.put(\'/team/:id\', uploadSingleToMinio(\'attachFile\'), controller.updateTeamDaily);'
            }
        ]
    },
    {
        file: 'routes/submit.js',
        replacements: [
            {
                search: '// const { uploadToMinio, uploadSingleToMinio } = require(\'../middlewares/minioUploadMiddleware\'); // 暫時註解\nconst { upload } = require(\'../middlewares/uploadMiddleware\'); // 使用原版本',
                replace: 'const { uploadToMinio, uploadSingleToMinio } = require(\'../middlewares/minioUploadMiddleware\');\n// const { upload } = require(\'../middlewares/uploadMiddleware\'); // 原版本 - 暫時註解'
            },
            {
                search: '// 暫時使用原來的 upload 中介軟體\nrouter.post(\'/\', upload.array("attachFile"), controller.createSubmit);\nrouter.get(\'/\', controller.getAllSubmit);\nrouter.get(\'/:submitId\', controller.getSubmit);\nrouter.put(\'/:submitId\', upload.array("attachFile"), controller.updateSubmit);\nrouter.get(\'/:submitId/changes\', controller.getSubmitChangeLogs);',
                replace: '// 使用 MinIO 中介軟體\nrouter.post(\'/\', uploadToMinio(\'attachFile\'), controller.createSubmit);\nrouter.get(\'/\', controller.getAllSubmit);\nrouter.get(\'/:submitId\', controller.getSubmit);\nrouter.put(\'/:submitId\', uploadSingleToMinio(\'attachFile\'), controller.updateSubmit);\nrouter.get(\'/:submitId/changes\', controller.getSubmitChangeLogs);'
            }
        ]
    }
];

let allSuccess = true;

filesToModify.forEach(({ file, replacements }) => {
    const filePath = path.join(__dirname, file);
    
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;
        
        replacements.forEach(({ search, replace }) => {
            if (content.includes(search)) {
                content = content.replace(search, replace);
                modified = true;
                console.log(`✅ 已修改 ${file}`);
            }
        });
        
        if (modified) {
            fs.writeFileSync(filePath, content, 'utf8');
        } else {
            console.log(`⚠️  ${file} 無需修改或已是最新版本`);
        }
        
    } catch (error) {
        console.error(`❌ 修改 ${file} 失敗:`, error.message);
        allSuccess = false;
    }
});

if (allSuccess) {
    console.log('\n🎉 MinIO 功能已成功啟用！');
    console.log('\n📋 接下來的步驟:');
    console.log('1. 確保 MinIO 服務正在運行');
    console.log('2. 確保已創建 sdl-files bucket');
    console.log('3. 重啟你的應用程式: npm run dev');
    console.log('4. 測試檔案上傳功能');
} else {
    console.log('\n❌ 部分檔案修改失敗，請手動檢查');
}

console.log('\n📖 查看完整說明: cat MINIO_SETUP.md'); 