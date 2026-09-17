# 前端改善計畫（動畫稽核 + UI/UX 實測產出）

- **產出方式**：每份計畫自成一體，含現況程式碼摘錄、精確目標值、步驟、邊界、驗證與 feel check，可直接交給 sonnet 或任何代理執行。執行完成用 `/review-animations`（動畫類）或 `everything-claude-code:code-reviewer`（其他）審 diff。
- **執行規則**：一次一份或不重疊檔案的幾份平行；並行時執行者只跑 grep，`npm run build` 與 `npx vitest run` 由主代理合併後統一跑一次；每批一個 commit。

## 第一批：動畫（2026-09-17，全部完成）

稽核基準 commit `df1cb1b`，`/improve-animations` skill 四個子代理各審兩個類別後逐筆驗證。

| 編號 | 標題 | 嚴重度 | 狀態 |
|---|---|---|---|
| [001](001-modal-scale-origin.md) | 共用 Modal 縮放 0.75 改 0.95，只過渡 transform/opacity | HIGH | DONE |
| [002](002-global-reduced-motion.md) | 全域 prefers-reduced-motion 防線 | HIGH | DONE |
| [003](003-accordion-transition-height.md) | 修復無效的 `transition-height`，手風琴真的有過渡 | HIGH | DONE |
| [004](004-easing-tokens-and-fade-in-dedupe.md) | 建立 easing token、收斂三份 `fade-in` | MEDIUM | DONE |
| [005](005-right-drawers-transform-string.md) | 三個右側抽屜改百分比 transform 字串與共用 preset | MEDIUM | DONE |
| [006](006-remove-decorative-motion.md) | 移除高頻與常駐元件上的裝飾動畫 | HIGH | DONE |
| [007](007-remove-dead-motion-code.md) | 移除無人引用的動畫元件、CSS 與套件 | LOW | DONE |

## 第二批：UI/UX 收尾（2026-09-17 實測產出，全部完成）

基準 commit `564c298`。來源：`redesign-existing-projects` 與 `mobile-native` 清單靜態稽核、死碼稽核，加上用學生帳號在本機 dev 環境實測桌面與 390px 寬度（見 `HANDOFF_NEXT_SESSION.md` 的實測條件）。

| 編號 | 標題 | 嚴重度 | 範圍 | 狀態 |
|---|---|---|---|---|
| [008](008-z-index-tokens.md) | z-index 語意 token，AI 助手落到抽屜與 Modal 之下 | HIGH | config + 14 檔 class 替換 + 移除 Swal hack | DONE |
| [009](009-modal-a11y-and-portal.md) | Modal 補 Escape、焦點陷阱、role，改 portal；想法牆節點視窗加遮罩 | HIGH | Modal.jsx 重寫 + 2 檔 1 prop | DONE |
| [010](010-mobile-foundation.md) | 手機基礎：dvh、hover 守衛、觸控回饋、input 16px、safe-area；修 TopBar `xs:` bug 與首頁橫向捲軸 | HIGH | 3 個基礎檔 + 12 檔 class | DONE |
| [011](011-states-and-copy.md) | `isError.message` 兩處實質 bug、Kanban 載入骨架、首頁學期假空狀態、除錯文案 | HIGH | 6 檔約 60 行 | DONE |
| [012](012-dead-code-and-drop-console.md) | 刪 14 個零引用檔、3 條測試路由、4 個相依、孤兒資源；production drop console | LOW | 純刪除 + vite 3 行 | DONE |

### 建議順序與依賴

1. **008**：先做，009 的 Modal 會用到 `z-modal`。
2. **009、010、011**：三者檔案幾乎不重疊，可平行。重疊點只有 `SubStageBar.jsx`（010 加 `pb-safe`）與 `Kanban.jsx`（011），不衝突。
3. **012**：最後做。它會刪 SkeletonLoader 的未用 export，要保留 011 新增的 `SkeletonKanbanColumn`。

### 實測發現但未列入計畫的項目

登錄在專案根目錄 `future-list.md`：

| future-list | 內容 |
|---|---|
| F030（已於第三批完成） | 手機側欄改抽屜式導覽（收合欄佔 390px 的四分之一）；底部階段列改可橫向捲動（第三個 pill 被 AI 助手圖示切掉） |
| F031（已於第三批完成） | 收尾雜項：AI 助手泡泡手機定位蓋住「新增卡片」、導覽期間隱藏泡泡、Kanban「刪除列」X 降級並改 Swal 確認、10 處 `window.alert` / `confirm` 統一、約 30 處 UI emoji 換 react-icons、學習歷程標題列手機換行、404 頁中文化、成功訊息去驚嘆號 |
| F032（已於第三批完成） | 共用 `Button` / `Overlay` 元件、全域 `:focus-visible` ring、skip-to-content、SideBar `aria-current` |
| F033（已於第三批完成） | `authUtils` / `userUtils` 合併、日期格式化統一到 date-fns |
| F025 到 F029 | 第一批留下的：通知系統統一、按壓回饋、layout 屬性動畫、Kanban 樂觀卡片閃動、錯失的狀態轉場 |

### 實測判定做得好、不需處理

首頁、反思、Kanban 欄位的空狀態有設計過的畫面；Kanban 與想法牆的四步導覽文案精簡有情境；學習歷程頁資訊層次清楚、手機堆疊正確；提交頁的寫作提示側欄實用；ErrorBoundary 分六層且換頁自動重置；Modal 開啟時焦點有進第一個輸入框。

## 第三批：future-list F030 到 F034（2026-09-17，全部完成）

基準 commit `b0dda75`。來源：第二批留下的 F030 到 F034，直接把 future-list 的「怎麼做」展開成計畫執行。

| 編號 | 標題 | 嚴重度 | 範圍 | 狀態 |
|---|---|---|---|---|
| [013](013-mobile-nav-drawer-and-substage-scroll.md) | 手機側欄改抽屜、底部階段列可橫向捲動；skip link 與 aria-current | HIGH | SideBar / ProjectLayout / TopBar / SubStageBar + 新 hook | DONE |
| [014](014-ui-loose-ends.md) | 收尾雜項九項：AI 助手泡泡、刪除鈕降級、alert 統一、emoji、404、文案、alt、scrollbar-hidden | MEDIUM | 約 40 檔小改 + `utils/dialogs.js` | DONE |
| [015](015-utils-merge-and-date-fns.md) | authUtils / userUtils 合併、dateformat 改 date-fns | LOW | 2 utils + 23 個 import + 3 檔 + 移除相依 | DONE |
| [016](016-button-overlay-focus-ring.md) | 共用 Button / Overlay、全域 focus-visible ring | MEDIUM | 2 新元件 + 11 處遮罩 + index.css | DONE |
| [017](017-kanban-card-first-frame.md) | Kanban 卡片首幀空殼與圖片灰底佔位 | LOW | 2 檔 | DONE |

執行方式：013、014、017 平行（commit 670bc20），015、016 平行（第二個 commit）；平行代理只能用 Edit 改既有檔，避免互相覆蓋。兩批合併後用 `everything-claude-code:code-reviewer` 審完整 diff，15 點回饋全部處理。

注意：這五份計畫「驗證」段落寫的 `npx eslint <檔>.jsx` 其實不會執行（flat config 沒 match `.jsx`，見 `future-list.md` F037），真正的驗證是 `npm run build` 與 `npx vitest run`。
