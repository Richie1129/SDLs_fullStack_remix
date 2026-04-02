const multer = require('multer');
const fs = require('fs');
const os = require('os');
const { uploadFileToMinio } = require('../config/minio');

// 使用磁碟暫存，避免大檔案佔滿 Node.js 記憶體導致 OOM
const storage = multer.diskStorage({
    destination: os.tmpdir(),
    filename: (req, file, cb) => {
        cb(null, `upload-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024  // 100MB 限制
    },
    fileFilter: (req, file, cb) => {
        // 支援的檔案類型
        const allowedTypes = [
            // 圖片（SVG 已移除：可包含內嵌 JavaScript，構成 XSS 攻擊向量）
            'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
            // 文件
            'application/pdf', 'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            // 試算表
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            // 簡報
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            // 開放文件格式
            'application/vnd.oasis.opendocument.text',           // ODT
            'application/vnd.oasis.opendocument.spreadsheet',    // ODS
            'application/vnd.oasis.opendocument.presentation',   // ODP
            // 純文字
            'text/plain', 'text/csv',
            // 影片
            'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm',
            // 音訊
            'audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/x-m4a',
            // 壓縮檔
            'application/zip', 'application/x-zip-compressed',
            'application/x-rar-compressed', 'application/vnd.rar'
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
                // 清理已寫入的暫存檔案
                if (req.files) req.files.forEach(f => fs.unlink(f.path, () => {}));
                if (req.file) fs.unlink(req.file.path, () => {});
                console.error('Multer 錯誤:', err);
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        message: '檔案過大 (超過 100MB)',
                        code: 'LIMIT_FILE_SIZE'
                    });
                }
                return res.status(400).json({
                    message: '檔案上傳失敗',
                    error: err.message
                });
            }

            if (!req.files || req.files.length === 0) {
                return next();
            }

            try {
                const uploadPromises = req.files.map(async (file) => {
                    const originalFileName = Buffer.from(file.originalname, 'latin1').toString('utf8');
                    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${originalFileName}`;

                    // 用 stream 上傳到 MinIO，不將整個檔案讀入記憶體
                    const fileStream = fs.createReadStream(file.path);
                    try {
                        const result = await uploadFileToMinio(
                            fileStream,
                            uniqueFileName,
                            file.mimetype,
                            file.size
                        );

                        return {
                            originalName: originalFileName,
                            fileName: uniqueFileName,
                            mimeType: file.mimetype,
                            size: file.size,
                            url: result.url,
                            etag: result.etag
                        };
                    } finally {
                        fileStream.destroy();
                        fs.unlink(file.path, () => {});
                    }
                });

                const uploadedFiles = await Promise.all(uploadPromises);

                req.uploadedFiles = uploadedFiles;
                req.minioFiles = uploadedFiles;

                console.log('所有檔案上傳到 MinIO 成功:', uploadedFiles.map(f => f.fileName));
                next();

            } catch (error) {
                // 清理所有暫存檔案
                req.files.forEach(f => fs.unlink(f.path, () => {}));
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
                if (req.file) fs.unlink(req.file.path, () => {});
                console.error('Multer 錯誤:', err);
                return res.status(400).json({
                    message: '檔案上傳失敗',
                    error: err.message
                });
            }

            if (!req.file) {
                return next();
            }

            try {
                const originalFileName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
                const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${originalFileName}`;

                const fileStream = fs.createReadStream(req.file.path);
                let result;
                try {
                    result = await uploadFileToMinio(
                        fileStream,
                        uniqueFileName,
                        req.file.mimetype,
                        req.file.size
                    );
                } finally {
                    fileStream.destroy();
                    fs.unlink(req.file.path, () => {});
                }

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