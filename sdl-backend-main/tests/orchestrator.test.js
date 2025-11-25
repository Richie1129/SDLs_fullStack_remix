/**
 * Orchestrator Test Suite (Phase 2)
 * 
 * Linus 原則：「測試真實場景，不是理論案例」
 * 
 * 測試情境：
 * 1. 淺層討論 (SHALLOW) -> 應觸發 IMPROVER
 * 2. 同溫層 (ECHO_CHAMBER) -> 應觸發 DEVIL
 * 3. 資訊過載 (OVERLOAD) -> 應觸發 SYNTHESIZER
 * 4. 健康討論 (HEALTHY) -> 應保持靜默
 * 5. 冷卻機制驗證
 */

const { analyzeDiscussion, classifyDiscussion } = require('../services/discussionAnalyzer');
const { applyDecisionRules } = require('../services/orchestrator');
const { getCooldownManager, COOLDOWN_MINUTES, MIN_NEW_POSTS } = require('../utils/cooldownManager');

// ============================================================================
// 測試數據工廠
// ============================================================================

/**
 * 生成測試節點
 */
function createMockNodes(scenario) {
    const baseNode = (id, content, owner) => ({
        id,
        title: `想法 ${id}`,
        content,
        owner,
        createdAt: new Date()
    });

    switch (scenario) {
        case 'SHALLOW':
            // 4 篇貼文，內容都很短
            return [
                baseNode(1, '我覺得這個不錯', 'Alice'),
                baseNode(2, '同意', 'Bob'),
                baseNode(3, '對啊', 'Charlie'),
                baseNode(4, '+1', 'David')
            ];

        case 'ECHO_CHAMBER':
            // 多篇貼文，但都是同一個人或觀點高度一致（低多樣性 + 高重複率）
            const echoContent = '氣候變遷氣候變遷主要是因為人類活動碳排放碳排放，我們應該減少碳排放碳排放，這是最重要的解決方案綠色能源綠色能源。';
            return [
                baseNode(1, echoContent, 'Alice'),
                baseNode(2, echoContent + '沒錯，減少碳排放碳排放是關鍵，我們必須立即行動綠色能源綠色能源。', 'Bob'),
                baseNode(3, echoContent + '完全同意，碳排放碳排放是罪魁禍首氣候變遷氣候變遷。', 'Alice'),
                baseNode(4, echoContent + '對啊，綠色能源綠色能源是唯一出路碳排放碳排放。', 'Bob')
            ];

        case 'OVERLOAD':
            // 12 篇貼文，觀點分散，未整合（關鍵詞重複率低）
            const topics = ['教育改革需要從根本做起', '經濟發展與環保平衡', '科技創新帶來新機會', '政策制定要考慮民意', '文化傳承與現代化', '環境保護刻不容緩', '社會福利制度改革', '國際合作與交流', '城市規劃與發展', '醫療體系完善', '勞工權益保障', '數位轉型策略'];
            return topics.map((topic, i) => 
                baseNode(i + 1, `關於這個議題，我認為${topic}是很重要的面向，值得深入探討...`, ['Alice', 'Bob', 'Charlie', 'David', 'Eve', 'Frank'][i % 6])
            );

        case 'HEALTHY':
            // 5-6 篇貼文，深度中等，多樣性良好
            return [
                baseNode(1, '我認為這個問題可以從兩個層面分析：第一是短期效應，第二是長期影響。短期來看...', 'Alice'),
                baseNode(2, '你提到的長期影響很重要，但我們也要考慮實際執行的可行性。比如資源分配的問題。', 'Bob'),
                baseNode(3, '資源分配確實是關鍵，不過我想補充一點，我們還需要考慮不同利害關係人的立場。', 'Charlie'),
                baseNode(4, '對，利害關係人的分析很必要。從教育的角度，我認為還要加上學生的學習動機。', 'David'),
                baseNode(5, '大家的觀點都很有價值，我嘗試整合一下：短期、長期、資源、利害關係人、動機...', 'Eve')
            ];

        default:
            return [];
    }
}

// ============================================================================
// 測試函數
// ============================================================================

function runTest(testName, testFn) {
    try {
        testFn();
        console.log(`✅ ${testName}`);
    } catch (error) {
        console.error(`❌ ${testName}`);
        console.error(`   Error: ${error.message}`);
    }
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

// ============================================================================
// Test Suite
// ============================================================================

console.log('\n🧪 === Orchestrator Test Suite ===\n');

// ----------------------------------------------------------------------------
// Test 1: 淺層討論檢測
// ----------------------------------------------------------------------------
runTest('Test 1: 淺層討論應觸發 Idea Improver', () => {
    const nodes = createMockNodes('SHALLOW');
    const analysis = analyzeDiscussion(nodes);
    const discussionType = classifyDiscussion(analysis);
    const decision = applyDecisionRules(analysis, discussionType);

    console.log(`   分析結果: ${JSON.stringify(analysis.raw)}`);
    console.log(`   討論類型: ${discussionType}`);
    console.log(`   決策: ${decision.action} - ${decision.role || 'N/A'}`);

    assert(discussionType === 'SHALLOW', `Expected SHALLOW, got ${discussionType}`);
    assert(decision.action === 'TRIGGER', 'Should trigger intervention');
    assert(decision.role === 'IMPROVER', `Expected IMPROVER, got ${decision.role}`);
});

// ----------------------------------------------------------------------------
// Test 2: 同溫層檢測
// ----------------------------------------------------------------------------
runTest('Test 2: 同溫層應觸發 Devil\'s Advocate', () => {
    const nodes = createMockNodes('ECHO_CHAMBER');
    const analysis = analyzeDiscussion(nodes);
    const discussionType = classifyDiscussion(analysis);
    const decision = applyDecisionRules(analysis, discussionType);

    console.log(`   分析結果: ${JSON.stringify(analysis.raw)}`);
    console.log(`   討論類型: ${discussionType}`);
    console.log(`   決策: ${decision.action} - ${decision.role || 'N/A'}`);

    assert(discussionType === 'ECHO_CHAMBER', `Expected ECHO_CHAMBER, got ${discussionType}`);
    assert(decision.action === 'TRIGGER', 'Should trigger intervention');
    assert(decision.role === 'DEVIL', `Expected DEVIL, got ${decision.role}`);
});

// ----------------------------------------------------------------------------
// Test 3: 資訊過載檢測
// ----------------------------------------------------------------------------
runTest('Test 3: 資訊過載應觸發 Synthesizer', () => {
    const nodes = createMockNodes('OVERLOAD');
    const analysis = analyzeDiscussion(nodes);
    const discussionType = classifyDiscussion(analysis);
    const decision = applyDecisionRules(analysis, discussionType);

    console.log(`   分析結果: ${JSON.stringify(analysis.raw)}`);
    console.log(`   討論類型: ${discussionType}`);
    console.log(`   決策: ${decision.action} - ${decision.role || 'N/A'}`);

    assert(discussionType === 'OVERLOAD', `Expected OVERLOAD, got ${discussionType}`);
    assert(decision.action === 'TRIGGER', 'Should trigger intervention');
    assert(decision.role === 'SYNTHESIZER', `Expected SYNTHESIZER, got ${decision.role}`);
});

// ----------------------------------------------------------------------------
// Test 4: 健康討論（不介入）
// ----------------------------------------------------------------------------
runTest('Test 4: 健康討論應保持靜默', () => {
    const nodes = createMockNodes('HEALTHY');
    const analysis = analyzeDiscussion(nodes);
    const discussionType = classifyDiscussion(analysis);
    const decision = applyDecisionRules(analysis, discussionType);

    console.log(`   分析結果: ${JSON.stringify(analysis.raw)}`);
    console.log(`   討論類型: ${discussionType}`);
    console.log(`   決策: ${decision.action}`);

    assert(discussionType === 'HEALTHY', `Expected HEALTHY, got ${discussionType}`);
    assert(decision.action === 'WAIT', `Should wait, got ${decision.action}`);
});

// ----------------------------------------------------------------------------
// Test 5: 冷卻機制驗證
// ----------------------------------------------------------------------------
runTest('Test 5: 冷卻機制基本功能', () => {
    const cooldown = getCooldownManager();
    const testIdeaWallId = 9999;

    // 重置狀態
    cooldown.reset(testIdeaWallId);

    // 第一次應該允許介入
    assert(cooldown.canIntervene(testIdeaWallId, 10), 'First intervention should be allowed');

    // 記錄介入
    cooldown.recordIntervention(testIdeaWallId, 10);

    // 立即檢查應該被拒絕（時間未到，貼文數也未到）
    assert(!cooldown.canIntervene(testIdeaWallId, 11), 'Should be in cooldown immediately after');

    // 貼文數達標應該允許
    assert(cooldown.canIntervene(testIdeaWallId, 10 + MIN_NEW_POSTS), `Should allow after ${MIN_NEW_POSTS} new posts`);

    console.log(`   冷卻設定: ${COOLDOWN_MINUTES}分鐘 或 ${MIN_NEW_POSTS}篇新貼文`);
});

// ----------------------------------------------------------------------------
// Test 6: 空討論處理
// ----------------------------------------------------------------------------
runTest('Test 6: 空討論應正確處理', () => {
    const nodes = [];
    const analysis = analyzeDiscussion(nodes);

    assert(analysis.depth === 0, 'Empty discussion should have 0 depth');
    assert(analysis.raw.nodeCount === 0, 'Node count should be 0');
    assert(analysis.summary === '無討論內容', 'Should have correct summary');
});

console.log('\n✅ 所有測試完成！\n');

// ============================================================================
// 統計報告
// ============================================================================
console.log('📊 Cooldown Manager 統計:');
const stats = getCooldownManager().getStats();
console.log(`   追蹤的討論串: ${stats.totalTracked}`);
console.log(`   冷卻時間: ${stats.config.cooldownMinutes} 分鐘`);
console.log(`   最少新貼文: ${stats.config.minNewPosts} 篇`);
console.log('');
