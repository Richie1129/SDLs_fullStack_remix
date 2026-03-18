import React from 'react';
import { FiCpu, FiAlertTriangle, FiInfo, FiTool, FiCheckCircle } from 'react-icons/fi';
import AssistantChatStreaming from '../components/AssistantChatStreaming';

/**
 * 專案助理示範頁面
 *
 * 使用方式：
 * 1. 在路由中加入此頁面
 * 2. 傳入 projectId
 * 3. 就可以開始使用了！
 */
export default function AssistantDemo() {
  // 方式 1：從 URL 參數取得 projectId
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = parseInt(urlParams.get('projectId')) || null;

  // 方式 2：從 localStorage 取得當前專案 ID（如果你有儲存）
  // const projectId = parseInt(localStorage.getItem('currentProjectId')) || null;

  return (
    <div className="min-h-screen bg-gray-50 p-component-lg">
      <div className="max-w-6xl mx-auto">
        {/* 頁面標題 */}
        <div className="mb-8">
          <h1 className="text-h1 font-bold text-gray-900 mb-2">
            <FiCpu className="w-7 h-7 inline mr-2" /> 專案助理 AI
          </h1>
          <p className="text-gray-600">
            詢問我關於專案的任何問題，我會即時回答（支援 Streaming）
          </p>
        </div>

        {/* 如果沒有 projectId，顯示提示 */}
        {!projectId ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-component-md-lg">
            <h2 className="text-body-lg font-semibold text-yellow-900 mb-2">
              <FiAlertTriangle className="w-5 h-5 inline mr-1" /> 缺少專案 ID
            </h2>
            <p className="text-yellow-800 mb-4">
              請在 URL 中提供專案 ID，例如：
            </p>
            <code className="block bg-yellow-100 px-4 py-2 rounded text-body-sm">
              /assistant-demo?projectId=123
            </code>

            {/* 快速測試連結（示範用） */}
            <div className="mt-4">
              <p className="text-body-sm text-yellow-700 mb-2">快速測試：</p>
              <a
                href="/assistant-demo?projectId=1"
                className="inline-block px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
              >
                使用範例專案 ID = 1
              </a>
            </div>
          </div>
        ) : (
          /* 聊天介面 */
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <AssistantChatStreaming
              projectId={projectId}
              provider="gemini"  // 預設使用 Gemini
              embedded={false}   // 完整模式（有標題列）
            />
          </div>
        )}

        {/* 使用說明 */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-component-md-lg">
          <h2 className="text-body-lg font-semibold text-blue-900 mb-3">
            <FiInfo className="w-5 h-5 inline mr-1" /> 使用提示
          </h2>
          <div className="space-y-stack-xs text-blue-800 text-body-sm">
            <div>• 詢問專案進度：「我的專案目前進度如何？」</div>
            <div>• 查看任務狀態：「看板上有哪些任務待處理？」</div>
            <div>• 檢視想法牆：「想法牆裡有什麼重要的想法？」</div>
            <div>• 查看提交記錄：「最近有什麼提交記錄？」</div>
            <div>• 尋求建議：「我下一步應該做什麼？」</div>
          </div>
        </div>

        {/* 技術說明 */}
        <div className="mt-8 bg-gray-100 rounded-lg p-component-md-lg">
          <h2 className="text-body-lg font-semibold text-gray-900 mb-3">
            <FiTool className="w-5 h-5 inline mr-1" /> 技術特點
          </h2>
          <div className="grid md:grid-cols-2 gap-stack-sm text-body-sm text-gray-700">
            <div>
              <strong><FiCheckCircle className="w-4 h-4 inline mr-1 text-green-500" />Streaming 回應</strong>
              <p className="text-gray-600">AI 會逐字回答，不用等待</p>
            </div>
            <div>
              <strong><FiCheckCircle className="w-4 h-4 inline mr-1 text-green-500" />完整專案分析</strong>
              <p className="text-gray-600">自動分析看板、想法牆、提交記錄</p>
            </div>
            <div>
              <strong><FiCheckCircle className="w-4 h-4 inline mr-1 text-green-500" />AI 支援</strong>
              <p className="text-gray-600">Gemini 驅動</p>
            </div>
            <div>
              <strong><FiCheckCircle className="w-4 h-4 inline mr-1 text-green-500" />Markdown 支援</strong>
              <p className="text-gray-600">回答支援格式化文字</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
