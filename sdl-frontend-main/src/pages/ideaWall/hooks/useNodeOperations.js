import toast from 'react-hot-toast';
import { getIdeaWall, createIdeaWall } from '../../../api/ideaWall';
import { socket } from '../../../utils/socket';
import { getCurrentUsername } from '../../../utils/userUtils';

/**
 * 節點操作 Hook
 * 處理節點的建立、更新、刪除等操作
 */
export function useNodeOperations({
    projectId,
    ideaWallInfo,
    setIdeaWallInfo,
    currentStage,
    currentSubStage,
    nodeData,
    setNodeData,
    title,
    setTitle,
    content,
    setContent,
    buildOnNodeId,
    setBuildOnNodeId,
    selectNodeInfo,
    setSelectNodeInfo,
    setCreateNodeModalOpen,
    setUpdateNodeModalOpen,
}) {
    const currentUsername = getCurrentUsername();
    const userId = localStorage.getItem("id");

    // 處理表單變更
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

    // 處理更新表單變更
    const handleUpdateChange = (e) => {
        const { name, value } = e.target;
        
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

    // 建立節點
    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        if (title.trim() !== "" && content.trim() !== "") {
            if (!projectId) {
                toast.error('專案資訊尚未載入，請稍後再試');
                return;
            }

            // 確保有有效的 ideaWallId
            let wallId = ideaWallInfo?.id;
            if (!wallId || wallId === "") {
                try {
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
                        setIdeaWallInfo(wall);
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

            // 送出建立節點
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
            setBuildOnNodeId("");
        } else {
            toast.error("標題及內容請填寫完整!");
        }
    };

    // 更新節點
    const handleUpdateSubmit = (e) => {
        e.preventDefault();
        if (selectNodeInfo.title.trim() !== "" && selectNodeInfo.content.trim() !== "") {
            setUpdateNodeModalOpen(false);
            
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
                changes: [{
                    fieldName: 'title',
                    newValue: selectNodeInfo.title
                }]
            };
            
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
            });
        } else {
            toast.error("標題及內容請填寫完整!");
        }
    };

    // 刪除節點
    const handleDelete = (e) => {
        e.preventDefault();
        setUpdateNodeModalOpen(false);
        
        // 立即觸發活動流更新
        const activityData = {
            type: 'delete',
            source: 'node',
            nodeId: selectNodeInfo.id,
            nodeTitle: selectNodeInfo.title,
            nodeType: 'unknown',
            nodeData: selectNodeInfo,
            user: currentUsername || 'Unknown',
            timestamp: new Date().toISOString(),
            projectId: projectId
        };
        
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
        });
    };

    // 處理來自 AI 的新節點建議
    const handleNewNodeFromAI = (nodeDataFromAI) => {
        console.log("AI建議開啟新節點:", nodeDataFromAI);
        
        setNodeData({
            ...nodeDataFromAI,
            ideaWallId: ideaWallInfo?.id,
            projectId: projectId,
            owner: currentUsername,
            colorindex: userId
        });
        setTitle(nodeDataFromAI.title || "");
        setContent(nodeDataFromAI.content || "");
        setBuildOnNodeId(nodeDataFromAI.from_id || "");
        
        setCreateNodeModalOpen(true);
        
        toast.success('已為您準備好節點，請繼續完成您的想法！');
    };

    return {
        handleChange,
        handleUpdateChange,
        handleCreateSubmit,
        handleUpdateSubmit,
        handleDelete,
        handleNewNodeFromAI,
    };
}
