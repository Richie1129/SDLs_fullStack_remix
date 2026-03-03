import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { useParams } from 'react-router-dom'
import { getProject } from '../api/project';

import { socket } from '../utils/socket';
// import { useQuery } from 'react-query';
import { useStageIndex, useSubStageIndex } from '../hooks/useStageIndex';
import { getStageInfo, setStageInfo } from '../utils/authUtils';

const DialogBox = ({ isOpen, onClose, onOptionSelect }) => {
    const [animationClass, setAnimationClass] = useState('');
    const [dialogContent, setDialogContent] = useState('嗨！有什麼能夠幫助你的嗎？');
    const [showOptions, setShowOptions] = useState(true);

    // Option B: 四階段 SRL 循環（「歷程」階段目標已隱藏）
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
            "這個階段的目標是為了總結研究的主要發現，討論研究的意義、限制和未來研究的方向哦~"]
        // [Option B 隱藏] 「歷程」階段目標
        // ["這個階段的目標是製作一份完整的學習歷程封面哦!",
        //     "這個階段的目標是撰寫研究摘要，概述研究的主要內容哦~",
        //     "這個階段的目標是編制目錄，方便讀者查閱哦!",
        //     "這個階段的目標是撰寫完整的研究內容哦~",
        //     "這個階段的目標是進行學習反思，總結學習過程哦!"]
    ];
    // Option B: 四階段 SRL 循環（「歷程」階段流程已隱藏）
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
            "在這個階段你可以基於研究結果和討論，撰寫結論部分，明確指出研究的貢獻和後續研究的建議~"]
        // [Option B 隱藏] 「歷程」階段流程
        // ["在這個階段你可以設計和製作學習歷程的封面!",
        //     "在這個階段你可以撰寫研究摘要，概述研究目的、方法和結果~",
        //     "在這個階段你可以編制目錄，列出各章節的標題和頁碼!",
        //     "在這個階段你可以撰寫完整的研究報告內容~",
        //     "在這個階段你可以進行學習反思，總結學習過程中的收穫和成長!"]
    ];

    const [displayedContent, setDisplayedContent] = useState('');


    useEffect(() => {
        setDisplayedContent(''); // 在打字前清空內容
        let charIndex = 0;
        const typeWriter = setInterval(() => {
            if (charIndex < dialogContent.length) {
                const charToAdd = dialogContent[charIndex];
                if (typeof charToAdd !== 'undefined') {  // 確保即將新增的字元不是 undefined
                    setDisplayedContent((prev) => prev + charToAdd);
                    // console.log("Adding:", charToAdd);  // 輸出當前新增的字元，協助診斷問題
                } else {
                    console.error("Attempted to add undefined character at index", charIndex);
                }
                charIndex++;
            } else {
                clearInterval(typeWriter);
            }
        }, 50); // 每50毫秒新增一個字元

        return () => clearInterval(typeWriter); // 清除計時器
    }, [dialogContent]); // 依賴 dialogContent 的變化

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

        // 元件卸載時移除樣式
        return () => {
            document.head.removeChild(style);
        };
    }, [isOpen]);

    const handleOptionSelect = (option) => {
        const { currentStage, currentSubStage } = getStageInfo();
        if (option === 'option1') {
            setDialogContent(stageGoal[currentStage - 1][currentSubStage - 1] || '目前沒有設定子階段目標。');
        }
        if (option === 'option2') {
            setDialogContent(stageProcess[currentStage - 1][currentSubStage - 1] || '目前沒有設定子階段流程。');
        }
        setShowOptions(false);
    };

    const resetDialog = () => {
        setDialogContent('嗨！有什麼能夠幫助你的嗎？');
        setShowOptions(true);
        onClose();
        // setImageSrc('/robot.png');
    };



    if (!isOpen && animationClass.includes('opacity-0')) return null;


    return (
        <div className={`absolute right-2 sm:right-4 lg:right-8 bottom-full mb-2 rounded-lg transform transition-all duration-slow ease-in-out ${animationClass} shadow-2xl dialog-box max-w-xs sm:max-w-sm lg:max-w-md z-50`}>
            <div className="bg-slate-100 p-component-sm sm:p-component-base rounded-lg font-bold">
                <p className="text-caption sm:text-body-sm lg:text-body">{displayedContent}</p>
                {showOptions && (
                    <>
                        <button onClick={() => handleOptionSelect('option1')} className="bg-[#5BA491] text-white w-full rounded-lg my-2 sm:my-3 py-1 sm:py-2 text-caption sm:text-body-sm">階段目標說明</button>
                        <button onClick={() => handleOptionSelect('option2')} className="bg-[#5BA491] text-white w-full rounded-lg py-1 sm:py-2 text-caption sm:text-body-sm">階段如何進行</button>
                    </>
                )}
                {!showOptions && (
                    <button onClick={resetDialog} className="bg-[#5BA491] text-white w-full rounded-lg my-2 sm:my-3 py-1 sm:py-2 text-caption sm:text-body-sm">我了解了！</button>
                )}
            </div>
        </div>
    );
};

// Option B: 四階段 SRL 循環（「歷程」階段已隱藏）
const stageInfo = [
    ["提出研究主題", "提出研究目的", "提出研究問題"],       // 定標
    ["訂定研究構想表", "設計研究記錄表格", "規劃研究排程"], // 擇策
    ["進行嘗試性研究", "分析資列與繪圖", "撰寫研究結果"],   // 監評
    ["檢視研究進度", "進行研究討論", "撰寫研究結論"]        // 調節
    // [Option B 隱藏] 「歷程」階段 - 改為獨立的 Portfolio 功能模組
    // ["封面製作", "摘要撰寫", "目錄編制", "內容撰寫", "反思撰寫"]
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

    // 根據當前階段索引更新子階段列表
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
            return '#5BA491'; // 當前階段
        } else if (stageIndex < currentSubStageIndex) {
            return '#7C968F'; // 小於當前階段
        } else {
            return '#BEBEBE'; // 其他階段
        }
    };
    const getTextColor = (stageIndex) => {
        if (currentSubStageIndex === stageIndex) {
            return 'text-white animate-pulse '; // 當前階段
        } else if (stageIndex < currentSubStageIndex) {
            return 'text-slate-200'; // 小於當前階段
        } else {
            return 'text-slate-700'; // 其他階段
        }
    };
    const getProjectQuery = useQuery("getProject", () => getProject(projectId),
        {
            onSuccess: (data) => {
                setStageInfo(data.currentStage, data.currentSubStage);
                setCurrentStageIndex(data.currentStage)
                setCurrentSubStageIndex(data.currentSubStage)
            },
            enabled: !!projectId
        }
    );
    // 處理 socket 事件
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
        // 這裡可以根據選項做更多邏輯處理
    };


    // 滑鼠懸停時更改圖片
    const handleMouseEnter = () => {
        if (!ignoreHover) {
            setImageSrc('/robot2.png')
        }
        setIsHovered(true)
    }

    // 滑鼠離開時恢復原圖片
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
        <div className="relative w-full bg-[#F5F5F5] h-12 sm:h-14 lg:h-16 duration-slow border-t border-gray-200 px-2 sm:px-4 lg:px-8 flex-shrink-0 lg:mb-4">
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
                                // 水平虛線分隔符，最後一個元素後不加
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