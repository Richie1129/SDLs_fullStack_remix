import React from 'react'
import Lottie from "lottie-react";
import LoaderIcon from "../assets/AnimationLoader.json";

export default function Loader() {
    return (
        <div className="flex h-screen w-screen items-start justify-center">
            <Lottie className="w-96" animationData={LoaderIcon} />

            {/* <button type="button" className="flex items-center rounded-lg  px-4 py-2 text-white" disabled> */}
            {/* <svg className="mr-3 h-10 w-10 animate-spin text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg> */}
            {/* <span className=" text-slate-400 text-h1 font-bold"> Processing... </span> */}
            {/* </button> */}
        </div>
    )
}
