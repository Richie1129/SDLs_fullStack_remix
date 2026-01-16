import { useState } from 'react';

/**
 * IdeaWall 狀態管理 Hook
 * 集中管理所有 IdeaWall 相關的狀態
 */
export function useIdeaWallState(projectId) {
    // 節點相關狀態
    const [nodes, setNodes] = useState([]);
    const [nodeData, setNodeData] = useState({});
    const [edges, setEdges] = useState([]);
    const [selectNodeInfo, setSelectNodeInfo] = useState({ 
        id: "", 
        title: "", 
        content: "", 
        owner: "", 
        createdAt: "", 
        ideaWallId: "", 
        projectId: projectId 
    });
    const [buildOnNodeId, setBuildOnNodeId] = useState("");
    const [tempid, setTempId] = useState("");

    // Modal 狀態
    const [createOptionModalOpen, setCreateOptionModalOpen] = useState(false);
    const [buildOnOptionModalOpen, setBuildOnOptionModalOpen] = useState(false);
    const [createNodeModalOpen, setCreateNodeModalOpen] = useState(false);
    const [updateNodeModalOpen, setUpdateNodeModalOpen] = useState(false);
    const [kbCoachModalOpen, setKbCoachModalOpen] = useState(false);
    const [isChatPanelOpen, setIsChatPanelOpen] = useState(false);

    // 表單狀態
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [canvasPosition, setCanvasPosition] = useState({});

    // 專案狀態
    const [ideaWallInfo, setIdeaWallInfo] = useState({ id: "", name: "", type: "" });
    const [projectUsers, setProjectUsers] = useState([{ id: "", username: "" }]);
    const [currentStage, setCurrentStage] = useState("1");
    const [currentSubStage, setCurrentSubStage] = useState("1");

    // UI 狀態
    const [hovering, setHovering] = useState(false);
    const [showNodeChangeHistory, setShowNodeChangeHistory] = useState(false);

    // AI 相關狀態
    const [aiSuggestion, setAiSuggestion] = useState(null);
    const [suggestedAgentType, setSuggestedAgentType] = useState(null);

    // 變更歷史
    const [nodeChangeLogs, setNodeChangeLogs] = useState([]);

    return {
        // 節點相關
        nodes,
        setNodes,
        nodeData,
        setNodeData,
        edges,
        setEdges,
        selectNodeInfo,
        setSelectNodeInfo,
        buildOnNodeId,
        setBuildOnNodeId,
        tempid,
        setTempId,

        // Modal 狀態
        createOptionModalOpen,
        setCreateOptionModalOpen,
        buildOnOptionModalOpen,
        setBuildOnOptionModalOpen,
        createNodeModalOpen,
        setCreateNodeModalOpen,
        updateNodeModalOpen,
        setUpdateNodeModalOpen,
        kbCoachModalOpen,
        setKbCoachModalOpen,
        isChatPanelOpen,
        setIsChatPanelOpen,

        // 表單狀態
        title,
        setTitle,
        content,
        setContent,
        canvasPosition,
        setCanvasPosition,

        // 專案狀態
        ideaWallInfo,
        setIdeaWallInfo,
        projectUsers,
        setProjectUsers,
        currentStage,
        setCurrentStage,
        currentSubStage,
        setCurrentSubStage,

        // UI 狀態
        hovering,
        setHovering,
        showNodeChangeHistory,
        setShowNodeChangeHistory,

        // AI 狀態
        aiSuggestion,
        setAiSuggestion,
        suggestedAgentType,
        setSuggestedAgentType,

        // 變更歷史
        nodeChangeLogs,
        setNodeChangeLogs,
    };
}
