import React, {useState, useEffect} from 'react'

export default function Modal({ open, onClose, opacity, position, modalCoordinate, children, custom }) {
    const [coordinate, setCoordinate] = useState({})
    useEffect(()=>{
        setCoordinate(modalCoordinate);
    },[modalCoordinate])
    return (
        <>
            {
                coordinate ?
                <div  style={{top: `${coordinate.y}px`, left: `${coordinate.x}px`}} className={`z-50 fixed flex transition-colors duration-normal ${open ? "visible" : "invisible"} ${opacity ? "bg-black/50" : ""} ${position}`}>
                <div onClick={(e) => e.stopPropagation()} className={` bg-white rounded-md shadow transition-all duration-normal max-h-[90vh] overflow-y-auto ${custom ? custom : "w-11/12 sm:w-3/4 lg:w-1/3"} ${open ? "scale-100 opacity-100" : "scale-75 opacity-0"}`} >
                    {/* <button onClick={onClose} className=' absolute top-2 right-2 rounded-lg bg-white hover:bg-slate-200'>
                        <GrFormClose  className=' w-6 h-6'/>
                    </button> */}
                    {children}
                    </div>
                </div>   
                :
                <div className={`z-50 fixed inset-0 flex transition-colors duration-normal ${open ? "visible" : "invisible"} ${opacity ? "bg-black/50" : ""} ${position}`}>
                <div onClick={(e) => e.stopPropagation()} className={` bg-white rounded-md shadow p-component-sm sm:p-component-md lg:p-component-lg transition-all duration-normal max-h-[90vh] overflow-y-auto ${custom ? custom : "w-11/12 sm:w-3/4 lg:w-1/3"} ${open ? "scale-100 opacity-100" : "scale-75 opacity-0"}`} >
                    {children}
                    </div>
                </div> 
            }
        </>
    )
}
