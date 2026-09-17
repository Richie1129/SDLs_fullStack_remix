# 交接提示語（貼到下一個 session）

以下整段複製貼上即可。

---

請執行 `plans/008` 到 `plans/012` 五份前端改善計畫，這是上一個 session 用 `/improve-animations` 流程與實測產出的，每份計畫自成一體。先讀 `plans/README.md` 的「第二批」節了解順序與依賴，再開始。

執行規則：
1. 依 CLAUDE.md 的模型分工：每份計畫派一個 sonnet 子代理逐字照 Steps 執行，執行前必須先讀取計畫指定的檔案與行號，與計畫的「current」摘錄比對；不符就跳過該項並回報，不得自行猜測。執行者不 commit。
2. 順序：先 008（其他計畫依賴它的 `z-modal` token）；接著 009、010、011 平行（檔案幾乎不重疊，只有 `SubStageBar.jsx` 與 `Kanban.jsx` 各被一份碰到，不衝突）；最後 012（會刪 SkeletonLoader 的未用 export，要保留 011 新增的 `SkeletonKanbanColumn`）。
3. 平行執行時，執行者只跑各計畫 Verification 的 grep，`npm run build` 與 `npx vitest run` 由你在合併後於 `sdl-frontend-main/` 統一跑一次，避免同目錄並行 build 互撞。
4. 每批合併後你親自審 diff（用 `everything-claude-code:code-reviewer` 或自己讀），確認與計畫 Target 一致、沒有超出 Boundaries，再把計畫檔的 `Status: TODO` 改成 `DONE（日期，commit 見 git log）`、更新 `plans/README.md` 狀態欄，用 `/commit` 提交（繁中訊息，主旨標明 plans 編號）。建議三個 commit：008、009+010+011、012。
5. 011 有一個診斷步驟（Kanban 欄位先出現、卡片約 3 秒後才到的空窗來源），要求執行者把結論寫進回報，你再決定是否需要在 `KanbanColumn.jsx` 補 per-column 骨架。
6. 全程遵守 CLAUDE.md：文件與 commit 禁止「§」符號、UI 禁止 emoji、時長與間距只用 token、hover 不用 scale / translate、佈局變更要確認 sm / md / lg。

Feel check 的實測條件（上一個 session 已驗證）：
- 本機 dev：`docker compose -f docker-compose.dev.yml up -d --build`，前端經 nginx 在 `http://localhost:8080`。本機 DB 已有 14 個使用者、7 個專案，不需新建帳號。專案 id 8「探究光合作用與溫度的關係」資料最完整（Kanban 有卡片、想法牆 11 個節點）。
- 瀏覽器自動化的安全規則不允許你輸入密碼或建立帳號，登入請使用者在分頁裡自己做，之後你接手操作。
- 使用者的 Chrome 視窗是最大化狀態，`resize_window` 無效；手機版面檢查用同源 iframe：在頁面注入 390px 寬的 `<iframe src="/project/8/kanban">`，媒體查詢依 iframe 寬度生效，可並排多頁截圖。
- 專案有 10 處 `window.alert` / `confirm`（Kanban 刪除列、想法牆刪除節點、留言刪除等），實測時不要點刪除類按鈕，否則瀏覽器擴充會被原生對話框卡住。
- Kanban 與想法牆首次進入有四步導覽，關掉後用 `localStorage` 的 `kanban_onboarded_8` / 想法牆對應鍵記住；要重看導覽就清掉。

全部完成後，回報每份計畫的執行結果、跳過的項目與原因、build 與測試結果、feel check 完成度，並列出 `future-list.md` F030 到 F033 供使用者決定下一步。
