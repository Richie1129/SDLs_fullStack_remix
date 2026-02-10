import React from 'react';
import {
  FiArrowLeft,
  FiHelpCircle,
  FiInfo,
  FiUsers,
  FiClock,
  FiUser,
} from 'react-icons/fi';
import { formatTime } from '../../utils/timeUtils';

const HELP_TYPE_CONFIG = {
  adaptive: { label: '適應性求助', color: 'bg-green-100 text-green-700' },
  expedient: { label: '效率型求助', color: 'bg-orange-100 text-orange-700' },
  mixed: { label: '混合型', color: 'bg-blue-100 text-blue-700' },
};

const STATE_LABELS = {
  not_started: '還沒開始思考這個問題',
  thought_unclear: '想過但不確定方向',
  initial_idea: '有初步想法，想確認可行性',
  specific_problem: '遇到具體的問題或障礙',
  asked_peers: '已問過同學/老師，想要第二意見',
};

/**
 * AITaskHistoryDetail — 單筆歷史紀錄詳細檢視
 *
 * @param {Object}   entry  - 歷史紀錄物件
 * @param {Function} onBack - 返回列表
 */
const AITaskHistoryDetail = ({ entry, onBack }) => {
  if (!entry) return null;

  const typeConfig = HELP_TYPE_CONFIG[entry.helpSeekingType] || HELP_TYPE_CONFIG.mixed;
  const suggestions = entry.suggestions;

  return (
    <div className="max-h-[70vh] overflow-y-auto">
      {/* 返回按鈕 */}
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-body-sm text-gray-500
                   hover:text-customgreen transition-colors duration-fast mb-stack-sm"
      >
        <FiArrowLeft size={14} />
        返回列表
      </button>

      {/* ===== Metadata 資訊卡 ===== */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-component-md mb-stack-md">
        <div className="flex items-center gap-3 mb-stack-sm">
          {/* 使用者首字母圈 */}
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-customgreen
                          flex items-center justify-center text-white font-bold text-body">
            {(entry.username || '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-body font-bold text-gray-800">{entry.username}</p>
            <p className="text-caption text-gray-500 flex items-center gap-1">
              <FiClock size={12} />
              {formatTime(entry.createdAt, 'full')}
              {' · '}
              {formatTime(entry.createdAt, 'relative')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-body-sm">
          <div>
            <span className="text-gray-500">元認知狀態</span>
            <p className="font-medium text-gray-800 mt-0.5">
              {STATE_LABELS[entry.metacognitiveState] || entry.metacognitiveState}
            </p>
          </div>
          <div>
            <span className="text-gray-500">求助類型</span>
            <p className="mt-0.5">
              <span className={`px-2 py-0.5 rounded-full text-caption font-medium ${typeConfig.color}`}>
                {typeConfig.label}
              </span>
            </p>
          </div>
          <div>
            <span className="text-gray-500">求助對象</span>
            <p className="font-medium text-gray-800 mt-0.5">
              {entry.askedSources && entry.askedSources.length > 0
                ? entry.askedSources.join('、')
                : '無'}
            </p>
          </div>
          <div>
            <span className="text-gray-500">跳過思考</span>
            <p className="font-medium text-gray-800 mt-0.5">
              {entry.skippedThinking ? '是' : '否'}
            </p>
          </div>
        </div>
      </div>

      {/* ===== AI Suggestions ===== */}
      {suggestions ? (
        <div className="space-y-stack-md">
          {/* Summary */}
          {suggestions.summary && (
            <div className="bg-blue-50 border-l-4 border-blue-500 p-component-md rounded-r-lg">
              <div className="flex items-start gap-3">
                <FiInfo className="text-blue-600 text-h3 flex-shrink-0 mt-1" />
                <p className="text-body text-gray-700">{suggestions.summary}</p>
              </div>
            </div>
          )}

          {/* Thinking Directions */}
          {suggestions.thinkingDirections && suggestions.thinkingDirections.length > 0 && (
            <div className="bg-white border border-green-200 rounded-lg overflow-hidden">
              <div className="bg-customgreen/10 px-component-md py-component-sm border-b border-green-200">
                <h3 className="text-body-lg font-bold text-gray-800 flex items-center gap-2">
                  <FiHelpCircle className="text-customgreen" />
                  思考方向（不是答案）
                </h3>
              </div>

              <div className="p-component-md space-y-stack-sm">
                {suggestions.thinkingDirections.map((direction, index) => (
                  <div key={index} className="flex items-start gap-3 pb-stack-sm border-b border-gray-100 last:border-0">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100
                                    flex items-center justify-center text-caption font-bold text-green-700">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-body font-medium text-gray-800 mb-1">
                        {direction.title}
                      </p>
                      <p className="text-body-sm text-gray-600">
                        {direction.description}
                      </p>
                      {direction.reasoning && (
                        <details className="mt-2">
                          <summary className="text-body-sm text-blue-600 cursor-pointer hover:text-blue-800">
                            為什麼這樣建議？
                          </summary>
                          <p className="mt-2 text-body-sm text-gray-600 pl-4 border-l-2 border-blue-200">
                            {direction.reasoning}
                          </p>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Human Help Suggestions */}
          {suggestions.humanHelpSuggestions && suggestions.humanHelpSuggestions.length > 0 && (
            <div className="bg-orange-50 border-l-4 border-orange-500 p-component-md rounded-r-lg">
              <div className="flex items-start gap-3">
                <FiUsers className="text-orange-600 text-h3 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <p className="text-body font-bold text-gray-800 mb-2">
                    建議向真人求助
                  </p>
                  <div className="space-y-2">
                    {suggestions.humanHelpSuggestions.map((suggestion, index) => (
                      <div key={index} className="flex items-start gap-2 text-body-sm">
                        <span className="flex-shrink-0">✓</span>
                        <span className="text-gray-700">{suggestion}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Detailed Steps */}
          {suggestions.detailedSteps && suggestions.detailedSteps.length > 0 && (
            <details className="bg-yellow-50 border border-yellow-300 rounded-lg overflow-hidden">
              <summary className="px-component-md py-component-sm cursor-pointer
                                  hover:bg-yellow-100 transition-colors flex items-center justify-between">
                <span className="text-body font-medium text-gray-800">
                  <FiInfo className="inline mr-2 text-yellow-600" />
                  詳細步驟
                </span>
              </summary>

              <div className="p-component-md border-t border-yellow-300 space-y-stack-sm">
                {suggestions.detailedSteps.map((step, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-component-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100
                                      flex items-center justify-center text-body-sm font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-body font-medium text-gray-800 mb-1">
                          {step.title}
                        </p>
                        <p className="text-body-sm text-gray-600 mb-2">
                          {step.description}
                        </p>
                        {step.reasoning && (
                          <div className="bg-blue-50 rounded p-2 text-caption text-gray-700">
                            <strong>為什麼：</strong>{step.reasoning}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400">
          <FiInfo className="mx-auto mb-2" size={28} />
          <p className="text-body-sm">此筆記錄沒有儲存 AI 建議內容</p>
          <p className="text-caption mt-1">（可能是舊版本產生的記錄）</p>
        </div>
      )}
    </div>
  );
};

export default AITaskHistoryDetail;
