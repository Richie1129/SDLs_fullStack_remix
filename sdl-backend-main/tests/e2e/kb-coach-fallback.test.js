/**
 * KB Coach Fallback 測試腳本
 * 
 * 用途：測試三層 fallback 機制是否正常運作
 * 執行：node test-kb-coach-fallback.js
 */

require('dotenv').config();
const axios = require('axios');

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

// 測試資料
const testData = {
  title: '測試想法：AI 對教育的影響',
  content: '我認為 AI 可以幫助個性化學習，但也可能取代教師的角色。',
  nodeId: 1,
  projectId: 1,
  agentType: 'IMPROVER',
  relatedNodes: []
};

async function testKBCoach() {
  console.log('🧪 開始測試 KB Coach Fallback 機制...\n');

  try {
    console.log('📤 發送請求到 /api/kb-coach/guidance');
    console.log('Agent 類型:', testData.agentType);
    console.log('想法標題:', testData.title);
    console.log('\n⏳ 等待 AI 回應...\n');

    const startTime = Date.now();
    const response = await axios.post(`${API_BASE}/api/kb-coach/guidance`, testData);
    const endTime = Date.now();

    console.log('✅ 成功獲得回應！');
    console.log('⏱️  響應時間:', (endTime - startTime) / 1000, '秒');
    console.log('🤖 使用的模型:', response.data.metadata.model);
    console.log('\n📝 回應內容預覽:');
    console.log('思考過程:', response.data.thinkingProcess.substring(0, 150) + '...');
    console.log('\n建議內容:', response.data.content.substring(0, 200) + '...');
    console.log('\n建議行動數量:', response.data.suggestedActions.length);

    if (response.data.suggestedActions.length > 0) {
      console.log('第一個建議:', response.data.suggestedActions[0]);
    }

    console.log('\n✅ 測試完成！KB Coach 正常運作。');
    return true;

  } catch (error) {
    console.error('❌ 測試失敗！');
    console.error('錯誤訊息:', error.response?.data?.error || error.message);
    
    if (error.response?.data) {
      console.error('詳細回應:', error.response.data);
    }

    console.log('\n🔍 故障排除建議：');
    console.log('1. 確認後端伺服器已啟動 (PORT 3000)');
    console.log('2. 檢查 .env 檔案中的 API Key 是否正確');
    console.log('3. 確認網路可以訪問 vLLM 端點');
    console.log('4. 查看後端日誌中的詳細錯誤訊息');
    
    return false;
  }
}

// 測試所有 Agent 類型
async function testAllAgents() {
  const agentTypes = ['IMPROVER', 'SYNTHESIZER', 'DEVIL'];
  const results = [];

  for (const agentType of agentTypes) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`測試 Agent: ${agentType}`);
    console.log('='.repeat(60));

    const testPayload = { ...testData, agentType };
    
    try {
      const response = await axios.post(`${API_BASE}/api/kb-coach/guidance`, testPayload);
      results.push({
        agent: agentType,
        model: response.data.metadata.model,
        success: true
      });
      console.log(`✅ ${agentType} 測試成功，使用模型: ${response.data.metadata.model}`);
    } catch (error) {
      results.push({
        agent: agentType,
        model: 'N/A',
        success: false,
        error: error.message
      });
      console.log(`❌ ${agentType} 測試失敗: ${error.message}`);
    }

    // 避免請求過快
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n' + '='.repeat(60));
  console.log('測試摘要');
  console.log('='.repeat(60));
  console.table(results);

  const successCount = results.filter(r => r.success).length;
  console.log(`\n總計: ${successCount}/${agentTypes.length} 個 Agent 測試通過`);
}

// 主程式
if (require.main === module) {
  const testAll = process.argv.includes('--all');
  const testHistory = process.argv.includes('--history');

  if (testAll) {
    testAllAgents();
  } else if (testHistory) {
    testHistoryFeature();
  } else {
    testKBCoach();
  }
}

// 測試歷史記錄功能
async function testHistoryFeature() {
  console.log('🧪 測試歷史記錄功能...\n');

  try {
    // 1. 先創建一筆記錄
    console.log('📝 步驟 1: 創建一筆 KB Coach 記錄...');
    const createResponse = await axios.post(`${API_BASE}/api/kb-coach/guidance`, testData);
    console.log('✅ 創建成功，使用模型:', createResponse.data.metadata.model);

    // 2. 等待一下確保資料庫寫入完成
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 3. 查詢歷史記錄
    console.log('\n📜 步驟 2: 查詢歷史記錄...');
    const historyResponse = await axios.get(`${API_BASE}/api/kb-coach/history`, {
      params: { nodeId: testData.nodeId, limit: 5 }
    });

    console.log('✅ 成功獲取歷史記錄！');
    console.log('總筆數:', historyResponse.data.total);
    
    if (historyResponse.data.histories.length > 0) {
      const latest = historyResponse.data.histories[0];
      console.log('\n最新一筆記錄:');
      console.log('- ID:', latest.id);
      console.log('- Agent:', latest.agentType);
      console.log('- 模型:', latest.model);
      console.log('- 時間:', latest.timestamp);
      console.log('- 回應時間:', latest.responseTimeMs, 'ms');

      // 4. 查詢單筆詳情
      console.log('\n📄 步驟 3: 查詢單筆詳情...');
      const detailResponse = await axios.get(`${API_BASE}/api/kb-coach/history/${latest.id}`);
      console.log('✅ 成功獲取詳情！');
      console.log('完整內容長度:', detailResponse.data.responseContent.length, '字');
      console.log('建議行動數量:', detailResponse.data.suggestedActions.length);
    }

    console.log('\n✅ 歷史記錄功能測試完成！');
    return true;

  } catch (error) {
    console.error('❌ 測試失敗！');
    console.error('錯誤訊息:', error.response?.data?.error || error.message);
    return false;
  }
}

module.exports = { testKBCoach, testAllAgents, testHistoryFeature };
