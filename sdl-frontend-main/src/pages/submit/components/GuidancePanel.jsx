import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { getGuidedQuestions } from '../config/guidedQuestionsConfig';

/**
 * 引導提示側邊欄
 * 桌面版：顯示在表單旁邊
 * 移動版：浮動按鈕 + 抽屜式面板
 */
export default function GuidancePanel({ stageKey }) {
  const questions = getGuidedQuestions(stageKey);
  const [expandedId, setExpandedId] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // 如果沒有引導問題，不顯示
  if (!questions || questions.length === 0) {
    return null;
  }

  // 分離必填和選填問題
  const requiredQuestions = questions.filter(q => q.required);
  const optionalQuestions = questions.filter(q => !q.required);

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // 桌面版收合按鈕
  if (isCollapsed) {
    return (
      <div className="fixed right-4 top-1/2 -translate-y-1/2 z-50 hidden lg:block">
        <button
          onClick={() => setIsCollapsed(false)}
          className="bg-customgreen text-white p-3 rounded-full shadow-lg hover:bg-customgreen/90 transition-all"
          title="展開寫作提示"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </button>
      </div>
    );
  }

  // 渲染提示內容的函數（桌面版和移動版共用）
  const renderContent = () => (
    <>
      {/* 必填問題區 */}
      {requiredQuestions.length > 0 && (
        <div className="mb-4">
          <p className="text-caption font-medium text-customgreen mb-2 flex items-center gap-1">
            <span className="w-2 h-2 bg-customgreen rounded-full"></span>
            建議包含的內容
          </p>
          {requiredQuestions.map((q) => (
            <div key={q.id} className="mb-2">
              <button
                onClick={() => toggleExpand(q.id)}
                className="w-full text-left p-3 bg-white rounded-lg border border-gray-100 
                           hover:border-customgreen/30 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between">
                  <span className="text-body-sm font-medium text-gray-700">
                    {q.fieldName}
                  </span>
                  <svg 
                    className={`w-4 h-4 text-gray-400 transition-transform ${expandedId === q.id ? 'rotate-180' : ''}`} 
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                {expandedId === q.id && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <p className="text-caption text-gray-600 mb-2">
                      {q.question}
                    </p>
                    <p className="text-caption text-customgreen/80 bg-customgreen/5 p-2 rounded">
                      💡 {q.hint}
                    </p>
                  </div>
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 反思提示區（引導到反思日誌） */}
      {optionalQuestions.length > 0 && (
        <div>
          <p className="text-caption font-medium text-purple-600 mb-2 flex items-center gap-1">
            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
            💭 延伸思考（記錄在反思日誌）
          </p>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-2">
            <p className="text-caption text-purple-700 mb-2">
              💡 這些問題可以幫助你深入思考，建議在<strong>「個人反思日誌」</strong>中記錄！
            </p>
            <p className="text-caption text-purple-600">
              📝 反思日誌位置：專案頁面 → 個人反思日誌
            </p>
          </div>
          {optionalQuestions.map((q) => (
            <div key={q.id} className="mb-2">
              <button
                onClick={() => toggleExpand(q.id)}
                className="w-full text-left p-3 bg-white rounded-lg border border-purple-100 
                           hover:border-purple-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between">
                  <span className="text-body-sm font-medium text-gray-700">
                    {q.fieldName}
                  </span>
                  <svg 
                    className={`w-4 h-4 text-gray-400 transition-transform ${expandedId === q.id ? 'rotate-180' : ''}`} 
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                {expandedId === q.id && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <p className="text-caption text-gray-600 mb-2">
                      {q.question}
                    </p>
                    <p className="text-caption text-purple-600/80 bg-purple-50 p-2 rounded">
                      💡 {q.hint}
                    </p>
                  </div>
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 範例連結 */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-caption text-gray-400 text-center">
          📖 不知道怎麼寫？點擊上方項目查看提示
        </p>
      </div>
    </>
  );

  return (
    <>
      {/* 桌面版側邊欄 (lg+) */}
      <div className="w-full lg:w-80 bg-gradient-to-b from-customgreen/5 to-white border-2 border-gray-200
                      rounded-lg shadow-lg flex-shrink-0 hidden lg:flex lg:flex-col min-h-0">
        <div className="p-4 bg-white/95 backdrop-blur border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-body-lg text-gray-800 flex items-center gap-2">
              💡 寫作提示
            </h3>
            <button
              onClick={() => setIsCollapsed(true)}
              className="text-gray-400 hover:text-gray-600 p-1"
              title="收合"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-caption text-gray-500 mt-1">
            參考這些提示，讓你的內容更完整
          </p>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto flex-1 min-h-0">
          {renderContent()}
        </div>
      </div>

      {/* 移動版浮動按鈕 (< lg) */}
      <button
        onClick={() => setIsMobileDrawerOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 z-40 bg-customgreen text-white p-4 rounded-full shadow-lg hover:bg-customgreen/90 transition-all hover:scale-110"
        title="查看寫作提示"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-400 rounded-full animate-pulse"></span>
      </button>

      {/* 移動版抽屜面板 (< lg) */}
      {isMobileDrawerOpen && (
        <>
          {/* 背景遮罩 */}
          <div 
            className="lg:hidden fixed inset-0 bg-black/50 z-50 transition-opacity duration-normal"
            onClick={() => setIsMobileDrawerOpen(false)}
          />
          
          {/* 抽屜內容 */}
          <div className="lg:hidden fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[80vh] flex flex-col animate-slide-up">
            {/* 拖拽指示條 */}
            <div className="flex justify-center py-2 border-b border-gray-100">
              <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
            </div>

            {/* 標題區 */}
            <div className="p-4 border-b border-gray-100 flex-shrink-0 bg-gradient-to-b from-customgreen/5 to-white">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-body-lg text-gray-800 flex items-center gap-2">
                  💡 寫作提示
                </h3>
                <button
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-caption text-gray-500 mt-1">
                參考這些提示，讓你的內容更完整
              </p>
            </div>

            {/* 內容區 */}
            <div className="p-4 space-y-3 overflow-y-auto flex-1">
              {renderContent()}
            </div>
          </div>
        </>
      )}
    </>
  );
}

GuidancePanel.propTypes = {
  stageKey: PropTypes.string.isRequired
};
