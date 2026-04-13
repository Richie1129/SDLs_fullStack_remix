const express = require('express');
const router = express.Router();
const { getPresignedDownloadUrl, deleteFileFromMinio, fileExistsInMinio } = require('../config/minio');
const { validateToken } = require('../middlewares/AuthMiddleware');
const { logAudit } = require('../services/auditService');
const Submit = require('../models/submit');
const CommentAttachment = require('../models/comment_attachment');
const ProjectCommentAttachment = require('../models/project_comment_attachment');
const User_project = require('../models/user_project');
const sequelize = require('../util/database');
const { QueryTypes } = require('sequelize');

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
 * 獲取圖片預簽名 URL (用於前端顯示)
 * GET /api/file/image/:fileName
 */
router.get('/image/:fileName', validateToken, async (req, res) => {
    const { fileName } = req.params;

    if (!isSafeFileName(fileName)) {
        return res.status(400).json({ message: '無效的檔案名稱' });
    }

    try {
        const exists = await fileExistsInMinio(fileName);
        if (!exists) {
            return res.status(404).json({ message: '圖片不存在' });
        }

        const { downloadFileFromMinio } = require('../config/minio');
        const imageBuffer = await downloadFileFromMinio(fileName);

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

        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=3600');
        // 若副檔名不在白名單中（含 SVG），強制以附件下載
        if (!mimeTypes[ext]) {
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
        }
        res.send(imageBuffer);

    } catch (error) {
        console.error('獲取圖片失敗:', error.message);
        res.status(500).json({ message: '獲取圖片失敗' });
    }
});

/**
 * 生成預簽名下載 URL
 * GET /api/file/download/:fileName
 */
router.get('/download/:fileName', validateToken, async (req, res) => {
    const { fileName } = req.params;

    if (!isSafeFileName(fileName)) {
        return res.status(400).json({ message: '無效的檔案名稱' });
    }

    try {
        const exists = await fileExistsInMinio(fileName);
        if (!exists) {
            return res.status(404).json({ message: '檔案不存在' });
        }

        const downloadUrl = await getPresignedDownloadUrl(fileName, 3600);

        res.json({
            message: '預簽名 URL 生成成功',
            fileName,
            downloadUrl,
            expiresIn: 3600
        });

    } catch (error) {
        console.error('生成下載 URL 失敗:', error.message);
        res.status(500).json({ message: '生成下載 URL 失敗' });
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
        const { downloadFileFromMinio } = require('../config/minio');

        const exists = await fileExistsInMinio(fileName);
        if (!exists) {
            return res.status(404).json({ message: '檔案不存在' });
        }

        const fileBuffer = await downloadFileFromMinio(fileName);

        // 提取原始檔案名稱（移除時間戳前綴）
        const originalFileName = fileName.replace(/^\d+-[a-z0-9]+-/, '');

        // RFC 5987 編碼：支援中文和特殊字符
        const encodedFileName = encodeURIComponent(originalFileName)
            .replace(/['()]/g, escape)
            .replace(/\*/g, '%2A');

        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFileName}`);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.send(fileBuffer);

    } catch (error) {
        console.error('檔案下載失敗:', error.message);
        res.status(500).json({ message: '檔案下載失敗' });
    }
});

/**
 * H4: 驗證使用者是否有權刪除此檔案
 * 檢查檔案是否屬於使用者所在的專案
 */
async function verifyFileOwnership(userId, userRole, fileName) {
    // 查詢 Submit 中引用此檔案的記錄
    const submit = await Submit.findOne({
        where: { fileName },
        attributes: ['projectId', 'userId']
    });
    if (submit) {
        if (submit.userId === userId) return true;
        const membership = await User_project.findOne({
            where: { userId, projectId: submit.projectId }
        });
        return !!membership;
    }

    // 查詢 Task 的 files/images 陣列欄位中是否引用此檔案
    //
    // 為何不用 Sequelize 的 Op.contains：
    //   - files 欄位型別是 jsonb[]（不是 jsonb），@> 運算子要求「陣列元素完全相等」，
    //     而實際元素含 url/size/mimeType 等欄位，`@> [{fileName}]` 永遠比不到。
    //   - images 欄位存的是完整 URL 路徑（如 `/api/file/image/xxx.jpg`），直接用
    //     純 fileName 比對 text[] 也不會相等。
    //   - 正確做法是用 unnest 展開陣列後逐一比對 JSON 屬性 / URL 後綴。
    const taskRows = await sequelize.query(
        `
        SELECT k."projectId" AS "projectId"
        FROM tasks t
        LEFT JOIN columns c ON c.id = t."columnId"
        LEFT JOIN kanbans k ON k.id = c."kanbanId"
        WHERE EXISTS (
            SELECT 1 FROM unnest(t.files) AS f WHERE f->>'fileName' = :fileName
        )
        OR EXISTS (
            SELECT 1 FROM unnest(t.images) AS img
            WHERE img = :fileName OR img LIKE :fileNameSuffix
        )
        LIMIT 1
        `,
        {
            replacements: { fileName, fileNameSuffix: `%/${fileName}` },
            type: QueryTypes.SELECT
        }
    );
    if (taskRows.length > 0) {
        const projectId = taskRows[0].projectId;
        if (!projectId) return false;
        const membership = await User_project.findOne({
            where: { userId, projectId }
        });
        return !!membership;
    }

    // 查詢 CommentAttachment / ProjectCommentAttachment
    const commentAtt = await CommentAttachment.findOne({
        where: { fileName },
        attributes: ['id']
    });
    if (commentAtt) return true;

    const projCommentAtt = await ProjectCommentAttachment.findOne({
        where: { fileName },
        attributes: ['id']
    });
    if (projCommentAtt) return true;

    // 孤立檔案 — 僅教師可刪除
    return userRole === 'teacher';
}

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
        // H4: 驗證檔案所有權
        const hasAccess = await verifyFileOwnership(req.userId, req.user?.role, fileName);
        if (!hasAccess) {
            return res.status(403).json({ message: '無權刪除此檔案' });
        }

        const exists = await fileExistsInMinio(fileName);
        if (!exists) {
            return res.status(404).json({ message: '檔案不存在' });
        }

        await deleteFileFromMinio(fileName);

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
            const hasAccess = await verifyFileOwnership(req.userId, req.user?.role, fileName);
            if (!hasAccess) {
                return res.status(403).json({ message: `無權刪除檔案: ${fileName}` });
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
        const exists = await fileExistsInMinio(fileName);
        res.status(exists ? 200 : 404).end();
    } catch (error) {
        console.error('檢查檔案存在失敗:', error.message);
        res.status(500).end();
    }
});

module.exports = router;
