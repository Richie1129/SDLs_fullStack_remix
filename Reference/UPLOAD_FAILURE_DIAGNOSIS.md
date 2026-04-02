# SDL 平台上傳失敗問題 — 全面診斷報告

> **診斷日期：** 2026-04-02
> **問題狀態：** 全部已修復
> **影響範圍：** 所有外部使用者（高中生）的 `/submit` 提交功能（含純文字與檔案上傳）
> **生產環境域名：** `https://science.lazyinwork.com`
> **部署方式：** GitHub Actions → Docker Hub → SSH 部署至遠端主機
> **相關修復 commit：**
> - `05383b7` — 修復白屏、refreshToken 未儲存、token refresh queue 機制（已部署，NPM logs 確認 refresh 全部 200）
> - `0c4db27` — Axios FormData timeout 延長至 5 分鐘 + 內部 Nginx `/api/` proxy timeout 300s（已 push，待部署）
> **NPM 實際確認：** `science.lazyinwork.com` 的 proxy host **無** `client_max_body_size`、`proxy_read_timeout`、`proxy_send_timeout` 設定（全走 Nginx 預設值）

---

## 目錄

- [問題描述](#問題描述)
- [問題分類：兩種不同的失敗模式](#問題分類兩種不同的失敗模式)
- [生產環境架構分析](#生產環境架構分析)
- [發現的問題（依嚴重程度排序）](#發現的問題依嚴重程度排序)
  - [P0-1：NPM 未設定 client_max_body_size（已確認）](#p0-1npm-未設定-client_max_body_size已確認)
  - [P0-2：JWT 僅 1 小時過期 + 不穩定網路 → 無回應錯誤](#p0-2jwt-僅-1-小時過期--不穩定網路--無回應錯誤)
  - [P0-3：Axios 全域 30 秒超時（檔案上傳）](#p0-3axios-全域-30-秒超時檔案上傳)
  - [P0-4：內部 Nginx /api/ 缺少 proxy timeout](#p0-4內部-nginx-api-缺少-proxy-timeout)
  - [P1-1：MINIO_PUBLIC_ENDPOINT 配置錯誤](#p1-1minio_public_endpoint-配置錯誤導致檔案-url-無法存取)
  - [P1-2：CORS 未設定生產環境域名](#p1-2cors-配置未設定生產環境域名)
  - [P1-3：提交失敗無重試機制](#p1-3提交失敗無重試機制)
  - [P2-1：記憶體儲存模式並發 OOM 風險](#p2-1記憶體儲存模式--並發上傳可能-oom)
  - [P2-2：無前端檔案驗證與進度回饋](#p2-2無前端檔案大小驗證--無上傳進度條)
  - [SEC-1：.env 機敏資訊暴露在 Git 倉庫](#sec-1env-機敏資訊暴露在-git-倉庫)
- [全堆疊限制比對表](#全堆疊限制比對表)
- [根因分析流程圖](#根因分析流程圖)
- [解決方案](#解決方案)
- [執行優先順序](#執行優先順序)

---

## 問題描述

外部使用者（高中生）在專案的 `/submit` 頁面點擊「上傳」按鈕時頻繁失敗。**即使只提交純文字（沒有附檔案）也會失敗**，但同一時間在部署機上執行相同操作則正常。

commit `05383b7` 已修復失敗時的前端白屏問題（原始碼 `error.response.data.message` 在 `error.response` 為 `undefined` 時觸發 TypeError），但**提交失敗本身尚未根治**。

**使用情境特殊性：**

- 學生每次上課可能使用不同裝置（平板輪用）
- 上課結束時學生常直接滑掉頁面歸還平板，不會正式登出
- 學校 WiFi 為多人共用，上傳頻寬受限

---

## 問題分類：兩種不同的失敗模式

根據分析，學生遇到的是**兩個不同的問題**，需要分別修復：

### 失敗模式 A：純文字提交失敗（`error.response` 為 `undefined`）

**症狀：** 學生只打文字點「上傳」就失敗，修復前會白屏
**Axios 錯誤類型：** `Network Error`（沒有 HTTP 回應，`error.response` 為 `undefined`）
**資料量：** 幾 KB（不可能是大小或超時問題）

**最可能原因：** JWT 1 小時過期 → 401 → interceptor 嘗試 refresh token → **refresh 過程中學校 WiFi 瞬斷** → 整個請求鏈失敗且沒有 HTTP 回應

**為什麼部署機不會發生：**
- 開發者 token 新鮮（剛登入），不會觸發 refresh
- 部署機網路穩定，不會瞬斷

### 失敗模式 B：檔案上傳失敗

**症狀：** 學生附加檔案後提交失敗
**最可能原因：** NPM `client_max_body_size` 預設 1MB（**已確認**）→ 任何超過 1MB 的請求直接被 NPM 拒絕（`413 Request Entity Too Large`）

**為什麼部署機不會發生：**
- 本地開發不經過 NPM
- 內部 Nginx 已設 100MB

---

## 生產環境架構分析

根據 `science.lazyinwork.com/` 目錄中的實際部署配置，生產環境架構如下：

### 網路拓撲（三層代理）

```
學生瀏覽器 (https://science.lazyinwork.com)
       |
       v
[Nginx Proxy Manager (NPM)] ← 外部網路 npm-shared，處理 SSL/HTTPS
       |
       v  port 19084
[內部 Nginx] ← nginx.test.conf，處理路由分發
       |
       ├── /api/     → [API 容器] port 13000:3000
       ├── /socket.io/ → [API 容器]
       └── /          → [Front 容器] port 15173:5173
                             |
                     [MinIO] port 19000:9000
                     [PostgreSQL] port 15432:5432
```

**關鍵發現：** 生產環境有 **三層** 網路節點（NPM → 內部 Nginx → Node.js），每一層都有各自的 timeout 設定，任何一層超時都會導致上傳失敗。

### 生產環境 vs 本地開發 — 關鍵差異

| 配置項 | 生產環境 (`.env`) | 本地開發 (`config/index.js` 預設) | 影響 |
|--------|-----------------|--------------------------------|------|
| `JWT_EXPIRES_IN` | **3600（1 小時）** | 86400（24 小時） | 上課期間 token 更容易過期 |
| 反向代理層數 | **3 層**（NPM + Nginx + Node） | 1 層（Nginx + Node） | 超時點多了一層 |
| MinIO 存取 | Docker 內部網路 | Docker 內部網路 | 相同 |
| `MINIO_PUBLIC_ENDPOINT` | `http://minio:19000` | `http://localhost:9000` | 外部無法解析 `minio` 主機名 |
| `ALLOWED_ORIGINS` | **未設定** | 未設定 | 兩邊都缺 |
| SSL/HTTPS | 有（NPM 處理） | 無 | NPM 額外增加處理時間 |

---

## 調查範圍

本次診斷涵蓋上傳功能的完整鏈路：

| 層級 | 調查項目 | 相關檔案 |
|------|---------|---------|
| 前端 API 層 | Axios 設定、timeout、interceptor | `sdl-frontend-main/src/api/client.js` |
| 前端上傳入口 | 所有上傳元件與 hooks | 見下方清單 |
| 外層代理 | Nginx Proxy Manager (NPM) | 遠端主機上，需 SSH 檢查 |
| 內層代理 | 內部 Nginx timeout、body size | `science.lazyinwork.com/nginx.test.conf` |
| 後端認證 | JWT 驗證中間件 | `sdl-backend-main/middlewares/AuthMiddleware.js` |
| 後端上傳 | Multer + MinIO 中間件 | `sdl-backend-main/middlewares/minioUploadMiddleware.js` |
| Token 機制 | 刷新流程、過期處理 | `sdl-backend-main/config/index.js`、`client.js` |
| MinIO 配置 | 檔案 URL 生成 | `sdl-backend-main/config/minio.js` |
| CORS | 允許的 origin 設定 | `sdl-backend-main/config/index.js` |
| Docker | 網路、環境變數 | `science.lazyinwork.com/docker-compose.yml` |
| CI/CD | GitHub Actions 部署流程 | `.github/workflows/deploy.yml` |

### 上傳入口清單（共 6 個流程）

| 流程 | 端點 | 前端檔案 |
|------|------|---------|
| 看板卡片附檔 | `POST /api/upload` | `src/pages/Kanban/components/carditem/hooks/useFileManagement.js` |
| 提交任務 | `POST /api/submit` | `src/pages/submit/SubmitTask.jsx` |
| 個人每日反思 | `POST /api/daily`、`PUT /api/daily/personal/:id` | `src/pages/reflection/hooks/usePersonalDaily.js` |
| 團隊每日反思 | `POST /api/daily/team`、`PUT /api/daily/team/:id` | `src/pages/reflection/hooks/useTeamDaily.js` |
| 專案留言附檔 | `POST /api/project-comments/:commentId/attachments` | `src/components/ProjectCommentDrawer.jsx` |
| 任務留言附檔 | `POST /api/tasks/:taskId/comments` | `src/api/comments.js` |

---

## 發現的問題（依嚴重程度排序）

### P0-1：NPM 未設定 client_max_body_size（已確認）✅ 已修復

**嚴重程度：** 極高（已確認。直接阻擋所有 > 1MB 的請求）
**對應失敗模式：** B（檔案上傳）
**修復方式：** 已在 NPM Advanced 加入 `client_max_body_size 100M; proxy_read_timeout 300; proxy_send_timeout 300; client_body_timeout 300;`

**確認方式：** SSH 到部署主機執行 `grep client_max_body_size` 確認 NPM 的 `1.conf` 完全沒有此設定

```bash
# 確認結果：NPM 1.conf 無 client_max_body_size、proxy_read_timeout、proxy_send_timeout
sudo docker exec nginx-proxy-manager-app-1 sh -c \
  'grep -rE "client_max_body_size|proxy_read_timeout|proxy_send_timeout" /data/nginx/proxy_host/1.conf'
# （無任何輸出 = 全走 Nginx 預設值）
```

**Nginx 預設值 `client_max_body_size` = 1MB。** 任何超過 1MB 的請求（含 multipart FormData + 檔案）在最外層 NPM 就被拒絕，回傳 `413 Request Entity Too Large`。

**修復方式：** NPM 管理界面 → Proxy Hosts → `science.lazyinwork.com` → Edit → Advanced 標籤頁：

```nginx
client_max_body_size 100M;
proxy_read_timeout 300;
proxy_send_timeout 300;
client_body_timeout 300;
```

**存檔後立即生效，不需要重新部署。**

---

### P0-2：JWT 僅 1 小時過期 + 不穩定網路 → 無回應錯誤 ✅ 已修復

**嚴重程度：** 極高（導致純文字提交也失敗）
**對應失敗模式：** A（純文字提交）
**修復方式：** 遠端 `.env` 已改 `JWT_EXPIRES_IN=28800`（8 小時）並重啟 API

**檔案位置：**
- 生產環境 `.env:23`：`JWT_EXPIRES_IN=3600`（1 小時）
- 程式碼預設值 `config/index.js:36`：`86400`（24 小時）

**問題推導過程：**

commit `05383b7` 修復白屏前，原始碼 `error.response.data.message` 會 TypeError。這代表 `error.response` 是 `undefined`。在 Axios 中，`error.response` 為 `undefined` 只有三種情況：

| 情況 | Axios 錯誤訊息 | 純文字是否可能？ |
|------|---------------|----------------|
| 請求逾時 | `timeout of 30000ms exceeded` | 不可能（幾 KB） |
| 請求被取消 | `canceled` | 不可能（程式碼中沒有 cancel） |
| **網路錯誤** | **`Network Error`** | **可能** |

**純文字提交觸發 Network Error 的推導：**

```
1. 學生 09:00 登入 → accessToken 有效到 10:00（JWT_EXPIRES_IN=3600）
2. 學生 10:05 點「上傳」→ token 已過期
3. POST /api/submit → 後端回傳 401 TOKEN_EXPIRED
4. 前端 interceptor 自動嘗試 POST /api/auth/refresh
5. 學校 WiFi 在此瞬間不穩（多人共用、AP 切換）→ refresh 請求 Network Error
6. Interceptor catch 失敗 → 清除 storage → 呼叫 window.location.assign('/login')
7. 但因為是 Promise chain，reject 會先傳播到 react-query 的 onError
8. onError 收到的 error.response 為 undefined → 原始碼 TypeError → 白屏
```

**為什麼部署機不會發生：**
- JWT 在開發環境預設 24 小時（`config/index.js` 預設值），測試時不會過期
- 部署機網路穩定，即使觸發 refresh 也不會 Network Error

**修復方式：**

1. **延長 JWT 有效期**（遠端 `.env`）：
```env
# 修改前
JWT_EXPIRES_IN=3600

# 修改後（8 小時，覆蓋一整天上課）
JWT_EXPIRES_IN=28800
```

2. **前端加入提交重試機制**（見解決方案 P1-3）

---

### P0-3：Axios 全域 30 秒超時（檔案上傳）✅ 已修復

**嚴重程度：** 極高（修復 NPM 後仍需處理）
**對應失敗模式：** B（檔案上傳）
**修復 commit：** `0c4db27` — 在 request interceptor 中偵測 FormData 自動延長 timeout 至 300s（5 分鐘）

**檔案位置：** `sdl-frontend-main/src/api/client.js:10`

```javascript
const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 30000, // 30秒全局超時，避免請求永久掛起
});
```

**問題說明：**

所有 API 請求共用同一個 30 秒超時設定，包含檔案上傳。在學校 WiFi 環境下，上傳頻寬通常只有 1-5 Mbps（多人共用），中大型檔案根本無法在 30 秒內完成傳輸。

**實際傳輸時間估算：**

| 檔案大小 | 1 Mbps（擁塞） | 3 Mbps（一般） | 10 Mbps（良好） | 30 秒內能完成？ |
|----------|---------------|---------------|----------------|--------------|
| 5 MB | ~40 秒 | ~13 秒 | ~4 秒 | 僅良好網速可以 |
| 10 MB | ~80 秒 | ~27 秒 | ~8 秒 | 擁塞時必失敗 |
| 20 MB | ~160 秒 | ~53 秒 | ~16 秒 | 僅良好網速可以 |
| 50 MB | ~400 秒 | ~133 秒 | ~40 秒 | 全部失敗 |
| 100 MB | ~800 秒 | ~267 秒 | ~80 秒 | 全部失敗 |

**為什麼部署機沒問題：** localhost 傳輸延遲趨近於零，100MB 檔案也只需幾秒。

**錯誤表現：** 瀏覽器 Console 會看到 `AxiosError: timeout of 30000ms exceeded`，前端顯示通用錯誤 toast。

---

### P0-4：內部 Nginx `/api/` 缺少 proxy timeout ✅ 已修復

**嚴重程度：** 高（與 P0-3 疊加）
**對應失敗模式：** B（檔案上傳）
**修復 commit：** `0c4db27` — `nginx.conf` 和 `nginx.test.conf` 的 `/api/` 區塊加入 `proxy_read_timeout 300; proxy_send_timeout 300; client_body_timeout 300;`

**檔案位置：** `science.lazyinwork.com/nginx.test.conf:50-61`（與本地 `nginx.conf` 相同）

已修復，不再使用 Nginx 預設的 60 秒 timeout。

---

### P0-3b：JWT 過期後 FormData 重試送空 body ✅ 已修復

**嚴重程度：** 極高（生產環境特有問題，本地開發不會發生）

**檔案位置：**
- 前端 interceptor：`sdl-frontend-main/src/api/client.js`
- 提交頁面：`sdl-frontend-main/src/pages/submit/SubmitTask.jsx`

**修復方式（雙層防護）：**
1. **Interceptor 層**：token refresh 成功後，偵測原始請求是 FormData 則不自動重試，回傳 `UPLOAD_RETRY_AFTER_REFRESH` 錯誤提示使用者重新操作
2. **Mutation 層**：`useMutation` 改為接收原始資料（projectId、taskData、File 物件），每次重試時重新建構 FormData，避免 stream 消耗問題。同時加入 retry 機制（網路瞬斷最多重試 2 次，4xx 和 UPLOAD_RETRY_AFTER_REFRESH 不重試）

**這是之前報告的 P1-1，但根據生產環境配置升級為 P0。**

**原因：** 之前以為 JWT 有效期是 24 小時（程式碼預設值），單堂課內不太會過期。但生產環境 `.env` 明確設定為 **1 小時**。

**典型故障場景：**

```
09:00 學生登入 → 取得 accessToken（1 小時有效，到 10:00 過期）
09:00-09:50 正常使用平台（看看板、寫反思等）
09:55 學生點擊「上傳作業」
  → 此時 token 已過期或即將過期
  → 後端回傳 401 (TOKEN_EXPIRED)
  → 前端 interceptor 自動刷新 token ✅
  → interceptor 重試原始上傳請求 ⚠️
  → FormData 可能已被第一次請求消耗
  → 後端收到空 body → 400 錯誤 ❌
```

**更糟的場景（跨節課）：**

```
第一節課 09:00 登入
下課休息（學生沒有登出，也沒關閉頁面）
第二節課 10:10 繼續使用
  → accessToken 已過期（09:00 + 1h = 10:00）
  → 所有 API 請求都會觸發 401 → 刷新 token
  → 如果此時上傳檔案 → FormData 重試問題觸發
```

**FormData 重試問題的技術細節：**

```javascript
// client.js line 94
return apiClient(originalRequest);
// originalRequest.data 是 FormData
// FormData 在某些瀏覽器中基於 ReadableStream
// stream 被第一次（失敗的）請求消耗後，無法重讀
// 重試送出的是空的 body
```

**為什麼部署機不會發生：**
- 開發者通常在本地開發測試時不會等超過 1 小時
- 就算 token 過期，本地的 localhost 上傳是瞬間完成，FormData 可能還沒被完全消耗就已經收到 401

---

### P1-1：MINIO_PUBLIC_ENDPOINT 配置錯誤，導致檔案 URL 無法存取 ✅ 已修復

**嚴重程度：** 高（不直接影響上傳，但影響上傳後的檔案存取）

**調查結果：** 前端**完全不使用**資料庫中的 `fileUrl`，而是透過 `fileName` 建構 `/api/file/direct/:fileName` 和 `/api/file/image/:fileName` 代理 URL（見 `src/utils/fileUrlBuilder.js`）。因此此問題不影響前端功能。

**修復方式：**
- `config/minio.js`：移除 `publicEndpoint` 配置項（不再使用）
- `uploadFileToMinio` 儲存的 URL 改為邏輯路徑 `minio://<bucket>/<fileName>`，不依賴任何主機名
- 舊資料庫中已有的 `http://minio:19000/...` URL 不影響功能（前端不讀取 `fileUrl`）

---

### P1-2：CORS 配置未設定生產環境域名 ✅ 已修復

**嚴重程度：** 中

**修復方式：**
- 三個 `docker-compose*.yml` 都加入 `ALLOWED_ORIGINS` 環境變數傳遞
- `config/index.js` 修正空字串判斷（`raw && raw.trim()` 避免 `"".split(',')` 產生 `['']`）
- 部署時需在 `.env` 設定 `ALLOWED_ORIGINS=https://science.lazyinwork.com,http://localhost`

**問題說明：**

- 生產環境 `.env` 中 **沒有** `ALLOWED_ORIGINS`
- `docker-compose.yml` 也未傳入此環境變數
- 生產環境 fallback 到僅允許 `localhost` 的 origin 列表

**實際影響分析：**

因為生產環境架構是 NPM → 內部 Nginx 同時代理前端和 API（都在 `https://science.lazyinwork.com` 同一 origin 下），瀏覽器的請求通常是 same-origin，不太會觸發 CORS preflight。

**但仍建議修復**，因為：
- 某些瀏覽器在 multipart upload 時可能會發送 CORS preflight
- 如果前端直接訪問 MinIO URL（不同 origin），CORS 就會成為問題
- 屬於配置缺陷，未來架構變更時會爆發

---

### P1-3：提交失敗無重試機制 ✅ 已修復

**嚴重程度：** 中高
**對應失敗模式：** A + B

**修復方式：** `SubmitTask.jsx` 的 `useMutation` 加入 retry 配置：
- 網路瞬斷等暫時性錯誤最多重試 2 次（間隔 1s、2s）
- 4xx 錯誤（權限、驗證等）不重試
- `UPLOAD_RETRY_AFTER_REFRESH` 錯誤不重試（由 interceptor FormData 防護產生）
- mutationFn 每次重試時重新建構 FormData，確保不會送出已消耗的 stream

---

### P2-1：記憶體儲存模式 — 並發上傳可能 OOM ✅ 已修復

**嚴重程度：** 中低（僅在高並發時觸發）

**修復方式：**
- `minioUploadMiddleware.js`：Multer 從 `memoryStorage()` 改為 `diskStorage(os.tmpdir())`
- 上傳到 MinIO 改用 `fs.createReadStream()` 串流，不再將整個檔案讀入記憶體
- `config/minio.js`：`uploadFileToMinio` 支援 Buffer 和 ReadableStream 兩種輸入
- 所有錯誤路徑和 finally 區塊都有暫存檔清理邏輯

---

### P2-2：無前端檔案大小驗證 & 無上傳進度條 ✅ 已修復

**嚴重程度：** 低（UX 問題，不直接導致功能失敗）

**修復方式：**
1. **新增 `src/utils/fileValidation.js`** — 共用的 `validateFileSize()` 函式，超過 100MB 顯示 toast 並阻止上傳
2. **所有 5 個上傳入口加入驗證**：SubmitTask、Kanban 檔案上傳、反思日誌、專案留言附檔、任務留言附檔
3. **SubmitTask 上傳進度條** — 顯示百分比進度，無法計算時顯示 pulse 動畫；上傳中按鈕 disabled 防止重複點擊
4. **`submitTask` API 支援 `onUploadProgress`** — 透過 `extraConfig` 傳入 Axios

---

### SEC-1：.env 機敏資訊暴露在 Git 倉庫 ✅ 已處理

**嚴重程度：** 安全風險

**檔案位置：** `science.lazyinwork.com/.env`（已從 Git 倉庫刪除）

此檔案已由使用者手動刪除，不再存在於 Git 倉庫中。該檔案僅作為診斷參考使用。

---

## 全堆疊限制比對表

| 層級 | 設定項 | 限制值 | 位置 | 狀態 |
|------|--------|-------|------|------|
| 前端驗證 | 檔案大小 | **未設定** | — | ⚠️ 缺少 |
| Axios timeout | `timeout` | **30 秒** | `client.js:10` | ⚠️ 太短 |
| NPM body size | `client_max_body_size` | **未確認（可能 1MB）** | 遠端 NPM 設定 | ⚠️ 需確認 |
| NPM proxy timeout | `proxy_read_timeout` | **60 秒（預設）** | 遠端 NPM 設定 | ⚠️ 太短 |
| 內部 Nginx body size | `client_max_body_size` | 100 MB | `nginx.test.conf:48` | 一致 |
| 內部 Nginx timeout | `proxy_read_timeout` | **60 秒（預設）** | `nginx.test.conf` 未設定 | ⚠️ 太短 |
| Express JSON parser | `limit` | 10 MB | `server.js:88` | N/A |
| Multer 檔案大小 | `fileSize` | 100 MB | `minioUploadMiddleware.js:10` | 一致 |
| Multer 檔案數量 | `maxCount` | 10 個 | `minioUploadMiddleware.js:50` | — |
| JWT 有效期 | `JWT_EXPIRES_IN` | **3600 秒（1 小時）** | 生產 `.env:23` | ⚠️ 太短 |

---

## 根因分析流程圖

```
學生在平板上傳檔案 (https://science.lazyinwork.com)
       |
       v
  ┌─ NPM 層 ─────────────────────────────────────────┐
  │ client_max_body_size 足夠？                        │
  │   否 → ❌ 413 Request Entity Too Large             │
  │   是 → proxy_read_timeout > 傳輸時間？             │
  │          否 → ❌ 504 Gateway Timeout (NPM 層)       │
  │          是 → 繼續                                  │
  └───────────────────────────────────────────────────┘
       |
       v
  ┌─ 前端 Axios 層 ──────────────────────────────────┐
  │ 檔案傳輸時間 < 30 秒？                             │
  │   否 → ❌ AxiosError: timeout of 30000ms exceeded  │
  │   是 → 繼續                                        │
  └───────────────────────────────────────────────────┘
       |
       v
  ┌─ Token 驗證層 ───────────────────────────────────┐
  │ accessToken 有效？（生產環境僅 1 小時有效）         │
  │   否 → 401 → interceptor 刷新 token               │
  │        → 重試上傳                                   │
  │        → FormData 已被消耗？                        │
  │            是 → ❌ 空 body 400 錯誤                 │
  │            否 → 繼續                                │
  │   是 → 繼續                                        │
  └───────────────────────────────────────────────────┘
       |
       v
  ┌─ 內部 Nginx 層 ──────────────────────────────────┐
  │ proxy_read_timeout > 後端處理時間？                 │
  │   否 → ❌ 504 Gateway Timeout (內部 Nginx)         │
  │   是 → 繼續                                        │
  └───────────────────────────────────────────────────┘
       |
       v
  ┌─ Node.js 後端層 ─────────────────────────────────┐
  │ 記憶體足夠？                                       │
  │   否 → ❌ 500 或 OOM crash                         │
  │   是 → Multer 讀入記憶體 → 上傳至 MinIO            │
  │        → MinIO 上傳成功？                           │
  │            否 → ❌ 500 MinIO 上傳失敗               │
  │            是 → ✅ 上傳成功                         │
  └───────────────────────────────────────────────────┘
       |
       v
  ┌─ 檔案存取層（上傳後）─────────────────────────────┐
  │ 儲存的 URL: http://minio:19000/sdls-files/...     │
  │ 瀏覽器能解析 "minio" 主機名？                      │
  │   否 → ❌ 檔案無法開啟/預覽（學生以為上傳失敗）    │
  └───────────────────────────────────────────────────┘
```

---

## 解決方案

### 修復 1（P0）：為上傳請求設定獨立的長超時

**目標：** 不影響一般 API 的 30 秒超時保護，僅對上傳請求放寬至 5 分鐘

**修改方式：** 在每個上傳呼叫處覆蓋 `timeout` 參數

**需要修改的檔案：**

| 檔案 | 修改位置 | 修改方式 |
|------|---------|---------|
| `src/pages/Kanban/components/carditem/hooks/useFileManagement.js` | `apiClient.post('/upload', formData)` | 加入 `{ timeout: 300000 }` |
| `src/api/submit.js` | `apiClient.post('/submit', formData)` | 加入 `{ timeout: 300000 }` |
| `src/pages/reflection/hooks/usePersonalDaily.js` | POST 和 PUT 請求 | 加入 `{ timeout: 300000 }` |
| `src/pages/reflection/hooks/useTeamDaily.js` | POST 和 PUT 請求 | 加入 `{ timeout: 300000 }` |
| `src/components/ProjectCommentDrawer.jsx` | 附件上傳請求 | 加入 `{ timeout: 300000 }` |
| `src/api/comments.js` | 任務留言上傳請求 | 加入 `{ timeout: 300000 }` |

**範例：**

```javascript
// 修改前
apiClient.post('/upload', formData);

// 修改後
apiClient.post('/upload', formData, { timeout: 300000 }); // 5 分鐘
```

**為什麼這樣有效：**

- Axios 允許在個別請求中覆蓋全域設定
- 5 分鐘 (300,000ms) 足夠在 1 Mbps 網速下傳輸約 37MB
- 一般 API 請求仍維持 30 秒超時保護，不會因為這個修改而「永久掛起」
- 這是最小改動、最大效果的修復

---

### 修復 2（P0）：三層代理全部加上 timeout 和 body size

#### 2a. 內部 Nginx（你可以直接改）

**修改檔案：** `nginx.test.conf` 和 `nginx.conf`（保持同步）

```nginx
location /api/ {
    set $api http://api:3000;
    proxy_pass $api;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;

    # 新增：上傳與長時間處理的 timeout 設定
    proxy_read_timeout 300;      # 等待後端回應最多 5 分鐘
    proxy_send_timeout 300;      # 向後端傳送資料最多 5 分鐘
    client_body_timeout 300;     # 等待客戶端傳送 body 最多 5 分鐘
}
```

#### 2b. Nginx Proxy Manager（需 SSH 到遠端主機操作）

登入 NPM 管理介面，找到 `science.lazyinwork.com` 的 proxy host：

1. **Custom Nginx Configuration** 中加入：

```nginx
client_max_body_size 100M;
proxy_read_timeout 300;
proxy_send_timeout 300;
client_body_timeout 300;
```

2. 或在 NPM 的 **Advanced** 標籤頁中貼入上述配置

**為什麼這樣有效：**

- 三層代理的 timeout 全部統一為 300 秒（5 分鐘）
- NPM 的 `client_max_body_size` 必須 >= 100MB，否則大檔案在最外層就被攔截
- 確保任何一層都不會成為上傳的瓶頸

**修改後需要重啟 Nginx：**

```bash
# 內部 Nginx
cd /home/hsueh/SDLs_fullStack_remix_v3_lazyinwork
docker-compose restart nginx

# NPM 通常在修改後自動生效，若無效則重啟 NPM 容器
```

---

### 修復 3（P0）：修復 JWT 過期 + FormData 重試問題

此修復有兩個面向，建議同時執行：

#### 3a. 延長 JWT 有效期（快速修復）

**修改檔案：** 遠端主機上的 `.env`

```env
# 修改前
JWT_EXPIRES_IN=3600

# 修改後（延長至 8 小時，覆蓋一整天的上課時間）
JWT_EXPIRES_IN=28800
```

**為什麼 8 小時：**
- 一般上課日約 8:00-16:00，8 小時可覆蓋整天
- 搭配 7 天的 refreshToken，即使跨天也能自動刷新
- 不需要過長（如 24 小時），減少 token 被盜用的風險窗口

#### 3b. 保護 FormData 上傳不被 interceptor 自動重試（根本修復）

**修改檔案：** `sdl-frontend-main/src/api/client.js`

**修改位置：** 在 line 91-94 之間（重試原始請求之前）

```javascript
// 修改前（line 91-94）
originalRequest.headers['accessToken'] = newAccessToken;
originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
return apiClient(originalRequest);

// 修改後
originalRequest.headers['accessToken'] = newAccessToken;
originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

// FormData（檔案上傳）在 stream 被消耗後無法重試
// 回傳特定錯誤讓上傳元件提示使用者重新操作
if (originalRequest.data instanceof FormData) {
  const retryError = new Error('登入狀態已更新，請重新上傳檔案');
  retryError.code = 'UPLOAD_RETRY_AFTER_REFRESH';
  return Promise.reject(retryError);
}

return apiClient(originalRequest);
```

**為什麼這樣有效：**

- 3a 大幅降低上課期間 token 過期的機率（從 1 小時延長到 8 小時）
- 3b 即使 token 過期，也不會因為自動重試而送出空的 FormData
- 使用者會看到明確的提示「登入已更新，請重新上傳」，而非不明的 400 錯誤
- 一般 JSON 請求的 401 自動重試不受影響

---

### 修復 4（P1）：修正 MINIO_PUBLIC_ENDPOINT

**目標：** 讓上傳後儲存的檔案 URL 能被外部瀏覽器存取

**方案 A：改用 Presigned URL（推薦）**

修改 `sdl-backend-main/config/minio.js:57`，不再儲存 public URL，改為在需要存取檔案時動態生成 presigned URL：

```javascript
// 修改前
const fileUrl = `${minioConfig.publicEndpoint}/${minioConfig.bucketName}/${fileName}`;

// 修改後：僅儲存檔案路徑，不儲存完整 URL
const fileUrl = `minio://${minioConfig.bucketName}/${fileName}`;
```

然後在檔案下載 API 中使用已有的 `getPresignedDownloadUrl()` 函式動態生成臨時存取 URL。

**方案 B：透過 NPM 暴露 MinIO（簡單但安全性較低）**

在 NPM 中新增一個 proxy host，例如 `minio.lazyinwork.com`，轉發到 MinIO 的 9000 port，然後：

```env
MINIO_PUBLIC_ENDPOINT=https://minio.lazyinwork.com
```

**為什麼推薦方案 A：**
- Presigned URL 有時效性（預設 1 小時），過期自動失效
- 不需要將 MinIO 直接暴露在公網上
- 已有 `getPresignedDownloadUrl()` 函式，只需要在前端下載時調用

**注意：** 此問題需要進一步確認前端如何使用儲存的檔案 URL。如果前端已經透過後端 API 做下載代理（例如 `GET /api/files/:id`），則此問題可能不存在。

---

### 修復 5（P1）：設定 ALLOWED_ORIGINS 環境變數

**修改檔案 1：** `science.lazyinwork.com/docker-compose.yml`

在 `api` 服務的 `environment` 區段加入：

```yaml
environment:
  # ... 既有設定 ...
  - ALLOWED_ORIGINS=${ALLOWED_ORIGINS}
```

**修改檔案 2：** `science.lazyinwork.com/.env`

```env
ALLOWED_ORIGINS=https://science.lazyinwork.com,http://localhost
```

**為什麼這樣有效：**

- 確保 CORS 設定正確匹配生產域名 `https://science.lazyinwork.com`
- 特別是在 multipart upload 的 CORS preflight 場景下
- 使用環境變數而非 hardcode，符合 12-factor app 原則

---

### 修復 6（P2）：加入前端檔案大小驗證與上傳進度條

**目標：** 改善使用者體驗，減少無效上傳與重複操作

#### 6a. 前端檔案大小驗證

```javascript
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

for (const file of files) {
  if (file.size > MAX_FILE_SIZE) {
    toast.error(`檔案「${file.name}」超過 100MB 限制`);
    return;
  }
}
```

#### 6b. 上傳進度回饋

```javascript
apiClient.post('/upload', formData, {
  timeout: 300000,
  onUploadProgress: (progressEvent) => {
    const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
    setUploadProgress(percent);
  }
});
```

**為什麼這樣有效：**

- 前端預先攔截超大檔案，避免浪費頻寬與等待時間
- 進度條讓學生知道上傳正在進行，不會因為「看起來沒反應」而重複點擊
- 減少重複點擊 = 減少並發上傳 = 降低後端記憶體壓力

---

## 執行優先順序

### 第一階段：立即修復（不需要重新部署）

| 優先順序 | 修復項目 | 問題編號 | 操作方式 | 狀態 |
|----------|---------|---------|---------|------|
| **P0** | NPM 加 body size + timeout | P0-1 | NPM 管理界面 → Advanced 加 4 行 | ✅ 已完成 |
| **P0** | JWT 延長至 8 小時 | P0-2 | 遠端 `.env` 改 `JWT_EXPIRES_IN=28800` + 重啟 API | ✅ 已完成 |

### 第二階段：程式碼修復（需要重新部署）

| 優先順序 | 修復項目 | 問題編號 | 改動量 | 狀態 |
|----------|---------|---------|--------|------|
| **P0** | Axios 上傳 timeout 5 分鐘 | P0-3 | interceptor 加 FormData 偵測 | ✅ 已修復 (`0c4db27`) |
| **P0** | 內部 Nginx 加 proxy timeout | P0-4 | nginx.conf + nginx.test.conf 各加 3 行 | ✅ 已修復 (`0c4db27`) |
| **P0** | FormData 重試保護 | 修復 3b | client.js interceptor + SubmitTask.jsx mutationFn 重構 | ✅ 已修復 |
| **P1** | 提交加入重試機制 | P1-3 | SubmitTask.jsx retry 配置（2 次，排除 4xx） | ✅ 已修復 |
| **P1** | 設定 ALLOWED_ORIGINS | P1-2 | 三個 docker-compose + config/index.js 空字串防護 | ✅ 已修復 |
| **P2** | 前端檔案驗證 + 進度條 | P2-2 | 5 個上傳入口 + SubmitTask 進度條 | ✅ 已修復 |

### 第三階段：長期改善

| 優先順序 | 修復項目 | 問題編號 | 狀態 |
|----------|---------|---------|------|
| **P1** | 修正 MINIO_PUBLIC_ENDPOINT | P1-1 | ✅ 已修復（前端不直接用 MinIO URL，改存邏輯路徑） |
| **P2** | Multer 改用 disk/stream 儲存 | P2-1 | ✅ 已修復 |
| **SEC** | .env 機敏資訊處理 | SEC-1 | ✅ 已處理（檔案已刪除） |

---

## 需要在遠端主機確認的項目

以下項目需要 SSH 到部署主機 (`SERVER_HOST`) 確認：

1. **NPM 的 `client_max_body_size` 設定** — 這可能是最大的隱藏瓶頸
   ```bash
   # 檢查 NPM 的 Nginx 配置
   docker exec <npm-container-id> cat /data/nginx/proxy_host/*.conf | grep client_max_body_size
   ```

2. **NPM 的 proxy timeout 設定**
   ```bash
   docker exec <npm-container-id> cat /data/nginx/proxy_host/*.conf | grep -E "proxy_read_timeout|proxy_send_timeout"
   ```

3. **前端如何使用 MinIO 檔案 URL** — 確認 `MINIO_PUBLIC_ENDPOINT` 的影響
   ```bash
   # 檢查資料庫中儲存的檔案 URL 格式
   docker exec <postgres-container-id> psql -U postgres -d postgres -c "SELECT url FROM task_files LIMIT 5;"
   ```

---

## 驗證方式

修復完成後，建議用以下方式驗證：

1. **模擬慢網路：** Chrome DevTools → Network → Throttling → 設定為 "Slow 3G" 或自訂 1 Mbps 上傳
2. **測試不同大小的檔案：** 5MB、20MB、50MB
3. **測試 token 過期場景：** 在 DevTools → Application → Local Storage 中手動刪除 `accessToken`，然後嘗試上傳
4. **測試跨 1 小時場景：** 登入後等待 1 小時再上傳（或暫時將 JWT_EXPIRES_IN 設為 60 秒測試）
5. **測試並發上傳：** 開多個瀏覽器 tab 同時上傳
6. **檢查 Nginx log：**
   ```bash
   docker compose logs nginx | grep -E "504|413|timeout"
   ```
7. **檢查 NPM log：**
   ```bash
   docker logs <npm-container-id> | grep -E "504|413|timeout"
   ```

---

## 結論

學生遇到的是**兩種不同的失敗**，需要分別修復：

### 失敗 A：純文字提交也失敗（`error.response` 為 `undefined`）

**根因：** 生產環境 JWT 僅 1 小時有效（`.env` 設定 `JWT_EXPIRES_IN=3600`，開發環境預設 24 小時）。學生上課超過 1 小時後 token 過期，前端 interceptor 嘗試 refresh token 時碰到學校 WiFi 瞬斷 → 整個請求鏈 Network Error → 沒有 HTTP 回應 → 原始碼 TypeError → 白屏。

**立即修復：** 將 `JWT_EXPIRES_IN` 改為 `28800`（8 小時），重啟 API 容器。

### 失敗 B：檔案上傳失敗

**根因：** NPM（Nginx Proxy Manager）的 `client_max_body_size` 為 Nginx 預設值 **1MB**（已確認 `1.conf` 中完全無此設定）。任何超過 1MB 的檔案在最外層就被 NPM 拒絕，根本不會到達後端。

**立即修復：** NPM 管理界面 → `science.lazyinwork.com` → Advanced → 加入 `client_max_body_size 100M;` 及 timeout 設定。

### 為什麼部署機沒問題

| 差異 | 部署機（本地） | 生產環境（學生） |
|------|-------------|----------------|
| JWT 有效期 | 24 小時（預設） | **1 小時** |
| NPM 代理 | 無 | **有（1MB 限制）** |
| 網路穩定性 | 穩定 | **學校 WiFi 不穩** |
| 傳輸延遲 | 零（localhost） | 有延遲 |

**第一階段的兩個修復（NPM + JWT）不需要重新部署程式碼**，只需要在遠端主機上改設定和重啟服務，改完學生就能正常使用。剩餘的 P0-3、P0-4 等問題在下次 push 程式碼時一併修復即可。
