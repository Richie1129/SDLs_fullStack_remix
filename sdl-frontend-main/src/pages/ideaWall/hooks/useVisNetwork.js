import { useEffect } from 'react';
import { Network } from 'vis-network';
import { visNetworkOptions as option } from '../../../utils/visNetworkOptions';
import { recordObservationEvent } from '../../../api/usage';

/**
 * Vis Network 互動 Hook
 * 處理圖形網路的初始化和互動事件
 */
export function useVisNetwork({
    container,
    nodes,
    edges,
    projectId,
    isObservationMode,
    setCreateOptionModalOpen,
    setBuildOnOptionModalOpen,
    setUpdateNodeModalOpen,
    setCanvasPosition,
    setBuildOnNodeId,
    setSelectNodeInfo,
}) {
    useEffect(() => {
        const network =
            container.current &&
            new Network(container.current, { nodes, edges }, option);

        // 點擊事件：關閉選單
        network?.on("click", () => {
            setCreateOptionModalOpen(false);
            setBuildOnOptionModalOpen(false);
        });

        // 雙擊事件（預留）
        network?.on("doubleClick", () => {
            // 可以在這裡添加雙擊行為
        });

        // 右鍵事件：顯示建立選單
        network?.on("oncontext", (properties) => {
            // 觀摩模式下禁用右鍵創建功能
            if (isObservationMode) {
                return;
            }
            
            const { pointer, event } = properties;
            event.preventDefault();
            const x_coordinate = pointer.DOM.x;
            const y_coordinate = pointer.DOM.y;
            const oncontextSelectNode = network.getNodeAt({ x: x_coordinate, y: y_coordinate });
            
            if (oncontextSelectNode) {
                setBuildOnOptionModalOpen(true);
                setBuildOnNodeId(oncontextSelectNode);
            } else {
                setCreateOptionModalOpen(true);
            }
            setCanvasPosition({ x: x_coordinate, y: y_coordinate });
        });

        // 選擇節點事件：開啟編輯視窗
        network?.on("selectNode", ({ nodes: selectNodes }) => {
            setUpdateNodeModalOpen(true);
            let nodeId = selectNodes[0];
            let nodeInfo = nodes.filter(item => item.id === nodeId);
            const info = nodeInfo && nodeInfo[0];
            
            // 觀摩模式記錄點擊事件
            if (isObservationMode && nodeId) {
                try {
                    recordObservationEvent({
                        targetType: 'IDEA_WALL_NODE',
                        targetId: nodeId,
                        targetName: info?.title,
                        projectId,
                    });
                } catch (_) { 
                    // 靜默失敗，不影響 UI
                }
            }
            setSelectNodeInfo(info);
        });

        // 清理函式
        return () => {
            network?.off("click");
            network?.off("selectNode");
            network?.off("oncontext");
            network?.off("doubleClick");
        };
    }, [
        container, 
        nodes, 
        edges, 
        isObservationMode, 
        projectId,
        setCreateOptionModalOpen,
        setBuildOnOptionModalOpen,
        setUpdateNodeModalOpen,
        setCanvasPosition,
        setBuildOnNodeId,
        setSelectNodeInfo
    ]);
}
