import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { consentStorage, authStorage } from '../../services/storageService';
import { getCurrentUserId, isAuthenticated } from '../../utils/authUtils';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * 同意等級定義
 */
const CONSENT_LEVELS = {
  essential: {
    label: '僅必要',
    description: '僅記錄安全相關事件（登入、登出、密碼變更）',
    icon: '🔒',
  },
  functional: {
    label: '功能性',
    description: '記錄學習活動（任務操作、專案管理、反思日誌）',
    icon: '📚',
  },
  analytics: {
    label: '分析性',
    description: '記錄頁面瀏覽與點擊行為，幫助改善學習體驗',
    icon: '📊',
  },
  full: {
    label: '完整追蹤',
    description: '記錄所有互動行為，提供最完整的學習分析',
    icon: '🔬',
  },
};

const LEVEL_ORDER = ['essential', 'functional', 'analytics', 'full'];

/**
 * ConsentBanner - 隱私同意橫幅
 * 
 * 首次登入時顯示，讓使用者選擇追蹤同意等級。
 * 選擇後儲存到後端 + localStorage。
 */
export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState('full');
  const [saving, setSaving] = useState(false);

  // 檢查是否需要顯示 banner
  useEffect(() => {
    if (!isAuthenticated()) return;

    const hasConsented = consentStorage.get('hasConsented');
    if (hasConsented === 'true') {
      setVisible(false);
      return;
    }

    // 向後端查詢是否已有同意記錄
    const checkConsent = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/consent`, {
          headers: { accessToken: authStorage.get('accessToken') || '' },
        });
        if (response.data && !response.data.isDefault) {
          // 已有同意記錄，同步到 localStorage
          consentStorage.set('consentLevel', response.data.consentLevel);
          consentStorage.set('hasConsented', 'true');
          setVisible(false);
        } else {
          setVisible(true);
        }
      } catch {
        // API 失敗時顯示 banner，預設 full
        consentStorage.set('consentLevel', 'full');
        setVisible(true);
      }
    };

    // 延遲檢查避免干擾頁面載入
    const timer = setTimeout(checkConsent, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await axios.put(
        `${API_BASE_URL}/consent`,
        { consentLevel: selectedLevel },
        { headers: { accessToken: authStorage.get('accessToken') || '' } }
      );

      consentStorage.set('consentLevel', selectedLevel);
      consentStorage.set('hasConsented', 'true');
      setVisible(false);
    } catch (error) {
      console.error('❌ 儲存同意等級失敗:', error);
      // 即使 API 失敗，也存到 localStorage
      consentStorage.set('consentLevel', selectedLevel);
      consentStorage.set('hasConsented', 'true');
      setVisible(false);
    } finally {
      setSaving(false);
    }
  }, [selectedLevel]);

  const handleEssentialOnly = useCallback(async () => {
    setSelectedLevel('essential');
    setSaving(true);
    try {
      await axios.put(
        `${API_BASE_URL}/consent`,
        { consentLevel: 'essential' },
        { headers: { accessToken: authStorage.get('accessToken') || '' } }
      );
    } catch {
      // 忽略 API 錯誤
    }
    consentStorage.set('consentLevel', 'essential');
    consentStorage.set('hasConsented', 'true');
    setSaving(false);
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        transition={{ duration: 0.3 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-customgreen shadow-2xl"
      >
        <div className="max-w-4xl mx-auto p-component-md">
          {/* 標題 */}
          <div className="flex items-center gap-stack-xs mb-stack-sm">
            <span className="text-h3">🍪</span>
            <h3 className="text-h3 font-bold text-gray-800">
              學習追蹤隱私設定
            </h3>
          </div>

          <p className="text-body text-gray-600 mb-stack-sm font-serif">
            為了提供更好的學習分析，我們會記錄您的操作行為。
            您可以選擇同意的追蹤等級，隨時可在個人設定中修改。
          </p>

          {/* 等級選擇 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-stack-xs mb-stack-sm">
            {LEVEL_ORDER.map((level) => {
              const info = CONSENT_LEVELS[level];
              const isSelected = selectedLevel === level;
              return (
                <button
                  key={level}
                  onClick={() => setSelectedLevel(level)}
                  data-track
                  data-track-action={`CONSENT_SELECT_${level.toUpperCase()}`}
                  data-track-type="consent"
                  className={`
                    p-component-xs rounded-lg border-2 text-left
                    transition-shadow duration-fast
                    ${isSelected
                      ? 'border-customgreen bg-customgreen/5 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }
                  `}
                >
                  <div className="text-h3 mb-1">{info.icon}</div>
                  <div className={`text-ui font-bold ${isSelected ? 'text-customgreen' : 'text-gray-700'}`}>
                    {info.label}
                  </div>
                  <p className="text-caption text-gray-500 mt-1 font-serif">
                    {info.description}
                  </p>
                </button>
              );
            })}
          </div>

          {/* 操作按鈕 */}
          <div className="flex items-center justify-between gap-stack-sm">
            <button
              onClick={handleEssentialOnly}
              disabled={saving}
              className="text-ui text-gray-500 hover:text-gray-700 transition-colors duration-fast underline"
              data-track
              data-track-action="CONSENT_REJECT_EXTRA"
              data-track-type="consent"
            >
              僅接受必要追蹤
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="
                px-btn-x py-btn-y
                bg-customgreen text-white text-ui font-bold
                rounded-lg
                hover:bg-customgreen/90 hover:shadow-lg
                transition-shadow duration-fast
                disabled:opacity-50 disabled:cursor-not-allowed
              "
              data-track
              data-track-action="CONSENT_ACCEPT"
              data-track-type="consent"
              data-track-meta-level={selectedLevel}
            >
              {saving ? '儲存中...' : `接受「${CONSENT_LEVELS[selectedLevel].label}」追蹤`}
            </button>
          </div>

          {/* 法律聲明 */}
          <p className="text-caption text-gray-400 mt-stack-xs font-serif">
            您的追蹤資料僅用於學習分析，不會分享給第三方。
            您隨時可以在個人設定中修改同意等級或刪除追蹤資料。
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
