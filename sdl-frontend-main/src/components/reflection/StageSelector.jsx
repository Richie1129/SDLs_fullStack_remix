import React from 'react';
import PropTypes from 'prop-types';
import { STAGE_NAMES } from '@/pages/submit/config/guidedQuestionsConfig';

/**
 * 階段選擇器元件
 * 用於反思日誌中選擇關聯的學習階段
 * 
 * 特性：
 * - 按 Stage 分組顯示（Stage 1-4）
 * - 預設為「無特定階段」（通用反思）
 * - 支援智能推薦當前階段
 */
export default function StageSelector({ 
  value, 
  onChange, 
  disabled = false,
  recommendedStage = null // 智能推薦的階段
}) {
  
  // 將 STAGE_NAMES 按 Stage 分組
  const stageGroups = {
    1: { name: 'Stage 1: 定標', stages: [] },
    2: { name: 'Stage 2: 擇策', stages: [] },
    3: { name: 'Stage 3: 監評', stages: [] },
    4: { name: 'Stage 4: 調節', stages: [] }
  };

  // 分組處理
  Object.entries(STAGE_NAMES).forEach(([key, name]) => {
    const stageNum = parseInt(key.split('-')[0]);
    stageGroups[stageNum].stages.push({ key, name });
  });

  return (
    <div className="mb-4">
      <label className="block font-medium text-body-sm mb-2 text-gray-700">
        關聯階段 
        <span className="text-gray-400 text-caption ml-1">
          （選填，可幫助回顧特定階段的反思）
        </span>
      </label>
      
      <div className="relative">
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`
            w-full px-3 py-2 text-body-sm
            border rounded-lg
            focus:outline-none focus:ring-2 focus:ring-customgreen focus:border-transparent
            transition-all duration-fast
            ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white'}
            ${value ? 'text-gray-900' : 'text-gray-500'}
          `}
        >
          <option value="">
            {recommendedStage ? '📝 無特定階段（通用反思）' : '無特定階段（通用反思）'}
          </option>
          
          {Object.entries(stageGroups).map(([stageNum, group]) => (
            <optgroup key={stageNum} label={group.name}>
              {group.stages.map(({ key, name }) => (
                <option key={key} value={key}>
                  {key === recommendedStage ? `⭐ ${key} ${name}` : `${key} ${name}`}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        
        {/* 智能推薦提示 */}
        {recommendedStage && !value && (
          <div className="mt-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-caption text-blue-700">
              💡 <strong>智能推薦：</strong>根據目前進度，建議記錄 
              <button
                type="button"
                onClick={() => onChange(recommendedStage)}
                className="ml-1 text-blue-600 font-medium hover:underline"
              >
                {recommendedStage} {STAGE_NAMES[recommendedStage]}
              </button>
              的反思
            </p>
          </div>
        )}
        
        {/* 已選擇階段的說明 */}
        {value && (
          <div className="mt-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-caption text-green-700">
              ✅ 此反思將關聯到「{value} {STAGE_NAMES[value]}」階段
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

StageSelector.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  recommendedStage: PropTypes.string
};
