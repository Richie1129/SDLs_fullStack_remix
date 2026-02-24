import React from 'react';
import { useQuery } from 'react-query';
import { FiClock, FiUser, FiEdit3 } from 'react-icons/fi';
import { getTaskChangeLogs } from '../../../../../api/kanban';
import { formatTime } from '../../../../../utils/timeUtils';

/**
 * ChangeHistory - 變更歷史組件
 *
 * 職責：
 * - 顯示任務變更記錄
 * - 顯示變更類型（創建、更新、移動、刪除）
 * - 顯示變更者和時間
 *
 * Linus: "好 - 變更歷史也是獨立的，只需要一個 taskId"
 *
 * @param {string} taskId - 任務 ID
 */
export function ChangeHistory({ taskId }) {
  const { data: changeLogs = [], isLoading } = useQuery(
    ['taskChangeLogs', taskId],
    () => getTaskChangeLogs(taskId),
    { enabled: !!taskId }
  );

  if (isLoading) {
    return (
      <div className='text-center py-8'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-customgreen mx-auto'></div>
        <p className='text-body-sm text-gray-500 mt-2'>載入中...</p>
      </div>
    );
  }

  return (
    <div>
      <div className='flex items-center mb-4'>
        <FiClock className='mr-2 text-gray-500' />
        <h4 className='text-body-lg font-medium text-gray-700'>變更歷史</h4>
      </div>

      {changeLogs.length === 0 ? (
        <div className='text-center py-8 text-gray-500'>
          <FiEdit3 className='mx-auto mb-2 text-h2' />
          <p>尚無變更記錄</p>
        </div>
      ) : (
        <div className='space-y-3'>
          {changeLogs.map((log, index) => (
            <div
              key={log.id || index}
              className='bg-gray-50 rounded-lg p-component-sm border-l-4 border-blue-400'
            >
              <div className='flex items-center justify-between mb-2'>
                <div className='flex items-center'>
                  <FiUser className='mr-1 text-gray-500' size={14} />
                  <span className='text-body-sm font-medium text-gray-700'>
                    {log.changedBy}
                  </span>
                </div>
                <span className='text-caption text-gray-500'>
                  {formatTime(log.createdAt, 'full')}
                </span>
              </div>

              <p className='text-body-sm text-gray-600 mb-2'>
                {log.description}
              </p>

              {log.fieldName && (
                <div className='text-caption text-gray-500'>
                  <span className='font-medium'>欄位：</span>
                  {log.fieldName}
                  {log.oldValue && log.newValue && (
                    <div className='mt-1'>
                      <span className='text-red-600'>舊值：{log.oldValue}</span>
                      <br />
                      <span className='text-green-600'>新值：{log.newValue}</span>
                    </div>
                  )}
                </div>
              )}

              <div className='flex items-center mt-2'>
                <span className={`
                  px-2 py-1 rounded-full text-caption font-medium
                  ${log.changeType === 'create' ? 'bg-green-100 text-green-700' : ''}
                  ${log.changeType === 'update' ? 'bg-blue-100 text-blue-700' : ''}
                  ${log.changeType === 'move' ? 'bg-purple-100 text-purple-700' : ''}
                  ${log.changeType === 'delete' ? 'bg-red-100 text-red-700' : ''}
                `}>
                  {log.changeType === 'create' && '創建'}
                  {log.changeType === 'update' && '更新'}
                  {log.changeType === 'move' && '移動'}
                  {log.changeType === 'delete' && '刪除'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
