import React, {useState} from 'react'
import {FaBars} from 'react-icons/fa'
import { AiOutlineImport, AiFillEye, AiOutlineRollback } from "react-icons/ai"
import { GrStackOverflow } from "react-icons/gr"
import { Link } from 'react-router-dom'

export default function IdeaWallSideBar() {
    const [open, setOpen] = useState(false);
    const menus = [
        { name: "引入想法牆", icon: AiOutlineImport, margin:"true"},
        { name: "佈局", icon: GrStackOverflow },
        { name: "篩選", icon: AiFillEye },
    ]
    return (
        <div className={` bg-[#FFF] fixed inset-y-0 left-0 min-h-screen duration-500 border-r-2 ${open ? "w-40" : "w-16"}`}>
            <div className='mt-2 py-3 pl-3 flex justify-start'>
                <FaBars size={26} className='cursor-pointer' onClick={()=>setOpen(!open)}/>
            </div>
            <div className='mt-4 flex flex-col gap-stack-sm relative'>
                {
                    menus?.map((menu, i) => (
                    <div key={i} className={`${menu?.margin && "mt-5"} group flex items-center text-body-sm gap-3.5 font-medium p-component-sm hover:bg-slate-100 rounded-sm cursor-pointer`}>
                        <div>{React.createElement(menu?.icon, { size: "26" })}</div>
                        <h2 style={{transitionDelay: `${i + 1}00ms`,}} className={`whitespace-pre duration-500 ${!open && "opacity-0 translate-x-28 overflow-hidden"}`}>
                        {menu?.name}
                        </h2>
                        <h2 className= {`${ open && 'hidden'} absolute left-14 bg-white font-semibold whitespace-pre text-gray-900 rounded-md drop-shadow-lg p-0 w-0  overflow-hidden group-hover:p-1  group-hover:w-fit`}>
                        {menu?.name}
                        </h2>
                    </div>
                    ))
                }
            </div> 
            <Link to='/homepage' className='fixed bottom-0 items-center gap-3.5 font-medium p-component-sm hover:bg-slate-100 rounded-sm cursor-pointer'>
                <AiOutlineRollback size={26} className='cursor-pointer'/>
            </Link>   
        </div>
    )
}
