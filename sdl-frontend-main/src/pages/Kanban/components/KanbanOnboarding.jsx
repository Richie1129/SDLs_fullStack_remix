import React, { useState } from 'react';
import { FiLayout, FiCheckSquare, FiGrid, FiHelpCircle, FiX } from 'react-icons/fi';

const STEPS = [
  {
    Icon: FiLayout,
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-50',
    title: '認識看板',
    description: '這個看板是你們團隊的工作清單。每個「欄位」代表工作狀態——任務從左邊開始，完成後拖移到右邊的欄位。',
    tip: '欄位的名稱由你們自己決定，也可以用「文獻探討」、「設計問卷」等探究階段來命名。'
  },
  {
    Icon: FiCheckSquare,
    iconColor: 'text-customgreen',
    iconBg: 'bg-green-50',
    title: '卡片 = 一件具體要做的事',
    description: '把這個探究階段要完成的工作，分成一張一張的卡片。越具體越好——「搜尋 3 篇睡眠相關文獻」比「查資料」更容易執行，也更清楚什麼時候算完成。',
    tip: '不知道要開幾張卡？先想：「這個階段結束時，我們手上會有什麼東西？」再往回拆任務。'
  },
  {
    Icon: FiGrid,
    iconColor: 'text-purple-500',
    iconBg: 'bg-purple-50',
    title: '不知道要做什麼？載入範例任務',
    description: '按「從範例新增」→ 選擇你們現在的探究階段 → 確認欄位後，可以選擇載入這個階段的建議任務清單。範例任務可以自由修改或刪除，只是讓你有個起點。',
    tip: '社會組同學特別推薦先看範例任務，了解這個階段「科學探究」具體要做哪些事。'
  },
  {
    Icon: FiHelpCircle,
    iconColor: 'text-orange-500',
    iconBg: 'bg-orange-50',
    title: '卡住了？按求助按鈕',
    description: '每張卡片右上角有一個求助按鈕。點擊後先告訴 AI 你現在的狀態，它會給你思考方向——但不會直接給答案。研究過程中的掙扎，才是學習真正發生的地方。',
    tip: '已經問過同學或老師了嗎？先向真人求助，再用 AI 輔助，效果更好。'
  }
];

export default function KanbanOnboarding({ onClose, projectId }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const Icon = current.Icon;
  const isLast = step === STEPS.length - 1;

  const handleDone = () => {
    localStorage.setItem(`kanban_onboarded_${projectId}`, 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">

        {/* 步驟指示器 + 關閉 */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <div className="flex gap-1.5 items-center">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step
                    ? 'w-6 bg-customgreen'
                    : i < step
                    ? 'w-1.5 bg-customgreen/40'
                    : 'w-1.5 bg-gray-200'
                }`}
              />
            ))}
          </div>
          <button
            onClick={handleDone}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-fast p-1 rounded-lg hover:bg-gray-100"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* 內容 */}
        <div className="px-6 py-4">
          <div className={`w-14 h-14 rounded-2xl ${current.iconBg} flex items-center justify-center mb-4`}>
            <Icon size={28} className={current.iconColor} />
          </div>

          <h2 className="text-h2 font-bold text-gray-800 mb-3">
            {current.title}
          </h2>

          <p className="text-body text-gray-600 leading-7 mb-4">
            {current.description}
          </p>

          <div className="bg-amber-50 border-l-4 border-amber-400 px-4 py-3 rounded-r-lg">
            <p className="text-body-sm text-amber-800 leading-6">
              {current.tip}
            </p>
          </div>
        </div>

        {/* 底部操作 */}
        <div className="px-6 pb-6 flex justify-between items-center">
          <button
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
            className="px-btn-x py-btn-y text-body-sm text-gray-500 hover:text-gray-700 transition-colors duration-fast disabled:opacity-0"
          >
            上一步
          </button>

          <span className="text-caption text-gray-400">
            {step + 1} / {STEPS.length}
          </span>

          {isLast ? (
            <button
              onClick={handleDone}
              className="px-btn-x-lg py-btn-y bg-customgreen text-white text-body-sm font-medium rounded-lg hover:bg-customgreen/90 transition-colors duration-fast"
            >
              開始使用
            </button>
          ) : (
            <button
              onClick={() => setStep(s => s + 1)}
              className="px-btn-x-lg py-btn-y bg-customgreen text-white text-body-sm font-medium rounded-lg hover:bg-customgreen/90 transition-colors duration-fast"
            >
              下一步
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
