import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiChevronDown, FiChevronUp, FiHelpCircle, FiCheck, FiX, FiRefreshCw } from 'react-icons/fi';
import { AiOutlineRobot } from 'react-icons/ai';
import { FIVE_R_FRAMEWORK, build5RsContent, validate5RsData } from '@/utils/5RsUtils.js';
import { analyze5RsReflection } from '@/api/llm5Rs.js';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

const FiveRsReflectionForm = ({ 
  initialData = {}, 
  onSave, 
  onCancel, 
  isEditing = false,
  title = "",
  onTitleChange,
  attachFile = null,
  onFileChange,
  existingRecord = null,
  onRemoveAttachment = null
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [expandedSections, setExpandedSections] = useState({ 0: true });
  const [showGuidingQuestions, setShowGuidingQuestions] = useState({});
  const [data, setData] = useState({
    reporting: '',
    responding: '',
    relating: '',
    reasoning: '',
    reconstructing: ''
  });
  const [feedback, setFeedback] = useState(null); // 儲存 AI 分析結果
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiProvider, setAiProvider] = useState('auto');

  const steps = Object.keys(FIVE_R_FRAMEWORK);

  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setData(prev => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  const handleStepClick = (stepIndex) => {
    setCurrentStep(stepIndex);
    setExpandedSections(prev => ({
      ...prev,
      [stepIndex]: !prev[stepIndex]
    }));
  };

  const handleInputChange = (field, value) => {
    setData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const toggleGuidingQuestions = (field) => {
    setShowGuidingQuestions(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const isStepCompleted = (field) => {
    return data[field] && data[field].trim().length > 0;
  };

  const getCompletedSteps = () => {
    return steps.filter(step => isStepCompleted(step)).length;
  };

  // 格式化 AI 分析結果為 HTML
  const formatAnalysisResult = (feedback, provider) => {
    let htmlContent = `
      <div style="text-align: left; max-height: 400px; overflow-y: auto;">
        <div style="margin-bottom: 16px; padding: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; color: white;">
          <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: bold;">🤖 AI 分析報告</h3>
          <p style="margin: 0; font-size: 14px; opacity: 0.9;">使用模型：${provider || 'AI'}</p>
        </div>
    `;

    // 整體評估
    if (feedback.overall_assessment) {
      htmlContent += `
        <div style="margin-bottom: 16px; padding: 12px; background: #f8fafc; border-left: 4px solid #3b82f6; border-radius: 4px;">
          <h4 style="margin: 0 0 8px 0; color: #1e40af; font-size: 16px;">📊 整體評估</h4>
          <p style="margin: 0; color: #374151; line-height: 1.5;">${feedback.overall_assessment}</p>
        </div>
      `;
    }

    // 建議列表
    if (feedback.suggestions && feedback.suggestions.length > 0) {
      htmlContent += `
        <div style="margin-bottom: 16px; padding: 12px; background: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 4px;">
          <h4 style="margin: 0 0 12px 0; color: #15803d; font-size: 16px;">💡 個人化建議</h4>
          <ul style="margin: 0; padding-left: 20px; color: #374151;">
      `;
      feedback.suggestions.forEach(suggestion => {
        htmlContent += `<li style="margin-bottom: 8px; line-height: 1.5;">${suggestion}</li>`;
      });
      htmlContent += `</ul></div>`;
    }

    // 強項
    if (feedback.strengths && feedback.strengths.length > 0) {
      htmlContent += `
        <div style="margin-bottom: 16px; padding: 12px; background: #fefce8; border-left: 4px solid #eab308; border-radius: 4px;">
          <h4 style="margin: 0 0 12px 0; color: #a16207; font-size: 16px;">⭐ 發現的強項</h4>
          <ul style="margin: 0; padding-left: 20px; color: #374151;">
      `;
      feedback.strengths.forEach(strength => {
        htmlContent += `<li style="margin-bottom: 8px; line-height: 1.5;">${strength}</li>`;
      });
      htmlContent += `</ul></div>`;
    }

    // 改進建議
    if (feedback.improvements && feedback.improvements.length > 0) {
      htmlContent += `
        <div style="margin-bottom: 16px; padding: 12px; background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px;">
          <h4 style="margin: 0 0 12px 0; color: #dc2626; font-size: 16px;">🎯 改進方向</h4>
          <ul style="margin: 0; padding-left: 20px; color: #374151;">
      `;
      feedback.improvements.forEach(improvement => {
        htmlContent += `<li style="margin-bottom: 8px; line-height: 1.5;">${improvement}</li>`;
      });
      htmlContent += `</ul></div>`;
    }

    // 分析時間
    if (feedback.analysisDate) {
      const date = new Date(feedback.analysisDate);
      htmlContent += `
        <div style="margin-top: 16px; padding: 8px; background: #f9fafb; border-radius: 4px; text-align: center;">
          <small style="color: #6b7280;">分析時間：${date.toLocaleString('zh-TW')}</small>
        </div>
      `;
    }

    htmlContent += `</div>`;
    return htmlContent;
  };

  const handleSave = () => {
    const validation = validate5RsData(data);
    if (!validation.isValid) {
      toast.error(validation.errors[0]);
      return;
    }

    // 建構包含 AI 反饋的內容
    const content = build5RsContent(data, feedback);
    onSave({
      title,
      content,
      attachFile // 將檔案資訊傳遞給父組件
    });
  };

  const handleAIAnalysis = async () => {
    console.log('=== 5Rs 表單 AI 分析開始 ===');
    
    const completedSteps = getCompletedSteps();
    console.log('已完成步驟數:', completedSteps);
    console.log('當前反思資料:', data);
    
    if (completedSteps < 3) {
      console.log('步驟不足，需要至少 3 個步驟');
      toast.error('請至少完成 3 個部分再請求 AI 分析');
      return;
    }

    setIsAnalyzing(true);
    console.log('開始 AI 分析，使用提供者:', aiProvider);
    
    try {
      console.log('呼叫 AI 分析 API，資料:', data);
      const result = await analyze5RsReflection(data, aiProvider);
      console.log('AI 分析 API 回應:', result);
      
      if (result.success) {
        console.log('AI 分析成功！');
        console.log('使用的提供者:', result.provider);
        console.log('AI 回饋內容:', result.feedback);
        
        // 保存 AI 分析結果
        const feedbackData = {
          ...result.feedback,
          provider: result.provider,
          analysisDate: result.analysisDate || new Date().toISOString()
        };
        
        console.log('保存的回饋資料:', feedbackData);
        setFeedback(feedbackData);
        
        // 使用 SweetAlert2 顯示分析結果
        Swal.fire({
          title: '🎉 AI 分析完成！',
          html: formatAnalysisResult(result.feedback, result.provider),
          icon: 'success',
          width: '800px',
          padding: '20px',
          showCloseButton: true,
          showConfirmButton: true,
          confirmButtonText: '我知道了',
          confirmButtonColor: '#10b981',
          customClass: {
            container: 'custom-swal-container',
            popup: 'custom-swal-popup',
            content: 'custom-swal-content'
          },
          backdrop: `
            rgba(0,0,0,0.4)
            left top
            no-repeat
          `
        });
        
        // 簡化的 toast 通知
        toast.success(`AI 分析完成！使用 ${result.provider}`);
      } else {
        console.error('AI 分析失敗:', result);
        toast.error('AI 分析失敗');
      }
    } catch (error) {
      console.error('AI 分析過程發生錯誤:', error);
      toast.error('AI 分析過程中發生錯誤');
    } finally {
      setIsAnalyzing(false);
      console.log('=== 5Rs 表單 AI 分析結束 ===');
    }
  };

  const progressPercentage = (getCompletedSteps() / steps.length) * 100;

  return (
    <>
      <style>
        {`
          .custom-swal-container .swal2-popup {
            border-radius: 16px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          }
          .custom-swal-content {
            padding: 0 !important;
          }
          .custom-swal-popup .swal2-title {
            font-size: 24px;
            font-weight: 700;
            color: #1f2937;
            margin-bottom: 16px;
          }
          .custom-swal-popup .swal2-html-container {
            margin: 0;
            padding: 0;
          }
          .custom-swal-popup .swal2-confirm {
            border-radius: 8px;
            padding: 12px 24px;
            font-weight: 600;
            transition: all 0.2s;
          }
          .custom-swal-popup .swal2-confirm:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
          }
        `}
      </style>
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg">
      {/* 標題輸入 */}
      <div className="mb-6">
        <label className="block text-lg font-semibold text-gray-700 mb-2">
          反思日誌標題
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="請輸入日誌標題..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
      </div>

      {/* 進度條 */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            進度: {getCompletedSteps()}/{steps.length}
          </span>
          <span className="text-sm text-gray-500">
            {Math.round(progressPercentage)}% 完成
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <motion.div
            className="bg-teal-500 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* 檔案上傳區域 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          附件檔案 (可選)
        </label>
        <input
          type="file"
          multiple
          onChange={onFileChange}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
        />
        {/* 現有附件（編輯時） */}
        {isEditing && existingRecord && (existingRecord.fileName || existingRecord.fileData) && (
          <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="text-sm text-gray-700 break-all">
              附件：{existingRecord.originalName || existingRecord.filename || existingRecord.fileName}
            </div>
            <div className="flex gap-2">
              <a
                href={existingRecord.fileName ? `http:localhost/api/file/direct/${existingRecord.fileName}` : undefined}
                onClick={(e) => {
                  if (!existingRecord.fileName && existingRecord.fileData) {
                    e.preventDefault();
                    const buffer = new Uint8Array(existingRecord.fileData.data);
                    const blob = new Blob([buffer], { type: "application/octet-stream" });
                    import('js-file-download').then(({ default: FileDownload }) => {
                      FileDownload(blob, existingRecord.filename || existingRecord.originalName || 'downloaded-file');
                    });
                  }
                }}
                className="px-3 py-1 bg-teal-600 text-white rounded hover:bg-teal-700 text-sm text-center"
              >
                下載附件
              </a>
              {typeof onRemoveAttachment === 'function' && (
                <button
                  onClick={onRemoveAttachment}
                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                >
                  刪除附件
                </button>
              )}
            </div>
          </div>
        )}
        {attachFile && attachFile.length > 0 && (
          <div className="mt-2">
            <p className="text-sm text-gray-600">已選擇 {attachFile.length} 個檔案：</p>
            <ul className="text-sm text-gray-500 ml-4">
              {Array.from(attachFile).map((file, index) => (
                <li key={index} className="list-disc">
                  {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 5Rs 步驟 */}
      <div className="space-y-4">
        {steps.map((step, index) => {
          const framework = FIVE_R_FRAMEWORK[step];
          const isExpanded = expandedSections[index];
          const isCompleted = isStepCompleted(step);
          const isCurrent = currentStep === index;

          return (
            <motion.div
              key={step}
              className={`border rounded-lg transition-all duration-200 ${
                isCurrent ? 'border-teal-500 shadow-md' : 'border-gray-200'
              }`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              {/* 步驟標題 */}
              <div
                className={`flex items-center justify-between p-4 cursor-pointer ${
                  isCurrent ? 'bg-teal-50' : 'bg-gray-50'
                }`}
                onClick={() => handleStepClick(index)}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isCompleted ? 'bg-green-500 text-white' : 
                    isCurrent ? 'bg-teal-500 text-white' : 'bg-gray-300 text-gray-600'
                  }`}>
                    {isCompleted ? <FiCheck /> : index + 1}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">
                      {framework.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {framework.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleGuidingQuestions(step);
                    }}
                    className="p-1 hover:bg-gray-200 rounded"
                    title="顯示引導問題"
                  >
                    <FiHelpCircle className="w-4 h-4 text-gray-500" />
                  </button>
                  {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                </div>
              </div>

              {/* 引導問題 */}
              {showGuidingQuestions[step] && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-4 py-2 bg-blue-50 border-t border-blue-100"
                >
                  <h4 className="text-sm font-medium text-blue-800 mb-2">引導問題：</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    {framework.guidingQuestions.map((question, qIndex) => (
                      <li key={qIndex} className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>{question}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {/* 輸入區域 */}
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 border-t border-gray-100"
                >
                  <textarea
                    value={data[step]}
                    onChange={(e) => handleInputChange(step, e.target.value)}
                    placeholder={framework.placeholder}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                  />
                  <div className="mt-2 text-xs text-gray-500">
                    {data[step].length} 字
                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* AI 分析區域 */}
      {getCompletedSteps() >= 3 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AiOutlineRobot className="w-5 h-5 text-purple-600" />
              <span className="font-medium text-purple-800">AI 智能分析</span>
            </div>
            <div className="flex items-center space-x-2">
              <select
                value={aiProvider}
                onChange={(e) => setAiProvider(e.target.value)}
                className="text-xs border border-purple-300 rounded px-2 py-1"
              >
                <option value="auto">自動選擇</option>
                <option value="gpt">gpt-4o-mini</option>
                <option value="gemini">gemini-2.0-flash</option>
                {/* <option value="gpt-nano">gpt-4.1-nano</option> */}
              </select>
              <button
                onClick={handleAIAnalysis}
                disabled={isAnalyzing}
                className="flex items-center space-x-1 px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 text-sm"
              >
                {isAnalyzing ? (
                  <>
                    <FiRefreshCw className="w-4 h-4 animate-spin" />
                    <span>分析中...</span>
                  </>
                ) : (
                  <>
                    <AiOutlineRobot className="w-4 h-4" />
                    <span>請求 AI 分析</span>
                  </>
                )}
              </button>
            </div>
          </div>
          <p className="text-sm text-purple-700 mt-2">
            AI 將根據 5Rs 框架分析您的反思內容，並提供個人化的學習建議。
          </p>
        </motion.div>
      )}

      {/* 操作按鈕 */}
      <div className="flex justify-end space-x-3 mt-6">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          取消
        </button>
        <button
          onClick={handleSave}
          disabled={getCompletedSteps() === 0}
          className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isEditing ? '更新' : '儲存'}反思日誌
        </button>
      </div>
    </div>
    </>
  );
};

export default FiveRsReflectionForm;
