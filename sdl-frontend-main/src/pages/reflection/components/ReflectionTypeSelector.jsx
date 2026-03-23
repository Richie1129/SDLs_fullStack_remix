import React from "react";
import { motion } from "framer-motion";
import { FiFileText, FiZap, FiInfo, FiBriefcase, FiTarget, FiLink } from 'react-icons/fi';
import { FaBrain, FaGraduationCap } from 'react-icons/fa';

/**
 * 反思類型選擇器 - 雙卡片設計
 * 清楚區分「傳統日誌」和「5Rs 結構反思」的定位
 */
export function ReflectionTypeSelector({
  onSelectTraditional,
  onSelect5Rs,
  compact = false,
  className = ""
}) {
  if (compact) {
    return (
      <div className={`grid grid-cols-2 gap-3 ${className}`}>
        {/* 傳統日誌 - 緊湊版 */}
        <motion.div
          whileHover={{ y: -2 }}
          data-track
          data-track-action="REFLECTION_TYPE_TRADITIONAL"
          data-track-type="reflection"
          className="group bg-white rounded-xl border-2 border-gray-200 hover:border-[#5BA491] transition-all duration-normal shadow-sm hover:shadow-md cursor-pointer p-4 flex flex-col items-center text-center gap-2"
          onClick={onSelectTraditional}
        >
          <div className="w-10 h-10 rounded-lg bg-[#5BA491]/10 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-[#5BA491]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <div>
            <h3 className="text-body font-bold text-gray-800">傳統日誌</h3>
            <p className="text-caption text-gray-500 mt-0.5">快速記錄 · 5-10 分鐘</p>
          </div>
          <button className="w-full py-2 bg-[#5BA491] hover:bg-[#5BA491]/90 text-white text-caption font-medium rounded-lg transition-colors duration-fast mt-auto">
            撰寫
          </button>
        </motion.div>

        {/* 5Rs 反思 - 緊湊版 */}
        <motion.div
          whileHover={{ y: -2 }}
          data-track
          data-track-action="REFLECTION_TYPE_5RS"
          data-track-type="reflection"
          className="group bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 hover:border-purple-400 transition-all duration-normal shadow-sm hover:shadow-md cursor-pointer p-4 flex flex-col items-center text-center gap-2 relative"
          onClick={onSelect5Rs}
        >
          <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-bold rounded-full">
            AI
          </div>
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-sm">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-body font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">5Rs 反思</h3>
            <p className="text-caption text-gray-500 mt-0.5">深度分析 · 10-15 分鐘</p>
          </div>
          <button className="w-full py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-caption font-medium rounded-lg transition-all duration-fast mt-auto">
            撰寫
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-stack-base sm:gap-stack-md ${className}`}>
      {/* 傳統日誌卡片 - 綠色主題 */}
      <motion.div
        whileHover={{ y: -4 }}
        data-track
        data-track-action="REFLECTION_TYPE_TRADITIONAL"
        data-track-type="reflection"
        className="group bg-white rounded-xl border-2 border-gray-200 hover:border-[#5BA491] transition-all duration-normal shadow-sm hover:shadow-lg overflow-hidden cursor-pointer"
        onClick={onSelectTraditional}
      >
        <div className="p-component-md">
          {/* 標題區 */}
          <div className="flex items-center justify-between mb-stack-sm">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-[#5BA491]/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#5BA491]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h3 className="text-h4 font-bold text-gray-800">傳統日誌</h3>
            </div>
            <span className="px-2 py-1 bg-[#5BA491]/10 text-[#5BA491] text-caption font-medium rounded">
              5-10 分鐘
            </span>
          </div>

          {/* 說明文字 */}
          <p className="text-body text-gray-600 mb-stack-sm leading-relaxed">
            快速記錄當天的工作內容、遇到的問題和解決方法。適合日常工作紀錄和即時想法捕捉。
          </p>

          {/* 特點標籤 */}
          <div className="flex flex-wrap gap-2 mb-stack-sm">
            <span className="px-3 py-1 bg-gray-50 text-gray-700 text-caption rounded-full border border-gray-200 inline-flex items-center gap-1">
              <FiFileText className="w-3.5 h-3.5" /> 自由格式
            </span>
            <span className="px-3 py-1 bg-gray-50 text-gray-700 text-caption rounded-full border border-gray-200 inline-flex items-center gap-1">
              <FiZap className="w-3.5 h-3.5" /> 快速記錄
            </span>
            <span className="px-3 py-1 bg-gray-50 text-gray-700 text-caption rounded-full border border-gray-200 inline-flex items-center gap-1">
              <FiInfo className="w-3.5 h-3.5" /> 即時想法
            </span>
          </div>

          {/* 適用場景 */}
          <div className="pt-stack-xs border-t border-gray-100">
            <p className="text-caption text-gray-500 mb-1 flex items-center gap-1"><FiBriefcase className="w-3.5 h-3.5" /> 適用場景：</p>
            <ul className="text-caption text-gray-600 space-y-1">
              <li className="flex items-start">
                <span className="mr-1.5 text-[#5BA491] mt-0.5">•</span>
                <span>記錄每日進度和待辦事項</span>
              </li>
              <li className="flex items-start">
                <span className="mr-1.5 text-[#5BA491] mt-0.5">•</span>
                <span>快速捕捉靈感和想法</span>
              </li>
              <li className="flex items-start">
                <span className="mr-1.5 text-[#5BA491] mt-0.5">•</span>
                <span>記錄遇到的問題和解決方案</span>
              </li>
            </ul>
          </div>

          {/* 按鈕區 */}
          <button className="w-full mt-stack-base py-2.5 bg-[#5BA491] hover:bg-[#5BA491]/90 text-white font-medium rounded-lg transition-colors duration-fast flex items-center justify-center gap-2 group-hover:shadow-md">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            撰寫傳統日誌
          </button>
        </div>
      </motion.div>

      {/* 5Rs 反思卡片 - 紫色漸層主題 */}
      <motion.div
        whileHover={{ y: -4 }}
        data-track
        data-track-action="REFLECTION_TYPE_5RS"
        data-track-type="reflection"
        className="group bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 rounded-xl border-2 border-purple-200 hover:border-purple-400 transition-all duration-normal shadow-sm hover:shadow-lg overflow-hidden cursor-pointer relative"
        onClick={onSelect5Rs}
      >
        {/* AI 標記 */}
        <div className="absolute top-3 right-3 px-2.5 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-caption font-bold rounded-full shadow-sm flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13 7H7v6h6V7z" />
            <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z" clipRule="evenodd" />
          </svg>
          AI 分析
        </div>

        <div className="p-component-md">
          {/* 標題區 */}
          <div className="flex items-center justify-between mb-stack-sm">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-sm">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-h4 font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                5Rs 結構反思
              </h3>
            </div>
            <span className="px-2 py-1 bg-purple-100 text-purple-600 text-caption font-medium rounded">
              10-15 分鐘
            </span>
          </div>

          {/* 說明文字 */}
          <p className="text-body text-gray-700 mb-stack-sm leading-relaxed">
            透過「Reporting → Responding → Relating → Reasoning → Reconstructing」五步驟深度反思，建立知識連結，提升學習成效。
          </p>

          {/* 特點標籤 */}
          <div className="flex flex-wrap gap-2 mb-stack-sm">
            <span className="px-3 py-1 bg-white/70 text-purple-700 text-caption rounded-full border border-purple-200 font-medium inline-flex items-center gap-1">
              <FiTarget className="w-3.5 h-3.5" /> 結構化
            </span>
            <span className="px-3 py-1 bg-white/70 text-purple-700 text-caption rounded-full border border-purple-200 font-medium inline-flex items-center gap-1">
              <FaBrain className="w-3.5 h-3.5" /> 深度思考
            </span>
            <span className="px-3 py-1 bg-white/70 text-purple-700 text-caption rounded-full border border-purple-200 font-medium inline-flex items-center gap-1">
              <FiLink className="w-3.5 h-3.5" /> 知識連結
            </span>
          </div>

          {/* 適用場景 */}
          <div className="pt-stack-xs border-t border-purple-100">
            <p className="text-caption text-purple-600 mb-1 font-medium flex items-center gap-1"><FaGraduationCap className="w-3.5 h-3.5" /> 適用場景：</p>
            <ul className="text-caption text-gray-700 space-y-1">
              <li className="flex items-start">
                <span className="mr-1.5 text-purple-500 mt-0.5">•</span>
                <span>階段性學習總結與反思</span>
              </li>
              <li className="flex items-start">
                <span className="mr-1.5 text-purple-500 mt-0.5">•</span>
                <span>重大突破或困難的深度剖析</span>
              </li>
              <li className="flex items-start">
                <span className="mr-1.5 text-purple-500 mt-0.5">•</span>
                <span>建立跨領域知識連結</span>
              </li>
            </ul>
          </div>

          {/* 按鈕區 */}
          <button className="w-full mt-stack-base py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium rounded-lg transition-all duration-fast flex items-center justify-center gap-2 group-hover:shadow-md">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            撰寫 5Rs 反思
          </button>
        </div>
      </motion.div>
    </div>
  );
}
