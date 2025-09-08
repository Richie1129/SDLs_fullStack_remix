/**
 * 舊版 index.js - 重新導向到模組化的 server.js
 * 
 * 此檔案保留是為了向後相容性，實際的伺服器邏輯已經
 * 重構並移動到 server.js 和相關模組中。
 * 
 * 重構內容：
 * - 移除了硬編碼的 API keys 和不安全的 SSL 設定
 * - 將 1492 行的巨型檔案拆分成多個模組
 * - 建立統一的權限管理系統  
 * - 重構 Socket 事件處理器
 * 
 * "如果你需要超過3層縮進，你就已經完蛋了，應該修復你的程式。" - Linus Torvalds
 */

console.log('🚀 加載重構後的模組化伺服器...');
console.log('📁 原始 index.js (1492 行) 已重構為多個模組');
console.log('🔒 安全漏洞已修復，硬編碼密碼已移除');
console.log('⚡ 權限系統已統一，Socket 處理已優化');

// 載入新的模組化伺服器
module.exports = require('./server');