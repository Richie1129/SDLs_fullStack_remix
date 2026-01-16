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
                custom={"w-25 h-12"}
            >
                <div>
                    <button 
                        onClick={onCreateIdea} 
                        className='w-full h-full p-component-xs rounded-md bg-white hover:bg-slate-100 text-body-sm'
                    >
                        建立想法
                    </button>
                    <button 
                        onClick={onCloseCreateOption} 
                        className='w-full h-full p-component-xs rounded-md bg-white hover:bg-slate-100 text-body-sm'
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
                custom={"w-30 h-15"}
            >
                <div>
                    <button 
                        onClick={onExtendIdea} 
                        className='w-full h-full p-component-xs rounded-md bg-white hover:bg-slate-100 text-body-sm'
                    >
                        延伸想法
                    </button>
                    <button 
                        onClick={onCloseBuildOnOption} 
                        className='w-full h-full p-component-xs rounded-md bg-white hover:bg-slate-100 text-body-sm'
                    >
                        取消
                    </button>
                </div>
            </Modal>
        </>
    );
}
