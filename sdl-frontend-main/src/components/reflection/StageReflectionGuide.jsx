import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronDown, FiChevronUp, FiBookOpen, FiHelpCircle, FiEdit3, FiTarget, FiInfo } from 'react-icons/fi';

/**
 * 階段反思引導元件
 * 提供該階段的核心任務、引導問題和範例回答
 */

// 各階段的完整引導內容
const STAGE_GUIDES = {
  '1-1': {
    stageName: '分組',
    stageNumber: '1-1',
    coreTask: '組成研究團隊，確定初步的研究方向和主題。',
    reflectionQuestions: [
      {
        question: '你們如何決定研究主題？過程中有哪些想法？',
        example: '例如：「我們先各自提出 3 個感興趣的主題，然後投票選出最多人有興趣的方向，最後討論確定了『高中生使用社群媒體對睡眠的影響』這個主題。」'
      },
      {
        question: '為什麼選擇這個主題？它對你們有什麼意義？',
        example: '例如：「因為我們都有晚睡滑手機的習慣，想了解這對睡眠品質的影響，希望能找到改善的方法。」'
      },
      {
        question: '分組過程順利嗎？有遇到什麼困難？',
        example: '例如：「大家一開始意見很分歧，有人想研究環保、有人想研究科技，後來決定找共同點，發現大家都關心健康議題。」'
      },
      {
        question: '組員之間的想法有什麼不同？如何達成共識？',
        example: '例如：「A 同學想做實驗，B 同學想做問卷，最後決定用問卷調查因為更可行，但會在問卷中加入實驗性的問題。」'
      }
    ],
    tips: [
      '記錄團隊討論的過程比結果更重要',
      '不同意見是正常的，重點是如何溝通',
      '可以提到每個組員的想法和貢獻'
    ]
  },
  '1-2': {
    stageName: '專題設定',
    stageNumber: '1-2',
    coreTask: '確定研究題目、研究目的，並進行初步的文獻探索。',
    reflectionQuestions: [
      {
        question: '你們如何確定研究題目和目的？',
        example: '例如：「原本題目是『社群媒體的影響』太廣泛，經過討論後聚焦在『Instagram 使用時間對高中生睡眠品質的影響』。」'
      },
      {
        question: '找到哪些相關資料或文獻？它們如何幫助你理解主題？',
        example: '例如：「找到一篇論文討論藍光對睡眠的影響，讓我們了解要控制使用時段這個變因。」'
      },
      {
        question: '研究題目有經過修改嗎？為什麼要調整？',
        example: '例如：「原本想研究所有社群媒體，但範圍太大，改成只研究 Instagram，因為這是我們最常用的平台。」'
      },
      {
        question: '這個階段最大的收穫是什麼？',
        example: '例如：「學會如何縮小研究範圍，讓題目更具體可行。」'
      }
    ],
    tips: [
      '記錄題目修改的過程和原因',
      '整理找到的重要文獻來源',
      '反思如何讓研究更聚焦'
    ]
  },
  '2-1': {
    stageName: '文獻探討',
    stageNumber: '2-1',
    coreTask: '系統性地搜尋、閱讀和整理相關文獻，建立理論基礎。',
    reflectionQuestions: [
      {
        question: '你們找到了哪些重要文獻？',
        example: '例如：「找到 5 篇探討社群媒體與睡眠的論文，3 篇討論藍光影響，2 篇是本土研究。」'
      },
      {
        question: '這些文獻如何幫助你們理解研究主題？',
        example: '例如：「文獻指出睡前使用手機會延遲入睡時間 30-60 分鐘，這讓我們決定在問卷中詢問使用時段。」'
      },
      {
        question: '文獻搜尋過程中有什麼困難？如何克服？',
        example: '例如：「一開始不知道用什麼關鍵字，後來請教老師，學會用『social media』+『sleep quality』+『adolescent』搜尋。」'
      },
      {
        question: '從文獻中發現了什麼新的想法或方向？',
        example: '例如：「發現國外研究都用睡眠日誌記錄，我們也想在問卷中加入這個方法。」'
      }
    ],
    tips: [
      '記錄文獻來源和重要發現',
      '整理不同研究的方法和結果',
      '思考如何應用在自己的研究中'
    ]
  },
  '2-2': {
    stageName: '設計研究（設計&分析）',
    stageNumber: '2-2',
    coreTask: '設計研究方法、確定樣本和分析方式。',
    reflectionQuestions: [
      {
        question: '你們的研究設計是什麼？為什麼這樣設計？',
        example: '例如：「採用問卷調查法，因為可以短時間內收集大量資料，且適合我們的時間和資源限制。」'
      },
      {
        question: '預計的樣本規模是多少？如何決定的？',
        example: '例如：「目標 200 份問卷，參考文獻建議至少 150 份才有統計意義，考慮回收率設定 200 份。」'
      },
      {
        question: '資料收集的方法是什麼？有什麼優缺點？',
        example: '例如：「用 Google 表單發放，優點是方便快速，缺點是可能有人亂填，所以加了檢核題。」'
      },
      {
        question: '分析方法為何？為什麼選擇這個方法？',
        example: '例如：「用相關分析檢驗使用時間和睡眠品質的關係，因為我們想知道兩者是否相關。」'
      }
    ],
    tips: [
      '詳細說明研究設計的理由',
      '記錄設計過程中的考量和取捨',
      '反思設計的可行性和限制'
    ]
  },
  '3-1': {
    stageName: '撰寫發展',
    stageNumber: '3-1',
    coreTask: '執行研究、收集資料、分析結果並撰寫報告。',
    reflectionQuestions: [
      {
        question: '目前撰寫進度到哪裡了？',
        example: '例如：「完成了緒論和文獻探討，正在撰寫研究方法，預計下週完成結果分析。」'
      },
      {
        question: '撰寫過程中遇到什麼困難？',
        example: '例如：「不知道如何呈現統計圖表，後來參考範例報告，學會用長條圖和散佈圖。」'
      },
      {
        question: '如何組織和呈現研究結果？',
        example: '例如：「先用敘述統計描述樣本特性，再用圖表呈現主要發現，最後討論結果的意義。」'
      },
      {
        question: '還需要補充哪些內容？',
        example: '例如：「結論部分還需要加強，要更明確說明研究限制和未來建議。」'
      }
    ],
    tips: [
      '記錄撰寫的困難和解決方法',
      '反思如何改善報告的呈現',
      '整理還需要補充的部分'
    ]
  },
  '4-1': {
    stageName: '組內同儕互評',
    stageNumber: '4-1',
    coreTask: '組員之間互相評估報告，提供改進建議。',
    reflectionQuestions: [
      {
        question: '組員給了什麼建議？哪些建議最有幫助？',
        example: '例如：「A 同學建議圖表要加上標題和單位，B 同學提醒結論要呼應研究問題，這些都很實用。」'
      },
      {
        question: '你對其他組員的報告有什麼看法？',
        example: '例如：「C 同學的文獻整理很清楚，值得學習。D 同學的圖表設計很專業。」'
      },
      {
        question: '互評過程中學到了什麼？',
        example: '例如：「學會用評審的角度看報告，發現自己報告的盲點。」'
      },
      {
        question: '打算如何改進你們的報告？',
        example: '例如：「根據建議，會重新調整圖表格式，並加強結論的論述。」'
      }
    ],
    tips: [
      '具體記錄收到的建議',
      '反思如何給出建設性的回饋',
      '規劃改進的優先順序'
    ]
  },
  '4-2': {
    stageName: '組際同儕互評',
    stageNumber: '4-2',
    coreTask: '與其他組別交流，從不同觀點檢視研究。',
    reflectionQuestions: [
      {
        question: '其他組給了什麼回饋？哪些觀點讓你印象深刻？',
        example: '例如：「第 3 組提出我們沒考慮到的變因（運動習慣），這個觀點很有啟發。」'
      },
      {
        question: '不同的觀點如何幫助你重新思考研究？',
        example: '例如：「原本認為結果很明確，但其他組質疑因果關係，讓我們反思研究限制。」'
      },
      {
        question: '你覺得哪些改進想法最值得採用？',
        example: '例如：「在討論中加入研究限制的說明，讓結論更嚴謹。」'
      },
      {
        question: '從其他組的報告中學到了什麼？',
        example: '例如：「第 5 組用質性訪談補充量化問卷，這個混合方法值得參考。」'
      }
    ],
    tips: [
      '開放心態接受不同觀點',
      '記錄其他組的優點和創意',
      '思考如何整合多元回饋'
    ]
  },
  '4-3': {
    stageName: '成果發表',
    stageNumber: '4-3',
    coreTask: '正式發表研究成果，回應提問並反思整個歷程。',
    reflectionQuestions: [
      {
        question: '發表過程順利嗎？有什麼印象深刻的時刻？',
        example: '例如：「報告時很緊張，但看到觀眾點頭回應時很有成就感。Q&A 環節比預期順利。」'
      },
      {
        question: '觀眾或評審提出了哪些問題？你如何回應？',
        example: '例如：「評審問為何只用問卷不做實驗？我解釋了時間和資源的限制，並說明問卷的優勢。」'
      },
      {
        question: '對於未來的建議是什麼？',
        example: '例如：「可以擴大樣本到其他學校，或加入實驗組做對照研究。」'
      },
      {
        question: '整個專題下來，最大的收穫是什麼？',
        example: '例如：「學會完整的研究流程，培養批判思考能力，也學會團隊合作解決問題。」'
      }
    ],
    tips: [
      '記錄發表的經驗和感受',
      '反思整個研究歷程的學習',
      '思考未來可以改進的方向'
    ]
  }
};

const StageReflectionGuide = ({ stage, className = '' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showExamples, setShowExamples] = useState({});

  if (!stage || stage === '') {
    return null; // 沒有選擇階段時不顯示
  }

  const guide = STAGE_GUIDES[stage];

  if (!guide) {
    return null; // 該階段沒有引導內容
  }

  const toggleExample = (index) => {
    setShowExamples(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <div className={`mb-6 ${className}`}>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="border border-purple-200 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50"
      >
        {/* 標題列 */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-component-base hover:bg-purple-100/50 transition-colors rounded-t-lg"
        >
          <div className="flex items-center gap-stack-xs">
            <FiBookOpen className="w-5 h-5 text-purple-600" />
            <div className="text-left">
              <h4 className="font-semibold text-body text-purple-900 flex items-center gap-1.5">
                <FiBookOpen className="w-4 h-4" /> 階段 {guide.stageNumber} - {guide.stageName} 反思引導
              </h4>
              <p className="text-caption text-purple-700">
                {isExpanded ? '點擊收合' : '點擊展開查看詳細引導'}
              </p>
            </div>
          </div>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <FiChevronDown className="w-5 h-5 text-purple-600" />
          </motion.div>
        </button>

        {/* 內容區 */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="p-component-base pt-0 space-y-stack-sm">
                {/* 核心任務 */}
                <div className="bg-white p-component-sm rounded-lg border border-purple-100">
                  <div className="flex items-start gap-2">
                    <FiTarget className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h5 className="font-semibold text-body-sm text-gray-900 mb-1">
                        核心任務
                      </h5>
                      <p className="text-body-sm text-gray-700">
                        {guide.coreTask}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 反思引導問題 */}
                <div className="bg-white p-component-sm rounded-lg border border-purple-100">
                  <div className="flex items-start gap-2 mb-3">
                    <FiHelpCircle className="w-5 h-5 text-purple-600 mt-0.5" />
                    <h5 className="font-semibold text-body-sm text-gray-900">
                      反思引導問題
                    </h5>
                  </div>
                  <div className="space-y-3">
                    {guide.reflectionQuestions.map((item, index) => (
                      <div key={index} className="pl-2">
                        <div className="flex items-start gap-2 mb-1">
                          <span className="font-semibold text-purple-600 text-body-sm">
                            Q{index + 1}.
                          </span>
                          <p className="text-body-sm text-gray-800 flex-1">
                            {item.question}
                          </p>
                        </div>
                        {item.example && (
                          <div className="ml-6">
                            <button
                              onClick={() => toggleExample(index)}
                              className="text-caption text-purple-600 hover:text-purple-800 flex items-center gap-1"
                            >
                              <FiEdit3 className="w-3 h-3" />
                              {showExamples[index] ? '隱藏' : '查看'}範例
                            </button>
                            <AnimatePresence>
                              {showExamples[index] && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="mt-1 p-2 bg-purple-50 rounded text-caption text-gray-600 border-l-2 border-purple-300"
                                >
                                  {item.example}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 小提示 */}
                {guide.tips && guide.tips.length > 0 && (
                  <div className="bg-yellow-50 p-component-sm rounded-lg border border-yellow-200">
                    <h5 className="font-semibold text-body-sm text-gray-900 mb-2 flex items-center gap-1.5">
                      <FiInfo className="w-4 h-4 text-yellow-600" /> 小提示
                    </h5>
                    <ul className="space-y-1">
                      {guide.tips.map((tip, index) => (
                        <li key={index} className="text-body-sm text-gray-700">
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default StageReflectionGuide;
