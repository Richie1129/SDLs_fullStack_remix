import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiChevronDown, FiHelpCircle, FiCheck, FiRefreshCw, FiCpu, FiZap, FiSliders, FiShield } from 'react-icons/fi';
import { AiOutlineRobot } from 'react-icons/ai';
import { FIVE_R_FRAMEWORK, build5RsContent, validate5RsData, MIN_REQUIRED_FIELDS, R_TIERS, checkFieldQuality, MIN_FIELD_CHARS } from '@/utils/5RsUtils.js';
import { analyze5RsReflection } from '@/api/llm5Rs.js';
import { buildFileDownloadUrl, downloadFileWithAuth } from '@/utils/fileUrlBuilder.js';
import StageSelector from '@/components/reflection/StageSelector';
import StageReflectionGuide from '@/components/reflection/StageReflectionGuide';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { formatAnalysisResult } from '@/utils/formatAnalysisResult';

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
  onRemoveAttachment = null,
  stage = '',
  onStageChange,
  recommendedStage = null,
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

  // 獲取 AI 模型對應的圖示
  const getProviderIcon = (provider) => {
    switch (provider) {
      case 'auto':
        return <FiCpu className="w-4 h-4" />;
      case 'gemma-4':
        return <FiZap className="w-4 h-4" />;
      case 'gpt-oss-20b':
        return <FiSliders className="w-4 h-4" />;
      case 'gemini':
        return <FiShield className="w-4 h-4" />;
      default:
        return <FiCpu className="w-4 h-4" />;
    }
  };

  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setData(prev => ({ ...prev, ...initialData }));
    } else {
      // 新建模式：重置為空白表單
      setData({
        reporting: '',
        responding: '',
        relating: '',
        reasoning: '',
        reconstructing: ''
      });
      setFeedback(null);
      setCurrentStep(0);
      setExpandedSections({ 0: true });
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
    return data[field] && data[field].trim().length > 0 && checkFieldQuality(data[field]).valid;
  };

  const getCompletedSteps = () => {
    return steps.filter(step => isStepCompleted(step)).length;
  };

  // 格式化 AI 分析結果為 HTML

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
      attachFile, // 將檔案資訊傳遞給父組件
      stage, // 傳遞階段資訊
    });
  };

  const handleAIAnalysis = async () => {
    console.log('=== 5Rs 表單 AI 分析開始 ===');
    
    const completedSteps = getCompletedSteps();
    console.log('已完成步驟數:', completedSteps);
    console.log('當前反思資料:', data);
    
    if (completedSteps < MIN_REQUIRED_FIELDS) {
      console.log('步驟不足，需要至少', MIN_REQUIRED_FIELDS, '個步驟');
      toast.error(`請至少完成 ${MIN_REQUIRED_FIELDS} 個部分再請求 AI 分析`);
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
          title: 'AI 分析完成！',
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
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
          }
        `}
      </style>
      <div className="flex flex-col">
      <div className="px-3 sm:px-6 py-3 sm:py-5">
      
      {/* 基本資訊區塊 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* 標題輸入 */}
        <div>
          <label className="block text-body font-semibold text-gray-800 mb-2">
            反思日誌標題
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="請輸入日誌標題..."
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-fast bg-gray-50 focus:bg-white"
          />
        </div>
        
        {/* 階段選擇器 */}
        {onStageChange && (
          <StageSelector
            value={stage}
            onChange={onStageChange}
            recommendedStage={recommendedStage}
          />
        )}
      </div>
      
      {/* 階段反思引導 */}
      <StageReflectionGuide stage={stage} />

      {/* 進度條 - 更精緻的設計 */}
      <div className="mb-6 p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border border-gray-100">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
            <span className="text-body-sm font-semibold text-gray-700">
              填寫進度
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-body-sm text-gray-500">
              {getCompletedSteps()}/{steps.length} 區塊
            </span>
            <span className="text-body-sm font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
              {Math.round(progressPercentage)}%
            </span>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
          <motion.div
            className="bg-gradient-to-r from-teal-400 to-teal-600 h-2.5 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* 檔案上傳區域 - 可收合 */}
      <details className="mb-6 group">
        <summary className="flex items-center gap-2 cursor-pointer text-body-sm font-medium text-gray-600 hover:text-gray-800 transition-colors">
          <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          附件檔案
          <span className="text-caption text-gray-400 font-normal">（選填）</span>
          {attachFile && attachFile.length > 0 && (
            <span className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full text-caption font-medium">
              {attachFile.length} 個檔案
            </span>
          )}
        </summary>
        
        <div className="mt-3 pl-6">
          <input
            type="file"
            multiple
            onChange={onFileChange}
            className="block w-full text-body-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-body-sm file:font-medium file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 file:cursor-pointer file:transition-colors"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,.mp4,.mpeg,.mov,.avi,.webm,.mp3,.wav,.ogg,.m4a,.zip,.rar"
          />
          <p className="mt-1.5 text-caption text-gray-400">
            支援文件、圖片、影片、音訊 | 單檔最大 100MB | 最多 10 個
          </p>
          
          {/* 現有附件（編輯時） */}
          {isEditing && existingRecord && (existingRecord.fileName || existingRecord.fileData) && (
            <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="text-body-sm text-gray-700 break-all truncate">
                {existingRecord.originalName || existingRecord.filename || existingRecord.fileName}
              </div>
              <div className="flex gap-2 shrink-0">
                <a
                  href="#"
                  onClick={async (e) => {
                    e.preventDefault();
                    if (existingRecord.fileName) {
                      await downloadFileWithAuth(existingRecord.fileName, existingRecord.originalName || existingRecord.filename);
                    } else if (existingRecord.fileData) {
                      const buffer = new Uint8Array(existingRecord.fileData.data);
                      const blob = new Blob([buffer], { type: "application/octet-stream" });
                      import('js-file-download').then(({ default: FileDownload }) => {
                        FileDownload(blob, existingRecord.filename || existingRecord.originalName || 'downloaded-file');
                      });
                    }
                  }}
                  className="px-3 py-1.5 bg-teal-600 text-white rounded-md hover:bg-teal-700 text-caption font-medium transition-colors"
                >
                  下載
                </a>
                {typeof onRemoveAttachment === 'function' && (
                  <button
                    onClick={onRemoveAttachment}
                    className="px-3 py-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 text-caption font-medium transition-colors"
                  >
                    刪除
                  </button>
                )}
              </div>
            </div>
          )}
          
          {/* 已選擇的檔案列表 */}
          {attachFile && attachFile.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {Array.from(attachFile).map((file, index) => (
                <span key={index} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-full text-caption text-gray-600">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {file.name}
                  <span className="text-gray-400">({(file.size / 1024).toFixed(0)} KB)</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </details>

      {/* 5Rs 步驟區塊標題 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center justify-center w-8 h-8 bg-teal-100 rounded-lg">
          <span className="text-body font-bold text-teal-600">5R</span>
        </div>
        <div>
          <h3 className="text-body font-semibold text-gray-800">反思架構</h3>
          <p className="text-caption text-gray-500">至少填寫 {MIN_REQUIRED_FIELDS} 個層次即可儲存，挑戰更多層次能深化反思</p>
        </div>
      </div>

      {/* 5Rs 步驟 */}
      <div className="space-y-3">
        {/* 基礎層分隔標題 */}
        <div className="flex items-center gap-2 px-1">
          <span className="text-caption font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded">建議填寫</span>
          <div className="flex-1 border-t border-teal-200" />
        </div>

        {steps.map((step, index) => {
          const framework = FIVE_R_FRAMEWORK[step];
          const isExpanded = expandedSections[index];
          const isCompleted = isStepCompleted(step);
          const isCurrent = currentStep === index;
          const isFirstAdvanced = R_TIERS.advanced[0] === step;

          return (
            <React.Fragment key={step}>
            {/* 進階層分隔標題 */}
            {isFirstAdvanced && (
              <div className="flex items-center gap-2 px-1 mt-2">
                <span className="text-caption font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded">進階反思（選填）</span>
                <div className="flex-1 border-t border-purple-200" />
              </div>
            )}
            <motion.div
              className={`border rounded-xl transition-all duration-fast overflow-hidden ${
                isCurrent ? 'border-teal-400 shadow-sm ring-1 ring-teal-100' : 
                isCompleted ? 'border-green-200 bg-green-50/30' : 'border-gray-200'
              }`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              {/* 步驟標題 */}
              <div
                className={`flex items-center justify-between p-4 cursor-pointer transition-colors duration-fast ${
                  isCurrent ? 'bg-teal-50/80' : 
                  isCompleted ? 'bg-green-50/50' : 'bg-gray-50/80 hover:bg-gray-100/80'
                }`}
                onClick={() => handleStepClick(index)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-body-sm font-semibold transition-colors ${
                    isCompleted ? 'bg-green-500 text-white' : 
                    isCurrent ? 'bg-teal-500 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {isCompleted ? <FiCheck className="w-4 h-4" /> : index + 1}
                  </div>
                  <div>
                    <h3 className={`font-semibold text-body-sm ${isCompleted ? 'text-green-700' : 'text-gray-800'}`}>
                      {framework.title}
                    </h3>
                    <p className="text-caption text-gray-500 line-clamp-1">
                      {framework.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleGuidingQuestions(step);
                    }}
                    className={`p-1.5 rounded-lg transition-colors ${
                      showGuidingQuestions[step] ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200 text-gray-400'
                    }`}
                    title="顯示引導問題"
                  >
                    <FiHelpCircle className="w-4 h-4" />
                  </button>
                  <div className={`p-1 transition-transform duration-fast ${isExpanded ? 'rotate-180' : ''}`}>
                    <FiChevronDown className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* 引導問題 */}
              {showGuidingQuestions[step] && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-blue-100"
                >
                  <h4 className="text-caption font-semibold text-blue-700 mb-2 flex items-center gap-1.5">
                    <FiHelpCircle className="w-3.5 h-3.5" />
                    引導問題
                  </h4>
                  <ul className="text-caption text-blue-600 space-y-1.5">
                    {framework.guidingQuestions.map((question, qIndex) => (
                      <li key={qIndex} className="flex items-start gap-2">
                        <span className="text-blue-400 mt-0.5">→</span>
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
                  className="p-4 bg-white"
                >
                  <textarea
                    value={data[step]}
                    onChange={(e) => handleInputChange(step, e.target.value)}
                    placeholder={framework.placeholder}
                    rows={5}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none bg-gray-50 focus:bg-white transition-colors text-body-sm placeholder:text-gray-400"
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-caption text-gray-400">
                      {data[step].length > 0 ? `已輸入 ${data[step].length} 字` : '尚未填寫'}
                    </span>
                    {(() => {
                      const text = data[step];
                      if (!text || !text.trim()) return null;
                      const quality = checkFieldQuality(text);
                      if (quality.valid) {
                        return text.length >= 50
                          ? <span className="text-caption text-green-500 flex items-center gap-1"><FiCheck className="w-3 h-3" /> 內容充足</span>
                          : <span className="text-caption text-green-500 flex items-center gap-1"><FiCheck className="w-3 h-3" /> 已達最低要求</span>;
                      }
                      const hints = {
                        too_short: `至少需要 ${MIN_FIELD_CHARS} 個字`,
                        no_text: '請輸入有意義的文字',
                        repetitive: '請避免重複相同的文字',
                      };
                      return <span className="text-caption text-amber-500">{hints[quality.reason]}</span>;
                    })()}
                  </div>
                </motion.div>
              )}
            </motion.div>
            </React.Fragment>
          );
        })}
      </div>

      {/* AI 分析區域 */}
      {getCompletedSteps() >= MIN_REQUIRED_FIELDS && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 rounded-xl border border-purple-200/60"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <AiOutlineRobot className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <span className="font-semibold text-body-sm text-purple-800">AI 智能分析</span>
                <p className="text-caption text-purple-600">獲取個人化學習建議</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 rounded text-purple-700">
                {getProviderIcon(aiProvider)}
              </div>
              <select
                value={aiProvider}
                onChange={(e) => setAiProvider(e.target.value)}
                className="text-caption border border-purple-200 rounded-lg px-3 py-1.5 bg-white/80 text-purple-700 focus:ring-2 focus:ring-purple-300 focus:border-transparent"
                title="選擇 AI 分析模型"
              >
                <option value="auto">自動選擇</option>
                <option value="gemma-4">Gemma-4 (推薦)</option>
                <option value="gpt-oss-20b">GPT-OSS-20b (均衡)</option>
                <option value="gemini">Gemini-3.1-flash-lite-preview</option>
              </select>
              <button
                onClick={handleAIAnalysis}
                disabled={isAnalyzing}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-body-sm font-medium transition-all duration-fast hover:shadow-md disabled:hover:shadow-none"
              >
                {isAnalyzing ? (
                  <>
                    <FiRefreshCw className="w-4 h-4 animate-spin" />
                    <span>分析中...</span>
                  </>
                ) : (
                  <>
                    <AiOutlineRobot className="w-4 h-4" />
                    <span>開始分析</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}
      </div>

      {/* 操作按鈕 - sticky 黏在底部 */}
      <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-t border-gray-100 bg-gray-50/80 sticky bottom-0">
        <span className="text-caption text-gray-400">結果僅供參考，不作為正式評量依據</span>
        <div className="flex gap-2 sm:gap-3 flex-shrink-0">
          <button
            onClick={onCancel}
            className="px-3 sm:px-5 py-2 sm:py-2.5 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-body-sm transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={getCompletedSteps() < MIN_REQUIRED_FIELDS}
            className="px-3 sm:px-5 py-2 sm:py-2.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-body-sm transition-all hover:shadow-md disabled:hover:shadow-none"
          >
            {isEditing ? '更新' : '儲存'}反思日誌
          </button>
        </div>
      </div>
    </div>
    </>
  );
};

export default FiveRsReflectionForm;
