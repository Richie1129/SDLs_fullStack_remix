import React from 'react';
import PropTypes from 'prop-types';
import { FiInfo, FiCheckCircle } from 'react-icons/fi';
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
    <div>
      <label className="block font-semibold text-body text-gray-800 mb-2">
        關聯階段 
        <span className="text-gray-400 text-caption font-normal ml-1">
          （選填）
        </span>
      </label>
      
      <div className="relative">
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`
            w-full px-4 py-2.5 text-body-sm
            border rounded-lg appearance-none
            focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent
            transition-all duration-fast
            ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-gray-50 focus:bg-white'}
            ${value ? 'text-gray-900' : 'text-gray-500'}
          `}
        >
          <option value="">無特定階段</option>
          
          {Object.entries(stageGroups).map(([stageNum, group]) => (
            <optgroup key={stageNum} label={group.name}>
              {group.stages.map(({ key, name }) => (
                <option key={key} value={key}>
                  {key === recommendedStage ? `★ ${key} ${name}` : `${key} ${name}`}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        
        {/* Dropdown arrow */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        
        {/* 智能推薦提示 - 更簡潔 */}
        {recommendedStage && !value && (
          <button
            type="button"
            onClick={() => onChange(recommendedStage)}
            className="mt-2 w-full px-3 py-2 text-caption text-left bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors duration-fast group"
          >
            <span className="text-blue-700">
              <FiInfo className="w-3.5 h-3.5 inline mr-1.5" />
              <span className="font-medium">推薦：</span>
              <span className="group-hover:underline">{recommendedStage} {STAGE_NAMES[recommendedStage]}</span>
            </span>
          </button>
        )}
        
        {/* 已選擇階段 - 更簡潔 */}
        {value && (
          <div className="mt-2 px-3 py-1.5 bg-teal-50 border border-teal-200 rounded-lg">
            <p className="text-caption text-teal-700">
              <FiCheckCircle className="w-3.5 h-3.5 inline mr-1" />
              已關聯：{value} {STAGE_NAMES[value]}
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
