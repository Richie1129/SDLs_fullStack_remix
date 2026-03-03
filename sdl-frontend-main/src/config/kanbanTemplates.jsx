import React from 'react';
import { FiTarget, FiSearch, FiCheckSquare, FiBookOpen, FiAlertTriangle, FiLifeBuoy, FiCalendar, FiClock, FiZap, FiThumbsUp, FiThumbsDown, FiInfo, FiFileText } from 'react-icons/fi';
import { FaTrophy } from 'react-icons/fa';
import { FiXOctagon } from 'react-icons/fi';

export const COLUMN_ICON_MAP = {
  target: <FiTarget className="w-4 h-4" />,
  search: <FiSearch className="w-4 h-4" />,
  trophy: <FaTrophy className="w-4 h-4" />,
  checkSquare: <FiCheckSquare className="w-4 h-4" />,
  bookOpen: <FiBookOpen className="w-4 h-4" />,
  alertTriangle: <FiAlertTriangle className="w-4 h-4" />,
  lifeBuoy: <FiLifeBuoy className="w-4 h-4" />,
  calendar: <FiCalendar className="w-4 h-4" />,
  clock: <FiClock className="w-4 h-4" />,
  zap: <FiZap className="w-4 h-4" />,
  xOctagon: <FiXOctagon className="w-4 h-4" />,
  thumbsUp: <FiThumbsUp className="w-4 h-4" />,
  thumbsDown: <FiThumbsDown className="w-4 h-4" />,
  info: <FiInfo className="w-4 h-4" />,
  fileText: <FiFileText className="w-4 h-4" />,
};

export const PHASE_TEMPLATES = {
  "GOAL_SETTING": {
    label: "定標",
    columns: [
      {
        title: "靈感池",
        icon: "target",
        isSystem: true,
        description: "記錄初步想法、靈光乍現的點子",
        exampleTasks: [
          {
            title: "每人提出 1-2 個想研究的問題",
            content: "我提出的問題：\n1.\n2.\n\n來源（課堂 / 生活觀察 / 新聞）：\n\n為什麼對這個感興趣："
          },
          {
            title: "從課本或新聞找一個讓你好奇的現象",
            content: "現象描述：\n\n我的疑問是：\n\n為什麼這件事值得研究："
          },
          {
            title: "討論：哪個問題最值得研究？（先列出，不急著決定）",
            content: "大家的意見：\n\n最多人感興趣的方向：\n\n還不確定的原因："
          }
        ]
      },
      {
        title: "篩選區",
        icon: "search",
        isSystem: true,
        description: "評估想法的可行性、挑選最值得研究的主題",
        exampleTasks: [
          {
            title: "評估每個主題：在學校能做嗎？需要什麼資源？",
            content: "主題：\n\n可行性（高 / 中 / 低）：\n\n需要的資源：\n\n最大的困難："
          },
          {
            title: "快速搜尋：這個主題已經有哪些相關研究？",
            content: "搜尋關鍵字：\n\n找到的相關資料（2-3 個）：\n\n我們的研究和別人不同的地方："
          },
          {
            title: "請老師初步審查我們的選題方向",
            content: "預約時間：\n\n要請教的問題：\n\n老師的建議："
          }
        ]
      },
      {
        title: "最終目標",
        icon: "trophy",
        isSystem: true,
        description: "確定最終要達成的研究目標",
        exampleTasks: [
          {
            title: "確定研究題目（格式：「探討___對___的影響」）",
            content: "研究題目：\n\n核心問題（一句話說明要找出什麼）：\n\n預計的回答方式："
          },
          {
            title: "寫下研究假設（我們猜測⋯⋯因為⋯⋯）",
            content: "假設：我們猜測___\n\n理由：因為___\n\n驗證方式：我們計畫用___來確認"
          }
        ]
      },
      {
        title: "成功標準",
        icon: "checkSquare",
        isSystem: true,
        description: "列出具體可衡量的成功指標",
        exampleTasks: [
          {
            title: "列出：研究完成後，我們要能回答哪些問題？",
            content: "完成時能回答：\n1.\n2.\n3.\n\n完成標準（怎樣算做完）："
          },
          {
            title: "確認：這個研究對誰有用？有什麼意義？",
            content: "對___有用\n\n社會或學術意義：\n\n我們無法回答的問題（研究限制）："
          }
        ]
      }
    ],
    cardPlaceholder: "寫下一個具體的目標..."
  },

  "STRATEGY": {
    label: "擇策",
    columns: [
      {
        title: "資源盤點",
        icon: "bookOpen",
        isSystem: true,
        description: "列出可用資源（時間、工具、知識等）",
        exampleTasks: [
          {
            title: "每人填寫：我擅長的工具和技能",
            content: "姓名：\n\n會的工具（Excel / Google Forms / 統計軟體...）：\n\n擅長的事（訪談 / 寫作 / 數據分析...）："
          },
          {
            title: "討論並決定：用什麼方式收集資料？",
            content: "選項：問卷 / 訪談 / 觀察 / 實驗\n\n我們選擇：___\n\n原因：___\n\n可能遇到的問題："
          },
          {
            title: "找出 3 個可以查閱文獻的資料來源",
            content: "來源 1：\n來源 2：\n來源 3：\n\n（推薦：Google Scholar、台灣博碩士論文、學校圖書館資料庫）"
          }
        ]
      },
      {
        title: "潛在困難",
        icon: "alertTriangle",
        isSystem: true,
        description: "預測可能遇到的挑戰和障礙",
        exampleTasks: [
          {
            title: "預測：我們最可能在哪個步驟卡住？",
            content: "步驟：___\n\n可能的困難：___\n\n備用方案："
          },
          {
            title: "確認研究對象或樣本是否可行",
            content: "研究對象：\n\n預計樣本數：\n\n取樣方式：\n\n可能遇到的困難："
          }
        ]
      },
      {
        title: "求助策略",
        icon: "lifeBuoy",
        isSystem: true,
        description: "規劃遇到困難時的求助對象和方式",
        exampleTasks: [
          {
            title: "確定：遇到困難時，我們的第一步是什麼？",
            content: "第一步（先問同學 / 先查資料 / 先問老師）：\n\n如果第一步解決不了：\n\n最後求助對象："
          },
          {
            title: "安排：每個里程碑和老師確認一次進度",
            content: "報告頻率：每___向老師報告\n\n每次要呈現：\n\n聯絡方式："
          }
        ]
      },
      {
        title: "行動計畫",
        icon: "calendar",
        isSystem: true,
        description: "制定具體的執行步驟和時程",
        exampleTasks: [
          {
            title: "製作時程表：列出 3 個主要里程碑與截止日",
            content: "里程碑 1：___（截止：___）\n里程碑 2：___（截止：___）\n里程碑 3：___（截止：___）"
          },
          {
            title: "工作分配：誰負責什麼？",
            content: "___負責：___\n___負責：___\n___負責：___\n\n共同負責："
          }
        ]
      }
    ],
    cardPlaceholder: "新增一個策略或資源..."
  },

  "MONITORING": {
    label: "監評",
    description: "專案已有基本任務列表（待處理、進行中、完成），您可以額外新增以下補充欄位：",
    columns: [
      {
        title: "卡關中",
        icon: "xOctagon",
        type: "blocked",
        description: "遇到困難需協助的任務（建議新增）",
        recommended: true
        // 無範例任務：這個欄位存放的是學生真實卡住的任務，不適合預設
      },
      {
        title: "優先處理",
        icon: "zap",
        type: "priority",
        description: "需要優先完成的重要任務"
        // 無範例任務：優先順序由學生自己判斷
      },
      {
        title: "等待中",
        icon: "clock",
        type: "waiting",
        description: "等待他人回應或外部資源的任務"
        // 無範例任務：等待中的任務是動態產生的
      }
    ],
    cardPlaceholder: "新增任務..."
  },

  "REGULATION": {
    label: "調節",
    columns: [
      {
        title: "做得好的",
        icon: "thumbsUp",
        isSystem: true,
        description: "記錄成功經驗和優良做法",
        exampleTasks: [
          {
            title: "記錄：這次探究中最成功的決策或做法",
            content: "成功的事：\n\n為什麼有效：\n\n下次可以複製的做法："
          }
        ]
      },
      {
        title: "需要改進的",
        icon: "thumbsDown",
        isSystem: true,
        description: "反思可以改進的地方",
        exampleTasks: [
          {
            title: "反思：如果重做這個研究，什麼會做得不一樣？",
            content: "會改變的事：\n\n原因：\n\n我們遺漏了什麼重要的資料："
          }
        ]
      },
      {
        title: "下次調整",
        icon: "info",
        isSystem: true,
        description: "規劃下一次的改進方向",
        exampleTasks: [
          {
            title: "規劃：如果繼續這個研究，下一步要做什麼？",
            content: "延伸研究方向：\n\n需要的新工具或方法：\n\n可以和誰合作："
          }
        ]
      },
      {
        title: "結案報告",
        icon: "fileText",
        isSystem: true,
        description: "總結整體學習成果",
        exampleTasks: [
          {
            title: "撰寫研究摘要（100 字以內：問題、方法、結論）",
            content: "研究問題：\n\n研究方法：\n\n主要結論：\n\n研究限制："
          },
          {
            title: "準備口頭報告或成果展示",
            content: "呈現時間：___分鐘\n\n報告架構：\n1. 研究背景與問題（___min）\n2. 研究方法（___min）\n3. 結果與分析（___min）\n4. 結論與反思（___min）\n\n需要準備的素材："
          }
        ]
      }
    ],
    cardPlaceholder: "寫下反思..."
  }
};

export const PHASES = Object.keys(PHASE_TEMPLATES);
