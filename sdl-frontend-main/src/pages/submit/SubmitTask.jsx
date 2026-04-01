import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from 'react-query';
import { submitTask } from '../../api/submit';
import { useNavigate, useParams } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { getSubStage } from '../../api/stage';
import CommonInput from './components/CommonInput';
import GuidancePanel from './components/GuidancePanel';
import Loader from '../../components/Loader';
import { socket } from '../../utils/socket';
import Swal from 'sweetalert2';
import { getProject } from '../../api/project';
import CongratulationsMain_icon from "../../assets/AnimationCongratulationsMain.json";
import Congratulations_icon from "../../assets/AnimationCongratulations.json";
import Lottie from "lottie-react";
import { getStageInfo, setStageEnd, clearStageInfo } from '../../utils/authUtils';

export default function SubmitTask() {
    const [taskData, setTaskData] = useState({});
    const [attachFile, setAttachFile] = useState(null);
    const navigate = useNavigate();
    const { projectId } = useParams();
    const [stageInfo, setStageInfo] = useState({ userSubmit: {} });
    const [isProjectEnded, setIsProjectEnded] = useState(false);

    const { mutate } = useMutation(submitTask, {
        onSuccess: (res) => {
            if (res.message === "done") {
                sucesssNotify("全部階段已完成")
                setStageEnd(true);
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
                return;
            }
            sucesssNotify(res.message)
            clearStageInfo();
            socket.emit('taskSubmitted', { projectId: projectId, message: 'Task updated' });
            navigate(`/project/${projectId}/kanban`)
        },
        onError: (error) => {
            console.error('Submit error:', error);
            const msg = error?.response?.data?.message
                || error?.response?.data?.error?.message
                || error?.message
                || '上傳失敗，請重新整理頁面後再試';
            errorNotify(msg);
        }
    })

    const { currentStage, currentSubStage } = getStageInfo();
    
    // 生成 stage key (例如 '3-1') 給 GuidancePanel 使用
    const stageKey = `${currentStage}-${currentSubStage}`;
    
    const getSubStageQuery = useQuery("getSubStage", () => getSubStage({
        projectId: projectId,
        currentStage,
        currentSubStage
    }),
        {
            onSuccess: (data) => {
                setStageInfo(prev => ({
                    ...prev,
                    ...data,
                    currentStage,
                    currentSubStage
                }));
            },
            enabled: !!projectId
        }
    );

    const handleChange = e => {
        const { name, value } = e.target;
        const nameArray = Object.keys(stageInfo.userSubmit);
        setTaskData(prev => ({
            ...prev,
            [nameArray[name]]: value,
        }));
    }
    const handleAddFileChange = e => {
        setAttachFile(e.target.files);
    }

    const handleSubmit = e => {
        e.preventDefault();
        let allFieldsFilled = true;
        for (const [key, type] of Object.entries(stageInfo.userSubmit)) {
            if (type !== "file" && (!taskData[key] || taskData[key].trim() === "")) {
                allFieldsFilled = false;
                break;
            }
        }
        if (!allFieldsFilled) {
            toast.error("請確認所有欄位皆填寫完整!");
            return;
        }
    
        Swal.fire({
            title: "上傳",
            text: "確認紀錄當前階段成果?",
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#5BA491",
            cancelButtonColor: "#d33",
            confirmButtonText: "確定",
            cancelButtonText: "取消"
        }).then((result) => {
            if (result.isConfirmed) {
                e.preventDefault();
                const { currentStage, currentSubStage } = getStageInfo();
                const formData = new FormData();
                formData.append('projectId', projectId);
                formData.append('currentStage', currentStage);
                formData.append('currentSubStage', currentSubStage);
                formData.append('content', JSON.stringify(taskData));
                if (attachFile) {
                    for (let i = 0; i < attachFile.length; i++) {
                        formData.append("attachFile", attachFile[i])
                    }
                }
                for (let key in taskData) {
                    formData.append(key, taskData[key]);
                }
                mutate(formData);
            }
        });
    }

    const errorNotify = (toastContent) => toast.error(toastContent);
    const sucesssNotify = (toastContent) => toast.success(toastContent);

    useEffect(() => {
        socket.connect();
    }, [socket])

    const projectQuery = useQuery(['getProject', projectId], () => getProject(projectId), {
        onSuccess: (data) => {
            setIsProjectEnded(data.ProjectEnd);
        }
    });

    // 渲染完成狀態
    if (isProjectEnded) {
        return (
            <div className='flex flex-col h-full w-full justify-center items-center p-component-base sm:p-component-md-lg lg:p-component-lg'>
                <div className='text-customgreen text-h3 sm:text-h2 lg:text-h1 font-bold text-center mb-6'>
                    恭喜 ! 已經完成所有階段囉 ~
                </div>
                <div className='flex flex-col lg:flex-row items-center justify-center gap-stack-sm sm:gap-stack-md-lg lg:gap-20 max-w-full'>
                    <Lottie className="w-32 sm:w-48 lg:w-60 flex-shrink-0" animationData={Congratulations_icon} />
                    <Lottie className="w-48 sm:w-72 lg:w-96 flex-shrink-0" animationData={CongratulationsMain_icon} />
                    <Lottie className="w-32 sm:w-48 lg:w-60 flex-shrink-0" animationData={Congratulations_icon} />
                </div>
            </div>
        );
    }

    return (
        <div className='flex flex-col h-full w-full overflow-y-auto p-component-base sm:p-component-md-lg lg:p-component-lg'>
            {getSubStageQuery.isLoading ? (
                <div className='flex flex-1 justify-center items-center'>
                    <Loader />
                </div>
            ) : (
                // 表單和引導面板並排的容器（響應式：移動版垂直，桌面版並排）
                <div className='flex flex-col lg:flex-row gap-stack-sm sm:gap-stack-md lg:gap-stack-md-lg items-stretch max-w-7xl w-full mx-auto my-auto'>
                    {/* 主要表單卡片 */}
                    <div className='flex-1 w-full flex flex-col p-component-base sm:p-component-md-lg bg-white border-2 border-gray-200 rounded-lg shadow-lg min-h-0'>
                        <h3 className='font-bold text-body-lg sm:text-h3 text-center mb-4 text-gray-800'>
                            {stageInfo.name}
                        </h3>
                        {Object.entries(stageInfo.userSubmit).map((element, index) => {
                            const name = element[0];
                            const type = element[1];
                            switch (type) {
                                case "input":
                                    return <CommonInput key={index} handleChange={handleChange} type={type} name={name} index={index} />
                                case "file":
                                    return <CommonInput key={index} handleChange={handleAddFileChange} type={type} name={name} index={index} />
                                case "textarea":
                                    return <CommonInput key={index} handleChange={handleChange} type={type} name={name} index={index} />
                                default:
                                    return null;
                            }
                        })}
                        <div className='flex justify-center mt-4'>
                            <button
                                data-track
                                data-track-action="SUBMIT_UPLOAD"
                                data-track-type="submit"
                                onClick={e => { handleSubmit(e) }}
                                className="w-full py-2 sm:py-3 bg-customgreen hover:bg-customgreen/90 rounded-lg font-bold text-body-sm sm:text-body text-white transition-colors duration-fast">
                                上傳
                            </button>
                        </div>
                    </div>

                    {/* 側邊引導面板 - 桌面版顯示，與表單等高 */}
                    <GuidancePanel stageKey={stageKey} />
                </div>
            )}
            <Toaster />
        </div>
    )
}
