# 動畫改善計畫（improve-animations 稽核產出）

- **稽核日期**：2026-09-17
- **稽核基準 commit**：df1cb1b
- **產出方式**：`/improve-animations` skill，四個唯讀子代理各審兩個類別（目的與頻率、緩動與時長、物理感與原點、可中斷性、效能、無障礙、一致性與 token、錯失機會），主代理逐筆回讀原始碼驗證後才列入。
- **執行方式**：每份計畫自成一體，可直接交給 sonnet 或任何代理執行；執行完成用 `/review-animations` 審 diff。

## 計畫清單

| 編號 | 標題 | 嚴重度 | 範圍 | 狀態 |
|---|---|---|---|---|
| [001](001-modal-scale-origin.md) | 共用 Modal 縮放 0.75 改 0.95，只過渡 transform/opacity | HIGH | 1 檔 2 行，影響 18 個模組 | DONE |
| [002](002-global-reduced-motion.md) | 全域 prefers-reduced-motion 防線 | HIGH | 2 檔約 25 行 | DONE |
| [003](003-accordion-transition-height.md) | 修復無效的 `transition-height`，手風琴真的有過渡 | HIGH | 2 檔各 1 行 | DONE |
| [004](004-easing-tokens-and-fade-in-dedupe.md) | 建立 easing token、收斂三份 `fade-in` | MEDIUM | 4 檔約 30 行 | DONE |
| [005](005-right-drawers-transform-string.md) | 三個右側抽屜改百分比 transform 字串與共用 preset | MEDIUM | 3 檔 + 1 新檔 | DONE |
| [006](006-remove-decorative-motion.md) | 移除高頻與常駐元件上的裝飾動畫 | HIGH | 6 檔約 12 行 | DONE |
| [007](007-remove-dead-motion-code.md) | 移除無人引用的動畫元件、CSS 與套件 | LOW | 刪 4 檔 + CSS 4 區塊 + 1 套件 | TODO |

## 建議執行順序

1. **004**（token 基礎）：先做，後續計畫的 `ease-out` 會自動升級為強化曲線。
2. **001、003、006**：各自獨立、改動極小、可同一個 PR。
3. **002**：獨立；若在 007 之前執行，007 的第 5 步會清掉多餘的選擇器。
4. **005**：獨立；feel check 有一項依賴 002。
5. **007**：最後做，純清理。

依賴關係：沒有硬依賴，只有上述「先做更省事」的軟順序。全部可在一個工作日內完成。

## 稽核發現但未列入計畫的項目

以下屬於較大改動或需要產品決策，已登錄在專案根目錄 `future-list.md`：

| future-list | 內容 |
|---|---|
| F025 | 三套通知系統並存（react-hot-toast、sweetalert2、QuickActions 自製），toast 進場 scale 0.6、Toaster 掛在 6 個頁面而非根層 |
| F026 | 全站可按壓元件幾乎沒有按壓回饋（`:active` 僅 2 處、`whileTap` 僅死碼 1 處） |
| F027 | 進度條用 width、手風琴用 height 做 layout 屬性動畫；進度條時長 500 / 700 / 1000ms 三種並存 |
| F028 | Kanban 樂觀新增卡片的 key 綁 id，temp id 換真 id 時 React 重掛造成閃動；卡片無 mount 動畫 |
| F029 | 錯失的狀態轉場：SubStageBar 階段切換底色瞬變、骨架換內容硬切、Onboarding overlay 無進場、ActivityStream 清單無 stagger |

## 稽核判定合理、不需處理的項目

- `src/components/SideBar.jsx`：高頻導覽刻意不用 framer，只過渡 colors 與 opacity，正確。
- `src/components/TopBar.jsx` 與所有 Escape / Enter 觸發路徑：鍵盤動作零動畫，正確。
- Login / Register / ForgotPassword 的 `animate-rise`、`animate-float`：唯一行銷型頁面，時長可較長，且已加 `motion-safe:`。
- `PersonalDailyModal` / `TeamDailyModal` 的 framer variant 用 `scale: 0.95`，正確。
- `animate-spin`（28 處）與骨架用 `animate-pulse`：狀態指示，保留。
- `useVisNetwork.js:195` 的 `network.fit` 500ms ease-in-out：畫布相機平移屬 on-screen movement，只在載入時跑一次。
- `chartConfig.js` 的 750ms 圖表進場：資料圖表而非 UI chrome，可接受；若 dashboard 使用者反映慢再降到 400ms。
