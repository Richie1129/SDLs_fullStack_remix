/**
 * SDL 平台 - API 業務端點負載測試（Token 預取版）
 *
 * 策略：
 *   - setup() 預先取得 token，避免 loginLimiter 在測試期間觸發
 *   - 主要測試業務 API 的延遲與穩定性
 *   - 最後輸出完整 JSON 結果
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const projectsDuration  = new Trend('projects_duration',  true);
const kanbanDuration    = new Trend('kanban_duration',    true);
const meDuration        = new Trend('me_duration',        true);
const announceDuration  = new Trend('announce_duration',  true);
const errorRate         = new Rate('error_rate');

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m',  target: 50 },
    { duration: '30s', target: 50 },
    { duration: '30s', target: 0  },
  ],
  thresholds: {
    http_req_duration:   ['p(95)<500', 'p(99)<1000'],
    error_rate:          ['rate<0.01'],
    projects_duration:   ['p(95)<300'],
    kanban_duration:     ['p(95)<400'],
    me_duration:         ['p(95)<200'],
    announce_duration:   ['p(95)<300'],
  },
};

const BASE_URL      = __ENV.BASE_URL      || 'http://localhost:8080';
const TEST_ACCOUNT  = __ENV.TEST_ACCOUNT  || 'perf_student_01';
const TEST_PASSWORD = __ENV.TEST_PASSWORD || 'Perf@Test2026';

// ─── 預取 Token（只執行一次）─────────────────────────────────────────────
export function setup() {
  const res = http.post(
    `${BASE_URL}/api/users/login`,
    JSON.stringify({ account: TEST_ACCOUNT, password: TEST_PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  if (res.status !== 200) {
    throw new Error(`初始化登入失敗: ${res.status} - ${res.body}`);
  }

  const token = JSON.parse(res.body).accessToken;
  console.log(`[setup] Token 取得成功，測試即將開始...`);
  return { token };
}

// ─── 主要測試流程 ──────────────────────────────────────────────────────────
export default function ({ token }) {
  const headers = { accessToken: token };

  // 1. 取得專案列表
  const r1 = http.get(`${BASE_URL}/api/projects`, { headers });
  projectsDuration.add(r1.timings.duration);
  errorRate.add(r1.status !== 200);
  check(r1, { '專案列表 200': (r) => r.status === 200 });

  sleep(0.2);

  // 2. 取得個人資料
  const r2 = http.get(`${BASE_URL}/api/users/me`, { headers });
  meDuration.add(r2.timings.duration);
  errorRate.add(r2.status !== 200);
  check(r2, { '個人資料 200': (r) => r.status === 200 });

  sleep(0.2);

  // 3. 取得看板（kanban 1 & 2 交替）
  const kanbanId = (__VU % 2 === 0) ? 1 : 2;
  const r3 = http.get(`${BASE_URL}/api/kanbans/${kanbanId}`, { headers });
  kanbanDuration.add(r3.timings.duration);
  errorRate.add(r3.status !== 200);
  check(r3, { '看板 200': (r) => r.status === 200 });

  sleep(0.2);

  // 4. 取得公告
  const r4 = http.get(`${BASE_URL}/api/announcements`, { headers });
  announceDuration.add(r4.timings.duration);
  errorRate.add(r4.status !== 200);
  check(r4, { '公告 200': (r) => r.status === 200 });

  sleep(Math.random() * 0.8 + 0.2);
}

export function handleSummary(data) {
  return {
    '/tmp/api-load-test-result.json': JSON.stringify(data, null, 2),
  };
}
