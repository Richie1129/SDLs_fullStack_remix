/**
 * 公告刪除 API 測試腳本
 * 測試 DELETE /api/announcement/:id 端點及審計追蹤功能
 */

const axios = require('axios');
const { Announcement, User, AuditLog, sequelize } = require('./models');
const { sign } = require('jsonwebtoken');
const config = require('./config');

const BASE_URL = 'http://localhost:3000/api';
const TEST_CONFIG = {
    teacherUser: {
        id: 1,
        username: 'Test Teacher',
        account: 'teacher@example.com',
        password: 'password123',
        role: 'teacher'
    },
    studentUser: {
        id: 2,
        username: 'Test Student',
        account: 'student@example.com',
        password: 'password123',
        role: 'student'
    }
};

// 測試結果追蹤
const testResults = {
    passed: 0,
    failed: 0,
    tests: []
};

// 生成測試用 JWT Token
function generateTestToken(user) {
    return sign(
        {
            id: user.id,
            username: user.username,
            account: user.account,
            role: user.role
        },
        config.jwt.secret,
        { expiresIn: '1h' }
    );
}

// 測試結果記錄函式
function recordTest(name, passed, details = '') {
    testResults.tests.push({ name, passed, details });
    if (passed) {
        testResults.passed++;
        console.log(`✅ ${name}`);
    } else {
        testResults.failed++;
        console.error(`❌ ${name}`);
        if (details) console.error(`   詳情: ${details}`);
    }
}

// 清理測試資料
async function cleanupTestData(announcementIds = []) {
    console.log('\n🧹 清理測試資料...');

    try {
        if (announcementIds.length > 0) {
            await Announcement.destroy({
                where: { id: announcementIds },
                force: true
            });
            console.log(`已刪除 ${announcementIds.length} 筆測試公告`);
        }

        // 清理審計日誌
        await AuditLog.destroy({
            where: {
                action: ['ANNOUNCEMENT_CREATE', 'ANNOUNCEMENT_DELETE'],
                createdAt: { [sequelize.Sequelize.Op.gte]: new Date(Date.now() - 60000) }
            }
        });
        console.log('已清理測試審計日誌');

    } catch (error) {
        console.error('清理測試資料失敗:', error.message);
    }
}

// 測試 1: 建立測試公告
async function createTestAnnouncement(title, projectId = null) {
    try {
        const response = await axios.post(`${BASE_URL}/announcement/create`, {
            title: title,
            content: '這是測試公告內容',
            author: TEST_CONFIG.testUser.username,
            projectId: projectId || 'all'
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 201 && response.data.announcement) {
            return response.data.announcement;
        } else {
            throw new Error('建立公告失敗');
        }
    } catch (error) {
        throw new Error(`建立公告失敗: ${error.message}`);
    }
}

// 測試 2: 刪除公告 (API with token)
async function testDeleteAnnouncement(announcementId) {
    console.log('\n📝 測試 2: 刪除公告 API');

    try {
        const teacherToken = generateTestToken(TEST_CONFIG.teacherUser);
        const response = await axios.delete(`${BASE_URL}/announcement/${announcementId}`, {
            headers: {
                'accessToken': teacherToken
            }
        });

        const passed = response.status === 200 &&
                      response.data.message === '公告刪除成功' &&
                      response.data.deletedId === announcementId;

        recordTest(
            '測試 2: DELETE /api/announcement/:id 回應正確',
            passed,
            passed ? '' : `狀態碼: ${response.status}, 訊息: ${JSON.stringify(response.data)}`
        );

        return passed;
    } catch (error) {
        recordTest(
            '測試 2: DELETE /api/announcement/:id 回應正確',
            false,
            error.message
        );
        return false;
    }
}

// 測試 3: 驗證資料庫中公告已刪除
async function testAnnouncementDeleted(announcementId) {
    console.log('\n📝 測試 3: 驗證資料庫中公告已刪除');

    try {
        const announcement = await Announcement.findByPk(announcementId);
        const passed = announcement === null;

        recordTest(
            '測試 3: 資料庫中公告已刪除',
            passed,
            passed ? '' : '公告仍存在於資料庫中'
        );

        return passed;
    } catch (error) {
        recordTest(
            '測試 3: 資料庫中公告已刪除',
            false,
            error.message
        );
        return false;
    }
}

// 測試 4: 驗證審計日誌記錄
async function testAuditLogCreated(announcementId) {
    console.log('\n📝 測試 4: 驗證審計日誌記錄');

    try {
        const auditLog = await AuditLog.findOne({
            where: {
                action: 'ANNOUNCEMENT_DELETE',
                targetType: 'announcement',
                targetId: announcementId
            },
            order: [['createdAt', 'DESC']]
        });

        if (!auditLog) {
            recordTest('測試 4: 審計日誌已建立', false, '找不到審計日誌');
            return false;
        }

        // 驗證審計日誌內容
        const hasTitle = auditLog.metadata && auditLog.metadata.title;
        const hasAuthor = auditLog.metadata && auditLog.metadata.author;
        const hasType = auditLog.metadata && auditLog.metadata.announcementType;
        const hasDeletedAt = auditLog.metadata && auditLog.metadata.deletedAt;
        const isSuccess = auditLog.result === 'success';

        const passed = hasTitle && hasAuthor && hasType && hasDeletedAt && isSuccess;

        recordTest(
            '測試 4: 審計日誌已建立且內容完整',
            passed,
            passed ? '' : `缺少必要欄位 - title:${hasTitle}, author:${hasAuthor}, type:${hasType}, deletedAt:${hasDeletedAt}, success:${isSuccess}`
        );

        if (passed) {
            console.log('   審計日誌內容:', {
                action: auditLog.action,
                targetType: auditLog.targetType,
                targetId: auditLog.targetId,
                result: auditLog.result,
                metadata: auditLog.metadata
            });
        }

        return passed;
    } catch (error) {
        recordTest('測試 4: 審計日誌已建立', false, error.message);
        return false;
    }
}

// 測試 5: 測試刪除不存在的公告
async function testDeleteNonExistentAnnouncement() {
    console.log('\n📝 測試 5: 測試刪除不存在的公告');

    try {
        const teacherToken = generateTestToken(TEST_CONFIG.teacherUser);
        const response = await axios.delete(`${BASE_URL}/announcement/99999`, {
            headers: { 'accessToken': teacherToken }
        });
        recordTest(
            '測試 5: 刪除不存在的公告應返回 404',
            false,
            '應該返回 404 但返回了 200'
        );
        return false;
    } catch (error) {
        const passed = error.response && error.response.status === 404;
        recordTest(
            '測試 5: 刪除不存在的公告應返回 404',
            passed,
            passed ? '' : `返回狀態碼: ${error.response?.status || '無回應'}`
        );
        return passed;
    }
}

// 測試 6: 測試權限控制（學生無法刪除）
async function testPermissionControl() {
    console.log('\n📝 測試 6: 測試權限控制');
    let testAnnouncementId = null;

    try {
        // 建立測試公告
        const announcement = await createTestAnnouncement('[測試] 權限測試公告');
        testAnnouncementId = announcement.id;

        // 嘗試使用學生帳號刪除（應該失敗）
        const studentToken = generateTestToken(TEST_CONFIG.studentUser);

        try {
            await axios.delete(`${BASE_URL}/announcement/${testAnnouncementId}`, {
                headers: {
                    'accessToken': studentToken
                }
            });

            recordTest(
                '測試 6: 學生無權限刪除公告（應返回 403）',
                false,
                '學生帳號刪除成功，但應該被拒絕'
            );
            return false;
        } catch (error) {
            const passed = error.response?.status === 403 &&
                          error.response?.data?.code === 'PERMISSION_DENIED';

            recordTest(
                '測試 6: 學生無權限刪除公告（應返回 403）',
                passed,
                passed ? '' : `狀態碼: ${error.response?.status}, 錯誤碼: ${error.response?.data?.code}`
            );

            // 驗證公告仍然存在
            const stillExists = await Announcement.findByPk(testAnnouncementId);
            const existsCheck = stillExists !== null;

            recordTest(
                '測試 6b: 公告未被刪除（學生嘗試後）',
                existsCheck,
                existsCheck ? '' : '公告被錯誤刪除'
            );

            return passed && existsCheck;
        }
    } catch (error) {
        recordTest('測試 6: 權限控制測試', false, error.message);
        return false;
    } finally {
        // 清理測試資料
        if (testAnnouncementId) {
            await cleanupTestData([testAnnouncementId]);
        }
    }
}

// 測試 7: 測試教師權限（應該成功）
async function testTeacherPermission() {
    console.log('\n📝 測試 7: 測試教師權限');
    let testAnnouncementId = null;

    try {
        // 建立測試公告
        const announcement = await createTestAnnouncement('[測試] 教師權限測試');
        testAnnouncementId = announcement.id;

        // 使用教師帳號刪除（應該成功）
        const teacherToken = generateTestToken(TEST_CONFIG.teacherUser);

        const response = await axios.delete(`${BASE_URL}/announcement/${testAnnouncementId}`, {
            headers: {
                'accessToken': teacherToken
            }
        });

        const passed = response.status === 200 && response.data.message === '公告刪除成功';

        recordTest(
            '測試 7: 教師有權限刪除公告',
            passed,
            passed ? '' : `狀態碼: ${response.status}`
        );

        // 驗證公告已被刪除
        const deleted = await Announcement.findByPk(testAnnouncementId);
        const deletedCheck = deleted === null;

        recordTest(
            '測試 7b: 公告已成功刪除（教師操作）',
            deletedCheck,
            deletedCheck ? '' : '公告未被刪除'
        );

        return passed && deletedCheck;
    } catch (error) {
        recordTest('測試 7: 教師權限測試', false, error.message);
        return false;
    }
}

// 測試 8: 測試不同類型公告的刪除
async function testDeleteDifferentAnnouncementTypes() {
    console.log('\n📝 測試 8: 測試不同類型公告的刪除');
    const announcementsToClean = [];
    const teacherToken = generateTestToken(TEST_CONFIG.teacherUser);

    try {
        // 測試全域公告
        const globalAnnouncement = await createTestAnnouncement('[測試] 全域公告', 'all');
        announcementsToClean.push(globalAnnouncement.id);
        await axios.delete(`${BASE_URL}/announcement/${globalAnnouncement.id}`, {
            headers: { 'accessToken': teacherToken }
        });
        const globalAudit = await AuditLog.findOne({
            where: { action: 'ANNOUNCEMENT_DELETE', targetId: globalAnnouncement.id }
        });
        const globalPassed = globalAudit?.metadata?.announcementType === 'global';

        // 測試專案公告
        const projectAnnouncement = await createTestAnnouncement('[測試] 專案公告', 1);
        announcementsToClean.push(projectAnnouncement.id);
        await axios.delete(`${BASE_URL}/announcement/${projectAnnouncement.id}`, {
            headers: { 'accessToken': teacherToken }
        });
        const projectAudit = await AuditLog.findOne({
            where: { action: 'ANNOUNCEMENT_DELETE', targetId: projectAnnouncement.id }
        });
        const projectPassed = projectAudit?.metadata?.announcementType === 'project';

        const passed = globalPassed && projectPassed;
        recordTest(
            '測試 8: 不同類型公告刪除及審計記錄正確',
            passed,
            passed ? '' : `全域:${globalPassed}, 專案:${projectPassed}`
        );

        return passed;
    } catch (error) {
        recordTest('測試 8: 不同類型公告刪除及審計記錄正確', false, error.message);
        return false;
    } finally {
        // 清理測試資料
        await cleanupTestData(announcementsToClean);
    }
}

// 主測試流程
async function runTests() {
    console.log('🚀 開始公告刪除功能測試\n');
    console.log('='.repeat(60));

    let testAnnouncementId = null;

    try {
        // 測試 1: 建立測試公告
        console.log('\n📝 測試 1: 建立測試公告');
        const announcement = await createTestAnnouncement('[測試] 待刪除公告');
        testAnnouncementId = announcement.id;
        recordTest('測試 1: 建立測試公告', true, `公告 ID: ${testAnnouncementId}`);
        console.log(`   公告 ID: ${testAnnouncementId}`);

        // 測試 2: 刪除公告
        await testDeleteAnnouncement(testAnnouncementId);

        // 測試 3: 驗證資料庫刪除
        await testAnnouncementDeleted(testAnnouncementId);

        // 測試 4: 驗證審計日誌
        await testAuditLogCreated(testAnnouncementId);

        // 測試 5: 測試刪除不存在的公告
        await testDeleteNonExistentAnnouncement();

        // 測試 6: 測試權限控制（學生無法刪除）
        await testPermissionControl();

        // 測試 7: 測試教師權限
        await testTeacherPermission();

        // 測試 8: 測試不同類型公告
        await testDeleteDifferentAnnouncementTypes();

    } catch (error) {
        console.error('\n❌ 測試執行失敗:', error.message);
        console.error(error.stack);
    } finally {
        // 確保清理測試資料
        if (testAnnouncementId) {
            await cleanupTestData([testAnnouncementId]);
        }
    }

    // 顯示測試結果摘要
    console.log('\n' + '='.repeat(60));
    console.log('📊 測試結果摘要\n');
    console.log(`✅ 通過: ${testResults.passed} 項`);
    console.log(`❌ 失敗: ${testResults.failed} 項`);
    console.log(`📝 總計: ${testResults.tests.length} 項`);
    console.log(`📈 通過率: ${((testResults.passed / testResults.tests.length) * 100).toFixed(1)}%`);

    // 詳細測試結果
    console.log('\n詳細測試結果:');
    testResults.tests.forEach((test, index) => {
        const icon = test.passed ? '✅' : '❌';
        console.log(`${index + 1}. ${icon} ${test.name}`);
        if (test.details) {
            console.log(`   ${test.details}`);
        }
    });

    console.log('\n' + '='.repeat(60));

    // 如果所有測試通過，結束程序
    if (testResults.failed === 0) {
        console.log('\n🎉 所有測試通過！\n');
        process.exit(0);
    } else {
        console.log('\n⚠️  部分測試失敗，請檢查詳細結果\n');
        process.exit(1);
    }
}

// SQL 驗證查詢（供手動驗證用）
function printSQLQueries() {
    console.log('\n📝 手動驗證 SQL 查詢:\n');

    console.log('-- 查詢最近的公告刪除審計日誌');
    console.log(`SELECT
    id,
    action,
    "targetType",
    "targetId",
    result,
    metadata,
    "createdAt"
FROM "AuditLogs"
WHERE action = 'ANNOUNCEMENT_DELETE'
ORDER BY "createdAt" DESC
LIMIT 10;\n`);

    console.log('-- 驗證公告是否已刪除');
    console.log(`SELECT * FROM announcements WHERE id = {announcement_id};\n`);

    console.log('-- 統計公告刪除審計記錄');
    console.log(`SELECT
    COUNT(*) as total_deletes,
    COUNT(CASE WHEN result = 'success' THEN 1 END) as successful,
    COUNT(CASE WHEN result = 'failure' THEN 1 END) as failed
FROM "AuditLogs"
WHERE action = 'ANNOUNCEMENT_DELETE'
    AND "createdAt" >= NOW() - INTERVAL '1 day';\n`);
}

// 執行測試
if (require.main === module) {
    console.log('⚙️  環境配置:');
    console.log(`   Base URL: ${BASE_URL}`);
    console.log(`   測試用戶: ${TEST_CONFIG.testUser.username} (ID: ${TEST_CONFIG.testUser.id})`);
    console.log('');

    runTests().catch(error => {
        console.error('測試執行錯誤:', error);
        process.exit(1);
    });

    // 顯示 SQL 驗證查詢
    printSQLQueries();
}

module.exports = {
    createTestAnnouncement,
    testDeleteAnnouncement,
    testAnnouncementDeleted,
    testAuditLogCreated,
    cleanupTestData
};
