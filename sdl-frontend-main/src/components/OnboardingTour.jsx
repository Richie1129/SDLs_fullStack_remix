import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiChevronLeft, FiChevronRight, FiCheck } from 'react-icons/fi';

const OnboardingTour = ({ isOpen, onClose, userRole = 'student' }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  const studentTourSteps = [
    {
      id: 'welcome',
      title: '🎉 歡迎來到自主學習平台！',
      content: '讓我們用簡單的 3 分鐘導覽，幫助您快速上手平台的核心功能',
      target: null,
      position: 'center',
      actionText: '開始導覽'
    },
    {
      id: 'homepage-overview',
      title: '🏠 這是您的學習首頁',
      content: '在這裡可以看到所有參與的專案，追蹤學習進度，開始新的學習旅程',
      target: '.project-cards-section',
      position: 'top',
      actionText: '了解專案區域'
    },
    {
      id: 'project-card',
      title: '📚 您的學習專案',
      content: '每張卡片代表一個學習專案。點擊可進入專案，查看任務和進度',
      target: '.project-card:first-child',
      position: 'bottom',
      actionText: '學習專案操作'
    },
    {
      id: 'navigation',
      title: '🧭 快速導航',
      content: '使用頂部選單可以快速切換到反思日誌、看板管理等核心功能',
      target: '.top-navigation',
      position: 'bottom',
      actionText: '認識導航功能'
    },
    {
      id: 'reflection-intro',
      title: '💭 反思是學習的關鍵',
      content: '定期記錄學習反思能幫助您深化學習成果。我們提供 5Rs 框架來引導您的反思',
      target: null,
      position: 'center',
      actionText: '了解反思重要性'
    },
    {
      id: 'collaboration',
      title: '🤝 團隊協作學習',
      content: '您可以與同學一起討論、分享想法，在聊天室交流學習心得',
      target: null,
      position: 'center',
      actionText: '學習協作功能'
    },
    {
      id: 'completion',
      title: '✅ 準備開始學習！',
      content: '恭喜！您已了解平台基礎功能。現在可以開始您的自主學習之旅了！',
      target: null,
      position: 'center',
      actionText: '開始學習'
    }
  ];

  const teacherTourSteps = [
    {
      id: 'welcome',
      title: '👩‍🏫 歡迎來到教師管理平台',
      content: '讓我們了解如何有效管理學生的學習進度和提供指導',
      target: null,
      position: 'center',
      actionText: '開始導覽'
    },
    {
      id: 'teacher-dashboard',
      title: '📊 教師儀表板',
      content: '在這裡可以查看所有指導專案的整體狀況和學生學習數據',
      target: '.teacher-overview',
      position: 'bottom',
      actionText: '了解儀表板'
    },
    {
      id: 'student-management',
      title: '👥 學生管理',
      content: '監控學生學習進度，提供個別指導和即時反饋',
      target: '.student-management',
      position: 'top',
      actionText: '學習學生管理'
    },
    {
      id: 'completion',
      title: '✅ 開始指導學習！',
      content: '您已準備好開始使用平台指導學生進行自主學習',
      target: null,
      position: 'center',
      actionText: '開始指導'
    }
  ];

  const tourSteps = userRole === 'teacher' ? teacherTourSteps : studentTourSteps;

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // 標記用戶已完成導覽
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('hasCompletedTour', 'true');
    localStorage.setItem('tourCompletedDate', new Date().toISOString());
    onClose();
  };

  const handleSkip = () => {
    localStorage.setItem('hasSkippedTour', 'true');
    onClose();
  };

  const currentStepData = tourSteps[currentStep];
  const isLastStep = currentStep === tourSteps.length - 1;
  const isFirstStep = currentStep === 0;

  if (!isOpen || !isVisible) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50">
        {/* 背景遮罩 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black bg-opacity-60"
        />

        {/* 導覽內容 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className={`absolute ${
            currentStepData.position === 'center' 
              ? 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'
              : 'top-20 left-1/2 transform -translate-x-1/2'
          } bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4`}
        >
          {/* 關閉按鈕 */}
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FiX size={20} />
          </button>

          {/* 進度指示器 */}
          <div className="flex items-center justify-center mb-4">
            <div className="flex space-x-2">
              {tourSteps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 w-2 rounded-full transition-colors ${
                    index <= currentStep ? 'bg-teal-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="ml-3 text-sm text-gray-500">
              {currentStep + 1} / {tourSteps.length}
            </span>
          </div>

          {/* 步驟內容 */}
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-3">
              {currentStepData.title}
            </h3>
            <p className="text-gray-600 leading-relaxed">
              {currentStepData.content}
            </p>
          </div>

          {/* 操作按鈕 */}
          <div className="flex justify-between items-center">
            <button
              onClick={handlePrevious}
              disabled={isFirstStep}
              className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                isFirstStep
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              <FiChevronLeft className="mr-1" />
              上一步
            </button>

            <div className="flex space-x-3">
              {!isLastStep && (
                <button
                  onClick={handleSkip}
                  className="px-4 py-2 text-gray-500 hover:text-gray-700 font-medium transition-colors"
                >
                  跳過導覽
                </button>
              )}
              
              <button
                onClick={handleNext}
                className="flex items-center px-6 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
              >
                {isLastStep ? (
                  <>
                    <FiCheck className="mr-1" />
                    完成導覽
                  </>
                ) : (
                  <>
                    {currentStepData.actionText}
                    <FiChevronRight className="ml-1" />
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>

        {/* 高亮目標元素 */}
        {currentStepData.target && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 pointer-events-none"
          >
            <div 
              className="absolute border-4 border-teal-400 rounded-lg shadow-lg"
              style={{
                // 這裡需要根據目標元素動態計算位置
                // 實際實作時需要使用 getBoundingClientRect() 來獲取元素位置
              }}
            />
          </motion.div>
        )}
      </div>
    </AnimatePresence>
  );
};

export default OnboardingTour;
