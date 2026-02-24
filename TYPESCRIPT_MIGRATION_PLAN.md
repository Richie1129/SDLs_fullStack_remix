# TypeScript 務實遷移計畫 (ROI 導向)

> SDL (Self-Directed Learning) 全端學習平台
> 核心架構理念：「技術服務於業務，拒絕過度設計，追求最高投資報酬率 (ROI)。」

---

## 目錄

1. [架構師評估與核心理念](#1-架構師評估與核心理念)
2. [專案痛點與遷移目標](#2-專案痛點與遷移目標)
3. [三大避坑指南 (Anti-Patterns)](#3-三大避坑指南-anti-patterns)
4. [務實遷移三部曲](#4-務實遷移三部曲)
5. [Phase 0｜基礎建設與環境配置](#phase-0基礎建設與環境配置)
6. [Phase 1｜高 ROI 邊界合約定義](#phase-1高-roi-邊界合約定義)
7. [Phase 2｜童子軍漸進式演進](#phase-2童子軍漸進式演進)
8. [風險導向測試策略](#8-風險導向測試策略)
9. [驗收與成功指標](#9-驗收與成功指標)

---

## 1. 架構師評估與核心理念

針對目前約 500 個 JS 檔案、45 個資料模型的專案規模，全面且完美的 TypeScript 重構是不切實際且昂貴的。

**我們的核心理念：**
- **編譯器是第一道防線：** 讓 TypeScript 處理型別與 Null 檢查，取代低價值的單元測試。
- **漸進式演進 (Incremental Evolution)：** 拒絕「停下所有開發來還技術債」的瀑布式重構。
- **童子軍原則 (Boy Scout Rule)：** 離開程式碼時，讓它比你發現時更乾淨。只在「修改」舊程式碼時，順手將其轉為 TS。

---

## 2. 專案痛點與遷移目標

**為什麼我們需要 TypeScript？**
1. **複雜的狀態與 Payload：** Socket.io 雙向通訊、AI Streaming 結構化輸出 (5Rs)、前端複雜的 Kanban 狀態，在純 JS 下極易發生屬性拼錯或 `undefined` 錯誤。
2. **前後端合約對接：** 缺乏明確的 API Request/Response 介面，導致前後端整合成本高。

**遷移目標：**
用 **20% 的精力**（定義核心 Interface 與合約），解決 **80% 的 Runtime 錯誤**。

---

## 3. 三大避坑指南 (Anti-Patterns)

在本次遷移中，**絕對禁止**以下過度設計的行為：

### 🚫 陷阱一：強制 100% 測試覆蓋率
- **錯誤做法：** 為了達到覆蓋率指標，為簡單的 UI 元件或 CRUD 路由撰寫無意義的測試。
- **正確做法：** 採用「風險導向測試」。只為核心業務邏輯（如 `orchestrator.js`、權限控管）撰寫測試。其餘依賴 TS 型別檢查。

### 🚫 陷阱二：Sequelize v6 的 TypeScript 泥沼
- **錯誤做法：** 將 45 個 Sequelize Model 全部改寫為 TS Class，處理冗長的 `Attributes` 與 `CreationAttributes`。
- **正確做法：** **保持 `models/*.js` 為 JavaScript。** 僅在 `types/models.ts` 中定義資料庫回傳的 Interface，並在 Service 層使用型別斷言（Type Assertion）。

### 🚫 陷阱三：TDD 測試優先與大爆炸遷移
- **錯誤做法：** 每個模組先補 JS 測試，再轉 TS，再改 TS 測試。按層級分 8 個階段全面翻寫。
- **正確做法：** 直接將檔案改名為 `.ts`，補上型別。編譯通過且手動測試無誤即 Commit。新功能一律用 TS，舊功能不動。

---

## 4. 務實遷移三部曲

我們的遷移將簡化為三個高效率的階段：

1. **Phase 0：基礎建設** (設定環境，允許 JS/TS 混用)
2. **Phase 1：定義邊界合約** (最高 ROI：定義 API、Socket、DB 的型別)
3. **Phase 2：日常漸進演進** (新程式碼用 TS，舊程式碼隨緣轉換)

---

## Phase 0｜基礎建設與環境配置

**目標：** 建立 TypeScript 工具鏈，不修改任何業務邏輯，確保專案可正常啟動。

### 1. 安裝依賴
```bash
# 後端
cd sdl-backend-main
npm install --save-dev typescript ts-node @types/node @types/express ts-node-dev

# 前端
cd sdl-frontend-main
npm install --save-dev typescript @types/node
```

### 2. 後端 TS 配置 (`sdl-backend-main/tsconfig.json`)
**關鍵：開啟 `allowJs`，初期關閉 `strict`。**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./",
    "allowJs": true,           // 允許 JS/TS 混用
    "checkJs": false,          // 初期不檢查 JS 錯誤
    "strict": false,           // 初期關閉嚴格模式，降低遷移阻力
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["**/*.ts", "**/*.js"],
  "exclude": ["node_modules", "dist", "migrations"]
}
```

### 3. 前端 TS 配置 (`sdl-frontend-main/tsconfig.json`)
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": false,
    "allowSyntheticDefaultImports": true,
    "strict": false,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"]
}
```

---

## Phase 1｜高 ROI 邊界合約定義

**目標：** 集中火力定義系統中最容易出錯的「資料結構邊界」。這能在不改動大量邏輯的情況下，提供極大的開發輔助。

### 1. 建立共用型別目錄
在前後端分別建立 `types/` 目錄。

### 2. 定義 Socket.io 合約 (最高優先級)
`types/socket.ts`
```typescript
export interface ServerToClientEvents {
  taskCreated: (task: TaskPayload) => void;
  'aiCoach:response': (data: AiStreamingPayload) => void;
}

export interface ClientToServerEvents {
  createTask: (data: CreateTaskData) => void;
  'aiCoach:query': (data: AiQueryData) => void;
}
```

### 3. 定義 API 回應與資料庫 Interface
`types/api.ts` & `types/models.ts`
```typescript
// 替代重寫 Sequelize Model 的方案
export interface User {
  id: number;
  username: string;
  role: 'student' | 'teacher' | 'admin';
}

export interface FiveRsResult {
  reporting: string;
  responding: string;
  relating: string;
  reasoning: string;
  reconstructing: string;
}
```

### 4. 在現有 JS 中使用 JSDoc 引入型別
對於暫時不打算轉為 `.ts` 的複雜 JS 檔案，使用 JSDoc 享受型別提示：
```javascript
/** @type {import('../types/models').User} */
const user = await User.findByPk(req.user.id);
```

---

## Phase 2｜童子軍漸進式演進

**目標：** 將 TypeScript 融入日常開發流程，不設立硬性的「重構衝刺期」。

### 執行規則：
1. **新功能強制 TS：** 從今天起，所有新增的檔案必須是 `.ts` 或 `.tsx`。
2. **舊功能隨緣轉換：** 當你需要修復 Bug 或增加功能到舊的 `.js` 檔案時：
   - 如果檔案很小（< 100 行），順手將其改名為 `.ts` 並補上基本型別。
   - 如果檔案極大（如舊版儀表板），**不要動它**，除非你要徹底重構該模組。
3. **善用 `any` 與 `@ts-ignore` 作為過渡：** 不要為了一個難以推導的型別卡住半天。我們的目標是業務交付，遇到型別泥沼時，果斷使用 `any` 並加上 `// TODO: Fix type` 註解，繼續前進。

---

## 8. 風險導向測試策略

放棄 100% 覆蓋率，將測試資源集中在「TypeScript 無法捕捉的邏輯錯誤」上。

**必須寫測試的區域 (High Risk)：**
1. **權限與身份驗證：** `AuthMiddleware.js`、專案存取權限邏輯。
2. **AI 協調器與 Prompt 組裝：** `orchestrator.js` 的上下文組裝邏輯（確保傳給 LLM 的資料正確）。
3. **複雜狀態機：** 幫助求助分析演算法、5Rs 階段判定邏輯。

**不需要寫測試的區域 (Low Risk)：**
1. **單純的 UI 元件：** 依賴 React 與 TS 型別檢查。
2. **標準 CRUD API：** 依賴 TS Interface 與手動 QA。

---

## 9. 驗收與成功指標

我們不看「遷移了多少檔案」，我們看「開發體驗是否改善」。

**成功指標：**
- [ ] 開發者在 VS Code 中能獲得 Socket 事件與 API 回應的自動完成 (Autocomplete)。
- [ ] 新功能開發時，因「屬性拼錯」或「`undefined`」導致的 Runtime 錯誤減少 80%。
- [ ] 專案的 Docker 部署與 CI 流程未因引入 TS 而中斷。
- [ ] 業務功能持續交付，沒有因為「技術重構」而停滯。
