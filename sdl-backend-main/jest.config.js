/**
 * Jest 配置文件
 *
 * - `npm test`：只跑 tests/integration 下不需要外部服務的單元/整合測試
 * - `npm run test:e2e`：tests/e2e 與 tests/unit 需要啟動中的 API 與 DB（TEST_ACCESS_TOKEN 等環境變數），
 *   由開發者在本機 docker compose 環境手動執行
 */

module.exports = {
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
  collectCoverageFrom: [
    'controllers/**/*.js',
    'services/**/*.js',
    'utils/**/*.js',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  verbose: true,
  // 設置測試超時
  testTimeout: 10000,
  // 模擬環境變數
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
};
