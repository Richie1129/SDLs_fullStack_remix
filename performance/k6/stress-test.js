/**
 * SDL 平台 - k6 壓力測試腳本
 *
 * 測試情境：尋找系統極限（Breaking Point）
 * - 持續增加 VU 直到系統開始降級
 * - 記錄哪個 VU 數量時錯誤率超標
 *
 * 執行方式：
 *   k6 run stress-test.js
 *   k6 run --env BASE_URL=http://localhost:8080 stress-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ─── 自訂 Metrics ──────────────────────────────────────────────────────────
const errorRate = new Rate('error_rate');
const apiLatency = new Trend('api_latency_ms', true);

// ─── 壓力測試設定 ──────────────────────────────────────────────────────────
export const options = {
  stages: [
    { duration: '2m',  target: 10  },  // 正常負載基線
    { duration: '5m',  target: 50  },  // 壓力上升
    { duration: '2m',  target: 100 },  // 高壓
    { duration: '2m',  target: 200 },  // 極限測試
    { duration: '1m',  target: 0   },  // 恢復觀察
  ],

  thresholds: {
    // 壓力測試允許較寬鬆的閾值（重點在觀察降級曲線，而非通過）
    http_req_duration: ['p(95)<2000'],
    error_rate: ['rate<0.05'],  // 允許最多 5% 錯誤率
  },
};

// ─── 設定 ─────────────────────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const TEST_ACCOUNT = __ENV.TEST_ACCOUNT || 'test_student_01';
const TEST_PASSWORD = __ENV.TEST_PASSWORD || 'Test@123456';

const HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

// 每個 VU 共享的 token（避免登入成為瓶頸）
let sharedToken = null;

// ─── 測試初始化（只執行一次）──────────────────────────────────────────────
export function setup() {
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ account: TEST_ACCOUNT, password: TEST_PASSWORD }),
    { headers: HEADERS }
  );

  if (res.status !== 200) {
    console.error(`初始化登入失敗: ${res.status} - ${res.body}`);
    return { token: null };
  }

  const body = JSON.parse(res.body);
  console.log('初始化登入成功，取得 Token');
  return { token: body.accessToken, projectIds: [] };
}

// ─── 主要測試流程 ──────────────────────────────────────────────────────────
export default function (data) {
  const { token } = data;

  if (!token) {
    sleep(1);
    return;
  }

  const authHeaders = {
    ...HEADERS,
    Authorization: `Bearer ${token}`,
  };

  // --- 測試 1: 首頁 API（最基礎的健康指標）---
  const healthRes = http.get(`${BASE_URL}/api/health`, { headers: authHeaders });
  apiLatency.add(healthRes.timings.duration, { endpoint: 'health' });
  errorRate.add(healthRes.status >= 400);

  // --- 測試 2: 專案列表（資料庫查詢）---
  const projectsRes = http.get(`${BASE_URL}/api/projects`, { headers: authHeaders });
  apiLatency.add(projectsRes.timings.duration, { endpoint: 'projects' });
  errorRate.add(projectsRes.status >= 400);

  check(projectsRes, {
    '專案列表狀態碼正常': (r) => r.status === 200 || r.status === 304,
  });

  // --- 測試 3: 並行請求模擬（多 tab 瀏覽）---
  const parallelRequests = http.batch([
    ['GET', `${BASE_URL}/api/daily`, null, { headers: authHeaders }],
    ['GET', `${BASE_URL}/api/announcements`, null, { headers: authHeaders }],
  ]);

  parallelRequests.forEach((res, i) => {
    apiLatency.add(res.timings.duration, { endpoint: `parallel_${i}` });
    errorRate.add(res.status >= 500); // 只計 5xx 為壓力測試錯誤
  });

  sleep(1);
}

// ─── 測試結果 ─────────────────────────────────────────────────────────────
export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration?.values?.['p(95)'] || 0;
  const p99 = data.metrics.http_req_duration?.values?.['p(99)'] || 0;
  const errRate = (data.metrics.error_rate?.values?.rate || 0) * 100;
  const totalReqs = data.metrics.http_reqs?.values?.count || 0;

  const summary = [
    '',
    '╔══════════════════════════════════════════════╗',
    '║        SDL 壓力測試結果摘要                   ║',
    '╚══════════════════════════════════════════════╝',
    '',
    `  總請求數:    ${totalReqs}`,
    `  P95 延遲:    ${p95.toFixed(2)} ms  ${p95 > 2000 ? '❌ 超標' : '✅ 正常'}`,
    `  P99 延遲:    ${p99.toFixed(2)} ms`,
    `  錯誤率:      ${errRate.toFixed(2)}%  ${errRate > 5 ? '❌ 超標' : '✅ 正常'}`,
    '',
    '  診斷提示:',
    p95 > 2000 ? '  ⚠️  P95 > 2000ms → 考慮增加資料庫連線池或快取層' : '',
    errRate > 5 ? '  ⚠️  錯誤率 > 5% → 檢查後端 logs，可能有 OOM 或 DB 連線耗盡' : '',
    '',
  ].filter(line => line !== undefined).join('\n');

  return {
    'stress-test-result.json': JSON.stringify(data, null, 2),
    stdout: summary,
  };
}
