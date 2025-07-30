import React, { useState, useEffect, useContext } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { IoBulbOutline } from 'react-icons/io5';
import { FaRegLightbulb } from "react-icons/fa";
import { MdOutlineViewKanban } from "react-icons/md";
import { TiFolderOpen } from "react-icons/ti";
import { CgNotes, CgFolder } from "react-icons/cg";
import { LuLayoutDashboard } from "react-icons/lu";
import { BiTask } from "react-icons/bi";
import { BsChatDots } from "react-icons/bs";
import { TbMessageQuestion, TbZoomQuestion } from "react-icons/tb";
import { RiDashboardLine } from "react-icons/ri";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
// import { socket } from '../utils/Socket';
import { Context } from '../context/context'
import ChatRoom from './ChatRoom';


const AnimatedHamburgerButton = () => {
    const [active, setActive] = useState(false);

    return (
        <MotionConfig
            transition={{
                duration: 0.5,
                ease: "easeInOut",
            }}
        >
            <motion.button
                initial={false}
                animate={active ? "open" : "closed"}
                onClick={() => setActive((pv) => !pv)}
                className="relative h-8 w-8 transition-colors hover:bg-white/20"
            >
                <motion.span
                    variants={VARIANTS.top}
                    className="absolute h-1 w-6 bg-zinc-800 rounded-full"
                    style={{ y: "-50%", left: "50%", x: "-50%", top: "25%" }}
                />
                <motion.span
                    variants={VARIANTS.middle}
                    className="absolute h-1 w-6 bg-zinc-800 rounded-full"
                    style={{ left: "50%", x: "-50%", top: "50%", y: "-50%" }}
                />
                <motion.span
                    variants={VARIANTS.bottom}
                    className="absolute h-1 w-6 bg-zinc-800 rounded-full"
                    style={{
                        x: "-50%",
                        y: "50%",
                        bottom: "25%",
                        left: "50%",
                    }}
                />
            </motion.button>
        </MotionConfig>
    );
};



const VARIANTS = {
    top: {
        open: {
            rotate: ["0deg", "0deg", "45deg"],
            top: ["25%", "50%", "50%"],
        },
        closed: {
            rotate: ["45deg", "0deg", "0deg"],
            top: ["50%", "50%", "25%"],
        },
    },
    middle: {
        open: {
            rotate: ["0deg", "0deg", "-45deg"],
        },
        closed: {
            rotate: ["-45deg", "0deg", "0deg"],
        },
    },
    bottom: {
        open: {
            rotate: ["0deg", "0deg", "45deg"],
            bottom: ["25%", "50%", "50%"],
            left: "50%",
        },
        closed: {
            rotate: ["45deg", "0deg", "0deg"],
            bottom: ["50%", "50%", "25%"],
            left: "50%",
        },
    },
};




export default function SideBar() {
    const location = useLocation();
    const [open, setOpen] = useState(false);
    const [chatRoomOpen, setChatRoomOpen] = useState(false);
    const { projectId } = useParams();
    const { currentStageIndex, setCurrentStageIndex, currentSubStageIndex, setCurrentSubStageIndex } = useContext(Context)
    const role = localStorage.getItem("role");

    const baseMenus = [
        { name: "進度看板", link: `/project/${projectId}/kanban`, icon: MdOutlineViewKanban },
        { name: "想法延伸", link: `/project/${projectId}/ideaWall`, icon: FaRegLightbulb },
        { name: "成果紀錄", link: `/project/${projectId}/submitTask`, icon: BiTask },
        { name: "歷程檔案", link: `/project/${projectId}/protfolio`, icon: TiFolderOpen },
        { name: "反思日誌", link: `/project/${projectId}/reflection`, icon: CgNotes },
        { name: "提問專區", link: `/project/${projectId}/askQuestion`, icon: TbMessageQuestion },
        { name: "學習概覽", link: `/project/${projectId}/studentDashboard`, icon: RiDashboardLine },
        { name: "教師儀錶板", link: `/project/${projectId}/teacherDashboard`, icon: LuLayoutDashboard },
    ];
    
    const studentOrder = ["進度看板", "想法延伸", "成果紀錄", "歷程檔案", "反思日誌", "提問專區", "學習概覽"];
    const teacherOrder = ["進度看板", "想法延伸", "成果紀錄", "歷程檔案", "反思日誌", "提問專區", "教師儀錶板"];
    
    const menus = baseMenus
        .filter(menu => (role === "student" ? studentOrder.includes(menu.name) : teacherOrder.includes(menu.name)))
        .sort((a, b) => {
            const order = role === "student" ? studentOrder : teacherOrder;
            return order.indexOf(a.name) - order.indexOf(b.name);
        });

    const [stageInfo, setStageInfo] = useState({ name: "", description: "" });
    const currentStage = localStorage.getItem("currentStage");
    const currentSubStage = localStorage.getItem("currentSubStage");

    const [openStage, setOpenStage] = useState(null);

    const toggleStage = (index) => {
        setOpenStage(openStage === index ? null : index);
    };

    const stages = [
        { name: "定標", index: 1 },
        { name: "擇策", index: 2 },
        { name: "監評", index: 3 },
        { name: "調節", index: 4 },
        { name: "歷程", index: 5 }
    ];
    
    const subStages = {
        1: ["提出研究主題", "提出研究目的", "提出研究問題"],
        2: ["訂定研究構想表", "設計研究記錄表格", "規劃研究排程"],
        3: ["進行嘗試性研究", "分析資料與繪圖", "撰寫研究成果"],
        4: ["檢視研究進度", "進行研究討論", "撰寫研究結論"],
        5: ["封面製作", "摘要撰寫", "目錄編制", "內容撰寫", "反思撰寫"]
    };
    
    const [selected, setSelected] = useState(0);
    
    const getStageColor = (stageIndex) => {
        if (parseInt(currentStageIndex) === stageIndex) {
            return '#5BA491';
        } else if (stageIndex < parseInt(currentStageIndex)) {
            return '#7C968F';
        } else {
            return '#BEBEBE';
        }
    };
    
    const getTextColor = (stageIndex) => {
        if (parseInt(currentStage) === stageIndex) {
            return 'text-white';
        } else if (stageIndex < parseInt(currentStage)) {
            return 'text-slate-200';
        } else {
            return 'text-slate-700';
        }
    };
    
    useEffect(() => {
        const findMenuIndex = menus.findIndex(menu => location.pathname.includes(menu.link));
        if (findMenuIndex !== -1) {
            setSelected(findMenuIndex);
        } else {
            setSelected(0);
        }
    }, [location]);
    
    const NavItem = ({ children, selected, id, setSelected }) => {
        return (
            <motion.button
                className="hover:bg-slate-200 transition-colors relative w-full"
                onClick={() => setSelected(id)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <span className="block relative z-10 w-full">{children}</span>
                <AnimatePresence>
                    {selected && (
                        <motion.span
                            className="absolute inset-0 rounded-md bg-[#5BA491]/30 z-0"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                        ></motion.span>
                    )}
                </AnimatePresence>
            </motion.button>
        );
    };

    // 動態計算 sidebar 寬度的 class
    const sidebarWidthClass = open 
        ? "w-40 sm:w-48 md:w-52 lg:w-56" 
        : "w-14 sm:w-14 md:w-16 lg:w-18";

    return (
        <>
            <div className={`z-10 bg-white flex flex-col flex-shrink-0 duration-500 border-r-2 ${sidebarWidthClass} min-h-screen relative`}>
                <div className='flex flex-col justify-between h-full overflow-y-auto overflow-x-hidden'>
                    <div className="flex flex-col">
                        {/* Hamburger Button */}
                        <div className={`my-2 flex ${open ? "justify-end pr-2" : "justify-center"}`} onClick={() => setOpen(!open)}>
                            <AnimatedHamburgerButton size={26} className='cursor-pointer' />
                        </div>
                        
                        {/* Menu Items */}
                        <nav className='flex flex-col relative'>
                            {projectId === undefined ? <></> :
                                menus?.map((menu, i) => (
                                    <div key={i} className="relative group">
                                        <NavItem selected={selected === i} id={i} setSelected={setSelected}>
                                            <Link 
                                                to={menu?.link} 
                                                className="flex items-center text-sm gap-3.5 font-medium p-3 rounded-sm ml-1 w-full"
                                            >
                                                <div className="flex-shrink-0">
                                                    {React.createElement(menu?.icon, { size: "26" })}
                                                </div>
                                                <h2 
                                                    style={{ transitionDelay: `${i + 1}00ms` }} 
                                                    className={`whitespace-pre duration-500 ${!open && "opacity-0 scale-0 overflow-hidden"}`}
                                                >
                                                    {menu?.name}
                                                </h2>
                                            </Link>
                                        </NavItem>
                                        
                                        {/* Tooltip - 移到外層避免 overflow 問題 */}
                                        {!open && (
                                            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-white border border-gray-200 rounded-md shadow-lg text-sm font-semibold text-gray-900 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                                                {menu?.name}
                                                {/* Arrow */}
                                                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-white"></div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            }

                            {/* Stage Progress */}
                            {projectId && (
                                <div className="mt-auto mb-4 transition-all duration-500 w-full pt-4">
                                    <div className="flex flex-col space-y-2 px-1">
                                        {stages.map((stage) => (
                                            <div key={stage.index} className="w-full">
                                                <div
                                                    onClick={() => toggleStage(stage.index)}
                                                    style={{ backgroundColor: getStageColor(stage.index) }}
                                                    className={`h-8 w-full flex items-center justify-center cursor-pointer ${getTextColor(stage.index)} rounded-sm`}
                                                >
                                                    <span className="text-sm font-bold">{stage.name}</span>
                                                </div>

                                                {openStage === stage.index && (
                                                    <div className="bg-gray-100 text-gray-900 text-sm rounded-md p-2 border border-gray-300 mt-1">
                                                        {subStages[stage.index].map((sub, i) => (
                                                            <div key={i} className="py-1 pl-4">{sub}</div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </nav>
                    </div>
                    
                    {/* Chat Room Button */}
                    {projectId !== undefined && (
                        <div className="relative group">
                            <div 
                                onClick={() => setChatRoomOpen(true)} 
                                className="flex items-center text-base gap-3.5 font-medium p-3 rounded-xl cursor-pointer bg-zinc-800 mx-1 mb-2"
                            >
                                <div className="flex-shrink-0">
                                    <BsChatDots size={"26"} className="text-white" />
                                </div>
                                <h2 className={`whitespace-pre text-sm text-white flex-1 duration-500 ${!open && "opacity-0 scale-0 overflow-hidden"}`}>
                                    聊天室
                                </h2>
                            </div>
                            
                            {/* Chat Tooltip */}
                            {!open && (
                                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-white border border-gray-200 rounded-md shadow-lg text-sm font-semibold text-gray-900 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                                    聊天室
                                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-white"></div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <ChatRoom chatRoomOpen={chatRoomOpen} setChatRoomOpen={setChatRoomOpen} />
        </>
    )
};
