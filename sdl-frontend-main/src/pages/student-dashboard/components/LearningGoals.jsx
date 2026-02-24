import React from 'react';
import { FiZap, FiFileText, FiCheckCircle } from 'react-icons/fi';
import { FaFire } from 'react-icons/fa';
import { getPriorityColor } from '../utils';

/**
 * 學習目標組件
 * @param {array} learningGoals - 學習目標數據
 * @returns {JSX.Element} 學習目標列表
 */
const LearningGoals = ({ learningGoals }) => {
  return (
    <div className="bg-white p-component-sm sm:p-component-md-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
      <h2 className="text-body-lg sm:text-h3 font-semibold text-gray-800 mb-4 flex items-center">
        <span className="w-1 h-6 bg-gradient-to-b from-customgreen to-teal-600 rounded-full mr-3"></span>
        我的學習目標
      </h2>
      <div className="space-y-3 sm:space-y-stack-sm max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-customgreen scrollbar-track-gray-100">
        {Array.isArray(learningGoals) && learningGoals.map((goal) => {
          const isDone = Number(goal.progress) >= 100;
          const deadlineText = goal.deadline ? new Date(goal.deadline).toLocaleDateString('zh-TW') : '—';
          const current = goal.current ?? null;
          const target = goal.target ?? null;
          return (
          <div key={goal.id} className="relative bg-gradient-to-r from-teal-50/50 to-white border border-teal-100 hover:border-teal-200 rounded-lg p-component-sm sm:p-component-base hover:shadow-md transition-all duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 space-y-stack-xs sm:space-y-0">
              <h3 className="font-semibold text-gray-800 text-body-sm sm:text-body flex items-center">
                <span className="w-2 h-2 bg-customgreen rounded-full mr-2"></span>
                {goal.title}
              </h3>
              <span className={`px-3 py-1 rounded-full text-caption font-semibold self-start shadow-sm inline-flex items-center gap-1 ${getPriorityColor(goal.priority)}`}>
                {goal.priority === 'high' ? <><FaFire className="w-3 h-3" /> 高優先級</> :
                 goal.priority === 'medium' ? <><FiZap className="w-3 h-3" /> 中優先級</> : <><FiFileText className="w-3 h-3" /> 低優先級</>}
              </span>
            </div>
            <div className="mb-3">
              <div className="flex justify-between text-caption sm:text-body-sm text-gray-600 mb-2">
                <span className="flex items-center font-medium">
                  <span className="w-1 h-1 bg-teal-500 rounded-full mr-1"></span>
                  進度
                </span>
                <span className="font-semibold text-teal-700">
                  {goal.progress}%
                  {(current != null && target != null) && (
                    <span className="text-[10px] sm:text-caption text-gray-400 ml-2 bg-gray-100 px-1 py-0.5 rounded">({current}/{target})</span>
                  )}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
                <div
                  className={`h-3 rounded-full transition-all duration-500 shadow-sm ${
                    isDone ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-customgreen to-teal-600'
                  }`}
                  style={{ width: `${goal.progress}%` }}
                ></div>
              </div>
            </div>
            <div className="text-caption text-gray-600 flex items-center justify-between bg-gray-50 rounded-lg p-component-xs">
              <span className="flex items-center">
                <span className="w-1 h-1 bg-gray-400 rounded-full mr-1"></span>
                截止日期: <span className="font-medium ml-1">{deadlineText}</span>
              </span>
              {isDone && (
                <span className="text-green-600 font-bold bg-green-100 px-2 py-1 rounded-full text-[10px] sm:text-caption inline-flex items-center gap-1">
                  達成 <FiCheckCircle className="w-3 h-3" />
                </span>
              )}
            </div>
            {isDone && (
              <div className="absolute top-2 right-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              </div>
            )}
          </div>
        )})}
      </div>
    </div>
  );
};

export default LearningGoals;
