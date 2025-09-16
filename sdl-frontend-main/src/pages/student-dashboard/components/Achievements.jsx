import React, { useState } from 'react';
import { FaTrophy, FaLightbulb, FaTasks, FaBookOpen, FaRobot, FaComments } from 'react-icons/fa';

/**
 * 成就展示組件
 * @param {array} achievements - 成就數據
 * @returns {JSX.Element} 成就列表
 */
const levelStyles = {
  none: {
    badge: 'bg-gray-100 text-gray-600 border border-gray-200',
    bar: 'bg-gray-200',
  },
  bronze: {
    badge: 'bg-amber-100 text-amber-800 border border-amber-200',
    bar: 'bg-amber-400',
  },
  silver: {
    badge: 'bg-slate-100 text-slate-700 border border-slate-200',
    bar: 'bg-slate-400',
  },
  gold: {
    badge: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    bar: 'bg-yellow-400',
  },
};

const typeIcon = (type) => {
  switch (type) {
    case 'idea':
      return <FaLightbulb className="text-yellow-500" />;
    case 'task':
      return <FaTasks className="text-green-600" />;
    case 'reflection':
      return <FaBookOpen className="text-blue-600" />;
    case 'ai':
      return <FaRobot className="text-purple-600" />;
    case 'peer_review':
      return <FaComments className="text-teal-600" />;
    default:
      return <FaTrophy className="text-yellow-500" />;
  }
};

const levelLabel = (level) => {
  if (level === 'gold') return '金級';
  if (level === 'silver') return '銀級';
  if (level === 'bronze') return '銅級';
  return '未達成';
};

const Achievements = ({ achievements }) => {
  const [mode, setMode] = useState('team'); // 'team' | 'personal'

  const list = Array.isArray(achievements?.[mode]) ? achievements[mode] : [];

  if (!achievements || (list.length === 0 && (!achievements.team || !achievements.personal))) {
    return (
      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-lg">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
          <FaTrophy className="text-yellow-500 mr-3" />
          近期成就
        </h3>
        <p className="text-sm text-gray-500 text-center py-4">暫無新成就，繼續努力吧！</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-3 sm:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800 flex items-center">
          <span className="w-1 h-6 bg-gradient-to-b from-customgreen to-teal-600 rounded-full mr-3"></span>
          <FaTrophy className="text-yellow-500 mr-2" />
          近期成就
        </h2>
        {/* Toggle */}
        <div className="flex items-center bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg p-1 text-xs shadow-inner">
          <button
            className={`px-3 py-1 rounded transition-all duration-200 ${mode === 'team' ? 'bg-gradient-to-r from-customgreen to-teal-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
            onClick={() => setMode('team')}
          >
            團隊
          </button>
          <button
            className={`px-3 py-1 rounded transition-all duration-200 ${mode === 'personal' ? 'bg-gradient-to-r from-customgreen to-teal-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
            onClick={() => setMode('personal')}
          >
            個人
          </button>
        </div>
      </div>
      <div className="space-y-3 max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-customgreen scrollbar-track-gray-100">
        {list.map((a) => {
          const style = levelStyles[a.level] || levelStyles.none;
          const totalForGold = a?.thresholds?.gold || 1;
          const nextTip = a.nextLevel
            ? `距離${levelLabel(a.nextLevel)}還差 ${Math.max(0, (a.nextTarget || 0) - (a.current || 0))}`
            : '已達最高等級';
          return (
            <div key={a.key} className="p-3 rounded-lg border border-teal-100 bg-gradient-to-r from-teal-50/50 to-gray-50 hover:border-teal-200 transition-colors duration-300">
              <div className="flex items-start gap-3">
                <div className="text-xl sm:text-2xl flex-shrink-0">{typeIcon(a.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-800 text-sm sm:text-base">{a.title}</h3>
                    <span className={`px-2 py-0.5 text-[10px] sm:text-xs rounded ${style.badge}`}>{levelLabel(a.level)}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{a.description}</p>
                  {/* 進度條 */}
                  <div className="mt-2">
                    <div className="w-full h-2 bg-gray-200 rounded">
                      <div
                        className={`h-2 rounded ${style.bar}`}
                        style={{ width: `${Math.min(100, a.progressPercent || 0)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] sm:text-xs text-gray-500 mt-1">
                      <span>{a.current} / {totalForGold}</span>
                      <span>{nextTip}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {list.length === 0 && (
          <div className="text-xs text-gray-500 text-center py-4">此分類暫無成就，持續努力加油！</div>
        )}
      </div>
    </div>
  );
};

export default Achievements;
