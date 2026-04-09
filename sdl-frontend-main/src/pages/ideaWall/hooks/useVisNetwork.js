import { useEffect, useRef, useCallback } from 'react';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';
import { visNetworkOptions as option } from '../../../utils/visNetworkOptions';
import { recordObservationEvent } from '../../../api/usage';

/**
 * Vis Network 互動 Hook
 * 方案 B 改造：使用 DataSet 差量更新取代 setData() 全量重繪
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
    const nodesDataSetRef = useRef(null);
    const edgesDataSetRef = useRef(null);
    const nodesRef = useRef(nodes);
    const initialFitDoneRef = useRef(false);

    // 用 ref 保存連線模式狀態
    const isLinkingModeRef = useRef(isLinkingMode);
    const linkingSourceNodeRef = useRef(linkingSourceNode);
    const onLinkingCompleteRef = useRef(onLinkingComplete);

    useEffect(() => { nodesRef.current = nodes; }, [nodes]);
    useEffect(() => { isLinkingModeRef.current = isLinkingMode; }, [isLinkingMode]);
    useEffect(() => { linkingSourceNodeRef.current = linkingSourceNode; }, [linkingSourceNode]);
    useEffect(() => { onLinkingCompleteRef.current = onLinkingComplete; }, [onLinkingComplete]);

    // 初始化網路（只執行一次）
    useEffect(() => {
        if (!container.current) return;

        // 建立 DataSet — 後續差量更新的關鍵
        const nodesDS = new DataSet(nodes || []);
        const edgesDS = new DataSet(edges || []);
        nodesDataSetRef.current = nodesDS;
        edgesDataSetRef.current = edgesDS;

        const network = new Network(
            container.current,
            { nodes: nodesDS, edges: edgesDS },
            option
        );
        networkRef.current = network;

        // 點擊事件：關閉選單
        network.on("click", () => {
            setCreateOptionModalOpen(false);
            setBuildOnOptionModalOpen(false);
        });

        network.on("doubleClick", () => {});

        // 右鍵事件：顯示建立選單
        network.on("oncontext", (properties) => {
            if (isObservationMode) return;

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

        // 選擇節點事件
        network.on("selectNode", ({ nodes: selectNodes }) => {
            let nodeId = selectNodes[0];
            let nodeInfo = nodesRef.current.filter(item => item.id === nodeId);
            const info = nodeInfo && nodeInfo[0];

            if (isLinkingModeRef.current && linkingSourceNodeRef.current) {
                if (nodeId === linkingSourceNodeRef.current.id) return;
                if (onLinkingCompleteRef.current) {
                    onLinkingCompleteRef.current(linkingSourceNodeRef.current.id, nodeId);
                }
                return;
            }

            setUpdateNodeModalOpen(true);

            if (isObservationMode && nodeId) {
                try {
                    recordObservationEvent({
                        targetType: 'IDEA_WALL_NODE',
                        targetId: nodeId,
                        targetName: info?.title,
                        projectId,
                    });
                } catch (_) {}
            }
            setSelectNodeInfo(info);
        });

        return () => {
            network.off("click");
            network.off("selectNode");
            network.off("oncontext");
            network.off("doubleClick");
            network.destroy();
            nodesDataSetRef.current = null;
            edgesDataSetRef.current = null;
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
    ]);

    // 差量更新 nodes（取代原本的 setData 全量重繪）
    useEffect(() => {
        const ds = nodesDataSetRef.current;
        if (!ds || !nodes) return;

        const currentIds = new Set(ds.getIds());
        const newIds = new Set(nodes.map(n => n.id));

        // 首次載入：整批放入 DataSet，讓 physics 跑完後 fit
        const isInitialLoad = currentIds.size === 0 && nodes.length > 0;

        // 收集即將被移除的節點位置（用於 tempId→realId 位置繼承）
        const removedPositions = [];
        if (!isInitialLoad && networkRef.current) {
            for (const id of currentIds) {
                if (!newIds.has(id)) {
                    const pos = networkRef.current.getPositions([id]);
                    if (pos[id]) removedPositions.push(pos[id]);
                }
            }
        }

        // 新增或更新
        const toUpdate = [];
        for (const node of nodes) {
            if (!currentIds.has(node.id) && !isInitialLoad) {
                // 若有同批被移除的節點位置（tempId→realId swap），繼承其座標
                const inheritedPos = removedPositions.shift();
                if (inheritedPos) {
                    node.x = inheritedPos.x;
                    node.y = inheritedPos.y;
                } else {
                    // 真正的新節點：放在視口中央附近
                    const network = networkRef.current;
                    if (network) {
                        const viewPos = network.getViewPosition();
                        node.x = viewPos.x + (Math.random() - 0.5) * 300;
                        node.y = viewPos.y + (Math.random() - 0.5) * 200;
                    }
                }
            }
            toUpdate.push(node);
        }
        if (toUpdate.length > 0) ds.update(toUpdate);

        // 刪除
        for (const id of currentIds) {
            if (!newIds.has(id)) {
                ds.remove(id);
            }
        }

        // 首次資料載入後，等 physics 穩定再 fit 到全部節點
        if (isInitialLoad && !initialFitDoneRef.current) {
            initialFitDoneRef.current = true;
            const network = networkRef.current;
            if (network) {
                network.once('stabilized', () => {
                    network.fit({ animation: { duration: 500, easingFunction: 'easeInOutQuad' } });
                });
            }
        }
    }, [nodes]);

    // 差量更新 edges
    useEffect(() => {
        const ds = edgesDataSetRef.current;
        if (!ds || !edges) return;

        // edges 用 from-to 組合作為 ID
        const edgeId = (e) => `${e.from || e.from_id}-${e.to || e.to_id}`;

        const currentItems = ds.get();
        const currentMap = new Map(currentItems.map(e => [e.id || edgeId(e), e]));
        const newMap = new Map(edges.map(e => {
            const id = edgeId(e);
            return [id, { ...e, id, from: e.from || e.from_id, to: e.to || e.to_id }];
        }));

        // 新增或更新
        const toUpdate = [];
        for (const [id, edge] of newMap) {
            if (!currentMap.has(id)) {
                toUpdate.push(edge);
            }
        }
        if (toUpdate.length > 0) ds.add(toUpdate);

        // 刪除
        const toRemove = [];
        for (const [id] of currentMap) {
            if (!newMap.has(id)) {
                toRemove.push(id);
            }
        }
        if (toRemove.length > 0) ds.remove(toRemove);
    }, [edges]);
}
