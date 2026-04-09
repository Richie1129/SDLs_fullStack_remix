import React, { useRef, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import toast, { Toaster } from 'react-hot-toast';
import Lottie from "lottie-react";
import { HiLink, HiX } from 'react-icons/hi';
import { FiHelpCircle } from 'react-icons/fi';

// API
import { getIdeaWall } from '../../api/ideaWall';
import { postClientAuditEvent } from '../../api/audit';
import { getProjectNodes, getProjectNodeRelation } from '../../api/nodes';
import { getProject } from '../../api/project';
import { getNodeChangeLogs } from '../../api/kanban';

// Components
import Modal from '../../components/Modal';
import KB_Coach from './components/KB_Coach';
import IdeaWallChatPanel from '../../components/IdeaWall/IdeaWallChatPanel';
import CreateNodeModal from './components/modals/CreateNodeModal';
import UpdateNodeModal from './components/modals/UpdateNodeModal';
import CreateOptionMenu from './components/modals/CreateOptionMenu';
import IdeaWallOnboarding from './components/IdeaWallOnboarding';

// Hooks
import { useIdeaWallState } from './hooks/useIdeaWallState';
import { useNodeOperations } from './hooks/useNodeOperations';
import { useNodeMutations } from './hooks/useNodeMutations';
import { useIdeaWallSocket } from './hooks/useIdeaWallSocket.jsx';
import { useVisNetwork } from './hooks/useVisNetwork';
import useObservationMode from '../../hooks/useObservationMode';

// Utils
import { getCurrentUsername, isCurrentUser } from '../../utils/userUtils';

// Assets
import Adding_icon from "../../assets/AnimationAddingNode.json";

export default function IdeaWall() {
    const container = useRef(null);
    const { projectId } = useParams();
    const currentUsername = getCurrentUsername();
    const { isObservationMode } = useObservationMode();

    // 使用狀態管理 hook
    const state = useIdeaWallState(projectId);

    // Optimistic Update mutation hook
    const mutations = useNodeMutations({ projectId });

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
                state.setIdeaWallInfo(data);
                if (data) {
                    state.setTempId(data.id);
                }
            },
            refetchOnMount: false,
            refetchOnWindowFocus: false,
        }
    );

    // 獲取節點資料（初始載入用，後續靠 socket 差量更新）
    const getNodesQuery = useQuery({
        queryKey: ['projectNodes', projectId],
        queryFn: () => getProjectNodes(projectId),
        enabled: !!projectId,
        retryOnMount: false,
    });

    // 獲取節點關係
    const getNodeRelationQuery = useQuery({
        queryKey: ['projectNodeRelations', projectId],
        queryFn: () => getProjectNodeRelation(projectId),
        enabled: !!projectId,
        retryOnMount: false,
    });

    // 當 query data 變化時，轉換為 vis-network 格式並同步到 state
    useEffect(() => {
        if (!getNodesQuery.data) return;
        state.setNodes(getNodesQuery.data.map((node) => mutations.toVisNode(node)));
    }, [getNodesQuery.data]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!getNodeRelationQuery.data) return;
        state.setEdges(getNodeRelationQuery.data);
    }, [getNodeRelationQuery.data]); // eslint-disable-line react-hooks/exhaustive-deps

    // 完成連線 — Optimistic Update
    const handleLinkingComplete = (fromId, toId) => {
        mutations.createRelation({
            from_id: fromId,
            to_id: toId,
            ideaWallId: state.ideaWallInfo?.id,
        });

        state.setIsLinkingMode(false);
        state.setLinkingSourceNode(null);

        toast.success('連線建立成功！');
    };

    // 取消連線模式
    const handleCancelLinking = () => {
        state.setIsLinkingMode(false);
        state.setLinkingSourceNode(null);
        toast('已取消連線模式');
    };

    // 刪除連線 — Optimistic Update
    const handleDeleteRelation = (fromId, toId) => {
        if (window.confirm('確定要取消此連結嗎？')) {
            mutations.deleteRelation({
                from_id: fromId,
                to_id: toId,
            });

            toast.success('連線已取消！');
        }
    };

    // 計算當前節點連結到的其他節點
    const getConnectedNodes = (nodeId) => {
        if (!nodeId || !state.edges || !state.nodes) return [];

        const connectedEdges = state.edges.filter(edge => edge.from === nodeId);

        return connectedEdges.map(edge => {
            const targetNode = state.nodes.find(node => node.id === edge.to);
            return targetNode ? {
                id: targetNode.id,
                title: targetNode.title,
                owner: targetNode.owner
            } : null;
        }).filter(node => node !== null);
    };

    // 使用 Socket 事件處理 hook（方案 B：差量同步）
    useIdeaWallSocket({
        projectId,
        mutations,
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

    // 使用節點操作 hook（方案 B：透過 mutations 樂觀更新）
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
        mutations,
    });

    // UI 互動處理函式
    const handleMouseEnter = () => state.setHovering(true);
    const handleMouseLeave = () => state.setHovering(false);
    const handleKbCoach = () => state.setKbCoachModalOpen(true);

    const handleCreateIdeaClick = () => {
        state.setNodeData({});
        state.setTitle("");
        state.setContent("");
        state.setCreateOptionModalOpen(false);
        state.setCreateNodeModalOpen(true);
    };

    const handleExtendIdeaClick = () => {
        state.setNodeData({});
        state.setTitle("");
        state.setContent("");
        state.setBuildOnOptionModalOpen(false);
        state.setCreateNodeModalOpen(true);
    };

    const handleExtendFromUpdate = () => {
        state.setBuildOnNodeId(state.selectNodeInfo.id);
        state.setNodeData({});
        state.setTitle("");
        state.setContent("");
        state.setUpdateNodeModalOpen(false);
        state.setCreateNodeModalOpen(true);
    };

    const handleStartLinking = () => {
        state.setLinkingSourceNode(state.selectNodeInfo);
        state.setIsLinkingMode(true);
        state.setUpdateNodeModalOpen(false);
        toast.success('請點擊要連結的目標節點', {
            duration: 4000,
        });
    };

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

            {/* 計時器 + 新增節點按鈕 + 導覽重播按鈕 */}
            {!isObservationMode && (
                <div className="fixed bottom-4 right-4 flex flex-row items-end gap-2 z-50">
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

            {/* Phase 2: IdeaWall Chat Panel — 暫時隱藏 */}
            {false && !isObservationMode && (
                <>
                    {state.isChatPanelOpen ? (
                        <IdeaWallChatPanel
                            ideaWallId={state.ideaWallInfo?.id}
                            selectedNodeId={state.selectNodeInfo?.id}
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
