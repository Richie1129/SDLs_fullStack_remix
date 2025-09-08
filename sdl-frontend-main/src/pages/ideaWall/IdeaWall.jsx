import React, { useState, useEffect, useRef, useCallback } from 'react';
import Modal from '../../components/Modal';
import IdeaWallSideBar from './components/IdeaWallSideBar';
import TopBar from '../../components/TopBar';
import { Network } from 'vis-network';
import { visNetworkOptions as option } from '../../utils/visNetworkOptions'
import svgConvertUrl from '../../utils/svgConvertUrl';
import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { getIdeaWall, createIdeaWall } from '../../api/ideaWall';
import { getNodes, getNodeRelation, getProjectNodes, getProjectNodeRelation } from '../../api/nodes';
import { getProject } from '../../api/project';
import { socket } from '../../utils/socket';
import { getNodeChangeLogs } from '../../api/kanban';
import { formatTime } from '../../utils/timeUtils';
import SideBar from '../../components/SideBar';
import toast, { Toaster } from 'react-hot-toast';
import Lottie from "lottie-react";
import Adding_icon from "../../assets/AnimationAddingNode.json";
import Timer from './components/Timer';
import Idea_development from './components/Idea_development';
import useObservationMode from '../../hooks/useObservationMode'; // 引入觀摩模式 hook
import { recordObservationEvent } from '../../api/usage';

export default function IdeaWall() {
    const container = useRef(null);
    const url = svgConvertUrl("node");
    const { projectId } = useParams();
    const [nodes, setnodes] = useState([]);
    const [nodeData, setNodeData] = useState({});
    const [edges, setEdges] = useState([]);
    const [createOptionModalOpen, setCreateOptionModalOpen] = useState(false);
    const [buildOnOptionModalOpen, setBuildOnOptionModalOpen] = useState(false);
    const [createNodeModalOpen, setCreateNodeModalOpen] = useState(false);
    const [updateNodeModalOpen, setUpdateNodeModalOpen] = useState(false);
    const [canvasPosition, setCanvasPosition] = useState({});
    const [ideaWallInfo, setIdealWallInfo] = useState({ id: "1", name: "", type: "" })
    const [selectNodeInfo, setSelectNodeInfo] = useState({ id: "", title: "", content: "", owner: "", createdAt: "", ideaWallId: "", projectId: projectId });
    const [buildOnNodeId, setBuildOnId] = useState("")
    const [tempid, setTempId] = useState("")
    const [projectUsers, setProjectUsers] = useState([{ id: "", username: "" }]);
    const [hovering, setHovering] = useState(false);

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const userId = localStorage.getItem("id");
    const colors = [
        "#5BA491", "#26547C", "#F25757", "#AF7A6D", "#183446", "#9395D3", "#FF6542", "#78290F", "#DEA47E", "#9DACFF", "#2F3061", "#FFD166"
    ];

    const [aiDevelopmentModalOpen, setAiDevelopmentModalOpen] = useState(false);
    const [showNodeChangeHistory, setShowNodeChangeHistory] = useState(false);

    // 使用觀摩模式 hook
    const { isObservationMode } = useObservationMode();
    const [nodeChangeLogs, setNodeChangeLogs] = useState([]);
    const [currentStage, setCurrentStage] = useState("1");
    const [currentSubStage, setCurrentSubStage] = useState("1");

    // 首先獲取專案信息以得到當前階段
    const projectInfoQuery = useQuery(
        ['projectInfo', projectId],
        () => getProject(projectId),
        {
            onSuccess: (data) => {
                if (data) {
                    setCurrentStage(data.currentStage || "1");
                    setCurrentSubStage(data.currentSubStage || "1");
                }
            },
            refetchOnMount: false,
            refetchOnWindowFocus: false,
        }
    );

    const ideaWallInfoQuery = useQuery(
        ['ideaWallInfo', projectId, currentStage, currentSubStage],
        async () => {
            const stageString = `${currentStage}-${currentSubStage}`;
            try {
                // 首先嘗試獲取現有的想法牆
                const ideaWall = await getIdeaWall(projectId, stageString);
                return ideaWall;
            } catch (error) {
                if (error.response?.status === 404) {
                    // 如果不存在，創建新的想法牆
                    console.log(`創建新的想法牆，階段: ${stageString}`);
                    try {
                        const newIdeaWall = await createIdeaWall({
                            name: `專案想法牆-${stageString}`,
                            type: "project",
                            projectId: projectId,
                            stage: stageString
                        });
                        return newIdeaWall;
                    } catch (createError) {
                        console.error('創建想法牆失敗:', createError);
                        throw createError;
                    }
                } else {
                    throw error;
                }
            }
        },
        {
            enabled: !!projectId && !!currentStage && !!currentSubStage,
            onSuccess: (data) => {
                setIdealWallInfo(data)
                if (data) {
                    const { id } = data
                    setTempId(id)
                }
            },
            refetchOnMount: false,
            refetchOnWindowFocus: false,
        }
    )
    const getNodesQuery = useQuery({
        queryKey: ['projectNodes', projectId],
        queryFn: () => getProjectNodes(projectId),
        onSuccess: setnodes,
        enabled: !!projectId,
        retryOnMount: false
    });

    const getNodeRelationQuery = useQuery({
        queryKey: ['projectNodeRelations', projectId],
        queryFn: () => getProjectNodeRelation(projectId),
        onSuccess: setEdges,
        enabled: !!projectId,
        retryOnMount: false
    });

    // convert node to svg
    useEffect(() => {
        const temp = [];
        nodes.map((item) => {
            const nodeColor = colors[item.colorindex - 1 % colors.length]; // Use modulo to cycle through colors if index exceeds array length

            item.image = svgConvertUrl(item.title, item.owner, item.createdAt, nodeColor);


            item.shape = "image";
            temp.push(item);
        });
    }, [nodes]);

    // socket
    useEffect(() => {
        function nodeUpdateEvent(data) {
            if (data) {
                console.log("收到節點更新事件:", data);
                // 立即重新獲取所有節點和關係數據
                getNodesQuery.refetch();
                getNodeRelationQuery.refetch();
            }
        }

        socket.connect();
        socket.emit("join_project", projectId);

        // 確保事件監聽器只被添加一次
        socket.off("nodeUpdated", nodeUpdateEvent);
        socket.on("nodeUpdated", nodeUpdateEvent);

        // 錯誤處理事件：建立/更新/刪除節點失敗
        const handleNodeError = (err) => {
            console.warn('節點操作失敗:', err);
            // 統一錯誤提示
            if (err?.code === 'READ_ONLY_MODE') {
                toast.error('觀摩模式下無法編輯或建立節點');
            } else if (err?.message) {
                toast.error(err.message);
            } else {
                toast.error('節點操作失敗，請稍後再試');
            }
        };

        socket.off('nodeCreateError', handleNodeError);
        socket.off('nodeUpdateError', handleNodeError);
        socket.off('nodeDeleteError', handleNodeError);
        socket.on('nodeCreateError', handleNodeError);
        socket.on('nodeUpdateError', handleNodeError);
        socket.on('nodeDeleteError', handleNodeError);

        return () => {
            socket.off("nodeUpdated", nodeUpdateEvent);
            socket.off('nodeCreateError', handleNodeError);
            socket.off('nodeUpdateError', handleNodeError);
            socket.off('nodeDeleteError', handleNodeError);
        }
    }, [socket, projectId, getNodesQuery, getNodeRelationQuery]);

    // vis network
    useEffect(() => {
        const network =
            container.current &&
            new Network(container.current, { nodes, edges }, option);

        network?.on("click", () => {
            setCreateOptionModalOpen(false);
            setBuildOnOptionModalOpen(false);
        })

        network?.on("doubleClick", () => {
        })

        network?.on("oncontext", (properties) => {
            // 觀摩模式下禁用右鍵創建功能
            if (isObservationMode) {
                return;
            }
            
            const { pointer, event, nodes } = properties;
            event.preventDefault();
            const x_coordinate = pointer.DOM.x;
            const y_coordinate = pointer.DOM.y;
            const oncontextSelectNode = network.getNodeAt({ x: x_coordinate, y: y_coordinate })
            if (oncontextSelectNode) {
                setBuildOnOptionModalOpen(true);
                setBuildOnId(oncontextSelectNode)
            } else {
                setCreateOptionModalOpen(true);
            }
            setCanvasPosition({ x: x_coordinate, y: y_coordinate })
        })

        network?.on("selectNode", ({ nodes: selectNodes }) => {
            setUpdateNodeModalOpen(true);
            let nodeId = selectNodes[0];
            let nodeInfo = nodes.filter(item => item.id === nodeId);
            const info = nodeInfo && nodeInfo[0];
            // Record observation click without blocking UI
            if (isObservationMode && nodeId) {
                try {
                    recordObservationEvent({
                        targetType: 'IDEA_WALL_NODE',
                        targetId: nodeId,
                        targetName: info?.title,
                        projectId,
                    });
                } catch (_) { /* noop */ }
            }
            setSelectNodeInfo(info)
        })

        return () => {
            network?.off("click", ({ event }) => {
                console.log(event);
            })
            network?.off("selectNode", ({ event }) => {
                console.log(event);
            })
        }
    }, [container, nodes, edges]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === "title") {
            setTitle(value);
        } else if (name === "content") {
            setContent(value);
        }


        setNodeData((prevData) => ({
            ...prevData,
            [name]: value,
            ideaWallId: ideaWallInfo.id,
            owner: localStorage.getItem("username"),
            from_id: buildOnNodeId,
            projectId: projectId,
            colorindex: userId
        }));
    };

    const handleUpdataChange = (e) => {
        const { name, value } = e.target;
        setSelectNodeInfo((prevData) => ({
            ...prevData,
            [name]: value,
            ideaWallId: ideaWallInfo.id,
            owner: localStorage.getItem("username"),
            projectId: projectId,
            colorindex: userId
        }));
    };

    const handleCreateSubmit = (e) => {
        e.preventDefault();
        if (title.trim() !== "" && content.trim() !== "") {
            // 基本校驗：需有 ideaWallId 與 projectId
            if (!ideaWallInfo?.id || !projectId) {
                toast.error('想法牆尚未就緒，請稍後再試');
                return;
            }
            setCreateNodeModalOpen(false);
            
            // 保存完整節點資料供活動流使用
            const completeNodeData = {
                ...nodeData,
                title,
                content,
                ideaWallId: ideaWallInfo.id,
                projectId,
                from_id: buildOnNodeId,
                owner: localStorage.getItem('username'),
                colorindex: userId
            };
            
            // 立即觸發活動流更新 - 在發送 Socket 事件前就顯示
            const activityData = {
                type: 'create',
                source: 'node',
                nodeId: Date.now(), // 臨時 ID，後端會返回真正的 ID
                nodeTitle: title,
                nodeType: buildOnNodeId ? 'extension' : 'idea', // 如果有來源節點就是延伸想法
                nodeData: completeNodeData,
                user: localStorage.getItem('username') || 'Unknown',
                timestamp: new Date().toISOString(),
                projectId: projectId
            };
            
            // 觸發自定義事件
            window.dispatchEvent(new CustomEvent('nodeCreated', {
                detail: activityData
            }));
            
            socket.emit('nodeCreate', {
                ...nodeData,
                ideaWallId: ideaWallInfo.id,
                projectId,
                from_id: buildOnNodeId, // 設定來源節點 ID（如果是延伸想法）
                user: {
                    username: localStorage.getItem('username'),
                    id: parseInt(localStorage.getItem('id')) || null,
                },
            });
            setBuildOnId(""); // 清空，以免影響其他新建節點
        } else {
            toast.error("標題及內容請填寫完整!");
        }
    };
    
    const handleUpdateSubmit = (e) => {
        e.preventDefault()
        if (selectNodeInfo.title.trim() !== "" && selectNodeInfo.content.trim() !== "") {
            setUpdateNodeModalOpen(false)
            
            // 立即觸發活動流更新
            const activityData = {
                type: 'update',
                source: 'node',
                nodeId: selectNodeInfo.id,
                nodeTitle: selectNodeInfo.title,
                nodeData: selectNodeInfo,
                user: localStorage.getItem('username') || 'Unknown',
                timestamp: new Date().toISOString(),
                projectId: projectId,
                // 簡化的變更資訊
                changes: [{
                    fieldName: 'title',
                    newValue: selectNodeInfo.title
                }]
            };
            
            // 觸發自定義事件
            window.dispatchEvent(new CustomEvent('nodeUpdated', {
                detail: activityData
            }));
            
            socket.emit('nodeUpdate', { 
                ...selectNodeInfo, 
                owner: localStorage.getItem("username"),
                projectId,
                user: {
                    username: localStorage.getItem('username'),
                    id: parseInt(localStorage.getItem('id')) || null,
                },
            })
        } else {
            toast.error("標題及內容請填寫完整!");
        }
    }

    const handleDelete = (e) => {
        e.preventDefault()
        setUpdateNodeModalOpen(false)
        
        // 立即觸發活動流更新
        const activityData = {
            type: 'delete',
            source: 'node',
            nodeId: selectNodeInfo.id,
            nodeTitle: selectNodeInfo.title,
            nodeType: 'unknown', // 我們可能需要從節點資料中取得類型
            nodeData: selectNodeInfo,
            user: localStorage.getItem('username') || 'Unknown',
            timestamp: new Date().toISOString(),
            projectId: projectId
        };
        
        // 觸發自定義事件
        window.dispatchEvent(new CustomEvent('nodeDeleted', {
            detail: activityData
        }));
        
        socket.emit('nodeDelete', { 
            ...selectNodeInfo, 
            owner: localStorage.getItem("username"),
            title: selectNodeInfo.title,
            projectId,
            user: {
                username: localStorage.getItem('username'),
                id: parseInt(localStorage.getItem('id')) || null,
            },
        })
    }

    const handleMouseEnter = () => {
        setHovering(true);
    };

    const handleMouseLeave = () => {
        setHovering(false);
    };

    const handleAiDevelopment = () => {
        setAiDevelopmentModalOpen(true);
    };

    const handleNewNodeFromAI = (nodeData) => {
        console.log("發送新節點數據:", nodeData);
        socket.emit('nodeCreate', {
            ...nodeData,
            projectId,
            user: {
                username: localStorage.getItem('username'),
                id: parseInt(localStorage.getItem('id')) || null,
            },
        });
    };

    return (
        <div className="h-full w-full relative">
            <div ref={container} className="h-full w-full" />
            {/* create option */}
            {!isObservationMode && (
                <Modal open={createOptionModalOpen} onClose={() => setCreateOptionModalOpen(false)} opacity={false} modalCoordinate={canvasPosition} custom={"w-25 h-12"}>
                    <div>
                        <button onClick={() => {
                            setNodeData({}) // 重置 nodeData 状态
                            setTitle("")
                            setContent("")
                            setCreateOptionModalOpen(false)
                            setCreateNodeModalOpen(true)
                        }} className='w-full h-full p-2 rounded-md bg-white hover:bg-slate-100 text-sm'>
                            建立想法
                        </button>
                        <button onClick={() => setCreateOptionModalOpen(false)} className='w-full h-full p-2 rounded-md bg-white hover:bg-slate-100 text-sm'>
                            取消
                        </button>
                    </div>
                </Modal>
            )}
            {/* build on */}
            {!isObservationMode && (
                <Modal open={buildOnOptionModalOpen} onClose={() => setBuildOnOptionModalOpen(false)} opacity={false} modalCoordinate={canvasPosition} custom={"w-30 h-15"}>
                    <div>
                        <button onClick={() => {
                            setNodeData({}) // 重置 nodeData 状态
                            setTitle("")
                            setContent("")
                            setBuildOnOptionModalOpen(false)
                            setCreateNodeModalOpen(true)
                        }} className='w-full h-full p-2 rounded-md bg-white hover:bg-slate-100 text-sm'>
                            延伸想法
                        </button>
                        <button onClick={() => setBuildOnOptionModalOpen(false)} className='w-full h-full p-2 rounded-md bg-white hover:bg-slate-100 text-sm'>
                            取消
                        </button>
                    </div>
                </Modal>
            )}
            {/* create modal */}
            {!isObservationMode && (
                <Modal open={createNodeModalOpen} onClose={() => setCreateNodeModalOpen(false)} opacity={false} position={"justify-center items-center"}>
                    <div className='flex flex-col p-3'>
                        <h3 className=' font-bold text-base mb-3'>建立想法</h3>
                    <p className=' font-bold text-base mb-3'>標題</p>
                    <input className=" rounded outline-none ring-2 p-1 ring-customgreen w-full mb-3"
                        type="text"
                        placeholder="標題"
                        name='title'
                        value={title}
                        onChange={handleChange}
                    />
                    <p className=' font-bold text-base mb-3'>內容</p>
                    <textarea className=" rounded outline-none ring-2 ring-customgreen w-full p-1 resize-none overflow-auto"
                        rows={5}
                        placeholder="內容"
                        name='content'
                        value={content}
                        onChange={handleChange}
                    />
                </div>
                <div className='flex justify-end m-2'>
                    <button onClick={() => setCreateNodeModalOpen(false)} className="mx-auto w-full h-7 mb-2 bg-customgray rounded font-bold text-xs sm:text-sm text-black/60 mr-2" >
                        取消
                    </button>
                    <button onClick={handleCreateSubmit} style={{ backgroundColor: "#5BA491" }} className="mx-auto w-full h-7 mb-2  rounded font-bold text-xs sm:text-sm text-white">
                        新增
                    </button>

                </div>
                </Modal>
            )}
            {/* update modal */}
            {
                selectNodeInfo && (
                <Modal open={updateNodeModalOpen} onClose={() => setUpdateNodeModalOpen(false)} opacity={false} position={"justify-center items-center"}>
                    <div className='flex flex-col w-full'>
                        {/* 標籤頁導航 */}
                        <div className='flex border-b border-gray-200 mb-4'>
                            <button
                                onClick={() => setShowNodeChangeHistory(false)}
                                className={`px-4 py-2 font-medium text-sm ${
                                    !showNodeChangeHistory 
                                        ? 'text-customgreen border-b-2 border-customgreen' 
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                編輯節點
                            </button>
                            <button
                                onClick={() => {
                                    setShowNodeChangeHistory(true);
                                    // 取得變更記錄
                                    getNodeChangeLogs(selectNodeInfo.id).then(setNodeChangeLogs).catch(console.error);
                                }}
                                className={`px-4 py-2 font-medium text-sm ${
                                    showNodeChangeHistory 
                                        ? 'text-customgreen border-b-2 border-customgreen' 
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                變更歷史
                            </button>
                        </div>

                        {/* 編輯節點內容 */}
                        {!showNodeChangeHistory && (
                            <div className='flex flex-col p-3'>
                                <h3 className=' font-bold text-base mb-3'>檢視便利貼</h3>
                                <p className=' font-bold text-base mb-3'>標題</p>
                                <input className=" rounded outline-none ring-2 p-1 ring-customgreen w-full mb-3"
                                    type="text"
                                    placeholder="標題"
                                    name='title'
                                    value={selectNodeInfo.title}
                                    onChange={handleUpdataChange}
                                    disabled={isObservationMode || localStorage.getItem("username") !== selectNodeInfo.owner}
                                />
                                <p className=' font-bold text-base mb-3'>內容</p>
                                <textarea className=" rounded outline-none ring-2 ring-customgreen w-full p-1 resize-none overflow-auto"
                                    rows={5}
                                    placeholder="內容"
                                    name='content'
                                    value={selectNodeInfo.content}
                                    onChange={handleUpdataChange}
                                    disabled={isObservationMode || localStorage.getItem("username") !== selectNodeInfo.owner}
                                />
                                <div className='flex justify-between items-center mt-3'>
                                    <p className=' font-bold text-base'>建立者: {selectNodeInfo.owner}</p>
                                    {selectNodeInfo.createdAt && (
                                        <p className='text-sm text-gray-500' title={formatTime(selectNodeInfo.createdAt, 'full')}>
                                            建立時間: {formatTime(selectNodeInfo.createdAt, 'relative')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 變更歷史 */}
                        {showNodeChangeHistory && (
                            <div className='max-h-96 overflow-y-auto p-3'>
                                <div className='flex items-center mb-4'>
                                    <h4 className='text-lg font-medium text-gray-700'>變更歷史</h4>
                                </div>
                                
                                {nodeChangeLogs.length === 0 ? (
                                    <div className='text-center py-8 text-gray-500'>
                                        <p>尚無變更記錄</p>
                                    </div>
                                ) : (
                                    <div className='space-y-3'>
                                        {nodeChangeLogs.map((log, index) => (
                                            <div 
                                                key={log.id || index} 
                                                className='bg-gray-50 rounded-lg p-3 border-l-4 border-purple-400'
                                            >
                                                <div className='flex items-center justify-between mb-2'>
                                                    <div className='flex items-center'>
                                                        <span className='text-sm font-medium text-gray-700'>
                                                            {log.changedBy}
                                                        </span>
                                                    </div>
                                                    <span className='text-xs text-gray-500'>
                                                        {formatTime(log.createdAt, 'full')}
                                                    </span>
                                                </div>
                                                
                                                <p className='text-sm text-gray-600 mb-2'>
                                                    {log.description}
                                                </p>
                                                
                                                {log.fieldName && (
                                                    <div className='text-xs text-gray-500'>
                                                        <span className='font-medium'>欄位：</span>
                                                        {log.fieldName}
                                                        {log.oldValue && log.newValue && (
                                                            <div className='mt-1'>
                                                                <span className='text-red-600'>舊值：{log.oldValue}</span>
                                                                <br />
                                                                <span className='text-green-600'>新值：{log.newValue}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                
                                                <div className='flex items-center mt-2'>
                                                    <span className={`
                                                        px-2 py-1 rounded-full text-xs font-medium
                                                        ${log.changeType === 'create' ? 'bg-green-100 text-green-700' : ''}
                                                        ${log.changeType === 'update' ? 'bg-blue-100 text-blue-700' : ''}
                                                        ${log.changeType === 'delete' ? 'bg-red-100 text-red-700' : ''}
                                                    `}>
                                                        {log.changeType === 'create' && '創建'}
                                                        {log.changeType === 'update' && '更新'}
                                                        {log.changeType === 'delete' && '刪除'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    {/* 按鈕區域 */}
                    {!showNodeChangeHistory ? (
                        localStorage.getItem("username") === selectNodeInfo.owner ? (
                            <div className='flex flex-row justify-between m-2'>
                                {/* 刪除按鈕 - 觀摩模式隱藏 */}
                                {!isObservationMode && (
                                    <button onClick={handleDelete} className="w-16 h-7 bg-red-500 rounded font-bold text-sm sm:text-bas text-white mr-2">
                                        刪除
                                    </button>
                                )}
                                <div className='flex'>
                                    {/* <button
                                        onClick={handleAiDevelopment}
                                        className="w-32 h-7 bg-purple-500 rounded font-bold text-sm sm:text-base text-white mr-2"
                                    >
                                        AI 輔助發展
                                    </button> */}
                                    {/* 延伸想法按鈕 - 觀摩模式隱藏 */}
                                    {!isObservationMode && (
                                        <button
                                            onClick={() => {
                                                setBuildOnId(selectNodeInfo.id);
                                                setNodeData({});
                                                setTitle("");
                                                setContent("");
                                                setUpdateNodeModalOpen(false);
                                                setCreateNodeModalOpen(true);
                                            }}
                                            className="w-32 h-7 bg-blue-500 rounded font-bold text-sm sm:text-base text-white mr-2"
                                        >
                                            延伸想法
                                        </button>
                                    )}
                                    <button onClick={() => setUpdateNodeModalOpen(false)} className="w-16 h-7 bg-customgray rounded font-bold text-sm sm:text-bas text-black/60 mr-2">
                                        取消
                                    </button>
                                    {/* 儲存按鈕 - 觀摩模式隱藏 */}
                                    {!isObservationMode && (
                                        <button onClick={handleUpdateSubmit} className="w-16 h-7 bg-customgreen rounded font-bold text-sm sm:text-bas text-white">
                                            儲存
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className='flex justify-end m-2'>
                                <button onClick={() => setUpdateNodeModalOpen(false)} className="mx-auto w-1/3 h-7 mb-2 bg-customgreen rounded font-bold text-xs sm:text-base text-white mr-2" >
                                    關閉
                                </button>
                                {/* 延伸想法按鈕 - 觀摩模式隱藏 */}
                                {!isObservationMode && (
                                    <div className='flex justify-start'>
                                        <button
                                            onClick={() => {
                                                setBuildOnId(selectNodeInfo.id);
                                                setNodeData({});
                                                setTitle("");
                                                setContent("");
                                                setUpdateNodeModalOpen(false);
                                                setCreateNodeModalOpen(true);
                                            }}
                                            className="w-32 h-7 bg-blue-500 rounded font-bold text-sm sm:text-base text-white"
                                        >
                                            延伸想法
                                        </button>
                                    </div>
                                )}
                            </div>
                        )
                    ) : (
                        <div className='flex justify-end m-2'>
                            <button 
                                onClick={() => setUpdateNodeModalOpen(false)} 
                                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
                            >
                                關閉
                            </button>
                        </div>
                    )}
                </Modal>
            )}
            {!isObservationMode && (
                <Modal open={aiDevelopmentModalOpen} onClose={() => setAiDevelopmentModalOpen(false)} opacity={false} position={"justify-center items-center"}>
                    <Idea_development
                        nodeInfo={selectNodeInfo}
                        onClose={() => setAiDevelopmentModalOpen(false)}
                        onNewNode={handleNewNodeFromAI}
                    />
                </Modal>
            )}
            <Timer />
            {!isObservationMode && (
                <button
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => {
                        setNodeData({});  // 重置 nodeData 状态
                        setTitle("");
                        setContent("");
                        setCreateOptionModalOpen(false);
                        setCreateNodeModalOpen(true);
                    }}
                    aria-label="新增節點"
                    className={`absolute bottom-4 right-4 sm:bottom-6 sm:right-6 flex items-center justify-center text-2xl transition duration-300 z-50 ${hovering ?"scale-110" : "scale-100" } `}
                >
                    <Lottie
                        className="w-28"
                        animationData={Adding_icon}
                        loop={false}
                        autoplay={false}
                    />
                </button>
            )}
            <Toaster />
        </div>
    )
}
