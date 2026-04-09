import { useRef } from 'react';
import toast from 'react-hot-toast';
import { getIdeaWall, createIdeaWall } from '../../../api/ideaWall';
import { getCurrentUsername } from '../../../utils/userUtils';

/**
 * 節點操作 Hook
 * 處理節點的建立、更新、刪除等操作
 * 方案 B 改造：所有 mutation 改走 useNodeMutations 的 Optimistic Update
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
    setAiCoachingNote,
    mutations,
}) {
    const currentUsername = getCurrentUsername();
    const userId = localStorage.getItem("id");

    // 保存 pending update 的舊資料供 error handler 回滾
    const pendingUpdateRef = useRef(null);
    // 保存 pending delete 的舊資料供 error handler 回滾
    const pendingDeleteRef = useRef(null);

    // 處理表單變更
    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === "title") {
            setTitle(value);
        } else if (name === "content") {
            setContent(value);
        }

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

        if (ideaWallInfo?.id && ideaWallInfo.id !== "") {
            updatedData.ideaWallId = ideaWallInfo.id;
        }

        setSelectNodeInfo(updatedData);
    };

    // 建立節點 — Optimistic Update
    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        if (title.trim() === "" || content.trim() === "") {
            toast.error("標題及內容請填寫完整!");
            return;
        }

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

        // 透過 mutations hook 樂觀建立節點
        mutations.createNode({
            title,
            content,
            ideaWallId: wallId,
            owner: currentUsername,
            from_id: buildOnNodeId,
            colorindex: parseInt(userId) || null,
        });

        // 立即觸發活動流更新
        const activityData = {
            type: 'create',
            source: 'node',
            nodeId: Date.now(),
            nodeTitle: title,
            nodeType: buildOnNodeId ? 'extension' : 'idea',
            user: currentUsername || 'Unknown',
            timestamp: new Date().toISOString(),
            projectId: projectId
        };
        window.dispatchEvent(new CustomEvent('nodeCreated', { detail: activityData }));

        setBuildOnNodeId("");
    };

    // 更新節點 — Optimistic Update
    const handleUpdateSubmit = (e) => {
        e.preventDefault();
        if (selectNodeInfo.title.trim() === "" || selectNodeInfo.content.trim() === "") {
            toast.error("標題及內容請填寫完整!");
            return;
        }

        setUpdateNodeModalOpen(false);

        // 透過 mutations hook 樂觀更新
        const rollbackData = mutations.updateNode({
            id: selectNodeInfo.id,
            title: selectNodeInfo.title,
            content: selectNodeInfo.content,
            owner: currentUsername,
        });

        if (rollbackData) {
            pendingUpdateRef.current = rollbackData;
        }

        // 活動流更新
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
        window.dispatchEvent(new CustomEvent('nodeUpdated', { detail: activityData }));
    };

    // 刪除節點 — Optimistic Update
    const handleDelete = (e) => {
        e.preventDefault();
        setUpdateNodeModalOpen(false);

        // 透過 mutations hook 樂觀刪除（保留完整快照供回滾）
        const rollbackData = mutations.deleteNode({
            id: selectNodeInfo.id,
            title: selectNodeInfo.title,
            owner: currentUsername,
        });

        if (rollbackData) {
            pendingDeleteRef.current = rollbackData;
        }

        // 活動流更新
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
        window.dispatchEvent(new CustomEvent('nodeDeleted', { detail: activityData }));
    };

    // 處理來自 AI 的新節點建議
    const handleNewNodeFromAI = (nodeDataFromAI) => {
        console.log("AI建議開啟新節點:", nodeDataFromAI);

        setUpdateNodeModalOpen(false);

        if (setAiCoachingNote) {
            setAiCoachingNote(nodeDataFromAI.aiCoachingNote || null);
        }

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
        pendingUpdateRef,
        pendingDeleteRef,
    };
}
