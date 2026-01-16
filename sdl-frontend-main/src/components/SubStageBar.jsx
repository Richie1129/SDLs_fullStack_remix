import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { useParams } from 'react-router-dom'
import { getProject } from '../api/project';

import { socket } from '../utils/socket';
// import { useQuery } from 'react-query';
import { useStageIndex, useSubStageIndex } from '../hooks/useStageIndex';

const DialogBox = ({ isOpen, onClose, onOptionSelect }) => {
    const [animationClass, setAnimationClass] = useState('');
    const [dialogContent, setDialogContent] = useState('嗨!有什麼能夠幫助你的嗎?');
    const [showOptions, setShowOptions] = useState(true);

    const stageGoal = [
        ["這個階段的目標是為了確定研究的主題範圍，並確保主題具有研究價值和實務意義哦!",
            "這個階段的目標是為了明確研究旨在解決的問題或達到的效果，闡述研究的重要性哦~",
            "這個階段的目標是為了定義清晰、具體的研究問題，指導研究的方向與範圍哦!"],
        ["這個階段的目標是為了建立研究架構和方法論基礎，明確研究的理論背景和假設哦~",
            "這個階段的目標是為了為收集資料和記錄研究過程提供標準化工具哦!",
            "這個階段的目標是為了合理安排研究活動的時間表，確保研究工作有秩序地進行哦~"],
        ["這個階段的目標是為了透過初步的研究活動，驗證研究方法的可行性和有效性哦!",
            "這個階段的目標是為了對收集到的資料進行系統性分析，透過圖表形式展示研究結果哦~",
            "這個階段的目標是為了詳細記錄研究過程和發現，包括資料分析、討論和結論哦!"],
        ["這個階段的目標是為了定期回顧研究工作的進展，確保研究按計畫進行哦~",
            "這個階段的目標是為了與導師、同儕或研究小組討論研究發現和問題，以獲得回饋和建議哦!",
            "這個階段的目標是為了總結研究的主要發現，討論研究的意義、限制和未來研究的方向哦~"],
        ["封面製作的目的是為學習歷程檔案提供一個引人注目的開始，反映出檔案的主題和內容精神。它首先給讀者留下視覺上的印象，有助於建立檔案的專業形象。",
            "摘要的目的是提供一個簡短而全面的學習歷程概述，包括學習目標、主要活動、獲得的學習成果等，讓讀者快速了解整個學習歷程的精髓。",
            "目錄編制的目的是為了提供一個清晰的學習歷程架構概覽，使讀者能夠快速找到感興趣的部分。",
            "內容撰寫的目的是深入記錄和分析學習過程中的各項活動、發現、思考和反思，以展現學習者的學習深度和廣度。",
            "反思撰寫的目的是促進學習者對自己學習過程的深入思考，包括反思學習成果、過程中的挑戰、學到的課程以及未來的學習計劃。"]
    ];
    const stageProcess = [
        ["在這個階段你可以先進行文獻回顧，識別研究領域中的空白或爭議點，再透過討論和思考縮小研究範圍，最後再和小組成員一起確定出一個具體的研究主題!",
            "在這個階段你可以基於研究主題去細化研究的目標與期望成果，其中也包括了理論與實務層面的貢獻哦~",
            "在這個階段你可以根據研究目的，提出可操作的研究問題，同時確保問題具有明確性和可研究性!"],
        ["在這個階段你可以一步步地發展出研究概念框架，其中包括了研究假設、變數定義和預期的研究模型!",
            "在這個階段你可以根據研究問題和方法，設計資料收集表格和記錄表，包括但不限於問卷、訪談記錄和實驗資料表~",
            "在這個階段你可以制定詳細的研究計畫和時間線，包括各階段的開始和結束日期，以及關鍵活動和里程碑!"],
        ["在這個階段你可以在小範圍內實施研究設計，收集和分析數據，評估研究方法和工具的適用性~",
            "在這個階段你可以使用統計軟體或手動方法對資料進行分析，包括描述性統計、相關性分析等，並製作圖表來直觀展示分析結果!",
            "在這個階段你可以整理分析數據，撰寫研究報告的各個部分，包括引言、方法、結果、討論和結論等~"],
        ["在這個階段你可以定期檢視研究行程和成果，評估是否需要調整研究方向或方法!",
            "在這個階段你可以組織研究討論會，呈現研究結果，收集與整合回饋意見，對研究進行深入分析與完善!",
            "在這個階段你可以基於研究結果和討論，撰寫結論部分，明確指出研究的貢獻和後續研究的建議~"],
        ["使用線上設計軟體（Pixlr、Canva、Fotor）進行設計，確保封面既美觀又具有專業度，建議可以保持簡潔，避免過多的裝飾元素。",
            "摘要文長建議約300字左右，簡練地概述統整後的學習活動的背景、目標、方法、主要發現或成果以及結論。",
            "建議可依據學習主題進行分類排序，整理出一目了然的目錄，讓讀者快速理解你想呈現的學習重點。",
            "建議根據歷程檔案中的階段紀錄資訊進行重製，內容的撰寫切記保持語言清晰、邏輯嚴謹。",
            "反思撰寫切記「重質不重量」，不是越多越好!可以思考當初為何要參加?在過程中學會什麼?"]
    ];

    const [displayedContent, setDisplayedContent] = useState('');


    useEffect(() => {
        setDisplayedContent(''); // 在开始打字前清空内容
        let charIndex = 0;
        const typeWriter = setInterval(() => {
            if (charIndex < dialogContent.length) {
                const charToAdd = dialogContent[charIndex];
                if (typeof charToAdd !== 'undefined') {  // 确保即将添加的字符不是 undefined
                    setDisplayedContent((prev) => prev + charToAdd);
                    // console.log("Adding:", charToAdd);  // 输出当前添加的字符，帮助诊断问题
                } else {
                    console.error("Attempted to add undefined character at index", charIndex);
                }
                charIndex++;
            } else {
                clearInterval(typeWriter);
            }
        }, 50); // 每50毫秒添加一个字符
    
        return () => clearInterval(typeWriter); // 清除定时器
    }, [dialogContent]); // 依赖于dialogContent的变化

    useEffect(() => {
        if (isOpen) {
            setAnimationClass('-translate-y-0 opacity-100');
        } else {
            setAnimationClass('translate-y-full opacity-0');
        }
        const style = document.createElement('style');
        style.innerHTML = `
            .dialog-box::after {
                content: '';
                position: absolute;
                bottom: -30px; 
                right: 28px; 
                border-left: 13px solid transparent;
                border-right: 13px solid transparent;
                border-top: 30px solid #f1f5f9; 
            }
        `;
        document.head.appendChild(style);

        // 组件卸载时移除样式
        return () => {
            document.head.removeChild(style);
        };
    }, [isOpen]);

    const handleOptionSelect = (option) => {
        const currentStageIndex = parseInt(localStorage.getItem("currentStage"), 10) || 1;
        const currentSubStageIndex = parseInt(localStorage.getItem('currentSubStage'), 10) || 1;
        if (option === 'option1') {
            setDialogContent(stageGoal[currentStageIndex - 1][currentSubStageIndex - 1] || '目前沒有設定子階段目標。');
        }
        if (option === 'option2') {
            setDialogContent(stageProcess[currentStageIndex - 1][currentSubStageIndex - 1] || '目前沒有設定子階段流程。');
        }
        setShowOptions(false);
    };

    const resetDialog = () => {
        setDialogContent('嗨!有什麼能夠幫助你的嗎?');
        setShowOptions(true);
        onClose();
        // setImageSrc('/robot.png'); 
    };



    if (!isOpen && animationClass.includes('opacity-0')) return null;


    return (
        <div className={`absolute right-2 sm:right-4 lg:right-40 bottom-0 mb-16 sm:mb-20 lg:mb-28 rounded-lg transform transition-all duration-slow ease-in-out ${animationClass} shadow-2xl dialog-box max-w-xs sm:max-w-sm lg:max-w-md`}>
            <div className="bg-slate-100 p-component-sm sm:p-component-base rounded-lg font-bold">
                <p className="text-caption sm:text-body-sm lg:text-body">{displayedContent}</p>
                {showOptions && (
                    <>
                        <button onClick={() => handleOptionSelect('option1')} className="bg-[#5BA491] text-white w-full rounded-lg my-2 sm:my-3 py-1 sm:py-2 text-caption sm:text-body-sm">階段目標說明</button>
                        <button onClick={() => handleOptionSelect('option2')} className="bg-[#5BA491] text-white w-full rounded-lg py-1 sm:py-2 text-caption sm:text-body-sm">階段如何進行</button>
                    </>
                )}
                {!showOptions && (
                    <button onClick={resetDialog} className="bg-[#5BA491] text-white w-full rounded-lg my-2 sm:my-3 py-1 sm:py-2 text-caption sm:text-body-sm">我了解了!</button>
                )}
            </div>
        </div>
    );
};

const stageInfo = [
    ["提出研究主題", "提出研究目的", "提出研究問題"],
    ["訂定研究構想表", "設計研究記錄表格", "規劃研究排程"],
    ["進行嘗試性研究", "分析資列與繪圖", "撰寫研究結果"],
    ["檢視研究進度", "進行研究討論", "撰寫研究結論"],
    ["封面製作", "摘要撰寫", "目錄編制", "內容撰寫", "反思撰寫"]
];
// const currentStageIndex = parseInt(localStorage.getItem("currentStage"), 10) || 1;
// const currentSubStageIndex = parseInt(localStorage.getItem("currentSubStage"), 10) || 1;



export default function SubStageComponent() {
    // State hooks for stage indices

    const [currentStageIndex, setCurrentStageIndex] = useStageIndex();
    const [currentSubStageIndex, setCurrentSubStageIndex] = useSubStageIndex();
    const [stages, setStages] = useState([]);
    const [isDialogOpen, setDialogOpen] = useState(false);
    const [imageSrc, setImageSrc] = useState('/robot.png');
    const [isHovered, setIsHovered] = useState(false);
    const [ignoreHover, setIgnoreHover] = useState(false); // 新增狀態
    const dialogRef = useRef();
    const queryClient = useQueryClient();
    const { projectId } = useParams();

    // Update stages based on the current stage index
    useEffect(() => {
        const isValidStageIndex = currentStageIndex > 0 && currentStageIndex <= stageInfo.length;
        setStages(isValidStageIndex ? stageInfo[currentStageIndex - 1] : []);
        console.log("currentSubStageIndexChanged", currentSubStageIndex)
    }, [currentSubStageIndex]);

    const handleRobotClick = () => {
        document.body.style.overflow = 'hidden'; // 開啟DialogBox時禁止滾動
        setDialogOpen(true);
        setImageSrc('/robot2.png');
        setIgnoreHover(true);
    };
    const getStageColor = (stageIndex) => {
        if (currentSubStageIndex === stageIndex) {
            return '#5BA491'; // 当前阶段
        } else if (stageIndex < currentSubStageIndex) {
            return '#7C968F'; // 小于当前阶段的阶段
        } else {
            return '#BEBEBE'; // 其他阶段
        }
    };
    const getTextColor = (stageIndex) => {
        if (currentSubStageIndex === stageIndex) {
            return 'text-white animate-pulse '; // 当前阶段
        } else if (stageIndex < currentSubStageIndex) {
            return 'text-slate-200'; // 小于当前阶段的阶段
        } else {
            return 'text-slate-700'; // 其他阶段
        }
    };
    const getProjectQuery = useQuery("getProject", () => getProject(projectId),
        {
            onSuccess: (data) => {
                localStorage.setItem('currentStage', data.currentStage)
                localStorage.setItem('currentSubStage', data.currentSubStage)
                setCurrentStageIndex(data.currentStage)
                setCurrentSubStageIndex(data.currentSubStage)
            },
            enabled: !!projectId
        }
    );
    // Handle socket event
    useEffect(() => {
        const handleRefreshKanban = (newStages) => {
            queryClient.invalidateQueries('getProject');
        };

        socket.on('refreshKanban', handleRefreshKanban);

        return () => {
            // socket.disconnect();
            // socket.off('refreshKanban', handleRefreshKanban);
        };
    }, []);

    // useEffect(() => {
    // console.log("Updated currentStageIndex", currentStageIndex);
    // console.log("Updated currentSubStageIndex", currentSubStageIndex);
    // 這裡可以根據更新後的狀態執行一些操作
    // }, [currentStageIndex, currentSubStageIndex]);

    const handleCloseDialog = () => {
        document.body.style.overflow = ''; // 關閉DialogBox時恢復滾動
        setDialogOpen(false);
        setImageSrc('/robot.png')
        setIgnoreHover(false); // 重置懸浮狀態

    };

    const handleOptionSelect = (option) => {
        console.log(option);
        setDialogOpen(false);
        // 这里可以根据选项做更多的逻辑处理
    };
    // 使用状态来管理图片源


    // 鼠标悬停时更改图片
    const handleMouseEnter = () => {
        if (!ignoreHover) {
            setImageSrc('/robot2.png')
        }
        setIsHovered(true)
    }

    // 鼠标离开时恢复原图片
    const handleMouseLeave = () => {
        if (!ignoreHover) {
            setImageSrc('/robot.png')

        }
        setIsHovered(false)
    }

    useEffect(() => {
        function handleClickOutside(event) {
            if (dialogRef.current && !dialogRef.current.contains(event.target)) {
                handleCloseDialog()
            }
        }

        // 只有當 DialogBox 是開啟的時候才添加事件監聽器
        if (isDialogOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            // 清理函數：移除事件監聽器
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isDialogOpen]); // 依賴於 isDialogOpen 的變化來重新添加/移除事件監聽器

    return (
        <div className="w-full bg-[#F5F5F5] h-12 sm:h-14 lg:h-16 duration-slow border-t border-gray-200 px-2 sm:px-4 lg:px-8 flex-shrink-0 lg:mb-4">
            <div className="flex justify-between lg:justify-evenly items-center p-1 sm:p-component-xs lg:p-component-base overflow-x-auto" ref={dialogRef}>
                <div className="flex items-center space-x-1 sm:space-x-stack-xs lg:space-x-stack-sm min-w-0 flex-1">
                    {stages.map((subStage, index) => (
                        <React.Fragment key={index}>
                            <div 
                                style={{ backgroundColor: getStageColor(index + 1) }} 
                                className={`px-2 sm:px-3 lg:px-4 py-1 sm:py-2 lg:py-3 ${getTextColor(index + 1)} font-semibold rounded-lg shadow-inner text-caption sm:text-body-sm lg:text-body whitespace-nowrap`}
                            >
                                {subStage}
                            </div>
                            {index < stages.length - 1 && (
                                // 添加水平虚线分隔符，但不在最后一个元素之后添加
                                <div className="border-b border-dashed border-gray-400 h-0.5 flex-grow mx-1 sm:mx-2 min-w-[10px] hidden sm:block"></div>
                            )}
                        </React.Fragment>
                    ))}
                </div>
                <span onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onClick={handleRobotClick}
                    className="ml-2 sm:ml-4 lg:ml-36 cursor-pointer flex-shrink-0"
                    style={{ width: '32px', height: '32px' }}>
                    <img src={imageSrc} alt="Robot" className={`w-full h-full transition-opacity duration-normal ease-in-out ${isHovered ? 'opacity-80' : 'opacity-100'}`} />
                </span>
                <DialogBox
                    isOpen={isDialogOpen}
                    onClose={handleCloseDialog}
                    onOptionSelect={handleOptionSelect}
                />

            </div>
        </div>
    );
}