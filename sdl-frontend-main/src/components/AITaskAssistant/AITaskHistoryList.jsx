import React from 'react';
import { FiClock, FiChevronRight, FiInbox } from 'react-icons/fi';
import { formatTime } from '../../utils/timeUtils';

const HELP_TYPE_CONFIG = {
  adaptive: { label: '適應性', color: 'bg-green-100 text-green-700' },
  expedient: { label: '效率型', color: 'bg-orange-100 text-orange-700' },
  mixed: { label: '混合型', color: 'bg-blue-100 text-blue-700' },
};

const STATE_LABELS = {
  not_started: '還沒開始思考',
  thought_unclear: '想過但不確定',
  initial_idea: '有初步想法',
  specific_problem: '遇到具體問題',
  asked_peers: '已問過同學/老師',
};

/**
 * AITaskHistoryList — 歷史紀錄列表元件
 *
 * @param {Array}    history       - 歷史紀錄陣列
 * @param {Function} onSelectEntry - 點擊某筆紀錄的 callback
 * @param {boolean}  isLoading     - 載入狀態
 */
const AITaskHistoryList = ({ history = [], onSelectEntry, isLoading }) => {
  /* ---------- Loading ---------- */
  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-customgreen mx-auto" />
        <p className="text-body-sm text-gray-500 mt-2">載入歷史記錄中...</p>
      </div>
    );
  }

  /* ---------- Empty ---------- */
  if (history.length === 0) {
    return (
      <div className="text-center py-12">
        <FiInbox className="mx-auto mb-3 text-gray-300" size={40} />
        <p className="text-body text-gray-500 font-medium">尚無求助記錄</p>
        <p className="text-body-sm text-gray-400 mt-1">
          使用 AI 求助引導後，歷史記錄會顯示在這裡
        </p>
      </div>
    );
  }

  /* ---------- List ---------- */
  return (
    <div>
      <div className="flex items-center gap-2 mb-stack-md">
        <FiClock className="text-gray-500" />
        <h3 className="text-body-lg font-bold text-gray-800">
          求助歷史記錄
        </h3>
        <span className="text-caption text-gray-400">（共 {history.length} 筆）</span>
      </div>

      <div className="space-y-stack-xs max-h-[55vh] overflow-y-auto pr-1">
        {history.map((entry) => {
          const typeConfig = HELP_TYPE_CONFIG[entry.helpSeekingType] || HELP_TYPE_CONFIG.mixed;

          return (
            <button
              key={entry.id}
              onClick={() => onSelectEntry(entry)}
              className="w-full text-left bg-gray-50 hover:bg-gray-100 rounded-lg
                         p-component-sm border border-gray-200 hover:border-customgreen/40
                         transition-all duration-fast group"
            >
              <div className="flex items-center gap-3">
                {/* 使用者首字母圈 */}
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-customgreen
                                flex items-center justify-center text-white font-bold text-body-sm">
                  {(entry.username || '?').charAt(0).toUpperCase()}
                </div>

                {/* 資訊區 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-body-sm font-medium text-gray-800 truncate">
                      {entry.username}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-caption font-medium ${typeConfig.color}`}>
                      {typeConfig.label}
                    </span>
                  </div>

                  <p className="text-caption text-gray-500 mt-0.5">
                    {STATE_LABELS[entry.metacognitiveState] || entry.metacognitiveState}
                    {' · '}
                    {formatTime(entry.createdAt, 'relative')}
                  </p>
                </div>

                {/* 箭頭 */}
                <FiChevronRight className="flex-shrink-0 text-gray-300 group-hover:text-customgreen transition-colors" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AITaskHistoryList;
