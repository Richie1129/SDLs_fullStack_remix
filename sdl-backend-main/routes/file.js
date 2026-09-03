const express = require('express');
const router = express.Router();
const { deleteFileFromMinio, fileExistsInMinio, getFileStreamFromMinio } = require('../config/minio');
const { validateToken } = require('../middlewares/AuthMiddleware');
const { logAudit } = require('../services/auditService');
const { canReadFile, canDeleteFile, onFileDeleted } = require('../utils/fileAccess');

/**
 * fileName 安全驗證：防止路徑遍歷攻擊
 * 拒絕包含 ..、/ 或 \ 的檔案名稱
 */
function isSafeFileName(name) {
    if (!name || typeof name !== 'string') return false;
    if (name.includes('..')) return false;
    if (name.includes('/')) return false;
    if (name.includes('\\')) return false;
    return true;
}

/**
 * 把 MinIO stream 接到 HTTP 回應（B6：不再把整個檔案讀進記憶體）
 *
 * - header 送出前出錯：回 JSON 錯誤
 * - header 送出後出錯：只能中斷連線（res.destroy），不能再改狀態碼
 * - 使用者中途取消下載：銷毀來源 stream，釋放與 MinIO 的連線
 */
function pipeMinioStream(req, res, source, { contentType, contentLength, etag, lastModified, cacheControl, contentDisposition }) {
    res.setHeader('Content-Type', contentType);
    if (typeof contentLength === 'number') res.setHeader('Content-Length', String(contentLength));
    if (etag) res.setHeader('ETag', etag);
    if (lastModified instanceof Date && !Number.isNaN(lastModified.getTime())) {
        res.setHeader('Last-Modified', lastModified.toUTCString());
    }
    if (cacheControl) res.setHeader('Cache-Control', cacheControl);
    if (contentDisposition) res.setHeader('Content-Disposition', contentDisposition);

    let finished = false;
    const onClientGone = () => {
        if (finished) return;
        finished = true;
        if (typeof source.destroy === 'function') source.destroy();
    };
    res.on('close', onClientGone);

    source.on('error', (err) => {
        console.error('MinIO stream 讀取錯誤:', err.message);
        if (finished) return;
        finished = true;
        if (res.headersSent) {
            res.destroy(err);
        } else {
            res.status(500).json({ message: '檔案讀取失敗' });
        }
    });
    source.on('end', () => { finished = true; });

    source.pipe(res);
}

/**
 * 獲取圖片預簽名 URL (用於前端顯示)
 * GET /api/file/image/:fileName
 */
router.get('/image/:fileName', validateToken, async (req, res) => {
    const { fileName } = req.params;

    if (!isSafeFileName(fileName)) {
        return res.status(400).json({ message: '無效的檔案名稱' });
    }

    try {
        // 擁有權檢查放在任何 MinIO 存取之前（含 304 路徑）
        if (!(await canReadFile(req.userId, fileName))) {
            return res.status(403).json({ message: '無權存取此檔案', code: 'FILE_ACCESS_DENIED' });
        }

        // 條件請求：瀏覽器帶 If-None-Match 且物件未變更時直接 304，不傳內容
        const ifNoneMatch = req.get('If-None-Match');
        const result = await getFileStreamFromMinio(fileName, { ifNoneMatch });
        if (result.notModified) {
            if (result.etag) res.setHeader('ETag', result.etag);
            res.setHeader('Cache-Control', 'private, max-age=3600');
            return res.status(304).end();
        }

        // SVG 不以 inline 方式提供（防止儲存型 XSS）
        const ext = fileName.toLowerCase().split('.').pop();
        const mimeTypes = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
        };
        const contentType = mimeTypes[ext] || 'application/octet-stream';

        pipeMinioStream(req, res, result.stream, {
            contentType,
            contentLength: result.contentLength,
            etag: result.etag,
            lastModified: result.lastModified,
            // 需要 token 才能取得的資源：private，避免 Cloudflare 等共享快取存下來
            cacheControl: 'private, max-age=3600',
            // 若副檔名不在白名單中（含 SVG），強制以附件下載
            contentDisposition: mimeTypes[ext] ? undefined : `attachment; filename="${encodeURIComponent(fileName)}"`,
        });

    } catch (error) {
        if (error.code === 'NOT_FOUND') {
            return res.status(404).json({ message: '圖片不存在' });
        }
        console.error('獲取圖片失敗:', error.message);
        res.status(500).json({ message: '獲取圖片失敗' });
    }
});

/**
 * 直接下載檔案
 * GET /api/file/direct/:fileName
 */
router.get('/direct/:fileName', validateToken, async (req, res) => {
    let { fileName } = req.params;

    // URL 解碼：處理編碼後的檔案名（%20, %E2%80%99 等）
    try {
        fileName = decodeURIComponent(fileName);
    } catch (e) {
        return res.status(400).json({ message: '無效的檔案名稱編碼' });
    }

    // 解碼後再次驗證防止雙重編碼路徑遍歷攻擊
    if (!isSafeFileName(fileName)) {
        return res.status(400).json({ message: '無效的檔案名稱' });
    }

    try {
        if (!(await canReadFile(req.userId, fileName))) {
            return res.status(403).json({ message: '無權存取此檔案', code: 'FILE_ACCESS_DENIED' });
        }

        const result = await getFileStreamFromMinio(fileName);

        // 提取原始檔案名稱（移除時間戳前綴）
        const originalFileName = fileName.replace(/^\d+-[a-z0-9]+-/, '');

        // RFC 5987 編碼：支援中文和特殊字符
        const encodedFileName = encodeURIComponent(originalFileName)
            .replace(/['()]/g, escape)
            .replace(/\*/g, '%2A');

        pipeMinioStream(req, res, result.stream, {
            contentType: 'application/octet-stream',
            contentLength: result.contentLength,
            etag: result.etag,
            lastModified: result.lastModified,
            cacheControl: 'private, no-cache',
            contentDisposition: `attachment; filename*=UTF-8''${encodedFileName}`,
        });

    } catch (error) {
        if (error.code === 'NOT_FOUND') {
            return res.status(404).json({ message: '檔案不存在' });
        }
        console.error('檔案下載失敗:', error.message);
        res.status(500).json({ message: '檔案下載失敗' });
    }
});

/**
 * 刪除單個檔案
 * DELETE /api/file/:fileName
 */
router.delete('/:fileName', validateToken, async (req, res) => {
    const { fileName } = req.params;

    if (!isSafeFileName(fileName)) {
        return res.status(400).json({ message: '無效的檔案名稱' });
    }

    try {
        // 擁有權檢查（角色一律查 DB，不採信 JWT）
        const hasAccess = await canDeleteFile(req.userId, fileName);
        if (!hasAccess) {
            return res.status(403).json({ message: '無權刪除此檔案', code: 'FILE_ACCESS_DENIED' });
        }

        const exists = await fileExistsInMinio(fileName);
        if (!exists) {
            return res.status(404).json({ message: '檔案不存在' });
        }

        await deleteFileFromMinio(fileName);
        await onFileDeleted(fileName);

        res.json({
            message: '檔案刪除成功',
            fileName
        });

        // 審計追蹤：檔案刪除
        logAudit(req, {
            action: 'FILE_DELETE',
            targetType: 'File',
            targetId: fileName,
            metadata: {
                fileName,
                fileUrl: fileName,
                deletedAt: new Date()
            }
        }).catch(err => {
            console.error('[Audit] 記錄 FILE_DELETE 失敗:', err.message);
        });

    } catch (error) {
        console.error('檔案刪除失敗:', error.message);
        res.status(500).json({ message: '檔案刪除失敗' });
    }
});

/**
 * 批量刪除檔案
 * POST /api/file/batch-delete
 * Body: { fileNames: ['file1.jpg', 'file2.pdf'] }
 */
router.post('/batch-delete', validateToken, async (req, res) => {
    const { fileNames } = req.body;

    if (!fileNames || !Array.isArray(fileNames)) {
        return res.status(400).json({ message: '請提供有效的檔案名稱陣列' });
    }

    // 過濾非法檔案名稱
    const safeFileNames = fileNames.filter(isSafeFileName);
    if (safeFileNames.length !== fileNames.length) {
        return res.status(400).json({ message: '包含無效的檔案名稱' });
    }

    try {
        // H4: 批量刪除也需驗證所有權
        for (const fileName of safeFileNames) {
            const hasAccess = await canDeleteFile(req.userId, fileName);
            if (!hasAccess) {
                return res.status(403).json({ message: `無權刪除檔案: ${fileName}`, code: 'FILE_ACCESS_DENIED' });
            }
        }

        const results = [];

        for (const fileName of safeFileNames) {
            try {
                const exists = await fileExistsInMinio(fileName);
                if (!exists) {
                    results.push({ fileName, success: false, message: '檔案不存在' });
                    continue;
                }

                await deleteFileFromMinio(fileName);
                await onFileDeleted(fileName);
                results.push({ fileName, success: true, message: '刪除成功' });

            } catch (error) {
                results.push({ fileName, success: false, message: '刪除失敗' });
            }
        }

        const successCount = results.filter(r => r.success).length;
        const failCount = results.length - successCount;

        res.status(200).json({
            message: '批量刪除完成',
            summary: { total: results.length, success: successCount, failed: failCount },
            results
        });

        // 審計追蹤：批量檔案刪除
        const successFiles = results.filter(r => r.success).map(r => r.fileName);
        if (successFiles.length > 0) {
            logAudit(req, {
                action: 'FILE_BATCH_DELETE',
                targetType: 'File',
                targetId: null,
                metadata: {
                    totalRequested: fileNames.length,
                    successCount,
                    failCount,
                    successFiles: successFiles.slice(0, 10),
                    hasMore: successFiles.length > 10,
                    deletedAt: new Date()
                }
            }).catch(err => {
                console.error('[Audit] 記錄 FILE_BATCH_DELETE 失敗:', err.message);
            });
        }

    } catch (error) {
        console.error('批量刪除失敗:', error.message);
        res.status(500).json({ message: '批量刪除失敗' });
    }
});

/**
 * 檢查檔案是否存在
 * HEAD /api/file/:fileName
 */
router.head('/:fileName', validateToken, async (req, res) => {
    const { fileName } = req.params;

    if (!isSafeFileName(fileName)) {
        return res.status(400).end();
    }

    try {
        if (!(await canReadFile(req.userId, fileName))) {
            return res.status(403).end();
        }
        const exists = await fileExistsInMinio(fileName);
        res.status(exists ? 200 : 404).end();
    } catch (error) {
        console.error('檢查檔案存在失敗:', error.message);
        res.status(500).end();
    }
});

module.exports = router;
