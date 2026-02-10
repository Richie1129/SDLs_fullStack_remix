/**
 * 測試 Phase 0 批量審計端點
 * 
 * 用途: 驗證 /api/audit/batch 端點的功能
 * 
 * 執行方式:
 * node test-tracking-batch.js
 * 
 * 測試項目:
 * 1. ✅ 批量發送事件
 * 2. ✅ 無效輸入處理
 * 3. ✅ 空陣列處理
 * 4. ✅ 超過 100 個事件限制
 * 5. ✅ 缺少 action 的事件
 * 6. ✅ 資料庫寫入驗證
 */

require('dotenv').config();
const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const TEST_TOKEN = process.env.TEST_ACCESS_TOKEN || '';

// 如果沒有 token，需要先登入
if (!TEST_TOKEN) {
  console.error('❌ 錯誤: 請設定 TEST_ACCESS_TOKEN 環境變數');
  console.log('💡 提示: 先登入獲取 accessToken，然後執行:');
  console.log('   export TEST_ACCESS_TOKEN="your_token_here"');
  console.log('   node test-tracking-batch.js');
  process.exit(1);
}

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'accessToken': TEST_TOKEN,
    'Content-Type': 'application/json'
  }
});

// 輔助函式
const log = (emoji, message, data = null) => {
  console.log(`${emoji} ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 測試 1: 基礎批量發送
async function testBasicBatch() {
  log('🧪', '測試 1: 基礎批量發送 (10 個事件)');
  
  const events = Array.from({ length: 10 }, (_, i) => ({
    action: `TEST_BATCH_${i + 1}`,
    targetType: 'test',
    targetId: String(i + 1),
    projectId: '123',
    metadata: {
      testName: '基礎批量測試',
      index: i + 1,
      timestamp: new Date().toISOString()
    }
  }));

  try {
    const response = await client.post('/api/audit/batch', { events });
    log('✅', '成功!', response.data);
    
    if (response.data.count === 10) {
      log('✅', '寫入數量正確: 10 個事件');
    } else {
      log('❌', `寫入數量錯誤: 預期 10, 實際 ${response.data.count}`);
    }
  } catch (error) {
    log('❌', '失敗!', error.response?.data || error.message);
  }
  
  await sleep(500);
}

// 測試 2: 無效輸入
async function testInvalidInput() {
  log('🧪', '測試 2: 無效輸入 (非陣列)');
  
  try {
    const response = await client.post('/api/audit/batch', { events: 'not an array' });
    log('❌', '應該失敗但成功了!', response.data);
  } catch (error) {
    if (error.response?.status === 400) {
      log('✅', '正確拒絕無效輸入', error.response.data);
    } else {
      log('❌', '錯誤碼不正確', error.response?.data);
    }
  }
  
  await sleep(500);
}

// 測試 3: 空陣列
async function testEmptyArray() {
  log('🧪', '測試 3: 空陣列');
  
  try {
    const response = await client.post('/api/audit/batch', { events: [] });
    log('✅', '成功 (空陣列應返回 count: 0)', response.data);
    
    if (response.data.count === 0) {
      log('✅', '空陣列處理正確');
    }
  } catch (error) {
    log('❌', '失敗!', error.response?.data || error.message);
  }
  
  await sleep(500);
}

// 測試 4: 超過 100 個事件
async function testTooManyEvents() {
  log('🧪', '測試 4: 超過 100 個事件限制 (嘗試發送 150 個)');
  
  const events = Array.from({ length: 150 }, (_, i) => ({
    action: `TEST_OVERFLOW_${i + 1}`,
    targetType: 'test',
    targetId: String(i + 1)
  }));

  try {
    const response = await client.post('/api/audit/batch', { events });
    log('❌', '應該失敗但成功了!', response.data);
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.message?.includes('100')) {
      log('✅', '正確拒絕超過 100 個事件', error.response.data);
    } else {
      log('❌', '錯誤處理不正確', error.response?.data);
    }
  }
  
  await sleep(500);
}

// 測試 5: 缺少 action 的事件
async function testMissingAction() {
  log('🧪', '測試 5: 部分事件缺少 action');
  
  const events = [
    { action: 'TEST_VALID_1', targetType: 'test', targetId: '1' },
    { targetType: 'test', targetId: '2' }, // 缺少 action
    { action: 'TEST_VALID_2', targetType: 'test', targetId: '3' },
    { action: '', targetType: 'test', targetId: '4' }, // 空 action
    { action: 'TEST_VALID_3', targetType: 'test', targetId: '5' }
  ];

  try {
    const response = await client.post('/api/audit/batch', { events });
    log('✅', '成功!', response.data);
    
    if (response.data.count === 3 && response.data.skipped === 2) {
      log('✅', '正確跳過無效事件: 3 成功, 2 跳過');
    } else {
      log('❌', `跳過邏輯錯誤: 預期 3/2, 實際 ${response.data.count}/${response.data.skipped}`);
    }
  } catch (error) {
    log('❌', '失敗!', error.response?.data || error.message);
  }
  
  await sleep(500);
}

// 測試 6: 不同事件類型
async function testDifferentEventTypes() {
  log('🧪', '測試 6: 不同事件類型混合');
  
  const events = [
    { action: 'KANBAN_TASK_CLICK', targetType: 'task', targetId: '123', metadata: { projectId: '456' } },
    { action: 'IDEAWALL_NODE_DRAG', targetType: 'node', targetId: '789', metadata: { position: { x: 100, y: 200 } } },
    { action: 'LOGIN_SUBMIT', targetType: 'user', targetId: null, metadata: { method: 'email' } },
    { action: 'FILE_DOWNLOAD', targetType: 'file', targetId: 'test.pdf', metadata: { size: 1024 } }
  ];

  try {
    const response = await client.post('/api/audit/batch', { events });
    log('✅', '成功!', response.data);
    
    if (response.data.count === 4) {
      log('✅', '所有事件類型都已寫入');
    }
  } catch (error) {
    log('❌', '失敗!', error.response?.data || error.message);
  }
  
  await sleep(500);
}

// 測試 7: 驗證資料庫寫入
async function verifyDatabase() {
  log('🧪', '測試 7: 驗證資料庫寫入 (查詢最近 20 筆記錄)');
  
  try {
    const response = await client.get('/api/audit/events', {
      params: {
        source: 'client',
        limit: 20
      }
    });
    
    log('✅', `查詢成功! 找到 ${response.data.items?.length || 0} 筆記錄`);
    
    if (response.data.items?.length > 0) {
      const latest = response.data.items[0];
      log('📋', '最新記錄:', {
        action: latest.action,
        targetType: latest.targetType,
        targetId: latest.targetId,
        timestamp: latest.timestamp,
        actorId: latest.actorId
      });
    }
  } catch (error) {
    log('❌', '查詢失敗!', error.response?.data || error.message);
  }
}

// 執行所有測試
async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 Phase 0 批量審計端點測試');
  console.log('='.repeat(60) + '\n');
  
  console.log(`📍 API Base URL: ${API_BASE_URL}`);
  console.log(`🔑 使用 Token: ${TEST_TOKEN.substring(0, 20)}...`);
  console.log(`⏰ 開始時間: ${new Date().toLocaleString()}\n`);
  
  try {
    await testBasicBatch();
    await testInvalidInput();
    await testEmptyArray();
    await testTooManyEvents();
    await testMissingAction();
    await testDifferentEventTypes();
    await verifyDatabase();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ 所有測試完成!');
    console.log('='.repeat(60) + '\n');
    
    console.log('📊 下一步驗證:');
    console.log('1. 檢查後端日誌是否有 "Batch audit events created"');
    console.log('2. 查詢資料庫: SELECT * FROM audit_event WHERE source = \'client\' ORDER BY timestamp DESC LIMIT 50;');
    console.log('3. 確認 actorId, ip, userAgent 等欄位都已正確填入\n');
    
  } catch (error) {
    console.error('\n❌ 測試過程中發生錯誤:', error.message);
    process.exit(1);
  }
}

// 執行
runAllTests();
