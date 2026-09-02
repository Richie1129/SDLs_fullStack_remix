const { Op } = require('sequelize');
const Kanban = require('../models/kanban');
const Column = require('../models/column');
const Task = require('../models/task');

// 對外輸出的任務欄位（順序即輸出 JSON 的 key 順序，不可改動）
const TASK_OUTPUT_ATTRIBUTES = ['id', 'title', 'content', 'labels', 'owner', 'assignees', 'images', 'files', 'dueDate', 'createdAt', 'updatedAt'];

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

            // 只查有任務的欄位；沒任務的欄位直接給空陣列（與原本逐欄查詢時的 continue 行為相同）
            const columnIdsWithTasks = [];
            for (const col of orderedColumns) {
                const taskIds = Array.isArray(col.task) ? col.task : [];
                if (taskIds.length === 0) {
                    col.task = [];
                } else {
                    columnIdsWithTasks.push(col.id);
                }
            }

            // B5：一次查出所有欄位的任務，再在記憶體依 columnId 分組（取代迴圈內逐欄 findAll）
            // columnId 放在最後一個 attribute，分組後再移除，確保輸出的 key 順序與原本完全一致
            const tasksByColumn = new Map();
            if (columnIdsWithTasks.length > 0) {
                const tasks = await Task.findAll({
                    attributes: [...TASK_OUTPUT_ATTRIBUTES, 'columnId'],
                    where: { columnId: { [Op.in]: columnIdsWithTasks } }
                });

                for (const t of tasks) {
                    const json = t.toJSON ? t.toJSON() : t;
                    const columnId = json.columnId;
                    delete json.columnId;
                    let group = tasksByColumn.get(columnId);
                    if (!group) {
                        group = new Map();
                        tasksByColumn.set(columnId, group);
                    }
                    group.set(json.id, json);
                }
            }

            // 為每個欄位附加有序的任務：只取「id 在 col.task 內且 columnId 確實為此欄位」的任務，順序依 col.task
            for (const col of orderedColumns) {
                const taskIds = Array.isArray(col.task) ? col.task : [];
                if (taskIds.length === 0) continue;

                const taskMap = tasksByColumn.get(col.id) || new Map();
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
