import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiChevronDown, FiChevronUp, FiMessageCircle, FiClock, FiUser } from 'react-icons/fi';
import { AiOutlineRobot } from 'react-icons/ai';
import { format5RsForDisplay } from '@/utils/5RsUtils.js';

const FiveRsReflectionDisplay = ({ content, showFeedback = true, isTeacher = false }) => {
  const [expandedSections, setExpandedSections] = useState({});
  
  const reflectionData = format5RsForDisplay(content);
  
  if (!reflectionData) {
    return (
      <div className="p-4 text-center text-gray-500">
        無法解析 5Rs 反思內容
      </div>
    );
  }

  const { sections, overallFeedback, suggestions, hasOverallFeedback, provider, analysisDate, completeness } = reflectionData;

  const toggleSection = (sectionKey) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('zh-TW');
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg">
      {/* 完成度概覽 */}
      <div className="mb-6 p-4 bg-gradient-to-r from-teal-50 to-blue-50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-800">5Rs 反思概覽</h3>
          <span className="text-sm text-gray-600">
            完成度: {completeness.completed}/{completeness.total} ({completeness.percentage}%)
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-teal-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${completeness.percentage}%` }}
          />
        </div>
      </div>

      {/* 5Rs 內容展示 */}
      <div className="space-y-4">
        {Object.entries(sections).map(([key, section]) => (
          <motion.div
            key={key}
            className="border border-gray-200 rounded-lg overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Object.keys(sections).indexOf(key) * 0.1 }}
          >
            {/* 區段標題 */}
            <div
              className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${
                section.hasContent ? 'bg-gray-50 hover:bg-gray-100' : 'bg-red-50 hover:bg-red-100'
              }`}
              onClick={() => toggleSection(key)}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold ${
                  section.hasContent ? 'bg-green-500' : 'bg-red-400'
                }`}>
                  {section.hasContent ? '✓' : '!'}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">{section.title}</h4>
                  {!section.hasContent && (
                    <p className="text-sm text-red-600">此部分尚未完成</p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {section.hasFeedback && (
                  <FiMessageCircle className="w-4 h-4 text-blue-500" title="有回饋" />
                )}
                {expandedSections[key] ? <FiChevronUp /> : <FiChevronDown />}
              </div>
            </div>

            {/* 內容展示 */}
            {expandedSections[key] && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t border-gray-200"
              >
                {/* 學生內容 */}
                {section.hasContent ? (
                  <div className="p-4 bg-white">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">學生反思：</h5>
                    <div className="prose prose-sm max-w-none">
                      <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                        {section.content}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50">
                    <p className="text-gray-500 italic">此部分尚未填寫內容</p>
                  </div>
                )}

                {/* AI 回饋內容 */}
                {showFeedback && section.hasFeedback && (
                  <div className="p-4 bg-blue-50 border-t border-blue-100">
                    <div className="flex items-center space-x-2 mb-2">
                      <AiOutlineRobot className="w-4 h-4 text-blue-600" />
                      <h5 className="text-sm font-medium text-blue-800">AI 分析回饋：</h5>
                    </div>
                    <div className="prose prose-sm max-w-none">
                      <p className="text-blue-800 whitespace-pre-wrap leading-relaxed">
                        {section.feedback}
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>

      {/* 整體回饋區域 */}
      {showFeedback && (hasOverallFeedback || suggestions.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200"
        >
          <div className="flex items-center space-x-2 mb-3">
            <AiOutlineRobot className="w-5 h-5 text-purple-600" />
            <h4 className="text-lg font-semibold text-purple-800">AI 整體分析回饋</h4>
            {provider && (
              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                {provider}
              </span>
            )}
          </div>

          {/* AI 分析資訊 */}
          {(provider || analysisDate) && (
            <div className="flex items-center space-x-4 mb-3 text-sm text-purple-700">
              {provider && (
                <div className="flex items-center space-x-1">
                  <AiOutlineRobot className="w-4 h-4" />
                  <span>分析引擎: {provider}</span>
                </div>
              )}
              {analysisDate && (
                <div className="flex items-center space-x-1">
                  <FiClock className="w-4 h-4" />
                  <span>分析時間: {formatDate(analysisDate)}</span>
                </div>
              )}
            </div>
          )}

          {/* 整體回饋 */}
          {hasOverallFeedback && (
            <div className="mb-4">
              <h5 className="font-medium text-purple-800 mb-2">整體評估：</h5>
              <div className="prose prose-sm max-w-none">
                <p className="text-purple-700 whitespace-pre-wrap leading-relaxed">
                  {overallFeedback}
                </p>
              </div>
            </div>
          )}

          {/* 改進建議 */}
          {suggestions.length > 0 && (
            <div>
              <h5 className="font-medium text-purple-800 mb-2">改進建議：</h5>
              <ul className="space-y-1">
                {suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start space-x-2 text-purple-700">
                    <span className="mt-1.5 w-1.5 h-1.5 bg-purple-400 rounded-full flex-shrink-0" />
                    <span className="text-sm leading-relaxed">{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      )}

      {/* 教師回饋編輯區（如果是教師且沒有回饋） */}
      {isTeacher && !hasOverallFeedback && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200"
        >
          <h4 className="text-lg font-semibold text-yellow-800 mb-2">教師回饋區域</h4>
          <p className="text-sm text-yellow-700 mb-3">
            您可以為這份 5Rs 反思提供專業的教學回饋，幫助學生進行更深層次的思考。
          </p>
          <button className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors">
            新增回饋
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default FiveRsReflectionDisplay;
