import { useMemo } from 'react';

/**
 * Hook to transform Kanban data based on view configuration.
 * Handles filtering, sorting, and grouping.
 * 
 * @param {Array} kanbanData - The raw column data from the backend.
 * @param {Object} viewConfig - Configuration object { filter, groupBy, sortBy }.
 * @returns {Array} - The transformed data ready for rendering.
 */
export const useKanbanView = (kanbanData, viewConfig) => {
  const renderedData = useMemo(() => {
    if (!kanbanData) return [];

    // 淺拷貝（F6）：只複製會被改寫的欄位層與 task 陣列，task 物件本身共用引用。
    // 原本 JSON.parse(JSON.stringify()) 每敲一個搜尋字元就深拷貝整張看板，
    // 而且每次都產生全新的 task 物件，讓 Carditem 的 React.memo 全部失效。
    // 下方所有轉換都只建立新陣列與新欄位物件，不會就地修改 task。
    let processedData = kanbanData.map(column => ({
      ...column,
      task: Array.isArray(column.task) ? [...column.task] : [],
    }));

    // 1. Filtering
    if (viewConfig.filter) {
      const { keyword, assignee, label } = viewConfig.filter;
      
      processedData = processedData.map(column => ({
        ...column,
        task: column.task.filter(task => {
          if (!task) return false;
          
          // Keyword search (Title)
          if (keyword && !task.title.toLowerCase().includes(keyword.toLowerCase())) {
            return false;
          }

          // Assignee filter (支援單選和多選，支援 AND/OR 邏輯)
          if (assignee) {
            // 如果 assignee 是陣列且有值
            if (Array.isArray(assignee) && assignee.length > 0) {
              const assigneeLogic = viewConfig.filter.assigneeLogic || 'OR';
              const taskAssigneeUsernames = task.assignees?.map(a => a.username) || [];
              
              if (assigneeLogic === 'AND') {
                // AND 邏輯：任務必須包含所有選中的成員
                const hasAllAssignees = assignee.every(username => 
                  taskAssigneeUsernames.includes(username)
                );
                if (!hasAllAssignees) {
                  return false;
                }
              } else {
                // OR 邏輯（預設）：任務包含任一選中的成員
                const hasAnyAssignee = assignee.some(username => 
                  taskAssigneeUsernames.includes(username)
                );
                if (!hasAnyAssignee) {
                  return false;
                }
              }
            }
            // 向下兼容：如果 assignee 是字串（舊版單選）
            else if (typeof assignee === 'string' && assignee) {
              if (!task.assignees || !task.assignees.some(a => a.username === assignee)) {
                return false;
              }
            }
          }

          // Label filter
          if (label && (!task.labels || !task.labels.some(l => l.name === label))) {
            return false;
          }

          return true;
        })
      }));
    }

    // 2. Grouping
    if (viewConfig.groupBy === 'assignee') {
      const assigneeMap = new Map();
      const unassignedTasks = [];
      
      // Flatten all tasks from all status columns
      processedData.forEach(column => {
        if (!column.task) return;
        
        column.task.forEach(task => {
          // Handle unassigned tasks
          if (!task.assignees || task.assignees.length === 0) {
            // Avoid duplicates if task is in multiple columns (shouldn't happen in status view but good to be safe)
            if (!unassignedTasks.find(t => t.id === task.id)) {
              unassignedTasks.push(task);
            }
            return;
          }

          // Distribute task to assignee columns
          task.assignees.forEach(assignee => {
            if (!assigneeMap.has(assignee.id)) {
              assigneeMap.set(assignee.id, {
                id: `user-${assignee.id}`, // Virtual Column ID
                title: assignee.username || `User ${assignee.id}`,
                task: [],
                isVirtual: true
              });
            }
            // Avoid duplicates in the same column
            const userColumn = assigneeMap.get(assignee.id);
            if (!userColumn.task.find(t => t.id === task.id)) {
              userColumn.task.push(task);
            }
          });
        });
      });

      // Convert Map to Array
      processedData = [
        { id: 'unassigned', title: 'Unassigned', task: unassignedTasks, isVirtual: true },
        ...Array.from(assigneeMap.values())
      ];
    }

    // 3. Phase Filtering (Removed)
    // User requested to revert to original view without phase filtering.
    // All columns are shown.

    // 4. Sorting (Placeholder for Phase 3)
    // if (viewConfig.sortBy === 'dueDate') { ... }

    return processedData;
  }, [kanbanData, viewConfig]);

  return renderedData;
};
