const multer = require('multer');
const fs = require('fs');
const os = require('os');
const FileType = require('file-type');
const { uploadFileToMinio } = require('../config/minio');

// 支援的檔案類型（client-declared 與 magic bytes 偵測共用同一份白名單）
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

// 文字類檔案無 magic bytes 可偵測，屬低風險類型，只靠 client header
const TEXT_MIME_TYPES = new Set(['text/plain', 'text/csv']);

// MIME 別名正規化 —— file-type 偵測值可能與 client 送來的別名不同，需對齊白名單
const MIME_ALIASES = {
    'application/x-zip-compressed': 'application/zip',
    'application/vnd.rar': 'application/x-rar-compressed',
    'audio/x-m4a': 'audio/mp4',
};

const normalizeMime = (mime) => MIME_ALIASES[mime] || mime;
const isAllowedMime = (mime) => allowedTypes.includes(mime) || allowedTypes.includes(normalizeMime(mime));

/**
 * 以 magic bytes 偵測真實 MIME type，並驗證是否在白名單
 * 回傳 { ok: true, mime } 或 { ok: false, error }
 */
async function verifyFileMagicBytes(file) {
    if (TEXT_MIME_TYPES.has(file.mimetype)) {
        return { ok: true, mime: file.mimetype };
    }

    let detected;
    try {
        detected = await FileType.fromFile(file.path);
    } catch (err) {
        return { ok: false, error: `無法讀取檔案內容進行驗證` };
    }

    if (!detected) {
        return { ok: false, error: `無法識別檔案類型（檔案內容與宣告類型不符）` };
    }

    if (!isAllowedMime(detected.mime)) {
        return { ok: false, error: `偵測到不支援的檔案類型: ${detected.mime}` };
    }

    return { ok: true, mime: detected.mime };
}

function cleanupFiles(files) {
    if (!files) return;
    const arr = Array.isArray(files) ? files : [files];
    arr.forEach(f => f && f.path && fs.unlink(f.path, () => {}));
}

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
        // 第一層：以 client 宣告的 mimetype 做快速白名單過濾
        // 第二層（magic bytes 驗證）在檔案完整寫入磁碟後於 uploadHandler 內執行
        if (isAllowedMime(file.mimetype)) {
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

            // Magic bytes 驗證 —— 防止客戶端偽造 Content-Type header
            // 必須在 MinIO 上傳之前完成，任一驗證失敗都清光整批
            for (const file of req.files) {
                const verdict = await verifyFileMagicBytes(file);
                if (!verdict.ok) {
                    cleanupFiles(req.files);
                    console.warn('Magic bytes 驗證失敗:', {
                        file: file.originalname,
                        clientMime: file.mimetype,
                        reason: verdict.error
                    });
                    return res.status(400).json({
                        message: '檔案類型驗證失敗',
                        error: verdict.error
                    });
                }
                // 覆寫為偵測結果，確保 MinIO 儲存與 DB 紀錄皆以真實 MIME 為準
                file.verifiedMime = verdict.mime;
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
                            file.verifiedMime,
                            file.size
                        );

                        return {
                            originalName: originalFileName,
                            fileName: uniqueFileName,
                            mimeType: file.verifiedMime,
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

            // Magic bytes 驗證
            const verdict = await verifyFileMagicBytes(req.file);
            if (!verdict.ok) {
                cleanupFiles(req.file);
                console.warn('Magic bytes 驗證失敗:', {
                    file: req.file.originalname,
                    clientMime: req.file.mimetype,
                    reason: verdict.error
                });
                return res.status(400).json({
                    message: '檔案類型驗證失敗',
                    error: verdict.error
                });
            }
            const verifiedMime = verdict.mime;

            try {
                const originalFileName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
                const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${originalFileName}`;

                const fileStream = fs.createReadStream(req.file.path);
                let result;
                try {
                    result = await uploadFileToMinio(
                        fileStream,
                        uniqueFileName,
                        verifiedMime,
                        req.file.size
                    );
                } finally {
                    fileStream.destroy();
                    fs.unlink(req.file.path, () => {});
                }

                req.uploadedFile = {
                    originalName: originalFileName,
                    fileName: uniqueFileName,
                    mimeType: verifiedMime,
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