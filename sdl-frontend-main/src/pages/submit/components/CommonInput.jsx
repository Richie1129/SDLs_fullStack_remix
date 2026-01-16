import React from 'react'

export default function CommonInput({handleChange, type, name, index}) {
    return (
        <div>
            <p className=' font-bold text-body mb-3'>
            {name}
            </p>
            <input className=" rounded outline-none ring-2 p-1 ring-customgreen w-full mb-3" 
            type={type} 
            name={index}
            onChange={handleChange}
            />
        </div>
    )
}
