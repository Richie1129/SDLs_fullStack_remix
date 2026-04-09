import React, { useState, useEffect, useMemo } from 'react';
import { AiTwotoneFolderAdd, AiOutlineCloudDownload, AiOutlineUpload } from "react-icons/ai";
import { FiInfo, FiTrash2 } from 'react-icons/fi';
import { GrFormClose } from "react-icons/gr";
import { useQuery, useQueryClient } from 'react-query';
import { getAllSubmit, updateSubmitTask, updateSubmitAttachment, getSubmitChangeLogs, deleteSubmit } from '../../api/submit';
import { useParams, useNavigate } from 'react-router-dom';
import Loader from '../../components/Loader';
import ProtfoliioIcon from "../../assets/AnimationProtfoliio.json";
import Lottie from "lottie-react";
import { socket } from '../../utils/socket';
import FileDownload from 'js-file-download';
import { BiSave } from "react-icons/bi";
import Swal from "sweetalert2";
import { useStageIndex } from '../../hooks/useStageIndex';
import { formatTime } from '../../utils/timeUtils';
import useObservationMode from '../../hooks/useObservationMode'; // 引入觀摩模式 hook
import { recordObservationEvent } from '../../api/usage';
import { getCurrentUsername, getUserForSocket, isCurrentUser } from '../../utils/userUtils';
import { buildFileDownloadUrl, downloadFileWithAuth } from '@/utils/fileUrlBuilder.js';

// Option B: 四階段 SRL 循環（「歷程」標題已隱藏）
const INSERT_TITLES = ["定標", "擇策", "監評", "調節"]; // [Option B 隱藏] "歷程"

export default function Protfolio() {
    const [currentStageIndex] = useStageIndex();
    const [stagePortfolio, setStagePortfolio] = useState([]);
    const [portfolioItemsWithTitles, setPortfolioItemsWithTitles] = useState([]);
    const [folderModalOpen, setFolderModalOpen] = useState(false);
    const [modalData, setModalData] = useState({});
    const { projectId } = useParams();
    const navigate = useNavigate();
    const [activeItemId, setActiveItemId] = useState(null);
    const [showEmptyMessage, setShowEmptyMessage] = useState(false);
    const [editableContent, setEditableContent] = useState("");
    const [showSubmitChangeHistory, setShowSubmitChangeHistory] = useState(false);
    const [submitChangeLogs, setSubmitChangeLogs] = useState([]);
    const queryClient = useQueryClient();

    // 使用觀摩模式 hook
    const { isObservationMode } = useObservationMode();

    // 匯出學習歷程
    const handleExportPortfolio = () => {
        navigate(`/project/${projectId}/student-portfolio`);
    };
    
    const {
        isLoading,
        isError,
        data: portfolioData
    } = useQuery(["protfolioDatas", projectId], () => getAllSubmit({ params: { projectId: projectId } }), {
        onSuccess: (data) => {
            // Option B: 過濾掉 Stage 5 資料（只保留 Stage 1-4）
            const filteredData = Array.isArray(data)
                ? data.filter(item => {
                    if (!item || !item.stage) return false;
                    const stageNum = parseInt(item.stage.split('-')[0], 10);
                    return !isNaN(stageNum) && stageNum >= 1 && stageNum <= 4;
                })
                : [];
            setStagePortfolio(filteredData);
            setShowEmptyMessage(filteredData.length === 0);
        }
    });

    useEffect(() => {
      const timer = setTimeout(() => {
        if (portfolioItemsWithTitles.length === 0 && !isLoading && !isError) {
          setShowEmptyMessage(true);
        }
      }, 500); // 延迟500毫秒显示空状态消息
    
      return () => clearTimeout(timer);
    }, [portfolioItemsWithTitles.length, isLoading, isError]);

    // 當 modalData 更新時，解析 JSON 並初始化狀態
    useEffect(() => {
        if (modalData.content) {
            try {
                setEditableContent(JSON.parse(modalData.content));
            } catch (error) {
                console.error("解析 JSON 失敗:", error);
                setEditableContent({});
            }
        }
    }, [modalData]);

    // 變更特定欄位的內容
    const handleChange = (key, value) => {
        setEditableContent((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    // 儲存修改後的內容
    const handleSave = async () => {
        try {
            const updateData = { 
                content: JSON.stringify(editableContent),
                changedBy: getCurrentUsername() // 添加用戶名稱
            };
            
            console.log('🔧 前端發送的更新數據:', updateData);
            console.log('🔧 用戶名稱:', getCurrentUsername());
            
            await updateSubmitTask(modalData.id, updateData);
    
            // 刷新變更記錄
            queryClient.invalidateQueries(['submitChangeLogs', modalData.id]);
    
            Swal.fire({
                icon: "success",
                title: "儲存成功！",
                text: "內容已成功儲存",
                confirmButtonColor: "#5BA491",
            });
    
            setFolderModalOpen(false);
        } catch (error) {
            console.error("儲存失敗:", error);
    
            Swal.fire({
                icon: "error",
                title: "儲存失敗",
                text: "請稍後再試",
                confirmButtonColor: "#d33",
            });
        }
    };
    
    // Option B: 四階段 SRL 循環（「歷程」階段描述已隱藏）
    const stageDescriptions = {
        "1-1": "提出研究主題",
        "1-2": "提出研究目的",
        "1-3": "提出研究問題",
        "2-1": "訂定研究構想表",
        "2-2": "設計研究記錄表",
        "2-3": "規劃研究排程",
        "3-1": "進行嘗試性研究",
        "3-2": "分析資列與繪圖",
        "3-3": "撰寫研究結果",
        "4-1": "檢視研究進度",
        "4-2": "進行研究討論",
        "4-3": "撰寫研究結論"
        // [Option B 隱藏] 「歷程」階段 (5-1 ~ 5-5) - 改為獨立的 Portfolio 自動生成功能
        // "5-1": "封面製作",
        // "5-2": "摘要撰寫",
        // "5-3": "目錄編制",
        // "5-4": "內容撰寫",
        // "5-5": "反思撰寫"
    };
    // R2-M6: 按實際 stage 欄位分組插入標題，而非按位置（每 3 筆）假設
    useEffect(() => {
        if (stagePortfolio.length > 0) {
            const itemsWithTitles = [];
            let lastMainStage = null;

            // 按 stage 排序確保順序正確
            const sorted = [...stagePortfolio].sort((a, b) => {
                const [aMain, aSub] = (a.stage || '0-0').split('-').map(Number);
                const [bMain, bSub] = (b.stage || '0-0').split('-').map(Number);
                return aMain !== bMain ? aMain - bMain : aSub - bSub;
            });

            sorted.forEach((item) => {
                const mainStage = item.stage ? parseInt(item.stage.split('-')[0], 10) : null;
                if (mainStage && mainStage !== lastMainStage) {
                    const title = INSERT_TITLES[mainStage - 1];
                    if (title) {
                        itemsWithTitles.push({ type: 'title', content: title });
                    }
                    lastMainStage = mainStage;
                }
                itemsWithTitles.push({ type: 'item', content: item });
            });
            setPortfolioItemsWithTitles(itemsWithTitles);
        }
    }, [stagePortfolio]);

    const downloadFile = () => {
        // 檢查是否有 MinIO 檔案資訊
        if (modalData.fileName) {
            // 使用後端 API 代理下載（帶 accessToken）
            downloadFileWithAuth(modalData.fileName, modalData.originalName);
        } else if (modalData.fileData && modalData.fileData.data) {
            // 向後相容：處理舊的 BLOB 資料
            const buffer = new Uint8Array(modalData.fileData.data);
            const blob = new Blob([buffer], { type: "application/octet-stream" });
            FileDownload(blob, modalData.fileName || modalData.originalName || "downloaded-file");
        } else {
            Swal.fire({
                icon: 'warning',
                title: '無可下載的檔案',
                text: '此項目沒有附加檔案',
                confirmButtonColor: '#5BA491'
            });
        }
    };

    // 加入檔案變更處理
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('attachFile', file);  // 欄位名稱要跟後端 upload.array 的 key 一致
    formData.append('changedBy', getCurrentUsername()); // 添加用戶名稱
    try {
      await updateSubmitAttachment(modalData.id, formData);      
      // 刷新變更記錄
      queryClient.invalidateQueries(['submitChangeLogs', modalData.id]);
      
      Swal.fire({ 
        icon: 'success', 
        title: '檔案重新上傳成功', 
        confirmButtonColor: '#5BA491' 
      }).then(() => {
        // 更新列表
        queryClient.invalidateQueries('protfolioDatas');
        setFolderModalOpen(false);
        // 刷新頁面
        window.location.reload();
      });
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: 'error', title: '重新上傳失敗', text: '請稍後再試', confirmButtonColor: '#d33' });
    }
  };

    // 刪除提交記錄
    const handleDeleteSubmit = (e, item) => {
        e.stopPropagation();
        Swal.fire({
            title: '確認刪除',
            text: `確定要刪除「${stageDescriptions[item.stage] || item.stage}」的歷程記錄嗎？此操作無法復原。`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6b7280',
            confirmButtonText: '確定刪除',
            cancelButtonText: '取消'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await deleteSubmit(item.id);
                    // 如果刪除的是當前選中的項目，清除選中狀態
                    if (activeItemId === item.id) {
                        setActiveItemId(null);
                        setFolderModalOpen(false);
                        setModalData({});
                    }
                    queryClient.invalidateQueries('protfolioDatas');
                    Swal.fire({
                        icon: 'success',
                        title: '刪除成功',
                        text: '歷程記錄已刪除',
                        confirmButtonColor: '#5BA491'
                    });
                } catch (err) {
                    console.error('刪除失敗:', err);
                    Swal.fire({
                        icon: 'error',
                        title: '刪除失敗',
                        text: err?.response?.data?.message || '請稍後再試',
                        confirmButtonColor: '#d33'
                    });
                }
            }
        });
    };

    // socket
    useEffect(() => {
        socket.connect();
        // socket.on("receive_message", receive_message);

        // return () => {
        //     socket.disconnect();
        // }
    }, [socket])

    // 按主階段分組，並計算每個子階段的記錄數（用於判斷是否顯示刪除按鈕）
    const stageItemsByMainStage = useMemo(() => {
        const result = {};
        INSERT_TITLES.forEach((_, index) => {
            const mainStage = index + 1;
            const items = stagePortfolio.filter(item => Math.floor(item.stage.split('-')[0]) === mainStage);
            const stageCount = {};
            items.forEach(item => {
                stageCount[item.stage] = (stageCount[item.stage] || 0) + 1;
            });
            result[mainStage] = { items, stageCount };
        });
        return result;
    }, [stagePortfolio]);

    return (
        <div className="h-full w-full bg-gray-50">
            {/* Two-Column Layout Container */}
            <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-3 h-full">
                
                {/* Left Column - Stage Navigation (Sticky) */}
                <div className="lg:col-span-1 flex flex-col bg-white lg:border-r border-gray-200">
                    {/* Header Section */}
                    <div className="flex-shrink-0 p-component-base sm:p-component-md-lg border-b border-gray-200 bg-gradient-to-r from-gray-50 to-[#5BA491]/5">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-h3 font-bold text-gray-800">學習歷程</h2>
                        </div>
                        {!isObservationMode && (
                        <button
                            data-track
                            data-track-action="PORTFOLIO_EXPORT_PDF"
                            data-track-type="portfolio"
                            onClick={handleExportPortfolio}
                            className="w-full flex items-center justify-center gap-stack-xs px-4 py-2.5 bg-gradient-to-r from-[#5BA491] to-[#4a8f7c] text-white rounded-lg hover:shadow-lg transition-shadow duration-fast font-medium"
                        >
                            <AiOutlineCloudDownload className="text-h3" />
                            <span>匯出學習歷程 PDF</span>
                            <span className="ml-1 text-[10px] font-semibold bg-white/25 text-white px-1.5 py-0.5 rounded-full tracking-wide">Beta</span>
                        </button>
                        )}
                    </div>

                    {/* Navigation Content */}
                    <div className="flex-1 overflow-y-auto">
                        {isLoading ? (
                            <div className="flex justify-center items-center py-16">
                                <Loader />
                            </div>
                        ) : isError ? (
                            <div className="text-center py-12 px-4">
                                <p className="text-red-500 font-medium">{isError.message}</p>
                            </div>
                        ) : portfolioItemsWithTitles.length === 0 ? (
                            showEmptyMessage && (
                                <div className="h-full flex flex-col items-center justify-center py-12 px-4">
                                    <Lottie className="w-32 sm:w-48" animationData={ProtfoliioIcon} />
                                    <p className="mt-4 text-body-sm sm:text-body text-gray-600 text-center">
                                        目前還未新增歷程檔案，快和小組成員互相討論並記錄討論結果吧！
                                    </p>
                                </div>
                            )
                        ) : (
                            <div className="p-component-base sm:p-component-md-lg">
                                <nav className="space-y-stack-md">
                                    {INSERT_TITLES.map((title, index) => (
                                        <div key={index} className="relative">
                                            {/* Stage Header */}
                                            <div className="flex items-center mb-4">
                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-caption font-bold text-white ${
                                                    index < parseInt(currentStageIndex) - 1 ? 'bg-[#5BA491]' : 
                                                    index === parseInt(currentStageIndex) - 1 ? 'bg-[#5BA491]' : 
                                                    'bg-gray-300'
                                                }`}>
                                                    {index < parseInt(currentStageIndex) - 1 ? '✓' : index + 1}
                                                </div>
                                                <h3 className={`ml-3 font-semibold text-body-lg ${
                                                    index < parseInt(currentStageIndex) ? 'text-gray-900' : 'text-gray-500'
                                                }`}>
                                                    {title}
                                                </h3>
                                            </div>
                                            
                                            {/* Connecting Line */}
                                            {index < INSERT_TITLES.length - 1 && (
                                                <div className="absolute left-2.5 top-8 w-[1px] h-6 bg-gray-200"></div>
                                            )}
                                            
                                            {/* Stage Items */}
                                            <div className="ml-8 space-y-stack-xs">
                                                {stageItemsByMainStage[index + 1]?.items.map(item => (
                                                        <button
                                                            key={item.id}
                                                            data-track
                                                            data-track-action="PORTFOLIO_STAGE_SELECT"
                                                            data-track-type="submit"
                                                            data-track-id={item.id}
                                                            data-track-meta-stage={item.stage}
                                                            onClick={() => {
                                                                setActiveItemId(item.id);
                                                                setFolderModalOpen(true);
                                                                setModalData(item);
                                                                // Record observation click without blocking UI
                                                                if (isObservationMode) {
                                                                    try {
                                                                        recordObservationEvent({
                                                                            targetType: 'SUBMISSION',
                                                                            targetId: item.id,
                                                                            targetName: stageDescriptions[item.stage] || item.stage,
                                                                            projectId,
                                                                        });
                                                                    } catch (_) { /* noop */ }
                                                                }
                                                            }}
                                                            className={`w-full text-left p-component-sm rounded-lg text-body-sm transition-all duration-fast relative group flex items-center gap-2 ${
                                                                activeItemId === item.id
                                                                    ? 'bg-[#5BA491] text-white shadow-lg'
                                                                    : 'text-gray-700 hover:bg-[#5BA491]/10 hover:shadow-md border border-gray-100'
                                                            }`}
                                                            title={item.createdAt ? `建立於 ${formatTime(item.createdAt, 'full')}${item.updatedAt && item.updatedAt !== item.createdAt ? `\n更新於 ${formatTime(item.updatedAt, 'full')}` : ''}` : ''}
                                                        >
                                                            {/* Active Indicator */}
                                                            {activeItemId === item.id && (
                                                                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-full"></div>
                                                            )}
                                                            
                                                            <div className="flex flex-col space-y-1 flex-1 min-w-0">
                                                                <span className="font-medium leading-tight">
                                                                    {stageDescriptions[item.stage]}
                                                                </span>
                                                                <div className="flex items-center justify-between">
                                                                    <span className={`text-caption font-medium px-2 py-1 rounded-full ${
                                                                        activeItemId === item.id
                                                                            ? 'bg-white/20 text-white'
                                                                            : 'bg-[#5BA491]/10 text-[#5BA491]'
                                                                    }`}>
                                                                        {item.stage}
                                                                    </span>
                                                                    {item.createdAt && (
                                                                        <span className={`text-caption ${
                                                                            activeItemId === item.id ? 'text-white/80' : 'text-gray-500'
                                                                        }`}>
                                                                            {formatTime(item.createdAt, 'date')}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {/* 刪除按鈕 - 同階段有多筆時才顯示，hover 時出現，觀摩模式隱藏 */}
                                                            {!isObservationMode && stageItemsByMainStage[index + 1]?.stageCount[item.stage] > 1 && (
                                                                <button
                                                                    onClick={(e) => handleDeleteSubmit(e, item)}
                                                                    className={`flex-shrink-0 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-fast ${
                                                                        activeItemId === item.id
                                                                            ? 'hover:bg-white/20 text-white/80 hover:text-white'
                                                                            : 'hover:bg-red-50 text-gray-400 hover:text-red-500'
                                                                    }`}
                                                                    title="刪除此歷程記錄"
                                                                >
                                                                    <FiTrash2 size={14} />
                                                                </button>
                                                            )}
                                                        </button>
                                                    ))}
                                            </div>
                                        </div>
                                    ))}
                                </nav>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column - Content Display */}
                <div className="lg:col-span-2 flex flex-col bg-white border-t lg:border-t-0 border-gray-200">
                    {!activeItemId ? (
                        // Empty State - No item selected
                        <div className="flex-1 flex-col flex items-center justify-center p-component-lg">
                            <div className="text-center max-w-md">
                                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-[#5BA491]/10 to-[#5BA491]/5 rounded-full flex items-center justify-center">
                                    <svg className="w-12 h-12 text-[#5BA491]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <h3 className="text-h3 font-semibold text-gray-800 mb-2">
                                    選擇階段項目
                                </h3>
                                <p className="text-gray-600 leading-relaxed">
                                    從左側的階段導航中選擇一個項目來查看和編輯其內容、管理檔案並追蹤變更。
                                </p>
                            </div>
                        </div>
                    ) : (
                        // Content Display - Item selected
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {/* Header */}
                            <div className="flex-shrink-0 p-component-base sm:p-component-md-lg border-b border-gray-100 bg-gradient-to-r from-gray-50 to-[#5BA491]/10">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-h3 sm:text-h2 font-bold text-gray-900 mb-2">
                                            {stageDescriptions[modalData.stage]}
                                        </h2>
                                        <div className="flex flex-wrap gap-stack-sm text-body-sm text-gray-600">
                                            <span className="flex items-center">
                                                <span className="w-2 h-2 bg-[#5BA491] rounded-full mr-2"></span>
                                                階段: {modalData.stage}
                                            </span>
                                            {modalData.createdAt && (
                                                <span className="flex items-center" title={formatTime(modalData.createdAt, 'full')}>
                                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    建立於: {formatTime(modalData.createdAt, 'date')}
                                                </span>
                                            )}
                                            {modalData.updatedAt && modalData.updatedAt !== modalData.createdAt && (
                                                <span className="flex items-center" title={formatTime(modalData.updatedAt, 'full')}>
                                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                    </svg>
                                                    更新於: {formatTime(modalData.updatedAt, 'relative')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        data-track
                                        data-track-action="PORTFOLIO_CLOSE"
                                        data-track-type="portfolio"
                                        onClick={() => {
                                            setFolderModalOpen(false);
                                            setActiveItemId(null);
                                        }}
                                        className="flex-shrink-0 p-component-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <GrFormClose size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Tabs Navigation */}
                            <div className="flex-shrink-0 border-b border-gray-200 bg-white">
                                <div className="px-4 sm:px-6">
                                    <nav className="flex space-x-stack-md-lg">
                                        <button
                                            data-track
                                            data-track-action="PORTFOLIO_TAB_SWITCH"
                                            data-track-type="portfolio"
                                            data-track-meta-tab="edit"
                                            onClick={() => setShowSubmitChangeHistory(false)}
                                            className={`py-4 px-1 border-b-2 font-medium text-body-sm transition-colors ${
                                                !showSubmitChangeHistory 
                                                    ? 'border-[#5BA491] text-[#5BA491]' 
                                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            }`}
                                        >
                                            <span className="flex items-center">
                                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                                編輯內容
                                            </span>
                                        </button>
                                        <button
                                            data-track
                                            data-track-action="PORTFOLIO_TAB_SWITCH"
                                            data-track-type="portfolio"
                                            data-track-meta-tab="history"
                                            onClick={() => {
                                                setShowSubmitChangeHistory(true);
                                                getSubmitChangeLogs(modalData.id).then(setSubmitChangeLogs).catch(console.error);
                                            }}
                                            className={`py-4 px-1 border-b-2 font-medium text-body-sm transition-colors ${
                                                showSubmitChangeHistory 
                                                    ? 'border-[#5BA491] text-[#5BA491]' 
                                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            }`}
                                        >
                                            <span className="flex items-center">
                                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                變更歷史
                                            </span>
                                        </button>
                                    </nav>
                                </div>
                            </div>

                            {/* Content Area */}
                            <div className="flex-1 overflow-y-auto">
                                <div className="p-component-base sm:p-component-md-lg">
                                    {!showSubmitChangeHistory ? (
                                        // Edit Content Tab
                                        <div className="space-y-stack-md">
                                            {/* Content Form */}
                                            <div className="space-y-stack-md">
                                                {Object.entries(editableContent).map(([key, value], index) => (
                                                    <div key={index} className="space-y-stack-xs">
                                                        <label className="block text-body-sm font-semibold text-gray-700 mb-2">
                                                            {key}
                                                        </label>
                                                        <textarea
                                                            className="w-full rounded-lg border-2 border-gray-200 bg-white text-body-sm p-component-base shadow-sm transition-all duration-fast focus:border-[#5BA491] focus:ring-4 focus:ring-[#5BA491]/20 hover:border-gray-300 resize-none min-h-[100px]"
                                                            rows={4}
                                                            value={value}
                                                            onChange={(e) => handleChange(key, e.target.value)}
                                                            placeholder={`輸入 ${key} 內容...`}
                                                            disabled={isObservationMode}
                                                            readOnly={isObservationMode}
                                                        />
                                                    </div>
                                                ))}
                                            </div>

                                            {/* File Section */}
                                            <div className="bg-gray-50 rounded-xl p-component-md-lg border border-gray-100">
                                                <div className="mb-4">
                                                    <h3 className="text-body-lg font-semibold text-gray-800 mb-2">
                                                        附加檔案
                                                    </h3>
                                                    <p className="text-caption text-gray-500 mb-3">
                                                        <FiInfo className="w-3.5 h-3.5 inline mr-1" /> 支援圖片、文件、影片、音訊、壓縮檔等格式 | 單檔最大 100MB
                                                    </p>
                                                    {modalData.fileName ? (
                                                        <p className="text-body-sm text-gray-600 font-mono bg-white px-3 py-1 rounded border inline-block">
                                                            {modalData.fileName}
                                                        </p>
                                                    ) : (
                                                        <p className="text-body-sm text-gray-500">無附加檔案</p>
                                                    )}
                                                </div>
                                                
                                                <div className="flex flex-wrap gap-3">
                                                    {(modalData.fileName || modalData.fileData) && (
                                                        <button
                                                            onClick={() => {
                                                                if (modalData.fileName) {
                                                                    downloadFileWithAuth(modalData.fileName, modalData.originalName);
                                                                } else if (modalData.fileData && modalData.fileData.data) {
                                                                    const buffer = new Uint8Array(modalData.fileData.data);
                                                                    const blob = new Blob([buffer], { type: "application/octet-stream" });
                                                                    FileDownload(blob, modalData.fileName || modalData.originalName || "downloaded-file");
                                                                }
                                                            }}
                                                            className="inline-flex items-center px-4 py-2 border border-transparent text-body-sm font-medium rounded-lg text-white bg-[#5BA491] hover:bg-[#5BA491]/80 transition-colors shadow-sm"
                                                        >
                                                            <AiOutlineCloudDownload className="mr-2 w-4 h-4" />
                                                            下載
                                                        </button>
                                                    )}
                                                    {/* 上傳檔案按鈕 - 觀摩模式隱藏 */}
                                                    {!isObservationMode && (
                                                        <div className="flex flex-col gap-1">
                                                            <label className="inline-flex items-center px-4 py-2 border border-transparent text-body-sm font-medium rounded-lg text-white bg-[#5BA491] hover:bg-[#5BA491]/80 cursor-pointer transition-colors shadow-sm">
                                                                <AiOutlineUpload className="mr-2 w-4 h-4" />
                                                                {modalData.fileData ? "重新上傳" : "上傳檔案"}
                                                                <input
                                                                    type="file"
                                                                    className="hidden"
                                                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,.mp4,.mpeg,.mov,.avi,.webm,.mp3,.wav,.ogg,.m4a,.zip,.rar"
                                                                    onChange={handleFileChange}
                                                                />
                                                            </label>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100">
                                                    <button
                                                        onClick={() => {
                                                            setFolderModalOpen(false);
                                                            setActiveItemId(null);
                                                        }}
                                                        data-track
                                                        data-track-action="PORTFOLIO_CANCEL"
                                                        data-track-type="portfolio"
                                                        className="px-6 py-2 border border-gray-300 rounded-lg text-body-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                                                >
                                                    取消
                                                </button>
                                                {/* 儲存按鈕 - 觀摩模式隱藏 */}
                                                {!isObservationMode && (
                                                    <button
                                                        data-track
                                                        data-track-action="PORTFOLIO_SAVE"
                                                        data-track-type="portfolio"
                                                        onClick={handleSave}
                                                        className="px-6 py-2 border border-transparent rounded-lg shadow-sm text-body-sm font-medium text-white bg-[#5BA491] hover:bg-[#5BA491]/80 transition-colors"
                                                    >
                                                        儲存變更
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        // Change History Tab
                                        <div className="space-y-stack-sm">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-body-lg font-semibold text-gray-800">變更歷史</h3>
                                                <span className="text-body-sm text-gray-500">
                                                    {submitChangeLogs.length} 個變更
                                                </span>
                                            </div>
                                            
                                            {submitChangeLogs.length === 0 ? (
                                                <div className="text-center py-16">
                                                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                                                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    </div>
                                                    <p className="text-gray-500">無變更歷史記錄</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-stack-sm max-h-[600px] overflow-y-auto">
                                                    {submitChangeLogs.map((log, index) => (
                                                        <div 
                                                            key={log.id || index} 
                                                            className="bg-white border border-gray-200 rounded-xl p-component-md-lg shadow-sm hover:shadow-md transition-shadow"
                                                        >
                                                            <div className="flex items-center justify-between mb-4">
                                                                <div className="flex items-center space-x-3">
                                                                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                                                        <span className="text-caption font-medium text-gray-600">
                                                                            {(log.changedBy || 'U')[0].toUpperCase()}
                                                                        </span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="font-medium text-gray-900">
                                                                            {log.changedBy || '未知使用者'}
                                                                        </span>
                                                                        <span className={`ml-2 px-2 py-1 rounded-full text-caption font-medium ${
                                                                            log.changeType === 'create' ? 'bg-green-100 text-green-700' : 
                                                                            log.changeType === 'update' ? 'bg-blue-100 text-blue-700' : 
                                                                            'bg-red-100 text-red-700'
                                                                        }`}>
                                                                            {log.changeType === 'create' && '建立'}
                                                                            {log.changeType === 'update' && '更新'}
                                                                            {log.changeType === 'delete' && '刪除'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <span className="text-caption text-gray-500">
                                                                    {formatTime(log.createdAt, 'full')}
                                                                </span>
                                                            </div>
                                                            
                                                            <p className="text-gray-700 mb-4">
                                                                {log.description}
                                                            </p>
                                                            
                                                            {log.fieldName && (
                                                                <div className="mb-4">
                                                                    <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-caption font-medium rounded-full">
                                                                        欄位: {log.fieldName}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            
                                                            {(log.oldValue || log.newValue) && (
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-sm">
                                                                    {log.oldValue && (
                                                                        <div className="bg-red-50 border border-red-200 rounded-lg p-component-base">
                                                                            <div className="text-caption font-semibold text-red-700 mb-2 uppercase tracking-wide">原始值</div>
                                                                            <div className="text-body-sm text-red-800 whitespace-pre-wrap max-h-32 overflow-y-auto">
                                                                                {log.fieldName === 'content' ? (
                                                                                    (() => {
                                                                                        try {
                                                                                            const content = JSON.parse(log.oldValue);
                                                                                            return Object.entries(content).map(([key, value]) => (
                                                                                                <div key={key} className="mb-2 last:mb-0">
                                                                                                    <span className="font-medium">{key}:</span> {value}
                                                                                                </div>
                                                                                            ));
                                                                                        } catch (e) {
                                                                                            return log.oldValue;
                                                                                        }
                                                                                    })()
                                                                                ) : (
                                                                                    log.oldValue
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    
                                                                    {log.newValue && (
                                                                        <div className="bg-green-50 border border-green-200 rounded-lg p-component-base">
                                                                            <div className="text-caption font-semibold text-green-700 mb-2 uppercase tracking-wide">新值</div>
                                                                            <div className="text-body-sm text-green-800 whitespace-pre-wrap max-h-32 overflow-y-auto">
                                                                                {log.fieldName === 'content' ? (
                                                                                    (() => {
                                                                                        try {
                                                                                            const content = JSON.parse(log.newValue);
                                                                                            return Object.entries(content).map(([key, value]) => (
                                                                                                <div key={key} className="mb-2 last:mb-0">
                                                                                                    <span className="font-medium">{key}:</span> {value}
                                                                                                </div>
                                                                                            ));
                                                                                        } catch (e) {
                                                                                            return log.newValue;
                                                                                        }
                                                                                    })()
                                                                                ) : (
                                                                                    log.newValue
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
