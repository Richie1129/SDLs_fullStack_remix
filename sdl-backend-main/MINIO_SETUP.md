# MinIO 整合設定指南

本文件說明如何完整設定和使用 MinIO 檔案儲存系統來替代原本的本地檔案儲存。

## 📋 目錄

1. [依賴項安裝](#依賴項安裝)
2. [環境變數設定](#環境變數設定)
3. [MinIO 服務啟動](#minio-服務啟動)
4. [功能說明](#功能說明)
5. [API 使用方式](#api-使用方式)
6. [資料庫遷移](#資料庫遷移)
7. [錯誤處理](#錯誤處理)

## 🚀 依賴項安裝

首先安裝必要的 NPM 套件：

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner winston
```

## ⚙️ 環境變數設定

創建或更新 `.env` 檔案，新增以下 MinIO 配置：

```env
# Database Configuration
PG_DB=your_database_name
PG_USER=your_db_user
PG_PASSWORD=your_db_password
PG_HOST=localhost

# MinIO Configuration
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=sdl-files

# Production MinIO Configuration (when using Docker)
# MINIO_ENDPOINT=http://minio:9000
# MINIO_ACCESS_KEY=your_custom_access_key
# MINIO_SECRET_KEY=your_custom_secret_key

NODE_ENV=development
```

## 🐳 MinIO 服務啟動

### 使用 Docker 啟動 MinIO

```bash
docker run -d \
  --name minio-dev \
  -p 9000:9000 \
  -p 9001:9001 \
  -e "MINIO_ROOT_USER=minioadmin" \
  -e "MINIO_ROOT_PASSWORD=minioadmin" \
  minio/minio server /data --console-address ":9001"
```

### 創建 Bucket

MinIO 啟動後，訪問 http://localhost:9001 並使用 `minioadmin/minioadmin` 登入，然後創建一個名為 `sdl-files` 的 bucket。

或者使用 MinIO 客戶端：

```bash
# 安裝 MinIO 客戶端
npm install -g minio

# 創建 bucket
mc alias set myminio http://localhost:9000 minioadmin minioadmin
mc mb myminio/sdl-files
```

## 🛠️ 功能說明

### 已實現的功能

#### 1. 檔案上傳
- **多檔案上傳**：使用 `uploadToMinio('fieldName', maxCount)` 中介軟體
- **單檔案上傳**：使用 `uploadSingleToMinio('fieldName')` 中介軟體
- **自動檔名生成**：避免檔名衝突
- **檔案類型檢查**：支援圖片、文件等多種格式

#### 2. 檔案下載
- **預簽名 URL**：生成有時效性的下載連結
- **直接下載**：適用於小檔案
- **檔案資訊查詢**：取得檔案詳細資訊

#### 3. 檔案管理
- **檔案刪除**：單個或批量刪除
- **檔案存在檢查**：驗證檔案是否存在
- **檔案列表**：取得用戶上傳的檔案清單

#### 4. 錯誤處理與日誌
- **完整的錯誤處理**：捕獲並記錄所有 MinIO 操作錯誤
- **詳細日誌記錄**：追蹤檔案操作歷程
- **向後相容性**：保留舊的 BLOB 欄位以確保資料完整性

## 📡 API 使用方式

### 檔案上傳 APIs

#### 1. 通用檔案上傳
```http
POST /api/upload
Content-Type: multipart/form-data

files: [檔案1, 檔案2, ...]
```

**回應範例**：
```json
{
  "message": "檔案上傳成功",
  "files": [
    {
      "url": "http://localhost:9000/sdl-files/1703123456789-abc123-example.jpg",
      "fileName": "1703123456789-abc123-example.jpg",
      "originalName": "example.jpg",
      "mimeType": "image/jpeg",
      "size": 156789
    }
  ]
}
```

#### 2. 日誌檔案上傳
```http
POST /api/daily
Content-Type: multipart/form-data

title: 日誌標題
content: 日誌內容
userId: 用戶ID
projectId: 專案ID
attachFile: [檔案]
```

#### 3. 提交檔案上傳
```http
POST /api/submit
Content-Type: multipart/form-data

currentStage: 1
currentSubStage: 2
content: {"描述": "提交內容"}
projectId: 專案ID
attachFile: [檔案]
```

### 檔案管理 APIs

#### 1. 生成下載連結
```http
GET /api/file/download/:fileName?expiresIn=3600

回應:
{
  "downloadUrl": "https://...",
  "fileName": "檔案名",
  "expiresIn": 3600,
  "message": "下載連結生成成功"
}
```

#### 2. 直接下載檔案
```http
GET /api/file/direct/:fileName
```

#### 3. 刪除檔案
```http
DELETE /api/file/:fileName

回應:
{
  "message": "檔案刪除成功",
  "fileName": "檔案名"
}
```

#### 4. 批量刪除檔案
```http
POST /api/file/batch-delete
Content-Type: application/json

{
  "fileNames": ["file1.jpg", "file2.pdf"]
}
```

#### 5. 檢查檔案是否存在
```http
HEAD /api/file/:fileName
```

### 更新檔案 APIs

#### 1. 更新日誌檔案
```http
PUT /api/daily/personal/:id
PUT /api/daily/team/:id
Content-Type: multipart/form-data

title: 新標題
content: 新內容
attachFile: [新檔案] (可選)
```

#### 2. 更新提交檔案
```http
PUT /api/submit/:submitId
Content-Type: multipart/form-data

content: {"新描述": "更新內容"}
attachFile: [新檔案] (可選)
```

## 🗄️ 資料庫遷移

新的資料庫欄位已添加到以下表格：

### daily_personals / daily_teams
- `fileName`: MinIO 檔案名稱
- `originalName`: 原始檔案名稱
- `fileUrl`: MinIO 檔案 URL
- `mimeType`: 檔案 MIME 類型
- `fileSize`: 檔案大小 (bytes)

### submits
- `originalName`: 原始檔案名稱
- `fileUrl`: MinIO 檔案 URL
- `mimeType`: 檔案 MIME 類型
- `fileSize`: 檔案大小 (bytes)

**注意**：舊的 `fileData` (BLOB) 和 `filename` 欄位被保留以確保向後相容性。

## 🔧 錯誤處理

### 常見錯誤及解決方式

#### 1. MinIO 連線失敗
```
錯誤: MinIO 上傳失敗: getaddrinfo ENOTFOUND localhost
解決: 檢查 MINIO_ENDPOINT 設定和 MinIO 服務是否啟動
```

#### 2. 權限問題
```
錯誤: Access Denied
解決: 檢查 MINIO_ACCESS_KEY 和 MINIO_SECRET_KEY 設定
```

#### 3. Bucket 不存在
```
錯誤: The specified bucket does not exist
解決: 確保已創建 MINIO_BUCKET_NAME 指定的 bucket
```

#### 4. 檔案大小限制
```
錯誤: File too large
解決: 檢查 multer 的 fileSize 限制設定 (預設 10MB)
```

### 日誌監控

所有 MinIO 操作都會記錄在 console，包括：
- 檔案上傳成功/失敗
- 預簽名 URL 生成
- 檔案刪除操作
- 錯誤詳細資訊

## 🏁 開始使用

1. **安裝依賴**：`npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner winston`
2. **設定環境變數**：更新 `.env` 檔案
3. **啟動 MinIO**：使用 Docker 或本地安裝
4. **創建 Bucket**：透過 MinIO Console 或 CLI
5. **啟動應用程式**：`npm run dev`
6. **測試上傳**：使用 `/api/upload` 端點測試檔案上傳

## 📝 注意事項

- 舊的本地檔案儲存系統仍然存在，但新的檔案會儲存到 MinIO
- 資料庫中的 BLOB 欄位被保留以確保資料完整性
- 生產環境建議自訂 MinIO 存取金鑰
- 定期備份 MinIO 資料至外部儲存
- 監控 MinIO 服務的健康狀態和空間使用量

## 🚀 生產環境部署

### Docker Compose 生產環境

`docker-compose.prod.yml` 已經包含完整的 MinIO 配置，包括：
- MinIO 服務器
- 自動 bucket 初始化
- 持久化數據存儲
- 健康檢查

#### 1. 創建生產環境配置

在項目根目錄創建 `.env` 文件：
```bash
cat > .env << EOF
# OpenAI API
OPENAI_API_KEY=your_openai_api_key_here

# MinIO 配置 (生產環境請使用強密碼)
MINIO_ACCESS_KEY=your_secure_access_key
MINIO_SECRET_KEY=your_secure_secret_key_minimum_8_characters
MINIO_BUCKET_NAME=sdl-files
EOF
```

#### 2. 使用 Docker Compose 部署

```bash
# 啟動所有服務（包含 MinIO）
docker-compose -f docker-compose.prod.yml up -d

# 檢查服務狀態
docker-compose -f docker-compose.prod.yml ps

# 查看 MinIO 初始化日誌
docker-compose -f docker-compose.prod.yml logs minio-init

# 查看所有服務日誌
docker-compose -f docker-compose.prod.yml logs -f
```

#### 3. 訪問服務

- **應用程式**: http://your-domain
- **MinIO Console**: http://your-domain:9001
- **PgAdmin**: http://your-domain:5555

#### 4. 生產環境安全建議

```bash
# 1. 使用強密碼
MINIO_ACCESS_KEY=mycompany_secure_key
MINIO_SECRET_KEY=mycompany_secure_secret_minimum_8_chars

# 2. 限制 MinIO Console 訪問（修改 docker-compose.prod.yml）
# 移除或註解 ports 配置，僅供內部服務使用：
# ports:
#   - "9000:9000"  # API 端口保留
#   # - "9001:9001"  # Console 端口移除

# 3. 設置防火牆規則，限制 9001 端口的外部訪問

# 4. 定期備份 MinIO 數據
docker run --rm -v minio_data:/data -v $(pwd)/backup:/backup alpine tar czf /backup/minio-backup-$(date +%Y%m%d).tar.gz -C / data
```

### 生產環境服務架構

```
├── nginx (80, 443)           # 反向代理、SSL 終端
├── api (3000)                # Node.js 後端 + MinIO 集成
├── front (5173)              # 前端應用
├── postgres (5432)           # 資料庫
├── minio (9000, 9001)        # 對象存儲服務
├── minio-init                # 自動初始化 MinIO bucket
└── pgadmin (5555)            # 資料庫管理界面
```

### 監控與維護

#### 1. 健康檢查

```bash
# 檢查所有服務狀態
docker-compose -f docker-compose.prod.yml ps

# 檢查 MinIO 健康狀態
curl -f http://localhost:9000/minio/health/live

# 檢查 bucket 是否存在
docker exec $(docker-compose -f docker-compose.prod.yml ps -q minio) mc ls /data
```

#### 2. 備份與恢復

```bash
# 備份 MinIO 數據
docker run --rm \
  -v $(docker-compose -f docker-compose.prod.yml ps -q minio | xargs docker inspect --format '{{ range .Mounts }}{{ .Source }}{{ end }}'):/source \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/minio-$(date +%Y%m%d-%H%M%S).tar.gz -C /source .

# 備份 PostgreSQL 數據
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U postgres postgres > backup-$(date +%Y%m%d).sql
```

#### 3. 日誌管理

```bash
# 查看特定服務日誌
docker-compose -f docker-compose.prod.yml logs -f api
docker-compose -f docker-compose.prod.yml logs -f minio

# 清理舊日誌
docker system prune -f
```

---

**完成整合後，你的檔案上傳系統將使用 MinIO 作為儲存後端，提供更好的擴展性、效能和管理功能！** 🎉 