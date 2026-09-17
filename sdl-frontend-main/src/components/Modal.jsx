import React, {useState, useEffect} from 'react'

export default function Modal({ open, onClose, opacity, position, modalCoordinate, children, custom, enableScroll = true, noPadding = false }) {
    const [coordinate, setCoordinate] = useState({})
    useEffect(()=>{
        setCoordinate(modalCoordinate);
    },[modalCoordinate])
    
    // 根據 enableScroll 決定是否加入滾動樣式
    const scrollClass = enableScroll ? "max-h-[90vh] overflow-y-auto" : "";
    const paddingClass = noPadding ? "" : "p-component-sm sm:p-component-md";
    
    return (
        <>
            {
                coordinate ?
                <div  style={{top: `${coordinate.y}px`, left: `${coordinate.x}px`}} className={`z-50 fixed flex transition-colors duration-normal ${open ? "visible" : "invisible"} ${opacity ? "bg-black/50" : ""} ${position}`}>
                <div onClick={(e) => e.stopPropagation()} className={`bg-white rounded-md shadow transition-[transform,opacity] duration-normal ease-out ${scrollClass} ${custom ? custom : "w-[95vw] sm:w-4/5 lg:w-2/5 max-w-2xl"} ${open ? "scale-100 opacity-100" : "scale-95 opacity-0 motion-reduce:scale-100"}`} >
                    {/* <button onClick={onClose} className=' absolute top-2 right-2 rounded-lg bg-white hover:bg-slate-200'>
                        <GrFormClose  className=' w-6 h-6'/>
                    </button> */}
                    {children}
                    </div>
                </div>   
                :
                <div className={`z-50 fixed inset-0 flex items-center justify-center transition-colors duration-normal ${open ? "visible" : "invisible"} ${opacity ? "bg-black/50" : ""} ${position}`}>
                <div onClick={(e) => e.stopPropagation()} className={`bg-white rounded-md shadow ${paddingClass} transition-[transform,opacity] duration-normal ease-out ${scrollClass} ${custom ? custom : "w-[95vw] sm:w-4/5 lg:w-2/5 max-w-2xl"} ${open ? "scale-100 opacity-100" : "scale-95 opacity-0 motion-reduce:scale-100"}`} >
                    {children}
                    </div>
                </div> 
            }
        </>
    )
}
