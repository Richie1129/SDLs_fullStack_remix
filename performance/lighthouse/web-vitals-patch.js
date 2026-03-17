/**
 * SDL 平台 - Web Vitals 即時監控注入腳本
 *
 * 用途：在開發環境中實時觀察 Core Web Vitals
 * 此腳本會在瀏覽器 Console 顯示 LCP、INP、CLS 數值
 *
 * 使用方式：
 * 1. 安裝：cd sdl-frontend-main && npm install web-vitals
 * 2. 在 src/main.jsx 中引入此 module（只在開發環境）
 *    if (import.meta.env.DEV) {
 *      import('../performance/lighthouse/web-vitals-patch.js')
 *    }
 */

import { onLCP, onINP, onCLS, onFCP, onTTFB } from 'web-vitals';

const THRESHOLDS = {
  LCP:  { good: 2500, poor: 4000 },
  INP:  { good: 200,  poor: 500  },
  CLS:  { good: 0.1,  poor: 0.25 },
  FCP:  { good: 1800, poor: 3000 },
  TTFB: { good: 800,  poor: 1800 },
};

function getStatus(name, value) {
  const threshold = THRESHOLDS[name];
  if (!threshold) return '⚪';
  if (value <= threshold.good) return '🟢';
  if (value <= threshold.poor) return '🟡';
  return '🔴';
}

function reportMetric({ name, value, rating, id }) {
  const status = getStatus(name, value);
  const unit = name === 'CLS' ? '' : 'ms';
  const displayValue = name === 'CLS' ? value.toFixed(4) : Math.round(value);

  console.group(
    `%c[Web Vitals] ${status} ${name}: ${displayValue}${unit} (${rating})`,
    `color: ${rating === 'good' ? '#22c55e' : rating === 'needs-improvement' ? '#f59e0b' : '#ef4444'};
     font-weight: bold; font-size: 14px;`
  );
  console.log(`  ID: ${id}`);
  console.log(`  良好基準: ≤ ${THRESHOLDS[name]?.good}${unit}`);
  console.log(`  需改善: ≤ ${THRESHOLDS[name]?.poor}${unit}`);
  console.groupEnd();

  // 彙整到 window 方便 DevTools 查看
  if (!window.__sdlVitals) window.__sdlVitals = {};
  window.__sdlVitals[name] = { value: displayValue, unit, rating };
}

// 啟動監控
onLCP(reportMetric);
onINP(reportMetric);
onCLS(reportMetric);
onFCP(reportMetric);
onTTFB(reportMetric);

console.log(
  '%c[SDL] Web Vitals 監控已啟動。執行 window.__sdlVitals 查看目前數值',
  'color: #6366f1; font-weight: bold;'
);

export {};
