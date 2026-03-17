/**
 * SDL 平台 - Lighthouse CI 設定
 *
 * 安裝：
 *   npm install -g @lhci/cli
 *
 * 執行（需先啟動前端 preview server）：
 *   cd sdl-frontend-main && npm run build && npm run preview
 *   # 新開 terminal：
 *   cd performance/lighthouse && lhci autorun
 *
 * 或直接對開發伺服器跑（注意 dev server 效能不代表生產效能）：
 *   lhci autorun --collect.url=http://localhost:5174
 */

module.exports = {
  ci: {
    // ─── 收集設定 ────────────────────────────────────────────────────────
    collect: {
      // 對已啟動的 server 測試（建議先 build 再 preview）
      url: [
        'http://localhost:4173',          // Vite preview (生產 build)
        'http://localhost:4173/login',    // 登入頁面
      ],

      // 每個頁面跑 3 次取中位數（Lighthouse 有波動，多跑才準確）
      numberOfRuns: 3,

      // Chromium 啟動參數（Docker 環境中必要）
      chromePath: process.env.CHROME_PATH,
      settings: {
        // 模擬行動裝置網路（Simulated Throttling - 更快但較不精準）
        // 改用 'desktop' 可跑桌面版本
        preset: 'desktop',

        // 模擬節流：測試在不同網路條件的效能
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
        },

        // 只跑效能相關的 audits（跳過 SEO/Best Practices 加快速度）
        onlyCategories: ['performance'],

        // 停用 HTTP/2 推送（避免影響測試穩定性）
        disableStorageReset: false,

        // 輸出格式
        output: ['html', 'json'],

        // React SPA 需要等待頁面完全載入
        maxWaitForFcp: 30000,
        maxWaitForLoad: 45000,
      },
    },

    // ─── 驗收標準 (Assertions) ────────────────────────────────────────────
    assert: {
      // 失敗時退出碼非 0（可用於 CI/CD Gate）
      preset: 'lighthouse:no-pwa',

      assertions: {
        // Core Web Vitals (Google 排名指標)
        // LCP (Largest Contentful Paint) - 主要內容載入時間
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],   // 良好 < 2.5s

        // INP (Interaction to Next Paint) - 互動回應時間（取代 FID）
        'interaction-to-next-paint': ['warn', { maxNumericValue: 200 }],   // 良好 < 200ms

        // CLS (Cumulative Layout Shift) - 版面穩定性
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],     // 良好 < 0.1

        // FCP (First Contentful Paint) - 首次內容繪製
        'first-contentful-paint': ['warn', { maxNumericValue: 1800 }],     // 良好 < 1.8s

        // TBT (Total Blocking Time) - 主線程阻塞時間（INP 的前身指標）
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],

        // Speed Index - 視覺載入速度
        'speed-index': ['warn', { maxNumericValue: 3400 }],

        // 效能分數
        'categories:performance': ['warn', { minScore: 0.7 }],  // 70 分以上

        // 資源最佳化
        'uses-optimized-images': 'warn',
        'uses-text-compression': 'error',
        'uses-long-cache-ttl': 'warn',
        'render-blocking-resources': 'warn',
        'unused-javascript': 'warn',
        'unused-css-rules': 'warn',

        // 避免巨大 DOM（React 若 re-render 過多會造成此問題）
        'dom-size': ['warn', { maxNumericValue: 1500 }],

        // 禁用的斷言（這個 SPA 不需要 SEO）
        'document-title': 'off',
        'meta-description': 'off',
      },
    },

    // ─── 上傳設定 ─────────────────────────────────────────────────────────
    upload: {
      // 儲存到本地（不需要 Lighthouse CI 帳號）
      target: 'filesystem',
      outputDir: './lighthouse-reports',
    },
  },
};
