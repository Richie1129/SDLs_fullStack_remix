const { SocketHandlerFactory } = require('../socketHandlers');
const Node = require('../../models/node');
const Node_relation = require('../../models/node_relation');
const Project = require('../../models/project');
const { logNodeChange, logNodeFieldChanges } = require('../../utils/nodeChangeLogger');

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
    }

    /**
     * 處理節點創建
     */
    static async handleNodeCreate(data) {
        const { title, content, ideaWallId, owner, from_id, projectId, colorindex } = data;
        const createdBy = this.getCurrentUsername(data) || owner || "未知";

        try {
            const createdNode = await Node.create({
                title: title,
                content: content,
                ideaWallId: ideaWallId,
                owner: owner,
                colorindex: colorindex
            }, { req: data._reqContext });

            // 記錄節點創建
            try {
                await logNodeChange({
                    nodeId: createdNode.id,
                    changeType: 'create',
                    changedBy: createdBy,
                    projectId: projectId,
                    description: `創建新節點「${createdNode.title}」`
                });
            } catch (logError) {
                console.warn('記錄節點創建失敗:', logError.message);
            }

            // 如果有來源節點，建立關聯
            if (from_id) {
                await Node_relation.create({
                    from_id: from_id,
                    to_id: createdNode.id,
                    ideaWallId: ideaWallId
                }, { req: data._reqContext });
            }

            // 更新專案時間戳
            await Project.update({ id: projectId }, {
                where: { id: projectId },
                individualHooks: true,
                req: data._reqContext
            });

            // 廣播新節點到所有相關客戶端
            this.broadcastToProject(projectId, "nodeUpdated", createdNode);
            
            console.log(`✅ 節點創建成功: ${createdNode.id} - ${createdNode.title}`);

        } catch (error) {
            console.error("創建節點時發生錯誤:", error);
            this.emitError('nodeCreate', { 
                message: '創建節點時發生錯誤',
                code: 'NODE_CREATE_ERROR'
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
            // 取得原始資料以比較變更
            const originalNode = await Node.findByPk(id);

            const updatedNode = await Node.update(
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
            await Project.update({ id: projectId }, {
                where: { id: projectId },
                individualHooks: true,
                req: data._reqContext
            });

            // 廣播節點更新
            this.broadcastToProject(projectId, "nodeUpdated", updatedNode);
            
            console.log(`✅ 節點更新成功: ${id} - ${title}`);

        } catch (error) {
            console.error("更新節點時發生錯誤:", error);
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
            // 記錄節點刪除到變更日誌
            try {
                await logNodeChange({
                    nodeId: id,
                    changeType: 'delete',
                    changedBy: deletedBy,
                    projectId: projectId,
                    description: `刪除了節點「${title || '未知標題'}」`
                });
            } catch (logError) {
                console.warn('節點刪除日誌記錄失敗:', logError.message);
            }

            const deleteResult = await Node.destroy({
                where: { id: id },
                individualHooks: true,
                req: data._reqContext
            });

            // 更新專案時間戳
            await Project.update({ id: projectId }, {
                where: { id: projectId }
            });

            // 廣播節點刪除
            // 注意：這裡使用 io.sockets.emit 是因為原始代碼如此
            // 可能需要根據實際需求調整為 broadcastToProject
            this.io.sockets.emit("nodeUpdated", deleteResult);
            
            console.log(`✅ 節點刪除成功: ${id} - ${title}`);

        } catch (error) {
            console.error("刪除節點時發生錯誤:", error);
            this.emitError('nodeDelete', { 
                message: '刪除節點時發生錯誤',
                code: 'NODE_DELETE_ERROR'
            });
        }
    }
}

module.exports = NodeHandler;