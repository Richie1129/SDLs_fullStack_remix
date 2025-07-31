import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiHelpCircle, FiX, FiInfo, FiArrowRight } from 'react-icons/fi';

const ContextualHelp = ({ currentPage, userProgress = {}, userRole = 'student' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentTip, setCurrentTip] = useState(null);

  // 根據頁面和用戶進度提供相關幫助內容
  const getHelpContent = () => {
    const helpData = {
      homepage: {
        title: '🏠 首頁使用指南',
        tips: [
          {
            icon: '📚',
            title: '查看專案進度',
            content: '點擊專案卡片可以查看詳細進度和任務',
            action: '試試點擊一個專案卡片'
          },
          {
            icon: '➕',
            title: '加入新專案',
            content: '使用邀請碼加入活動或是建立一個新的活動',
            action: '點擊"加入專案"按鈕'
          },
          {
            icon: '👥',
            title: '查看團隊成員',
            content: '在專案卡片上可以看到同組夥伴',
            action: '觀察專案成員資訊'
          }
        ],
        nextSteps: [
          '進入一個專案開始學習',
          '查看團隊成員狀況',
          '檢視整體學習進度'
        ]
      },
      reflection: {
        title: '💭 反思日誌指南',
        tips: [
          {
            icon: '📝',
            title: '5Rs 反思框架',
            content: '使用 Reporting → Responding → Relating → Reasoning → Reconstructing 的順序來撰寫深度反思',
            action: '點擊"5Rs反思"開始撰寫'
          },
          {
            icon: '💡',
            title: '反思小技巧',
            content: '描述具體事件、表達真實感受、連結過往經驗、分析原因、制定改進計畫',
            action: '每個部分至少寫 2-3 句話'
          },
          {
            icon: '🤖',
            title: 'AI 反思分析',
            content: '完成反思後可請求 AI 分析，獲得個人化學習建議',
            action: '完成反思後點擊"AI分析"'
          }
        ],
        nextSteps: [
          '撰寫第一篇 5Rs 反思',
          '請求 AI 分析反饋',
          '根據建議調整學習方式'
        ]
      },
      kanban: {
        title: '📋 看板管理指南',
        tips: [
          {
            icon: '➕',
            title: '建立任務',
            content: '點擊"+"號可以新增學習任務，設定優先級和截止日期',
            action: '建立您的第一個任務'
          },
          {
            icon: '🔄',
            title: '拖拽管理',
            content: '將任務卡片拖拽到不同欄位來更新進度狀態',
            action: '試著移動一個任務'
          },
          {
            icon: '👥',
            title: '任務協作',
            content: '可以指派任務給團隊成員，追蹤完成狀況',
            action: '嘗試指派任務給同學'
          }
        ],
        nextSteps: [
          '建立學習計畫任務',
          '設定任務優先級',
          '與同學協作完成任務'
        ]
      },
      ideawall: {
        title: '💡 想法牆使用指南',
        tips: [
          {
            icon: '✨',
            title: '分享創意想法',
            content: '記錄學習過程中的靈感和創意發現',
            action: '發布您的第一個想法'
          },
          {
            icon: '🔗',
            title: '建立想法連結',
            content: '將相關想法連結起來，形成知識網絡',
            action: '試著連結兩個想法'
          },
          {
            icon: '💬',
            title: '討論與回饋',
            content: '對同學的想法給予回饋和建議',
            action: '評論一個同學的想法'
          }
        ],
        nextSteps: [
          '發布學習想法',
          '與同學想法互動',
          '建立想法知識圖譜'
        ]
      },
      chatroom: {
        title: '💬 討論區指南',
        tips: [
          {
            icon: '❓',
            title: '提出問題',
            content: '遇到學習困難時，可以向同學或老師請教',
            action: '發起一個學習問題討論'
          },
          {
            icon: '📚',
            title: '分享資源',
            content: '分享有用的學習資料和網站連結',
            action: '分享一個學習資源'
          },
          {
            icon: '🤝',
            title: '互助學習',
            content: '回答同學問題，一起成長進步',
            action: '回答同學的問題'
          }
        ],
        nextSteps: [
          '參與小組討論',
          '分享學習心得',
          '建立學習社群'
        ]
      }
    };

    if (userRole === 'teacher') {
      return {
        homepage: {
          title: '👩‍🏫 教師管理指南',
          tips: [
            {
              icon: '📊',
              title: '監控學習進度',
              content: '查看所有學生的學習狀況和專案進度',
              action: '點擊"教師總覽"查看數據'
            },
            {
              icon: '👥',
              title: '學生管理',
              content: '個別指導學生，提供學習建議',
              action: '進入學生管理頁面'
            }
          ],
          nextSteps: ['查看學生整體表現', '提供個別指導']
        }
      };
    }

    return helpData[currentPage] || helpData.homepage;
  };

  const helpContent = getHelpContent();

  useEffect(() => {
    // 檢查是否應該顯示幫助提示
    const shouldShowHelp = () => {
      const hasSeenHelp = localStorage.getItem(`help_seen_${currentPage}`);
      const isNewUser = !localStorage.getItem('hasCompletedTour');
      
      return !hasSeenHelp || isNewUser;
    };

    if (shouldShowHelp()) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 10000); // 10 秒後顯示幫助提示

      return () => clearTimeout(timer);
    }
  }, [currentPage]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(`help_seen_${currentPage}`, 'true');
  };

  const showTip = (tip) => {
    setCurrentTip(tip);
  };

  const closeTip = () => {
    setCurrentTip(null);
  };

  return (
    <>
      {/* 浮動幫助按鈕 */}
      <motion.div
        className="fixed bottom-6 right-6 z-40"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5 }}
      >
        <button
          onClick={() => setIsVisible(true)}
          className="bg-teal-600 hover:bg-teal-700 text-white rounded-full p-4 shadow-lg transition-all duration-300 hover:scale-110"
          title="需要幫助？"
        >
          <FiHelpCircle size={24} />
        </button>
      </motion.div>

      {/* 自動顯示的幫助提示 */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 right-6 bg-white rounded-lg shadow-xl p-4 max-w-sm z-50 border border-gray-200"
          >
            <div className="flex justify-between items-start mb-3">
              <h4 className="font-semibold text-gray-800 flex items-center">
                <FiInfo className="mr-2 text-yellow-500" />
                {helpContent.title}
              </h4>
              <button
                onClick={handleDismiss}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX size={16} />
              </button>
            </div>

            <div className="space-y-2 mb-4">
              {helpContent.tips.slice(0, 2).map((tip, index) => (
                <div 
                  key={index}
                  className="flex items-start p-2 rounded bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                  onClick={() => showTip(tip)}
                >
                  <span className="mr-2">{tip.icon}</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-700">{tip.title}</div>
                    <div className="text-xs text-gray-500">{tip.content.substring(0, 40)}...</div>
                  </div>
                  <FiArrowRight className="text-gray-400 mt-1" size={12} />
                </div>
              ))}
            </div>

            <div className="text-xs text-gray-500">
              💡 點擊項目查看詳細說明
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 詳細提示彈窗 */}
      <AnimatePresence>
        {currentTip && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={closeTip}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-4">
                <div className="text-4xl mb-2">{currentTip.icon}</div>
                <h3 className="text-xl font-bold text-gray-800">{currentTip.title}</h3>
              </div>
              
              <p className="text-gray-600 mb-4 leading-relaxed">
                {currentTip.content}
              </p>
              
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 mb-4">
                <div className="text-sm font-medium text-teal-800 mb-1">💡 建議行動</div>
                <div className="text-sm text-teal-700">{currentTip.action}</div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeTip}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  關閉
                </button>
                <button
                  onClick={closeTip}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                >
                  我知道了
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ContextualHelp;
