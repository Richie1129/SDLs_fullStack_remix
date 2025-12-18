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
import KB_Coach from './components/KB_Coach';
import OrchestratorMonitor from './components/OrchestratorMonitor'; // Phase 2 監控元件
import IdeaWallChatPanel from '../../components/IdeaWall/IdeaWallChatPanel'; // Phase 2 討論室元件
import KnowledgeForumScaffolds from './components/KnowledgeForumScaffolds';
import useObservationMode from '../../hooks/useObservationMode'; // 引入觀摩模式 hook
import { recordObservationEvent } from '../../api/usage';
import { getCurrentUsername, isCurrentUser } from '../../utils/userUtils'; // 引入用戶資訊工具

export default function IdeaWall() {
    const container = useRef(null);
    const url = svgConvertUrl("node");
    const { projectId } = useParams();
    const currentUsername = getCurrentUsername(); // 取得當前使用者名稱

    // 計算節點建立者顯示名稱（如果是當前用戶，顯示最新名稱；否則顯示資料庫中的名稱）
    const getDisplayNodeOwnerName = (owner) => {
        // 如果節點建立者就是當前用戶，使用最新的username
        if (isCurrentUser(owner) || owner === currentUsername) {
            return currentUsername;
        }
        return owner; // 其他用戶顯示資料庫中的名稱
    };

    const [nodes, setnodes] = useState([]);
    const [nodeData, setNodeData] = useState({});
    const [edges, setEdges] = useState([]);
    const [createOptionModalOpen, setCreateOptionModalOpen] = useState(false);
    const [buildOnOptionModalOpen, setBuildOnOptionModalOpen] = useState(false);
    const [createNodeModalOpen, setCreateNodeModalOpen] = useState(false);
    const [updateNodeModalOpen, setUpdateNodeModalOpen] = useState(false);
    const [canvasPosition, setCanvasPosition] = useState({});
    const [ideaWallInfo, setIdealWallInfo] = useState({ id: "", name: "", type: "" })
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

    const [kbCoachModalOpen, setKbCoachModalOpen] = useState(false); // KB Coach modal
    const [showNodeChangeHistory, setShowNodeChangeHistory] = useState(false);
    const [isChatPanelOpen, setIsChatPanelOpen] = useState(false); // Phase 2: 討論室開關
    
    // Phase 3: AI 建議通知狀態
    const [aiSuggestion, setAiSuggestion] = useState(null);
    const [suggestedAgentType, setSuggestedAgentType] = useState(null);

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
                    setCurrentStage(data.currentStage ? String(data.currentStage) : "1");
                    setCurrentSubStage(data.currentSubStage ? String(data.currentSubStage) : "1");
                }
            },
            refetchOnMount: false,
            refetchOnWindowFocus: false,
        }
    );

    // 簡化：不再需要複雜的想法牆查詢邏輯，每個專案只有一個想法牆
    const ideaWallInfoQuery = useQuery(
        ['ideaWallInfo', projectId],
        async () => {
            // 使用新的API，不需要stage參數
            const ideaWall = await getIdeaWall(projectId);
            return ideaWall;
        },
        {
            enabled: !!projectId,
            onSuccess: (data) => {
                console.log(`🎯 想法牆信息設置完成:`, data);
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

            item.image = svgConvertUrl(item.title, item.owner, item.createdAt, nodeColor, item.content);


            item.shape = "image";
            temp.push(item);
        });
    }, [nodes]);

    // socket
    useEffect(() => {
        function nodeUpdateEvent(data) {
            console.log("收到節點更新事件:", data);
            // 無論資料為何都重新載入節點 - 確保UI與資料庫同步
            getNodesQuery.refetch();
            getNodeRelationQuery.refetch();
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

        // 成功處理事件：節點操作成功
        const handleNodeSuccess = (result) => {
            console.log('節點操作成功:', result);
            // Show success message only after server confirmation
            if (result?.code === 'NODE_DELETE_SUCCESS') {
                toast.success(`✅ ${result.nodeTitle || '節點'} 刪除成功！`);
            } else if (result?.message) {
                toast.success(result.message);
            }
        };

        socket.off('nodeCreateError', handleNodeError);
        socket.off('nodeUpdateError', handleNodeError);
        socket.off('nodeDeleteError', handleNodeError);
        socket.on('nodeCreateError', handleNodeError);
        socket.on('nodeUpdateError', handleNodeError);
        socket.on('nodeDeleteError', handleNodeError);
        
        // 監聽成功事件
        socket.off('nodeCreateSuccess', handleNodeSuccess);
        socket.off('nodeUpdateSuccess', handleNodeSuccess);
        socket.off('nodeDeleteSuccess', handleNodeSuccess);
        socket.on('nodeCreateSuccess', handleNodeSuccess);
        socket.on('nodeUpdateSuccess', handleNodeSuccess);
        socket.on('nodeDeleteSuccess', handleNodeSuccess);

        // ================================================================
        // Phase 3: 監聽 AI 建議通知
        // ================================================================
        const handleAiSuggestion = (data) => {
            console.log('🤖 [Phase 3] Received AI suggestion:', data);
            
            // 儲存建議資訊
            setAiSuggestion(data);
            setSuggestedAgentType(data.role);
            
            // 顯示 Toast 通知
            const agentNames = {
                'IMPROVER': '🛠️ 想法改進者',
                'SYNTHESIZER': '🔗 知識整合者',
                'DEVIL': '😈 魔鬼代言人'
            };
            const agentName = agentNames[data.role] || 'AI 助教';
            
            toast((t) => (
                <div className="flex flex-col gap-2">
                    <div className="font-medium">{agentName} 有建議給你！</div>
                    <div className="text-sm text-gray-600">{data.reason}</div>
                    <div className="flex gap-2 mt-2">
                        <button
                            onClick={() => {
                                toast.dismiss(t.id);
                                setKbCoachModalOpen(true);
                            }}
                            className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                        >
                            查看建議
                        </button>
                        <button
                            onClick={() => toast.dismiss(t.id)}
                            className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                        >
                            稍後
                        </button>
                    </div>
                </div>
            ), {
                duration: 10000,
                position: 'top-right',
                style: {
                    background: '#f0f9ff',
                    border: '1px solid #0ea5e9',
                    padding: '16px',
                    maxWidth: '400px'
                }
            });
        };

        socket.off('aiSuggestion', handleAiSuggestion);
        socket.on('aiSuggestion', handleAiSuggestion);

        return () => {
            socket.off("nodeUpdated", nodeUpdateEvent);
            socket.off('nodeCreateError', handleNodeError);
            socket.off('nodeUpdateError', handleNodeError);
            socket.off('nodeDeleteError', handleNodeError);
            socket.off('nodeCreateSuccess', handleNodeSuccess);
            socket.off('nodeUpdateSuccess', handleNodeSuccess);
            socket.off('nodeDeleteSuccess', handleNodeSuccess);
            socket.off('aiSuggestion', handleAiSuggestion);
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


        // 只有當 ideaWallInfo.id 有效時才設置 nodeData
        if (ideaWallInfo?.id && ideaWallInfo.id !== "") {
            setNodeData((prevData) => ({
                ...prevData,
                [name]: value,
                ideaWallId: ideaWallInfo.id,
                owner: currentUsername,
                from_id: buildOnNodeId,
                projectId: projectId,
                colorindex: userId
            }));
        } else {
            console.warn('ideaWallInfo 尚未載入，跳過設置 nodeData');
        }
    };

    const handleUpdataChange = (e) => {
        const { name, value } = e.target;
        // 只有當 ideaWallInfo.id 有效時才更新 ideaWallId
        const updatedData = {
            ...selectNodeInfo,
            [name]: value,
            owner: currentUsername,
            projectId: projectId,
            colorindex: userId
        };
        
        // 只有在 ideaWallInfo 有效時才設置 ideaWallId
        if (ideaWallInfo?.id && ideaWallInfo.id !== "") {
            updatedData.ideaWallId = ideaWallInfo.id;
        }
        
        setSelectNodeInfo(updatedData);
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        if (title.trim() !== "" && content.trim() !== "") {
            if (!projectId) {
                toast.error('專案資訊尚未載入，請稍後再試');
                return;
            }

            // 確保有有效的 ideaWallId：優先使用既有狀態，否則即時抓取/建立
            let wallId = ideaWallInfo?.id;
            if (!wallId || wallId === "") {
                try {
                    // 以專案目前階段格式嘗試（若後端忽略，仍會回此專案第一個牆）
                    const stageFormat = `${currentStage}-${currentSubStage}`;
                    let wall = null;
                    try {
                        wall = await getIdeaWall(projectId, stageFormat);
                    } catch (_) { /* ignore and fallback */ }
                    if (!wall || !wall.id) {
                        wall = await createIdeaWall({ projectId, stage: stageFormat, name: '' });
                    }
                    if (wall && wall.id) {
                        wallId = wall.id;
                        setIdealWallInfo(wall);
                    }
                } catch (err) {
                    console.warn('即時取得/建立想法牆失敗:', err);
                }
            }

            if (!wallId) {
                toast.error('想法牆資訊尚未載入完成，請稍後再試');
                return;
            }

            setCreateNodeModalOpen(false);

            // 保存完整節點資料供活動流使用
            const completeNodeData = {
                ...nodeData,
                title,
                content,
                ideaWallId: wallId,
                projectId,
                from_id: buildOnNodeId,
                owner: currentUsername,
                colorindex: userId
            };

            // 立即觸發活動流更新
            const activityData = {
                type: 'create',
                source: 'node',
                nodeId: Date.now(),
                nodeTitle: title,
                nodeType: buildOnNodeId ? 'extension' : 'idea',
                nodeData: completeNodeData,
                user: currentUsername || 'Unknown',
                timestamp: new Date().toISOString(),
                projectId: projectId
            };
            window.dispatchEvent(new CustomEvent('nodeCreated', { detail: activityData }));

            // 送出建立節點（帶上 ideaWallId + projectId）
            socket.emit('nodeCreate', {
                ...nodeData,
                title,
                content,
                ideaWallId: wallId,
                projectId,
                from_id: buildOnNodeId,
                owner: currentUsername,
                colorindex: userId,
                user: {
                    username: currentUsername,
                    id: parseInt(localStorage.getItem('id')) || null,
                },
            });
            setBuildOnId("");
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
                user: currentUsername || 'Unknown',
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
                owner: currentUsername,
                projectId,
                user: {
                    username: currentUsername,
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
            user: currentUsername || 'Unknown',
            timestamp: new Date().toISOString(),
            projectId: projectId
        };
        
        // 觸發自定義事件
        window.dispatchEvent(new CustomEvent('nodeDeleted', {
            detail: activityData
        }));
        
        socket.emit('nodeDelete', { 
            ...selectNodeInfo, 
            owner: currentUsername,
            title: selectNodeInfo.title,
            projectId,
            user: {
                username: currentUsername,
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

    const handleKbCoach = () => {
        setKbCoachModalOpen(true);
    };

    const handleNewNodeFromAI = (nodeData) => {
        console.log("AI建議開啟新節點:", nodeData);
        // 不直接建立，而是開啟編輯視窗讓學生填寫
        setNodeData({
            ...nodeData,
            ideaWallId: ideaWallInfo?.id,
            projectId: projectId,
            owner: currentUsername,
            colorindex: userId
        });
        setTitle(nodeData.title || "");
        setContent(nodeData.content || ""); // 這裡應該只包含鷹架
        setBuildOnId(nodeData.from_id || ""); // 如果是延伸想法
        
        setKbCoachModalOpen(false); // 關閉教練視窗
        setUpdateNodeModalOpen(false); // 關閉檢視便利貼視窗
        setCreateNodeModalOpen(true); // 開啟建立視窗
        
        toast.success('已為您準備好節點，請繼續完成您的想法！', { icon: '📝' });
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

                    {/* Knowledge Forum 思考鷹架 */}
                    <KnowledgeForumScaffolds
                        currentContent={content}
                        onInsert={setContent}
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
                                    disabled={isObservationMode || currentUsername !== selectNodeInfo.owner}
                                />

                                {/* Knowledge Forum 思考鷹架 - 只在可編輯時顯示 */}
                                {!isObservationMode && currentUsername === selectNodeInfo.owner && (
                                    <KnowledgeForumScaffolds
                                        currentContent={selectNodeInfo.content}
                                        onInsert={(newContent) => setSelectNodeInfo({
                                            ...selectNodeInfo,
                                            content: newContent
                                        })}
                                    />
                                )}

                                <p className=' font-bold text-base mb-3'>內容</p>
                                <textarea className=" rounded outline-none ring-2 ring-customgreen w-full p-1 resize-none overflow-auto"
                                    rows={5}
                                    placeholder="內容"
                                    name='content'
                                    value={selectNodeInfo.content}
                                    onChange={handleUpdataChange}
                                    disabled={isObservationMode || currentUsername !== selectNodeInfo.owner}
                                />
                                <div className='flex justify-between items-center mt-3'>
                                    <p className=' font-bold text-base'>建立者: {getDisplayNodeOwnerName(selectNodeInfo.owner)}</p>
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
                        currentUsername === selectNodeInfo.owner ? (
                            <div className='flex flex-row justify-between m-2'>
                                {/* 刪除按鈕 - 觀摩模式隱藏 */}
                                {!isObservationMode && (
                                    <button onClick={handleDelete} className="w-16 h-7 bg-red-500 rounded font-bold text-sm sm:text-bas text-white mr-2">
                                        刪除
                                    </button>
                                )}
                                <div className='flex flex-col gap-2 mb-3'>
                                    {/* KB Coach按鈕（新版，推薦） */}
                                    {!isObservationMode && (
                                        <button
                                            onClick={handleKbCoach}
                                            className="w-full h-9 bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg font-bold text-sm text-white shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
                                            title="基於Knowledge Building 12原則的深度引導"
                                        >
                                            <span className="text-lg">🎓</span>
                                            <span>KB Coach</span>
                                            <span className="text-xs bg-yellow-400 text-blue-900 px-2 py-0.5 rounded-full font-semibold">推薦</span>
                                        </button>
                                    )}
                                    
                                    {/* 延伸想法按鈕 */}
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
                                            className="w-full h-7 bg-green-500 rounded font-bold text-sm text-white hover:bg-green-600 transition-colors"
                                        >
                                            延伸想法
                                        </button>
                                    )}
                                </div>
                                <div className='flex justify-end gap-2'>
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
                <Modal open={kbCoachModalOpen} onClose={() => {
                    setKbCoachModalOpen(false);
                    setSuggestedAgentType(null); // Phase 3: 關閉時清除建議
                }} opacity={false} position={"justify-center items-center"}>
                    <KB_Coach
                        nodeInfo={selectNodeInfo}
                        nodes={nodes} // 傳入所有節點以供上下文分析
                        onClose={() => {
                            setKbCoachModalOpen(false);
                            setSuggestedAgentType(null); // Phase 3: 關閉時清除建議
                        }}
                        onNewNode={handleNewNodeFromAI}
                        suggestedAgent={suggestedAgentType} // Phase 3: 傳入建議的 Agent 類型
                    />
                </Modal>
            )}
            <Timer />
            
            {/* Phase 2 Orchestrator 監控面板 */}
            {!isObservationMode && ideaWallInfo?.id && (
                <div className="absolute top-4 right-4 w-80 z-40">
                    <OrchestratorMonitor 
                        ideaWallId={ideaWallInfo.id} 
                        projectId={parseInt(projectId)}
                    />
                </div>
            )}
            
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

            {/* Phase 2: IdeaWall Chat Panel */}
            {!isObservationMode && (
                <>
                    {isChatPanelOpen ? (
                        <IdeaWallChatPanel 
                            ideaWallId={ideaWallInfo.id} 
                            selectedNodeId={selectNodeInfo.id} 
                            nodes={nodes}
                            onClose={() => setIsChatPanelOpen(false)} 
                        />
                    ) : (
                        <button 
                            onClick={() => setIsChatPanelOpen(true)}
                            className="fixed right-0 bottom-48 bg-white text-gray-600 border border-gray-200 shadow-lg rounded-l-xl py-4 px-1 z-40 hover:bg-gray-50 transition-all duration-300 flex flex-col items-center gap-1"
                            title="開啟討論室"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            <div className="flex flex-col items-center text-xs font-medium leading-tight space-y-1">
                                <span>討</span>
                                <span>論</span>
                                <span>室</span>
                            </div>
                        </button>
                    )}
                </>
            )}

            <Toaster />
        </div>
    )
}
