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
        description: "記錄初步想法、靈光乍現的點子"
      },
      { 
        title: "篩選區", 
        icon: "search", 
        isSystem: true,
        description: "評估想法的可行性、挑選最值得研究的主題"
      },
      { 
        title: "最終目標", 
        icon: "trophy", 
        isSystem: true,
        description: "確定最終要達成的研究目標"
      },
      {
        title: "成功標準",
        icon: "checkSquare",
        isSystem: true,
        description: "列出具體可衡量的成功指標"
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
        description: "列出可用資源（時間、工具、知識等）"
      },
      { 
        title: "潛在困難", 
        icon: "alertTriangle", 
        isSystem: true,
        description: "預測可能遇到的挑戰和障礙"
      },
      { 
        title: "求助策略", 
        icon: "lifeBuoy", 
        isSystem: true,
        description: "規劃遇到困難時的求助對象和方式"
      },
      { 
        title: "行動計畫", 
        icon: "calendar", 
        isSystem: true,
        description: "制定具體的執行步驟和時程"
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
      },
      { 
        title: "優先處理", 
        icon: "zap", 
        type: "priority",
        description: "需要優先完成的重要任務"
      },
      { 
        title: "等待中", 
        icon: "clock", 
        type: "waiting",
        description: "等待他人回應或外部資源的任務"
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
        description: "記錄成功經驗和優良做法"
      },
      { 
        title: "需要改進的", 
        icon: "thumbsDown", 
        isSystem: true,
        description: "反思可以改進的地方"
      },
      { 
        title: "下次調整", 
        icon: "info", 
        isSystem: true,
        description: "規劃下一次的改進方向"
      },
      { 
        title: "結案報告", 
        icon: "fileText", 
        isSystem: true,
        description: "總結整體學習成果"
      }
    ],
    cardPlaceholder: "寫下反思..."
  }
};

export const PHASES = Object.keys(PHASE_TEMPLATES);
