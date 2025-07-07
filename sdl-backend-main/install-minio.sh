#!/bin/bash

echo "🚀 開始安裝 MinIO 依賴項..."

# 安裝 NPM 依賴項
echo "📦 安裝 NPM 套件..."
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner winston

# 檢查安裝是否成功
if [ $? -eq 0 ]; then
    echo "✅ NPM 套件安裝成功！"
    
    # 檢查 Docker 是否安裝
    if command -v docker &> /dev/null; then
        echo "🐳 啟動 MinIO 服務..."
        
        # 停止並移除現有的 MinIO 容器（如果存在）
        docker stop minio-dev 2>/dev/null || true
        docker rm minio-dev 2>/dev/null || true
        
        # 啟動新的 MinIO 容器
        docker run -d \
          --name minio-dev \
          -p 9000:9000 \
          -p 9001:9001 \
          -e "MINIO_ROOT_USER=minioadmin" \
          -e "MINIO_ROOT_PASSWORD=minioadmin" \
          minio/minio server /data --console-address ":9001"
        
        if [ $? -eq 0 ]; then
            echo "✅ MinIO 服務啟動成功！"
            echo ""
            echo "📋 接下來的步驟："
            echo "1. 等待 10 秒讓 MinIO 完全啟動"
            echo "2. 訪問 MinIO Console: http://localhost:9001"
            echo "3. 使用 minioadmin/minioadmin 登入"
            echo "4. 創建名為 'sdl-files' 的 bucket"
            echo "5. 運行測試: npm run test-minio"
            echo ""
            
            # 等待 MinIO 啟動
            echo "⏳ 等待 MinIO 啟動中..."
            sleep 10
            
            # 測試 MinIO 連線
            echo "🔗 測試 MinIO 連線..."
            node test-minio.js
            
        else
            echo "❌ MinIO 服務啟動失敗"
            echo "請手動啟動 MinIO 或檢查 Docker 配置"
        fi
    else
        echo "⚠️  Docker 未安裝，請手動啟動 MinIO 服務"
        echo "或安裝 Docker 後重新運行此腳本"
    fi
    
    echo ""
    echo "🎉 安裝完成！"
    echo "請查看 MINIO_SETUP.md 獲取詳細使用說明"
    
else
    echo "❌ NPM 套件安裝失敗"
    echo "請檢查網路連線並重試"
    exit 1
fi 