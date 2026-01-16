# AGENTS.md

> 給 AI 編碼代理的開發指南 - "Talk is cheap. Show me the code."

本文檔為 AI 編碼代理(如 Claude Code、Cursor、Copilot)提供開發規範。SDL 是一個全端學習平台,採用 React + Node.js + PostgreSQL + Socket.IO 架構。

---

## 📦 專案結構

```
/home/richie1129/SDLs_fullStack_remix/
├── sdl-frontend-main/     # React 18 + Vite 5 + TailwindCSS
├── sdl-backend-main/      # Node.js + Express + Sequelize ORM
├── docker-compose.yml     # Docker 服務編排
├── CLAUDE.md             # 完整專案文檔(必讀!)
└── DESIGN_SYSTEM.md      # 設計系統規範(前端必讀!)
```

---

## 🚀 常用指令

### 啟動服務

```bash
# 啟動所有服務 (Docker)
docker compose up -d

# 本地開發模式
docker-compose -f docker-compose.dev.yml up --build

# 查看服務狀態
docker compose ps

# 查看日誌
docker compose logs -f api      # 後端
docker compose logs -f front    # 前端
```

### 前端開發 (sdl-frontend-main/)

```bash
cd sdl-frontend-main

# 安裝依賴
npm install

# 啟動開發伺服器 (熱重載)
npm run dev             # http://localhost:5173

# 建構生產版本
npm run build

# 執行所有測試
npm test

# 執行單次測試
npm run test:run

# 執行特定測試檔案
npm test -- stageManager.test.js

# 執行測試並顯示覆蓋率
npm test -- --coverage
```

### 後端開發 (sdl-backend-main/)

```bash
cd sdl-backend-main

# 安裝依賴
npm install

# 啟動開發伺服器 (nodemon 熱重載)
npm run dev             # http://localhost:3000

# 啟動生產伺服器
npm start

# 資料庫遷移
npm run migrate              # 執行所有遷移
npm run migrate:undo         # 回滾最後一次遷移
npm run migrate:status       # 查看遷移狀態

# MinIO 測試
npm run test-minio          # 測試 MinIO 連線
```

### 資料庫操作

```bash
# 進入 PostgreSQL 容器
docker compose exec postgres psql -U postgres -d postgres

# 查看所有資料表
docker compose exec postgres psql -U postgres -d postgres -c "\dt"

# 備份資料庫
docker compose exec postgres pg_dump -U postgres postgres > backup.sql
```

---

## 📋 程式碼風格規範

### 檔案命名規則

- **React 元件**: PascalCase (`StudentDashboard.jsx`, `GlobalErrorBoundary.jsx`)
- **函式/服務**: camelCase (`auditService.js`, `streamingService.js`)
- **常數**: UPPER_SNAKE_CASE (`FIVE_R_FRAMEWORK`, `API_BASE_URL`)
- **路由/模型**: kebab-case 或 camelCase (`user.js`, `chatroom_message.js`)

### Import 規範

**前端 (React)**:
```jsx
// ✅ 正確：按來源分組排序
import React from 'react';                          // 1. React 核心
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';     // 2. 第三方套件
import axios from 'axios';

import GlobalErrorBoundary from '../../components/ErrorBoundary/GlobalErrorBoundary';  // 3. 本地元件
import errorReportingService from '../../services/errorReportingService';              // 4. 本地服務
import { API_BASE_URL } from '../../config/constants';                                 // 5. 常數/配置
```

**後端 (Node.js)**:
```javascript
// ✅ 正確：按來源分組排序
const express = require('express');              // 1. Node.js 內建模組
const crypto = require('crypto');

const bcrypt = require('bcrypt');                // 2. 第三方套件
const jwt = require('jsonwebtoken');

const User = require('../models/user');          // 3. 本地模組
const auditService = require('../services/auditService');
const { validateToken } = require('../middlewares/AuthMiddleware');
```

### 函式與元件規範

**React 元件**:
```jsx
// ✅ 推薦：函式式元件 + Hooks
function StudentDashboard() {
  const [students, setStudents] = useState([]);
  
  useEffect(() => {
    fetchStudents();
  }, []);
  
  return (
    <div className="p-component-md">
      {/* 內容 */}
    </div>
  );
}

export default StudentDashboard;
```

**後端控制器**:
```javascript
// ✅ 推薦：async/await + 完整錯誤處理
async function getUsers(req, res) {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'email', 'role'],
      order: [['createdAt', 'DESC']]
    });
    
    res.status(200).json(users);
  } catch (error) {
    console.error('❌ 獲取用戶列表失敗:', error);
    res.status(500).json({ 
      error: '伺服器錯誤',
      message: error.message 
    });
  }
}
```

---

## 🎨 前端設計規範 (必須遵守!)

### 間距系統 - 使用語意化 Token

```jsx
// ❌ 錯誤：使用固定數值
<div className="p-3 gap-4 mb-6">

// ✅ 正確：使用語意化 Token
<div className="p-component-sm gap-stack-sm mb-stack-md">
```

**常用 Token**:
- 內邊距: `p-component-xs/sm/md/lg/xl` (8px/12px/20px/32px/40px)
- 間距: `gap-stack-xs/sm/md/lg/xl` (8px/16px/24px/40px/64px)
- 按鈕: `px-btn-x py-btn-y` (16px/8px)

### 字體系統 - 語意化字體大小

```jsx
// ✅ 正確：使用語意化字體大小
<h1 className="text-h1 font-serif">頁面標題</h1>
<h2 className="text-h2">區塊標題</h2>
<p className="text-body font-serif">正文內容（中文使用 serif）</p>
<button className="text-ui">按鈕文字（UI 控制）</button>
<span className="text-caption">說明文字</span>
```

### Hover 效果規範

```jsx
// ❌ 錯誤：使用 scale 或 translate（會造成佈局位移）
<button className="hover:scale-105 hover:-translate-y-1">

// ✅ 正確：只使用顏色和陰影
<button className="
  bg-customgreen
  hover:bg-customgreen/90
  hover:shadow-lg
  transition-shadow duration-fast
">
```

### 響應式設計 - 不可跳過斷點

```jsx
// ❌ 錯誤：跳過 md 斷點
<div className="grid-cols-2 lg:grid-cols-5">

// ✅ 正確：平滑過渡
<div className="grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
```

**斷點**: xs (< 640px) → sm (≥ 640px) → md (≥ 768px) → lg (≥ 1024px) → xl (≥ 1280px)

### 動畫速度 - 標準化 Token

```jsx
// ✅ 使用標準化速度
<div className="transition-colors duration-fast">      // 150ms - Hover 微互動
<div className="transition-opacity duration-normal">   // 250ms - Modal 淡入淡出
<div className="transition-transform duration-slow">   // 400ms - Drawer 滑動
```

---

## 🔒 錯誤處理規範

### 前端錯誤處理

```jsx
// ✅ 使用 Error Boundary 包裹元件
import GlobalErrorBoundary from './components/ErrorBoundary/GlobalErrorBoundary';

function App() {
  return (
    <GlobalErrorBoundary>
      <YourComponent />
    </GlobalErrorBoundary>
  );
}

// ✅ API 呼叫錯誤處理
async function fetchData() {
  try {
    const response = await axios.get('/api/users');
    setData(response.data);
  } catch (error) {
    console.error('❌ 獲取資料失敗:', error);
    toast.error('無法載入資料，請稍後再試');
  }
}
```

### 後端錯誤處理

```javascript
// ✅ 所有 API 端點必須有 try-catch
router.post('/create', validateToken, async (req, res) => {
  try {
    // 業務邏輯
    const result = await Model.create(req.body);
    
    // 審計記錄（關鍵操作）
    await auditService.logAction({
      actorId: req.user.id,
      action: 'create',
      targetType: 'Model',
      targetId: result.id
    });
    
    res.status(201).json(result);
  } catch (error) {
    console.error('❌ 建立失敗:', error);
    res.status(500).json({ 
      error: '操作失敗', 
      message: error.message 
    });
  }
});
```

---

## 🔌 Socket.IO 規範

### 事件命名規則

- **客戶端發送**: 動詞形式 (`createTask`, `updateColumn`, `sendMessage`)
- **伺服器廣播**: 過去式 (`taskCreated`, `columnUpdated`, `messageReceived`)
- **AI 事件**: 命名空間格式 (`aiCoach:query`, `aiCoach:response`)

### Socket 事件處理器

```javascript
// ✅ 使用統一的事件處理器模式
class MessageHandler {
  static registerEvents(io, socket) {
    SocketHandlerFactory.registerSimpleEvent(
      socket,
      'send_message',
      this.handleChatMessage
    );
  }
  
  static async handleChatMessage(data) {
    try {
      // 存儲訊息
      await Chatroom_message.create({
        message: data.message,
        author: data.author,
        userId: data.creator,
        projectId: data.room
      });
      
      // 廣播給房間其他成員
      this.socket.to(data.room).emit("receive_message", data);
    } catch (error) {
      console.error("❌ 保存訊息失敗:", error);
      this.socket.emit("message_error", { error: error.message });
    }
  }
}
```

---

## 📖 必讀文件

在修改程式碼前，必須閱讀以下文件：

1. **CLAUDE.md** - 完整專案概述、架構設計、常用指令
2. **DESIGN_SYSTEM.md** (sdl-frontend-main/) - 前端設計系統規範
3. **Reference/AI_ASSISTANT_GUIDE.md** - AI 助理系統使用指南
4. **Reference/SESSION_FIX_IMPLEMENTATION.md** - Session 管理實作

---

**最後更新**: 2026-01-16  
**版本**: v3.0  
**維護者**: SDL 開發團隊
