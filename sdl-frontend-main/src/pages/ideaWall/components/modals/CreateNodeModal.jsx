import React, { useState } from 'react';
import Modal from '../../../../components/Modal';
import KnowledgeForumScaffolds from '../KnowledgeForumScaffolds';
import ReactMarkdown from 'react-markdown';

/**
 * 建立節點 Modal 元件
 */
export default function CreateNodeModal({
    open,
    onClose,
    title,
    content,
    onChange,
    onSubmit,
    onContentChange,
    aiCoachingNote = null,
}) {
    const [isNoteExpanded, setIsNoteExpanded] = useState(false);

    return (
        <Modal open={open} onClose={onClose} opacity={false} position={"justify-center items-center"}>
            <div className='flex flex-col'>
                <h3 className=' font-bold text-body mb-3'>建立想法</h3>

                {/* AI 建議參考（來自 KB Coach 建議行動） */}
                {aiCoachingNote && (
                    <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <p className="text-caption font-semibold text-blue-700 mb-1 flex items-center gap-1">
                            💡 AI 建議參考
                        </p>
                        <div className={`text-caption text-blue-600 prose prose-sm max-w-none prose-blue ${isNoteExpanded ? '' : 'line-clamp-4'}`}>
                            <ReactMarkdown>{aiCoachingNote}</ReactMarkdown>
                        </div>
                        <button
                            onClick={() => setIsNoteExpanded(prev => !prev)}
                            className="mt-1 text-caption text-blue-500 hover:text-blue-700"
                        >
                            {isNoteExpanded ? '▲ 收合' : '▼ 顯示全部'}
                        </button>
                    </div>
                )}

                <p className=' font-bold text-body mb-3'>標題</p>
                <input 
                    className="rounded outline-none ring-2 p-1 ring-customgreen w-full mb-3"
                    type="text"
                    placeholder="標題"
                    name='title'
                    value={title}
                    onChange={onChange}
                />

                {/* Knowledge Forum 思考鷹架 */}
                <KnowledgeForumScaffolds
                    currentContent={content}
                    onInsert={onContentChange}
                />

                <p className=' font-bold text-body mb-3'>內容</p>
                <textarea 
                    className="rounded outline-none ring-2 ring-customgreen w-full p-1 resize-none overflow-auto"
                    rows={5}
                    placeholder="內容"
                    name='content'
                    value={content}
                    onChange={onChange}
                />
            </div>
            <div className='flex gap-2 mt-4'>
                <button 
                    data-track
                    data-track-action="IDEAWALL_NODE_CREATE_CANCEL"
                    data-track-type="node"
                    onClick={onClose} 
                    className="flex-1 h-10 bg-customgray rounded font-bold text-body-sm text-black/60"
                >
                    取消
                </button>
                <button 
                    data-track
                    data-track-action="IDEAWALL_NODE_CREATE_SUBMIT"
                    data-track-type="node"
                    onClick={onSubmit} 
                    style={{ backgroundColor: "#5BA491" }} 
                    className="flex-1 h-10 rounded font-bold text-body-sm text-white"
                >
                    新增
                </button>
            </div>
        </Modal>
    );
}
