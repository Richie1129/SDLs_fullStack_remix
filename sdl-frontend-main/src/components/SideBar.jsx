import React, { useState, useEffect, useRef } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { FaRegLightbulb } from "react-icons/fa";
import { MdOutlineViewKanban } from "react-icons/md";
import { TiFolderOpen } from "react-icons/ti";
import { CgNotes } from "react-icons/cg";
import { LuLayoutDashboard } from "react-icons/lu";
import { BiTask } from "react-icons/bi";
import { BsChatDots } from "react-icons/bs";
import { TbMessageQuestion } from "react-icons/tb";
import { RiDashboardLine } from "react-icons/ri";
import { FiChevronLeft, FiChevronRight, FiX } from "react-icons/fi";
import { useStageIndex, useSubStageIndex } from '../hooks/useStageIndex';
import ChatRoom from "./ChatRoom";
import useObservationMode from "../hooks/useObservationMode"; // 引入觀摩模式 hook
import useMediaQuery from "../hooks/useMediaQuery";
import { userStorage } from '../services/storageService';
import { getStageColor } from '../utils/stageUtils';

// Simple NavItem without framer-motion
const NavItem = ({ children, selected, id, setSelected }) => {
  return (
    <button
      className="hover:bg-slate-100 transition-colors duration-fast relative w-full rounded-md"
      onClick={() => setSelected(id)}
    >
      <span className="block relative z-10 w-full">{children}</span>
      {selected && (
        <span className="absolute inset-0 rounded-md bg-[#5BA491]/20 z-0" />
      )}
    </button>
  );
};

// Floating Tooltip Component for Stage Definitions
const FloatingTooltip = ({ isVisible, position, content, onClose }) => {
  if (!isVisible) return null;
  
  const tooltipRef = React.useRef(null);
  const [tooltipHeight, setTooltipHeight] = React.useState(0);
  
  React.useEffect(() => {
    if (tooltipRef.current) {
      setTooltipHeight(tooltipRef.current.offsetHeight);
    }
  }, [content]);
  
  // 計算 tooltip 的 top 位置，使其垂直居中對齊觸發按鈕
  // 但限制不超出視窗
  const calculateTop = () => {
    if (!tooltipHeight) return position.triggerCenter - 50; // 初始估計值
    
    let calculatedTop = position.triggerCenter - tooltipHeight / 2;
    
    // 確保不超出視窗頂部
    if (calculatedTop < 10) calculatedTop = 10;
    // 確保不超出視窗底部
    if (calculatedTop + tooltipHeight > window.innerHeight - 10) {
      calculatedTop = window.innerHeight - tooltipHeight - 10;
    }
    
    return calculatedTop;
  };
  
  const tooltipTop = calculateTop();
  // 箭頭位置：觸發按鈕中心 - tooltip 的 top
  const arrowTop = position.triggerCenter - tooltipTop;
  
  return (
    <div
      ref={tooltipRef}
      className="fixed z-dropdown bg-white border-2 border-[#5BA491] rounded-lg shadow-xl p-component-base max-w-xs transition-opacity"
      style={{ left: position.x + 10, top: tooltipTop }}
    >
      {/* 左側箭頭 - 對準觸發按鈕中心 */}
      <div 
        className="absolute right-full -mr-[2px]"
        style={{ top: `${arrowTop}px`, transform: 'translateY(-50%)' }}
      >
        {/* 外層箭頭（邊框色） */}
        <div className="relative">
          <div className="w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-r-[10px] border-r-[#5BA491]"></div>
          {/* 內層箭頭（背景色） */}
          <div className="absolute top-1/2 -translate-y-1/2 left-[2px] w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[8px] border-r-white"></div>
        </div>
      </div>
      
      <button
        onClick={onClose}
        aria-label="關閉"
        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors duration-fast"
      >
        <FiX className="w-4 h-4 text-gray-500" aria-hidden="true" />
      </button>
      <div className="pr-8">
        <h3 className="font-bold text-[#5BA491] mb-2">{content.title}</h3>
        <ul className="text-body-sm text-gray-700 space-y-1 list-disc list-inside">
          {content.items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

// Hover Tooltip Component for Navigation Items
const HoverTooltip = ({ children, text, show = true }) => {
  if (!show || !text) return children;

  return (
    <div className="relative group">
      {children}
      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-white border border-gray-200 rounded-md shadow-lg text-body-sm font-semibold text-gray-900 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-fast pointer-events-none z-50">
        {text}
        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-white"></div>
      </div>
    </div>
  );
};

// Stage Progress Item with Perfect Centering
const StageProgressItem = ({ stage, isOpen, currentStageIndex, onClick }) => {
  // [Refactored] getStageColor 已統一至 stageUtils.js

  if (!isOpen) {
    // Collapsed state: small fixed-size colored block with centered text
    return (
      <div
        onClick={onClick}
        style={{ backgroundColor: getStageColor(stage.index, currentStageIndex) }}
        className="h-8 w-14 rounded-md flex items-center justify-center cursor-pointer mx-auto hover:shadow"
      >
        <span className="text-caption font-semibold text-white tracking-wide">
          {stage.name}
        </span>
      </div>
    );
  }

  // Expanded state: show full stage button
  return (
    <div
      onClick={onClick}
      style={{ backgroundColor: getStageColor(stage.index, currentStageIndex) }}
      className="h-10 w-full flex items-center justify-center cursor-pointer rounded-lg hover:shadow"
    >
      <span className="text-body-sm font-bold text-white">{stage.name}</span>
    </div>
  );
};

// Simple toggle button with chevrons
const ToggleButton = ({ isOpen, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="h-10 w-10 flex items-center justify-center hover:bg-gray-100 rounded-md border border-gray-200"
      aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
    >
      {isOpen ? (
        <FiChevronLeft className="text-zinc-800" />
      ) : (
        <FiChevronRight className="text-zinc-800" />
      )}
    </button>
  );
};

export default function SideBar({ mobileOpen = false, onMobileClose }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [chatRoomOpen, setChatRoomOpen] = useState(false);
  const { projectId } = useParams();
  const [currentStageIndex, setCurrentStageIndex] = useStageIndex();
  const [currentSubStageIndex, setCurrentSubStageIndex] = useSubStageIndex();
  const role = userStorage.get("role");
  const panelRef = useRef(null);
  const isMdUp = useMediaQuery('(min-width: 768px)');
  const expanded = isMdUp ? open : true;

  // 使用觀摩模式 hook
  const { isObservationMode } = useObservationMode();

  // Floating tooltip state
  const [floatingTooltip, setFloatingTooltip] = useState({
    isVisible: false,
    position: { x: 0, y: 0 },
    content: { title: "", items: [] },
  });

  const baseMenus = [
    {
      name: "進度看板",
      link: `/project/${projectId}/kanban`,
      icon: MdOutlineViewKanban,
    },
    {
      name: "想法延伸",
      link: `/project/${projectId}/ideaWall`,
      icon: FaRegLightbulb,
    },
    {
      name: "成果紀錄",
      link: `/project/${projectId}/submitTask`,
      icon: BiTask,
    },
    {
      name: "歷程檔案",
      link: `/project/${projectId}/protfolio`,
      icon: TiFolderOpen,
    },
    {
      name: "反思日誌",
      link: `/project/${projectId}/reflection`,
      icon: CgNotes,
    },
    {
      name: "提問專區",
      link: `/project/${projectId}/askQuestion`,
      icon: TbMessageQuestion,
    },
    {
      name: "學習概覽",
      link: `/project/${projectId}/studentDashboard`,
      icon: RiDashboardLine,
    },
    {
      name: "教師儀錶板",
      link: `/project/${projectId}/teacherDashboard`,
      icon: LuLayoutDashboard,
    },
  ];

  // 觀摩模式下只顯示特定的選項
  const observationMenus = ["進度看板", "想法延伸", "歷程檔案"];

  const studentOrder = [
    "進度看板",
    "想法延伸",
    "成果紀錄",
    "歷程檔案",
    "反思日誌",
    "提問專區",
    "學習概覽",
  ];
  const teacherOrder = [
    "進度看板",
    "想法延伸",
    "成果紀錄",
    "歷程檔案",
    "反思日誌",
    "提問專區",
    "教師儀錶板",
  ];

  let menus;
  if (isObservationMode) {
    // 觀摩模式：只顯示指定的選項
    menus = baseMenus.filter((menu) => observationMenus.includes(menu.name));
  } else {
    // 正常模式：根據角色顯示相應選項
    menus = baseMenus
      .filter((menu) =>
        role === "student"
          ? studentOrder.includes(menu.name)
          : teacherOrder.includes(menu.name)
      )
      .sort((a, b) => {
        const order = role === "student" ? studentOrder : teacherOrder;
        return order.indexOf(a.name) - order.indexOf(b.name);
      });
  }

  // Option B: 四階段 SRL 循環（「歷程」階段已隱藏）
  const stages = [
    { name: "定標", index: 1 },
    { name: "擇策", index: 2 },
    { name: "監評", index: 3 },
    { name: "調節", index: 4 },
    // [Option B 隱藏] 「歷程」階段 - 改為獨立的 Portfolio 功能模組
    // { name: "歷程", index: 5 },
  ];

  // Option B: 四階段子階段配置（「歷程」子階段已隱藏）
  const subStages = {
    1: ["提出研究主題", "提出研究目的", "提出研究問題"],
    2: ["訂定研究構想表", "設計研究記錄表格", "規劃研究排程"],
    3: ["進行嘗試性研究", "分析資料與繪圖", "撰寫研究成果"],
    4: ["檢視研究進度", "進行研究討論", "撰寫研究結論"],
    // [Option B 隱藏] Stage 5 子階段
    // 5: ["封面製作", "摘要撰寫", "目錄編制", "內容撰寫", "反思撰寫"],
  };

  const [selected, setSelected] = useState(0);

  useEffect(() => {
    // student-portfolio（個人學習歷程匯出頁）歸屬於「歷程檔案」分類
    if (location.pathname.includes('student-portfolio')) {
      const idx = menus.findIndex((m) => m.name === '歷程檔案');
      if (idx !== -1) {
        setSelected(idx);
        return;
      }
    }

    const findMenuIndex = menus.findIndex((menu) =>
      location.pathname.includes(menu.link)
    );
    if (findMenuIndex !== -1) {
      setSelected(findMenuIndex);
    } else {
      setSelected(0);
    }
  }, [location, menus]);

  // 手機抽屜開啟時，Escape 鍵關閉
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (mobileOpen && !isMdUp && e.key === 'Escape') {
        onMobileClose?.();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen, isMdUp, onMobileClose]);

  // 手機抽屜開啟時，焦點移到第一個連結
  useEffect(() => {
    if (mobileOpen && !isMdUp) {
      panelRef.current?.querySelector('a[href]')?.focus();
    }
  }, [mobileOpen]);

  // Handle stage click for collapsed state
  const handleStageClick = (stage, event) => {
    if (!expanded) {
      // Get click position for tooltip
      const rect = event.currentTarget.getBoundingClientRect();
      setFloatingTooltip({
        isVisible: true,
        position: {
          x: rect.right,
          y: rect.top,
          triggerCenter: rect.top + rect.height / 2, // 觸發按鈕的垂直中心
        },
        content: {
          title: stage.name,
          items: subStages[stage.index],
        },
      });
    }
  };

  // Close floating tooltip
  const closeFloatingTooltip = () => {
    setFloatingTooltip({
      ...floatingTooltip,
      isVisible: false,
    });
  };

  return (
    <>
      {/* 手機抽屜遮罩，排在面板之前，讓面板疊在遮罩之上 */}
      {!isMdUp && mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-drawer bg-black/40 transition-opacity duration-normal"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <div
        ref={panelRef}
        aria-label="專案導覽"
        {...(!isMdUp && mobileOpen ? { role: 'dialog', 'aria-modal': true } : {})}
        className={`fixed inset-y-0 left-0 z-drawer w-64 max-w-[80vw] md:static md:inset-auto md:z-10 md:w-auto md:max-w-none bg-white flex flex-col flex-shrink-0 border-r-2 border-gray-200 h-full transform transition-[transform,visibility] duration-slow ease-drawer motion-reduce:transition-none md:transform-none md:transition-none md:visible ${mobileOpen ? 'translate-x-0 visible' : '-translate-x-full invisible'}`}
      >
        {/* Header with Hamburger Button */}
        <div className="flex-shrink-0 p-component-sm border-b border-gray-100">
          {isMdUp ? (
            <div className={`flex ${open ? "justify-end" : "justify-center"}`}>
              <ToggleButton isOpen={open} onClick={() => setOpen(!open)} />
            </div>
          ) : (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onMobileClose}
                aria-label="關閉導覽"
                className="h-10 w-10 flex items-center justify-center hover:bg-gray-100 rounded-md border border-gray-200"
              >
                <FiX className="text-zinc-800" />
              </button>
            </div>
          )}
        </div>

        {/* Main Navigation Area - Scrollable */}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden">
          <nav className="flex-1 py-4">
            {projectId === undefined
              ? null
              : menus?.map((menu, i) => (
                  <div key={i} className="px-2 mb-1">
                    <HoverTooltip text={!expanded ? menu.name : ""} show={!expanded}>
                      <NavItem
                        selected={selected === i}
                        id={i}
                        setSelected={setSelected}
                      >
                        <Link
                          to={menu?.link}
                          aria-current={selected === i ? 'page' : undefined}
                          onClick={() => onMobileClose?.()}
                          className={`flex items-center text-body-sm font-medium p-component-sm rounded-lg w-full ${
                            expanded ? "gap-3" : "justify-center"
                          } ${selected === i ? "text-customgreen font-semibold" : "text-gray-700"}`}
                        >
                          <div className="flex-shrink-0 flex items-center justify-center">
                            {React.createElement(menu?.icon, { size: "24" })}
                          </div>
                          <span
                                                    className={`whitespace-pre overflow-hidden transition-opacity duration-normal ${expanded ? 'opacity-100' : 'opacity-0 w-0'}`}
                          >
                            {menu?.name}
                          </span>
                        </Link>
                      </NavItem>
                    </HoverTooltip>
                  </div>
                ))}
          </nav>
        </div>

        {/* Fixed Footer Area */}
        <div className="flex-shrink-0 border-t border-gray-100 bg-white">
          {/* Stage Progress Section */}
          {projectId && (
            <div className="p-component-sm">
              {/* Section Title for expanded state */}
              {expanded && (
                <div className="text-caption font-semibold text-gray-500 uppercase tracking-wide px-1 mb-3">
                  學習階段
                </div>
              )}

              <div
                className={`${
                  expanded ? "space-y-stack-xs" : "flex flex-col items-center space-y-3"
                }`}
              >
                {stages.map((stage) => (
                  <StageProgressItem
                    key={stage.index}
                    stage={stage}
                    isOpen={expanded}
                    currentStageIndex={currentStageIndex}
                    onClick={(e) => handleStageClick(stage, e)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Chat Room Button */}
          {projectId !== undefined && (
            <div className="p-component-sm border-t border-gray-100">
              <HoverTooltip text={!expanded ? "聊天室" : ""} show={!expanded}>
                <div
                  onClick={() => setChatRoomOpen(true)}
                  className={`flex items-center font-medium p-component-sm rounded-lg cursor-pointer bg-zinc-800 hover:bg-zinc-700 ${
                    expanded ? "gap-3" : "justify-center"
                  }`}
                >
                  <div className="flex-shrink-0 flex items-center justify-center">
                    <BsChatDots size="24" className="text-white" />
                  </div>
                  <span
                    className={`whitespace-pre text-body-sm text-white overflow-hidden transition-opacity duration-normal ${
                      expanded ? "opacity-100" : "opacity-0 w-0"
                    }`}
                  >
                    聊天室
                  </span>
                </div>
              </HoverTooltip>
            </div>
          )}
        </div>
      </div>

      {/* Floating Tooltip */}
      <FloatingTooltip
        isVisible={floatingTooltip.isVisible}
        position={floatingTooltip.position}
        content={floatingTooltip.content}
        onClose={closeFloatingTooltip}
      />

      <ChatRoom chatRoomOpen={chatRoomOpen} setChatRoomOpen={setChatRoomOpen} />
    </>
  );
}
