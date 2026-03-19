# 設計系統文檔

> "好的設計系統不是來自靈感，而是來自一致性和約束。" - Linus Torvalds 風格

本文檔定義了專案的統一設計標準，確保 UI 的一致性和可維護性。

---

## 📋 目錄

- [字體系統](#字體系統)
- [間距系統](#間距系統)
- [色彩系統](#色彩系統)
- [動畫速度](#動畫速度)
- [響應式設計](#響應式設計)
- [互動設計規範](#互動設計規範)
- [常見模式](#常見模式)

---

## 🔤 字體系統

### 字體家族

**雙字體策略：**
- **英文字體**: Playfair Display - 優雅的襯線英文字體，適合標題與內容
- **中文字體**: Noto Serif TC - 適合顯示繁體中文內容，提供優雅的閱讀體驗

```css
/* 預設字體（英文 + 中文）- 已在 tailwind.config.cjs 中設定 */
font-family: 'Playfair Display', 'Noto Serif TC', serif
```

### 字體使用規範

| 使用場景 | 字體 | Tailwind Class | 說明 |
|---------|------|---------------|------|
| 英文標題、英文內容 | Playfair Display | `font-sans` / `font-serif`（預設） | 英文字元自動套用 |
| 中文標題、中文正文 | Noto Serif TC | `font-sans` / `font-serif`（預設） | 中文字元自動 fallback |
| 導航、選單、UI 元素 | Playfair Display + Noto Serif TC | `font-sans`（預設） | 介面元素 |

### 語意化字體大小

| 類別 | Tailwind Class | 大小 | 行高 | 字重 | 使用場景 |
|------|---------------|------|------|------|---------|
| 展示標題 | `text-display` | 40px | 1.2 | 900 | 首頁主標題（建議搭配 `font-serif`） |
| H1 標題 | `text-h1` | 32px | 1.3 | 700 | 頁面主標題（建議搭配 `font-serif`） |
| H2 標題 | `text-h2` | 24px | 1.4 | 600 | 區塊標題 |
| H3 標題 | `text-h3` | 20px | 1.5 | 600 | 卡片標題 |
| 大字正文 | `text-body-lg` | 18px | 1.6 | 400 | 強調內容、副標題 |
| 正文 | `text-body` | 16px | 1.75 | 400 | 主要內容（行高加大適合中文） |
| 小字正文 | `text-body-sm` | 14px | 1.6 | 400 | 次要內容 |
| 說明文字 | `text-caption` | 12px | 1.5 | 400 | 輔助說明 |
| UI 控制 | `text-ui` | 14px | 1.4 | 500 | 按鈕、標籤等 UI 元素 |

### 使用範例

```jsx
{/* 內容顯示 - 使用 serif */}
<h1 className="text-h1 font-serif">頁面標題</h1>
<h2 className="text-h2 font-serif">區塊標題</h2>
<p className="text-body font-serif">這是正文內容，中文使用 Noto Serif TC、英文使用 Playfair Display 提供更好的閱讀體驗。</p>

{/* UI 控制元素 - 使用 sans（預設） */}
<button className="text-ui">確認</button>
<span className="text-caption">說明文字</span>
<nav className="text-sm">導航選單</nav>
```

### 字體載入

字體通過 Google Fonts CDN 載入，已在 `index.css` 中配置：

```css
/* 英文字體：Playfair Display */
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,700&display=swap');
/* 中文字體：Noto Serif TC */
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@300;400;500;600;700;900&display=swap');
```

---

## 📏 間距系統

### 元件內邊距（Padding）

| Token | 數值 | Tailwind Class | 使用場景 |
|-------|------|---------------|---------|
| component-xs | 8px | `p-component-xs` | 極小元件（標籤、徽章） |
| component-sm | 12px | `p-component-sm` | 小卡片、小按鈕 |
| component-base | 16px | `p-component-base` | 基礎元件 |
| component-md | 20px | `p-component-md` | 標準卡片 |
| component-md-lg | 24px | `p-component-md-lg` | 中大卡片 |
| component-lg | 32px | `p-component-lg` | 大卡片、區塊 |
| component-xl | 40px | `p-component-xl` | 頁面容器 |

### 元件間距（Gap/Margin）

| Token | 數值 | Tailwind Class | 使用場景 |
|-------|------|---------------|---------|
| stack-xs | 8px | `gap-stack-xs` | 緊密排列 |
| stack-sm | 16px | `gap-stack-sm` | 標準間距 |
| stack-md | 24px | `gap-stack-md` | 寬鬆間距 |
| stack-md-lg | 32px | `gap-stack-md-lg` | 中大間距 |
| stack-lg | 40px | `gap-stack-lg` | 區塊之間 |
| stack-xl | 64px | `gap-stack-xl` | 大區塊之間 |

### 按鈕內邊距

| Token | 數值 | Tailwind Class | 使用場景 |
|-------|------|---------------|---------|
| btn-x-sm / btn-y-sm | 12px / 6px | `px-btn-x-sm py-btn-y-sm` | 小按鈕 |
| btn-x / btn-y | 16px / 8px | `px-btn-x py-btn-y` | 標準按鈕 |
| btn-x-lg / btn-y-lg | 24px / 12px | `px-btn-x-lg py-btn-y-lg` | 大按鈕 |

### 使用範例

```jsx
{/* 卡片 */}
<div className="p-component-sm sm:p-component-md">
  卡片內容
</div>

{/* Grid 間距 */}
<div className="grid grid-cols-3 gap-stack-sm">
  ...
</div>

{/* 按鈕 */}
<button className="px-btn-x py-btn-y">
  標準按鈕
</button>
```

---

## 🎨 色彩系統

### 主色系

```javascript
colors: {
  'customgreen': '#5BA491',  // 品牌主色
  'customgray': '#F6F5F8'    // 背景色
}
```

### 使用規範

| 用途 | 顏色 | Tailwind Class |
|------|------|---------------|
| 主要按鈕 | customgreen | `bg-customgreen` |
| 懸停狀態 | customgreen (darker) | `hover:bg-customgreen/90` |
| 頁面背景 | #F8FAFB | `bg-[#F8FAFB]` |
| 卡片背景 | white | `bg-white` |
| 次要背景 | customgray | `bg-customgray` |

---

## ⚡ 動畫速度

### 標準化速度

| Token | 數值 | Tailwind Class | 使用場景 |
|-------|------|---------------|---------|
| fast | 150ms | `duration-fast` | Hover、Focus 微互動 |
| normal | 250ms | `duration-normal` | Modal 淡入淡出 |
| slow | 400ms | `duration-slow` | Drawer 滑動、頁面過渡 |

### 使用範例

```jsx
{/* Hover 效果 */}
<button className="transition-colors duration-fast hover:bg-customgreen/90">
  按鈕
</button>

{/* Modal */}
<div className="transition-opacity duration-normal">
  Modal 內容
</div>

{/* Drawer */}
<aside className="transition-transform duration-slow">
  側邊欄
</aside>
```

---

## 📱 響應式設計

### 斷點系統

| 斷點 | 螢幕寬度 | Tailwind Prefix | 裝置類型 |
|------|---------|----------------|---------|
| xs | < 640px | (預設) | 手機直向 |
| sm | ≥ 640px | `sm:` | 手機橫向 |
| md | ≥ 768px | `md:` | 平板 |
| lg | ≥ 1024px | `lg:` | 筆電 |
| xl | ≥ 1280px | `xl:` | 桌機 |

### Grid 響應式模式

```jsx
{/* ❌ 錯誤：跳過中間斷點 */}
<div className="grid grid-cols-2 lg:grid-cols-5">

{/* ✅ 正確：平滑過渡 */}
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
```

### 常見模式

```jsx
{/* 統計卡片 Grid */}
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-stack-sm sm:gap-stack-md">

{/* 內容卡片 */}
<div className="p-component-sm sm:p-component-md lg:p-component-lg">

{/* 字體大小 */}
<h2 className="text-lg sm:text-xl lg:text-2xl">
```

---

## 🎯 互動設計規範

### Hover 效果

#### ✅ 正確做法

```jsx
{/* 使用顏色和陰影過渡 */}
<button className="
  bg-customgreen
  hover:bg-customgreen/90
  hover:shadow-lg
  transition-all duration-fast
">
```

#### ❌ 禁止做法

```jsx
{/* 禁止使用 scale 或 translateY，會造成佈局位移 */}
<button className="
  hover:scale-105      {/* ❌ 不要用 */}
  hover:-translate-y-1 {/* ❌ 不要用 */}
">
```

### Transition 規範

```jsx
{/* ✅ 推薦：具體指定要過渡的屬性 */}
<div className="transition-colors duration-fast">
<div className="transition-shadow duration-fast">
<div className="transition-opacity duration-normal">

{/* ⚠️ 避免：transition-all 可能造成性能問題 */}
<div className="transition-all duration-300">
```

### 互動狀態

```jsx
{/* 完整的互動狀態 */}
<button className="
  bg-customgreen
  text-white
  cursor-pointer

  hover:bg-customgreen/90
  hover:shadow-lg

  focus:outline-none
  focus:ring-2
  focus:ring-customgreen/50

  active:bg-customgreen/80

  disabled:bg-gray-400
  disabled:cursor-not-allowed
  disabled:opacity-50

  transition-all duration-fast
">
```

---

## 🔧 常見模式

### 卡片組件

```jsx
<div className="
  bg-white
  p-component-sm sm:p-component-md
  rounded-xl
  shadow-lg
  hover:shadow-xl
  transition-shadow duration-fast
">
  卡片內容
</div>
```

### 按鈕組件

```jsx
{/* 主要按鈕 */}
<button className="
  bg-customgreen
  text-white
  px-btn-x py-btn-y
  rounded-lg
  hover:bg-customgreen/90
  hover:shadow-lg
  transition-all duration-fast
  cursor-pointer
">
  確認
</button>

{/* 次要按鈕 */}
<button className="
  bg-gray-200
  text-gray-700
  px-btn-x py-btn-y
  rounded-lg
  hover:bg-gray-300
  transition-colors duration-fast
  cursor-pointer
">
  取消
</button>
```

### 統計卡片 Grid

```jsx
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-stack-sm sm:gap-stack-md mb-6">
  <div className="
    bg-customgreen
    p-component-sm sm:p-component-md
    rounded-xl
    text-white
    shadow-lg
    hover:shadow-xl
    transition-shadow duration-fast
  ">
    <h3 className="text-caption text-white/80">標題</h3>
    <p className="text-h1">123</p>
    <p className="text-body-sm text-white/70">說明</p>
  </div>
</div>
```

---

## 🚫 常見錯誤

### 1. 懸停效果造成佈局位移

```jsx
{/* ❌ 錯誤 */}
<div className="hover:scale-105">
<div className="hover:-translate-y-2">

{/* ✅ 正確 */}
<div className="hover:shadow-lg transition-shadow duration-fast">
```

### 2. 跳過響應式斷點

```jsx
{/* ❌ 錯誤 */}
<div className="grid-cols-2 lg:grid-cols-5">

{/* ✅ 正確 */}
<div className="grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
```

### 3. 使用固定數值而非語意化 token

```jsx
{/* ❌ 錯誤 */}
<div className="p-3 gap-4">

{/* ✅ 正確 */}
<div className="p-component-sm gap-stack-sm">
```

### 4. 不一致的動畫速度

```jsx
{/* ❌ 錯誤 */}
<div className="duration-200">
<div className="duration-300">
<div className="duration-700">

{/* ✅ 正確 */}
<div className="duration-fast">
<div className="duration-normal">
<div className="duration-slow">
```

---

## 📚 參考資源

- **Tailwind 配置**: `/tailwind.config.cjs`
- **全域樣式**: `/src/index.css`
- **UI/UX Pro Max Skill**: `/.claude/skills/ui-ux-pro-max/SKILL.md`

---

## ✅ 檢查清單

在提交 UI 程式碼前，請確認：

- [ ] 使用語意化間距 token（`p-component-*`, `gap-stack-*`）
- [ ] Hover 效果不造成佈局位移（只用顏色和陰影）
- [ ] 響應式設計包含 `md:` 斷點
- [ ] 動畫速度使用標準化 token（`duration-fast/normal/slow`）
- [ ] 所有互動元素有 `cursor-pointer`
- [ ] 禁用狀態正確處理（`disabled:opacity-50 disabled:cursor-not-allowed`）
- [ ] 使用語意化字體大小（`text-h1/h2/h3/body/body-sm/caption`）

---

**最後更新**: 2026-01-16
**維護者**: 開發團隊
