import React, { useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { Toaster } from 'react-hot-toast';
import Lottie from "lottie-react";

// API
import { getIdeaWall, createIdeaWall } from '../../api/ideaWall';
import { getProjectNodes, getProjectNodeRelation } from '../../api/nodes';
import { getProject } from '../../api/project';
import { getNodeChangeLogs } from '../../api/kanban';

// Components
import Modal from '../../components/Modal';
import Timer from './components/Timer';
import KB_Coach from './components/KB_Coach';
import OrchestratorMonitor from './components/OrchestratorMonitor';
import IdeaWallChatPanel from '../../components/IdeaWall/IdeaWallChatPanel';
import CreateNodeModal from './components/modals/CreateNodeModal';
import UpdateNodeModal from './components/modals/UpdateNodeModal';
import CreateOptionMenu from './components/modals/CreateOptionMenu';

// Hooks
import { useIdeaWallState } from './hooks/useIdeaWallState';
import { useNodeOperations } from './hooks/useNodeOperations';
import { useIdeaWallSocket } from './hooks/useIdeaWallSocket.jsx';
import { useVisNetwork } from './hooks/useVisNetwork';
import useObservationMode from '../../hooks/useObservationMode';

// Utils
import svgConvertUrl from '../../utils/svgConvertUrl';
import { getCurrentUsername, isCurrentUser } from '../../utils/userUtils';

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

    // 獲取節點資料
    const getNodesQuery = useQuery({
        queryKey: ['projectNodes', projectId],
        queryFn: () => getProjectNodes(projectId),
        onSuccess: state.setNodes,
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

    // 轉換節點為 SVG
    useEffect(() => {
        const temp = [];
        state.nodes.map((item) => {
            const nodeColor = NODE_COLORS[(item.colorindex - 1) % NODE_COLORS.length];
            item.image = svgConvertUrl(item.title, item.owner, item.createdAt, nodeColor, item.content);
            item.shape = "image";
            temp.push(item);
        });
    }, [state.nodes]);

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
            <div ref={container} className="h-full w-full" />

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
                    onClose={() => state.setCreateNodeModalOpen(false)}
                    title={state.title}
                    content={state.content}
                    onChange={operations.handleChange}
                    onSubmit={operations.handleCreateSubmit}
                    onContentChange={state.setContent}
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
                        onClose={() => {
                            state.setKbCoachModalOpen(false);
                            state.setSuggestedAgentType(null);
                        }}
                        onNewNode={operations.handleNewNodeFromAI}
                        suggestedAgent={state.suggestedAgentType}
                    />
                </Modal>
            )}

            {/* Timer */}
            <Timer />
            
            {/* Phase 2 Orchestrator 監控面板 */}
            {!isObservationMode && state.ideaWallInfo?.id && (
                <div className="absolute top-4 right-4 w-80 z-40">
                    <OrchestratorMonitor 
                        ideaWallId={state.ideaWallInfo.id} 
                        projectId={parseInt(projectId)}
                    />
                </div>
            )}
            
            {/* 新增節點按鈕 */}
            {!isObservationMode && (
                <button
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onClick={handleCreateIdeaClick}
                    aria-label="新增節點"
                    className={`absolute bottom-4 right-4 sm:bottom-6 sm:right-6 flex items-center justify-center text-h2 transition-opacity duration-normal z-50 ${state.hovering ? "opacity-80" : "opacity-100"}`}
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
                    {state.isChatPanelOpen ? (
                        <IdeaWallChatPanel 
                            ideaWallId={state.ideaWallInfo.id} 
                            selectedNodeId={state.selectNodeInfo.id} 
                            nodes={state.nodes}
                            onClose={() => state.setIsChatPanelOpen(false)} 
                        />
                    ) : (
                        <button 
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
