import React, { useState } from 'react';
import Modal from '../Modal';
import { FiHelpCircle, FiInfo, FiThumbsUp, FiThumbsDown, FiUsers, FiX } from 'react-icons/fi';
import { generateSuggestions, submitFeedback } from '../../api/aiTaskAssistant';
import toast from 'react-hot-toast';

const AITaskAssistantModal = ({ open, onClose, cardData, projectId }) => {
  const [currentStep, setCurrentStep] = useState(1); // 1: metacognitive, 2: suggestions
  const [selectedState, setSelectedState] = useState('');
  const [askedSources, setAskedSources] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [helpSeekingType, setHelpSeekingType] = useState('');
  const [logId, setLogId] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [feedbackDetail, setFeedbackDetail] = useState('');
  const [showDetailedSteps, setShowDetailedSteps] = useState(false);

  const metacognitiveOptions = [
    {
      value: 'not_started',
      icon: <FiInfo />,
      label: '我還沒開始思考這個問題',
      description: '我想了解這個任務該從哪裡開始'
    },
    {
      value: 'thought_unclear',
      icon: <FiInfo />,
      label: '我想過但不確定方向',
      description: '我有一些想法，但不確定是否正確'
    },
    {
      value: 'initial_idea',
      icon: <FiInfo />,
      label: '我有初步想法，想確認可行性',
      description: '我已經有計畫，想聽聽建議'
    },
    {
      value: 'specific_problem',
      icon: <FiInfo />,
      label: '我遇到具體的問題或障礙',
      description: '我開始做了，但卡在某個地方'
    },
    {
      value: 'asked_peers',
      icon: <FiUsers />,
      label: '我問過同學/老師，想要第二意見',
      description: '我已經向他人求助過了'
    }
  ];

  const sourcesOptions = ['同學', '老師', '查資料', '還沒問任何人'];

  const handleSourceChange = (source) => {
    if (source === '還沒問任何人') {
      setAskedSources(['還沒問任何人']);
    } else {
      const filtered = askedSources.filter(s => s !== '還沒問任何人');
      if (askedSources.includes(source)) {
        setAskedSources(filtered.filter(s => s !== source));
      } else {
        setAskedSources([...filtered, source]);
      }
    }
  };

  const handleGenerateSuggestions = async (skipped = false) => {
    try {
      setIsLoading(true);

      const data = {
        taskId: cardData.id,
        projectId,
        selectedState,
        answers: {},
        askedSources,
        skippedThinking: skipped
      };

      const result = await generateSuggestions(data);

      setSuggestions(result.suggestions);
      setHelpSeekingType(result.helpSeekingType);
      setLogId(result.logId);
      setCurrentStep(2);

    } catch (error) {
      console.error('Error generating suggestions:', error);
      toast.error('生成建議失敗，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = async (type) => {
    try {
      setFeedback(type);

      if (type === 'helpful') {
        await submitFeedback({
          taskId: cardData.id,
          projectId,
          helpSeekingLogId: logId,
          feedbackType: 'helpful',
          feedbackDetail: null
        });
        toast.success('感謝你的回饋');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('提交回饋失敗');
    }
  };

  const handleSubmitDetailedFeedback = async () => {
    try {
      await submitFeedback({
        taskId: cardData.id,
        projectId,
        helpSeekingLogId: logId,
        feedbackType: 'not_helpful',
        feedbackDetail
      });
      toast.success('感謝你的回饋，我們會持續改進');
      setFeedbackDetail('');
    } catch (error) {
      console.error('Error submitting detailed feedback:', error);
      toast.error('提交回饋失敗');
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setSelectedState('');
    setAskedSources([]);
    setSuggestions(null);
    setHelpSeekingType('');
    setLogId(null);
    setFeedback('');
    setFeedbackDetail('');
    setShowDetailedSteps(false);
    onClose();
  };

  const renderMetacognitiveCheck = () => (
    <div className="p-component-lg">
      <div className="flex items-center gap-stack-sm mb-stack-md">
        <FiHelpCircle className="text-h2 text-customgreen" />
        <div>
          <h2 className="text-h2 font-bold text-gray-800">
            求助引導 - 關於 {cardData.title}
          </h2>
          <p className="text-body-sm text-gray-600 mt-1">
            在給建議前，先幫我了解你的狀態
          </p>
        </div>
      </div>

      <div className="bg-blue-50 rounded-lg p-component-md mb-stack-md">
        <p className="text-body font-medium text-gray-800 mb-stack-sm flex items-center gap-2">
          <FiInfo className="text-blue-600" />
          關於這個任務，你目前的狀態是？
        </p>

        <div className="space-y-stack-xs">
          {metacognitiveOptions.map((option) => (
            <label
              key={option.value}
              className={`flex items-start p-component-sm rounded-lg border-2
                         cursor-pointer transition-all duration-fast
                         ${selectedState === option.value
                           ? 'border-customgreen bg-green-50'
                           : 'border-gray-200 hover:border-customgreen/50 hover:bg-gray-50'
                         }`}
            >
              <input
                type="radio"
                name="metacognitive"
                value={option.value}
                checked={selectedState === option.value}
                onChange={(e) => setSelectedState(e.target.value)}
                className="mt-1 text-customgreen focus:ring-customgreen"
              />
              <div className="ml-3 flex-1">
                <div className="flex items-center gap-2">
                  {option.icon}
                  <span className="text-body font-medium text-gray-800">
                    {option.label}
                  </span>
                </div>
                <p className="text-body-sm text-gray-600 mt-1">
                  {option.description}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-lg p-component-md mb-stack-md">
        <p className="text-body font-medium text-gray-800 mb-3 flex items-center gap-2">
          <FiUsers className="text-purple-600" />
          你試過問誰了？
        </p>
        <div className="space-y-2">
          {sourcesOptions.map((source) => (
            <label key={source} className="flex items-center gap-2">
              <input
                type="checkbox"
                value={source}
                checked={askedSources.includes(source)}
                onChange={() => handleSourceChange(source)}
                className="text-purple-600 focus:ring-purple-500"
              />
              <span className="text-body-sm text-gray-700">{source}</span>
            </label>
          ))}
        </div>

        {askedSources.includes('還沒問任何人') && (
          <div className="mt-3 p-3 bg-white rounded border border-purple-200">
            <p className="text-body-sm text-purple-800">
              <FiInfo className="inline mr-1" />
              <strong>建議：</strong>在點擊「獲得建議」前，也可以考慮先和團隊討論。
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center">
        <button
          onClick={handleClose}
          className="px-btn-x-lg py-btn-y text-gray-600 hover:text-gray-800 transition-colors"
        >
          取消
        </button>

        <button
          onClick={() => handleGenerateSuggestions(false)}
          disabled={!selectedState || isLoading}
          className={`px-btn-x-lg py-btn-y rounded-lg font-medium transition-all duration-fast
                     ${selectedState && !isLoading
                       ? 'bg-customgreen text-white hover:bg-customgreen/90 hover:shadow-lg'
                       : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                     }`}
        >
          {isLoading ? '生成中...' : '獲得建議'}
        </button>
      </div>
    </div>
  );

  const renderSuggestions = () => {
    if (!suggestions) return null;

    return (
      <div className="p-component-lg max-h-[70vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-stack-md">
          <div className="flex items-center gap-stack-sm">
            <FiHelpCircle className="text-h2 text-customgreen" />
            <div>
              <h2 className="text-h2 font-bold text-gray-800">AI 建議</h2>
              <p className="text-caption text-gray-600">
                求助類型: {helpSeekingType === 'adaptive' ? '適應性求助' : helpSeekingType === 'expedient' ? '便宜行事型' : '混合型'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="space-y-stack-md">
          {suggestions.summary && (
            <div className="bg-blue-50 border-l-4 border-blue-500 p-component-md rounded-r-lg">
              <div className="flex items-start gap-3">
                <FiInfo className="text-blue-600 text-h3 flex-shrink-0 mt-1" />
                <p className="text-body text-gray-700">{suggestions.summary}</p>
              </div>
            </div>
          )}

          {suggestions.thinkingDirections && suggestions.thinkingDirections.length > 0 && (
            <div className="bg-white border border-green-200 rounded-lg overflow-hidden">
              <div className="bg-customgreen/10 px-component-md py-component-sm border-b border-green-200">
                <h3 className="text-body-lg font-bold text-gray-800 flex items-center gap-2">
                  <FiHelpCircle className="text-customgreen" />
                  思考方向（不是答案）
                </h3>
              </div>

              <div className="p-component-md space-y-stack-sm">
                {suggestions.thinkingDirections.map((direction, index) => (
                  <div key={index} className="flex items-start gap-3 pb-stack-sm border-b border-gray-100 last:border-0">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100
                                  flex items-center justify-center text-caption font-bold text-green-700">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-body font-medium text-gray-800 mb-1">
                        {direction.title}
                      </p>
                      <p className="text-body-sm text-gray-600">
                        {direction.description}
                      </p>
                      {direction.reasoning && (
                        <details className="mt-2">
                          <summary className="text-body-sm text-blue-600 cursor-pointer hover:text-blue-800">
                            為什麼這樣建議？
                          </summary>
                          <p className="mt-2 text-body-sm text-gray-600 pl-4 border-l-2 border-blue-200">
                            {direction.reasoning}
                          </p>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {suggestions.humanHelpSuggestions && suggestions.humanHelpSuggestions.length > 0 && (
            <div className="bg-orange-50 border-l-4 border-orange-500 p-component-md rounded-r-lg">
              <div className="flex items-start gap-3">
                <FiUsers className="text-orange-600 text-h3 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <p className="text-body font-bold text-gray-800 mb-2">
                    我強烈建議你也向真人求助
                  </p>
                  <p className="text-body-sm text-gray-700 mb-3">
                    研究顯示，同儕討論是最有效的學習方式。AI 只是輔助，真正的理解來自與他人的互動。
                  </p>

                  <div className="space-y-2">
                    {suggestions.humanHelpSuggestions.map((suggestion, index) => (
                      <div key={index} className="flex items-start gap-2 text-body-sm">
                        <span className="flex-shrink-0">✓</span>
                        <span className="text-gray-700">{suggestion}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {suggestions.detailedSteps && suggestions.detailedSteps.length > 0 && (
            <details className="bg-yellow-50 border border-yellow-300 rounded-lg overflow-hidden">
              <summary className="px-component-md py-component-sm cursor-pointer
                                hover:bg-yellow-100 transition-colors flex items-center justify-between">
                <span className="text-body font-medium text-gray-800">
                  <FiInfo className="inline mr-2 text-yellow-600" />
                  如果你真的需要更詳細的步驟...
                </span>
              </summary>

              <div className="p-component-md border-t border-yellow-300">
                <div className="bg-white rounded-lg p-component-sm mb-3">
                  <p className="text-body-sm text-gray-700 mb-2">
                    <strong>重要提醒：</strong>
                  </p>
                  <ul className="text-body-sm text-gray-600 space-y-1 list-disc list-inside">
                    <li>這只是「一種」可能的做法，不是唯一解</li>
                    <li>請理解每個步驟的「為什麼」，不要直接照抄</li>
                    <li>根據你的專案情境調整</li>
                    <li>建議和團隊討論後再執行</li>
                  </ul>
                </div>

                <div className="space-y-stack-sm">
                  {suggestions.detailedSteps.map((step, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-component-sm">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100
                                      flex items-center justify-center text-body-sm font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-body font-medium text-gray-800 mb-1">
                            {step.title}
                          </p>
                          <p className="text-body-sm text-gray-600 mb-2">
                            {step.description}
                          </p>
                          {step.reasoning && (
                            <div className="bg-blue-50 rounded p-2 text-caption text-gray-700">
                              <strong>為什麼：</strong>{step.reasoning}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </details>
          )}

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-component-md">
            <p className="text-body font-medium text-gray-800 mb-3">
              這些建議對你有幫助嗎？
            </p>

            <div className="flex gap-3 mb-4">
              <button
                onClick={() => handleFeedback('helpful')}
                className={`flex-1 py-3 rounded-lg border-2 transition-all duration-fast flex items-center justify-center gap-2
                           ${feedback === 'helpful'
                             ? 'border-green-500 bg-green-50 text-green-700'
                             : 'border-gray-300 hover:border-green-300'}`}
              >
                <FiThumbsUp />
                有幫助
              </button>

              <button
                onClick={() => handleFeedback('not_helpful')}
                className={`flex-1 py-3 rounded-lg border-2 transition-all duration-fast flex items-center justify-center gap-2
                           ${feedback === 'not_helpful'
                             ? 'border-orange-500 bg-orange-50 text-orange-700'
                             : 'border-gray-300 hover:border-orange-300'}`}
              >
                <FiThumbsDown />
                不太有用
              </button>
            </div>

            {feedback === 'not_helpful' && (
              <div className="mt-3">
                <p className="text-body-sm text-gray-700 mb-2">
                  能告訴我哪裡不符合你的需求嗎？
                </p>
                <textarea
                  placeholder="例如：我需要更基礎的說明、建議太抽象、我想要程式碼範例..."
                  className="w-full p-3 border border-gray-300 rounded-lg text-body-sm
                           focus:ring-2 focus:ring-customgreen focus:border-transparent"
                  rows={3}
                  value={feedbackDetail}
                  onChange={(e) => setFeedbackDetail(e.target.value)}
                />
                <button
                  onClick={handleSubmitDetailedFeedback}
                  className="mt-2 px-4 py-2 bg-customgreen text-white rounded-lg
                           hover:bg-customgreen/90 text-body-sm"
                >
                  送出回饋
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Modal open={open} onClose={handleClose} maxWidth="md">
      {currentStep === 1 ? renderMetacognitiveCheck() : renderSuggestions()}
    </Modal>
  );
};

export default AITaskAssistantModal;
