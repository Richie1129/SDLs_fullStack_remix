const multer = require('multer');
const { uploadFileToMinio } = require('../config/minio');

// 使用記憶體儲存，不儲存到本地檔案系統
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024  // 100MB 限制
    },
    fileFilter: (req, file, cb) => {
        // 支援的檔案類型
        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf', 'application/msword', 
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/vnd.oasis.opendocument.text',           // ODT
            'application/vnd.oasis.opendocument.spreadsheet',    // ODS
            'application/vnd.oasis.opendocument.presentation',   // ODP
            'text/plain', 'text/csv'
        ];
        
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`不支援的檔案類型: ${file.mimetype}`));
        }
    },
});

// 包裝 multer 中介軟體以自動上傳到 MinIO
const uploadToMinio = (fieldName, maxCount = 10) => {
    return async (req, res, next) => {
        const uploadHandler = upload.array(fieldName, maxCount);
        
        uploadHandler(req, res, async (err) => {
            if (err) {
                console.error('Multer 錯誤:', err);
                return res.status(400).json({ 
                    message: '檔案上傳失敗', 
                    error: err.message 
                });
            }

            if (!req.files || req.files.length === 0) {
                return next(); // 沒有檔案時繼續處理
            }

            try {
                const uploadPromises = req.files.map(async (file) => {
                    // 生成唯一檔名
                    const originalFileName = Buffer.from(file.originalname, 'latin1').toString('utf8');
                    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${originalFileName}`;
                    
                    // 上傳到 MinIO
                    const result = await uploadFileToMinio(
                        file.buffer, 
                        uniqueFileName, 
                        file.mimetype
                    );
                    
                    return {
                        originalName: originalFileName,
                        fileName: uniqueFileName,
                        mimeType: file.mimetype,
                        size: file.size,
                        url: result.url,
                        etag: result.etag
                    };
                });

                // 等待所有檔案上傳完成
                const uploadedFiles = await Promise.all(uploadPromises);
                
                // 將結果添加到 req 物件
                req.uploadedFiles = uploadedFiles;
                req.minioFiles = uploadedFiles; // 向後相容
                
                console.log('所有檔案上傳到 MinIO 成功:', uploadedFiles.map(f => f.fileName));
                next();
                
            } catch (error) {
                console.error('MinIO 上傳失敗:', error);
                return res.status(500).json({ 
                    message: 'MinIO 上傳失敗', 
                    error: error.message 
                });
            }
        });
    };
};

// 單檔上傳中介軟體
const uploadSingleToMinio = (fieldName) => {
    return async (req, res, next) => {
        const uploadHandler = upload.single(fieldName);
        
        uploadHandler(req, res, async (err) => {
            if (err) {
                console.error('Multer 錯誤:', err);
                return res.status(400).json({ 
                    message: '檔案上傳失敗', 
                    error: err.message 
                });
            }

            if (!req.file) {
                return next(); // 沒有檔案時繼續處理
            }

            try {
                // 生成唯一檔名
                const originalFileName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
                const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${originalFileName}`;
                
                // 上傳到 MinIO
                const result = await uploadFileToMinio(
                    req.file.buffer, 
                    uniqueFileName, 
                    req.file.mimetype
                );
                
                // 將結果添加到 req 物件
                req.uploadedFile = {
                    originalName: originalFileName,
                    fileName: uniqueFileName,
                    mimeType: req.file.mimetype,
                    size: req.file.size,
                    url: result.url,
                    etag: result.etag
                };
                
                console.log('檔案上傳到 MinIO 成功:', uniqueFileName);
                next();
                
            } catch (error) {
                console.error('MinIO 上傳失敗:', error);
                return res.status(500).json({ 
                    message: 'MinIO 上傳失敗', 
                    error: error.message 
                });
            }
        });
    };
};

module.exports = {
    upload,
    uploadToMinio,
    uploadSingleToMinio
}; 