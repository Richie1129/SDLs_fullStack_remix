import { useEffect, useRef } from 'react';
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
    isLinkingMode,
    linkingSourceNode,
    onLinkingComplete,
}) {
    const networkRef = useRef(null);
    const nodesRef = useRef(nodes);

    // 用 ref 保存連線模式狀態，避免這些值的變化觸發網路重建
    const isLinkingModeRef = useRef(isLinkingMode);
    const linkingSourceNodeRef = useRef(linkingSourceNode);
    const onLinkingCompleteRef = useRef(onLinkingComplete);

    // 同步最新值到 ref
    useEffect(() => { nodesRef.current = nodes; }, [nodes]);
    useEffect(() => { isLinkingModeRef.current = isLinkingMode; }, [isLinkingMode]);
    useEffect(() => { linkingSourceNodeRef.current = linkingSourceNode; }, [linkingSourceNode]);
    useEffect(() => { onLinkingCompleteRef.current = onLinkingComplete; }, [onLinkingComplete]);

    // 初始化網路
    useEffect(() => {
        if (!container.current) return;

        const network = new Network(container.current, { nodes, edges }, option);
        networkRef.current = network;

        // 點擊事件：關閉選單
        network.on("click", () => {
            setCreateOptionModalOpen(false);
            setBuildOnOptionModalOpen(false);
        });

        // 雙擊事件（預留）
        network.on("doubleClick", () => {
            // 可以在這裡添加雙擊行為
        });

        // 右鍵事件：顯示建立選單
        network.on("oncontext", (properties) => {
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

        // 選擇節點事件：開啟編輯視窗或完成連線
        // 使用 ref 讀取連線模式狀態，避免閉包過期問題
        network.on("selectNode", ({ nodes: selectNodes }) => {
            let nodeId = selectNodes[0];
            let nodeInfo = nodesRef.current.filter(item => item.id === nodeId);
            const info = nodeInfo && nodeInfo[0];

            // 連線模式：完成連線（透過 ref 讀取最新狀態）
            if (isLinkingModeRef.current && linkingSourceNodeRef.current) {
                if (nodeId === linkingSourceNodeRef.current.id) {
                    // 不能連結自己
                    return;
                }
                if (onLinkingCompleteRef.current) {
                    onLinkingCompleteRef.current(linkingSourceNodeRef.current.id, nodeId);
                }
                return;
            }

            // 正常模式：開啟編輯視窗
            setUpdateNodeModalOpen(true);

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
            network.off("click");
            network.off("selectNode");
            network.off("oncontext");
            network.off("doubleClick");
            network.destroy();
        };
    }, [
        container,
        isObservationMode,
        projectId,
        setCreateOptionModalOpen,
        setBuildOnOptionModalOpen,
        setUpdateNodeModalOpen,
        setCanvasPosition,
        setBuildOnNodeId,
        setSelectNodeInfo,
        // 注意：isLinkingMode, linkingSourceNode, onLinkingComplete
        // 故意不放在依賴項中，改用 ref 讀取，避免這些值變化時重建網路
    ]);

    // 當 nodes 或 edges 更新時，只更新數據不重建網路
    useEffect(() => {
        if (!networkRef.current || !nodes || !edges) return;
        networkRef.current.setData({ nodes, edges });
    }, [nodes, edges]);
}
