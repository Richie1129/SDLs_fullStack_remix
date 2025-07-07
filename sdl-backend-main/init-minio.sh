#!/bin/bash
# MinIO 生產環境初始化腳本

echo "🚀 初始化 MinIO 生產環境..."

# 等待 MinIO 服務啟動
echo "⏳ 等待 MinIO 服務啟動..."
sleep 10

# 檢查 MinIO 是否可用
until curl -f http://minio:9000/minio/health/live; do
    echo "等待 MinIO 服務..."
    sleep 5
done

echo "✅ MinIO 服務已就緒"

# 設置 MinIO 客戶端別名
mc alias set myminio http://minio:9000 ${MINIO_ACCESS_KEY:-minioadmin} ${MINIO_SECRET_KEY:-minioadmin}

# 檢查 bucket 是否存在，不存在則創建
BUCKET_NAME=${MINIO_BUCKET_NAME:-sdl-files}

if mc ls myminio/$BUCKET_NAME > /dev/null 2>&1; then
    echo "✅ Bucket '$BUCKET_NAME' 已存在"
else
    echo "📦 創建 bucket: $BUCKET_NAME"
    mc mb myminio/$BUCKET_NAME
    
    # 設置 bucket 為公開讀取（可選）
    # mc anonymous set public myminio/$BUCKET_NAME
    
    echo "✅ Bucket '$BUCKET_NAME' 創建成功"
fi

echo "🎉 MinIO 初始化完成！" 