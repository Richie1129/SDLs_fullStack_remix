import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { consentStorage, authStorage } from '../../services/storageService';
import { isAuthenticated } from '../../utils/authUtils';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const CONSENT_OPTIONS = [
  {
    level: 'essential',
    label: '僅必要',
    description: '僅記錄安全與認證相關事件',
    icon: '🔒',
    details: ['登入/登出紀錄', '密碼變更紀錄', 'Token 刷新紀錄'],
  },
  {
    level: 'functional',
    label: '功能性',
    description: '記錄核心學習功能操作',
    icon: '📚',
    details: ['任務建立/刪除/更新', '專案操作', '反思日誌撰寫', '檔案上傳'],
  },
  {
    level: 'analytics',
    label: '分析性',
    description: '記錄頁面瀏覽與點擊行為',
    icon: '📊',
    details: ['頁面瀏覽紀錄', '按鈕點擊追蹤', 'Kanban 點擊分析', '功能使用頻率'],
  },
  {
    level: 'full',
    label: '完整追蹤',
    description: '記錄所有互動行為',
    icon: '🔬',
    details: ['包含以上所有項目', '滑鼠移動/滾動行為', '焦點/失焦事件', '視窗可見性追蹤'],
  },
];

/**
 * ConsentSettings - 隱私設定面板
 * 
 * 可嵌入個人設定頁面，提供：
 * - 同意等級切換
 * - 撤銷同意
 * - 資料匿名化（被遺忘權）
 */
export default function ConsentSettings() {
  const [currentLevel, setCurrentLevel] = useState('essential');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteResult, setDeleteResult] = useState(null);

  // 載入當前同意等級
  useEffect(() => {
    if (!isAuthenticated()) {
      setLoading(false);
      return;
    }

    const fetchConsent = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/consent`, {
          headers: { accessToken: authStorage.get('accessToken') || '' },
        });
        const level = response.data?.consentLevel || 'essential';
        setCurrentLevel(level);
        consentStorage.set('consentLevel', level);
      } catch {
        // 使用 localStorage 作為備份，預設 full
        setCurrentLevel(consentStorage.get('consentLevel') || 'full');
      } finally {
        setLoading(false);
      }
    };

    fetchConsent();
  }, []);

  // 更新同意等級
  const handleUpdateLevel = useCallback(async (newLevel) => {
    setSaving(true);
    try {
      await axios.put(
        `${API_BASE_URL}/consent`,
        { consentLevel: newLevel },
        { headers: { accessToken: authStorage.get('accessToken') || '' } }
      );
      setCurrentLevel(newLevel);
      consentStorage.set('consentLevel', newLevel);
      consentStorage.set('hasConsented', 'true');
    } catch (error) {
      console.error('❌ 更新同意等級失敗:', error);
      alert('更新失敗，請稍後再試');
    } finally {
      setSaving(false);
    }
  }, []);

  // 撤銷同意
  const handleRevoke = useCallback(async () => {
    setSaving(true);
    try {
      await axios.delete(`${API_BASE_URL}/consent`, {
        headers: { accessToken: authStorage.get('accessToken') || '' },
      });
      setCurrentLevel('essential');
      consentStorage.set('consentLevel', 'essential');
    } catch (error) {
      console.error('❌ 撤銷同意失敗:', error);
    } finally {
      setSaving(false);
    }
  }, []);

  // 被遺忘權 - 匿名化所有追蹤資料
  const handleDeleteMyData = useCallback(async () => {
    setSaving(true);
    try {
      const response = await axios.delete(`${API_BASE_URL}/consent/my-data`, {
        headers: { accessToken: authStorage.get('accessToken') || '' },
      });
      setDeleteResult(response.data);
      setCurrentLevel('essential');
      consentStorage.set('consentLevel', 'essential');
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('❌ 資料匿名化失敗:', error);
      alert('操作失敗，請稍後再試');
    } finally {
      setSaving(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="p-component-md text-center text-gray-500">
        載入隱私設定...
      </div>
    );
  }

  return (
    <div className="p-component-md bg-white rounded-xl border border-gray-200">
      {/* 標題 */}
      <div className="flex items-center gap-stack-xs mb-stack-sm">
        <span className="text-h3">🔐</span>
        <h3 className="text-h2 font-bold text-gray-800">隱私與追蹤設定</h3>
      </div>

      <p className="text-body text-gray-600 mb-stack-md font-serif">
        管理您的學習追蹤偏好。選擇適合您的隱私等級。
      </p>

      {/* 同意等級選項 */}
      <div className="space-y-stack-xs mb-stack-md">
        {CONSENT_OPTIONS.map(({ level, label, description, icon, details }) => {
          const isActive = currentLevel === level;
          return (
            <div
              key={level}
              className={`
                p-component-sm rounded-lg border-2 cursor-pointer
                transition-shadow duration-fast
                ${isActive
                  ? 'border-customgreen bg-customgreen/5 shadow-md'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }
              `}
              onClick={() => !saving && handleUpdateLevel(level)}
              data-track
              data-track-action={`SETTINGS_CONSENT_${level.toUpperCase()}`}
              data-track-type="consent"
            >
              <div className="flex items-start gap-stack-xs">
                <span className="text-h3 mt-0.5">{icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-ui font-bold ${isActive ? 'text-customgreen' : 'text-gray-700'}`}>
                      {label}
                    </span>
                    {isActive && (
                      <span className="text-caption bg-customgreen text-white px-2 py-0.5 rounded-full">
                        目前選擇
                      </span>
                    )}
                  </div>
                  <p className="text-caption text-gray-500 mt-1 font-serif">{description}</p>
                  <ul className="mt-2 space-y-0.5">
                    {details.map((d) => (
                      <li key={d} className="text-caption text-gray-400 font-serif">
                        • {d}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-1 ${
                  isActive ? 'border-customgreen bg-customgreen' : 'border-gray-300'
                }`}>
                  {isActive && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 撤銷同意 */}
      <div className="border-t border-gray-200 pt-stack-sm mb-stack-sm">
        <button
          onClick={handleRevoke}
          disabled={saving || currentLevel === 'essential'}
          className="text-ui text-gray-500 hover:text-orange-600 transition-colors duration-fast underline disabled:opacity-50"
          data-track
          data-track-action="SETTINGS_CONSENT_REVOKE"
          data-track-type="consent"
        >
          撤銷追蹤同意（僅保留必要追蹤）
        </button>
      </div>

      {/* 被遺忘權 */}
      <div className="border-t border-gray-200 pt-stack-sm">
        <h4 className="text-ui font-bold text-red-600 mb-2">⚠️ 危險操作</h4>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-ui text-red-500 hover:text-red-700 transition-colors duration-fast underline"
            data-track
            data-track-action="SETTINGS_DELETE_DATA_OPEN"
            data-track-type="consent"
          >
            刪除我的所有追蹤資料
          </button>
        ) : (
          <div className="bg-red-50 p-component-sm rounded-lg border border-red-200">
            <p className="text-body text-red-700 mb-stack-xs font-serif">
              此操作會將您的所有追蹤資料匿名化，<strong>無法復原</strong>。
              匿名化後，系統將無法提供您的個人化學習分析。
            </p>
            <div className="flex gap-stack-xs">
              <button
                onClick={handleDeleteMyData}
                disabled={saving}
                className="
                  px-btn-x py-btn-y text-ui font-bold
                  bg-red-600 text-white rounded-lg
                  hover:bg-red-700 hover:shadow-lg
                  transition-shadow duration-fast
                  disabled:opacity-50
                "
                data-track
                data-track-action="SETTINGS_DELETE_DATA_CONFIRM"
                data-track-type="consent"
              >
                {saving ? '處理中...' : '確認刪除'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-btn-x py-btn-y text-ui text-gray-600 hover:text-gray-800"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* 刪除結果 */}
        {deleteResult && (
          <div className="mt-stack-xs bg-green-50 p-component-xs rounded-lg border border-green-200">
            <p className="text-body text-green-700 font-serif">
              ✅ {deleteResult.message}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
