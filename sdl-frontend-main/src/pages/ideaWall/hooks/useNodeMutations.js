import { useQueryClient } from 'react-query';
import { useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import { socket } from '../../../utils/socket';
import { getCurrentUsername } from '../../../utils/userUtils';
import svgConvertUrl from '../../../utils/svgConvertUrl';
import { NODE_COLORS } from '../constants/ideaWallConstants';

/**
 * 將原始節點資料轉成 vis-network 可用格式（含 SVG image）
 */
function toVisNode(node) {
    let colorIndex;
    if (node.colorindex) {
        colorIndex = node.colorindex;
    } else {
        const hash = (node.owner || '').split('').reduce((acc, char) => {
            return char.charCodeAt(0) + ((acc << 5) - acc);
        }, 0);
        colorIndex = Math.abs(hash) % NODE_COLORS.length + 1;
    }
    const nodeColor = NODE_COLORS[(colorIndex - 1) % NODE_COLORS.length];
    return {
        ...node,
        image: svgConvertUrl(node.title, node.owner, node.createdAt, nodeColor, node.content),
        shape: 'image',
    };
}

/**
 * 節點 Mutation Hook — Optimistic Update + Self-Echo 過濾
 *
 * 職責：
 * 1. 建立/更新/刪除節點時，先樂觀更新 React Query cache
 * 2. 透過 socket 發送事件給 Server
 * 3. Server 確認後替換 tempId → realId
 * 4. Server 失敗時回滾 cache 並通知使用者
 */
export function useNodeMutations({ projectId }) {
    const queryClient = useQueryClient();
    // 追蹤 pending 的 tempId，防止使用者在確認前編輯/刪除
    const pendingTempIds = useRef(new Set());
    // tempId → realId 映射表
    const tempIdMap = useRef(new Map());
    // 暫存 update/delete 的舊資料供 error handler 回滾
    const pendingUpdateDataRef = useRef(null);
    const pendingDeleteDataRef = useRef(null);

    const nodesKey = ['projectNodes', projectId];
    const relationsKey = ['projectNodeRelations', projectId];

    /**
     * 檢查節點是否處於 pending 狀態（tempId 尚未被替換）
     */
    const isNodePending = useCallback((nodeId) => {
        return pendingTempIds.current.has(nodeId);
    }, []);

    /**
     * 建立節點 — Optimistic Update
     */
    const createNode = useCallback(({ title, content, ideaWallId, owner, from_id, colorindex }) => {
        const tempId = `temp-${uuidv4()}`;
        const now = new Date().toISOString();
        const userId = localStorage.getItem('id');

        const optimisticNode = {
            id: tempId,
            title,
            content,
            owner: owner || getCurrentUsername(),
            colorindex: colorindex || parseInt(userId) || null,
            ideaWallId,
            createdAt: now,
            updatedAt: now,
            _isPending: true,
        };

        // 1. 樂觀更新 React Query cache
        queryClient.setQueryData(nodesKey, (old = []) => [...old, optimisticNode]);

        // 如果有 from_id，也樂觀新增 relation
        if (from_id) {
            queryClient.setQueryData(relationsKey, (old = []) => [
                ...old,
                { from: from_id, to: tempId, from_id, to_id: tempId },
            ]);
        }

        pendingTempIds.current.add(tempId);

        // 2. 送出 socket 事件
        socket.emit('nodeCreate', {
            tempId,
            title,
            content,
            ideaWallId,
            owner: optimisticNode.owner,
            from_id,
            projectId,
            colorindex: optimisticNode.colorindex,
            user: {
                username: getCurrentUsername(),
                id: parseInt(userId) || null,
            },
        });

        return tempId;
    }, [projectId, queryClient, nodesKey, relationsKey]);

    /**
     * 收到 Server 建立確認 — 替換 tempId → realId
     */
    const confirmCreate = useCallback(({ tempId, realId, node }) => {
        if (!tempId) return;

        pendingTempIds.current.delete(tempId);
        tempIdMap.current.set(tempId, realId);

        // 替換 cache 中的節點
        queryClient.setQueryData(nodesKey, (old = []) =>
            old.map((n) => (n.id === tempId ? { ...node, _isPending: false } : n))
        );

        // 替換 relation 中的 tempId
        queryClient.setQueryData(relationsKey, (old = []) =>
            old.map((r) => {
                let updated = { ...r };
                if (r.to === tempId || r.to_id === tempId) {
                    updated = { ...updated, to: realId, to_id: realId };
                }
                if (r.from === tempId || r.from_id === tempId) {
                    updated = { ...updated, from: realId, from_id: realId };
                }
                return updated;
            })
        );
    }, [queryClient, nodesKey, relationsKey]);

    /**
     * 建立失敗 — 回滾 cache
     */
    const rollbackCreate = useCallback(({ tempId, errorMessage }) => {
        pendingTempIds.current.delete(tempId);

        // 移除樂觀新增的節點
        queryClient.setQueryData(nodesKey, (old = []) =>
            old.filter((n) => n.id !== tempId)
        );

        // 移除樂觀新增的 relation
        queryClient.setQueryData(relationsKey, (old = []) =>
            old.filter((r) => r.to !== tempId && r.to_id !== tempId)
        );

        toast.error(errorMessage || '節點建立失敗');
    }, [queryClient, nodesKey, relationsKey]);

    /**
     * 更新節點 — Optimistic Update
     */
    const updateNode = useCallback(({ id, title, content, owner }) => {
        if (pendingTempIds.current.has(id)) {
            toast.error('節點正在建立中，請稍後再編輯');
            return false;
        }

        // 保存舊資料供回滾用
        const oldNodes = queryClient.getQueryData(nodesKey);

        // 樂觀更新 cache
        queryClient.setQueryData(nodesKey, (old = []) =>
            old.map((n) => (n.id === id ? { ...n, title, content, updatedAt: new Date().toISOString() } : n))
        );

        // 送出 socket 事件
        socket.emit('nodeUpdate', {
            id,
            title,
            content,
            owner: owner || getCurrentUsername(),
            projectId,
            user: {
                username: getCurrentUsername(),
                id: parseInt(localStorage.getItem('id')) || null,
            },
        });

        // 存回滾資料到內部 ref，供 error handler 自動回滾
        pendingUpdateDataRef.current = { oldNodes };
        return { oldNodes };
    }, [projectId, queryClient, nodesKey]);

    /**
     * 更新失敗 — 回滾
     */
    const rollbackUpdate = useCallback(({ oldNodes, errorMessage } = {}) => {
        const data = oldNodes || pendingUpdateDataRef.current?.oldNodes;
        if (data) {
            queryClient.setQueryData(nodesKey, data);
        }
        pendingUpdateDataRef.current = null;
        toast.error(errorMessage || '節點更新失敗');
    }, [queryClient, nodesKey]);

    /**
     * 刪除節點 — Optimistic Update（保留完整資料供回滾）
     */
    const deleteNode = useCallback(({ id, title, owner }) => {
        if (pendingTempIds.current.has(id)) {
            toast.error('節點正在建立中，請稍後再刪除');
            return false;
        }

        // 保存完整快照供回滾
        const oldNodes = queryClient.getQueryData(nodesKey);
        const oldRelations = queryClient.getQueryData(relationsKey);

        // 樂觀移除節點
        queryClient.setQueryData(nodesKey, (old = []) =>
            old.filter((n) => n.id !== id)
        );

        // 樂觀移除相關的 relation
        queryClient.setQueryData(relationsKey, (old = []) =>
            old.filter((r) => r.from !== id && r.to !== id && r.from_id !== id && r.to_id !== id)
        );

        // 送出 socket 事件
        socket.emit('nodeDelete', {
            id,
            title,
            owner: owner || getCurrentUsername(),
            projectId,
            user: {
                username: getCurrentUsername(),
                id: parseInt(localStorage.getItem('id')) || null,
            },
        });

        // 存回滾資料到內部 ref，供 error handler 自動回滾
        pendingDeleteDataRef.current = { oldNodes, oldRelations };
        return { oldNodes, oldRelations, deletedNodeId: id };
    }, [projectId, queryClient, nodesKey, relationsKey]);

    /**
     * 刪除失敗 — 回滾本地 cache
     */
    const rollbackDelete = useCallback(({ oldNodes, oldRelations, errorMessage } = {}) => {
        const nodes = oldNodes || pendingDeleteDataRef.current?.oldNodes;
        const relations = oldRelations || pendingDeleteDataRef.current?.oldRelations;
        if (nodes) queryClient.setQueryData(nodesKey, nodes);
        if (relations) queryClient.setQueryData(relationsKey, relations);
        pendingDeleteDataRef.current = null;
        toast.error(errorMessage || '節點刪除失敗');
    }, [queryClient, nodesKey, relationsKey]);

    /**
     * 建立連線 — Optimistic Update
     */
    const createRelation = useCallback(({ from_id, to_id, ideaWallId }) => {
        // 樂觀新增 relation
        queryClient.setQueryData(relationsKey, (old = []) => {
            const exists = old.some(
                (r) => r.from_id === from_id && r.to_id === to_id
            );
            if (exists) return old;
            return [
                ...old,
                { from: from_id, to: to_id, from_id, to_id },
            ];
        });

        socket.emit('createNodeRelation', {
            from_id,
            to_id,
            projectId,
            ideaWallId,
            user: {
                username: getCurrentUsername(),
                id: parseInt(localStorage.getItem('id')) || null,
            },
        });
    }, [projectId, queryClient, relationsKey]);

    /**
     * 刪除連線 — Optimistic Update
     */
    const deleteRelation = useCallback(({ from_id, to_id }) => {
        // 保存舊資料供回滾
        const oldRelations = queryClient.getQueryData(relationsKey);

        // 樂觀移除
        queryClient.setQueryData(relationsKey, (old = []) =>
            old.filter(
                (r) => !(r.from_id === from_id && r.to_id === to_id)
            )
        );

        socket.emit('deleteNodeRelation', {
            from_id,
            to_id,
            projectId,
            user: {
                username: getCurrentUsername(),
                id: parseInt(localStorage.getItem('id')) || null,
            },
        });

        return { oldRelations };
    }, [projectId, queryClient, relationsKey]);

    /**
     * 處理來自其他用戶端的差量同步事件（由 useIdeaWallSocket 呼叫）
     */
    const applySyncEvent = useCallback((data) => {
        // Self-echo 過濾：自己發的操作已經被 optimistic update 處理了
        if (data._socketId === socket.id) return;

        const { action } = data;

        if (action === 'create' && data.node) {
            queryClient.setQueryData(nodesKey, (old = []) => {
                // 防止重複新增（萬一有 race condition）
                if (old.some((n) => n.id === data.node.id)) return old;
                return [...old, data.node];
            });
            if (data.relation) {
                queryClient.setQueryData(relationsKey, (old = []) => [
                    ...old,
                    {
                        from: data.relation.from_id,
                        to: data.relation.to_id,
                        from_id: data.relation.from_id,
                        to_id: data.relation.to_id,
                    },
                ]);
            }
        } else if (action === 'update' && data.node) {
            queryClient.setQueryData(nodesKey, (old = []) =>
                old.map((n) => (n.id === data.node.id ? { ...n, ...data.node } : n))
            );
        } else if (action === 'delete' && data.nodeId) {
            queryClient.setQueryData(nodesKey, (old = []) =>
                old.filter((n) => n.id !== data.nodeId)
            );
            queryClient.setQueryData(relationsKey, (old = []) =>
                old.filter((r) =>
                    r.from !== data.nodeId && r.to !== data.nodeId &&
                    r.from_id !== data.nodeId && r.to_id !== data.nodeId
                )
            );
        } else if (action === 'createRelation' && data.relation) {
            queryClient.setQueryData(relationsKey, (old = []) => {
                const exists = old.some(
                    (r) => r.from_id === data.relation.from_id && r.to_id === data.relation.to_id
                );
                if (exists) return old;
                return [
                    ...old,
                    {
                        from: data.relation.from_id,
                        to: data.relation.to_id,
                        from_id: data.relation.from_id,
                        to_id: data.relation.to_id,
                    },
                ];
            });
        } else if (action === 'deleteRelation' && data.relation) {
            queryClient.setQueryData(relationsKey, (old = []) =>
                old.filter(
                    (r) => !(r.from_id === data.relation.from_id && r.to_id === data.relation.to_id)
                )
            );
        }
    }, [queryClient, nodesKey, relationsKey]);

    return {
        createNode,
        confirmCreate,
        rollbackCreate,
        updateNode,
        rollbackUpdate,
        deleteNode,
        rollbackDelete,
        createRelation,
        deleteRelation,
        applySyncEvent,
        isNodePending,
        toVisNode,
    };
}
