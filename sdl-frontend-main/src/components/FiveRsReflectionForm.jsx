import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiChevronDown, FiChevronUp, FiHelpCircle, FiCheck, FiX, FiRefreshCw } from 'react-icons/fi';
import { AiOutlineRobot } from 'react-icons/ai';
import { FIVE_R_FRAMEWORK, build5RsContent, validate5RsData } from '@/utils/5RsUtils.js';
import { analyze5RsReflection } from '@/api/llm5Rs.js';
import toast from 'react-hot-toast';

const FiveRsReflectionForm = ({ 
  initialData = {}, 
  onSave, 
  onCancel, 
  isEditing = false,
  title = "",
  onTitleChange 
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
      content
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
        
        toast.success(`AI 分析完成！使用 ${result.provider}`);
        
        // 顯示 AI 建議
        if (result.feedback.suggestions && result.feedback.suggestions.length > 0) {
          const suggestions = result.feedback.suggestions.slice(0, 2).join('\n• ');
          console.log('顯示的建議:', suggestions);
          toast.success(`AI 建議：\n• ${suggestions}`, { duration: 8000 });
        }
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
                <option value="gpt">GPT-4</option>
                <option value="gemini">Gemini</option>
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
  );
};

export default FiveRsReflectionForm;
