/**
 * Phase 1 Authentication Tracking 完整測試腳本
 * 
 * 測試範圍:
 * 1. USER_REGISTER - 用戶註冊
 * 2. USER_LOGIN_SUCCESS - 登入成功
 * 3. USER_LOGIN_FAILED - 登入失敗
 * 4. USER_LOGOUT - 用戶登出
 * 5. TOKEN_REFRESH - Token 刷新
 * 6. PASSWORD_UPDATE - 密碼更新
 * 7. PROFILE_UPDATE - 個人資料更新
 * 8. PASSWORD_RESET_REQUEST - 密碼重置請求
 * 9. PASSWORD_RESET_TOKEN_VALIDATE - 密碼重置 Token 驗證
 * 10. PASSWORD_RESET_EXECUTE - 密碼重置執行
 * 11. ANNOUNCEMENT_CREATE - 公告建立
 */

const axios = require('axios');
const AuditEvent = require('./models/audit_event');
const User = require('./models/user');
const RefreshToken = require('./models/refresh_token');
const PasswordResetToken = require('./models/password_reset_token');
const Announcement = require('./models/announcement');

const API_BASE_URL = 'http://localhost:3000/api';
const TEST_USER = {
  account: 'testaccount',
  password: 'test1234',
  username: '測試',
  email: 'test@gmail.com',
  role: 'student',
  class: '115',
  seatNumber: '01'
};

let authTokens = {
  accessToken: null,
  refreshToken: null,
  userId: null
};

// 顏色輸出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName) {
  console.log(`\n${'='.repeat(60)}`);
  log(`📝 測試: ${testName}`, 'cyan');
  console.log('='.repeat(60));
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// 等待函式
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 清理測試數據
async function cleanupTestData() {
  try {
    logInfo('清理測試數據...');
    
    // 先找出測試用戶
    const testUser = await User.findOne({ where: { account: TEST_USER.account } });
    const testUserId = testUser ? testUser.id : authTokens.userId;
    
    if (testUserId) {
      // 刪除測試用戶相關的 RefreshToken
      await RefreshToken.destroy({ where: { userId: testUserId } });
      
      // 刪除測試用戶相關的 PasswordResetToken
      await PasswordResetToken.destroy({ where: { userId: testUserId } });
      
      // 刪除測試用戶相關的公告 (使用 author 欄位)
      const testUserData = testUser || await User.findByPk(testUserId);
      if (testUserData) {
        await Announcement.destroy({ where: { author: testUserData.username } });
      }
      
      // 刪除測試用戶
      await User.destroy({ where: { id: testUserId } });
    }
    
    // 刪除測試相關的審計記錄 (根據 account metadata)
    // 注意: 這裡只是最佳嘗試,因為不是所有事件都有 account metadata
    
    logSuccess('測試數據清理完成');
  } catch (error) {
    logError(`清理失敗: ${error.message}`);
  }
}

// 1. 測試用戶註冊
async function testUserRegister() {
  logTest('USER_REGISTER - 用戶註冊');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/users/register`, TEST_USER);
    
    if (response.status === 201) {
      authTokens.accessToken = response.data.accessToken;
      authTokens.refreshToken = response.data.refreshToken;
      authTokens.userId = response.data.id;
      
      logSuccess(`註冊成功! User ID: ${authTokens.userId}`);
      logInfo(`Access Token: ${authTokens.accessToken.substring(0, 20)}...`);
      
      // 等待審計記錄寫入
      await sleep(100);
      
      // 驗證審計記錄
      const auditEvent = await AuditEvent.findOne({
        where: { action: 'USER_REGISTER', actorId: authTokens.userId },
        order: [['createdAt', 'DESC']]
      });
      
      if (auditEvent) {
        logSuccess(`✓ 審計記錄已建立: ${auditEvent.action}`);
        logInfo(`  - Actor: ${auditEvent.actorId}`);
        logInfo(`  - Target Type: ${auditEvent.targetType}`);
        logInfo(`  - Metadata: ${JSON.stringify(auditEvent.metadata)}`);
      } else {
        logError('✗ 未找到審計記錄');
      }
      
      return true;
    }
  } catch (error) {
    logError(`註冊失敗: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

// 2. 測試登入成功
async function testLoginSuccess() {
  logTest('USER_LOGIN_SUCCESS - 登入成功');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/users/login`, {
      account: TEST_USER.account,
      password: TEST_USER.password
    });
    
    if (response.status === 200) {
      authTokens.accessToken = response.data.accessToken;
      authTokens.refreshToken = response.data.refreshToken;
      
      logSuccess('登入成功!');
      logInfo(`User: ${response.data.username} (${response.data.role})`);
      
      // 等待審計記錄寫入
      await sleep(100);
      
      // 驗證審計記錄
      const auditEvent = await AuditEvent.findOne({
        where: { action: 'USER_LOGIN_SUCCESS', actorId: authTokens.userId },
        order: [['createdAt', 'DESC']]
      });
      
      if (auditEvent) {
        logSuccess(`✓ 審計記錄已建立: ${auditEvent.action}`);
        logInfo(`  - Metadata: ${JSON.stringify(auditEvent.metadata)}`);
      } else {
        logError('✗ 未找到審計記錄');
      }
      
      return true;
    }
  } catch (error) {
    logError(`登入失敗: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

// 3. 測試登入失敗
async function testLoginFailed() {
  logTest('USER_LOGIN_FAILED - 登入失敗');
  
  try {
    await axios.post(`${API_BASE_URL}/users/login`, {
      account: TEST_USER.account,
      password: 'wrong_password'
    });
    
    logError('應該要登入失敗但卻成功了!');
    return false;
  } catch (error) {
    if (error.response?.status === 401) {
      logSuccess('登入失敗測試成功!');
      logInfo(`錯誤訊息: ${error.response.data.error}`);
      
      // 等待審計記錄寫入
      await sleep(100);
      
      // 驗證審計記錄
      const auditEvent = await AuditEvent.findOne({
        where: { action: 'USER_LOGIN_FAILED' },
        order: [['createdAt', 'DESC']]
      });
      
      if (auditEvent) {
        logSuccess(`✓ 審計記錄已建立: ${auditEvent.action}`);
        logInfo(`  - Failure Reason: ${auditEvent.metadata?.reason}`);
        logInfo(`  - Account: ${auditEvent.metadata?.account}`);
      } else {
        logError('✗ 未找到審計記錄');
      }
      
      return true;
    }
    
    logError(`未預期的錯誤: ${error.message}`);
    return false;
  }
}

// 4. 測試 Token 刷新
async function testTokenRefresh() {
  logTest('TOKEN_REFRESH - Token 刷新');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
      refreshToken: authTokens.refreshToken
    });
    
    if (response.status === 200) {
      const oldToken = authTokens.accessToken;
      authTokens.accessToken = response.data.accessToken;
      
      logSuccess('Token 刷新成功!');
      logInfo(`舊 Token: ${oldToken.substring(0, 20)}...`);
      logInfo(`新 Token: ${authTokens.accessToken.substring(0, 20)}...`);
      
      // 等待審計記錄寫入
      await sleep(100);
      
      // 驗證審計記錄
      const auditEvent = await AuditEvent.findOne({
        where: { action: 'TOKEN_REFRESH', actorId: authTokens.userId },
        order: [['createdAt', 'DESC']]
      });
      
      if (auditEvent) {
        logSuccess(`✓ 審計記錄已建立: ${auditEvent.action}`);
      } else {
        logError('✗ 未找到審計記錄');
      }
      
      return true;
    }
  } catch (error) {
    logError(`Token 刷新失敗: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

// 5. 測試個人資料更新
async function testProfileUpdate() {
  logTest('PROFILE_UPDATE - 個人資料更新');
  
  try {
    const response = await axios.put(
      `${API_BASE_URL}/users/profile`,
      {
        username: 'Phase1測試更新',
        email: 'updated@sdls.test'
      },
      {
        headers: {
          accessToken: authTokens.accessToken
        }
      }
    );
    
    if (response.status === 200) {
      logSuccess('個人資料更新成功!');
      logInfo(`新用戶名: ${response.data.username}`);
      logInfo(`新信箱: ${response.data.email}`);
      
      // 等待審計記錄寫入
      await sleep(100);
      
      // 驗證審計記錄
      const auditEvent = await AuditEvent.findOne({
        where: { action: 'PROFILE_UPDATE', actorId: authTokens.userId },
        order: [['createdAt', 'DESC']]
      });
      
      if (auditEvent) {
        logSuccess(`✓ 審計記錄已建立: ${auditEvent.action}`);
        logInfo(`  - Metadata: ${JSON.stringify(auditEvent.metadata)}`);
      } else {
        logError('✗ 未找到審計記錄');
      }
      
      return true;
    }
  } catch (error) {
    logError(`資料更新失敗: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

// 6. 測試密碼更新
async function testPasswordUpdate() {
  logTest('PASSWORD_UPDATE - 密碼更新');
  
  try {
    const newPassword = 'newtest1234';
    const response = await axios.put(
      `${API_BASE_URL}/users/password`,
      {
        currentPassword: TEST_USER.password,
        newPassword: newPassword
      },
      {
        headers: {
          accessToken: authTokens.accessToken
        }
      }
    );
    
    if (response.status === 200) {
      logSuccess('密碼更新成功!');
      
      // 更新測試密碼
      TEST_USER.password = newPassword;
      
      // 等待審計記錄寫入
      await sleep(100);
      
      // 驗證審計記錄
      const auditEvent = await AuditEvent.findOne({
        where: { action: 'PASSWORD_UPDATE', actorId: authTokens.userId },
        order: [['createdAt', 'DESC']]
      });
      
      if (auditEvent) {
        logSuccess(`✓ 審計記錄已建立: ${auditEvent.action}`);
      } else {
        logError('✗ 未找到審計記錄');
      }
      
      return true;
    }
  } catch (error) {
    logError(`密碼更新失敗: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

// 7. 測試密碼重置請求
async function testPasswordResetRequest() {
  logTest('PASSWORD_RESET_REQUEST - 密碼重置請求');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/forgot-password`, {
      email: 'updated@sdls.test'
    });
    
    if (response.status === 200) {
      logSuccess('密碼重置請求成功!');
      logInfo(`訊息: ${response.data.message}`);
      
      // 等待審計記錄寫入
      await sleep(100);
      
      // 驗證審計記錄
      const auditEvent = await AuditEvent.findOne({
        where: { action: 'PASSWORD_RESET_REQUEST' },
        order: [['createdAt', 'DESC']]
      });
      
      if (auditEvent) {
        logSuccess(`✓ 審計記錄已建立: ${auditEvent.action}`);
        logInfo(`  - Metadata: ${JSON.stringify(auditEvent.metadata)}`);
      } else {
        logError('✗ 未找到審計記錄');
      }
      
      return true;
    }
  } catch (error) {
    logError(`密碼重置請求失敗: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

// 8. 測試密碼重置 Token 驗證
async function testPasswordResetTokenValidate() {
  logTest('PASSWORD_RESET_TOKEN_VALIDATE - 密碼重置 Token 驗證');
  
  try {
    // 先獲取 Token (使用 userId)
    const resetToken = await PasswordResetToken.findOne({
      where: { userId: authTokens.userId },
      order: [['createdAt', 'DESC']]
    });
    
    if (!resetToken) {
      logError('找不到重置 Token');
      return false;
    }
    
    const response = await axios.get(`${API_BASE_URL}/auth/reset-password/${resetToken.token}`);
    
    if (response.status === 200) {
      logSuccess('Token 驗證成功!');
      logInfo(`Email: ${response.data.email}`);
      
      // 等待審計記錄寫入
      await sleep(100);
      
      // 驗證審計記錄
      const auditEvent = await AuditEvent.findOne({
        where: { action: 'PASSWORD_RESET_TOKEN_VALIDATE' },
        order: [['createdAt', 'DESC']]
      });
      
      if (auditEvent) {
        logSuccess(`✓ 審計記錄已建立: ${auditEvent.action}`);
      } else {
        logError('✗ 未找到審計記錄');
      }
      
      return true;
    }
  } catch (error) {
    logError(`Token 驗證失敗: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

// 9. 測試密碼重置執行
async function testPasswordResetExecute() {
  logTest('PASSWORD_RESET_EXECUTE - 密碼重置執行');
  
  try {
    // 先獲取 Token (使用 userId)
    const resetToken = await PasswordResetToken.findOne({
      where: { userId: authTokens.userId },
      order: [['createdAt', 'DESC']]
    });
    
    if (!resetToken) {
      logError('找不到重置 Token');
      return false;
    }
    
    const resetPassword = 'reset1234';
    const response = await axios.post(`${API_BASE_URL}/auth/reset-password`, {
      token: resetToken.token,
      newPassword: resetPassword
    });
    
    if (response.status === 200) {
      logSuccess('密碼重置執行成功!');
      logInfo(`訊息: ${response.data.message}`);
      
      // 更新測試密碼
      TEST_USER.password = resetPassword;
      
      // 等待審計記錄寫入
      await sleep(100);
      
      // 驗證審計記錄
      const auditEvent = await AuditEvent.findOne({
        where: { action: 'PASSWORD_RESET_EXECUTE' },
        order: [['createdAt', 'DESC']]
      });
      
      if (auditEvent) {
        logSuccess(`✓ 審計記錄已建立: ${auditEvent.action}`);
        logInfo(`  - Metadata: ${JSON.stringify(auditEvent.metadata)}`);
      } else {
        logError('✗ 未找到審計記錄');
      }
      
      return true;
    }
  } catch (error) {
    logError(`密碼重置執行失敗: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

// 10. 測試公告建立 (需要教師權限)
async function testAnnouncementCreate() {
  logTest('ANNOUNCEMENT_CREATE - 公告建立');
  
  try {
    // 先將用戶升級為教師
    await User.update(
      { role: 'teacher' },
      { where: { id: authTokens.userId } }
    );
    
    // 重新登入獲取更新的 Token
    const loginResponse = await axios.post(`${API_BASE_URL}/users/login`, {
      account: TEST_USER.account,
      password: TEST_USER.password
    });
    authTokens.accessToken = loginResponse.data.accessToken;
    
    const response = await axios.post(
      `${API_BASE_URL}/announcements/create`,
      {
        title: 'Phase 1 測試公告',
        content: '這是一個測試公告',
        author: loginResponse.data.username,
        projectId: 'all'
      },
      {
        headers: {
          accessToken: authTokens.accessToken
        }
      }
    );
    
    if (response.status === 201) {
      logSuccess('公告建立成功!');
      logInfo(`公告 ID: ${response.data.id}`);
      logInfo(`標題: ${response.data.title}`);
      
      // 等待審計記錄寫入
      await sleep(100);
      
      // 驗證審計記錄
      const auditEvent = await AuditEvent.findOne({
        where: { action: 'ANNOUNCEMENT_CREATE', actorId: authTokens.userId },
        order: [['createdAt', 'DESC']]
      });
      
      if (auditEvent) {
        logSuccess(`✓ 審計記錄已建立: ${auditEvent.action}`);
        logInfo(`  - Metadata: ${JSON.stringify(auditEvent.metadata)}`);
      } else {
        logError('✗ 未找到審計記錄');
      }
      
      return true;
    }
  } catch (error) {
    logError(`公告建立失敗: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

// 11. 測試用戶登出
async function testUserLogout() {
  logTest('USER_LOGOUT - 用戶登出');
  
  try {
    const response = await axios.post(
      `${API_BASE_URL}/auth/logout`,
      {
        refreshToken: authTokens.refreshToken
      },
      {
        headers: {
          accessToken: authTokens.accessToken
        }
      }
    );
    
    if (response.status === 200) {
      logSuccess('登出成功!');
      logInfo(`訊息: ${response.data.message}`);
      
      // 等待審計記錄寫入
      await sleep(100);
      
      // 驗證審計記錄
      const auditEvent = await AuditEvent.findOne({
        where: { action: 'USER_LOGOUT', actorId: authTokens.userId },
        order: [['createdAt', 'DESC']]
      });
      
      if (auditEvent) {
        logSuccess(`✓ 審計記錄已建立: ${auditEvent.action}`);
      } else {
        logError('✗ 未找到審計記錄');
      }
      
      return true;
    }
  } catch (error) {
    logError(`登出失敗: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

// 驗證所有審計事件
async function verifyAllAuditEvents() {
  logTest('驗證所有 Phase 1 審計事件');
  
  const expectedActions = [
    'USER_REGISTER',
    'USER_LOGIN_SUCCESS',
    'USER_LOGIN_FAILED',
    'USER_LOGOUT',
    'TOKEN_REFRESH',
    'PASSWORD_UPDATE',
    'PROFILE_UPDATE',
    'PASSWORD_RESET_REQUEST',
    'PASSWORD_RESET_TOKEN_VALIDATE',
    'PASSWORD_RESET_EXECUTE',
    'ANNOUNCEMENT_CREATE'
  ];
  
  const results = {};
  
  for (const action of expectedActions) {
    const count = await AuditEvent.count({ where: { action } });
    results[action] = count;
    
    if (count > 0) {
      logSuccess(`${action}: ${count} 筆記錄`);
    } else {
      logError(`${action}: 未找到記錄`);
    }
  }
  
  const totalEvents = Object.values(results).reduce((sum, count) => sum + count, 0);
  logInfo(`\n總計: ${totalEvents} 筆審計事件`);
  
  return results;
}

// 主測試流程
async function runAllTests() {
  log('\n╔═══════════════════════════════════════════════════════════════╗', 'cyan');
  log('║         Phase 1 Authentication Tracking 完整測試             ║', 'cyan');
  log('╚═══════════════════════════════════════════════════════════════╝\n', 'cyan');
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };
  
  const tests = [
    { name: 'USER_REGISTER', fn: testUserRegister },
    { name: 'USER_LOGIN_SUCCESS', fn: testLoginSuccess },
    { name: 'USER_LOGIN_FAILED', fn: testLoginFailed },
    { name: 'TOKEN_REFRESH', fn: testTokenRefresh },
    { name: 'PROFILE_UPDATE', fn: testProfileUpdate },
    { name: 'PASSWORD_UPDATE', fn: testPasswordUpdate },
    { name: 'PASSWORD_RESET_REQUEST', fn: testPasswordResetRequest },
    { name: 'PASSWORD_RESET_TOKEN_VALIDATE', fn: testPasswordResetTokenValidate },
    { name: 'PASSWORD_RESET_EXECUTE', fn: testPasswordResetExecute },
    { name: 'ANNOUNCEMENT_CREATE', fn: testAnnouncementCreate },
    { name: 'USER_LOGOUT', fn: testUserLogout }
  ];
  
  // 先清理舊數據
  await cleanupTestData();
  await sleep(500);
  
  // 執行所有測試
  for (const test of tests) {
    const success = await test.fn();
    
    results.tests.push({
      name: test.name,
      passed: success
    });
    
    if (success) {
      results.passed++;
    } else {
      results.failed++;
    }
    
    await sleep(500);
  }
  
  // 驗證所有審計事件
  await sleep(1000);
  await verifyAllAuditEvents();
  
  // 顯示結果摘要
  log('\n╔═══════════════════════════════════════════════════════════════╗', 'cyan');
  log('║                        測試結果摘要                           ║', 'cyan');
  log('╚═══════════════════════════════════════════════════════════════╝\n', 'cyan');
  
  results.tests.forEach(test => {
    if (test.passed) {
      logSuccess(`${test.name}`);
    } else {
      logError(`${test.name}`);
    }
  });
  
  log(`\n${'='.repeat(60)}`, 'cyan');
  logInfo(`總測試數: ${tests.length}`);
  logSuccess(`通過: ${results.passed}`);
  if (results.failed > 0) {
    logError(`失敗: ${results.failed}`);
  }
  log('='.repeat(60), 'cyan');
  
  // 清理測試數據
  await sleep(1000);
  await cleanupTestData();
  
  process.exit(results.failed > 0 ? 1 : 0);
}

// 執行測試
runAllTests().catch(error => {
  logError(`測試執行失敗: ${error.message}`);
  console.error(error);
  process.exit(1);
});
