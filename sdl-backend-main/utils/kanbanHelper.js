const Kanban = require('../models/kanban');
const Column = require('../models/column');
const Task = require('../models/task');

/**
 * Kanban 資料建構輔助函數
 * 從 index.js 中提取並優化
 */
class KanbanHelper {
    /**
     * 建構專案的最新 Kanban 資料（有序的欄位和任務）
     * @param {number} projectId - 專案ID
     * @returns {Promise<Array>} 有序的欄位陣列
     */
    static async buildKanbanData(projectId) {
        try {
            const kanbanRows = await Kanban.findAll({
                attributes: ['id', 'column'],
                where: { projectId }
            });

            if (!kanbanRows || kanbanRows.length === 0) {
                return [];
            }

            const { id: kanbanId, column: columnOrder } = kanbanRows[0];

            const columns = await Column.findAll({
                attributes: ['id', 'name', 'task'],
                where: { kanbanId }
            });

            // 建立快速查找映射
            const colMap = new Map(columns.map(c => [c.id, c.toJSON ? c.toJSON() : c]));
            const orderedColumns = columnOrder
                .map(colId => colMap.get(colId))
                .filter(Boolean);

            // 為每個欄位附加有序的任務
            for (let i = 0; i < orderedColumns.length; i++) {
                const col = orderedColumns[i];
                const taskIds = Array.isArray(col.task) ? col.task : [];
                
                if (taskIds.length === 0) {
                    col.task = [];
                    continue;
                }

                const tasks = await Task.findAll({
                    attributes: ['id','title','content','labels','owner','assignees','images','files','dueDate','createdAt','updatedAt'],
                    where: { columnId: col.id }
                });

                const taskMap = new Map(tasks.map(t => [t.id, t.toJSON ? t.toJSON() : t]));
                col.task = taskIds.map(id => taskMap.get(id)).filter(Boolean);
            }

            return orderedColumns;

        } catch (error) {
            console.error('建構 Kanban 資料時發生錯誤:', error);
            return [];
        }
    }

    /**
     * 驗證欄位是否存在
     * @param {number} columnId - 欄位ID
     * @returns {Promise<boolean>}
     */
    static async columnExists(columnId) {
        try {
            const column = await Column.findByPk(columnId);
            return !!column;
        } catch (error) {
            console.error('檢查欄位存在性時發生錯誤:', error);
            return false;
        }
    }

    /**
     * 獲取任務所屬的欄位資訊
     * @param {number} taskId - 任務ID
     * @returns {Promise<Object|null>}
     */
    static async getTaskColumn(taskId) {
        try {
            const task = await Task.findByPk(taskId, {
                include: [{
                    model: Column,
                    attributes: ['id', 'name']
                }]
            });

            return task?.Column || null;
        } catch (error) {
            console.error('獲取任務欄位資訊時發生錯誤:', error);
            return null;
        }
    }
}

// 為了向後相容，同時匯出函數形式
async function buildKanbanData(projectId) {
    return KanbanHelper.buildKanbanData(projectId);
}

module.exports = {
    KanbanHelper,
    buildKanbanData
};