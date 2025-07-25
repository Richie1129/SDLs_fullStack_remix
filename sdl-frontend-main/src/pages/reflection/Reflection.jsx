//Reflection
import React, { useState, useEffect } from 'react'
import Modal from '../../components/Modal'
import { GrFormClose } from "react-icons/gr";
import { useParams } from 'react-router-dom';
import { getAllPersonalDaily, createPersonalDaily, getAllTeamDaily, createTeamDaily, updatePersonalDaily, updateTeamDaily } from '../../api/reflection';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import toast, { Toaster } from 'react-hot-toast';
import Loader from '../../components/Loader';
import { FaPlus } from "react-icons/fa";
import personalDailyIcon from "../../assets/AnimationPersonalDaily.json";
import teamDailyIcon from "../../assets/AnimationTeamDaily.json";
import Lottie from "lottie-react";
import { socket } from '../../utils/socket';
import FileDownload from 'js-file-download';
import { AiOutlineCloudDownload, AiOutlineRobot } from "react-icons/ai";
import { GrCircleQuestion } from 'react-icons/gr';
import { formatTime } from '../../utils/timeUtils';
// import { motion } from 'framer-motion';
import { motion, useMotionValue } from "framer-motion";
// 5Rs 相關導入
import FiveRsReflectionForm from '@/components/FiveRsReflectionForm.jsx';
import FiveRsReflectionDisplay from '@/components/FiveRsReflectionDisplay.jsx';
import { is5RsFormat, parse5RsContent, extract5RsText } from '@/utils/5RsUtils.js';
import { analyze5RsReflection } from '@/api/llm5Rs.js';

const imgs = [
    "/imgs/nature/1.jpg",
    "/imgs/nature/2.jpg",
    "/imgs/nature/3.jpg",
    "/imgs/nature/4.jpg",
    "/imgs/nature/5.jpg",
    "/imgs/nature/6.jpg",
    "/imgs/nature/7.jpg",
];
const ONE_SECOND = 1000;
const AUTO_DELAY = ONE_SECOND * 10;
const DRAG_BUFFER = 50;

const SPRING_OPTIONS = {
    type: "spring",
    mass: 3,
    stiffness: 400,
    damping: 50,
};
export default function Reflection() {
    const { projectId } = useParams();
    const [personalDaily, setPersonalDaily] = useState([]);
    const [teamDaily, setTeamDaily] = useState([]);
    const [dailyData, setDailyData] = useState({});
    const [attachFile, setAttachFile] = useState(null);
    const [selectedDaily, setSelectedDaily] = useState({ title: "", content: "" });
    const [inspectDailyModalOpen, setInspectDailyModalOpen] = useState(false);
    const [personalDailyModalOpen, setPersonalDailyModalOpen] = useState(false);
    const [teamDailyModalOpen, setTeamDailyModalOpen] = useState(false);
    const queryClient = useQueryClient();
    const [isTooltipVisible, setIsTooltipVisible] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [editingId, setEditingId] = useState(null); // 用來追蹤正在編輯的日誌ID

    // 5Rs 相關狀態
    const [reflectionMode, setReflectionMode] = useState('traditional'); // 'traditional' 或 '5Rs'
    const [is5RsModalOpen, setIs5RsModalOpen] = useState(false);
    const [editingReflectionData, setEditingReflectionData] = useState({});
    const [selectedReflectionForView, setSelectedReflectionForView] = useState(null);
    const [viewReflectionModalOpen, setViewReflectionModalOpen] = useState(false);

    const [imgIndex, setImgIndex] = useState(0);
    const [TeamImgIndex, setTeamImgIndex] = useState(0);

    const dragX = useMotionValue(0);
    const TeamDragX = useMotionValue(0);

    // 編輯按鈕的處理邏輯
    const handleEditClick = (item) => {
        console.log("編輯的日誌:", item); // 檢查這裡是否有正確的 `id`
        setTitle(item.title);
        setContent(item.content);
        // 不再設置 fileData，因為我們現在使用 MinIO
        setAttachFile(null);
        setEditingId(item.id); // 設定正在編輯的日誌ID
        setPersonalDailyModalOpen(true); // 開啟編輯模態框
    };

    // useEffect(() => {
    //     const intervalRef = setInterval(() => {
    //         const x = dragX.get();

    //         if (x === 0) {
    //             setImgIndex((pv) => {
    //                 if (pv === personalDaily.length - 1) {
    //                     return 0;
    //                 }
    //                 return pv + 1;
    //             });
    //         }
    //     }, AUTO_DELAY);

    //     return () => clearInterval(intervalRef);
    // }, []);

    const onDragEnd = () => {
        const x = dragX.get();

        if (x <= -DRAG_BUFFER && imgIndex < personalDaily.length - 1) {
            setImgIndex((pv) => pv + 1);
        } else if (x >= DRAG_BUFFER && imgIndex > 0) {
            setImgIndex((pv) => pv - 1);
        }
    };

    const TeamOnDragEnd = () => {
        const x = TeamDragX.get();

        if (x <= -DRAG_BUFFER && TeamImgIndex < teamDaily.length - 1) {
            setTeamImgIndex((pv) => pv + 1);
        } else if (x >= DRAG_BUFFER && TeamImgIndex > 0) {
            setTeamImgIndex((pv) => pv - 1);
        }
    };

    const toggleTooltip = () => {
        setIsTooltipVisible(!isTooltipVisible);
    };
    const closeTooltip = () => {
        setIsTooltipVisible(false);
    };

    const userRole = localStorage.getItem("role"); // 從 localStorage 取得使用者角色

    const { isLoading, isError, error } = useQuery(
        ["personalDaily", { projectId, isTeacher: userRole === "teacher" }],
        () => getAllPersonalDaily({
            projectId: projectId, 
            userId: localStorage.getItem("id"),
            isTeacher: userRole === "teacher"
        }),
        {
            onSuccess: setPersonalDaily,
            enabled: !!projectId
        }
    );

    const [showEmptyMessage, setShowEmptyMessage] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (personalDaily.length === 0 && teamDaily.length === 0 && !isLoading && !isError) {
                setShowEmptyMessage(true);
            }

        }, 20); // 延迟500毫秒显示空状态消息

        return () => clearTimeout(timer);
    }, [personalDaily.length, teamDaily.length, isLoading, isError]);

    const teamDailyQuery = useQuery({
        queryKey: ['teamDaily'],
        queryFn: () => getAllTeamDaily({ params: { projectId: projectId } }),
        onSuccess: setTeamDaily,
        enabled: !!projectId
    });

    const { mutate } = useMutation(createPersonalDaily, {
        onSuccess: (res) => {
            console.log(res);
            queryClient.invalidateQueries("personalDaily")
            sucesssNotify(res.message)
        },
        onError: (error) => {
            console.log(error);
            errorNotify(error.response.data.message)
        }
    })

    const { mutate: teamDailyMutate } = useMutation(createTeamDaily, {
        onSuccess: (res) => {
            console.log(res);
            queryClient.invalidateQueries(['teamDaily'])
            sucesssNotify(res.message)
        },
        onError: (error) => {
            console.log(error);
            errorNotify(error.response.data.message)
        }
    })

    const { mutate: updateDaily } = useMutation((data) => {
        // 檢查 data 是否為 FormData 且包含 id
        if (data instanceof FormData) {
            const id = data.get('id');
            data.delete('id'); // 從 FormData 中移除 id，因為它應該在 URL 中
            return updatePersonalDaily(id, data);
        } else {
            // 傳統的物件格式
            const { id, ...restData } = data;
            return updatePersonalDaily(id, restData);
        }
    }, {
        onSuccess: () => {
            queryClient.invalidateQueries("personalDaily");
            sucesssNotify("更新成功");
        },
        onError: (error) => {
            console.log(error);
            errorNotify("更新失敗");
        }
    });

    const { mutate: updateTeamDailyMutate } = useMutation(({ id, ...data }) => updateTeamDaily(id, data), {
        onSuccess: (res) => {
            console.log("更新成功:", res);
            queryClient.invalidateQueries("teamDaily");
            sucesssNotify("小組日誌更新成功");
        },
        onError: (error) => {
            console.log("更新失敗:", error);
            errorNotify("小組日誌更新失敗");
        }
    });          
    
    const handleEditTeamClick = (item) => {
    if (!item) {
        console.error("選擇的日誌為 undefined，請確認 teamDaily 是否有資料");
        return;
    }

    console.log("編輯的小組日誌:", item); // 確保 `item` 不是 `undefined`
    setTitle(item.title || ""); // 避免 `undefined` 錯誤
    setContent(item.content || "");
    // 不再設置 fileData，因為我們現在使用 MinIO
    setAttachFile(null);
    setEditingId(item.id);
    setTeamDailyModalOpen(true);
};
    
    const handleCreateOrUpdateTeamDaily = (e) => {
        e.preventDefault();
    
        if (editingId) {
            handleSaveTeamEdit();
            return;
        }
    
        if (title.trim() !== "" && content.trim() !== "") {
            const formData = new FormData();
            formData.append('projectId', projectId);
            formData.append('creator', localStorage.getItem("username"));
            if (attachFile) {
                for (let i = 0; i < attachFile.length; i++) {
                    formData.append("attachFile", attachFile[i]);
                }
            }
            for (let key in dailyData) {
                formData.append(key, dailyData[key]);
            }
            teamDailyMutate(formData);
            setTeamDailyModalOpen(false);
        } else {
            toast.error("標題及內容請填寫完整!");
        }
    };    

    const handleSaveEdit = () => {
        if (!editingId) {
            toast.error("未選擇日誌");
            return;
        }
    
        const updatedData = {
            id: Number(editingId),  // 確保 id 是數字
            title: title,
            content: content
        };
    
        console.log("更新日誌:", updatedData);
        updateDaily(updatedData, {
            onSuccess: () => {
                setEditingId(null);  // 更新後清除 editingId
                setPersonalDailyModalOpen(false);
                sucesssNotify("日誌更新成功");
            },
            onError: (error) => {
                console.log(error);
                errorNotify("更新失敗");
            }
        });
    };

    const handleSaveTeamEdit = () => {
        if (!editingId) {
            toast.error("未選擇日誌");
            return;
        }
    
        const updatedData = {
            id: Number(editingId),  // 確保 id 是數字
            title: title,
            content: content
        };
    
        console.log("更新日誌:", updatedData);
        updateTeamDailyMutate(updatedData, {
            onSuccess: () => {
                setEditingId(null);
                setTeamDailyModalOpen(false);
                sucesssNotify("小組日誌更新成功");
            },
            onError: (error) => {
                console.log(error);
                errorNotify("小組日誌更新失敗");
            }
        });        
    };
    
    const handleChange = e => {
        const { name, value } = e.target;
        setDailyData(prev => ({
            ...prev,
            [name]: value,
            userId: localStorage.getItem("id")
        }));
        if (name === 'title') setTitle(value);
        if (name === 'content') setContent(value);
    }
    const handleAddFileChange = e => {
        setAttachFile(e.target.files);
    }
    const handleCreateOrUpdatePersonalDaily = (e) => {
        e.preventDefault();
        
        if (editingId) {
            handleSaveEdit();
            return;
        }
    
        if (title.trim() !== "" && content.trim() !== "") {
            const formData = new FormData();
            formData.append('projectId', projectId);
            if (attachFile) {
                for (let i = 0; i < attachFile.length; i++) {
                    formData.append("attachFile", attachFile[i])
                }
            }
            for (let key in dailyData) {
                formData.append(key, dailyData[key]);
            }
            console.log("創建日誌:", ...formData);
            mutate(formData);
            setPersonalDailyModalOpen(false);
        } else {
            toast.error("標題及內容請填寫完整!");
        }
    };
    
    // const handleChangeSelectDaily = e => {
    //     const { name, value } = e.target;
    //     setSelectedDaily(prev => ({
    //         ...prev,
    //         [name]: value,
    //     }));
    // }

    // const handleTeamDailyChange = e => {
    //     const { name, value } = e.target;
    //     setDailyData(prev => ({
    //         ...prev,
    //         [name]: value,
    //         userId: localStorage.getItem("id")
    //     }));
    // }

    // 5Rs 反思相關處理函式
    const handle5RsSave = (data) => {
        console.log('儲存 5Rs 反思:', data);
        
        if (editingId) {
            // 更新現有的 5Rs 反思
            const formData = new FormData();
            formData.append('id', Number(editingId));
            formData.append('title', data.title);
            formData.append('content', data.content);
            
            // 如果有附加檔案，添加到 FormData
            if (data.attachFile && data.attachFile.length > 0) {
                for (let i = 0; i < data.attachFile.length; i++) {
                    formData.append("attachFile", data.attachFile[i]);
                }
            }
            
            updateDaily(formData, {
                onSuccess: () => {
                    setEditingId(null);
                    setIs5RsModalOpen(false);
                    setEditingReflectionData({});
                    setAttachFile(null);
                    sucesssNotify("5Rs 反思更新成功");
                },
                onError: (error) => {
                    console.log(error);
                    errorNotify("5Rs 反思更新失敗");
                }
            });
        } else {
            // 創建新的 5Rs 反思
            const formData = new FormData();
            formData.append('projectId', projectId);
            formData.append('title', data.title);
            formData.append('content', data.content);
            formData.append('userId', localStorage.getItem("id"));
            
            // 如果有附加檔案，添加到 FormData
            if (data.attachFile && data.attachFile.length > 0) {
                for (let i = 0; i < data.attachFile.length; i++) {
                    formData.append("attachFile", data.attachFile[i]);
                }
            }
            
            mutate(formData, {
                onSuccess: () => {
                    setIs5RsModalOpen(false);
                    setEditingReflectionData({});
                    setAttachFile(null);
                },
                onError: (error) => {
                    console.log(error);
                    errorNotify("5Rs 反思創建失敗");
                }
            });
        }
    };

    const handle5RsCancel = () => {
        setIs5RsModalOpen(false);
        setEditingId(null);
        setEditingReflectionData({});
        setTitle("");
        setAttachFile(null);
    };

    const handleEdit5Rs = (item) => {
        console.log("編輯 5Rs 反思:", item);
        
        const parsedContent = parse5RsContent(item.content);
        if (parsedContent) {
            setEditingReflectionData(parsedContent.data);
        } else {
            setEditingReflectionData({});
        }
        
        setTitle(item.title);
        setEditingId(item.id);
        setIs5RsModalOpen(true);
    };

    const handleView5Rs = (item) => {
        setSelectedReflectionForView(item);
        setViewReflectionModalOpen(true);
    };

    // 為現有的 5Rs 反思請求 AI 分析
    const handleRequestAIAnalysis = async (item) => {
        console.log('=== 前端 AI 分析請求開始 ===');
        console.log('選中的日誌項目:', item);
        
        const parsedContent = parse5RsContent(item.content);
        console.log('解析後的內容:', parsedContent);
        
        if (!parsedContent || !parsedContent.data) {
            console.error('解析 5Rs 內容失敗');
            toast.error("無法解析 5Rs 反思內容");
            return;
        }

        // 檢查是否已有 AI 反饋
        if (parsedContent.feedback && (parsedContent.feedback.overall || parsedContent.feedback.suggestions?.length > 0)) {
            console.log('已有 AI 反饋，跳過分析');
            toast.info("此反思已有 AI 分析結果");
            return;
        }

        console.log('準備發送的反思資料:', parsedContent.data);

        try {
            toast.loading("正在請求 AI 分析...", { id: 'ai-analysis' });
            
            console.log('呼叫 AI 分析 API...');
            const result = await analyze5RsReflection(parsedContent.data, 'auto');
            console.log('AI 分析 API 回應:', result);
            
            if (result.success) {
                console.log('AI 分析成功，提供者:', result.provider);
                console.log('AI 回饋內容:', result.feedback);
                
                // 將 AI 反饋整合到現有內容中
                const updatedContent = JSON.parse(item.content);
                updatedContent.feedback = {
                    ...result.feedback,
                    provider: result.provider,
                    analysisDate: result.analysisDate || new Date().toISOString()
                };

                console.log('更新後的內容:', updatedContent);

                // 更新日記內容
                const updatedData = {
                    id: Number(item.id),
                    title: item.title,
                    content: JSON.stringify(updatedContent, null, 2)
                };

                console.log('準備更新的資料:', updatedData);

                updateDaily(updatedData, {
                    onSuccess: () => {
                        console.log('AI 分析結果保存成功');
                        toast.success(`AI 分析完成！使用 ${result.provider}`, { id: 'ai-analysis' });
                    },
                    onError: (error) => {
                        console.error('儲存 AI 分析結果失敗:', error);
                        toast.error("儲存 AI 分析結果失敗", { id: 'ai-analysis' });
                    }
                });
            } else {
                console.error('AI 分析失敗:', result);
                toast.error('AI 分析失敗', { id: 'ai-analysis' });
            }
        } catch (error) {
            console.error('AI 分析過程發生錯誤:', error);
            toast.error('AI 分析過程中發生錯誤', { id: 'ai-analysis' });
        }
        
        console.log('=== 前端 AI 分析請求結束 ===');
    };

    const Tooltip = ({ children, content }) => {
        return (
            <div className='relative group'>
                {children}
                <div className='absolute  hidden group-hover:block'>
                    <div className='bg-gray-700 text-white text-xs rounded-lg py-1 px-2 whitespace-nowrap'>
                        {content}
                    </div>
                </div>
            </div>
        );
    };

    const handleCreateTeamDaily = e => {
        e.preventDefault();

        if (title.trim() !== "" && content.trim() !== "") {
            const formData = new FormData();
            formData.append('projectId', projectId);
            formData.append('creator', localStorage.getItem("username"));
            if (attachFile) {
                for (let i = 0; i < attachFile.length; i++) {
                    formData.append("attachFile", attachFile[i])
                }
            }
            for (let key in dailyData) {
                formData.append(key, dailyData[key]);
            }
            console.log(...formData);
            teamDailyMutate(formData);
            setTeamDailyModalOpen(false);

        } else {
            toast.error("標題及內容請填寫完整!");
        }


    }

    const errorNotify = (toastContent) => toast.error(toastContent);
    const sucesssNotify = (toastContent) => toast.success(toastContent);

    const fadeInOut = {
        hidden: { opacity: 0, scale: 0.95, y: 20 },
        visible: { opacity: 1, scale: 1, y: 0 },
    }

    // socket
    useEffect(() => {

        socket.connect();
        // socket.on("receive_message", receive_message);

        // return () => {
        //     socket.disconnect();
        // }
    }, [socket])


    return (
        <div className='min-w-full min-h-screen h-screen'>
            <div className='flex flex-col lg:flex-row my-5 pl-16 sm:pl-20 md:pl-24 lg:pl-20 xl:pl-24 pr-4 sm:pr-6 md:pr-8 lg:pr-16 xl:pr-20 py-8 sm:py-12 lg:py-16 w-full min-h-screen gap-6 lg:gap-8 pb-20 sm:pb-24 lg:pb-28'>
                <div className='flex flex-col w-full lg:w-1/2'>
                    <div className='flex justify-start gap-4 sm:gap-6 items-center pl-0 sm:pl-3 mb-4'>
                        <h3 className='text-lg sm:text-xl font-bold'>個人日誌</h3>
                        <div className="flex items-center gap-2">
                            <button onClick={() => {
                                setTitle("")
                                setContent("")
                                setAttachFile(null)
                                setReflectionMode('traditional')
                                setEditingId(null)
                                setPersonalDailyModalOpen(true)
                            }} className="flex items-center bg-customgreen hover:bg-customgreen/80 text-white font-semibold rounded-lg px-2 py-1 sm:px-4 sm:py-2 text-sm sm:text-base min-w-[70px]">
                                <FaPlus className="w-3 h-3 sm:w-4 sm:h-4" />
                                <p className="ml-1 sm:ml-2">傳統日誌</p>
                            </button>
                            <button onClick={() => {
                                setTitle("")
                                setEditingReflectionData({})
                                setEditingId(null)
                                setIs5RsModalOpen(true)
                            }} className="flex items-center bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-lg px-2 py-1 sm:px-4 sm:py-2 text-sm sm:text-base min-w-[70px]">
                                <FaPlus className="w-3 h-3 sm:w-4 sm:h-4" />
                                <p className="ml-1 sm:ml-2">5Rs 反思</p>
                            </button>
                        </div>
                    </div>
                    <div className='flex flex-wrap justify-center items-center mb-5'>
                        <div className='flex py-2  scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 scrollbar-thumb-rounded-full'>
                            {
                                isLoading ? <Loader /> :
                                    isError ? <p className='text-base font-bold'>{error.message}</p> :
                                        personalDaily.length === 0 ? (
                                            showEmptyMessage && (
                                                <div className="flex flex-col items-center justify-center px-4 sm:px-8 lg:px-16">
                                                    <Lottie className="w-48 sm:w-56 md:w-64 max-w-full h-auto" animationData={personalDailyIcon} />
                                                    <p className='font-bold text-zinc-600 text-sm sm:text-base lg:text-lg text-center leading-relaxed'>還沒新增過個人日誌 ! 趕快新增你的第一個【個人日誌】吧 ~</p>
                                                </div>
                                            )) : (
                                            <div className="relative overflow-hidden w-full py-4 sm:py-6 lg:py-8">

                                                <motion.div
                                                    drag="x"
                                                    dragConstraints={{ left: 0, right: 0,}}
                                                    style={{ x: dragX, }}
                                                    animate={{ translateX: `-${imgIndex * 100}%`, }}
                                                    transition={SPRING_OPTIONS}
                                                    onDragEnd={onDragEnd}
                                                    className="flex cursor-grab j items-center active:cursor-grabbing"
                                                >
                                                    {
                                                        personalDaily.map((item, index) => (
                                                            <motion.div
                                                                key={index}
                                                                style={{ backgroundSize: "cover", backgroundPosition: "center", }}
                                                                animate={{ scale: imgIndex === index ? 1 : 0.9, }}
                                                                transition={SPRING_OPTIONS}
                                                                className="aspect-video w-full shrink-0 rounded-xl object-cover"
                                                            >
                                                                <div className='bg-white rounded-lg shadow-lg p-3 sm:p-4 lg:p-6 m-1 sm:m-2 w-full h-full flex flex-col min-h-[400px] sm:min-h-[450px] lg:min-h-[500px]' key={index}>
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <h5 className='text-lg sm:text-xl font-bold text-customgreen py-2'>{item.title}</h5>
                                                                        {is5RsFormat(item.content) && (
                                                                            <span className="px-2 py-1 bg-teal-100 text-teal-800 text-xs font-medium rounded-full">
                                                                                5Rs 反思
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className='flex-grow overflow-auto mb-4'>
                                                                        {is5RsFormat(item.content) ? (
                                                                            <div className="space-y-2">
                                                                                <div className="flex items-center justify-between">
                                                                                    <p className='text-gray-600 text-sm mb-2'>5Rs 結構化反思內容</p>
                                                                                    {(() => {
                                                                                        const parsed = parse5RsContent(item.content);
                                                                                        const hasAIFeedback = parsed?.feedback && (parsed.feedback.overall || parsed.feedback.suggestions?.length > 0);
                                                                                        return hasAIFeedback ? (
                                                                                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full flex items-center">
                                                                                                <AiOutlineRobot className="w-3 h-3 mr-1" />
                                                                                                已分析
                                                                                            </span>
                                                                                        ) : (
                                                                                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                                                                                                未分析
                                                                                            </span>
                                                                                        );
                                                                                    })()}
                                                                                </div>
                                                                                <div className="text-gray-700 line-clamp-6">
                                                                                    {extract5RsText(item.content)}
                                                                                </div>
                                                                                <button
                                                                                    onClick={() => handleView5Rs(item)}
                                                                                    className="text-teal-600 hover:text-teal-800 text-sm font-medium"
                                                                                >
                                                                                    查看完整 5Rs 反思 →
                                                                                </button>
                                                                            </div>
                                                                        ) : (
                                                                            <p className='text-gray-700 break-words'>{item.content}</p>
                                                                        )}
                                                                    </div>
                                                                    <div className='mt-auto'>
                                                                        {(item.fileName || item.fileData) && (
                                                                            <div className='flex justify-between items-center mb-2'>
                                                                                <span className="text-base text-gray-500">
                                                                                    附加檔案: {item.originalName || item.filename || item.fileName}
                                                                                </span>
                                                                                <button
                                                                                    className="flex items-center justify-center px-3 py-1 bg-customgreen text-white rounded-md hover:bg-customgreen/80 transition-colors duration-300 ease-in-out"
                                                                                    onClick={() => {
                                                                                        if (item.fileName && item.fileUrl) {
                                                                                            // 使用 MinIO 直接下載 API
                                                                                            window.open(`http://localhost/api/file/direct/${item.fileName}`, '_blank');
                                                                                        } else if (item.fileData && item.fileData.data) {
                                                                                            // 向後相容：處理舊的 BLOB 資料
                                                                                            const buffer = new Uint8Array(item.fileData.data);
                                                                                            const blob = new Blob([buffer], { type: "application/octet-stream" });
                                                                                            FileDownload(blob, item.filename || item.originalName || "downloaded-file");
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    <AiOutlineCloudDownload size={32} className="mr-2" />
                                                                                    下載
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                        <div className='flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-3'>
                                                                            <p className='text-sm sm:text-base text-customgreen font-bold' title={formatTime(item.createdAt, 'full')}>
                                                                                建立日期: {formatTime(item.createdAt, 'date')}
                                                                            </p>
                                                                            {item.updatedAt && item.updatedAt !== item.createdAt && (
                                                                                <p className='text-xs sm:text-sm text-gray-500' title={formatTime(item.updatedAt, 'full')}>
                                                                                    更新: {formatTime(item.updatedAt, 'relative')}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                        {/* 5Rs 反思的 AI 分析按鈕 */}
                                                                        {is5RsFormat(item.content) && (() => {
                                                                            const parsed = parse5RsContent(item.content);
                                                                            const hasAIFeedback = parsed?.feedback && (parsed.feedback.overall || parsed.feedback.suggestions?.length > 0);
                                                                            
                                                                            if (!hasAIFeedback) {
                                                                                return (
                                                                                    <div className="mb-2">
                                                                                        <button
                                                                                            onClick={() => handleRequestAIAnalysis(item)}
                                                                                            className="w-full bg-teal-500 text-white py-2 px-4 rounded hover:bg-teal-600 transition-colors duration-300 text-sm sm:text-base mb-2 flex items-center justify-center"
                                                                                        >
                                                                                            <AiOutlineRobot className="w-4 h-4 mr-2" />
                                                                                            請求 AI 分析
                                                                                        </button>
                                                                                    </div>
                                                                                );
                                                                            }
                                                                            return null;
                                                                        })()}
                                                                        <button
                                                                            className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors duration-300 text-sm sm:text-base"
                                                                            onClick={() => {
                                                                                if (is5RsFormat(item.content)) {
                                                                                    handleEdit5Rs(item);
                                                                                } else {
                                                                                    handleEditClick(item);
                                                                                }
                                                                            }}
                                                                        >
                                                                            編輯 {is5RsFormat(item.content) ? '5Rs 反思' : '傳統日誌'}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        ))
                                                    }
                                                </motion.div>
                                                <div className="mt-4 flex w-full justify-center gap-2">
                                                    {personalDaily.map((_, idx) => {
                                                        return (
                                                            <button
                                                                key={idx}
                                                                onClick={() => setImgIndex(idx)}
                                                                className={`h-3 w-3 rounded-full transition-colors ${idx === imgIndex ? "bg-customgreen" : "bg-neutral-500"
                                                                    }`}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                        </div>
                    </div>
                </div>

                <div className='flex flex-col w-full lg:w-1/2'>
                    <div className='flex justify-start gap-4 sm:gap-6 items-center w-full pl-0 sm:pl-3 mb-4'>
                        <h3 className='text-lg sm:text-xl font-bold'>小組日誌</h3>
                        <button onClick={() => {
                            setTitle("")
                            setContent("")
                            setAttachFile(null)
                            setTeamDailyModalOpen(true)
                            setDailyData(prev => ({
                                ...prev,
                                type: "discuss"
                            }))
                        }} className="flex items-center bg-customgreen hover:bg-customgreen/80 text-white font-semibold rounded-lg px-2 py-1 sm:px-4 sm:py-2 text-sm sm:text-base min-w-[70px]">
                            <FaPlus className="w-3 h-3 sm:w-4 sm:h-4" />
                            <p className="ml-1 sm:ml-2">新增</p>
                        </button>
                    </div>
                    <div className='  flex flex-wrap justify-center items-center w-full mb-5'>
                        <div className='flex py-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 scrollbar-thumb-rounded-full'>
                            {
                                teamDailyQuery.isLoading ? <Loader /> :
                                    teamDailyQuery.isError ? <p className=' text-base font-bold'>{error.message}</p> :

                                        teamDaily.length === 0 ? (
                                            showEmptyMessage && (
                                                <div className="flex flex-col items-center justify-center px-4 sm:px-8 lg:px-16">
                                                    <Lottie className="w-48 sm:w-56 md:w-64 lg:w-72 max-w-full h-auto" animationData={personalDailyIcon} />
                                                    <p className='font-bold text-zinc-600 text-sm sm:text-base lg:text-lg text-center leading-relaxed'>還沒新增過小組日誌 ! 趕快新增你的第一個【小組日誌】吧 ~</p>
                                                </div>
                                            )) : (
                                            < div className="relative overflow-hidden w-full py-4 sm:py-6 lg:py-8">
                                                <motion.div
                                                    drag="x"
                                                    dragConstraints={{ left: 0, right: 0,}}
                                                    style={{ x: TeamDragX, }}
                                                    animate={{ translateX: `-${TeamImgIndex * 100}%`, }}
                                                    transition={SPRING_OPTIONS}
                                                    onDragEnd={TeamOnDragEnd}
                                                    className="flex cursor-grab j items-center active:cursor-grabbing"
                                                >
                                                    {
                                                        teamDaily.map((item, index) => (
                                                            <motion.div
                                                                key={index}
                                                                style={{ backgroundSize: "cover", backgroundPosition: "center", }}
                                                                animate={{ scale: TeamImgIndex === index ? 1 : 0.9, }}
                                                                transition={SPRING_OPTIONS}
                                                                className="aspect-video w-full shrink-0 rounded-xl object-cover"
                                                            >
                                                                <div className='bg-white rounded-lg shadow-lg p-3 sm:p-4 lg:p-6 m-1 sm:m-2 w-full h-full flex flex-col min-h-[400px] sm:min-h-[450px] lg:min-h-[500px]' key={index}>
                                                                    <h5 className='text-lg sm:text-xl font-bold text-customgreen py-2'>{item.title}</h5>
                                                                    <div className='flex-grow overflow-auto mb-4 px-2 sm:px-4'>
                                                                        <p className='text-gray-700 break-words text-sm sm:text-base leading-relaxed'>{item.content}</p>
                                                                    </div>
                                                                    <div className='mt-auto px-2 sm:px-4'>
                                                                        {(item.fileName || item.fileData) && (
                                                                            <div className='flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 gap-2'>
                                                                                <span className="text-sm sm:text-base text-gray-500 break-all">
                                                                                    附加檔案: {item.originalName || item.filename || item.fileName}
                                                                                </span>
                                                                                <button
                                                                                    className="flex items-center justify-center px-2 py-1 sm:px-3 sm:py-1 bg-customgreen text-white rounded-md hover:bg-customgreen/80 transition-colors duration-300 ease-in-out text-xs sm:text-sm w-full sm:w-auto"
                                                                                    onClick={() => {
                                                                                        if (item.fileName && item.fileUrl) {
                                                                                            // 使用 MinIO 直接下載 API
                                                                                            window.open(`http://localhost/api/file/direct/${item.fileName}`, '_blank');
                                                                                        } else if (item.fileData && item.fileData.data) {
                                                                                            // 向後相容：處理舊的 BLOB 資料
                                                                                            const buffer = new Uint8Array(item.fileData.data);
                                                                                            const blob = new Blob([buffer], { type: "application/octet-stream" });
                                                                                            FileDownload(blob, item.filename || item.originalName || "downloaded-file");
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    <AiOutlineCloudDownload size={24} className="mr-1 sm:mr-2" />
                                                                                    下載
                                                                                </button>
                                                                            </div>
                                                                        )}

                                                                        <div className='flex flex-col space-y-2'>
                                                                            <div className='flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-2'>
                                                                                <p className='text-sm sm:text-base text-customgreen font-bold' title={formatTime(item.createdAt, 'full')}>
                                                                                    建立日期: {formatTime(item.createdAt, 'date')}
                                                                                </p>
                                                                                <p className='text-xs sm:text-sm text-gray-500'>建立者: {item.creator}</p>
                                                                            </div>
                                                                            {item.updatedAt && item.updatedAt !== item.createdAt && (
                                                                                <div className='flex justify-between items-center'>
                                                                                    <p className='text-xs sm:text-sm text-gray-500' title={formatTime(item.updatedAt, 'full')}>
                                                                                        更新時間: {formatTime(item.updatedAt, 'relative')}
                                                                                    </p>
                                                                                </div>
                                                                            )}
                                                                            <div className='flex justify-end'>
                                                                                <button
                                                                                    className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors duration-300 text-sm sm:text-base"
                                                                                    onClick={() => handleEditTeamClick(item)}
                                                                                >
                                                                                    編輯
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                </div>
                                                            </motion.div>
                                                        ))
                                                    }
                                                </motion.div>
                                                <div className="mt-4 flex w-full justify-center gap-2">
                                                    {teamDaily.map((_, idx) => {
                                                        return (
                                                            <button
                                                                key={idx}
                                                                onClick={() => setTeamImgIndex(idx)}
                                                                className={`h-3 w-3 rounded-full transition-colors ${idx === TeamImgIndex ? "bg-customgreen" : "bg-neutral-500"
                                                                    }`}
                                                            />
                                                        );
                                                    })}
                                                </div>

                                            </div>

                                        )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 個人反思日誌 */}
            <Modal open={personalDailyModalOpen} onClose={() => setPersonalDailyModalOpen(false)} opacity={true} position={"justify-center items-center"}>
                <button onClick={() => setPersonalDailyModalOpen(false)} className='absolute top-1 right-1 rounded-lg bg-white hover:bg-slate-200'>
                    <GrFormClose className='w-6 h-6' />
                </button>
                <div className='flex flex-col px-2 sm:px-4 lg:px-6 py-2 sm:py-4'>
                    <h3 className='font-bold text-base sm:text-lg mb-3 text-center'>個人反思日誌</h3>
                    <div className='flex items-center mb-3'>
                        <p className='font-bold text-sm sm:text-base'>日誌內容</p>
                        <button
                            onClick={toggleTooltip}
                            className='ml-2 p-1'>
                            <GrCircleQuestion className='w-4 h-4 text-customgreen hover:text-customgreen/60' />
                        </button>
                    </div>
                    {isTooltipVisible && (
                        <motion.div
                            className="absolute z-10 bg-white p-6 rounded shadow-lg text-sm"
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            variants={fadeInOut}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                            <button onClick={closeTooltip} className='absolute top-1 right-1'>
                                <GrFormClose className='w-4 h-4' />
                            </button>
                            <p className=' font-bold text-base '>日誌內容可以撰寫以下項目:</p>
                            <ul>
                                <li className='  text-sm pt-2'>1.最近完成的進度內容。</li>
                                <li className='  text-sm '>2.完成的心得反思。</li>
                                <li className='  text-sm '>3.下次的預計完成的進度內容。</li>
                                <li className='  text-sm '>4.是否遇到新的問題。</li>
                            </ul>
                        </motion.div>
                    )}
                    <input className="rounded outline-none ring-2 p-1 ring-customgreen w-full mb-3"
                        type="text"
                        placeholder="日誌名稱..."
                        name='title'
                        value={title}
                        onChange={handleChange}
                        required
                    />
                    <textarea className="rounded outline-none ring-2 ring-customgreen w-full mb-3 p-1 resize-none overflow-auto"
                        rows={10}
                        placeholder="撰寫您的日誌..."
                        name='content'
                        value={content}
                        onChange={handleChange}
                    />
                    <input className="rounded outline-none ring-2 p-1 ring-customgreen w-full mb-3"
                        type="file"
                        name='filename'
                        onChange={handleAddFileChange}
                        multiple
                    />
                    <div className='flex justify-end m-2'>
                        <button
                            onClick={() => setPersonalDailyModalOpen(false)}
                            className="mx-auto w-full h-7 mb-2 bg-customgray rounded font-bold text-xs sm:text-sm text-black/60 mr-2">
                            取消
                        </button>
                        <button
                            onClick={e => {
                                editingId ? handleSaveEdit() : handleCreateOrUpdatePersonalDaily(e);
                            }}
                            type="submit"
                            className="mx-auto w-full h-7 mb-2 bg-customgreen rounded font-bold text-xs sm:text-sm text-white"
                        >
                            {editingId ? "更新" : "儲存"}
                        </button>
                    </div>
                </div>
            </Modal>
            {/* 小組反思日誌 */}
            <Modal open={teamDailyModalOpen} onClose={() => setTeamDailyModalOpen(false)} opacity={true} position={"justify-center items-center"}>
                <button onClick={() => setTeamDailyModalOpen(false)} className='absolute top-1 right-1 rounded-lg bg-white hover:bg-slate-200'>
                    <GrFormClose className='w-6 h-6' />
                </button>
                <div className='flex flex-col px-2 sm:px-4 lg:px-6 py-2 sm:py-4'>
                    <h3 className='font-bold text-base sm:text-lg mb-3 text-center'>小組反思日誌</h3>
                    <div className='flex items-center mb-3'>
                        <p className='font-bold text-sm sm:text-base'>日誌內容</p>
                        <button
                            onClick={toggleTooltip}
                            className='ml-2 p-1 '>
                            <GrCircleQuestion className='w-4 h-4 text-customgreen hover:text-customgreen/60' />
                        </button>
                    </div>
                    {isTooltipVisible && (
                        <motion.div
                            className="absolute z-10 bg-white p-6 rounded shadow-lg text-sm"
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            variants={fadeInOut}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                            <button onClick={closeTooltip} className='absolute top-1 right-1'>
                                <GrFormClose className='w-4 h-4' />
                            </button>
                            <p className=' font-bold text-base '>日誌內容可以撰寫以下項目:</p>
                            <ul>
                                <li className='  text-sm pt-2'>1.最近完成的進度內容。</li>
                                <li className='  text-sm '>2.完成的心得反思。</li>
                                <li className='  text-sm '>3.下次的預計完成的進度內容。</li>
                                <li className='  text-sm '>4.是否遇到新的問題。</li>
                            </ul>
                        </motion.div>
                    )}
                    <input className="rounded outline-none ring-2 p-1 ring-customgreen w-full mb-3"
                        type="text"
                        placeholder="日誌名稱..."
                        name='title'
                        value={title}
                        onChange={handleChange}
                        required
                    />
                    <textarea className="rounded outline-none ring-2 ring-customgreen w-full mb-3 p-1 resize-none overflow-auto"
                        rows={10}
                        placeholder="撰寫您的日誌..."
                        name='content'
                        value={content}
                        onChange={handleChange}
                    />
                    <input className="rounded outline-none ring-2 p-1 ring-customgreen w-full mb-3"
                        type="file"
                        name='filename'
                        onChange={handleAddFileChange}
                        multiple
                    />
                    <div className='flex justify-end m-2'>
                        <button
                            onClick={() => setTeamDailyModalOpen(false)}
                            className="mx-auto w-full h-7 mb-2 bg-customgray rounded font-bold text-xs sm:text-sm text-black/60 mr-2">
                            取消
                        </button>
                        <button
                            onClick={e => {
                                editingId ? handleSaveTeamEdit() : handleCreateOrUpdateTeamDaily(e);
                            }}
                            type="submit"
                            className="mx-auto w-full h-7 mb-2 bg-customgreen rounded font-bold text-xs sm:text-sm text-white"
                        >
                            {editingId ? "更新" : "儲存"}
                        </button>
                    </div>
                </div>
            </Modal>
            {/* 檢視 */}
            {/* {
                selectedDaily &&
                <Modal open={inspectDailyModalOpen} onClose={() => setInspectDailyModalOpen(false)} opacity={true} position={"justify-center items-center"}>
                    <div className='flex flex-col p-3'>
                        <h3 className='  font-bold text-lg mb-3 text-center'>檢視日誌</h3>
                        <p className=' font-bold text-base mb-3'>標題</p>
                        <input className=" rounded outline-none ring-2 p-1 ring-customgreen w-full mb-3"
                            type="text"
                            placeholder="標題"
                            name='title'
                            value={selectedDaily.title}
                            onChange={handleChangeSelectDaily}
                            disabled
                        />
                        <p className=' font-bold text-base mb-3'>內容</p>
                        <textarea className=" rounded outline-none ring-2 ring-customgreen w-full p-1 resize-none overflow-auto"
                            rows={10}
                            placeholder="內容"
                            name='content'
                            value={selectedDaily.content}
                            onChange={handleChangeSelectDaily}
                            disabled
                        />
                        {selectedDaily.fileData && (
                            <div className='flex justify-between items-center p-3 bg-gray-100 rounded-lg mt-5'>
                                <span className="font-semibold text-gray-700">附加檔案: {selectedDaily.filename}</span>
                                <button
                                    className="flex items-center justify-center px-3 py-1 bg-[#5BA491] text-white rounded-md hover:bg-[#487e6c] transition-colors duration-300 ease-in-out"
                                    onClick={() => {
                                        const buffer = new Uint8Array(selectedDaily.fileData.data);
                                        const blob = new Blob([buffer], { type: "application/octet-stream" });
                                        FileDownload(blob, selectedDaily.filename);
                                    }}
                                >
                                    <AiOutlineCloudDownload size={24} className="mr-2" />
                                    下載附件
                                </button>
                            </div>
                        )}
                    </div>
                    <div className='flex justify-end m-2'>

                        <button onClick={() => setInspectDailyModalOpen(false)} className="inline-flex items-center justify-center px-4 py-2 bg-[#5BA491] text-white rounded-md hover:bg-[#487e6c] transition-colors duration-300 ease-in-out" >
                            關閉
                        </button>
                    </div>
                </Modal>
            } */}

            {/* 5Rs 反思編輯 Modal */}
            <Modal open={is5RsModalOpen} onClose={() => handle5RsCancel()} opacity={true} position={"justify-center items-center"}>
                <div className="max-w-6xl max-h-[90vh] overflow-y-auto">
                    <FiveRsReflectionForm
                        initialData={editingReflectionData}
                        onSave={handle5RsSave}
                        onCancel={handle5RsCancel}
                        isEditing={!!editingId}
                        title={title}
                        onTitleChange={setTitle}
                        attachFile={attachFile}
                        onFileChange={handleAddFileChange}
                    />
                </div>
            </Modal>

            {/* 5Rs 反思檢視 Modal */}
            <Modal open={viewReflectionModalOpen} onClose={() => setViewReflectionModalOpen(false)} opacity={true} position={"justify-center items-center"}>
                <div className="max-w-6xl max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-4 p-4 border-b">
                        <h2 className="text-2xl font-bold text-gray-800">
                            {selectedReflectionForView?.title || '5Rs 反思檢視'}
                        </h2>
                        <button
                            onClick={() => setViewReflectionModalOpen(false)}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            <GrFormClose size={24} />
                        </button>
                    </div>
                    {selectedReflectionForView && (
                        <FiveRsReflectionDisplay
                            content={selectedReflectionForView.content}
                            showFeedback={true}
                            isTeacher={userRole === "teacher"}
                        />
                    )}
                </div>
            </Modal>

            <Toaster />
        </div >

    )
}