# SDL 平台 - 效能驗收標準清單 (Performance Definition of Done)

> 參考標準：Google SRE Golden Signals、ISO 25010、Core Web Vitals
> 最後更新：2026-03-17

---

## 一、回應時間基準 (Latency)

### 前端 Core Web Vitals（Google Golden Standard）

| 指標 | 良好 (Green) | 需改善 (Yellow) | 不良 (Red) | 量測方式 |
|------|-------------|----------------|-----------|---------|
| **LCP** (最大內容渲染) | ≤ 2.5s | 2.5s ~ 4.0s | > 4.0s | Lighthouse / `web-vitals` |
| **INP** (互動至下一繪製) | ≤ 200ms | 200ms ~ 500ms | > 500ms | Lighthouse / `web-vitals` |
| **CLS** (累積版面偏移) | ≤ 0.1 | 0.1 ~ 0.25 | > 0.25 | Lighthouse / `web-vitals` |
| **FCP** (首次內容繪製) | ≤ 1.8s | 1.8s ~ 3.0s | > 3.0s | Lighthouse |
| **TTFB** (首位元組時間) | ≤ 800ms | 800ms ~ 1.8s | > 1.8s | Lighthouse / DevTools |
| **Lighthouse 效能分數** | ≥ 80 | 50 ~ 79 | < 50 | `lhci autorun` |

### 後端 API 回應時間（P-percentile 標準）

| API 類型 | P50 目標 | P95 目標 | P99 上限 | 備註 |
|---------|---------|---------|---------|------|
| 登入 / 認證 | < 200ms | < 500ms | < 1000ms | 包含 bcrypt 雜湊 |
| 一般 CRUD | < 100ms | < 300ms | < 500ms | 需有 DB Index |
| 列表查詢 | < 150ms | < 400ms | < 800ms | 需分頁 |
| AI 回應（首 token） | < 2000ms | < 5000ms | < 10000ms | Streaming 首字 |
| 檔案上傳 | < 500ms | < 2000ms | < 5000ms | MinIO |
| Socket 事件 | < 50ms | < 150ms | < 300ms | 即時協作 |

---

## 二、資源消耗上限 (Resource Utilization)

### Docker 容器資源限制

| 服務 | CPU 限制 | Memory 限制 | 記憶體警戒線 |
|------|---------|-------------|------------|
| `api` (後端) | 2 cores | 1024 MB | 80% (819 MB) |
| `front` (開發) | 1 core | 512 MB | 80% (410 MB) |
| `postgres` | 2 cores | 2048 MB | 85% (1741 MB) |
| `minio` | 1 core | 512 MB | 70% (358 MB) |

### Node.js 後端記憶體

```
# 查看目前記憶體使用
GET /api/metrics/memory  (需要 METRICS_TOKEN)
```

| 指標 | 目標 | 警戒 | 動作 |
|------|------|------|------|
| Heap 使用率 | < 70% | > 85% | 調查記憶體洩漏 |
| RSS | < 256 MB | > 512 MB | 檢查 Buffer 釋放 |
| 外部記憶體 | < 50 MB | > 100 MB | 檢查 Native addon |

### 資料庫連線池

| 指標 | 設定值 | 說明 |
|------|-------|------|
| 最大連線數 | 10 | Sequelize `max` |
| 最小連線數 | 2 | Sequelize `min` |
| 連線取得超時 | 30000ms | `acquire` |
| 連線閒置超時 | 10000ms | `idle` |

---

## 三、快取命中率要求 (Cache Hit Rate)

### 前端快取策略

| 資源類型 | Cache-Control | 預期命中率 |
|---------|--------------|----------|
| JS / CSS chunks | `max-age=31536000, immutable` | > 90% |
| 圖片 / 字型 | `max-age=86400` | > 80% |
| API 回應 (React Query) | `staleTime=5min` | > 60% |
| HTML 頁面 | `no-cache` | 0%（每次驗證） |

### 後端快取（`assistantCacheService.js`）

| 快取類型 | TTL | 命中率目標 | 量測方式 |
|---------|-----|----------|---------|
| AI 助理資料 (RAG) | 5 分鐘 | > 70% | 檢查 cache hit log |
| 專案成員列表 | 10 分鐘 | > 50% | performanceMonitor stats |

---

## 四、資料庫查詢優化標準 (No N+1 Queries)

### 強制規則（違反即為 Bug）

- [ ] **禁止 N+1 查詢**：所有關聯資料必須使用 Sequelize `include` 或 `findAll` 批次載入
- [ ] **必須有 WHERE index**：任何帶有 `WHERE` 子句的查詢，其條件欄位必須有 DB Index
- [ ] **分頁強制**：列表 API 必須有 `limit` 和 `offset` 參數，預設 limit ≤ 50
- [ ] **欄位限制**：查詢必須使用 `attributes` 限制返回欄位（禁止 `SELECT *` 大型資料表）

### 已建立的 Index（重要）

```sql
-- 查看目前所有 Index
SELECT indexname, tablename, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename;
```

應確保以下欄位有 Index：
- `users.account` (登入查詢)
- `projects.mentor` (教師篩選)
- `projects.semester` (學期篩選)
- `kanban_tasks.project_id` (看板查詢)
- `messages.project_id` (聊天歷史)
- `idea_wall_nodes.project_id` (想法牆)

### 慢查詢偵測

```bash
# 查看後端偵測到的慢 API（> 1000ms）
GET /api/metrics/performance  (需要 METRICS_TOKEN)

# 查看 PostgreSQL 慢查詢
docker compose exec postgres psql -U postgres -d postgres \
  -c "SELECT query, mean_exec_time, calls FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
```

---

## 五、Bundle 大小標準 (Frontend Bundle Size)

| Chunk 類型 | 上限 | 當前狀態 | 量測方式 |
|-----------|------|---------|---------|
| 主 JS bundle | < 500 KB (gzip) | 待量測 | `npm run build` 輸出 |
| Vendor chunk | < 300 KB (gzip) | 待量測 | Vite bundle analysis |
| 單一 CSS | < 100 KB | 待量測 | Vite 輸出 |
| 首次加載總計 | < 1 MB | 待量測 | Lighthouse |

### Bundle 分析指令

```bash
# 分析 bundle 大小（需安裝 rollup-plugin-visualizer）
cd sdl-frontend-main
npx vite-bundle-visualizer
```

---

## 六、Socket.IO 效能標準

| 指標 | 目標 | 說明 |
|------|------|------|
| 連線建立時間 | < 500ms | 包含 JWT 驗證 |
| 事件延遲 | < 100ms | 本地 LAN 環境 |
| 記憶體洩漏 | 0 | 斷線必須 `removeAllListeners()` |
| 最大同時連線 | 500 | 需壓力測試驗證 |

---

## 七、效能測試執行清單

### 每次 Release 前必須通過

- [ ] `lhci autorun` — Lighthouse CI 全頁面掃描，效能分數 ≥ 70
- [ ] `k6 run performance/k6/load-test.js` — 50 VU 負載測試通過
- [ ] `k6 run performance/k6/spike-test.js` — 尖峰測試通過（P95 < 3s）
- [ ] 檢查 `GET /api/metrics/performance` — 無 P95 > 1000ms 的端點
- [ ] 確認無 N+1 查詢警告（後端 logs 中無 `[N+1 偵測]`）

### 每週定期執行

- [ ] 壓力測試：`k6 run performance/k6/stress-test.js`
- [ ] 記憶體趨勢：`GET /api/metrics/memory` 確認無持續上升趨勢
- [ ] PostgreSQL 慢查詢報告

---

## 八、效能監控工具一覽

| 工具 | 用途 | 存取方式 |
|------|------|---------|
| `performanceMonitor.js` | API 延遲統計 | `/api/metrics/performance` |
| Lighthouse CI | 前端 Core Web Vitals | `lhci autorun` |
| `web-vitals` 函式庫 | 即時 RUM 數據 | Browser Console `window.__sdlVitals` |
| k6 | 後端負載/壓力測試 | `k6 run performance/k6/*.js` |
| `backend-profiler.js` | Node.js 記憶體 / N+1 偵測 | `/api/metrics/memory` |
| pgAdmin | 資料庫視覺化 | `http://localhost:5556` |
| Chrome DevTools | JS Profiling / Heap Snapshot | F12 → Performance / Memory tab |
