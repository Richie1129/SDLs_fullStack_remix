import React, { useState } from 'react'
import { ChromePicker } from 'react-color'

export default function ColorPicker() {
    const [currentBgColor, setCurrentBgColor] = useState("#D0021B");
    const [currentTextColor, setCurrentTextColor] = useState("#FFFFFF");
    const [ content, setContent ] = useState("");

    const handleChangeBgColor = (color) =>{
        setCurrentBgColor(color.hex);
    };
    const handleChangeTextColor = (color) =>{
        setCurrentTextColor(color.hex);
    };
    const tagHandleChange = () => {
        setContent()
    };

    return (
        <div className='flex flex-col'>
            <h4 className=' text-center font-bold mb-2'>建立新標籤</h4>
            <input className=" rounded outline-none ring-2 p-1 ring-customgreen w-full mb-3" 
                type="text" 
                placeholder="標籤內容..."
                name='content'
                onChange={tagHandleChange}
                />
            <div className='flex justify-center'>
            <p className='mx-auto'>背景顏色</p>
            <p className='mx-auto'>文字顏色</p>
            </div>
            <div className='flex justify-center'>
                <ChromePicker className='mb-3 mr-2' color={currentBgColor} onChange={handleChangeBgColor} onChangeComplete={handleChangeBgColor}/>
                <ChromePicker className='mb-3' color={currentTextColor} onChange={handleChangeTextColor} onChangeComplete={handleChangeTextColor}/>
            </div>
            <p className=' text-body font-bold mb-2'>預覽標籤</p>
            <div style={{backgroundColor: currentBgColor, color: currentTextColor}} className={`p-component-xs rounded-full text-caption font-bold text-center flex items-center w-fit h-[20px]`}>
                內容
            </div> 
            <div className='flex flex-row justify-end items-end'>
                <button className="flex justify-center items-center w-1/3 h-7 bg-customgray rounded font-bold text-caption sm:text-body-sm text-black/60 mr-2" >
                取消
                </button>
                <button className="flex justify-center items-center w-1/3 h-7 bg-customgreen rounded font-bold text-caption sm:text-body-sm text-white">
                儲存
                </button>
            </div>
        </div>
    )
}
