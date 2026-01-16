import React from 'react'
import { Link } from 'react-router-dom'

export default function NotFound() {
    return (
        <div className=' w-screen h-screen flex flex-col justify-center items-center space-y-5'>
            <h1 className=' text-6xl text-amber-500 font-bold'>404</h1>
            <h3 className=' text-h1'>NotFound</h3>
            <p>The URL of page was not found.Please try again</p> 
            <button className='p-component-xs bg-amber-500 text-white rounded-md'><Link to="/">GO Home</Link></button>
        </div>
    )
}
