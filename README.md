# SDL Fullstack Remix

> **🎉 最新更新 (2024)**：檔案儲存系統已完全遷移至 MinIO 對象儲存，提供更穩定高效的檔案管理服務。

SDL (Self-Directed Learning) Fullstack Remix 是一個專為教育研究設計的綜合性自主學習平台，整合了專案管理、即時通訊、學習反思與 AI 輔助等多元功能。本平台採用現代化的全端技術架構，透過 Docker 容器化部署，為學生、教師提供完整的數位學習生態系統。

## ✨ 功能特色

### 🎯 核心學習工具
- **專案階段式引導系統**：基於科學探究方法論的五階段學習框架（定標→擇策→監評→調節→學習歷程）
- **智慧看板管理**：支援拖拽式任務管理，即時協作同步的 Kanban 系統
- **學習反思日誌**：結構化的個人與團隊反思記錄，促進深度學習
- **數位作品集**：階段性學習成果展示與管理平台
- **AI 學習助手**：基於 RAG 技術的個人化學習支援系統

### 🤝 協作與交流
- **即時聊天系統**：專案群組、學習小組的即時通訊與檔案分享
- **互動問答平台**：師生問答、同儕互助的知識交流空間
- **創意想法牆**：腦力激盪與創意分享的協作平台
- **公告通知系統**：多層級、精準推播的資訊發佈平台

### 🔧 系統特色
- **統一檔案管理**：MinIO 對象儲存確保檔案安全與高可用性
- **即時協作同步**：基於 Socket.io 的高效能即時通訊
- **跨模組整合**：以專案為核心的功能深度整合
- **響應式設計**：適配各種設備的現代化使用者介面

## 🏗️ 技術架構

### 技術堆疊

#### 前端技術
- **框架**：React 18.2.0 + Vite
- **樣式**：TailwindCSS + Styled Components
- **UI 元件**：Lucide React Icons, React Hot Toast
- **動畫**：Framer Motion, Lottie React
- **狀態管理**：React Query + Context API
- **路由**：React Router DOM
- **資料視覺化**：Recharts, Vis Network

#### 後端技術
- **運行環境**：Node.js + Express.js
- **資料庫**：PostgreSQL + Sequelize ORM
- **身份驗證**：JWT + Bcrypt
- **即時通訊**：Socket.io
- **檔案處理**：Multer + MinIO 對象儲存
- **AI 整合**：OpenAI API + RAGFlow

#### 基礎架構
- **容器化**：Docker + Docker Compose
- **反向代理**：Nginx
- **SSL/TLS**：Let's Encrypt + Certbot
- **資料庫管理**：pgAdmin
- **檔案儲存**：MinIO 對象儲存

### 系統架構圖

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │     Nginx       │    │    Backend      │
│   (React/Vite)  │◄──►│  (Reverse Proxy)│◄──►│   (Express.js)  │
│   Port: 5173    │    │   Port: 80/443  │    │   Port: 3000    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                │                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │     MinIO       │    │   PostgreSQL    │
                       │ (對象儲存)      │    │ (主要資料庫)    │
                       │   Port: 9000    │    │   Port: 5432    │
                       └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │    pgAdmin      │
                                               │ (資料庫管理)    │
                                               │   Port: 5555    │
                                               └─────────────────┘
```

### 專案結構

```
SDLs_fullStack_remix/
├── sdl-frontend-main/          # 前端 React 應用
│   ├── src/
│   │   ├── components/         # 可重用元件
│   │   ├── pages/             # 頁面元件
│   │   ├── layouts/           # 版面配置
│   │   ├── context/           # 狀態管理
│   │   ├── api/               # API 呼叫層
│   │   └── utils/             # 工具函數
│   ├── package.json
│   └── vite.config.js
├── sdl-backend-main/           # 後端 Express API
│   ├── controllers/           # 控制器層
│   ├── models/               # 資料模型
│   ├── routes/               # API 路由
│   ├── middlewares/          # 中介軟體
│   ├── config/               # 設定檔案
│   ├── migrations/           # 資料庫遷移
│   └── daily_file/           # 檔案儲存目錄
├── docker-compose.yml         # 開發環境容器配置
├── docker-compose.prod.yml    # 生產環境容器配置
├── nginx.conf                # Nginx 設定檔
└── README.md                 # 專案說明文件
```

## 🚀 快速開始

### 環境需求

- Docker 20.10+ 和 Docker Compose 2.0+
- Node.js 18+ (本地開發)
- Git

### 1. 複製專案

```bash
git clone <repository-url>
cd SDLs_fullStack_remix
```

### 2. 環境變數設定

複製並編輯後端環境變數檔案：

```bash
cd sdl-backend-main
cp env.prod.example .env.prod
```

編輯 `.env.prod` 檔案，填入必要的環境變數：

```env
# 資料庫設定
PG_DB=your_database_name
PG_USER=your_db_user
PG_PASSWORD=your_strong_db_password
PG_HOST=postgres

# MinIO 設定
MINIO_ENDPOINT=http://minio:9000
MINIO_ACCESS_KEY=your_minio_access_key
MINIO_SECRET_KEY=your_minio_secret_key
MINIO_BUCKET_NAME=sdl-files

# OpenAI API 設定
OPENAI_API_KEY=your_openai_api_key

# JWT 密鑰
JWT_SECRET=your_strong_jwt_secret

NODE_ENV=production
```

**🔒 安全重要提醒**：
- 請務必使用強密碼替換所有 `your_*` 占位符
- 絕對不要將真實的環境變數檔案提交到版本控制系統
- 建議使用至少 32 字元的隨機字串作為 JWT_SECRET
- MinIO 帳號密碼應包含大小寫字母、數字和特殊符號

### 3. 啟動服務

#### 開發環境

```bash
# 啟動所有服務
docker compose up -d

# 查看服務狀態
docker compose ps

# 查看日誌
docker compose logs -f
```

#### 生產環境

```bash
# 使用生產環境配置啟動
docker compose -f docker-compose.prod.yml up -d
```

### 4. 服務訪問

啟動成功後，可以通過以下地址訪問各服務：

- **前端應用**：http://localhost
- **後端 API**：http://localhost/api
- **pgAdmin**：http://localhost:5555
- **MinIO 控制台**：http://localhost:9001

## 📚 系統功能說明

### 專案階段式引導系統

基於科學探究方法論設計的五階段學習框架：

#### 五階段流程
1. **定標階段**：提出研究主題、目的與問題
2. **擇策階段**：訂定研究構想、設計記錄表格、規劃排程
3. **監評階段**：進行嘗試性研究、分析資料、撰寫結果
4. **調節階段**：檢視進度、進行討論、撰寫結論
5. **學習歷程階段**：封面製作、摘要撰寫、內容整理、反思撰寫

#### 使用方式
- 學生按階段完成指定任務和提交要求
- 系統提供智慧引導和目標說明
- 教師可即時監控學生進度和成果品質
- 每個階段的成果自動整合到作品集系統

### 智慧看板管理

#### 核心功能
- **拖拽式操作**：直觀的任務狀態更新
- **即時協作**：多人同時編輯，即時同步
- **多媒體支援**：任務卡片支援檔案和圖片附件
- **成員指派**：任務分配和責任管理

#### 使用場景
- 科學探究專案的任務分工管理
- 團隊協作進度追蹤
- 跨學科整合專案管理

### 學習反思系統

#### 功能特色
- **個人反思**：每日學習心得與成長記錄
- **團隊反思**：團隊協作經驗與問題討論
- **檔案附件**：支援反思相關的檔案上傳
- **進度追蹤**：與專案階段關聯的反思記錄

#### 教育價值
- 促進學生深度思考和自我評估
- 建立完整的學習歷程檔案
- 協助教師了解學生學習狀況

### AI 學習助手

#### 技術架構
- **RAG 系統**：檢索增強生成技術
- **上下文記憶**：多輪對話的連貫性
- **個人化回應**：基於學習歷程的客製化建議
- **知識庫整合**：平台內容與外部知識的整合

#### 應用場景
- 概念解釋與學習指導
- 研究方法建議
- 文獻搜尋協助
- 學習進度分析

## 🔧 MinIO 檔案儲存系統

### 遷移完成功能

專案已完全遷移至 MinIO 對象儲存系統，提供以下優勢：

#### 核心改進
- **高可用性**：分散式儲存確保檔案安全
- **效能提升**：快速的檔案上傳下載
- **統一管理**：所有模組共享統一的檔案管理
- **向後相容**：保留舊 BLOB 資料的完整性

#### API 端點
```
GET  /api/file/download/:fileName     # 生成預簽名下載 URL
GET  /api/file/direct/:fileName       # 直接下載檔案
GET  /api/file/image/:fileName        # 圖片代理服務
DELETE /api/file/:fileName            # 刪除單個檔案
POST /api/file/batch-delete           # 批量刪除檔案
HEAD /api/file/:fileName              # 檢查檔案存在性
```

#### 支援的功能模組
- ✅ 個人日誌檔案處理
- ✅ 團隊日誌檔案處理
- ✅ 作品集檔案管理
- ✅ 任務卡片檔案附件
- ✅ 階段提交檔案處理

### MinIO 服務配置

#### Docker 啟動 MinIO

```bash
docker run -d \
  --name minio-dev \
  -p 9000:9000 \
  -p 9001:9001 \
  -e "MINIO_ROOT_USER=${MINIO_ACCESS_KEY}" \
  -e "MINIO_ROOT_PASSWORD=${MINIO_SECRET_KEY}" \
  minio/minio server /data --console-address ":9001"
```

#### 建立儲存空間

1. 訪問 http://localhost:9001
2. 使用您在環境變數中設定的 MinIO 帳號密碼登入
3. 創建名為 `sdl-files` 的 bucket
4. 設定適當的存取權限

**安全提醒**：請務必修改預設的 MinIO 帳號密碼，使用強密碼以確保系統安全。

## 🐳 部署指南

### Docker Compose 部署

本專案使用 Docker Compose 進行微服務編排，包含以下服務：

#### 服務組成
- **nginx**：反向代理與負載均衡
- **certbot**：SSL 憑證自動管理
- **api**：後端 API 服務
- **front**：前端應用服務
- **postgres**：PostgreSQL 資料庫
- **pgadmin**：資料庫管理介面
- **minio**：對象儲存服務

#### 部署步驟

1. **準備環境變數**
```bash
# 確認所有環境變數已正確設定
cat sdl-backend-main/.env.prod
```

2. **建構和啟動服務**
```bash
# 開發環境
docker compose up -d

# 生產環境
docker compose -f docker-compose.prod.yml up -d
```

3. **初始化資料庫**
```bash
# 進入後端容器執行遷移
docker compose exec api npm run migrate
```

4. **設定 SSL 憑證** (生產環境)
```bash
# 申請 Let's Encrypt 憑證
docker compose exec certbot certbot --nginx -d your-domain.com
```

### 健康檢查

```bash
# 檢查所有服務狀態
docker compose ps

# 檢查特定服務日誌
docker compose logs api
docker compose logs front
docker compose logs postgres

# 檢查資料庫連線
docker compose exec postgres psql -U $PG_USER -d $PG_DB -c "\dt"
```

## 🛠️ 開發指南

### 本地開發環境設定

#### 前端開發

```bash
cd sdl-frontend-main

# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev

# 建構生產版本
npm run build
```

#### 後端開發

```bash
cd sdl-backend-main

# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev

# 執行資料庫遷移
npm run migrate

# 執行資料庫種子資料
npm run seed
```

### API 文件

#### 主要 API 端點

```
# 使用者管理
POST /api/users/register        # 使用者註冊
POST /api/users/login           # 使用者登入
GET  /api/users/profile         # 取得使用者資料

# 專案管理
GET  /api/projects              # 取得專案列表
POST /api/projects              # 建立新專案
PUT  /api/projects/:id          # 更新專案

# 看板系統
GET  /api/kanban/:projectId     # 取得專案看板
POST /api/kanban/create         # 建立看板任務
PUT  /api/kanban/update/:id     # 更新任務

# 反思日誌
GET  /api/daily/personal        # 取得個人反思
POST /api/daily/personal        # 建立個人反思
GET  /api/daily/team            # 取得團隊反思

# 問答系統
GET  /api/questions             # 取得問題列表
POST /api/questions             # 建立新問題
GET  /api/questions/:id/messages # 取得問題討論

# 檔案管理
POST /api/upload                # 檔案上傳
GET  /api/file/download/:fileName # 檔案下載
```

### 資料庫結構

#### 核心資料表

```sql
-- 使用者表
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'STUDENT',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 專案表
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    current_stage INTEGER DEFAULT 1,
    current_sub_stage INTEGER DEFAULT 1,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 專案階段提交表
CREATE TABLE submits (
    id SERIAL PRIMARY KEY,
    stage VARCHAR(10) NOT NULL,
    content JSON,
    file_data BYTEA,
    file_name VARCHAR(255),
    file_url TEXT,
    original_name VARCHAR(255),
    mime_type VARCHAR(100),
    file_size INTEGER,
    project_id INTEGER REFERENCES projects(id),
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 看板任務表
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    labels JSONB,
    assignees JSONB,
    owner VARCHAR(100),
    column_id INTEGER,
    kanban_id INTEGER,
    images TEXT[],
    files JSONB,
    image BYTEA,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔍 疑難排解

### 常見問題

#### 1. Docker 服務啟動失敗

```bash
# 檢查 Docker 狀態
docker --version
docker compose --version

# 重新建構映像檔
docker compose build --no-cache

# 清理 Docker 資源
docker system prune -a
```

#### 2. 資料庫連線問題

```bash
# 檢查 PostgreSQL 服務狀態
docker compose logs postgres

# 進入資料庫容器檢查
docker compose exec postgres psql -U $PG_USER -d $PG_DB

# 重置資料庫
docker compose down -v
docker compose up postgres -d
```

#### 3. MinIO 檔案存取問題

```bash
# 檢查 MinIO 服務狀態
docker compose logs minio

# 測試 MinIO 連線
curl http://localhost:9000/minio/health/live

# 重新建立 bucket
# 訪問 http://localhost:9001 手動建立
```

#### 4. 前端建構錯誤

```bash
# 清理快取
cd sdl-frontend-main
rm -rf node_modules package-lock.json
npm install

# 檢查 Node.js 版本
node --version  # 需要 18+
```

### 效能優化

#### 資料庫優化

```sql
-- 建立索引以提升查詢效能
CREATE INDEX idx_submits_project_id ON submits(project_id);
CREATE INDEX idx_submits_user_id ON submits(user_id);
CREATE INDEX idx_tasks_kanban_id ON tasks(kanban_id);
CREATE INDEX idx_users_username ON users(username);
```

#### MinIO 最佳化

```bash
# 設定適當的環境變數
MINIO_CACHE_DRIVES=/tmp/cache
MINIO_CACHE_QUOTA=80
MINIO_CACHE_AFTER=2
MINIO_CACHE_WATERMARK_LOW=70
MINIO_CACHE_WATERMARK_HIGH=90
```

## 🤝 貢獻指南

### 開發流程

1. **Fork 專案**並建立功能分支
2. **遵循代碼規範**進行開發
3. **撰寫測試**確保功能正確性
4. **更新文件**說明變更內容
5. **提交 Pull Request**進行代碼審查

### 程式碼規範

#### 前端規範

```javascript
// 使用 ES6+ 語法
const getUserData = async (userId) => {
  try {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error('取得使用者資料失敗:', error);
    throw error;
  }
};

// React 元件命名使用 PascalCase
const UserProfile = ({ user, onUpdate }) => {
  return (
    <div className="user-profile">
      {/* 元件內容 */}
    </div>
  );
};
```

#### 後端規範

```javascript
// 使用 async/await 處理非同步操作
const createProject = async (req, res) => {
  try {
    const { name, description } = req.body;
    const project = await Project.create({
      name,
      description,
      created_by: req.user.id
    });
    
    res.status(201).json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error('建立專案失敗:', error);
    res.status(500).json({
      success: false,
      message: '伺服器錯誤'
    });
  }
};
```

### 提交訊息規範

```
feat: 新增 AI 學習助手功能
fix: 修復檔案上傳問題
docs: 更新 API 文件
style: 調整 UI 樣式
refactor: 重構反思系統代碼
test: 新增單元測試
chore: 更新依賴套件
```

## 📄 授權條款

本專案採用 MIT 授權條款，詳見 [LICENSE](LICENSE) 檔案。

## 🙏 致謝

感謝所有為 SDL Fullstack Remix 專案貢獻的開發者和教育研究者。本專案旨在推動數位學習創新，促進自主學習和科學探究的發展。

## 📞 聯絡資訊

- **專案維護者**：[維護者姓名]
- **電子郵件**：[聯絡信箱]
- **官方網站**：[專案網站]
- **問題回報**：[GitHub Issues](link-to-issues)

---

*最後更新：2024年*