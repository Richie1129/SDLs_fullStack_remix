const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// 📦 MinIO 配置
const minioConfig = {
    endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
    publicEndpoint: process.env.MINIO_PUBLIC_ENDPOINT || 'http://localhost:9000', // 前端可訪問的地址
    accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    bucketName: process.env.MINIO_BUCKET_NAME || 'sdl-files',
    region: 'us-east-1', // MinIO 預設區域
};

console.log('🚀 MinIO 配置載入:', {
    endpoint: minioConfig.endpoint,
    accessKeyId: minioConfig.accessKeyId,
    bucketName: minioConfig.bucketName,
    secretAccessKey: '***' // 不顯示敏感資訊
});

// 創建 S3 客戶端連接 MinIO
const s3Client = new S3Client({
    endpoint: minioConfig.endpoint,
    credentials: {
        accessKeyId: minioConfig.accessKeyId,
        secretAccessKey: minioConfig.secretAccessKey,
    },
    region: minioConfig.region,
    forcePathStyle: true, // MinIO 需要路徑樣式
});

/**
 * 上傳檔案到 MinIO
 * @param {Buffer} fileBuffer - 檔案 buffer
 * @param {string} fileName - 檔案名稱 
 * @param {string} contentType - MIME 類型
 * @returns {Promise<Object>} 上傳結果
 */
const uploadFileToMinio = async (fileBuffer, fileName, contentType) => {
    console.log('📁 開始上傳檔案到 MinIO...');
    console.log('檔案名稱:', fileName);
    console.log('檔案類型:', contentType);
    console.log('檔案大小:', fileBuffer.length, 'bytes');

    try {
        const command = new PutObjectCommand({
            Bucket: minioConfig.bucketName,
            Key: fileName,
            Body: fileBuffer,
            ContentType: contentType,
        });

        const result = await s3Client.send(command);
        
        // 先返回基本 URL，稍後可以通過 API 獲取預簽名 URL
        const fileUrl = `${minioConfig.publicEndpoint}/${minioConfig.bucketName}/${fileName}`;
        
        console.log('📁 MinIO 檔案路徑:', fileUrl);
        
        console.log('✅ 檔案上傳成功!');
        console.log('檔案 URL:', fileUrl);
        console.log('ETag:', result.ETag);
        
        return {
            url: fileUrl,
            etag: result.ETag,
            fileName: fileName,
            size: fileBuffer.length,
            contentType: contentType
        };
    } catch (error) {
        console.error('❌ MinIO 上傳失敗:', error);
        throw new Error(`MinIO 上傳失敗: ${error.message}`);
    }
};

/**
 * 從 MinIO 下載檔案
 * @param {string} fileName - 檔案名稱
 * @returns {Promise<Buffer>} 檔案內容
 */
const downloadFileFromMinio = async (fileName) => {
    console.log('📥 從 MinIO 下載檔案:', fileName);

    try {
        const command = new GetObjectCommand({
            Bucket: minioConfig.bucketName,
            Key: fileName,
        });

        const response = await s3Client.send(command);
        const chunks = [];
        
        for await (const chunk of response.Body) {
            chunks.push(chunk);
        }
        
        const fileBuffer = Buffer.concat(chunks);
        console.log('✅ 檔案下載成功，大小:', fileBuffer.length, 'bytes');
        
        return fileBuffer;
    } catch (error) {
        console.error('❌ MinIO 下載失敗:', error);
        throw new Error(`MinIO 下載失敗: ${error.message}`);
    }
};

/**
 * 從 MinIO 刪除檔案
 * @param {string} fileName - 檔案名稱
 * @returns {Promise<void>}
 */
const deleteFileFromMinio = async (fileName) => {
    console.log('🗑️ 從 MinIO 刪除檔案:', fileName);

    try {
        const command = new DeleteObjectCommand({
            Bucket: minioConfig.bucketName,
            Key: fileName,
        });

        await s3Client.send(command);
        console.log('✅ 檔案刪除成功:', fileName);
    } catch (error) {
        console.error('❌ MinIO 刪除失敗:', error);
        throw new Error(`MinIO 刪除失敗: ${error.message}`);
    }
};

/**
 * 檢查檔案是否存在於 MinIO
 * @param {string} fileName - 檔案名稱
 * @returns {Promise<boolean>} 檔案是否存在
 */
const fileExistsInMinio = async (fileName) => {
    console.log('🔍 檢查 MinIO 檔案是否存在:', fileName);

    try {
        const command = new HeadObjectCommand({
            Bucket: minioConfig.bucketName,
            Key: fileName,
        });

        await s3Client.send(command);
        console.log('✅ 檔案存在:', fileName);
        return true;
    } catch (error) {
        if (error.name === 'NotFound') {
            console.log('❌ 檔案不存在:', fileName);
            return false;
        }
        console.error('❌ 檢查檔案存在時出錯:', error);
        throw new Error(`檢查檔案失敗: ${error.message}`);
    }
};

/**
 * 生成預簽名下載 URL
 * @param {string} fileName - 檔案名稱
 * @param {number} expiresIn - 過期時間（秒）
 * @returns {Promise<string>} 預簽名 URL
 */
const getPresignedDownloadUrl = async (fileName, expiresIn = 3600) => {
    console.log('🔗 生成預簽名下載 URL:', fileName);

    try {
        const command = new GetObjectCommand({
            Bucket: minioConfig.bucketName,
            Key: fileName,
        });

        const url = await getSignedUrl(s3Client, command, { expiresIn });
        console.log('✅ 預簽名 URL 生成成功');
        
        return url;
    } catch (error) {
        console.error('❌ 生成預簽名 URL 失敗:', error);
        throw new Error(`生成預簽名 URL 失敗: ${error.message}`);
    }
};

module.exports = {
    s3Client,
    minioConfig,
    uploadFileToMinio,
    downloadFileFromMinio,
    deleteFileFromMinio,
    fileExistsInMinio,
    getPresignedDownloadUrl,
}; 