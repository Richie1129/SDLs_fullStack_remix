#!/bin/bash

echo "🔧 修復 MinIO 依賴項問題..."

echo "📦 停止 Docker 容器..."
docker-compose -f ../docker-compose.prod.yml down

echo "📦 重新構建 API 容器（安裝新依賴項）..."
docker-compose -f ../docker-compose.prod.yml build api --no-cache

echo "🚀 啟動 Docker 容器..."
docker-compose -f ../docker-compose.prod.yml up -d

echo "⏳ 等待容器啟動..."
sleep 10

echo "✅ 檢查容器狀態..."
docker-compose -f ../docker-compose.prod.yml ps

echo ""
echo "🎉 MinIO 依賴項已安裝完成！"
echo ""
echo "📋 接下來的步驟:"
echo "1. 執行 'node enable-minio.js' 重新啟用 MinIO 功能"
echo "2. 重新啟動應用程式"
echo "3. 檢查日誌: docker-compose -f ../docker-compose.prod.yml logs api"
echo ""
echo "如果還有問題，請檢查:"
echo "- MinIO 容器是否正常運行"
echo "- 環境變數是否正確設置"
echo "- 檢查完整日誌" 