import React from 'react';
import { FiTarget, FiSearch, FiCheckSquare, FiBookOpen, FiAlertTriangle, FiLifeBuoy, FiCalendar, FiClipboard, FiZap, FiCheckCircle, FiThumbsUp, FiThumbsDown, FiInfo, FiFileText } from 'react-icons/fi';
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
  clipboard: <FiClipboard className="w-4 h-4" />,
  zap: <FiZap className="w-4 h-4" />,
  xOctagon: <FiXOctagon className="w-4 h-4" />,
  checkCircle: <FiCheckCircle className="w-4 h-4" />,
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
        defaultCards: [
          { title: "範例：我想研究校園植物", type: "example" }
        ]
      },
      { title: "篩選區", icon: "search", isSystem: true },
      { title: "最終目標", icon: "trophy", isSystem: true },
      {
        title: "成功標準",
        icon: "checkSquare",
        isSystem: true,
        defaultCards: [
          { title: "範例：能成功辨識 5 種植物", type: "example" }
        ]
      }
    ],
    cardPlaceholder: "寫下一個具體的目標..."
  },
  "STRATEGY": {
    label: "擇策",
    columns: [
      { title: "資源盤點", icon: "bookOpen", isSystem: true },
      { title: "潛在困難", icon: "alertTriangle", isSystem: true },
      { title: "求助策略", icon: "lifeBuoy", isSystem: true },
      { title: "行動計畫", icon: "calendar", isSystem: true }
    ],
    cardPlaceholder: "新增一個策略或資源..."
  },
  "MONITORING": {
    label: "監評",
    columns: [
      { title: "待辦清單", icon: "clipboard", type: "todo" },
      { title: "進行中", icon: "zap", type: "doing", limit: 3 },
      { title: "卡關中", icon: "xOctagon", type: "blocked" },
      { title: "已完成", icon: "checkCircle", type: "done" }
    ],
    cardPlaceholder: "新增待辦事項..."
  },
  "REGULATION": {
    label: "調節",
    columns: [
      { title: "做得好的", icon: "thumbsUp", isSystem: true },
      { title: "需要改進的", icon: "thumbsDown", isSystem: true },
      { title: "下次調整", icon: "info", isSystem: true },
      { title: "結案報告", icon: "fileText", isSystem: true }
    ],
    cardPlaceholder: "寫下反思..."
  }
};

export const PHASES = Object.keys(PHASE_TEMPLATES);
