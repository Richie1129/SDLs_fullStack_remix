# 完整的 Code Review 總結

這是一份關於我們今天修復內容的「核心日誌 (Kernel Log)」。

## 🛠️ 變更總結報告 (Change Log Summary)

### 1. 後端檔案下載崩潰修復 (Backend File Download Crash)
**問題 (The Bug):** 當下載含有中文字元的檔案時，Node.js 拋出 ERR_INVALID_CHAR 並導致伺服器崩潰。這是因為 HTTP Header 預設只支援 ASCII，而我們直接塞入了 UTF-8 字元。
**修正 (The Fix):** 修改 `file.js`。
- 不再使用過時且危險的 `filename="中文.txt"` 格式。
- 改用標準 RFC 5987 編碼：`filename*=UTF-8''%E4%B8%AD%E6%96%87.txt`。
**品味評分:** 🟢 Good Taste
**理由:** 這不是 hack，這是遵循標準。我們消除了伺服器崩潰的邊界情況，讓它能處理任何語言的檔名。

### 2. 後端專案提交參數相容性 (Backend Project Submit Compatibility)
**問題 (The Bug):** 前端傳送 `projectId`，但後端某些邏輯（或資料庫查詢）期望 `projectid`（全小寫）。這導致資料庫查詢失敗 (WHERE "projectid" = NULL)。
**修正 (The Fix):** 修改 `submit.js`。
- 在解構賦值時同時讀取兩者：`const { projectId, projectid, ... } = req.body`。
- 標準化變數：`const pId = projectId || projectid`。
**品味評分:** 🟡 Acceptable (湊合)
**理由:** 真正的修復應該是統一前後端的變數命名規範（Snake case vs Camel case）。但在不破壞現有前端程式碼的前提下，這種「寬容接受 (Lenient Parsing)」是實用主義的選擇。

### 3. 前端 Axios 引用錯誤 (Frontend Axios ReferenceError)
**問題 (The Bug):** `Carditem.jsx` 中直接使用了 `axios` 但未導入，導致點擊下載時前端崩潰。
**修正 (The Fix):** 修改 `Carditem.jsx` (實際為 `useFileManagement.js`)。
- 導入專案統一封裝的 `apiClient` (`import apiClient from "@/api/client"`).
- 將 `axios.get` 替換為 `apiClient.get`。
**品味評分:** 🟢 Good Taste
**理由:** 這不僅修復了 bug，還統一了 API 呼叫方式。使用封裝過的 client 可以統一處理 Token 和攔截器，這是正確的架構方向。

### 4. 檔案上傳 UX 改進 (File Upload UX Improvement)
**問題 (The Bug):** 使用者上傳檔案後，只有一個模糊的「上傳成功」，缺乏確認感。
**修正 (The Fix):** 修改 `Carditem.jsx` (實際為 `useFileManagement.js`)。
- 在上傳成功的 Toast 訊息中加入檔名和檔案大小（例如：「上傳成功: 報告.pdf (1.2 MB)」）。
**品味評分:** 🟢 Good Taste
**理由:** 這是對使用者的尊重。提供明確的反饋能減少使用者的焦慮（"我到底傳了什麼？"）。

### 5. 5R 反思視窗 RWD/UX 災難修復 (5R Reflection Modal RWD Fix)
**問題 (The Bug):**
- 視窗寬度寫死 60vw，在手機上太窄。
- 按鈕區塊隨內容捲動，長文時使用者必須捲到底才能按「取消」或「儲存」。
- 老師抱怨必須縮小視窗才能關閉。
**修正 (The Fix):** 修改 `Reflection.jsx` (實際為 `FiveRsModal.jsx` 和 `FiveRsReflectionForm.jsx`)。
- **寬度:** 改為 `w-11/12 md:w-3/4 lg:w-[60vw]`（手機版幾乎全寬）。
- **按鈕:** 將底部按鈕區塊移出捲動容器，固定在視窗底部 (border-t)。
- **關閉按鈕:** 確保它位於 sticky header 或固定位置，不隨內容捲走。
**品味評分:** 🟢 Good Taste
**理由:** 這是教科書級的 UI 修復。我們將「操作區（按鈕）」與「內容區（表單）」分離，消除了使用者必須捲動才能操作的糟糕體驗。

### 6. 科學助手視窗 RWD 災難修復 (Science Assistant Chat Window RWD Fix)
**問題 (The Bug):** 聊天視窗位置計算邏輯有缺陷，在小螢幕上會算出負座標，導致標題列（含關閉按鈕）被推到螢幕外，使用者無法關閉。
**修正 (The Fix):** 修改 `ChatWindow.jsx` 和 `useResponsive.js`。
- **CSS:** 加入 `max-w-[95vw]` 和 `max-h-[90vh]`，強制視窗適應螢幕。
- **JS:** 重寫座標計算邏輯，加入 `Math.max(padding, ...)` 保護機制，確保 top 座標永遠大於 0。
**品味評分:** 🟢 Good Taste
**理由:** 優先保證「可控性（關閉按鈕可見）」大於「完整性（下方內容可見）」。這是正確的權衡。

## 總結 (Final Verdict)
今天我們從後端底層（Binary/Header 處理）一路修到前端 UI/UX。
所有的修改都遵循了 "Never break userspace" 的原則——我們沒有破壞任何現有功能，只是讓它們在邊界情況（中文檔名、小螢幕、參數大小寫不一致）下也能正常運作。

**系統狀態：穩定 (Stable)。**
你可以繼續開發了。
