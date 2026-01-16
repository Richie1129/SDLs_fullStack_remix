import React, { useState, useEffect } from "react";
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
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { useStageIndex, useSubStageIndex } from '../hooks/useStageIndex';
import ChatRoom from "./ChatRoom";
import useObservationMode from "../hooks/useObservationMode"; // 引入觀摩模式 hook

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
  return (
    <div
      className="fixed z-50 bg-white border-2 border-[#5BA491] rounded-lg shadow-xl p-component-base max-w-xs transition-opacity"
      style={{ left: position.x + 10, top: position.y - 10 }}
    >
      <button
        onClick={onClose}
        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors duration-fast"
      >
        <span className="text-gray-500 text-body-sm">×</span>
      </button>
      <div className="pr-8">
        <h3 className="font-bold text-[#5BA491] mb-2">{content.title}</h3>
        <ul className="text-body-sm text-gray-700 space-y-1">
          {content.items.map((item, index) => (
            <li key={index} className="flex items-start">
              <span className="text-[#5BA491] mr-2">•</span>
              {item}
            </li>
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
  const getStageColor = (stageIndex) => {
    if (parseInt(currentStageIndex) === stageIndex) {
      return "#5BA491";
    } else if (stageIndex < parseInt(currentStageIndex)) {
      return "#7C968F";
    } else {
      return "#BEBEBE";
    }
  };

  if (!isOpen) {
    // Collapsed state: small fixed-size colored block with centered text
    return (
      <div
        onClick={onClick}
        style={{ backgroundColor: getStageColor(stage.index) }}
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
      style={{ backgroundColor: getStageColor(stage.index) }}
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

export default function SideBar() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [chatRoomOpen, setChatRoomOpen] = useState(false);
  const { projectId } = useParams();
  const [currentStageIndex, setCurrentStageIndex] = useStageIndex();
  const [currentSubStageIndex, setCurrentSubStageIndex] = useSubStageIndex();
  const role = localStorage.getItem("role");

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

  const stages = [
    { name: "定標", index: 1 },
    { name: "擇策", index: 2 },
    { name: "監評", index: 3 },
    { name: "調節", index: 4 },
    { name: "歷程", index: 5 },
  ];

  const subStages = {
    1: ["提出研究主題", "提出研究目的", "提出研究問題"],
    2: ["訂定研究構想表", "設計研究記錄表格", "規劃研究排程"],
    3: ["進行嘗試性研究", "分析資料與繪圖", "撰寫研究成果"],
    4: ["檢視研究進度", "進行研究討論", "撰寫研究結論"],
    5: ["封面製作", "摘要撰寫", "目錄編制", "內容撰寫", "反思撰寫"],
  };

  const [selected, setSelected] = useState(0);

  useEffect(() => {
    const findMenuIndex = menus.findIndex((menu) =>
      location.pathname.includes(menu.link)
    );
    if (findMenuIndex !== -1) {
      setSelected(findMenuIndex);
    } else {
      setSelected(0);
    }
  }, [location, menus]);

  // Handle stage click for collapsed state
  const handleStageClick = (stage, event) => {
    if (!open) {
      // Get click position for tooltip
      const rect = event.currentTarget.getBoundingClientRect();
      setFloatingTooltip({
        isVisible: true,
        position: {
          x: rect.right,
          y: rect.top,
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
      <div
        className={`z-10 bg-white flex flex-col flex-shrink-0 border-r-2 border-gray-200 h-full`}
      >
        {/* Header with Hamburger Button */}
        <div className="flex-shrink-0 p-component-sm border-b border-gray-100">
          <div className={`flex ${open ? "justify-end" : "justify-center"}`}>
            <ToggleButton isOpen={open} onClick={() => setOpen(!open)} />
          </div>
        </div>

        {/* Main Navigation Area - Scrollable */}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden">
          <nav className="flex-1 py-4">
            {projectId === undefined
              ? null
              : menus?.map((menu, i) => (
                  <div key={i} className="px-2 mb-1">
                    <HoverTooltip text={!open ? menu.name : ""} show={!open}>
                      <NavItem
                        selected={selected === i}
                        id={i}
                        setSelected={setSelected}
                      >
                        <Link
                          to={menu?.link}
                          className={`flex items-center text-body-sm font-medium p-component-sm rounded-lg w-full ${
                            open ? "gap-3" : "justify-center"
                          }`}
                        >
                          <div className="flex-shrink-0 flex items-center justify-center">
                            {React.createElement(menu?.icon, { size: "24" })}
                          </div>
                          <span
                                                    className={`whitespace-pre text-gray-700 overflow-hidden transition-opacity duration-normal ${open ? 'opacity-100' : 'opacity-0 w-0'}`}
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
              {open && (
                <div className="text-caption font-semibold text-gray-500 uppercase tracking-wide px-1 mb-3">
                  學習階段
                </div>
              )}

              <div
                className={`${
                  open ? "space-y-stack-xs" : "flex flex-col items-center space-y-3"
                }`}
              >
                {stages.map((stage) => (
                  <StageProgressItem
                    key={stage.index}
                    stage={stage}
                    isOpen={open}
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
              <HoverTooltip text={!open ? "聊天室" : ""} show={!open}>
                <div
                  onClick={() => setChatRoomOpen(true)}
                  className={`flex items-center font-medium p-component-sm rounded-lg cursor-pointer bg-zinc-800 hover:bg-zinc-700 ${
                    open ? "gap-3" : "justify-center"
                  }`}
                >
                  <div className="flex-shrink-0 flex items-center justify-center">
                    <BsChatDots size="24" className="text-white" />
                  </div>
                  <span
                    className={`whitespace-pre text-body-sm text-white overflow-hidden transition-opacity duration-normal ${
                      open ? "opacity-100" : "opacity-0 w-0"
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
