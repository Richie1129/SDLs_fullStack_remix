---
description: 建立無障礙設計檢查清單，確保產品符合 WCAG 標準
---

# 無障礙檢查清單 (Accessibility Checklist)

## 概述
此 skill 協助建立完整的無障礙設計檢查清單，確保數位產品對所有使用者（包括身心障礙者）都具有可用性，符合 WCAG 2.1/2.2 AA 等級標準。

## 適用角色
- **主要負責**: UI 設計師、前端工程師、QA 工程師
- **協作角色**: 產品經理、UX 研究員

## 輸入需求
使用者需要提供：
- 產品類型（Web、Mobile、Desktop）
- 目標合規等級（A、AA、AAA）
- 主要使用者群體描述
- 現有無障礙測試報告（如有）
- 技術堆疊（React、Vue、原生等）

範例：`請幫我建立 Web 應用的無障礙檢查清單，目標 WCAG 2.1 AA 等級`

## 執行步驟

### 步驟 1: 了解 WCAG 原則
- 可感知 (Perceivable)
- 可操作 (Operable)
- 可理解 (Understandable)
- 穩健性 (Robust)

### 步驟 2: 評估現況
- 使用自動化工具掃描（Lighthouse、axe）
- 進行手動鍵盤測試
- 螢幕閱讀器測試
- 色彩對比檢查

### 步驟 3: 建立檢查清單
- 根據 WCAG 準則分類
- 標註優先順序
- 提供修復指引

### 步驟 4: 定義測試流程
- 自動化測試整合
- 手動測試腳本
- 使用者測試計畫

### 步驟 5: 持續監控
- CI/CD 整合檢查
- 定期審計排程
- 回饋收集機制

## 輸出模板

```markdown
# 無障礙檢查清單

**專案名稱**: [專案名稱]
**目標等級**: WCAG 2.1 AA
**評估日期**: YYYY-MM-DD
**評估人員**: [姓名]
**狀態**: 通過 / 待改善 / 不通過

---

## 目錄

1. [可感知 (Perceivable)](#1-可感知-perceivable)
2. [可操作 (Operable)](#2-可操作-operable)
3. [可理解 (Understandable)](#3-可理解-understandable)
4. [穩健性 (Robust)](#4-穩健性-robust)
5. [測試工具與流程](#5-測試工具與流程)
6. [改善追蹤](#6-改善追蹤)

---

## 1. 可感知 (Perceivable)

### 1.1 文字替代 (1.1.1 - A 等級)

| 項目 | 狀態 | 說明 |
|------|------|------|
| [ ] 所有圖片都有 `alt` 屬性 | 待檢查 | 包括內容圖片、圖示、圖表 |
| [ ] 裝飾性圖片使用空 `alt=""` | 待檢查 | 避免螢幕閱讀器朗讀 |
| [ ] 複雜圖表提供長描述 | 待檢查 | 使用 `aria-describedby` |
| [ ] 圖片按鈕有適當文字描述 | 待檢查 | - |

**程式碼範例**:
```html
<!-- ✅ 好：有意義的圖片 -->
<img src="chart.png" alt="2024年銷售趨勢圖，一月至三月持續成長">

<!-- ✅ 好：裝飾性圖片 -->
<img src="decoration.png" alt="" role="presentation">

<!-- ✅ 好：圖片按鈕 -->
<button>
  <img src="search-icon.svg" alt="搜尋">
</button>
```

### 1.2 時序媒體 (1.2.x - A/AA 等級)

| 項目 | 狀態 | 說明 |
|------|------|------|
| [ ] 影片提供字幕 (Captions) | 待檢查 | 同步字幕，包含對話和音效 |
| [ ] 影片提供音訊描述 | 待檢查 | AA 等級要求 |
| [ ] 純音訊內容有文字稿 | 待檢查 | Podcast、語音訊息 |
| [ ] 直播內容提供即時字幕 | 待檢查 | - |

### 1.3 資訊與關係 (1.3.x - A/AA 等級)

| 項目 | 狀態 | 說明 |
|------|------|------|
| [ ] 使用語意化 HTML 標籤 | 待檢查 | `<header>`, `<nav>`, `<main>`, `<footer>` |
| [ ] 標題層級正確 (`h1`-`h6`) | 待檢查 | 不跳級，有邏輯順序 |
| [ ] 表單標籤正確關聯 | 待檢查 | 使用 `<label for="id">` |
| [ ] 表格有適當標題和標頭 | 待檢查 | `<caption>`, `<th>`, `scope` |
| [ ] 列表使用正確標籤 | 待檢查 | `<ul>`, `<ol>`, `<dl>` |
| [ ] 不依賴顏色傳達資訊 | 待檢查 | 配合圖示或文字 |
| [ ] 支援螢幕方向變化 | 待檢查 | 橫向/直向都可用 |

**程式碼範例**:
```html
<!-- ✅ 好：語意化結構 -->
<header>
  <nav aria-label="主導覽">...</nav>
</header>
<main>
  <h1>頁面主標題</h1>
  <section aria-labelledby="section-title">
    <h2 id="section-title">區塊標題</h2>
  </section>
</main>
<footer>...</footer>

<!-- ✅ 好：表單標籤 -->
<label for="email">電子郵件</label>
<input type="email" id="email" name="email" aria-required="true">
```

### 1.4 可區分 (1.4.x - AA/AAA 等級)

| 項目 | 狀態 | 說明 |
|------|------|------|
| [ ] 文字色彩對比 ≥ 4.5:1 | 待檢查 | 正常文字 AA 標準 |
| [ ] 大文字色彩對比 ≥ 3:1 | 待檢查 | 18pt+ 或 14pt 粗體 |
| [ ] 非文字元素對比 ≥ 3:1 | 待檢查 | 圖示、邊框、焦點指示 |
| [ ] 文字可放大至 200% | 待檢查 | 不使用固定像素 |
| [ ] 避免純圖片文字 | 待檢查 | 除非為 Logo |
| [ ] 內容可在 320px 寬度檢視 | 待檢查 | 響應式設計 |
| [ ] 行高至少 1.5 倍 | 待檢查 | 段落文字 |
| [ ] 自動播放可暫停 | 待檢查 | 音訊、影片、輪播 |

**對比度工具**:
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Colour Contrast Analyser](https://www.tpgi.com/color-contrast-checker/)

---

## 2. 可操作 (Operable)

### 2.1 鍵盤可存取 (2.1.x - A 等級)

| 項目 | 狀態 | 說明 |
|------|------|------|
| [ ] 所有功能可用鍵盤操作 | 待檢查 | Tab, Enter, Space, 方向鍵 |
| [ ] 沒有鍵盤陷阱 | 待檢查 | 可用 Esc 關閉 Modal |
| [ ] 快捷鍵可自訂或停用 | 待檢查 | 單鍵快捷鍵需可關閉 |
| [ ] 跳過連結功能 | 待檢查 | "跳至主要內容" 連結 |

**程式碼範例**:
```html
<!-- ✅ 好：跳過連結 -->
<a href="#main-content" class="skip-link">跳至主要內容</a>

<!-- CSS -->
.skip-link {
  position: absolute;
  left: -9999px;
}
.skip-link:focus {
  left: 0;
  z-index: 9999;
}
```

```jsx
// ✅ 好：自訂元件鍵盤處理
function CustomButton({ onClick, children }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  );
}
```

### 2.2 足夠時間 (2.2.x - A/AA 等級)

| 項目 | 狀態 | 說明 |
|------|------|------|
| [ ] 時間限制可調整或延長 | 待檢查 | 登入逾時提供延長選項 |
| [ ] 自動更新可暫停 | 待檢查 | 新聞跑馬燈、股票報價 |
| [ ] 閃爍內容 < 3次/秒 | 待檢查 | 避免光敏性癲癇 |

### 2.3 導覽 (2.4.x - A/AA 等級)

| 項目 | 狀態 | 說明 |
|------|------|------|
| [ ] 頁面有描述性標題 | 待檢查 | `<title>` 清楚描述 |
| [ ] 連結文字有意義 | 待檢查 | 避免 "點此" "閱讀更多" |
| [ ] 焦點順序合理 | 待檢查 | 左→右、上→下 |
| [ ] 焦點樣式清晰可見 | 待檢查 | 不使用 `outline: none` |
| [ ] 多重導覽方式 | 待檢查 | 導覽列、搜尋、網站地圖 |
| [ ] 標題和標籤描述性 | 待檢查 | - |

**程式碼範例**:
```css
/* ✅ 好：清晰的焦點樣式 */
:focus {
  outline: 2px solid #005fcc;
  outline-offset: 2px;
}

/* ✅ 好：焦點可見樣式 */
:focus-visible {
  outline: 3px solid #005fcc;
  outline-offset: 2px;
}
```

```html
<!-- ❌ 不好：模糊連結文字 -->
<a href="/report">點此</a>

<!-- ✅ 好：描述性連結文字 -->
<a href="/report">查看 2024 年度報告</a>
```

### 2.5 輸入方式 (2.5.x - A/AA 等級)

| 項目 | 狀態 | 說明 |
|------|------|------|
| [ ] 觸控目標至少 44x44 像素 | 待檢查 | 按鈕、連結、表單元素 |
| [ ] 手勢操作有替代方式 | 待檢查 | 滑動可用按鈕替代 |
| [ ] 動作觸發可取消 | 待檢查 | 拖放可復原 |

---

## 3. 可理解 (Understandable)

### 3.1 可讀性 (3.1.x - A/AA 等級)

| 項目 | 狀態 | 說明 |
|------|------|------|
| [ ] 頁面語言有定義 | 待檢查 | `<html lang="zh-TW">` |
| [ ] 部分內容語言有標示 | 待檢查 | `<span lang="en">` |
| [ ] 避免專業術語或提供定義 | 待檢查 | - |

### 3.2 可預測 (3.2.x - A/AA 等級)

| 項目 | 狀態 | 說明 |
|------|------|------|
| [ ] 焦點移動不觸發意外改變 | 待檢查 | - |
| [ ] 輸入不自動觸發改變 | 待檢查 | 下拉選單選擇後不自動送出 |
| [ ] 導覽一致 | 待檢查 | 各頁導覽位置相同 |
| [ ] 元件一致 | 待檢查 | 相同功能相同外觀 |

### 3.3 輸入協助 (3.3.x - A/AA 等級)

| 項目 | 狀態 | 說明 |
|------|------|------|
| [ ] 錯誤訊息清晰 | 待檢查 | 說明錯誤原因和修正方式 |
| [ ] 表單有標籤和說明 | 待檢查 | - |
| [ ] 錯誤建議修正方式 | 待檢查 | "請輸入有效的 Email 格式" |
| [ ] 重要操作可確認或復原 | 待檢查 | 刪除、購買、送出 |

**程式碼範例**:
```jsx
// ✅ 好：表單錯誤處理
<div>
  <label htmlFor="email">電子郵件 *</label>
  <input
    type="email"
    id="email"
    aria-describedby="email-hint email-error"
    aria-invalid={hasError}
  />
  <p id="email-hint" className="hint">
    我們將寄送確認信到此信箱
  </p>
  {hasError && (
    <p id="email-error" className="error" role="alert">
      請輸入有效的電子郵件格式，例如：user@example.com
    </p>
  )}
</div>
```

---

## 4. 穩健性 (Robust)

### 4.1 相容性 (4.1.x - A/AA 等級)

| 項目 | 狀態 | 說明 |
|------|------|------|
| [ ] HTML 語法正確 | 待檢查 | 使用 W3C Validator |
| [ ] ID 唯一 | 待檢查 | 同頁面不重複 |
| [ ] ARIA 使用正確 | 待檢查 | 角色、狀態、屬性 |
| [ ] 狀態變化有通知 | 待檢查 | `aria-live`, `role="alert"` |
| [ ] 自訂元件有完整 ARIA | 待檢查 | - |

**程式碼範例**:
```jsx
// ✅ 好：動態內容通知
<div aria-live="polite" aria-atomic="true">
  {loading ? '載入中...' : `共 ${count} 筆結果`}
</div>

// ✅ 好：Tab 元件 ARIA
<div role="tablist" aria-label="帳戶設定">
  <button
    role="tab"
    aria-selected="true"
    aria-controls="panel-1"
    id="tab-1"
  >
    個人資料
  </button>
  <button
    role="tab"
    aria-selected="false"
    aria-controls="panel-2"
    id="tab-2"
  >
    安全設定
  </button>
</div>
<div
  role="tabpanel"
  id="panel-1"
  aria-labelledby="tab-1"
>
  ...內容...
</div>
```

---

## 5. 測試工具與流程

### 5.1 自動化測試工具

| 工具 | 用途 | 指令/使用方式 |
|------|------|--------------|
| Lighthouse | 綜合評估 | Chrome DevTools > Lighthouse |
| axe DevTools | 詳細檢測 | Chrome 擴充套件 |
| WAVE | 視覺化檢測 | wave.webaim.org |
| pa11y | CI 整合 | `npx pa11y https://example.com` |
| eslint-plugin-jsx-a11y | 開發時檢測 | ESLint 外掛 |

### 5.2 手動測試腳本

**鍵盤測試**:
1. [ ] 使用 Tab 鍵瀏覽所有互動元素
2. [ ] 確認焦點順序合理
3. [ ] 確認焦點樣式可見
4. [ ] 使用 Enter/Space 啟動按鈕和連結
5. [ ] 使用方向鍵操作選單、Tab、滑桿
6. [ ] 使用 Esc 關閉 Modal 和下拉選單
7. [ ] 確認沒有鍵盤陷阱

**螢幕閱讀器測試**:
1. [ ] VoiceOver (macOS) / NVDA (Windows)
2. [ ] 確認所有內容被正確朗讀
3. [ ] 確認圖片 alt 文字適當
4. [ ] 確認表單標籤正確
5. [ ] 確認動態內容更新被通知

### 5.3 CI/CD 整合

```yaml
# GitHub Actions 範例
name: Accessibility Check
on: [push, pull_request]

jobs:
  a11y:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run pa11y
        run: |
          npm install -g pa11y
          pa11y http://localhost:3000 --reporter cli
```

---

## 6. 改善追蹤

### 6.1 問題嚴重性分級

| 等級 | 說明 | 處理時間 |
|------|------|----------|
| 🔴 嚴重 | 完全無法使用 | 立即修復 |
| 🟠 重大 | 功能受限 | 本週修復 |
| 🟡 中等 | 使用體驗差 | 本月修復 |
| 🟢 輕微 | 可改善項目 | 規劃修復 |

### 6.2 問題追蹤範本

| 問題 ID | 頁面 | WCAG 準則 | 嚴重性 | 狀態 | 負責人 |
|---------|------|-----------|--------|------|--------|
| A11Y-001 | 首頁 | 1.1.1 | 🔴 | 修復中 | @alice |
| A11Y-002 | 登入 | 2.1.1 | 🟠 | 待處理 | @bob |

### 6.3 改善記錄

**問題 A11Y-001**:
- **描述**: Banner 圖片缺少 alt 文字
- **影響**: 螢幕閱讀器使用者無法了解圖片內容
- **修復方式**: 新增描述性 alt 文字
- **修復日期**: YYYY-MM-DD
- **驗證**: ✅ 已驗證

---

## 附錄

### A. WCAG 等級說明

| 等級 | 說明 |
|------|------|
| A | 最低要求，必須滿足 |
| AA | 標準要求，政府/企業網站應達到 |
| AAA | 最高標準，特定內容適用 |

### B. 常見 ARIA 角色

```html
<!-- 地標角色 -->
<header role="banner">
<nav role="navigation">
<main role="main">
<aside role="complementary">
<footer role="contentinfo">

<!-- 互動角色 -->
role="button"
role="link"
role="checkbox"
role="tab"
role="tabpanel"
role="dialog"
role="alert"
role="status"
```

### C. 參考資源

- [WCAG 2.1 官方文件](https://www.w3.org/WAI/WCAG21/quickref/)
- [WAI-ARIA 最佳實踐](https://www.w3.org/WAI/ARIA/apg/)
- [A11y Style Guide](https://a11y-style-guide.com/style-guide/)
- [Inclusive Components](https://inclusive-components.design/)

---

**最後更新**: YYYY-MM-DD
**版本**: 1.0
**維護者**: [無障礙專責人員]
```

---

## 品質檢查清單

- [ ] 涵蓋 WCAG 2.1 四大原則
- [ ] 每項準則有明確檢查項目
- [ ] 提供程式碼範例
- [ ] 包含測試工具和流程
- [ ] 有問題追蹤機制
- [ ] 標註嚴重性分級
- [ ] 引用官方資源

---

## 相關 Skills
- `ui-specification.md` - UI 規格（設計階段考量無障礙）
- `design-system.md` - 設計系統（元件無障礙要求）
- `test-strategy.md` - 測試策略（無障礙測試整合）
- `frontend-component.md` - 前端元件開發（實作無障礙）
