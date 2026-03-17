/**
 * SDL 平台 - k6 負載測試腳本
 *
 * 測試情境：標準負載測試
 * - VUs 從 0 爬升至 50，持續 1 分鐘
 * - P95 回應時間 < 500ms
 * - 錯誤率 < 1%
 *
 * 執行方式：
 *   k6 run performance/k6/load-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

const loginDuration     = new Trend('login_duration',    true);
const projectsDuration  = new Trend('projects_duration', true);
const kanbanDuration    = new Trend('kanban_duration',   true);
const meDuration        = new Trend('me_duration',       true);
const errorRate         = new Rate('error_rate');
const successCount      = new Counter('success_count');

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m',  target: 50 },
    { duration: '30s', target: 50 },
    { duration: '30s', target: 0  },
  ],
  thresholds: {
    http_req_duration:  ['p(95)<500', 'p(99)<1000'],
    error_rate:         ['rate<0.01'],
    login_duration:     ['p(95)<800'],
    projects_duration:  ['p(95)<500'],
    kanban_duration:    ['p(95)<600'],
  },
};

const BASE_URL      = __ENV.BASE_URL      || 'http://localhost:8080';
const TEST_ACCOUNT  = __ENV.TEST_ACCOUNT  || 'perf_student_01';
const TEST_PASSWORD = __ENV.TEST_PASSWORD || 'Perf@Test2026';
const JSON_HEADERS  = { 'Content-Type': 'application/json' };

// ─── 登入 ──────────────────────────────────────────────────────────────────
function login() {
  const res = http.post(
    `${BASE_URL}/api/users/login`,
    JSON.stringify({ account: TEST_ACCOUNT, password: TEST_PASSWORD }),
    { headers: JSON_HEADERS }
  );

  loginDuration.add(res.timings.duration);
  errorRate.add(res.status !== 200);

  const ok = check(res, {
    '登入 200': (r) => r.status === 200,
    '有 accessToken': (r) => {
      try { return !!JSON.parse(r.body).accessToken; } catch { return false; }
    },
  });

  if (!ok) return null;
  successCount.add(1);
  return JSON.parse(res.body).accessToken;
}

// ─── 取得專案列表 ──────────────────────────────────────────────────────────
function getProjects(token) {
  const res = http.get(`${BASE_URL}/api/projects`, {
    headers: { accessToken: token },
  });

  projectsDuration.add(res.timings.duration);
  errorRate.add(res.status !== 200);

  check(res, {
    '專案列表 200': (r) => r.status === 200,
    '回傳陣列': (r) => { try { return Array.isArray(JSON.parse(r.body)); } catch { return false; } },
  });

  try { return JSON.parse(res.body); } catch { return []; }
}

// ─── 取得看板 ──────────────────────────────────────────────────────────────
function getKanban(token, kanbanId) {
  const res = http.get(`${BASE_URL}/api/kanbans/${kanbanId}`, {
    headers: { accessToken: token },
  });

  kanbanDuration.add(res.timings.duration);
  errorRate.add(res.status !== 200);

  check(res, { '看板 200': (r) => r.status === 200 });
}

// ─── 取得個人資料 ──────────────────────────────────────────────────────────
function getMe(token) {
  const res = http.get(`${BASE_URL}/api/users/me`, {
    headers: { accessToken: token },
  });

  meDuration.add(res.timings.duration);
  errorRate.add(res.status !== 200);

  check(res, { '個人資料 200': (r) => r.status === 200 });
}

// ─── 主流程 ────────────────────────────────────────────────────────────────
export default function () {
  const token = login();
  if (!token) { sleep(1); return; }

  sleep(0.3);

  getProjects(token);
  sleep(0.5);

  getMe(token);
  sleep(0.5);

  // 取看板（使用固定已知的 kanban ID 1 和 2）
  getKanban(token, 1);
  sleep(0.3);
  getKanban(token, 2);

  sleep(Math.random() * 1.5 + 0.5);
}

export function handleSummary(data) {
  return {
    '/tmp/load-test-result.json': JSON.stringify(data, null, 2),
  };
}
