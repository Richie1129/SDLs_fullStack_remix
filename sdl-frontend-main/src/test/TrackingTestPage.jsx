import React, { useState } from 'react';
import { useTracking } from '../providers/TrackingProvider';
import { getCurrentUserId } from '../utils/authUtils';

/**
 * TrackingTestPage - 用於測試 TrackingProvider 功能
 * 
 * 測試項目:
 * 1. ✅ 基礎追蹤事件
 * 2. ✅ 批量發送 (20 個事件)
 * 3. ✅ 立即刷新
 * 4. ✅ 不同事件類型
 * 5. ✅ metadata 處理
 * 
 * 使用方式:
 * 1. 在路由中添加此頁面
 * 2. 登入後訪問
 * 3. 點擊測試按鈕
 * 4. 觀察 Console 日誌
 * 5. 檢查資料庫 audit_event 表
 */
function TrackingTestPage() {
  const { track, flush } = useTracking();
  const [log, setLog] = useState([]);
  const userId = getCurrentUserId();

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLog(prev => [...prev, { timestamp, message, type }]);
    console.log(`[TrackingTest] ${message}`);
  };

  // 測試 1: 單一事件
  const testSingleEvent = () => {
    track('TEST_SINGLE_EVENT', 'test', 1, { 
      testName: '單一事件測試',
      timestamp: new Date().toISOString()
    });
    addLog('✅ 發送單一事件: TEST_SINGLE_EVENT', 'success');
  };

  // 測試 2: 批量事件 (25 個，應觸發 2 次批量發送)
  const testBatchEvents = () => {
    addLog('📦 開始發送 25 個事件...', 'info');
    for (let i = 1; i <= 25; i++) {
      track(`TEST_BATCH_EVENT_${i}`, 'test', i, {
        batchNumber: i,
        testName: '批量事件測試'
      });
    }
    addLog('✅ 已排隊 25 個事件 (應觸發 2 次批量發送)', 'success');
  };

  // 測試 3: 立即刷新
  const testImmediateFlush = async () => {
    track('TEST_IMMEDIATE_FLUSH', 'test', 999, {
      testName: '立即刷新測試'
    });
    addLog('📤 發送事件並立即刷新...', 'info');
    await flush();
    addLog('✅ 立即刷新完成', 'success');
  };

  // 測試 4: 不同事件類型
  const testDifferentEventTypes = () => {
    const events = [
      { action: 'KANBAN_TASK_CLICK', targetType: 'task', targetId: 123 },
      { action: 'IDEAWALL_NODE_DRAG', targetType: 'node', targetId: 456 },
      { action: 'LOGIN_SUBMIT', targetType: 'user', targetId: userId },
      { action: 'PROJECT_VIEW', targetType: 'project', targetId: 789 },
      { action: 'FILE_DOWNLOAD', targetType: 'file', targetId: 'test.pdf' }
    ];

    events.forEach(e => {
      track(e.action, e.targetType, e.targetId, {
        testName: '不同事件類型測試',
        eventType: e.action
      });
    });

    addLog(`✅ 發送 ${events.length} 種不同類型事件`, 'success');
  };

  // 測試 5: 大型 metadata
  const testLargeMetadata = () => {
    const largeMetadata = {
      testName: '大型 Metadata 測試',
      longText: 'A'.repeat(1000), // 1KB 文字
      array: Array.from({ length: 100 }, (_, i) => ({ id: i, value: `item-${i}` })),
      nested: {
        level1: {
          level2: {
            level3: {
              data: 'deep nested data'
            }
          }
        }
      }
    };

    track('TEST_LARGE_METADATA', 'test', 888, largeMetadata);
    addLog('✅ 發送帶有大型 metadata 的事件', 'success');
  };

  // 測試 6: 無效事件 (缺少 action)
  const testInvalidEvent = () => {
    try {
      // @ts-ignore - 故意傳入無效參數
      track('', 'test', null);
      addLog('⚠️ 嘗試發送無效事件 (空 action)', 'warning');
    } catch (error) {
      addLog('❌ 發送無效事件失敗: ' + error.message, 'error');
    }
  };

  // 清空日誌
  const clearLog = () => {
    setLog([]);
  };

  return (
    <div className="p-component-md max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-component-md">
        {/* Header */}
        <div className="mb-stack-md">
          <h1 className="text-h1 font-serif mb-stack-sm">TrackingProvider 測試頁面</h1>
          <p className="text-body text-gray-600">
            測試 Phase 0 基礎設施功能。請監控瀏覽器 Console 和後端日誌。
          </p>
          <div className="mt-stack-sm p-component-sm bg-blue-50 rounded border border-blue-200">
            <p className="text-caption text-blue-800">
              <strong>當前使用者 ID:</strong> {userId || '未登入'} | 
              <strong> 批量大小:</strong> 20 事件 | 
              <strong> 刷新間隔:</strong> 5 秒
            </p>
          </div>
        </div>

        {/* Test Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-sm mb-stack-md">
          <button
            onClick={testSingleEvent}
            className="px-btn-x py-btn-y bg-customgreen text-white rounded hover:bg-customgreen/90 transition-colors duration-fast"
          >
            1️⃣ 測試單一事件
          </button>

          <button
            onClick={testBatchEvents}
            className="px-btn-x py-btn-y bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-fast"
          >
            2️⃣ 測試批量事件 (25 個)
          </button>

          <button
            onClick={testImmediateFlush}
            className="px-btn-x py-btn-y bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors duration-fast"
          >
            3️⃣ 測試立即刷新
          </button>

          <button
            onClick={testDifferentEventTypes}
            className="px-btn-x py-btn-y bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors duration-fast"
          >
            4️⃣ 測試不同事件類型
          </button>

          <button
            onClick={testLargeMetadata}
            className="px-btn-x py-btn-y bg-pink-500 text-white rounded hover:bg-pink-600 transition-colors duration-fast"
          >
            5️⃣ 測試大型 Metadata
          </button>

          <button
            onClick={testInvalidEvent}
            className="px-btn-x py-btn-y bg-red-500 text-white rounded hover:bg-red-600 transition-colors duration-fast"
          >
            6️⃣ 測試無效事件
          </button>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-stack-sm mb-stack-md">
          <button
            onClick={flush}
            className="px-btn-x py-btn-y bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors duration-fast"
          >
            🔄 立即刷新佇列
          </button>

          <button
            onClick={clearLog}
            className="px-btn-x py-btn-y bg-gray-400 text-white rounded hover:bg-gray-500 transition-colors duration-fast"
          >
            🗑️ 清空日誌
          </button>
        </div>

        {/* Log Display */}
        <div className="border rounded-lg p-component-sm bg-gray-50">
          <h2 className="text-h3 mb-stack-sm">測試日誌</h2>
          
          {log.length === 0 ? (
            <p className="text-caption text-gray-500 italic">尚無日誌，點擊上方按鈕開始測試...</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {log.map((entry, index) => (
                <div
                  key={index}
                  className={`p-2 rounded text-sm font-mono ${
                    entry.type === 'success' ? 'bg-green-100 text-green-800' :
                    entry.type === 'error' ? 'bg-red-100 text-red-800' :
                    entry.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}
                >
                  <span className="text-gray-600">[{entry.timestamp}]</span> {entry.message}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-stack-md p-component-sm bg-yellow-50 rounded border border-yellow-200">
          <h3 className="text-h4 mb-stack-xs text-yellow-900">驗證步驟:</h3>
          <ol className="list-decimal list-inside space-y-1 text-caption text-yellow-800">
            <li>開啟瀏覽器 Console (F12)</li>
            <li>依序點擊測試按鈕</li>
            <li>觀察 Console 中的 <code>[TrackingProvider]</code> 日誌</li>
            <li>檢查後端日誌 (應看到 "Batch audit events created")</li>
            <li>查詢資料庫: <code>SELECT * FROM audit_event WHERE source = 'client' ORDER BY timestamp DESC LIMIT 50;</code></li>
            <li>關閉分頁測試 sendBeacon (應在資料庫看到所有待發送事件)</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default TrackingTestPage;
