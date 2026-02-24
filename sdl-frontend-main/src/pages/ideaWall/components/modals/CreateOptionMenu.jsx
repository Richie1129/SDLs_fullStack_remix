import React from 'react';
import Modal from '../../../../components/Modal';

/**
 * 建立選項選單元件
 * 顯示「建立想法」和「延伸想法」兩種選項
 */
export default function CreateOptionMenu({
    createOptionOpen,
    buildOnOptionOpen,
    onCloseCreateOption,
    onCloseBuildOnOption,
    onCreateIdea,
    onExtendIdea,
    canvasPosition,
}) {
    return (
        <>
            {/* 建立想法選單 */}
            <Modal 
                open={createOptionOpen} 
                onClose={onCloseCreateOption} 
                opacity={false} 
                modalCoordinate={canvasPosition} 
                custom={"w-28"}
                enableScroll={false}
            >
                <div className="flex flex-col">
                    <button 
                        data-track
                        data-track-action="IDEAWALL_CREATE_IDEA_SELECT"
                        data-track-type="node"
                        onClick={onCreateIdea} 
                        className='w-full p-component-sm rounded-t-md bg-white hover:bg-gray-100 text-ui font-medium transition-colors duration-fast border-b border-gray-200'
                    >
                        建立想法
                    </button>
                    <button 
                        data-track
                        data-track-action="IDEAWALL_CONTEXT_MENU_CANCEL"
                        data-track-type="node"
                        onClick={onCloseCreateOption} 
                        className='w-full p-component-sm rounded-b-md bg-white hover:bg-gray-100 text-ui text-gray-600 transition-colors duration-fast'
                    >
                        取消
                    </button>
                </div>
            </Modal>

            {/* 延伸想法選單 */}
            <Modal 
                open={buildOnOptionOpen} 
                onClose={onCloseBuildOnOption} 
                opacity={false} 
                modalCoordinate={canvasPosition} 
                custom={"w-32"}
                enableScroll={false}
            >
                <div className="flex flex-col">
                    <button 
                        data-track
                        data-track-action="IDEAWALL_EXTEND_IDEA_SELECT"
                        data-track-type="node"
                        onClick={onExtendIdea} 
                        className='w-full p-component-sm rounded-t-md bg-white hover:bg-gray-100 text-ui font-medium transition-colors duration-fast border-b border-gray-200'
                    >
                        延伸想法
                    </button>
                    <button 
                        data-track
                        data-track-action="IDEAWALL_CONTEXT_MENU_CANCEL"
                        data-track-type="node"
                        onClick={onCloseBuildOnOption} 
                        className='w-full p-component-sm rounded-b-md bg-white hover:bg-gray-100 text-ui text-gray-600 transition-colors duration-fast'
                    >
                        取消
                    </button>
                </div>
            </Modal>
        </>
    );
}
