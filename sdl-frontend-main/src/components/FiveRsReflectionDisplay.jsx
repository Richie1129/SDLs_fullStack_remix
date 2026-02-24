import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiChevronDown, FiChevronUp, FiMessageCircle, FiClock, FiUser } from 'react-icons/fi';
import { AiOutlineRobot } from 'react-icons/ai';
import { format5RsForDisplay } from '@/utils/5RsUtils.js';
import { buildFileDownloadUrl, downloadFileWithAuth } from '@/utils/fileUrlBuilder.js';

const FiveRsReflectionDisplay = ({ content, showFeedback = true, isTeacher = false, record = null }) => {
  const [expandedSections, setExpandedSections] = useState({});
  
  const reflectionData = format5RsForDisplay(content);
  
  if (!reflectionData) {
    return (
      <div className="p-component-base text-center text-gray-500">
        無法解析 5Rs 反思內容
      </div>
    );
  }

  const { sections, overallFeedback, suggestions, hasOverallFeedback, provider, analysisDate, completeness, overallAssessment, strengths, improvements } = reflectionData;

  // 針對附件的下載處理（支援 MinIO 與舊有 BLOB）
  const handleDownload = () => {
    if (!record) return;

    if (record.fileName) {
      downloadFileWithAuth(record.fileName, record.originalName || record.filename);
    } else if (record.fileData && record.fileData.data) {
      const buffer = new Uint8Array(record.fileData.data);
      const blob = new Blob([buffer], { type: "application/octet-stream" });
      // 延後載入以符合舊有行為（僅在需要時才載入套件）
      import('js-file-download').then(({ default: FileDownload }) => {
        FileDownload(blob, record.filename || record.originalName || "downloaded-file");
      });
    }
  };

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
      <div className="mb-6 p-component-base bg-gradient-to-r from-teal-50 to-blue-50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-body-lg font-semibold text-gray-800">5Rs 反思概覽</h3>
          <span className="text-body-sm text-gray-600">
            完成度: {completeness.completed}/{completeness.total} ({completeness.percentage}%)
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-teal-500 h-2 rounded-full transition-all duration-slow"
            style={{ width: `${completeness.percentage}%` }}
          />
        </div>
      </div>

      {/* 5Rs 內容展示 */}
      <div className="space-y-stack-sm">
        {/* 附件區塊（如果有附件） */}
        {record && (record.fileName || record.fileData) && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-component-base bg-gray-50">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-teal-500 text-white flex items-center justify-center text-body-sm font-semibold">檔</div>
                <div>
                  <h4 className="font-semibold text-gray-800">附件</h4>
                  <p className="text-body-sm text-gray-600 break-all">{record.originalName || record.filename || record.fileName}</p>
                </div>
              </div>
              <button
                onClick={handleDownload}
                className="inline-flex items-center px-3 py-1 bg-teal-600 text-white rounded hover:bg-teal-700 text-body-sm"
              >
                下載附件
              </button>
            </div>
          </div>
        )}

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
              className={`flex items-center justify-between p-component-base cursor-pointer transition-colors ${
                section.hasContent ? 'bg-gray-50 hover:bg-gray-100' : 'bg-red-50 hover:bg-red-100'
              }`}
              onClick={() => toggleSection(key)}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-body-sm font-semibold ${
                  section.hasContent ? 'bg-green-500' : 'bg-red-400'
                }`}>
                  {section.hasContent ? '✓' : '!'}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">{section.title}</h4>
                  {!section.hasContent && (
                    <p className="text-body-sm text-red-600">此部分尚未完成</p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-stack-xs">
                {typeof section.score === 'number' && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-caption rounded-full" title="反思深度分數">
                    分數 {section.score}/5
                  </span>
                )}
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
                  <div className="p-component-base bg-white">
                    <h5 className="text-body-sm font-medium text-gray-700 mb-2">學生反思：</h5>
                    <div className="prose prose-sm max-w-none">
                      <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                        {section.content}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-component-base bg-gray-50">
                    <p className="text-gray-500 italic">此部分尚未填寫內容</p>
                  </div>
                )}

                {/* AI 回饋內容 */}
                {showFeedback && section.hasFeedback && (
                  <div className="p-component-base bg-blue-50 border-t border-blue-100">
                    <div className="flex items-center space-x-stack-xs mb-2">
                      <AiOutlineRobot className="w-4 h-4 text-blue-600" />
                      <h5 className="text-body-sm font-medium text-blue-800">AI 分析回饋：</h5>
                    </div>
                    <div className="prose prose-sm max-w-none">
                      <p className="text-blue-800 whitespace-pre-wrap leading-relaxed">
                        {section.feedback}
                      </p>
                    </div>
                    {/* 引導問題 */}
                    {Array.isArray(section.questions) && section.questions.length > 0 && (
                      <div className="mt-3">
                        <h6 className="text-caption font-medium text-blue-800 mb-1">引導問題：</h6>
                        <ul className="list-disc list-inside text-blue-800 text-body-sm space-y-1">
                          {section.questions.map((q, idx) => (
                            <li key={idx}>{q}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {/* 建議模板 */}
                    {section.template && (
                      <div className="mt-3 p-component-xs bg-white border border-blue-100 rounded">
                        <h6 className="text-caption font-medium text-blue-800 mb-1">建議填寫模板：</h6>
                        <p className="text-blue-800 text-body-sm whitespace-pre-wrap">{section.template}</p>
                      </div>
                    )}
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
          className="mt-6 p-component-base bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200"
        >
          <div className="flex items-center space-x-stack-xs mb-3">
            <AiOutlineRobot className="w-5 h-5 text-purple-600" />
            <h4 className="text-body-lg font-semibold text-purple-800">AI 整體分析回饋</h4>
            {provider && (
              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-caption rounded-full">
                {provider}
              </span>
            )}
          </div>

          {/* 精煉總結 */}
          {overallAssessment && (
            <div className="mb-4 p-component-sm bg-purple-50 border border-purple-100 rounded">
              <h5 className="font-medium text-purple-800 mb-1">精煉總結：</h5>
              <p className="text-purple-700 text-body-sm whitespace-pre-wrap">{overallAssessment}</p>
            </div>
          )}

          {/* AI 分析資訊 */}
          {(provider || analysisDate) && (
            <div className="flex items-center space-x-stack-sm mb-3 text-body-sm text-purple-700">
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

          {/* 強項 */}
          {Array.isArray(strengths) && strengths.length > 0 && (
            <div className="mb-4">
              <h5 className="font-medium text-purple-800 mb-2">發現的強項：</h5>
              <ul className="space-y-1">
                {strengths.map((s, i) => (
                  <li key={i} className="flex items-start space-x-stack-xs text-purple-700">
                    <span className="mt-1.5 w-1.5 h-1.5 bg-purple-400 rounded-full flex-shrink-0" />
                    <span className="text-body-sm leading-relaxed">{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 改進方向 */}
          {Array.isArray(improvements) && improvements.length > 0 && (
            <div className="mb-4">
              <h5 className="font-medium text-purple-800 mb-2">改進方向：</h5>
              <ul className="space-y-1">
                {improvements.map((im, i) => (
                  <li key={i} className="flex items-start space-x-stack-xs text-purple-700">
                    <span className="mt-1.5 w-1.5 h-1.5 bg-purple-400 rounded-full flex-shrink-0" />
                    <span className="text-body-sm leading-relaxed">{im}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 改進建議 */}
          {suggestions.length > 0 && (
            <div>
              <h5 className="font-medium text-purple-800 mb-2">改進建議：</h5>
              <ul className="space-y-1">
                {suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start space-x-stack-xs text-purple-700">
                    <span className="mt-1.5 w-1.5 h-1.5 bg-purple-400 rounded-full flex-shrink-0" />
                    <span className="text-body-sm leading-relaxed">{suggestion}</span>
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
          className="mt-6 p-component-base bg-yellow-50 rounded-lg border border-yellow-200"
        >
          <h4 className="text-body-lg font-semibold text-yellow-800 mb-2">教師回饋區域</h4>
          <p className="text-body-sm text-yellow-700 mb-3">
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
