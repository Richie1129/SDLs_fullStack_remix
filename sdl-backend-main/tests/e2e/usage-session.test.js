/**
 * Usage Session System Test Script
 * 
 * 測試重構後的使用者時間記錄系統的核心功能：
 * 1. 併發安全性
 * 2. 時間計算準確性  
 * 3. 清理服務功能
 */

const UsageSession = require('./models/usage_session');
const { cleanupStaleSessions } = require('./services/usageCleanupService');
const sequelize = require('./util/database');

async function testConcurrencyControl() {
  console.log('\n🔄 測試併發控制...');
  
  const testUserId = 99999;
  const testProjectId = 88888;
  
  try {
    // 清理測試數據
    await UsageSession.destroy({ where: { userId: testUserId, projectId: testProjectId } });
    
    // 模擬併發創建 session
    const promises = Array.from({ length: 3 }, (_, i) => 
      UsageSession.sequelize.query(`
        INSERT INTO usage_sessions("userId", "projectId", "startedAt", "lastActiveAt", "totalSeconds", "createdAt", "updatedAt")
        VALUES (:userId, :projectId, NOW(), NOW(), 0, NOW(), NOW())
        ON CONFLICT ("userId", "projectId") WHERE "endedAt" IS NULL
        DO UPDATE SET "lastActiveAt" = GREATEST(usage_sessions."lastActiveAt", NOW()),
                      "updatedAt" = NOW()
        RETURNING id, "startedAt", "lastActiveAt";
      `, {
        replacements: { userId: testUserId, projectId: testProjectId },
        type: UsageSession.sequelize.QueryTypes.SELECT
      }).then(result => ({ index: i, result: result[0] }))
    );
    
    const results = await Promise.all(promises);
    
    // 檢查是否只創建了一個 session
    const sessions = await UsageSession.findAll({ 
      where: { userId: testUserId, projectId: testProjectId, endedAt: null } 
    });
    
    console.log(`   併發請求數: ${results.length}`);
    console.log(`   實際創建數: ${sessions.length}`);
    console.log(`   結果: ${sessions.length === 1 ? '✅ 通過' : '❌ 失敗'}`);
    
    // 清理
    await UsageSession.destroy({ where: { userId: testUserId, projectId: testProjectId } });
    
  } catch (error) {
    console.error('   併發測試失敗:', error.message);
  }
}

async function testTimeCalculation() {
  console.log('\n⏱️  測試時間計算邏輯...');
  
  const testUserId = 99998;
  const testProjectId = 88887;
  
  try {
    // 清理測試數據
    await UsageSession.destroy({ where: { userId: testUserId, projectId: testProjectId } });
    
    // 創建測試 session
    const startTime = new Date(Date.now() - 300000); // 5分鐘前
    const lastActiveTime = new Date(Date.now() - 60000); // 1分鐘前
    
    const session = await UsageSession.create({
      userId: testUserId,
      projectId: testProjectId,
      startedAt: startTime,
      lastActiveAt: lastActiveTime,
      endedAt: null,
      totalSeconds: 0
    });
    
    // 測試清理服務是否會正確處理這個 "stale" session
    const cleanedCount = await cleanupStaleSessions();
    
    // 重新獲取 session 檢查狀態
    await session.reload();
    
    const expectedDuration = Math.floor((lastActiveTime - startTime) / 1000);
    const actualDuration = session.totalSeconds;
    
    console.log(`   預期時長: ${expectedDuration}s`);
    console.log(`   實際時長: ${actualDuration}s`);
    console.log(`   清理數量: ${cleanedCount}`);
    console.log(`   結果: ${session.endedAt && Math.abs(actualDuration - expectedDuration) < 2 ? '✅ 通過' : '❌ 失敗'}`);
    
    // 清理
    await UsageSession.destroy({ where: { userId: testUserId, projectId: testProjectId } });
    
  } catch (error) {
    console.error('   時間計算測試失敗:', error.message);
  }
}

async function testDatabaseConstraints() {
  console.log('\n🔒 測試數據庫約束...');
  
  try {
    // 檢查是否存在正確的 partial unique index
    const [results] = await sequelize.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'usage_sessions' 
      AND indexname = 'ux_usage_open_session';
    `);
    
    const hasPartialIndex = results.length > 0;
    console.log(`   Partial unique index: ${hasPartialIndex ? '✅ 存在' : '❌ 缺失'}`);
    
    if (hasPartialIndex) {
      console.log(`   索引定義: ${results[0].indexdef}`);
    }
    
  } catch (error) {
    console.error('   數據庫約束測試失敗:', error.message);
  }
}

async function runTests() {
  console.log('🧪 開始使用者時間記錄系統測試');
  console.log('=====================================');
  
  try {
    await testDatabaseConstraints();
    await testConcurrencyControl();
    await testTimeCalculation();
    
    console.log('\n✅ 所有測試完成');
    
  } catch (error) {
    console.error('測試過程中發生錯誤:', error);
  } finally {
    await sequelize.close();
  }
}

// 執行測試
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };