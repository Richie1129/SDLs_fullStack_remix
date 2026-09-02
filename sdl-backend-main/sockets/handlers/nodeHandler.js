const { SocketHandlerFactory } = require('../socketHandlers');
const { writeSocketErrorReport } = require('../../utils/errorHandler');
const Node = require('../../models/node');
const Node_relation = require('../../models/node_relation');
const Project = require('../../models/project');
const { logNodeChange, logNodeFieldChanges } = require('../../utils/nodeChangeLogger');

// Phase 3: 引入 Orchestrator
const { orchestrate } = require('../../services/orchestrator');

/**
 * 節點相關 Socket 事件處理器
 */
class NodeHandler {
    /**
     * 註冊所有節點相關的 Socket 事件
     */
    static registerEvents(io, socket) {
        // 創建節點
        SocketHandlerFactory.registerProtectedEvent(
            socket,
            'nodeCreate',
            this.handleNodeCreate,
            'write'
        );

        // 更新節點
        SocketHandlerFactory.registerProtectedEvent(
            socket,
            'nodeUpdate',
            this.handleNodeUpdate,
            'write'
        );

        // 刪除節點
        SocketHandlerFactory.registerProtectedEvent(
            socket,
            'nodeDelete',
            this.handleNodeDelete,
            'write'
        );

        // 建立節點連線
        SocketHandlerFactory.registerProtectedEvent(
            socket,
            'createNodeRelation',
            this.handleCreateNodeRelation,
            'write'
        );

        // 刪除節點連線
        SocketHandlerFactory.registerProtectedEvent(
            socket,
            'deleteNodeRelation',
            this.handleDeleteNodeRelation,
            'write'
        );
    }

    /**
     * 處理節點創建
     */
    static async handleNodeCreate(data) {
        const { title, content, ideaWallId, owner, from_id, projectId, colorindex } = data;
        const createdBy = this.getCurrentUsername(data) || owner || "未知";

        try {
            // 簡化：每個專案只有一個想法牆，直接根據 projectId 查找
            let actualIdeaWallId = ideaWallId;
            if (!actualIdeaWallId && projectId) {
                const IdeaWall = require('../../models/idea_wall');
                const ideaWall = await IdeaWall.findOne({
                    where: { projectId: projectId },
                    order: [['id', 'ASC']] // 確保使用第一個想法牆
                });
                
                if (ideaWall) {
                    actualIdeaWallId = ideaWall.id;
                    console.log(`🔍 找到專案想法牆: projectId=${projectId} -> ideaWallId=${actualIdeaWallId}`);
                } else {
                    throw new Error(`專案 ${projectId} 沒有對應的想法牆`);
                }
            }

            const createdNode = await Node.create({
                title: title,
                content: content,
                ideaWallId: actualIdeaWallId,
                owner: owner,
                colorindex: colorindex
            }, { req: data._reqContext });

            // 記錄節點創建，根據是否有來源節點區分描述
            try {
                const description = from_id ? 
                    `延伸了節點「${createdNode.title}」` : 
                    `創建了新節點「${createdNode.title}」`;
                
                await logNodeChange({
                    nodeId: createdNode.id,
                    changeType: 'create',
                    changedBy: createdBy,
                    projectId: projectId,
                    description: description
                });
            } catch (logError) {
                console.warn('記錄節點創建失敗:', logError.message);
            }

            // 如果有來源節點，建立關聯
            if (from_id) {
                await Node_relation.create({
                    from_id: from_id,
                    to_id: createdNode.id,
                    ideaWallId: actualIdeaWallId
                }, { req: data._reqContext });
            }

            // 更新專案時間戳
            await Project.update({ updatedAt: new Date() }, { where: { id: projectId } });

            // 廣播差量事件給所有客戶端（帶 socketId 供 self-echo 過濾）
            const nodeJson = createdNode.toJSON();
            this.broadcastToProject(projectId, "nodeSync", {
                action: 'create',
                node: nodeJson,
                relation: from_id ? { from_id, to_id: createdNode.id } : null,
                _socketId: this.socket.id
            });

            // 回傳 tempId mapping 給建立者（供 optimistic update 替換用）
            this.socket.emit('nodeCreateConfirm', {
                tempId: data.tempId || null,
                realId: createdNode.id,
                node: nodeJson
            });
            
            console.log(`✅ 節點創建成功: ${createdNode.id} - ${createdNode.title}`);

            // ================================================================
            // Phase 3 Hook: 非同步觸發 Orchestrator 分析
            // Linus 原則：「零破壞性 - 失敗不影響正常流程」
            // ================================================================
            setImmediate(async () => {
                try {
                    if (actualIdeaWallId && projectId) {
                        console.log(`🔔 [Hook] New node created via Socket, triggering Orchestrator...`);
                        // 從 socket.io instance 取得 io（透過 this.io）
                        const io = this.io;
                        await orchestrate(actualIdeaWallId, projectId, { io });
                    }
                } catch (orchError) {
                    // 靜默失敗，不影響使用者體驗
                    console.error('Orchestrator hook failed (non-blocking):', orchError.message);
                }
            });

        } catch (error) {
            console.error("創建節點時發生錯誤:", error);
            writeSocketErrorReport(error, 'nodeCreate', this.socket.user);
            this.emitError('nodeCreate', {
                message: '創建節點時發生錯誤',
                code: 'NODE_CREATE_ERROR',
                tempId: data.tempId || null,
            });
        }
    }

    /**
     * 處理節點更新
     */
    static async handleNodeUpdate(data) {
        const { title, content, id, projectId, owner } = data;
        const updatedBy = this.getCurrentUsername(data) || owner || "未知";

        try {
            // H14: 由 DB 反查節點歸屬，確認它真的屬於聲稱的 projectId（同時取得原始資料以比較變更）
            const { status, node: originalNode } = await this.loadNodeInProject(id, projectId);

            if (status === 'NOT_FOUND') {
                this.emitError('nodeUpdate', {
                    message: '節點不存在，可能已被刪除',
                    code: 'NODE_NOT_FOUND'
                });
                return;
            }

            if (status !== 'OK') {
                console.warn(`拒絕更新節點 ${id}：不屬於專案 ${projectId}（user: ${updatedBy}）`);
                this.emitError('nodeUpdate', {
                    message: '節點不屬於此專案',
                    code: 'RESOURCE_MISMATCH'
                });
                return;
            }

            // R2-H7: Node.update 回傳 [affectedCount]，改用 reload 取得實際資料
            await Node.update(
                {
                    title: title,
                    content: content
                },
                {
                    where: { id: id },
                    individualHooks: true,
                    req: data._reqContext
                }
            );
            const updatedNode = await Node.findByPk(id);

            // 記錄欄位變更
            if (originalNode) {
                try {
                    await logNodeFieldChanges(
                        originalNode.dataValues, 
                        { title, content }, 
                        id, 
                        updatedBy, 
                        projectId
                    );
                } catch (logError) {
                    console.warn('記錄節點變更失敗:', logError.message);
                }
            }

            // 更新專案時間戳
            await Project.update({ updatedAt: new Date() }, { where: { id: projectId } });

            // 廣播差量更新事件
            this.broadcastToProject(projectId, "nodeSync", {
                action: 'update',
                node: updatedNode.toJSON(),
                _socketId: this.socket.id
            });

            console.log(`✅ 節點更新成功: ${id} - ${title}`);

        } catch (error) {
            console.error("更新節點時發生錯誤:", error);
            writeSocketErrorReport(error, 'nodeUpdate', this.socket.user);
            this.emitError('nodeUpdate', {
                message: '更新節點時發生錯誤',
                code: 'NODE_UPDATE_ERROR'
            });
        }
    }

    /**
     * 處理節點刪除
     */
    static async handleNodeDelete(data) {
        const { id, projectId, owner, title } = data;
        const deletedBy = this.getCurrentUsername(data) || owner || "未知";
        
        try {
            // H14: 由 DB 反查節點歸屬，確認它真的屬於聲稱的 projectId；不採信 client 傳來的資料
            const { status, node } = await this.loadNodeInProject(id, projectId);

            if (status === 'MISMATCH') {
                console.warn(`拒絕刪除節點 ${id}：不屬於專案 ${projectId}（user: ${deletedBy}）`);
                this.emitError('nodeDelete', {
                    message: '節點不屬於此專案',
                    code: 'RESOURCE_MISMATCH',
                    details: { nodeId: id, projectId }
                });
                return;
            }

            if (status === 'NOT_FOUND') {
                // 節點已不存在（例如兩人同時刪除）：沒有東西可刪、也沒有歸屬可驗，維持冪等成功讓前端狀態收斂
                console.warn(`節點 ${id} 不存在，視為已刪除`);
                this.broadcastToProject(projectId, "nodeSync", {
                    action: 'delete',
                    nodeId: id,
                    _socketId: this.socket.id
                });
                this.emitSuccess('nodeDelete', {
                    message: '節點已不存在',
                    code: 'NODE_DELETE_SUCCESS',
                    nodeId: id,
                    nodeTitle: title || '未知標題'
                });
                return;
            }

            const nodeTitle = node.title || title || '未知標題';

            // 先記錄節點刪除日誌（在刪除前保存完整資訊；標題取自 DB）
            console.log('🔍 記錄節點刪除日誌:', { id, projectId, title: nodeTitle, deletedBy });
            const changeLogResult = await logNodeChange({
                nodeId: id, // 先使用真實的節點ID記錄
                changeType: 'delete',
                changedBy: deletedBy,
                projectId: projectId,
                description: `刪除了節點「${nodeTitle}」`
            });
            console.log('✅ 節點刪除記錄已保存:', changeLogResult.id);

            // 先清理節點關聯（避免外鍵約束錯誤）
            console.log('🔍 清理節點關聯關係...');
            await Node_relation.destroy({
                where: {
                    [require('sequelize').Op.or]: [
                        { from_id: id },
                        { to_id: id }
                    ]
                }
            });
            console.log('✅ 節點關聯已清理');

            // 執行節點刪除（資料庫會自動將 changeLog 的 nodeId 設為 NULL）
            console.log('🔍 開始刪除節點...');
            const deleteResult = await Node.destroy({
                where: { id: id },
                individualHooks: true,
                req: data._reqContext
            });
            console.log('✅ 節點刪除結果:', deleteResult);

            if (deleteResult === 0) {
                console.warn('警告：節點可能已不存在，但刪除記錄已保存');
            }

            // 更新專案時間戳
            await Project.update({ updatedAt: new Date() }, { where: { id: projectId } });

            // 廣播差量刪除事件
            this.broadcastToProject(projectId, "nodeSync", {
                action: 'delete',
                nodeId: id,
                _socketId: this.socket.id
            });

            // 廣播活動流更新 - 觸發活動記錄顯示
            this.broadcastToProject(projectId, 'activityUpdate', {
                type: 'delete',
                source: 'node',
                nodeId: id,
                nodeTitle: nodeTitle,
                user: deletedBy,
                timestamp: new Date().toISOString(),
                projectId: projectId
            });
            
            console.log(`✅ 節點刪除成功: ${id} - ${nodeTitle}`);
            
            // 發送成功事件給前端
            this.emitSuccess('nodeDelete', {
                message: '節點刪除成功',
                code: 'NODE_DELETE_SUCCESS',
                nodeId: id,
                nodeTitle: nodeTitle
            });

        } catch (error) {
            console.error("❌ 刪除節點時發生錯誤:");
            console.error("錯誤類型:", error.name);
            console.error("錯誤訊息:", error.message);
            console.error("錯誤堆疊:", error.stack);
            console.error("節點資料:", { id, projectId, title, owner });
            writeSocketErrorReport(error, 'nodeDelete', this.socket.user);

            this.emitError('nodeDelete', {
                message: `刪除節點時發生錯誤: ${error.message}`,
                code: 'NODE_DELETE_ERROR',
                details: {
                    errorType: error.name,
                    nodeId: id,
                    projectId: projectId
                }
            });
        }
    }

    /**
     * 處理建立節點連線（手動連結兩個已存在的節點）
     */
    static async handleCreateNodeRelation(data) {
        const { from_id, to_id, projectId, ideaWallId } = data;
        const createdBy = this.getCurrentUsername(data) || "未知";

        try {
            console.log(`📌 建立節點連線: ${from_id} → ${to_id}`);

            // H14: 兩個節點都必須存在且屬於聲稱的 projectId，否則可把他人專案的節點連進此想法牆
            const fromCheck = await this.loadNodeInProject(from_id, projectId);
            const toCheck = await this.loadNodeInProject(to_id, projectId);
            if (fromCheck.status === 'NOT_FOUND' || toCheck.status === 'NOT_FOUND') {
                throw new Error('來源節點或目標節點不存在');
            }
            if (fromCheck.status !== 'OK' || toCheck.status !== 'OK') {
                throw new Error('來源節點或目標節點不屬於此專案');
            }
            const fromNode = fromCheck.node;
            const toNode = toCheck.node;

            // 權限檢查：只有來源節點的擁有者可以建立連線
            if (fromNode.owner !== createdBy) {
                throw new Error('您沒有權限從此節點建立連線');
            }

            // 簡化：如果沒有提供 ideaWallId，從 projectId 查找
            let actualIdeaWallId = ideaWallId;
            if (!actualIdeaWallId && projectId) {
                const IdeaWall = require('../../models/idea_wall');
                const ideaWall = await IdeaWall.findOne({
                    where: { projectId: projectId },
                    order: [['id', 'ASC']]
                });
                
                if (ideaWall) {
                    actualIdeaWallId = ideaWall.id;
                }
            }

            // 檢查連線是否已存在
            const existingRelation = await Node_relation.findOne({
                where: { from_id, to_id }
            });

            if (existingRelation) {
                throw new Error('這兩個節點之間已存在連線');
            }

            // 建立連線
            await Node_relation.create({
                from_id: from_id,
                to_id: to_id,
                ideaWallId: actualIdeaWallId
            }, { req: data._reqContext });

            // 記錄變更
            try {
                await logNodeChange({
                    nodeId: from_id,
                    changeType: 'update',
                    changedBy: createdBy,
                    projectId: projectId,
                    description: `建立了與節點「${toNode.title}」的連線`
                });
            } catch (logError) {
                console.warn('記錄連線建立失敗:', logError.message);
            }

            // 更新專案時間戳
            if (projectId) {
                await Project.update({ updatedAt: new Date() }, { where: { id: projectId } });
            }

            // 廣播差量連線建立事件
            this.broadcastToProject(projectId, "nodeSync", {
                action: 'createRelation',
                relation: { from_id, to_id },
                _socketId: this.socket.id
            });

            console.log(`✅ 節點連線建立成功: ${from_id} → ${to_id}`);

            this.emitSuccess('createNodeRelation', {
                message: '連線建立成功',
                code: 'NODE_RELATION_CREATE_SUCCESS',
                from_id,
                to_id
            });

        } catch (error) {
            console.error("❌ 建立節點連線時發生錯誤:", error.message);
            writeSocketErrorReport(error, 'createNodeRelation', this.socket.user);

            this.emitError('createNodeRelation', {
                message: `建立連線時發生錯誤: ${error.message}`,
                code: 'NODE_RELATION_CREATE_ERROR',
                details: {
                    from_id,
                    to_id,
                    projectId
                }
            });
        }
    }

    /**
     * 處理刪除節點連線
     */
    static async handleDeleteNodeRelation(data) {
        const { from_id, to_id, projectId } = data;
        const deletedBy = this.getCurrentUsername(data) || "未知";

        try {
            console.log(`🗑️ 刪除節點連線: ${from_id} → ${to_id}`);

            // H14: 來源與目標節點都必須屬於聲稱的 projectId
            const fromCheck = await this.loadNodeInProject(from_id, projectId);
            if (fromCheck.status === 'NOT_FOUND') {
                throw new Error('來源節點不存在');
            }
            if (fromCheck.status !== 'OK') {
                throw new Error('來源節點不屬於此專案');
            }
            const toCheck = await this.loadNodeInProject(to_id, projectId);
            if (toCheck.status !== 'OK') {
                throw new Error(toCheck.status === 'NOT_FOUND' ? '目標節點不存在' : '目標節點不屬於此專案');
            }
            const fromNode = fromCheck.node;

            // 權限檢查：只有來源節點的擁有者可以刪除連線
            if (fromNode.owner !== deletedBy) {
                throw new Error('您沒有權限刪除此連線');
            }

            // 查找並刪除連線
            const deleted = await Node_relation.destroy({
                where: { from_id, to_id }
            });

            if (deleted === 0) {
                throw new Error('連線不存在或已被刪除');
            }

            // 記錄變更
            try {
                const toNode = await Node.findByPk(to_id);
                await logNodeChange({
                    nodeId: from_id,
                    changeType: 'update',
                    changedBy: deletedBy,
                    projectId: projectId,
                    description: `移除了與節點「${toNode?.title || to_id}」的連線`
                });
            } catch (logError) {
                console.warn('記錄連線刪除失敗:', logError.message);
            }

            // 更新專案時間戳
            if (projectId) {
                await Project.update({ updatedAt: new Date() }, { where: { id: projectId } });
            }

            // 廣播差量連線刪除事件
            this.broadcastToProject(projectId, "nodeSync", {
                action: 'deleteRelation',
                relation: { from_id, to_id },
                _socketId: this.socket.id
            });

            console.log(`✅ 節點連線刪除成功: ${from_id} → ${to_id}`);

            this.emitSuccess('deleteNodeRelation', {
                message: '連線刪除成功',
                code: 'NODE_RELATION_DELETE_SUCCESS',
                from_id,
                to_id
            });

        } catch (error) {
            console.error("❌ 刪除節點連線時發生錯誤:", error.message);
            writeSocketErrorReport(error, 'deleteNodeRelation', this.socket.user);

            this.emitError('deleteNodeRelation', {
                message: `刪除連線時發生錯誤: ${error.message}`,
                code: 'NODE_RELATION_DELETE_ERROR',
                details: {
                    from_id,
                    to_id,
                    projectId
                }
            });
        }
    }
}

module.exports = NodeHandler;