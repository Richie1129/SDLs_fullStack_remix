/**
 * SDL 平台 - 尖峰測試（Token 預取版）
 * 模擬課堂開始前 50 人同時湧入
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate   = new Rate('error_rate');
const apiLatency  = new Trend('api_latency_ms', true);

export const options = {
  stages: [
    { duration: '10s', target: 1   },
    { duration: '5s',  target: 100 },
    { duration: '1m',  target: 100 },
    { duration: '5s',  target: 1   },
    { duration: '20s', target: 1   },
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    error_rate:        ['rate<0.02'],
  },
};

const BASE_URL      = __ENV.BASE_URL      || 'http://localhost:8080';
const TEST_ACCOUNT  = __ENV.TEST_ACCOUNT  || 'perf_student_01';
const TEST_PASSWORD = __ENV.TEST_PASSWORD || 'Perf@Test2026';

export function setup() {
  const res = http.post(
    `${BASE_URL}/api/users/login`,
    JSON.stringify({ account: TEST_ACCOUNT, password: TEST_PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  if (res.status !== 200) throw new Error(`初始化登入失敗: ${res.status}`);
  return { token: JSON.parse(res.body).accessToken };
}

export default function ({ token }) {
  const headers = { accessToken: token };

  const r1 = http.get(`${BASE_URL}/api/projects`, { headers });
  apiLatency.add(r1.timings.duration, { endpoint: 'projects' });
  errorRate.add(r1.status !== 200);
  check(r1, { '尖峰期專案列表 200': (r) => r.status === 200 });

  sleep(0.3);

  const r2 = http.get(`${BASE_URL}/api/users/me`, { headers });
  apiLatency.add(r2.timings.duration, { endpoint: 'me' });
  errorRate.add(r2.status !== 200);
  check(r2, { '尖峰期個人資料 200': (r) => r.status === 200 });

  sleep(0.3);

  const r3 = http.get(`${BASE_URL}/api/kanbans/1`, { headers });
  apiLatency.add(r3.timings.duration, { endpoint: 'kanban' });
  errorRate.add(r3.status >= 500);

  sleep(Math.random() * 0.5 + 0.2);
}

export function handleSummary(data) {
  return {
    '/tmp/spike-test-result.json': JSON.stringify(data, null, 2),
  };
}
