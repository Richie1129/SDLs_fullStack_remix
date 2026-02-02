/**
 * Jest 配置文件
 * Phase 3: 後端 API 測試
 */

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
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
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js']
};
