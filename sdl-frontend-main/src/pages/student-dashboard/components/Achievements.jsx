import React from 'react';
import { FaLightbulb, FaTasks, FaBookOpen, FaRobot, FaTrophy } from 'react-icons/fa';

const TYPE_CONFIG = {
  idea:       { icon: <FaLightbulb className="text-yellow-500" />, label: '想法創造者' },
  task:       { icon: <FaTasks className="text-green-600" />,      label: '任務執行家' },
  reflection: { icon: <FaBookOpen className="text-blue-600" />,    label: '深度反思者' },
  ai:         { icon: <FaRobot className="text-purple-600" />,     label: 'AI 探險家' },
};

const MILESTONE_CONFIG = [
  { key: 'bronze', label: '銅', color: 'bg-amber-700',  ring: 'ring-amber-500',  text: 'text-amber-700',  dotText: 'text-white'     },
  { key: 'silver', label: '銀', color: 'bg-slate-300',  ring: 'ring-slate-200',  text: 'text-slate-500',  dotText: 'text-slate-700' },
  { key: 'gold',   label: '金', color: 'bg-yellow-400', ring: 'ring-yellow-300', text: 'text-yellow-600', dotText: 'text-yellow-900' },
];

const MilestoneDots = ({ thresholds, current }) => (
  <div className="flex items-center gap-2">
    {MILESTONE_CONFIG.map(({ key, label, color, ring, text, dotText }, i) => {
      const reached = current >= thresholds[key];
      return (
        <React.Fragment key={key}>
          {i > 0 && (
            <div className={`flex-1 h-0.5 ${reached ? color : 'bg-gray-200'}`} />
          )}
          <div className="flex flex-col items-center gap-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-caption font-bold transition-all duration-300
                ${reached
                  ? `${color} ring-2 ${ring} ${dotText} shadow-sm`
                  : 'bg-gray-100 text-gray-400 border border-gray-200'
                }`}
            >
              {label}
            </div>
            <span className={`text-[10px] ${reached ? text : 'text-gray-400'}`}>
              {thresholds[key]}
            </span>
          </div>
        </React.Fragment>
      );
    })}
  </div>
);

const AchievementCard = ({ achievement }) => {
  const { type, title, current, thresholds, nextLevel, nextTarget, level } = achievement;
  const config = TYPE_CONFIG[type] || { icon: <FaTrophy className="text-yellow-500" />, label: title };

  const nextTip = nextLevel
    ? `距離${nextLevel === 'bronze' ? '銅' : nextLevel === 'silver' ? '銀' : '金'}級還差 ${Math.max(0, nextTarget - current)}`
    : '已達最高等級';

  const barPercent = Math.min(100, Math.round((current / thresholds.gold) * 100));

  return (
    <div className="p-3 rounded-xl border border-gray-100 bg-gradient-to-r from-gray-50 to-white hover:border-teal-100 transition-colors duration-200">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{config.icon}</span>
        <span className="font-medium text-body-sm text-gray-800">{title}</span>
        {level === 'gold' && (
          <span className="ml-auto px-2 py-0.5 text-[10px] rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200">
            最高等級
          </span>
        )}
      </div>

      <MilestoneDots thresholds={thresholds} current={current} />

      <div className="mt-3">
        <div className="w-full h-1.5 bg-gray-100 rounded-full">
          <div
            className="h-1.5 rounded-full bg-gradient-to-r from-customgreen to-teal-500 transition-all duration-500"
            style={{ width: `${barPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-gray-500 mt-1">
          <span>目前：{current}</span>
          <span>{nextTip}</span>
        </div>
      </div>
    </div>
  );
};

const Achievements = ({ achievements }) => {
  const list = Array.isArray(achievements) ? achievements : [];

  return (
    <div className="bg-white p-component-sm sm:p-component-md-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
      <h2 className="text-body-lg sm:text-h3 font-semibold text-gray-800 flex items-center mb-4">
        <span className="w-1 h-6 bg-gradient-to-b from-customgreen to-teal-600 rounded-full mr-3" />
        <FaTrophy className="text-yellow-500 mr-2" />
        我的成就旅程
      </h2>

      {list.length === 0 ? (
        <p className="text-body-sm text-gray-500 text-center py-6">
          開始參與專案，解鎖你的第一個成就！
        </p>
      ) : (
        <div className="space-y-3">
          {list.map(a => <AchievementCard key={a.key} achievement={a} />)}
        </div>
      )}
    </div>
  );
};

export default Achievements;
