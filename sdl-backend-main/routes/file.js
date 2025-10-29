const express = require('express');
const router = express.Router();
const { getPresignedDownloadUrl, deleteFileFromMinio, fileExistsInMinio } = require('../config/minio');

/**
 * 獲取圖片預簽名 URL (用於前端顯示)
 * GET /api/file/image/:fileName
 */
router.get('/image/:fileName', async (req, res) => {
    console.log('=== 🖼️ MinIO 圖片顯示請求 ===');
    const { fileName } = req.params;
    console.log('請求圖片:', fileName);
    
    try {
        // 檢查檔案是否存在
        const exists = await fileExistsInMinio(fileName);
        if (!exists) {
            console.log('❌ 圖片不存在:', fileName);
            return res.status(404).json({ 
                message: '圖片不存在',
                fileName 
            });
        }

        // 直接從 MinIO 下載圖片並返回
        const { downloadFileFromMinio } = require('../config/minio');
        const imageBuffer = await downloadFileFromMinio(fileName);
        
        // 根據檔案副檔名設置 Content-Type
        const ext = fileName.toLowerCase().split('.').pop();
        const mimeTypes = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'svg': 'image/svg+xml'
        };
        const contentType = mimeTypes[ext] || 'image/jpeg';
        
        console.log('✅ 圖片下載成功');
        console.log('圖片大小:', imageBuffer.length, 'bytes');
        console.log('Content-Type:', contentType);
        console.log('========================');
        
        // 設置響應頭並返回圖片
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=3600'); // 1小時緩存
        res.send(imageBuffer);
        
    } catch (error) {
        console.error('❌ 獲取圖片失敗:', error);
        res.status(500).json({ 
            message: '獲取圖片失敗', 
            error: error.message 
        });
    }
});

/**
 * 生成預簽名下載 URL
 * GET /api/file/download/:fileName
 */
router.get('/download/:fileName', async (req, res) => {
    console.log('=== 📥 MinIO 檔案下載請求 ===');
    const { fileName } = req.params;
    console.log('請求下載檔案:', fileName);
    
    try {
        // 檢查檔案是否存在
        const exists = await fileExistsInMinio(fileName);
        if (!exists) {
            console.log('❌ 檔案不存在:', fileName);
            return res.status(404).json({ 
                message: '檔案不存在',
                fileName 
            });
        }

        // 生成預簽名下載 URL (1小時有效)
        const downloadUrl = await getPresignedDownloadUrl(fileName, 3600);
        
        console.log('✅ 生成預簽名 URL 成功');
        console.log('下載 URL:', downloadUrl);
        console.log('========================');
        
        res.json({
            message: '預簽名 URL 生成成功',
            fileName,
            downloadUrl,
            expiresIn: 3600
        });
        
    } catch (error) {
        console.error('❌ 生成下載 URL 失敗:', error);
        res.status(500).json({ 
            message: '生成下載 URL 失敗', 
            error: error.message 
        });
    }
});

/**
 * 直接下載檔案
 * GET /api/file/direct/:fileName
 */
router.get('/direct/:fileName', async (req, res) => {
    console.log('=== 📥 MinIO 直接下載請求 ===');
    let { fileName } = req.params;

    // URL 解碼：處理編碼後的檔案名（%20, %E2%80%99 等）
    try {
        fileName = decodeURIComponent(fileName);
    } catch (e) {
        console.warn('⚠️ 檔案名解碼失敗，使用原始名稱:', fileName);
    }

    console.log('直接下載檔案:', fileName);

    try {
        const { downloadFileFromMinio } = require('../config/minio');

        // 檢查檔案是否存在
        const exists = await fileExistsInMinio(fileName);
        if (!exists) {
            console.log('❌ 檔案不存在:', fileName);
            return res.status(404).json({
                message: '檔案不存在',
                fileName
            });
        }

        // 下載檔案
        const fileBuffer = await downloadFileFromMinio(fileName);

        // 提取原始檔案名稱（移除時間戳前綴）
        const originalFileName = fileName.replace(/^\d+-[a-z0-9]+-/, '');

        // RFC 5987 編碼：支援中文和特殊字符
        const encodedFileName = encodeURIComponent(originalFileName)
            .replace(/['()]/g, escape) // 額外處理單引號和括號
            .replace(/\*/g, '%2A');

        // 設置響應頭（使用純 ASCII 的 filename*）
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFileName}`);
        res.setHeader('Content-Type', 'application/octet-stream');
        
        console.log('✅ 檔案下載成功:', fileName);
        console.log('檔案大小:', fileBuffer.length, 'bytes');
        console.log('========================');
        
        res.send(fileBuffer);
        
    } catch (error) {
        console.error('❌ 檔案下載失敗:', error);
        res.status(500).json({ 
            message: '檔案下載失敗', 
            error: error.message 
        });
    }
});

/**
 * 刪除單個檔案
 * DELETE /api/file/:fileName
 */
router.delete('/:fileName', async (req, res) => {
    console.log('=== 🗑️ MinIO 檔案刪除請求 ===');
    const { fileName } = req.params;
    console.log('刪除檔案:', fileName);
    
    try {
        // 檢查檔案是否存在
        const exists = await fileExistsInMinio(fileName);
        if (!exists) {
            console.log('❌ 檔案不存在:', fileName);
            return res.status(404).json({ 
                message: '檔案不存在',
                fileName 
            });
        }

        // 刪除檔案
        await deleteFileFromMinio(fileName);
        
        console.log('✅ 檔案刪除成功:', fileName);
        console.log('========================');
        
        res.json({
            message: '檔案刪除成功',
            fileName
        });
        
    } catch (error) {
        console.error('❌ 檔案刪除失敗:', error);
        res.status(500).json({ 
            message: '檔案刪除失敗', 
            error: error.message 
        });
    }
});

/**
 * 批量刪除檔案
 * POST /api/file/batch-delete
 * Body: { fileNames: ['file1.jpg', 'file2.pdf'] }
 */
router.post('/batch-delete', async (req, res) => {
    console.log('=== 🗑️ MinIO 批量檔案刪除請求 ===');
    const { fileNames } = req.body;
    
    if (!fileNames || !Array.isArray(fileNames)) {
        return res.status(400).json({ 
            message: '請提供有效的檔案名稱陣列' 
        });
    }
    
    console.log('批量刪除檔案:', fileNames);
    
    try {
        const results = [];
        
        for (const fileName of fileNames) {
            try {
                // 檢查檔案是否存在
                const exists = await fileExistsInMinio(fileName);
                if (!exists) {
                    results.push({
                        fileName,
                        success: false,
                        message: '檔案不存在'
                    });
                    continue;
                }

                // 刪除檔案
                await deleteFileFromMinio(fileName);
                results.push({
                    fileName,
                    success: true,
                    message: '刪除成功'
                });
                
            } catch (error) {
                results.push({
                    fileName,
                    success: false,
                    message: error.message
                });
            }
        }
        
        const successCount = results.filter(r => r.success).length;
        const failCount = results.length - successCount;
        
        console.log(`✅ 批量刪除完成: ${successCount} 成功, ${failCount} 失敗`);
        console.log('刪除結果:', results);
        console.log('========================');
        
        res.status(200).json({
            message: `批量刪除完成`,
            summary: {
                total: results.length,
                success: successCount,
                failed: failCount
            },
            results
        });
        
    } catch (error) {
        console.error('❌ 批量刪除失敗:', error);
        res.status(500).json({ 
            message: '批量刪除失敗', 
            error: error.message 
        });
    }
});

/**
 * 檢查檔案是否存在
 * HEAD /api/file/:fileName
 */
router.head('/:fileName', async (req, res) => {
    const { fileName } = req.params;
    
    try {
        const exists = await fileExistsInMinio(fileName);
        
        if (exists) {
            res.status(200).end();
        } else {
            res.status(404).end();
        }
        
    } catch (error) {
        console.error('❌ 檢查檔案存在失敗:', error);
        res.status(500).end();
    }
});

module.exports = router; 