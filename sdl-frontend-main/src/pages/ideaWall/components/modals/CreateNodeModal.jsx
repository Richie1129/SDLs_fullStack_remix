import React from 'react';
import Modal from '../../../../components/Modal';
import KnowledgeForumScaffolds from '../KnowledgeForumScaffolds';

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
}) {
    return (
        <Modal open={open} onClose={onClose} opacity={false} position={"justify-center items-center"}>
            <div className='flex flex-col p-component-sm'>
                <h3 className=' font-bold text-body mb-3'>建立想法</h3>
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
            <div className='flex justify-end m-2'>
                <button 
                    data-track
                    data-track-action="IDEAWALL_NODE_CREATE_CANCEL"
                    data-track-type="node"
                    onClick={onClose} 
                    className="mx-auto w-full h-7 mb-2 bg-customgray rounded font-bold text-caption sm:text-body-sm text-black/60 mr-2"
                >
                    取消
                </button>
                <button 
                    data-track
                    data-track-action="IDEAWALL_NODE_CREATE_SUBMIT"
                    data-track-type="node"
                    onClick={onSubmit} 
                    style={{ backgroundColor: "#5BA491" }} 
                    className="mx-auto w-full h-7 mb-2 rounded font-bold text-caption sm:text-body-sm text-white"
                >
                    新增
                </button>
            </div>
        </Modal>
    );
}
