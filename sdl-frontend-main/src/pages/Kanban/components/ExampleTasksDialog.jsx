import React, { useState } from 'react';
import { FiX } from 'react-icons/fi';

/**
 * 載入範例任務的確認對話框，支援個別任務勾選。
 *
 * @param {Array} pendingExampleTasks - [{columnId, columnName, tasks: [{title, content}]}]
 * @param {Function} onConfirm - (filteredTasks) => Promise<void>
 * @param {Function} onSkip - 跳過任務選擇，但仍建立欄位（「先自己開始」按鈕）
 * @param {Function} onClose - 完全取消，不建立欄位也不新增任務（右上角 X 按鈕）
 */
export default function ExampleTasksDialog({ pendingExampleTasks, onConfirm, onSkip, onClose }) {
  // selected[columnId] = Set of checked task indices（預設全選）
  const [selected, setSelected] = useState(() => {
    const init = {};
    pendingExampleTasks.forEach(col => {
      init[col.columnId] = new Set(col.tasks.map((_, i) => i));
    });
    return init;
  });
  const [isLoading, setIsLoading] = useState(false);

  const totalAll = pendingExampleTasks.reduce((s, c) => s + c.tasks.length, 0);
  const totalSelected = pendingExampleTasks.reduce(
    (s, c) => s + (selected[c.columnId]?.size || 0),
    0
  );

  const toggleTask = (columnId, taskIdx) => {
    setSelected(prev => {
      const next = new Set(prev[columnId] || []);
      if (next.has(taskIdx)) next.delete(taskIdx);
      else next.add(taskIdx);
      return { ...prev, [columnId]: next };
    });
  };

  const toggleColumn = (col) => {
    setSelected(prev => {
      const colSet = prev[col.columnId] || new Set();
      const allChecked = colSet.size === col.tasks.length;
      return {
        ...prev,
        [col.columnId]: allChecked ? new Set() : new Set(col.tasks.map((_, i) => i))
      };
    });
  };

  const getColumnCheckState = (col) => {
    const size = selected[col.columnId]?.size || 0;
    if (size === 0) return 'none';
    if (size === col.tasks.length) return 'all';
    return 'partial';
  };

  const handleConfirm = async () => {
    const filteredTasks = pendingExampleTasks
      .map(col => ({
        ...col,
        tasks: col.tasks.filter((_, i) => selected[col.columnId]?.has(i))
      }))
      .filter(col => col.tasks.length > 0);

    if (filteredTasks.length === 0) return;

    setIsLoading(true);
    try {
      await onConfirm(filteredTasks);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">

        {/* 標題列 */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-start justify-between">
          <div>
            <h2 className="text-h2 font-bold text-gray-800">選擇要載入的任務</h2>
            <p className="text-body-sm text-gray-500 mt-1">
              勾選想載入的任務，不適合的可以直接不選
            </p>
          </div>
          <button
            onClick={onClose || onSkip}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-fast p-1 rounded-lg hover:bg-gray-100 ml-4 mt-0.5 shrink-0"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* 任務清單 */}
        <div className="px-4 py-3 max-h-[52vh] overflow-y-auto space-y-3">
          {pendingExampleTasks.map(col => {
            const checkState = getColumnCheckState(col);
            return (
              <div key={col.columnId}>
                {/* 欄位標題列（勾選全欄） */}
                <label className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded text-customgreen border-gray-300 focus:ring-customgreen cursor-pointer"
                    checked={checkState === 'all'}
                    ref={el => { if (el) el.indeterminate = checkState === 'partial'; }}
                    onChange={() => toggleColumn(col)}
                  />
                  <span className="text-body-sm font-semibold text-gray-700 flex-1">
                    {col.columnName}
                  </span>
                  <span className="text-caption text-gray-400">
                    {selected[col.columnId]?.size || 0}/{col.tasks.length}
                  </span>
                </label>

                {/* 任務列表 */}
                <div className="ml-7 space-y-0.5">
                  {col.tasks.map((task, i) => (
                    <label
                      key={i}
                      className="flex items-start gap-3 px-2 py-1.5 rounded-md hover:bg-gray-50 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 mt-0.5 rounded text-customgreen border-gray-300 focus:ring-customgreen cursor-pointer shrink-0"
                        checked={selected[col.columnId]?.has(i) || false}
                        onChange={() => toggleTask(col.columnId, i)}
                      />
                      <span className={`text-body-sm leading-5 transition-colors duration-fast ${
                        selected[col.columnId]?.has(i) ? 'text-gray-700' : 'text-gray-400 line-through'
                      }`}>
                        {task.title}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* 備註 */}
        <div className="px-6 pt-1 pb-2">
          <p className="text-caption text-gray-400 text-center">
            範例任務只是起點，載入後可以繼續修改內容
          </p>
        </div>

        {/* 操作按鈕 */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onSkip}
            className="flex-1 px-btn-x py-btn-y text-body-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-fast"
          >
            先自己開始
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || totalSelected === 0}
            className="flex-1 px-btn-x py-btn-y text-body-sm font-medium text-white bg-customgreen rounded-lg hover:bg-customgreen/90 transition-colors duration-fast disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading
              ? '載入中...'
              : totalSelected === 0
              ? '請先勾選任務'
              : `載入 ${totalSelected} 張任務`}
          </button>
        </div>
      </div>
    </div>
  );
}
