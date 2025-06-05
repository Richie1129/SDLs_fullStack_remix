# SDL Fullstack Remix Overview

SDL (Self-Directed Learning) Fullstack Platform 是一個專為教育研究設計的綜合性學習管理平台，旨在支援學生自主學習、專案管理和師生互動。本系統提供完整的學習生態環境，包括專案管理工具、即時通訊功能、反思系統、AI 輔助學習等多元化功能模組。

## Technology Stack

### Frontend Technologies
- **Framework**: React 18.2.0 with Vite
- **Styling**: TailwindCSS, Styled Components
- **UI Components**: Lucide React Icons, React Hot Toast
- **Animation**: Framer Motion, Lottie React
- **State Management**: React Query, Context API
- **Routing**: React Router DOM
- **Data Visualization**: Recharts, Vis Network
- **Markdown Support**: React Markdown
- **Build Tool**: Vite with PostCSS and Autoprefixer

### Backend Technologies
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL with Sequelize ORM
- **Authentication**: JWT (JSON Web Tokens) with Bcrypt
- **Real-time Communication**: Socket.io
- **File Upload**: Multer middleware
- **API Integration**: Axios, OpenAI API
- **Environment Management**: dotenv

### Infrastructure & Deployment
- **Containerization**: Docker & Docker Compose
- **Reverse Proxy**: Nginx
- **SSL/TLS**: Let's Encrypt with Certbot
- **Database Administration**: pgAdmin
- **Process Management**: PM2 (production)

## System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │     Nginx       │    │    Backend      │
│   (React/Vite)  │◄──►│  (Reverse Proxy)│◄──►│   (Express.js)  │
│   Port: 5173    │    │   Port: 80/443  │    │   Port: 3000    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                │                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │    Certbot      │    │   PostgreSQL    │
                       │ (SSL管理)       │    │   Port: 5432    │
                       └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │    pgAdmin      │
                                               │   Port: 5555    │
                                               └─────────────────┘
```

### Communication Flow
1. **HTTP/HTTPS Requests**: Frontend → Nginx → Backend API
2. **WebSocket Connection**: Frontend ↔ Nginx ↔ Backend (Socket.io)
3. **Database Operations**: Backend ↔ PostgreSQL via Sequelize ORM
4. **File Storage**: Backend → Local file system (`daily_file/`)

## Deployment Infrastructure

### Docker Compose Architecture
本專案採用微服務架構，透過 Docker Compose 統一管理以下服務：

#### Service Configuration
```yaml
services:
  nginx:     # 反向代理與負載均衡
  certbot:   # SSL 憑證自動續期
  api:       # 後端 API 服務
  front:     # 前端應用服務
  postgres:  # 資料庫服務
  pgadmin:   # 資料庫管理介面
```

#### Network & Volume Management
- **Network**: `agent_network` - 內部服務通訊網路
- **Volumes**: `postgres_data` - 資料庫持久化儲存
- **SSL Certificates**: Let's Encrypt 自動化憑證管理

#### Deployment Process
1. **Environment Setup**: 配置環境變數與 Docker 環境
2. **Image Building**: 自動建構前後端 Docker 映像
3. **Service Orchestration**: Docker Compose 啟動所有服務
4. **SSL Configuration**: Certbot 自動申請與續期 SSL 憑證
5. **Health Checks**: PostgreSQL 健康檢查確保服務可用性

## Backend Core

### Framework & Architecture
後端基於 **Express.js** 框架構建，採用 MVC (Model-View-Controller) 架構模式：

#### Core Components
```javascript
// 主要中介軟體
app.use(cors())           // 跨域請求處理
app.use(bodyParser.json()) // JSON 解析
app.use(express.static())  // 靜態檔案服務
```

#### API Routes Structure
```
/api/users/          # 使用者管理
/api/projects/       # 專案管理
/api/kanban/         # 看板系統
/api/daily/          # 每日反思
/api/questions/      # 問答系統
/api/announcements/  # 公告系統
/api/ideaWall/       # 想法牆
/api/rag_message/    # AI 對話記錄
```

#### Database ORM
使用 **Sequelize** 作為 ORM，提供：
- 模型定義與關聯設定
- 資料庫遷移管理
- 查詢建構器與驗證
- 連接池管理

#### Real-time Features
Socket.io 實現即時功能：
```javascript
// 主要事件處理
socket.on('join_room')           // 加入聊天室
socket.on('send_message')        // 發送訊息
socket.on('taskItemCreated')     // 任務建立
socket.on('rag_message')         // AI 對話
```

## Frontend Structure

### Component Architecture
前端採用 **React 函數式元件** 配合 **Hooks** 模式：

#### Directory Structure
```
src/
├── components/     # 可重用元件
├── pages/         # 頁面元件
├── layouts/       # 版面配置元件
├── context/       # 全域狀態管理
├── api/           # API 呼叫層
├── utils/         # 工具函數
└── assets/        # 靜態資源
```

#### Page Components
```
pages/
├── home/          # 主頁面
├── login/         # 登入頁面
├── Kanban/        # 看板管理
├── reflection/    # 反思系統
├── protfolio/     # 作品集系統
├── AskQuestion/   # 問答系統
├── Rag/           # AI 助手
├── bulletin/      # 公告系統
├── ideaWall/      # 想法牆
├── manageStudent/ # 學生管理
└── submit/        # 繳交系統
```

#### State Management
- **React Query**: API 狀態管理與快取
- **Context API**: 全域狀態共享
- **Local State**: 元件內部狀態管理

#### Routing Configuration
```javascript
// 主要路由配置
<Route path="/" element={<Home />} />
<Route path="/login" element={<Login />} />
<Route path="/kanban/:projectId" element={<Kanban />} />
<Route path="/reflection" element={<Reflection />} />
<Route path="/portfolio" element={<Portfolio />} />
```

## Real-Time Communication

### Socket.io Implementation
本系統採用 **Socket.io** 實現雙向即時通訊：

#### Connection Management
```javascript
// 客戶端連接
const socket = io(SERVER_URL, {
  cors: {
    origin: ['http://localhost'],
    credentials: true
  }
})

// 房間管理
socket.emit('join_room', roomId)
socket.emit('join_project', projectId)
socket.emit('join_QuestionRoom', questionId)
```

#### Message Broadcasting
```javascript
// 訊息發送與接收
socket.emit('send_message', messageData)
socket.on('receive_message', handleMessage)

// 任務即時更新
socket.emit('taskItemCreated', taskData)
socket.on('taskUpdated', updateTaskBoard)
```

#### Application Scenarios
1. **聊天室系統**: 專案團隊即時討論
2. **看板協作**: 多人同時編輯任務看板
3. **問答互動**: 師生即時問答交流
4. **AI 對話**: 與 RAG 系統即時互動
5. **系統通知**: 即時推播重要訊息

## Project Management

### Kanban Board System
基於拖拽式看板的專案管理系統：

#### Core Features
- **Column Management**: 自定義工作流程階段
- **Task Cards**: 豐富的任務資訊管理
- **Drag & Drop**: 直觀的任務狀態更新
- **Real-time Sync**: 多人協作即時同步

#### Database Schema
```javascript
// 看板模型
Kanban: { id, title, description, projectId }
Column: { id, title, position, kanbanId }
Task: { 
  id, title, content, labels, assignees, columnId,
  owner, images, files, image  // 支援多媒體附件
}
```

#### API Endpoints
```
GET    /api/kanban/:projectId     # 取得專案看板
POST   /api/kanban/create         # 建立新看板
PUT    /api/kanban/update/:id     # 更新看板資訊
DELETE /api/kanban/delete/:id     # 刪除看板
```

#### 功能說明與使用場景

**平台角色定位**：
Kanban 看板系統是 SDL 平台的核心專案管理工具，支援科學探究專案的結構化管理和團隊協作。

**使用者操作方式**：
- **學生**：建立研究任務卡片、設定實驗步驟、追蹤進度、分配團隊成員工作、上傳任務相關檔案和圖片
- **教師**：監控學生專案進展、提供指導建議、調整專案里程碑、評估團隊合作效能

**任務卡片詳細功能**：
基於 `Task` 模型，每個任務卡片支援以下資訊管理：
- **基本資訊**：標題 (`title`)、詳細內容 (`content`)、負責人 (`owner`)
- **協作管理**：指派成員 (`assignees`) 以 JSONB 陣列格式儲存成員資訊
- **分類標籤**：標籤系統 (`labels`) 支援多重標籤分類，便於任務篩選和組織
- **多媒體附件**：
  - 單一圖片 (`image`)：BLOB 格式儲存
  - 多張圖片 (`images`)：文字陣列格式儲存圖片路徑
  - 檔案附件 (`files`)：JSONB 陣列格式儲存檔案元資料

**即時協作體驗**：
透過 Socket.io 的 `taskItemCreated` 和 `cardUpdated` 事件，當使用者拖動任務卡片或建立新任務時，其他協作者的看板會即時更新，無需重新整理頁面即可看到最新的專案狀態變化。

**解決的教學痛點**：
- **缺乏專案可視化**：傳統紙本或 Excel 難以即時追蹤專案狀態
- **團隊協作困難**：學生不清楚彼此的工作進度和責任分工
- **進度管理混亂**：缺乏結構化的任務管理流程
- **檔案散佈問題**：任務相關檔案可直接附加在卡片上，避免檔案散落各處

**使用場景範例**：
1. **科學探究專案**：學生團隊進行「水質檢測研究」，將專案分為「文獻調查」、「實驗設計」、「數據收集」、「分析報告」四個階段，每個成員負責不同任務卡片，可在卡片中上傳實驗照片、數據檔案等，教師可即時查看各階段進度。

2. **跨學科整合專案**：「永續城市設計」專案中，學生將任務分為「環境調研」、「建築設計」、「經濟分析」等看板欄位，透過拖拽方式更新任務狀態，團隊成員能清楚看到整體專案推進情況，並在任務卡片中分享設計圖稿和調研報告。

### Portfolio System
學生作品集管理系統：

#### Features
- **Project Showcase**: 專案成果展示
- **Progress Tracking**: 學習進度追蹤
- **Media Management**: 多媒體內容管理
- **Reflection Integration**: 與反思系統整合

#### Implementation
```javascript
// 作品集資料結構 (基於 Submit 模型)
Portfolio: {
  id: Integer,
  stage: String,        // 對應專案階段 (如 "1-1", "2-3")
  content: JSON,        // 結構化內容數據
  fileData: BLOB,       // 檔案二進制數據
  fileName: String,     // 檔案名稱
  projectId: Integer    // 關聯專案ID
}
```

#### 功能說明與使用場景

**平台角色定位**：
Portfolio 系統是學生學習成果的數位展示平台，以專案階段性成果為基礎，促進學習歷程的記錄、反思與分享。

**多媒體內容管理詳細操作**：
基於 `getAllSubmit` API 和 Portfolio 前端實作：
- **檔案上傳處理**：學生可上傳各種類型檔案（文件、圖片、影片等），系統以 BLOB 格式儲存在資料庫
- **內容結構化展示**：提交內容以 JSON 格式儲存，前端解析後提供結構化的編輯和展示介面
- **檔案下載功能**：學生和教師可透過 `downloadFile` 功能下載已上傳的檔案附件
- **內容即時編輯**：透過 `updateSubmitTask` API 支援即時編輯和儲存功能

**與反思系統整合的具體流程**：
- **階段性關聯**：每個作品集項目都對應特定的專案階段（如 `stage: "1-1"`），與每日反思的專案進度形成對應
- **內容交互引用**：學生在撰寫反思時可參考該階段的作品集內容，反思中的學習心得也能豐富作品集的描述
- **教師查看整合視圖**：教師可同時查看學生的階段性成果和對應的反思記錄，獲得完整的學習脈絡

**與繳交系統的關係與互動**：
Portfolio 系統實際上是基於繳交系統 (`Submit`) 的展示層面：
- **數據共享**：兩系統使用相同的 `Submit` 模型和 API 端點
- **功能分工**：
  - 繳交系統：專注於按階段要求提交作業和文件
  - 作品集系統：專注於成果展示和學習歷程整理
- **選擇性展示**：學生可從所有提交記錄中選擇優秀作品加入個人作品集展示
- **內容重新編輯**：透過 `updateSubmitAttachment` 功能，學生可在作品集中重新上傳或修改檔案

**使用者操作方式**：
- **學生**：
  - 查看階段性提交成果，以時間軸方式瀏覽學習歷程
  - 編輯和更新作品內容，重新上傳改進後的檔案
  - 下載自己的歷史提交檔案作為參考
  - 撰寫作品描述和學習心得
- **教師**：
  - 查看學生完整的學習歷程檔案
  - 提供針對性的作品回饋和建議
  - 追蹤學生在各專案階段的表現
  - 發現優秀作品並推薦分享

**解決的教學痛點**：
- **學習成果分散**：系統化整合各階段提交內容，建立完整學習軌跡
- **學習歷程不完整**：結合階段性成果和反思記錄，提供全面的學習歷程視圖
- **同儕學習機會不足**：優秀作品可在平台上展示，促進同儕間的學習交流
- **檔案管理困難**：統一的檔案上傳、儲存和下載機制

**使用場景範例**：
1. **學期末成果展示**：學生查看自己在「環境科學研究」專案中的完整學習歷程，從「1-1 提出研究主題」到「4-3 撰寫研究結論」的所有階段成果，並可重新編輯內容，建立精美的數位作品集供同學和家長瀏覽。

2. **階段性成果檢視**：學生在進行「機器學習專題」時，可在作品集中查看之前階段的提交內容，下載先前上傳的數據檔案進行後續分析，同時回顧自己的學習進步軌跡。

### Idea Wall System
創意發想與分享平台：

#### Core Functionality
- **Idea Posting**: 想法發布與編輯
- **Collaborative Filtering**: 協作式內容篩選
- **Tag Management**: 標籤分類系統
- **Visual Organization**: 視覺化想法整理

#### Database Design
```javascript
IdeaWall: {
  id: Integer,
  content: Text,
  author: String,
  tags: Array,
  likes: Integer,
  type: String,         // "project" 等類型標識
  projectId: Integer,   // 關聯專案ID
  stage: String,        // 對應專案階段
  created_at: Date
}
```

#### 功能說明與使用場景

**平台角色定位**：
Idea Wall 是激發創意思考和促進知識分享的協作平台，支援學生腦力激盪和創意發想過程，與專案階段進度緊密結合。

**專案階段關聯機制**：
基於程式碼實作，Idea Wall 與專案管理系統深度整合：
- **自動建立**：當學生完成某專案階段提交後，系統自動在 Idea Wall 中建立對應該階段的想法區域
- **階段標識**：每個想法都標註對應的專案階段（如 `stage: "1-1"`），便於組織和檢索
- **專案關聯**：所有想法都關聯到特定專案 (`projectId`)，形成專案專屬的創意空間

**使用者操作方式**：
- **學生**：發布創意想法、瀏覽他人點子、點讚支持、標籤分類、參與討論
- **教師**：發起創意主題、引導學生思考、整理優秀想法、促進跨組交流

**解決的教學痛點**：
- **創意發想受限**：傳統課堂討論時間有限，學生想法無法充分表達
- **靈感容易遺失**：課堂上的好點子課後容易被遺忘
- **缺乏創意刺激**：學生缺乏接觸多元想法的機會
- **階段性思考斷層**：不同專案階段的創意想法缺乏連貫性整理

**使用場景範例**：
1. **專題發想階段**：「環保創新設計」課程中，學生在完成「1-1 提出研究主題」階段後，系統自動在 Idea Wall 建立該階段的想法區域，學生發布各種環保點子，如「可分解塑膠袋」、「雨水回收系統」等，透過標籤分類和點讚機制，快速篩選出最具潛力的創意方向。

2. **跨階段創意追蹤**：在「智慧城市設計」專案中，學生可在不同階段（定標、擇策、監評、調節）的 Idea Wall 中持續發布和優化想法，形成完整的創意發展軌跡，同時其他專案團隊也能從中獲得靈感。

## Learning & Reflection Tools

### Daily Reflection System
每日學習反思記錄系統：

#### Features
- **Structured Reflection**: 結構化反思模板
- **Progress Tracking**: 學習進度可視化
- **Goal Setting**: 學習目標設定與追蹤
- **Mentor Feedback**: 導師回饋機制

#### Database Schema
```javascript
DailyPersonal: {
  id: Integer,
  title: String,            // 反思標題
  content: Text,            // 反思內容
  fileData: BLOB,           // 附件檔案數據
  filename: String,         // 檔案名稱
  userId: Integer,          // 使用者ID
  projectId: Integer,       // 專案關聯
  createdAt: Date,
  updatedAt: Date
}

DailyTeam: {
  id: Integer,
  title: String,            // 團隊反思標題
  content: Text,            // 團隊反思內容
  creator: String,          // 建立者名稱
  fileData: BLOB,           // 附件檔案數據
  filename: String,         // 檔案名稱
  userId: Integer,          // 建立者ID
  projectId: Integer,       // 專案關聯
  createdAt: Date,
  updatedAt: Date
}
```

#### API Integration
```
GET  /api/daily/personal     # 取得個人反思記錄
POST /api/daily/personal     # 建立個人反思
PUT  /api/daily/personal/:id # 更新個人反思
GET  /api/daily/team         # 取得團隊反思記錄
POST /api/daily/team         # 建立團隊反思
PUT  /api/daily/team/:id     # 更新團隊反思
```

#### 功能說明與使用場景

**平台角色定位**：
Daily Reflection 系統是促進深度學習和自我覺察的核心工具，支援學生建立持續反思的學習習慣。

**結構化反思模板詳細說明**：
基於前端實作 (`Reflection.jsx`)，系統提供以下結構化引導：
- **反思提示系統**：透過 `isTooltipVisible` 功能提供反思引導問題和提示
- **標題與內容分離**：強制要求填寫反思標題 (`title`) 和詳細內容 (`content`)
- **多媒體支援**：支援在反思中上傳相關檔案，如實驗照片、學習筆記、心智圖等
- **即時編輯功能**：支援反思內容的即時修改和更新，透過 `updatePersonalDaily` 實現
- **輪播展示**：個人和團隊反思以視覺化輪播方式展示，提升閱讀體驗

**檔案附件功能詳細操作**：
基於 `controllers/daily.js` 的檔案處理邏輯：
- **檔案上傳處理**：使用 `multer` 中介軟體處理檔案上傳，支援多檔案同時上傳
- **檔案格式支援**：系統以 BLOB 格式儲存檔案數據，支援圖片、文件、音頻等多種格式
- **檔案下載功能**：學生和教師可下載反思中的附件檔案，便於離線查看
- **檔案關聯管理**：每個檔案都與對應的反思記錄關聯，確保檔案組織的有序性

**使用者操作方式**：
- **學生**：
  - 撰寫個人每日學習心得，包含標題和詳細內容
  - 上傳學習相關檔案（實驗照片、筆記掃描、作品檔案等）
  - 參與團隊反思討論，記錄團隊合作心得
  - 查看和編輯歷史反思記錄，追蹤學習進度
- **教師**：
  - 查看所有學生的個人反思內容（透過 `isTeacher` 參數）
  - 瀏覽團隊反思記錄，了解小組合作狀況
  - 下載學生上傳的學習檔案進行評估
  - 透過反思內容發現學習困難點並提供個別指導

**學習進度可視化**：
- **時間軸展示**：反思記錄按時間順序展示，形成學習歷程時間軸
- **輪播瀏覽**：透過拖拽輪播功能 (`onDragEnd`, `TeamOnDragEnd`) 快速瀏覽歷史反思
- **內容統計**：系統統計反思頻率和內容豐富度，提供學習活躍度指標

**導師回饋機制**：
基於權限管理系統，教師可：
- 查看學生反思內容並提供書面回饋
- 透過聊天系統進行即時指導討論
- 在反思記錄中標記重要學習節點
- 追蹤學生學習困難的解決進展

**解決的教學痛點**：
- **缺乏反思習慣**：結構化模板和提示系統引導學生養成反思習慣
- **學習盲點難發現**：教師可透過反思內容了解每個學生的真實學習狀況
- **目標設定不明確**：反思模板引導學生明確學習目標和計畫
- **學習檔案分散**：統一的檔案管理機制確保學習資料的完整性

**使用場景範例**：
1. **科學實驗課後反思**：學生完成「化學反應」實驗後，在系統中填寫反思標題「酸鹼反應實驗心得」，詳細記錄實驗觀察、理論連結、操作困難等，同時上傳實驗照片和數據記錄表，教師透過反思內容發現學生對「平衡概念」理解不足，適時調整教學重點。

2. **專題研究歷程記錄**：學生進行「在地文化調查」專題時，每週撰寫研究進展反思，上傳訪談錄音、照片資料等，記錄遇到的挑戰和解決方法，建立完整的研究歷程檔案，有助於最終報告的撰寫和經驗總結。

### Question & Answer System
互動式問答學習平台：

#### System Architecture
- **Question Management**: 問題建立與分類
- **Real-time Discussion**: 即時討論串
- **Expert System**: 專家回答機制
- **Knowledge Base**: 知識庫累積

#### Implementation Details
```javascript
Question: {
  id: Integer,
  title: String,
  content: Text,
  category: String,
  status: Enum,
  authorId: Integer
}

QuestionMessage: {
  id: Integer,
  message: Text,
  author: String,
  questionId: Integer,
  timestamp: Date
}
```

#### 功能說明與使用場景

**平台角色定位**：
Q&A 系統是促進師生互動和同儕學習的知識交流平台，支援即時問答和協作學習。

**即時討論串實現方式**：
基於 Socket.io 的即時通訊機制：
- **房間加入**：使用者透過 `join_QuestionRoom` 事件加入特定問題的討論室
- **訊息廣播**：透過 `send_QuestionMessage` 和 `receive_QuestionMessage` 事件實現即時問答
- **訊息持久化**：所有問答訊息透過 `QuestionMessage` 模型儲存到資料庫
- **通知機制**：新問題和新回答會即時通知相關使用者

**專家回答機制運作方式**：
- **角色識別**：系統根據使用者角色 (`role: TEACHER`) 標識專家答案
- **優先顯示**：教師回答在討論串中優先顯示或特殊標記
- **權威性標註**：專家答案具有特殊的視覺標識，提升答案可信度
- **知識驗證**：教師可驗證學生回答的正確性，形成可靠的知識來源

**知識庫累積機制**：
- **問答分類**：透過 `category` 欄位將問答按學科或主題分類
- **搜尋功能**：使用者可按關鍵字搜尋歷史問答記錄
- **標籤系統**：為常見問題建立標籤，便於快速檢索
- **精華整理**：系統定期整理高品質問答作為知識庫內容

**使用者操作方式**：
- **學生**：提出學習疑問、回答同學問題、搜尋相關解答、參與討論串
- **教師**：解答學生問題、引導深度思考、整理常見問題、建立知識庫

**解決的教學痛點**：
- **問題累積效應**：即時問答機制避免學生問題積累影響學習
- **重複解答浪費**：知識庫功能減少相同問題的重複解答
- **同儕學習不足**：促進學生互相幫助解決問題的協作學習

**使用場景範例**：
1. **數學解題討論**：學生遇到複雜的數學證明題，在 Q&A 系統發問並附上解題步驟，透過 Socket.io 即時通訊，其他同學和老師可以即時回應、提供不同解法，形成活躍的協作學習討論串。

2. **課後延伸學習**：「生物課」學習細胞分裂後，學生對「癌細胞異常分裂」產生好奇，在系統提問，教師提供延伸資料，其他對此有興趣的同學也加入討論，透過分類標籤將相關問答整理為「細胞生物學」知識庫，供未來學習參考。

## Project Stage-Guided Learning System
專案階段式引導系統：

### Core Architecture
基於科學探究方法論的結構化學習引導系統：

#### System Components
```javascript
// 專案流程架構
Process: {
  id: Integer,
  stage: Array,           // 主階段ID陣列
  projectId: Integer      // 關聯專案
}

// 主階段定義
Stage: {
  id: Integer,
  name: String,           // 階段名稱 (定標/擇策/監評/調節/學習歷程)
  sub_stage: Array,       // 子階段ID陣列
  processId: Integer      // 關聯流程
}

// 子階段詳細設定
Sub_stage: {
  id: Integer,
  name: String,           // 子階段名稱
  description: Text,      // 階段目標與說明
  userSubmit: JSON,       // 提交要求定義
  stageId: Integer        // 關聯主階段
}

// 學生提交記錄
Submit: {
  id: Integer,
  stage: String,          // 階段標識 (如 "1-1", "2-3")
  content: JSON,          // 提交內容
  fileData: BLOB,         // 檔案數據
  fileName: String,       // 檔案名稱
  projectId: Integer      // 關聯專案
}
```

#### Stage Framework (五階段架構)
基於 `controllers/project.js` 的系統初始化：

**1. 定標階段 (Goal Setting)**
- 1-1: 提出研究主題
- 1-2: 提出研究目的  
- 1-3: 提出研究問題

**2. 擇策階段 (Strategy Selection)**
- 2-1: 訂定研究構想表
- 2-2: 設計研究記錄表格
- 2-3: 規劃研究排程

**3. 監評階段 (Monitoring & Evaluation)**
- 3-1: 進行嘗試性研究
- 3-2: 分析資料與繪圖
- 3-3: 撰寫研究結果

**4. 調節階段 (Adjustment)**
- 4-1: 檢視研究進度
- 4-2: 進行研究討論
- 4-3: 撰寫研究結論

**5. 學習歷程階段 (Portfolio Development)**
- 5-1: 封面製作
- 5-2: 摘要撰寫
- 5-3: 目錄編制
- 5-4: 內容撰寫
- 5-5: 反思撰寫

### User Submit Requirements
每個子階段的具體提交要求 (基於 `userSubmit` JSON 結構)：

#### 階段 1-1 範例：提出研究主題
```javascript
userSubmit: {
  "提議主題": "input",      // 文字輸入框
  "主題來源": "input",      // 文字輸入框
  "提議原因": "textarea",   // 文字區域
  "附加檔案": "file"        // 檔案上傳
}
```

#### 階段 2-2 範例：設計研究記錄表格
```javascript
userSubmit: {
  "研究紀錄表格": "file"    // 檔案上傳
}
```

### Frontend Implementation
基於 `SubStageBar.jsx` 的階段引導介面：

#### Stage Progress Visualization
- **階段進度條**：視覺化顯示五個主階段的完成狀態
- **子階段指示器**：當前階段的詳細子步驟展示
- **顏色編碼系統**：
  - 當前階段：`#5BA491` (綠色，動態脈衝效果)
  - 已完成階段：`#7C968F` (深綠色)
  - 未完成階段：`#BEBEBE` (灰色)

#### AI Learning Assistant Integration
智慧學習助手功能：
- **DialogBox 系統**：提供階段引導和說明
- **階段目標說明**：根據當前階段提供具體目標描述
- **階段執行指導**：提供該階段的具體操作建議
- **打字機效果**：漸進式文字顯示提升使用體驗

### 功能說明與使用場景

**平台角色定位**：
專案階段式引導系統是 SDL 平台的核心功能，提供結構化的科學探究學習路徑，確保學生能循序漸進地完成研究專案。

**使用者操作方式（學生）**：

**階段導航與提交**：
- 透過 `SubStageBar` 元件查看當前所在階段和整體進度
- 根據子階段的 `description` 了解該階段的學習目標和要求
- 按照 `userSubmit` 定義填寫對應的表單內容（文字輸入、文章撰寫、檔案上傳）
- 完成提交後系統自動推進到下一子階段或主階段

**智慧引導互動**：
- 點擊 AI 助手機器人圖標獲得當前階段的詳細說明
- 透過對話框選擇「階段目標說明」或「階段如何進行」獲得具體指導
- 根據 `stageGoal` 和 `stageProcess` 陣列內容獲得階段化的學習建議

**進度追蹤**：
- 透過 `getAllSubmit` API 查看所有階段的提交記錄
- 在作品集系統中瀏覽階段性成果展示
- 追蹤個人學習進程和完成度

**使用者操作方式（教師）**：

**進度監控**：
- 查看學生在各專案階段的提交狀況和內容品質
- 透過 `getProject` API 監控專案的 `currentStage` 和 `currentSubStage`
- 評估學生是否按既定時程推進專案

**指導與回饋**：
- 檢視學生各階段的提交內容，提供針對性指導
- 透過聊天系統和反思系統與學生討論專案進展
- 協助學生調整研究方向和方法

**系統設定與客製化**：
- 根據課程需求調整階段要求和提交規格
- 設定階段通過標準和評估指標

**與其他系統的整合**：

**作品集系統整合**：
- 每個階段的提交自動成為作品集的一部分
- 學生可選擇性地將優秀階段成果加入個人作品集展示
- 透過 `updateSubmitTask` 和 `updateSubmitAttachment` 功能持續優化提交內容

**Idea Wall 關聯**：
- 完成階段提交後自動在 Idea Wall 建立對應階段的想法區域
- 鼓勵學生在各階段分享創意想法和心得

**反思系統連結**：
- 階段性學習反思與專案進度形成對應關係
- 學生可在反思中回顧和分析各階段的學習收穫

**解決的教學痛點**：
- **專案引導不足**：提供結構化的科學探究流程，避免學生在研究中迷失方向
- **進度追蹤困難**：系統化的階段管理讓教師能即時掌握學生進度
- **學習目標模糊**：每個階段都有明確的目標說明和執行指導
- **成果展示分散**：整合各階段成果形成完整的學習歷程檔案

**使用場景範例**：

1. **環境科學研究專案**：學生進行「校園空氣品質調查」研究，從 1-1 階段的「提出研究主題」開始，系統引導學生明確研究範圍，在 2-2 階段「設計研究記錄表格」時上傳數據收集表格，到 3-2 階段「分析資料與繪圖」時提交數據分析結果和圖表，最終在 5-5 階段完成完整的研究歷程反思。

2. **跨學科創新專題**：「智慧農業系統設計」專案中，學生團隊按階段完成從問題定義、解決方案設計、原型製作到成果評估的完整創新流程，每個階段的提交要求確保專案的系統性和完整性，AI 助手在各階段提供具體的執行建議。

## Communication Tools

### Chat System
多功能即時通訊系統：

#### Room Types
1. **Project Rooms**: 專案團隊討論室
2. **Public Channels**: 公共頻道交流
3. **Private Messages**: 私人訊息系統
4. **Study Groups**: 學習小組討論

#### Message Features
- **Rich Text Support**: 支援豐富文本格式
- **File Sharing**: 檔案分享功能
- **Message History**: 訊息歷史記錄
- **Notification System**: 訊息通知機制

#### Database Design
```javascript
ChatroomMessage: {
  id: Integer,
  message: Text,
  author: String,
  userId: Integer,
  projectId: Integer,
  timestamp: Date,
  message_type: Enum
}
```

#### 功能說明與使用場景

**平台角色定位**：
Chat 系統是平台的即時溝通樞紐，促進學習社群的形成和維持，支援多元化的學習互動需求。

**房間類型詳細功能**：
1. **Project Rooms (專案討論室)**：
   - 自動與專案 ID 關聯，專案成員自動加入對應聊天室
   - 支援專案相關檔案分享和討論
   - 教師可隨時加入提供專業指導
   
2. **Public Channels (公共頻道)**：
   - 全校性的學習討論區
   - 支援跨班級、跨年級的學術交流
   - 知識分享和經驗交流平台

3. **Private Messages (私人訊息)**：
   - 一對一師生諮詢通道
   - 個人學習問題的私密討論
   - 敏感議題的保密溝通

4. **Study Groups (學習小組)**：
   - 自發性學習群組的溝通平台
   - 讀書會、興趣小組的討論空間
   - 同儕互助學習的組織工具

**檔案分享功能詳細說明**：
基於 Socket.io 的即時檔案傳輸：
- **多格式支援**：文件、圖片、影片、音頻等各類學習資源
- **即時傳輸**：檔案上傳後立即同步到聊天室所有成員
- **檔案預覽**：支援常見格式的線上預覽功能
- **下載管理**：完整的檔案下載和儲存機制

**使用者操作方式**：
- **學生**：參與專案討論、加入學習群組、私訊請教問題、分享學習資源
- **教師**：指導專案進行、發布重要通知、提供即時協助、促進學生互動

**解決的教學痛點**：
- **溝通管道分散**：統一的聊天平台整合所有學習相關討論
- **非同步學習困難**：即時通訊機制支援課外時間的學習協助
- **團隊協作效率低**：專案聊天室提供高效的團隊溝通工具
- **檔案分享複雜**：簡化的檔案分享機制促進資源流通

**使用場景範例**：
1. **專題小組討論**：「永續能源研究」小組成員課後在專案聊天室討論實驗設計、分享參考資料、協調工作分工，教師可隨時加入提供專業建議，小組成員即時分享實驗照片和數據檔案。

2. **線上讀書會**：學生自發組成「程式設計讀書會」群組，分享學習心得、討論程式問題、互相督促學習進度，形成良好的同儕學習氛圍，並在群組中分享程式碼檔案和學習資源。

### AI Assistant (RAG)
基於檢索增強生成的 AI 學習助手：

#### RAG Architecture
```
User Query → Document Retrieval → Context Enhancement → AI Response
```

#### Core Features
- **Contextual Understanding**: 上下文理解能力
- **Knowledge Retrieval**: 知識庫檢索功能
- **Personalized Responses**: 個人化回答生成
- **Learning Analytics**: 學習分析與建議

#### API Integration
```javascript
// RAGFlow API 整合
const API_KEY = "ragflow-xxxxx"
const RAG_ENDPOINT = "/proxy/api/v1/chat"

// 訊息處理流程
socket.on('rag_message', async (data) => {
  if (data.messageType === 'input') {
    // 儲存用戶輸入
    const message = await RagMessage.create({
      input_message: data.message,
      userId: data.creator,
      sessionId: data.sessionId
    })
  } else if (data.messageType === 'response') {
    // 更新 AI 回應
    await RagMessage.update({
      response_message: data.message,
      ragflow_session_id: data.ragflowSessionId
    }, { where: { id: data.messageId } })
  }
})
```

#### Session Management
- **Context Preservation**: 對話上下文保持
- **Multi-turn Dialogue**: 多輪對話支援
- **User Personalization**: 使用者個人化設定

#### 功能說明與使用場景

**平台角色定位**：
AI Assistant 是學生的智慧學習夥伴，提供 24/7 的學習支援，特別針對科學探究和自主學習需求設計。

**上下文理解與個人化回應詳細機制**：
基於 RAGFlow 系統和會話管理：
- **會話記憶**：透過 `sessionId` 保持同一對話的上下文連貫性
- **使用者識別**：根據 `userId` 和 `userName` 提供個人化的回應風格
- **專案關聯**：結合學生當前專案階段調整回答內容的深度和方向
- **學習歷程分析**：基於學生的反思記錄和提交歷史提供個性化建議

**知識來源與檢索機制**：
- **課程資料庫**：整合平台上的學習資源和教材內容
- **學術知識庫**：連接外部學術資料庫和參考資料
- **專案知識**：基於平台內學生的優秀作品和案例
- **即時更新**：持續學習和更新知識庫內容

**學習分析與建議功能**：
基於 `RagMessage` 模型的對話記錄分析：
- **學習模式識別**：分析學生的提問模式和學習習慣
- **知識盲點偵測**：識別學生經常詢問的概念或方法
- **進度建議**：根據專案階段提供下一步學習建議
- **資源推薦**：基於學習需求推薦相關資源和案例

**使用者操作方式**：
- **學生**：提問學習疑問、請求概念解釋、尋求研究建議、獲得學習資源推薦
- **教師**：了解學生常見問題、獲得教學建議、分析學習困難點、優化課程設計

**解決的教學痛點**：
- **即時協助需求**：24/7 可用的智慧助手解決課外學習困難
- **個別化學習困難**：AI 能同時滿足多個學生的個別學習需求
- **基礎概念薄弱**：提供深入淺出的概念解釋和實例說明
- **研究方法指導**：提供系統性的研究方法論指導

**使用場景範例**：
1. **科學概念理解**：學生在學習「量子物理」時對「波粒二象性」概念困惑，AI 助手基於學生的學習歷程和當前專案背景，提供適合其理解程度的解釋、相關實驗範例和延伸閱讀建議，並記住這次對話內容以便後續提供相關支援。

2. **研究方法指導**：學生進行「水污染調查」專題時，向 AI 助手詢問合適的檢測方法，系統結合學生當前的專案階段（如 2-1 訂定研究構想表），提供結構化的研究方法建議、數據分析技巧和文獻搜尋策略，並根據學生的反饋持續優化建議內容。

## Announcement System

### Core Functionality
全平台公告發佈與管理系統：

#### Features
- **Multi-level Announcements**: 多層級公告分類
- **Targeted Distribution**: 目標族群推播
- **Read Status Tracking**: 閱讀狀態追蹤
- **Rich Content Support**: 豐富內容格式支援

#### Database Schema
```javascript
Announcement: {
  id: Integer,
  title: String,
  content: Text,
  priority: Enum,        // HIGH, MEDIUM, LOW
  target_audience: Array, // 目標受眾
  publish_date: Date,
  expire_date: Date,
  is_active: Boolean,
  created_by: Integer
}
```

#### API Endpoints
```
GET    /api/announcements         # 取得公告列表
POST   /api/announcements         # 建立新公告
PUT    /api/announcements/:id     # 更新公告
DELETE /api/announcements/:id     # 刪除公告
```

#### Notification Integration
- **Real-time Push**: 即時推播通知
- **Email Integration**: 電子郵件通知
- **In-app Notifications**: 應用內通知系統

#### 功能說明與使用場景

**平台角色定位**：
Announcement 系統是平台的資訊發佈中心，確保重要訊息能有效傳達給目標使用者群體。

**目標族群推播詳細機制**：
基於使用者角色和專案關聯的精準推播：
- **角色分類**：依據 `role` (STUDENT, TEACHER, ADMIN) 進行分眾推播
- **專案群組**：針對特定專案成員發送專案相關通知
- **年級分類**：按學年或班級進行分群推播
- **個人推播**：針對特定使用者的個人化通知

**閱讀狀態追蹤功能**：
- **已讀統計**：發布者可查看公告的已讀人數和比例
- **未讀提醒**：系統會提醒使用者查看未讀公告
- **閱讀時間記錄**：記錄使用者閱讀公告的詳細時間
- **回饋收集**：支援公告回覆和確認收到功能

**使用者操作方式**：
- **學生**：接收課程通知、查看活動公告、確認重要訊息、設定通知偏好
- **教師**：發布課程通知、公告作業要求、分享活動資訊、追蹤訊息觸及率

**解決的教學痛點**：
- **訊息傳達不確實**：閱讀狀態追蹤確保重要通知的有效傳達
- **訊息管理混亂**：統一的公告平台整合所有重要資訊
- **溝通效率低落**：自動化推播機制提升溝通效率
- **目標不精準**：分眾推播避免資訊噪音問題

**使用場景範例**：
1. **重要課程異動**：因疫情影響需將實體課程改為線上進行，教師透過 Announcement 系統發布高優先級公告，系統自動推播給所有修課學生，並即時追蹤已讀狀態，確保每位學生都收到異動通知。

2. **專題發表活動**：學期末舉辦「科學專題成果展」，教師發布活動公告包含時間、地點、評分標準等詳細資訊，針對參與專案的學生進行精準推播，學生可在系統中確認參與意願並提供回饋。

## System Integration & File Management
整體功能協同與檔案管理：

### Cross-Module Integration
不同功能模組間的協同運作機制：

#### Project-Centric Integration
以專案為核心的功能整合：
- **專案建立連鎖效應**：建立專案時自動初始化 Kanban 看板、Idea Wall 區域、專案聊天室
- **階段進度同步**：完成專案階段提交時自動更新看板任務、建立對應 Idea Wall 區域
- **成果自動歸檔**：階段性提交自動加入作品集系統，形成完整學習歷程

#### Learning Activity Linkage
學習活動間的有機連結：
- **反思與作品集關聯**：學生反思記錄與對應專案階段的作品形成交互參照
- **問答與知識累積**：Q&A 系統中的優質問答自動納入 AI 助手的知識庫
- **聊天與協作同步**：聊天室中的重要討論可轉化為看板任務或專案提交

#### Real-time Synchronization
即時同步機制：
- **多端數據一致性**：所有功能模組共享即時數據更新
- **跨模組通知**：重要事件（如階段完成、新公告）在相關模組中同步顯示
- **協作狀態同步**：團隊成員的操作狀態在各模組中即時反映

### Unified File Management System
統一檔案管理架構：

#### Storage Architecture
```javascript
// 統一檔案儲存結構
FileStorage: {
  daily_file/           // 統一檔案目錄
  ├── reflections/      // 反思檔案
  ├── submissions/      // 專案提交檔案  
  ├── portfolio/        // 作品集檔案
  ├── kanban/          // 看板任務檔案
  └── chat/            // 聊天檔案分享
}
```

#### File Handling Mechanisms
基於各控制器的檔案處理邏輯：

**檔案上傳統一處理**：
- **Multer 中介軟體**：統一的檔案上傳處理機制
- **BLOB 資料庫儲存**：檔案以二進制格式儲存在 PostgreSQL
- **檔案元資料管理**：檔案名稱、類型、大小等資訊的結構化儲存

**跨模組檔案存取**：
- **檔案關聯機制**：每個檔案都關聯到對應的功能模組和記錄
- **權限控制**：基於使用者角色和專案關係的檔案存取權限
- **版本管理**：支援檔案的更新和歷史版本追蹤

**檔案檢索與下載**：
- **統一下載介面**：所有模組共享的檔案下載機制
- **檔案預覽功能**：支援常見格式的線上預覽
- **檔案搜尋功能**：基於檔案名稱和內容的搜尋機制

#### File Lifecycle Management
檔案生命週期管理：

**檔案分類與組織**：
- **專案關聯分類**：檔案按所屬專案自動分類歸檔
- **時間順序排列**：按上傳時間形成檔案時間軸
- **標籤分類系統**：支援自定義標籤的檔案分類

**儲存優化與清理**：
- **重複檔案偵測**：避免相同檔案的重複儲存
- **過期檔案管理**：自動清理過期或無效檔案
- **儲存容量監控**：監控儲存使用情況並提供優化建議

### User Experience Continuity
使用者體驗連貫性：

#### Navigation Consistency
導航一致性設計：
- **統一側邊欄**：所有功能模組共享一致的導航介面
- **麵包屑導航**：清楚顯示使用者在系統中的位置
- **快速切換功能**：在不同模組間快速切換的便利機制

#### Data Context Preservation
數據脈絡保持：
- **跨模組數據共享**：使用者在不同模組中的操作數據保持連貫
- **學習進度追蹤**：統一的學習進度顯示機制
- **個人化設定同步**：使用者偏好設定在所有模組中保持一致

#### Collaborative Experience
協作體驗優化：
- **即時狀態顯示**：團隊成員的線上狀態和操作狀態即時顯示
- **協作歷史追蹤**：完整記錄團隊協作的歷史軌跡
- **衝突解決機制**：多人同時編輯時的衝突檢測和解決

這種深度整合的設計確保了 SDL 平台不僅是功能模組的簡單集合，而是一個有機統一的學習生態系統，為使用者提供流暢、連貫的學習體驗。

---

## 總結

SDL Fullstack Remix 平台透過深度整合的功能模組設計，為自主學習和科學探究提供了完整的數位學習環境。從專案階段式引導系統的結構化學習路徑，到即時溝通與協作工具的無縫整合，平台確保了學習過程的連貫性和教學效果的最大化。

### 核心價值
- **結構化學習支援**：五階段科學探究框架提供明確的學習路徑
- **多元化功能整合**：看板管理、反思系統、作品集、問答平台等功能深度整合
- **即時協作環境**：Socket.io 支援的即時通訊與協作功能
- **智慧化學習輔助**：AI 助手提供個人化的學習支援和指導
- **完整學習歷程記錄**：從日常反思到階段性成果的全方位記錄

### 技術特色
- **微服務架構**：Docker Compose 統一管理的彈性部署架構
- **即時通訊技術**：基於 Socket.io 的高效能即時協作
- **統一檔案管理**：BLOB 資料庫儲存配合多模組檔案共享
- **響應式設計**：React + TailwindCSS 的現代化使用者介面
- **安全認證機制**：JWT + 角色權限控制的安全架構

本平台為教育工作者和學習者提供了一個功能完整、技術先進的數位學習解決方案，特別適合需要結構化指導和協作學習的科學探究及專案式學習環境。

---

*本文件基於實際程式碼實作撰寫，詳細描述了平台各功能模組的具體運作方式和使用場景，旨在為技術團隊和教育研究者提供全面的平台功能參考。* 