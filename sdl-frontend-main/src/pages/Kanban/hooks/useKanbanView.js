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

    // Deep clone to avoid mutating original data during transformation
    let processedData = JSON.parse(JSON.stringify(kanbanData));

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

          // Assignee filter
          if (assignee && (!task.assignees || !task.assignees.some(a => a.username === assignee))) {
            return false;
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
