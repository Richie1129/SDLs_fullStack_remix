/**
 * Jest 測試設置
 * 設置測試環境變數和模擬
 */

// 設置環境變數
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

// 全局錯誤處理
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
