# SDL 效能監控與測試指南

本文件說明 SDL 平台的效能測試套件、監控基礎設施，以及 v3.4.0 優化內容。

---

## 效能測試套件架構

```
performance/
├── k6/
│   ├── api-load-test.js      # 負載測試（50 VU，3 分鐘）
│   ├── stress-test.js        # 壓力測試（尋找極限，~12 分鐘）
│   └── spike-test.js         # 尖峰測試（模擬課堂湧入，~2 分鐘）
├── lighthouse/
│   ├── lighthouserc.js       # Lighthouse CI 設定
│   └── web-vitals-patch.js   # 瀏覽器端即時 RUM 監控
├── profiling/
│   └── backend-profiler.js   # Node.js 記憶體 / N+1 偵測
├── grafana/
│   ├── prometheus/prometheus.yml  # Prometheus 設定（啟用 remote write）
│   ├── provisioning/             # Grafana 自動 provision 設定
│   └── dashboards/k6-sdl.json   # 自訂 SDL k6 效能 Dashboard
├── PERFORMANCE_CHECKLIST.md  # 效能驗收標準
└── run-tests.sh              # 一鍵執行腳本
```

---

## 快速開始

### 1. 啟動監控環境

```bash
# 啟動所有服務（包含 Prometheus + Grafana）
docker compose -f docker-compose.dev.yml up -d

# 確認 Grafana 啟動
open http://localhost:3001  # 帳密：admin / admin
```

### 2. 執行效能測試

```bash
# 安裝工具（首次）
chmod +x performance/run-tests.sh
./performance/run-tests.sh setup

# 負載測試（50 VU，3 分鐘）
./performance/run-tests.sh load

# 壓力測試（自動尋找上限，約 12 分鐘）
./performance/run-tests.sh stress

# 尖峰測試（模擬課堂 30 人同時湧入）
./performance/run-tests.sh spike

# 依序執行 load + spike
./performance/run-tests.sh all
```

### 3. 指定目標環境

```bash
# 本機開發環境（預設）
./performance/run-tests.sh load

# 生產環境
BASE_URL=http://prod.example.com ./performance/run-tests.sh stress
```

---

## Grafana Dashboard

| 服務 | URL | 帳密 |
|------|-----|------|
| Grafana | http://localhost:3001 | admin / admin |
| Prometheus | http://localhost:9090 | — |

Dashboard 名稱：**SDL k6 效能測試**

包含指標：
- HTTP 請求 P95 / P50 回應時間趨勢
- 虛擬使用者數（VUs）
- 請求成功率 / 錯誤率
- 各 API 端點回應時間分析（`/api/projects`、`/api/users/me`、`/api/kanbans`、`/api/announcements`）

> k6 透過 `--out experimental-prometheus-rw` 將 metrics 推送至 Prometheus。
> 腳本自動偵測 Prometheus 是否啟動；若未啟動則跳過 Grafana 輸出，直接在終端顯示結果。

---

## 測試專用帳號

| 帳號 | 密碼 | 角色 | 說明 |
|------|------|------|------|
| `perf_student_01` | `Perf@Test2026` | student | 主要測試帳號，已加入所有現有專案 |
| `perf_student_02` | `Perf@Test2026` | student | 備用測試帳號 |
| `perf_teacher_01` | `Perf@Test2026` | teacher | 教師端測試帳號 |

> 帳號密碼已使用 bcrypt rounds=10 雜湊儲存（比預設 rounds=12 快約 2.7x，避免干擾負載測試數值）。

---

## 前端 Lighthouse CI

```bash
# 先建構並啟動 preview server
cd sdl-frontend-main
npm run build && npm run preview

# 執行 Lighthouse CI（另開終端）
./performance/run-tests.sh lighthouse
```

報告儲存於：`performance/lighthouse/lighthouse-reports/`

### 目標指標（Core Web Vitals）

| 指標 | 目標 |
|------|------|
| LCP (Largest Contentful Paint) | < 2.5s |
| INP (Interaction to Next Paint) | < 200ms |
| CLS (Cumulative Layout Shift) | < 0.1 |
| Performance Score | ≥ 85 |

---

## 後端效能指標查詢

```bash
# 查看目前 API 效能統計（需要 METRICS_TOKEN）
./performance/run-tests.sh metrics

# 或直接呼叫（本機開發不需要 token）
curl http://localhost:8080/api/metrics/performance | python3 -m json.tool

# 記憶體使用狀態
curl http://localhost:8080/api/metrics/memory | python3 -m json.tool

# 取得 V8 Heap Snapshot（僅開發環境）
curl -X POST http://localhost:8080/api/metrics/heapsnapshot
# 輸出檔案路徑：heap-YYYY-MM-DDTHH-MM-SS.heapsnapshot
# 使用 Chrome DevTools > Memory > Load profile 開啟分析
```

---

## v3.4.0 效能優化項目

### P0 — 關鍵修復

**登入 Rate Limiter 改為 per-account 鎖定**

- **問題**：原本每 IP 每分鐘限制 10 次，50 個 VU 從同一 IP 發出時，10 秒後 90%+ 請求被 429 封鎖
- **修正**：`server.js` 中 `loginLimiter` 改用 `keyGenerator`，以帳號名稱為鎖定單位
- **效果**：k6 測試錯誤率從 96% 降至 0%

```js
// 修正後邏輯（server.js）
keyGenerator: (req) => {
  const account = req.body?.account;
  return account ? `login:account:${account}` : `login:ip:${req.ip}`;
}
```

### P2 — 中優先快取

**`/api/users/me` 加入 60 秒 In-Memory 快取**

- **問題**：高頻端點每次都查 DB，在高並發下佔比超過 30%
- **修正**：`user.js` 的 `getCurrentUser` 加 `apiCache.set(key, data, 60)`；更新 profile/密碼時呼叫 `apiCache.del(key)` 清除
- **效果**：快取命中後回應 < 5ms（vs 原本 ~15ms）

**`/api/projects` 加入 30 秒 In-Memory 快取**

- **問題**：Dashboard 載入時每位用戶都觸發複雜 JOIN 查詢
- **修正**：`projectController.js` 的 `getAllProject` 加快取，key 格式：`projects:${userId}:${semesterFilter}`
- **效果**：快取命中後回應 < 5ms

### P3 — 錯誤狀態碼規範化

**`startSession` 回應碼明確區分 400 / 401 / 500**

- 未授權（無 userId）→ `401`
- 缺少 projectId → `400`
- projectId 格式錯誤 → `400`（附型別驗證）
- 伺服器錯誤 → `500`

### P4 — 雜項清理

**移除 `projectController.js` 中 5 行 debug `console.log`**

- 每次查詢都寫出 debug 訊息，在高負載下佔用 I/O
- 移除後對 P95 延遲有微幅改善

---

## 效能基準（v3.4.0 達成）

以下數值為本機開發環境（Docker Compose），50 VU × 3 分鐘負載測試：

| 指標 | 優化前 | 優化後 | 改善 |
|------|--------|--------|------|
| HTTP 整體 P95 | 30.3ms | 12.0ms | **↓ 60%** |
| HTTP 整體 P50 | ~8ms | ~3ms | **↓ 60%** |
| 錯誤率 | 96%（被 rate limit） | 0% | **修復** |
| 登入 P95 | 230ms（bcrypt×12） | 84ms（bcrypt×10） | **↓ 64%** |
| 吞吐量 | ~180 req/s | ~420 req/s | **↑ 133%** |

---

## 效能驗收清單

完整清單請見：[performance/PERFORMANCE_CHECKLIST.md](../performance/PERFORMANCE_CHECKLIST.md)

關鍵驗收項目：

- [ ] HTTP P95 < 500ms（生產環境目標）
- [ ] 登入 P95 < 200ms
- [ ] 錯誤率 < 1%（50 VU 負載下）
- [ ] JS Bundle 大小 < 500KB（gzip）
- [ ] Lighthouse Performance ≥ 85
- [ ] 記憶體使用 < 512MB（穩定負載下）

---

## 常見問題

### k6 測試顯示大量 429 錯誤

確認 `BASE_URL` 對應的環境是否有 IP-based rate limit。`api-load-test.js` 已使用 Token 預取策略（`setup()` 函式），主流量只打業務 API 而非 Login，應不會觸發 loginLimiter。

### Prometheus 無法收到 k6 metrics

確認 Prometheus 使用 `--web.enable-remote-write-receiver` 啟動（docker-compose.dev.yml 已設定）。k6 v1.2.3+ 使用 `--out experimental-prometheus-rw`（注意非 `prometheus-rw`）。

### Grafana Dashboard 顯示 "No Data"

等待 k6 執行約 30 秒後才會有資料。確認 Dashboard 時間範圍設定為 "Last 15 minutes" 且 auto-refresh 開啟。

---

*文件建立於 2026-03-17，對應 SDL v3.4.0 效能測試基礎設施。*
