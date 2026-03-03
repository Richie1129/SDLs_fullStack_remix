import React, { useState } from 'react';
import { FiShare2, FiPlusCircle, FiLink, FiMessageCircle, FiX } from 'react-icons/fi';

const STEPS = [
  {
    Icon: FiShare2,
    iconColor: 'text-indigo-500',
    iconBg: 'bg-indigo-50',
    title: '認識想法牆',
    description: '想法牆是一個視覺化的共同思考空間——你們把每一個想法、問題、或發現寫成節點，再用連線串接起來，逐漸形成屬於這個探究的知識地圖。',
    tip: '不需要一開始就把想法整理好。先把腦海裡的東西丟出來，再慢慢連連看、找關係。'
  },
  {
    Icon: FiPlusCircle,
    iconColor: 'text-customgreen',
    iconBg: 'bg-green-50',
    title: '新增想法節點',
    description: '點擊畫面右下角的「+」按鈕，或在空白處按右鍵選「新增想法」。給節點一個清楚的標題，讓隊友一眼就能看懂你在說什麼。',
    tip: '一個節點只說一件事。與其寫「睡眠與健康有關聯」，不如分成兩個：「睡眠不足的症狀」和「影響健康的因素」——這樣連線起來更有意義。'
  },
  {
    Icon: FiLink,
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-50',
    title: '建立連線，看見關係',
    description: '點擊任一節點，可以選擇「連線」模式，然後再點另一個節點，就能把兩個想法串接在一起。連線越多，越能看出你們的探究脈絡。',
    tip: '試著問自己：「這兩個節點之間有什麼關係？」如果說得出來，就值得連一條線。連線的方向也有意義——從原因指向結果，從問題指向發現。'
  },
  {
    Icon: FiMessageCircle,
    iconColor: 'text-orange-500',
    iconBg: 'bg-orange-50',
    title: 'KB 教練 & 討論室',
    description: '每個節點都有「KB 教練」——遇到卡關可以提問，它會幫你追問、整理思路，但不直接給答案，因為這個探究是你們的。右側的「討論室」讓團隊即時溝通，不用離開想法牆。',
    tip: '討論室的紀錄是可以回顧的。如果你們在這裡討論出了什麼重要的結論，記得回到節點上更新內容。'
  }
];

export default function IdeaWallOnboarding({ onClose, projectId }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const Icon = current.Icon;
  const isLast = step === STEPS.length - 1;

  const handleDone = () => {
    localStorage.setItem(`ideawall_onboarded_${projectId}`, 'true');
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
                    ? 'w-6 bg-indigo-500'
                    : i < step
                    ? 'w-1.5 bg-indigo-300'
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
              className="px-btn-x-lg py-btn-y bg-indigo-500 text-white text-body-sm font-medium rounded-lg hover:bg-indigo-500/90 transition-colors duration-fast"
            >
              開始探索
            </button>
          ) : (
            <button
              onClick={() => setStep(s => s + 1)}
              className="px-btn-x-lg py-btn-y bg-indigo-500 text-white text-body-sm font-medium rounded-lg hover:bg-indigo-500/90 transition-colors duration-fast"
            >
              下一步
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
