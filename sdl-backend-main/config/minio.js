const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');

// 📦 MinIO 配置
const minioConfig = {

    endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
    accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    bucketName: process.env.MINIO_BUCKET_NAME || 'sdl-files',
    region: 'us-east-1', // MinIO 預設區域
}

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
 * 上傳檔案到 MinIO（支援 Buffer 或 Stream）
 * @param {Buffer|ReadableStream} fileBody - 檔案內容（Buffer 或 ReadableStream）
 * @param {string} fileName - 檔案名稱
 * @param {string} contentType - MIME 類型
 * @param {number} [fileSize] - 檔案大小（stream 模式需提供）
 * @returns {Promise<Object>} 上傳結果
 */
const uploadFileToMinio = async (fileBody, fileName, contentType, fileSize) => {
    const size = fileSize || (Buffer.isBuffer(fileBody) ? fileBody.length : undefined);
    console.log('📁 開始上傳檔案到 MinIO:', fileName, contentType, size ? `${size} bytes` : 'stream');

    try {
        const putParams = {
            Bucket: minioConfig.bucketName,
            Key: fileName,
            Body: fileBody,
            ContentType: contentType,
        };
        if (size) putParams.ContentLength = size;

        const command = new PutObjectCommand(putParams);
        const result = await s3Client.send(command);

        // 儲存邏輯路徑而非主機名 URL，避免 Docker 內部主機名無法被瀏覽器解析
        const fileUrl = `minio://${minioConfig.bucketName}/${fileName}`;

        console.log('✅ 檔案上傳成功:', fileName, 'ETag:', result.ETag);

        return {
            url: fileUrl,
            etag: result.ETag,
            fileName: fileName,
            size: size || 0,
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
/**
 * 以 stream 方式取得 MinIO 物件（B6：取代整檔讀進記憶體）
 *
 * 回傳 Readable stream 與必要的回應 header 資訊，由呼叫端 pipe 到 HTTP 回應。
 * 物件不存在時丟出帶 code = 'NOT_FOUND' 的錯誤，呼叫端可直接回 404，
 * 不需要先 HeadObject 再 GetObject（省一次 round-trip）。
 *
 * @param {string} fileName
 * @param {Object} [options]
 * @param {string} [options.ifNoneMatch] 瀏覽器帶來的 If-None-Match，命中時回傳 { notModified: true, etag }
 * @returns {Promise<{ stream: import('stream').Readable, contentLength?: number, contentType?: string, etag?: string, lastModified?: Date, notModified?: boolean }>}
 */
const getFileStreamFromMinio = async (fileName, options = {}) => {
    const command = new GetObjectCommand({
        Bucket: minioConfig.bucketName,
        Key: fileName,
        ...(options.ifNoneMatch ? { IfNoneMatch: options.ifNoneMatch } : {}),
    });

    try {
        const response = await s3Client.send(command);
        return {
            stream: response.Body,
            contentLength: typeof response.ContentLength === 'number' ? response.ContentLength : undefined,
            contentType: response.ContentType,
            etag: response.ETag,
            lastModified: response.LastModified,
        };
    } catch (error) {
        const status = error?.$metadata?.httpStatusCode;
        if (status === 304) {
            // 條件請求命中：物件未變更
            return { notModified: true, etag: options.ifNoneMatch };
        }
        if (error?.name === 'NoSuchKey' || error?.Code === 'NoSuchKey' || status === 404) {
            const notFound = new Error(`MinIO 物件不存在: ${fileName}`);
            notFound.code = 'NOT_FOUND';
            throw notFound;
        }
        console.error('MinIO stream 下載失敗:', error);
        throw new Error(`MinIO 下載失敗: ${error.message}`);
    }
};

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

module.exports = {
    s3Client,
    minioConfig,
    uploadFileToMinio,
    downloadFileFromMinio,
    getFileStreamFromMinio,
    deleteFileFromMinio,
    fileExistsInMinio,
}; 