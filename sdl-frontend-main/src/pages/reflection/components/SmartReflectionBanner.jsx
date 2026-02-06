import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiTarget, FiInfo } from 'react-icons/fi';
import { FaGraduationCap } from 'react-icons/fa';
import { STAGE_NAMES } from '@/pages/submit/config/guidedQuestionsConfig';

/**
 * 智能反思橫幅 - 根據使用者行為動態顯示提示
 * 
 * 觸發時機：
 * 1. 連續 3 天只寫傳統日誌 → 建議嘗試 5Rs
 * 2. 完成重要階段 → 提示進行深度反思
 * 3. 長時間未撰寫任何反思 → 鼓勵記錄
 */
export function SmartReflectionBanner({ 
  recentLogs = [],
  currentStage = null,
  onAction,
  className = "" 
}) {
  const [bannerType, setBannerType] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 分析使用者行為並決定顯示哪種橫幅
    const analyzeBehavior = () => {
      // 情境 1: 累積 3 筆以上日誌，但從未嘗試過 5Rs，建議嘗試深度反思
      if (recentLogs && recentLogs.length >= 3) {
        const has5Rs = recentLogs.some(log => 
          log.content?.includes('##') || log.content?.includes('5Rs')
        );
        
        if (!has5Rs) {
          setBannerType('suggest_5rs');
          setIsVisible(true);
          return;
        }
      }

      // 情境 2: 到達新階段，建議深度反思
      if (currentStage && isNewStage(currentStage)) {
        setBannerType('stage_milestone');
        setIsVisible(true);
        return;
      }

      // 情境 3: 長時間未記錄（7 天以上）
      const daysSinceLastLog = getDaysSinceLastLog(recentLogs);
      if (daysSinceLastLog >= 7) {
        setBannerType('encourage_logging');
        setIsVisible(true);
        return;
      }

      // 預設不顯示
      setIsVisible(false);
    };

    analyzeBehavior();
  }, [recentLogs, currentStage]);

  const handleDismiss = () => {
    setIsVisible(false);
    // 記錄已關閉，24 小時內不再顯示
    localStorage.setItem(`banner_dismissed_${bannerType}`, Date.now());
  };

  const handleAction = () => {
    onAction?.(bannerType);
    handleDismiss();
  };

  // 檢查是否為新階段
  const isNewStage = (stage) => {
    const lastStage = localStorage.getItem('last_reflection_stage');
    if (lastStage !== stage) {
      localStorage.setItem('last_reflection_stage', stage);
      return true;
    }
    return false;
  };

  // 計算距離上次記錄的天數
  const getDaysSinceLastLog = (logs) => {
    if (!logs || logs.length === 0) return 999;
    
    const lastLog = logs[0];
    const lastDate = new Date(lastLog.createdAt);
    const now = new Date();
    const diffTime = Math.abs(now - lastDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  // 檢查是否在冷卻期
  const isInCooldown = () => {
    const dismissedTime = localStorage.getItem(`banner_dismissed_${bannerType}`);
    if (!dismissedTime) return false;
    
    const now = Date.now();
    const cooldownPeriod = 24 * 60 * 60 * 1000; // 24 小時
    return (now - dismissedTime) < cooldownPeriod;
  };

  if (!isVisible || isInCooldown()) return null;

  // 根據類型渲染不同的橫幅
  const renderBanner = () => {
    switch (bannerType) {
      case 'suggest_5rs':
        return (
          <BannerCard
            icon={<FaGraduationCap className="w-7 h-7 text-purple-600" />}
            title="試試看深度反思吧！"
            description={`您已經寫了 ${recentLogs.length} 篇傳統日誌！要不要試試「5Rs 結構反思」，透過系統化的思考建立更深入的知識連結？`}
            actionText="撰寫 5Rs 反思"
            variant="purple"
            onAction={handleAction}
            onDismiss={handleDismiss}
          />
        );

      case 'stage_milestone':
        return (
          <BannerCard
            icon={<FiTarget className="w-7 h-7 text-amber-600" />}
            title="恭喜進入新階段！"
            description={`您已進入專案的「${formatStage(currentStage)}」階段。建議進行一次深度反思，總結上個階段的學習成果。`}
            actionText="撰寫階段反思"
            variant="milestone"
            onAction={handleAction}
            onDismiss={handleDismiss}
          />
        );

      case 'encourage_logging':
        return (
          <BannerCard
            icon={<FiInfo className="w-7 h-7 text-green-600" />}
            title="有一陣子沒記錄了呢"
            description="定期記錄能幫助您追蹤學習進度。花 5 分鐘記錄最近的學習心得吧！"
            actionText="快速記錄"
            variant="green"
            onAction={handleAction}
            onDismiss={handleDismiss}
          />
        );

      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className={className}
        >
          {renderBanner()}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * 橫幅卡片組件
 */
function BannerCard({ 
  icon, 
  title, 
  description, 
  actionText, 
  variant = 'green',
  onAction, 
  onDismiss 
}) {
  const variantStyles = {
    green: {
      bg: 'bg-gradient-to-r from-green-50 to-emerald-50',
      border: 'border-green-200',
      icon: 'text-green-600',
      button: 'bg-[#5BA491] hover:bg-[#5BA491]/90 text-white',
    },
    purple: {
      bg: 'bg-gradient-to-r from-purple-50 to-pink-50',
      border: 'border-purple-200',
      icon: 'text-purple-600',
      button: 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white',
    },
    milestone: {
      bg: 'bg-gradient-to-r from-amber-50 to-yellow-50',
      border: 'border-amber-200',
      icon: 'text-amber-600',
      button: 'bg-amber-500 hover:bg-amber-600 text-white',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className={`${styles.bg} ${styles.border} border-2 rounded-xl p-component-sm shadow-sm relative overflow-hidden`}>
      {/* 裝飾元素 */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full -mr-16 -mt-16" />
      
      <div className="relative flex items-start gap-stack-sm">
        {/* Icon */}
        <div className="flex-shrink-0 text-3xl mt-1">
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="text-h5 font-bold text-gray-800 mb-1">
            {title}
          </h4>
          <p className="text-body-sm text-gray-600 leading-relaxed mb-stack-sm">
            {description}
          </p>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onAction}
              className={`px-4 py-2 ${styles.button} font-medium rounded-lg transition-colors duration-fast text-body-sm shadow-sm`}
            >
              {actionText}
            </button>
            <button
              onClick={onDismiss}
              className="px-3 py-2 text-gray-600 hover:text-gray-800 text-body-sm transition-colors duration-fast"
            >
              稍後再說
            </button>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors duration-fast"
          aria-label="關閉"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/**
 * 格式化階段名稱 - 使用專案統一的階段名稱（包含階段編號）
 */
function formatStage(stage) {
  if (!stage) return '未知階段';
  const stageName = STAGE_NAMES[stage] || '未知階段';
  return `${stage} ${stageName}`;
}
