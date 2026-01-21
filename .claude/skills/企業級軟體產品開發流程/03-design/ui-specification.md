---
description: 撰寫 UI 規格文件，詳細定義介面元素、互動行為和視覺設計
---

# UI 規格 (UI Specification)

## 概述
此 skill 協助撰寫完整的 UI 規格文件，詳細定義使用者介面的視覺設計、元件行為、互動方式、狀態變化和響應式設計，作為設計與開發之間的橋樑。

## 適用角色
- **主要負責**: UI 設計師、產品設計師
- **協作角色**: 前端工程師、產品經理、QA 工程師

## 輸入需求
使用者需要提供：
- Wireframe 或設計稿
- 功能需求說明
- 設計系統參考
- 品牌視覺指南
- 目標裝置和斷點

範例：`請幫我撰寫用戶儀表板頁面的 UI 規格`

## 執行步驟

### 步驟 1: 頁面概述
- 定義頁面目的
- 使用者進入路徑
- 相關頁面連結

### 步驟 2: 佈局結構
- 整體版面配置
- Grid 系統
- 區塊劃分

### 步驟 3: 元件詳細規格
- 視覺設計（尺寸、顏色、字體）
- 互動行為（hover、click、focus）
- 狀態變化（default、loading、error）

### 步驟 4: 響應式設計
- 各斷點佈局變化
- 元素調整規則
- 隱藏/顯示邏輯

### 步驟 5: 動效規格
- 動畫類型和時機
- 過渡效果
- 時間曲線

## 輸出模板

```markdown
# UI 規格文件

**頁面/元件名稱**: [名稱]
**版本**: 1.0
**設計師**: [設計師姓名]
**最後更新**: YYYY-MM-DD
**狀態**: 草稿 / 設計中 / 已核准 / 開發中

---

## 目錄

1. [概述](#1-概述)
2. [頁面佈局](#2-頁面佈局)
3. [元件規格](#3-元件規格)
4. [互動設計](#4-互動設計)
5. [狀態設計](#5-狀態設計)
6. [響應式設計](#6-響應式設計)
7. [動效規格](#7-動效規格)
8. [無障礙設計](#8-無障礙設計)
9. [開發備註](#9-開發備註)

---

## 1. 概述

### 1.1 頁面目的
[描述此頁面/元件的主要目的和使用者需求]

**範例**:
> 使用者儀表板是使用者登入後的首頁，提供快速概覽和常用操作入口，幫助使用者掌握帳戶狀態和重要資訊。

### 1.2 使用者故事
```
作為 [使用者角色]
我想要 [行動/功能]
以便 [獲得的價值]
```

### 1.3 進入路徑
- 登入成功後自動導向
- 點擊 Logo 或首頁連結
- URL: `/dashboard`

### 1.4 相關頁面
- 上一頁: 登入頁 (`/login`)
- 連結頁面:
  - 專案列表 (`/projects`)
  - 設定 (`/settings`)
  - 個人檔案 (`/profile`)

### 1.5 設計資源
- **Figma 連結**: [連結]
- **Prototype 連結**: [連結]
- **設計系統版本**: v2.0

---

## 2. 頁面佈局

### 2.1 整體結構

```
┌────────────────────────────────────────────────┐
│                   Header                        │
│  [Logo]  [Navigation]           [User Menu]     │
├────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │           Welcome Banner                 │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Stat 1   │ │ Stat 2   │ │ Stat 3   │       │
│  └──────────┘ └──────────┘ └──────────┘       │
│                                                 │
│  ┌───────────────────────┐ ┌─────────────────┐ │
│  │                       │ │                 │ │
│  │   Recent Activity     │ │  Quick Actions  │ │
│  │                       │ │                 │ │
│  └───────────────────────┘ └─────────────────┘ │
│                                                 │
├────────────────────────────────────────────────┤
│                   Footer                        │
└────────────────────────────────────────────────┘
```

### 2.2 Grid 系統

| 屬性 | 桌面版 | 平板 | 手機 |
|------|--------|------|------|
| 欄數 | 12 欄 | 8 欄 | 4 欄 |
| 間距 | 24px | 16px | 16px |
| 邊距 | 48px | 24px | 16px |
| 最大寬度 | 1440px | 100% | 100% |

### 2.3 區塊規格

| 區塊 | 桌面版欄位 | 平板欄位 | 手機欄位 | 間距 |
|------|------------|----------|----------|------|
| Header | 12 | 8 | 4 | 固定 64px 高 |
| Welcome Banner | 12 | 8 | 4 | mb-24 |
| Stat Cards | 4×3 | 4×2 | 4×1 | gap-16 |
| Recent Activity | 8 | 8 | 4 | - |
| Quick Actions | 4 | 8 | 4 | - |

---

## 3. 元件規格

### 3.1 Header

**整體規格**:
- 高度: 64px (固定)
- 背景: `--color-white` (#FFFFFF)
- 底部邊框: 1px `--color-gray-200`
- 位置: `position: sticky; top: 0;`
- Z-index: 100

**Logo**:
- 尺寸: 120px × 32px
- 左邊距: 24px
- 點擊導向首頁

**Navigation**:
- 字體: `--font-body` (16px)
- 顏色: `--color-gray-700`
- 間距: 各項目間 32px
- Hover: `--color-primary`
- Active: `--color-primary` + 底線 2px

**User Menu**:
- 頭像: 36px × 36px 圓形
- 下拉選單: 見 [3.5 下拉選單](#35-下拉選單)

---

### 3.2 Welcome Banner

**容器**:
- 高度: 120px
- 背景: 漸層 `linear-gradient(135deg, --color-primary-100 0%, --color-secondary-100 100%)`
- 圓角: 12px
- 內邊距: 24px

**標題**:
- 字體: `--font-h2` (24px, 700)
- 顏色: `--color-gray-900`
- 內容: "早安，{使用者名稱}！"
- 時段變化: 6-12 早安 / 12-18 午安 / 18-6 晚安

**副標題**:
- 字體: `--font-body` (16px, 400)
- 顏色: `--color-gray-600`
- 內容: "今天是 {日期}，您有 {N} 個待處理項目"

---

### 3.3 Stat Card

**容器**:
- 尺寸: 自適應寬度 × 120px
- 背景: `--color-white`
- 圓角: 12px
- 邊框: 1px `--color-gray-200`
- 陰影: `--shadow-sm`
- 內邊距: 20px
- Hover: `--shadow-md`
- 過渡: `transition: box-shadow 0.2s ease`

**圖示**:
- 尺寸: 40px × 40px
- 容器: 48px × 48px 圓形
- 背景: 依類型 (見下表)

**標籤**:
- 字體: `--font-body-sm` (14px)
- 顏色: `--color-gray-500`
- 位置: 圖示右側

**數值**:
- 字體: `--font-h2` (24px, 700)
- 顏色: `--color-gray-900`

**變化指標**:
- 上升: ↑ `--color-success` (#10B981)
- 下降: ↓ `--color-error` (#EF4444)
- 持平: - `--color-gray-400`

| 類型 | 圖示 | 背景色 |
|------|------|--------|
| 專案數 | 📁 | `--color-primary-100` |
| 任務數 | ✓ | `--color-success-100` |
| 訊息數 | 💬 | `--color-secondary-100` |

---

### 3.4 Activity List

**容器**:
- 背景: `--color-white`
- 圓角: 12px
- 邊框: 1px `--color-gray-200`
- 內邊距: 0 (標題 20px)

**標題列**:
- 字體: `--font-h3` (18px, 600)
- 顏色: `--color-gray-900`
- 右側: "查看全部" 連結

**列表項**:
- 高度: 64px
- 內邊距: 16px 20px
- 邊框: 底部 1px `--color-gray-100` (最後一項除外)
- Hover 背景: `--color-gray-50`

**列表項內容**:
```
┌─────────────────────────────────────────────────┐
│ [Avatar] [Title]                    [Time]      │
│          [Description]                          │
└─────────────────────────────────────────────────┘
```

- Avatar: 32px × 32px 圓形
- Title: `--font-body` (16px, 500), `--color-gray-900`
- Description: `--font-body-sm` (14px), `--color-gray-500`, 單行省略
- Time: `--font-caption` (12px), `--color-gray-400`

---

### 3.5 下拉選單 (Dropdown Menu)

**觸發器**:
- 類型: 頭像 + 下拉箭頭
- 間距: 8px
- 點擊/Enter 開啟選單

**選單容器**:
- 最小寬度: 200px
- 背景: `--color-white`
- 圓角: 8px
- 陰影: `--shadow-lg`
- 邊框: 1px `--color-gray-200`
- 位置: 觸發器下方 8px，右對齊
- Z-index: 200

**選單項目**:
- 高度: 40px
- 內邊距: 8px 16px
- 字體: `--font-body` (16px)
- 顏色: `--color-gray-700`
- Hover 背景: `--color-gray-100`
- 圖示: 20px × 20px，右邊距 12px

**分隔線**:
- 高度: 1px
- 顏色: `--color-gray-100`
- 上下邊距: 8px

**選單項目**:
1. 個人檔案 (👤)
2. 設定 (⚙️)
3. ---分隔線---
4. 登出 (🚪, 顏色: `--color-error`)

---

## 4. 互動設計

### 4.1 按鈕互動

**Primary Button**:

| 狀態 | 背景 | 文字 | 邊框 | 其他 |
|------|------|------|------|------|
| Default | `--color-primary` | `--color-white` | none | - |
| Hover | `--color-primary-600` | `--color-white` | none | cursor: pointer |
| Active | `--color-primary-700` | `--color-white` | none | - |
| Focus | `--color-primary` | `--color-white` | none | ring: 2px primary-200 |
| Disabled | `--color-gray-200` | `--color-gray-400` | none | cursor: not-allowed |
| Loading | `--color-primary` | `--color-white` | none | spinner + 文字變淡 |

**過渡效果**:
```css
transition: background-color 0.15s ease, box-shadow 0.15s ease;
```

### 4.2 連結互動

| 狀態 | 顏色 | 裝飾 |
|------|------|------|
| Default | `--color-primary` | none |
| Hover | `--color-primary-600` | underline |
| Active | `--color-primary-700` | underline |
| Visited | `--color-primary` | none |
| Focus | `--color-primary` | underline + focus ring |

### 4.3 表單互動

**Input Field**:

| 狀態 | 邊框 | 背景 | 標籤 |
|------|------|------|------|
| Default | 1px `--color-gray-300` | `--color-white` | `--color-gray-700` |
| Hover | 1px `--color-gray-400` | `--color-white` | - |
| Focus | 2px `--color-primary` | `--color-white` | `--color-primary` |
| Error | 2px `--color-error` | `--color-error-50` | `--color-error` |
| Disabled | 1px `--color-gray-200` | `--color-gray-50` | `--color-gray-400` |

### 4.4 Card 互動

**Stat Card**:
- Hover: 提升陰影 (`--shadow-sm` → `--shadow-md`)
- 點擊: 導向詳細頁面
- 過渡: `transition: box-shadow 0.2s ease`

**Activity Item**:
- Hover: 背景色 `--color-gray-50`
- 點擊: 展開詳情或導向詳細頁

---

## 5. 狀態設計

### 5.1 載入狀態

**頁面首次載入**:
```
┌────────────────────────────────────────┐
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓  (Skeleton)           │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓          │
└────────────────────────────────────────┘
```

- 使用 Skeleton Loading
- 背景: `--color-gray-100`
- 動畫: shimmer 效果 (左到右)
- 持續時間: 1.5s 循環

**局部更新載入**:
- Spinner: 20px × 20px
- 顏色: `--color-primary`
- 位置: 內容區塊中央或按鈕內

### 5.2 空狀態

**無活動記錄**:
```
┌────────────────────────────────────────┐
│              📭                         │
│        尚無活動記錄                     │
│  開始建立專案或邀請團隊成員，            │
│    活動就會顯示在這裡。                  │
│                                         │
│        [建立第一個專案]                  │
└────────────────────────────────────────┘
```

**設計規格**:
- 圖示: 48px × 48px
- 標題: `--font-body` (16px, 600), `--color-gray-700`
- 說明: `--font-body-sm` (14px), `--color-gray-500`
- 按鈕: Secondary 樣式
- 對齊: 全部置中

### 5.3 錯誤狀態

**載入失敗**:
```
┌────────────────────────────────────────┐
│              ⚠️                         │
│          載入失敗                       │
│    無法取得資料，請檢查網路連線。        │
│                                         │
│        [重新載入]                       │
└────────────────────────────────────────┘
```

**設計規格**:
- 圖示: ⚠️ 48px, `--color-warning`
- 標題: `--font-body` (16px, 600), `--color-gray-700`
- 說明: `--font-body-sm` (14px), `--color-gray-500`
- 按鈕: Primary 樣式

### 5.4 成功狀態

**操作成功 Toast**:
```
┌────────────────────────────────────────┐
│ ✓  變更已儲存                           │
└────────────────────────────────────────┘
```

**規格**:
- 位置: 畫面右上角
- 背景: `--color-success`
- 文字: `--color-white`
- 圓角: 8px
- 顯示時間: 3 秒後自動消失
- 動畫: 右側滑入

---

## 6. 響應式設計

### 6.1 斷點定義

| 名稱 | 範圍 | 說明 |
|------|------|------|
| xs | 0 - 479px | 小手機 |
| sm | 480 - 767px | 大手機 |
| md | 768 - 1023px | 平板 |
| lg | 1024 - 1439px | 小桌面 |
| xl | 1440px+ | 大桌面 |

### 6.2 各斷點佈局

**桌面版 (xl, lg)**:
- 三欄 Stat Cards
- 雙欄 Activity + Quick Actions
- 完整導覽列

**平板 (md)**:
- 兩欄 Stat Cards
- 單欄 Activity 和 Quick Actions (垂直排列)
- 導覽列收合為漢堡選單

**手機 (sm, xs)**:
- 單欄 Stat Cards (橫向滑動)
- 單欄 Activity 和 Quick Actions
- 底部 Tab 導覽
- Welcome Banner 高度縮減為 80px

### 6.3 響應式行為

| 元件 | 桌面 | 平板 | 手機 |
|------|------|------|------|
| Header | 固定頂部 | 固定頂部 | 固定頂部 |
| Sidebar | 顯示 | 隱藏 (漢堡) | 隱藏 (漢堡) |
| Stat Cards | Grid 3欄 | Grid 2欄 | 橫向滑動 |
| Activity | 顯示 5 項 | 顯示 4 項 | 顯示 3 項 |

---

## 7. 動效規格

### 7.1 基礎過渡

| 類型 | 時間 | 曲線 | 使用場景 |
|------|------|------|----------|
| 快速 | 150ms | ease-out | Hover, Focus |
| 標準 | 250ms | ease-in-out | 狀態切換, Toggle |
| 慢速 | 400ms | ease-in-out | Modal, Drawer |

### 7.2 進入動畫

**頁面載入**:
- 類型: Fade in + Slide up
- 時間: 300ms
- 延遲: 各區塊錯開 50ms

```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

**Modal 開啟**:
- 背景: Fade in 200ms
- 內容: Scale 0.95 → 1, 300ms

### 7.3 離開動畫

**Toast 消失**:
- 類型: Fade out + Slide right
- 時間: 200ms

**Modal 關閉**:
- 類型: Fade out
- 時間: 200ms

### 7.4 微互動

**Button Press**:
```css
.button:active {
  transform: scale(0.98);
}
```

**Toggle Switch**:
```css
.toggle-knob {
  transition: transform 0.2s ease-out;
}
```

---

## 8. 無障礙設計

### 8.1 色彩對比

| 元素 | 前景 | 背景 | 對比度 | 合規 |
|------|------|------|--------|------|
| 正文 | #1F2937 | #FFFFFF | 12.6:1 | ✅ AAA |
| 次要文字 | #6B7280 | #FFFFFF | 4.5:1 | ✅ AA |
| 連結 | #2563EB | #FFFFFF | 4.5:1 | ✅ AA |
| 按鈕文字 | #FFFFFF | #2563EB | 4.5:1 | ✅ AA |

### 8.2 焦點管理

- 所有互動元素可用 Tab 鍵到達
- 焦點順序: Header → Banner → Stats → Activity → Quick Actions
- 焦點樣式: 2px ring, offset 2px
- Modal 開啟時焦點困住 (Focus trap)

### 8.3 ARIA 標記

```html
<!-- 主要區域 -->
<header role="banner">
<nav role="navigation" aria-label="主導覽">
<main role="main">
<footer role="contentinfo">

<!-- Stat Card -->
<article aria-label="專案統計">
  <p id="stat-label">進行中專案</p>
  <p aria-labelledby="stat-label">12</p>
</article>

<!-- 下拉選單 -->
<button aria-haspopup="true" aria-expanded="false">
<div role="menu" aria-hidden="true">
  <button role="menuitem">
```

### 8.4 螢幕閱讀器

- 頁面標題: "儀表板 - [產品名稱]"
- 動態更新使用 `aria-live="polite"`
- 載入狀態宣告: "正在載入..."
- 圖表提供文字替代

---

## 9. 開發備註

### 9.1 元件對應

| UI 元件 | 程式元件 | 備註 |
|---------|----------|------|
| Header | `<Header />` | 全域共用 |
| Stat Card | `<StatCard />` | 可傳入 type, value, change |
| Activity List | `<ActivityList />` | 接受 items array |
| Dropdown | `<Dropdown />` | 使用 Headless UI |

### 9.2 API 資料

**Dashboard Data Endpoint**: `GET /api/dashboard`

```json
{
  "user": {
    "name": "Alice",
    "avatar": "https://..."
  },
  "stats": [
    { "type": "projects", "value": 12, "change": 2 },
    { "type": "tasks", "value": 45, "change": -3 },
    { "type": "messages", "value": 8, "change": 0 }
  ],
  "activities": [
    {
      "id": "1",
      "type": "comment",
      "user": { "name": "Bob", "avatar": "..." },
      "content": "在專案 A 新增了留言",
      "timestamp": "2024-01-18T10:30:00Z"
    }
  ]
}
```

### 9.3 注意事項

1. **效能考量**:
   - Activity List 超過 20 項使用虛擬滾動
   - 圖片使用 lazy loading
   - Stat Cards 資料獨立更新

2. **快取策略**:
   - Dashboard 資料快取 5 分鐘
   - 使用者資訊快取至登出

3. **錯誤處理**:
   - API 失敗顯示區塊級錯誤狀態
   - 網路斷線顯示全域提示

4. **國際化**:
   - 日期使用 `Intl.DateTimeFormat`
   - 數字使用 `Intl.NumberFormat`
   - 文字支援 i18n key

---

## 附錄

### A. 設計 Token 參考

```css
/* 顏色 */
--color-primary: #2563EB;
--color-primary-100: #DBEAFE;
--color-primary-600: #1D4ED8;

--color-gray-50: #F9FAFB;
--color-gray-100: #F3F4F6;
--color-gray-200: #E5E7EB;
--color-gray-500: #6B7280;
--color-gray-700: #374151;
--color-gray-900: #111827;

--color-success: #10B981;
--color-error: #EF4444;
--color-warning: #F59E0B;

/* 字體 */
--font-h2: 24px / 1.3 / 700;
--font-h3: 18px / 1.4 / 600;
--font-body: 16px / 1.6 / 400;
--font-body-sm: 14px / 1.5 / 400;
--font-caption: 12px / 1.4 / 400;

/* 陰影 */
--shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
--shadow-md: 0 4px 6px rgba(0,0,0,0.1);
--shadow-lg: 0 10px 15px rgba(0,0,0,0.1);

/* 圓角 */
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-full: 9999px;
```

### B. 核對清單

**設計完整性**:
- [ ] 所有狀態已定義 (default, hover, active, disabled, loading, error)
- [ ] 響應式斷點已說明
- [ ] 動效規格已定義
- [ ] 無障礙要求已說明

**開發準備**:
- [ ] 設計稿連結可用
- [ ] API 格式已說明
- [ ] 元件命名已確認
- [ ] 開發注意事項已列出

---

**最後更新**: YYYY-MM-DD
**版本**: 1.0
**設計師**: [設計師姓名]
```

---

## 品質檢查清單

- [ ] 頁面概述清楚
- [ ] 佈局結構有視覺圖示
- [ ] 元件規格詳細完整
- [ ] 所有互動狀態已定義
- [ ] 響應式設計有說明
- [ ] 動效時間和曲線已定義
- [ ] 無障礙要求已列出
- [ ] 開發所需資訊充足

---

## 相關 Skills
- `design-system.md` - 設計系統（Token 參考）
- `wireframe.md` - 線框圖（佈局基礎）
- `accessibility-checklist.md` - 無障礙檢查
- `content-design.md` - 內容設計（文案規範）
- `frontend-component.md` - 前端元件開發（實作參考）
