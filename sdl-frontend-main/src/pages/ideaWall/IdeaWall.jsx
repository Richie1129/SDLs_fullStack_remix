import React, { useRef, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import toast, { Toaster } from 'react-hot-toast';
import Lottie from "lottie-react";
import { HiLink, HiX } from 'react-icons/hi';
import { FiHelpCircle } from 'react-icons/fi';

// API
import { getIdeaWall, createIdeaWall } from '../../api/ideaWall';
import { postClientAuditEvent } from '../../api/audit';
import { getProjectNodes, getProjectNodeRelation } from '../../api/nodes';
import { getProject } from '../../api/project';
import { getNodeChangeLogs } from '../../api/kanban';

// Components
import Modal from '../../components/Modal';
// import Timer from './components/Timer';
import KB_Coach from './components/KB_Coach';
// import OrchestratorMonitor from './components/OrchestratorMonitor';
import IdeaWallChatPanel from '../../components/IdeaWall/IdeaWallChatPanel';
import CreateNodeModal from './components/modals/CreateNodeModal';
import UpdateNodeModal from './components/modals/UpdateNodeModal';
import CreateOptionMenu from './components/modals/CreateOptionMenu';
import IdeaWallOnboarding from './components/IdeaWallOnboarding';

// Hooks
import { useIdeaWallState } from './hooks/useIdeaWallState';
import { useNodeOperations } from './hooks/useNodeOperations';
import { useIdeaWallSocket } from './hooks/useIdeaWallSocket.jsx';
import { useVisNetwork } from './hooks/useVisNetwork';
import useObservationMode from '../../hooks/useObservationMode';

// Utils
import svgConvertUrl from '../../utils/svgConvertUrl';
import { getCurrentUsername, isCurrentUser } from '../../utils/userUtils';
import { socket } from '../../utils/socket';

// Constants
import { NODE_COLORS } from './constants/ideaWallConstants';

// Assets
import Adding_icon from "../../assets/AnimationAddingNode.json";

export default function IdeaWall() {
    const container = useRef(null);
    const { projectId } = useParams();
    const currentUsername = getCurrentUsername();
    const { isObservationMode } = useObservationMode();

    // 使用狀態管理 hook
    const state = useIdeaWallState(projectId);

    // 新手導覽
    const [showOnboarding, setShowOnboarding] = useState(false);
    useEffect(() => {
        if (projectId) {
            const hasOnboarded = localStorage.getItem(`ideawall_onboarded_${projectId}`);
            if (!hasOnboarded) {
                setShowOnboarding(true);
            }
        }
    }, [projectId]);

    // 計算節點建立者顯示名稱
    const getDisplayNodeOwnerName = (owner) => {
        if (isCurrentUser(owner) || owner === currentUsername) {
            return currentUsername;
        }
        return owner;
    };

    // 首先獲取專案信息以得到當前階段
    const projectInfoQuery = useQuery(
        ['projectInfo', projectId],
        () => getProject(projectId),
        {
            onSuccess: (data) => {
                if (data) {
                    state.setCurrentStage(data.currentStage ? String(data.currentStage) : "1");
                    state.setCurrentSubStage(data.currentSubStage ? String(data.currentSubStage) : "1");
                }
            },
            refetchOnMount: false,
            refetchOnWindowFocus: false,
        }
    );

    // 獲取想法牆信息
    const ideaWallInfoQuery = useQuery(
        ['ideaWallInfo', projectId],
        async () => {
            const ideaWall = await getIdeaWall(projectId);
            return ideaWall;
        },
        {
            enabled: !!projectId,
            onSuccess: (data) => {
                console.log(`🎯 想法牆信息設置完成:`, data);
                state.setIdeaWallInfo(data);
                if (data) {
                    state.setTempId(data.id);
                }
            },
            refetchOnMount: false,
            refetchOnWindowFocus: false,
        }
    );

    // 獲取節點資料並轉換為 SVG
    const getNodesQuery = useQuery({
        queryKey: ['projectNodes', projectId],
        queryFn: () => getProjectNodes(projectId),
        onSuccess: (nodes) => {
            // 在設置 nodes 時就轉換為 SVG，避免在 useEffect 中反覆修改
            const processedNodes = nodes.map((item) => {
                // 如果有 colorindex 就用 colorindex（用戶 ID）
                // 沒有的話，用 owner 名字生成穩定的顏色索引
                let colorIndex;
                if (item.colorindex) {
                    colorIndex = item.colorindex;
                } else {
                    // 根據 owner 名字生成穩定的數字（同名同色）
                    const hash = item.owner.split('').reduce((acc, char) => {
                        return char.charCodeAt(0) + ((acc << 5) - acc);
                    }, 0);
                    colorIndex = Math.abs(hash) % NODE_COLORS.length + 1;
                }
                const nodeColor = NODE_COLORS[(colorIndex - 1) % NODE_COLORS.length];

                // 創建新對象，不修改原對象
                return {
                    ...item,
                    image: svgConvertUrl(item.title, item.owner, item.createdAt, nodeColor, item.content),
                    shape: "image"
                };
            });
            state.setNodes(processedNodes);
        },
        enabled: !!projectId,
        retryOnMount: false
    });

    // 獲取節點關係
    const getNodeRelationQuery = useQuery({
        queryKey: ['projectNodeRelations', projectId],
        queryFn: () => getProjectNodeRelation(projectId),
        onSuccess: state.setEdges,
        enabled: !!projectId,
        retryOnMount: false
    });

    // 移除了轉換節點為 SVG 的 useEffect（已在 onSuccess 中處理）

    // 完成連線 - 必須在 useVisNetwork 之前定義
    const handleLinkingComplete = (fromId, toId) => {
        socket.emit('createNodeRelation', {
            from_id: fromId,
            to_id: toId,
            projectId: projectId,
            ideaWallId: state.ideaWallInfo?.id,
            user: {
                username: getCurrentUsername(),
                id: parseInt(localStorage.getItem('id')) || null,
            },
        });

        // 重置連線模式
        state.setIsLinkingMode(false);
        state.setLinkingSourceNode(null);
        
        toast.success('連線建立成功！');
    };

    // 取消連線模式 - 必須在 useVisNetwork 之前定義
    const handleCancelLinking = () => {
        state.setIsLinkingMode(false);
        state.setLinkingSourceNode(null);
        toast('已取消連線模式');
    };

    // 刪除連線 - 必須在 useVisNetwork 之前定義
    const handleDeleteRelation = (fromId, toId) => {
        if (window.confirm('確定要取消此連結嗎？')) {
            socket.emit('deleteNodeRelation', {
                from_id: fromId,
                to_id: toId,
                projectId: projectId,
                user: {
                    username: getCurrentUsername(),
                    id: parseInt(localStorage.getItem('id')) || null,
                },
            });
            
            toast.success('連線已取消！');
        }
    };

    // 計算當前節點連結到的其他節點
    const getConnectedNodes = (nodeId) => {
        if (!nodeId || !state.edges || !state.nodes) return [];
        
        // 找出從當前節點連出去的邊
        const connectedEdges = state.edges.filter(edge => edge.from === nodeId);
        
        // 找出目標節點的詳細資訊
        return connectedEdges.map(edge => {
            const targetNode = state.nodes.find(node => node.id === edge.to);
            return targetNode ? {
                id: targetNode.id,
                title: targetNode.title,
                owner: targetNode.owner
            } : null;
        }).filter(node => node !== null);
    };

    // 使用 Socket 事件處理 hook
    useIdeaWallSocket({
        projectId,
        getNodesQuery,
        getNodeRelationQuery,
        setAiSuggestion: state.setAiSuggestion,
        setSuggestedAgentType: state.setSuggestedAgentType,
        setKbCoachModalOpen: state.setKbCoachModalOpen,
    });

    // 使用 Vis Network 互動 hook
    useVisNetwork({
        container,
        nodes: state.nodes,
        edges: state.edges,
        projectId,
        isObservationMode,
        setCreateOptionModalOpen: state.setCreateOptionModalOpen,
        setBuildOnOptionModalOpen: state.setBuildOnOptionModalOpen,
        setUpdateNodeModalOpen: state.setUpdateNodeModalOpen,
        setCanvasPosition: state.setCanvasPosition,
        setBuildOnNodeId: state.setBuildOnNodeId,
        setSelectNodeInfo: state.setSelectNodeInfo,
        isLinkingMode: state.isLinkingMode,
        linkingSourceNode: state.linkingSourceNode,
        onLinkingComplete: handleLinkingComplete,
    });

    // 使用節點操作 hook
    const operations = useNodeOperations({
        projectId,
        ideaWallInfo: state.ideaWallInfo,
        setIdeaWallInfo: state.setIdeaWallInfo,
        currentStage: state.currentStage,
        currentSubStage: state.currentSubStage,
        nodeData: state.nodeData,
        setNodeData: state.setNodeData,
        title: state.title,
        setTitle: state.setTitle,
        content: state.content,
        setContent: state.setContent,
        buildOnNodeId: state.buildOnNodeId,
        setBuildOnNodeId: state.setBuildOnNodeId,
        selectNodeInfo: state.selectNodeInfo,
        setSelectNodeInfo: state.setSelectNodeInfo,
        setCreateNodeModalOpen: state.setCreateNodeModalOpen,
        setUpdateNodeModalOpen: state.setUpdateNodeModalOpen,
        setAiCoachingNote: state.setAiCoachingNote,
    });

    // UI 互動處理函式
    const handleMouseEnter = () => state.setHovering(true);
    const handleMouseLeave = () => state.setHovering(false);
    const handleKbCoach = () => state.setKbCoachModalOpen(true);

    // 建立想法按鈕處理
    const handleCreateIdeaClick = () => {
        state.setNodeData({});
        state.setTitle("");
        state.setContent("");
        state.setCreateOptionModalOpen(false);
        state.setCreateNodeModalOpen(true);
    };

    // 延伸想法按鈕處理
    const handleExtendIdeaClick = () => {
        state.setNodeData({});
        state.setTitle("");
        state.setContent("");
        state.setBuildOnOptionModalOpen(false);
        state.setCreateNodeModalOpen(true);
    };

    // 從 UpdateModal 延伸想法
    const handleExtendFromUpdate = () => {
        state.setBuildOnNodeId(state.selectNodeInfo.id);
        state.setNodeData({});
        state.setTitle("");
        state.setContent("");
        state.setUpdateNodeModalOpen(false);
        state.setCreateNodeModalOpen(true);
    };

    // 開始連線模式
    const handleStartLinking = () => {
        state.setLinkingSourceNode(state.selectNodeInfo);
        state.setIsLinkingMode(true);
        state.setUpdateNodeModalOpen(false);
        toast.success('請點擊要連結的目標節點', {
            duration: 4000,
        });
    };

    // 處理變更歷史標籤切換
    const handleTabChange = (showHistory) => {
        state.setShowNodeChangeHistory(showHistory);
        if (showHistory) {
            getNodeChangeLogs(state.selectNodeInfo.id)
                .then(state.setNodeChangeLogs)
                .catch(console.error);
        }
    };

    return (
        <div className="h-full w-full relative">
            {/* 新手導覽 */}
            {showOnboarding && (
                <IdeaWallOnboarding
                    projectId={projectId}
                    onClose={() => setShowOnboarding(false)}
                />
            )}

            <div ref={container} className="h-full w-full" />

            {/* 連線模式提示 UI */}
            {state.isLinkingMode && state.linkingSourceNode && (
                <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-blue-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-4 animate-bounce">
                    <HiLink className="w-6 h-6 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="font-bold text-lg">連線模式</p>
                        <p className="text-sm">從「{state.linkingSourceNode.title}」連結到...</p>
                    </div>
                    <button
                        data-track
                        data-track-action="IDEAWALL_LINKING_CANCEL"
                        data-track-type="node"
                        onClick={handleCancelLinking}
                        className="ml-4 px-4 py-2 bg-white text-blue-500 rounded-md hover:bg-gray-100 transition-colors font-medium flex items-center gap-2"
                    >
                        <HiX className="w-4 h-4" />
                        取消
                    </button>
                </div>
            )}

            {/* 右鍵選單 */}
            {!isObservationMode && (
                <CreateOptionMenu
                    createOptionOpen={state.createOptionModalOpen}
                    buildOnOptionOpen={state.buildOnOptionModalOpen}
                    onCloseCreateOption={() => state.setCreateOptionModalOpen(false)}
                    onCloseBuildOnOption={() => state.setBuildOnOptionModalOpen(false)}
                    onCreateIdea={handleCreateIdeaClick}
                    onExtendIdea={handleExtendIdeaClick}
                    canvasPosition={state.canvasPosition}
                />
            )}

            {/* 建立節點 Modal */}
            {!isObservationMode && (
                <CreateNodeModal
                    open={state.createNodeModalOpen}
                    onClose={() => { state.setCreateNodeModalOpen(false); state.setAiCoachingNote(null); }}
                    title={state.title}
                    content={state.content}
                    onChange={operations.handleChange}
                    onSubmit={operations.handleCreateSubmit}
                    onContentChange={state.setContent}
                    aiCoachingNote={state.aiCoachingNote}
                />
            )}

            {/* 更新節點 Modal */}
            {state.selectNodeInfo && (
                <UpdateNodeModal
                    open={state.updateNodeModalOpen}
                    onClose={() => state.setUpdateNodeModalOpen(false)}
                    selectNodeInfo={state.selectNodeInfo}
                    isObservationMode={isObservationMode}
                    showNodeChangeHistory={state.showNodeChangeHistory}
                    nodeChangeLogs={state.nodeChangeLogs}
                    onTabChange={handleTabChange}
                    onChange={operations.handleUpdateChange}
                    onContentChange={(newContent) => state.setSelectNodeInfo({
                        ...state.selectNodeInfo,
                        content: newContent
                    })}
                    onSubmit={operations.handleUpdateSubmit}
                    onDelete={operations.handleDelete}
                    onKbCoach={handleKbCoach}
                    onExtendIdea={handleExtendFromUpdate}
                    onStartLinking={handleStartLinking}
                    onDeleteRelation={handleDeleteRelation}
                    connectedNodes={getConnectedNodes(state.selectNodeInfo.id)}
                    getDisplayNodeOwnerName={getDisplayNodeOwnerName}
                />
            )}

            {/* KB Coach Modal */}
            {!isObservationMode && (
                <Modal 
                    open={state.kbCoachModalOpen} 
                    onClose={() => {
                        state.setKbCoachModalOpen(false);
                        state.setSuggestedAgentType(null);
                    }} 
                    opacity={false} 
                    position={"justify-center items-center"}
                >
                    <KB_Coach
                        nodeInfo={state.selectNodeInfo}
                        nodes={state.nodes}
                        isOwner={getCurrentUsername() === state.selectNodeInfo?.owner}
                        onClose={() => {
                            state.setKbCoachModalOpen(false);
                            state.setSuggestedAgentType(null);
                        }}
                        onNewNode={operations.handleNewNodeFromAI}
                        suggestedAgent={state.suggestedAgentType}
                    />
                </Modal>
            )}

            {/* Phase 2 Orchestrator 監控面板 */}
            {/* {!isObservationMode && state.ideaWallInfo?.id && (
                <div className="absolute top-4 right-4 w-80 z-40">
                    <OrchestratorMonitor
                        ideaWallId={state.ideaWallInfo.id}
                        projectId={parseInt(projectId)}
                    />
                </div>
            )} */}

            {/* 計時器 + 新增節點按鈕 + 導覽重播按鈕 */}
            {!isObservationMode && (
                <div className="fixed bottom-4 right-4 flex flex-row items-end gap-2 z-50">
                    {/* <Timer /> */}
                    <button
                        data-track
                        data-track-action="IDEAWALL_NODE_CREATE_OPEN"
                        data-track-type="node"
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                        onClick={handleCreateIdeaClick}
                        aria-label="新增節點"
                        className={`flex items-center justify-center transition-opacity duration-normal ${state.hovering ? "opacity-80" : "opacity-100"}`}
                    >
                        <Lottie
                            className="w-20 sm:w-28"
                            animationData={Adding_icon}
                            loop={false}
                            autoplay={false}
                        />
                    </button>
                    <button
                        onClick={() => {
                            setShowOnboarding(true);
                            postClientAuditEvent({
                                action: 'IDEA_WALL_TOUR_REPLAY',
                                targetType: 'project',
                                targetId: projectId,
                                projectId,
                                metadata: { page: 'idea_wall' },
                            }).catch((e) => console.warn('想法牆導覽重播 audit 紀錄失敗（略過）', e));
                        }}
                        className="p-2 mb-9 bg-white/80 backdrop-blur-sm text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg shadow-sm border border-gray-200 transition-colors duration-fast"
                        title="重播想法牆導覽"
                    >
                        <FiHelpCircle size={18} />
                    </button>
                </div>
            )}

            {/* Phase 2: IdeaWall Chat Panel */}
            {!isObservationMode && (
                <>
                    {state.isChatPanelOpen ? (
                        <IdeaWallChatPanel 
                            ideaWallId={state.ideaWallInfo.id} 
                            selectedNodeId={state.selectNodeInfo.id} 
                            nodes={state.nodes}
                            onClose={() => state.setIsChatPanelOpen(false)} 
                        />
                    ) : (
                        <button 
                            data-track
                            data-track-action="IDEAWALL_CHAT_OPEN"
                            data-track-type="ideawall"
                            onClick={() => state.setIsChatPanelOpen(true)}
                            className="fixed right-0 bottom-48 bg-white text-gray-600 border border-gray-200 shadow-lg rounded-l-xl py-4 px-1 z-40 hover:bg-gray-50 transition-all duration-300 flex flex-col items-center gap-1"
                            title="開啟討論室"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            <div className="flex flex-col items-center text-caption font-medium leading-tight space-y-1">
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
    );
}
