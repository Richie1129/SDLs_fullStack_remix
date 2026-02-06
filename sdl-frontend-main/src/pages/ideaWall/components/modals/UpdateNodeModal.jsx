import React from 'react';
import { FaGraduationCap } from 'react-icons/fa';
import Modal from '../../../../components/Modal';
import KnowledgeForumScaffolds from '../KnowledgeForumScaffolds';
import { formatTime } from '../../../../utils/timeUtils';
import { getCurrentUsername } from '../../../../utils/userUtils';

/**
 * 更新/檢視節點 Modal 元件
 * 包含編輯節點和變更歷史兩個標籤頁
 */
export default function UpdateNodeModal({
    open,
    onClose,
    selectNodeInfo,
    isObservationMode,
    showNodeChangeHistory,
    nodeChangeLogs,
    onTabChange,
    onChange,
    onContentChange,
    onSubmit,
    onDelete,
    onKbCoach,
    onExtendIdea,
    getDisplayNodeOwnerName,
}) {
    const currentUsername = getCurrentUsername();
    const isOwner = currentUsername === selectNodeInfo?.owner;

    if (!selectNodeInfo) return null;

    return (
        <Modal open={open} onClose={onClose} opacity={false} position={"justify-center items-center"}>
            <div className='flex flex-col w-full'>
                {/* 標籤頁導航 */}
                <div className='flex border-b border-gray-200 mb-4'>
                    <button
                        onClick={() => onTabChange(false)}
                        className={`px-4 py-2 font-medium text-body-sm ${
                            !showNodeChangeHistory 
                                ? 'text-customgreen border-b-2 border-customgreen' 
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        編輯節點
                    </button>
                    <button
                        onClick={() => onTabChange(true)}
                        className={`px-4 py-2 font-medium text-body-sm ${
                            showNodeChangeHistory 
                                ? 'text-customgreen border-b-2 border-customgreen' 
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        變更歷史
                    </button>
                </div>

                {/* 編輯節點內容 */}
                {!showNodeChangeHistory && (
                    <div className='flex flex-col p-component-sm'>
                        <h3 className=' font-bold text-body mb-3'>檢視便利貼</h3>
                        <p className=' font-bold text-body mb-3'>標題</p>
                        <input 
                            className="rounded outline-none ring-2 p-1 ring-customgreen w-full mb-3"
                            type="text"
                            placeholder="標題"
                            name='title'
                            value={selectNodeInfo.title}
                            onChange={onChange}
                            disabled={isObservationMode || !isOwner}
                        />

                        {/* Knowledge Forum 思考鷹架 - 只在可編輯時顯示 */}
                        {!isObservationMode && isOwner && (
                            <KnowledgeForumScaffolds
                                currentContent={selectNodeInfo.content}
                                onInsert={onContentChange}
                            />
                        )}

                        <p className=' font-bold text-body mb-3'>內容</p>
                        <textarea 
                            className="rounded outline-none ring-2 ring-customgreen w-full p-1 resize-none overflow-auto"
                            rows={5}
                            placeholder="內容"
                            name='content'
                            value={selectNodeInfo.content}
                            onChange={onChange}
                            disabled={isObservationMode || !isOwner}
                        />
                        <div className='flex justify-between items-center mt-3'>
                            <p className=' font-bold text-body'>建立者: {getDisplayNodeOwnerName(selectNodeInfo.owner)}</p>
                            {selectNodeInfo.createdAt && (
                                <p className='text-body-sm text-gray-500' title={formatTime(selectNodeInfo.createdAt, 'full')}>
                                    建立時間: {formatTime(selectNodeInfo.createdAt, 'relative')}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* 變更歷史 */}
                {showNodeChangeHistory && (
                    <div className='max-h-96 overflow-y-auto p-component-sm'>
                        <div className='flex items-center mb-4'>
                            <h4 className='text-body-lg font-medium text-gray-700'>變更歷史</h4>
                        </div>
                        
                        {nodeChangeLogs.length === 0 ? (
                            <div className='text-center py-8 text-gray-500'>
                                <p>尚無變更記錄</p>
                            </div>
                        ) : (
                            <div className='space-y-3'>
                                {nodeChangeLogs.map((log, index) => (
                                    <div 
                                        key={log.id || index} 
                                        className='bg-gray-50 rounded-lg p-component-sm border-l-4 border-purple-400'
                                    >
                                        <div className='flex items-center justify-between mb-2'>
                                            <div className='flex items-center'>
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
                                                ${log.changeType === 'delete' ? 'bg-red-100 text-red-700' : ''}
                                            `}>
                                                {log.changeType === 'create' && '創建'}
                                                {log.changeType === 'update' && '更新'}
                                                {log.changeType === 'delete' && '刪除'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 按鈕區域 */}
            {!showNodeChangeHistory ? (
                isOwner ? (
                    <div className='flex flex-row justify-between m-2'>
                        {/* 刪除按鈕 - 觀摩模式隱藏 */}
                        {!isObservationMode && (
                            <button 
                                onClick={onDelete} 
                                className="w-16 h-7 bg-red-500 rounded font-bold text-body-sm sm:text-bas text-white mr-2"
                            >
                                刪除
                            </button>
                        )}
                        <div className='flex flex-col gap-stack-xs mb-3'>
                            {/* KB Coach按鈕 */}
                            {!isObservationMode && (
                                <button
                                    onClick={onKbCoach}
                                    className="w-full h-9 bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg font-bold text-body-sm text-white shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-stack-xs"
                                    title="基於Knowledge Building 12原則的深度引導"
                                >
                                    <FaGraduationCap className="w-5 h-5" />
                                    <span>KB Coach</span>
                                    <span className="text-caption bg-yellow-400 text-blue-900 px-2 py-0.5 rounded-full font-semibold">推薦</span>
                                </button>
                            )}
                            
                            {/* 延伸想法按鈕 */}
                            {!isObservationMode && (
                                <button
                                    onClick={onExtendIdea}
                                    className="w-full h-7 bg-green-500 rounded font-bold text-body-sm text-white hover:bg-green-600 transition-colors"
                                >
                                    延伸想法
                                </button>
                            )}
                        </div>
                        <div className='flex justify-end gap-stack-xs'>
                            <button 
                                onClick={onClose} 
                                className="w-16 h-7 bg-customgray rounded font-bold text-body-sm sm:text-bas text-black/60 mr-2"
                            >
                                取消
                            </button>
                            {/* 儲存按鈕 - 觀摩模式隱藏 */}
                            {!isObservationMode && (
                                <button 
                                    onClick={onSubmit} 
                                    className="w-16 h-7 bg-customgreen rounded font-bold text-body-sm sm:text-bas text-white"
                                >
                                    儲存
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className='flex justify-end m-2'>
                        <button 
                            onClick={onClose} 
                            className="mx-auto w-1/3 h-7 mb-2 bg-customgreen rounded font-bold text-caption sm:text-body text-white mr-2"
                        >
                            關閉
                        </button>
                        {/* 延伸想法按鈕 - 觀摩模式隱藏 */}
                        {!isObservationMode && (
                            <div className='flex justify-start'>
                                <button
                                    onClick={onExtendIdea}
                                    className="w-32 h-7 bg-blue-500 rounded font-bold text-body-sm sm:text-body text-white"
                                >
                                    延伸想法
                                </button>
                            </div>
                        )}
                    </div>
                )
            ) : (
                <div className='flex justify-end m-2'>
                    <button 
                        onClick={onClose} 
                        className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
                    >
                        關閉
                    </button>
                </div>
            )}
        </Modal>
    );
}
