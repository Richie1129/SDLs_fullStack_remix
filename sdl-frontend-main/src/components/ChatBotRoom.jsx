import React, { useState, useEffect, useRef } from 'react'
import { GrFormClose, GrSend } from "react-icons/gr";
import { useParams } from 'react-router-dom';
import { socket } from '../utils/socket';
import { getCurrentUsername, getUserForSocket, isCurrentUser } from '../utils/userUtils';

export default function ChatRoom({chatRoomOpen, setChatRoomOpen}) {
    const [ currentMessage, setCurrentMessage ] = useState("");
    const { projectId } = useParams();
    const [ messageList, setMessageList ] = useState([]);
    const bottomRef = useRef(null);

    const sendMessage = async() =>{
        if(currentMessage !== ""){
            const messageData = {
                room: projectId,
                author: getCurrentUsername(),
                message: currentMessage,
                time: new Date(Date.now()).getHours() + ":" + new Date(Date.now()).getMinutes(),
                _localId: Date.now() + Math.random(),
            };
            socket.emit("send_message", messageData);
            setMessageList(prev => [...prev, messageData]);
            setCurrentMessage("");
        }
    }

    useEffect(() => {
        bottomRef.current?.scrollIntoView({behavior: 'smooth'});
    }, [messageList]);

    useEffect(() => {
        function receive_message(data) {
            // 過濾掉自己發的訊息（已在 sendMessage 做了樂觀更新）
            if (data.author === getCurrentUsername()) return;
            setMessageList(prev => [...prev, data]);
        }
        
        if (chatRoomOpen === true) {
            socket.emit("join_room", projectId);
            console.log("join_room");
        }
        socket.on("receive_message", receive_message)
        return () => {
            socket.off('receive_message', receive_message);
        };
    }, [socket, chatRoomOpen]);
    return (
        <div className= {`w-[300px] h-[500px] fixed right-5 bottom-0 border-2 p-0 border-black/70 rounded bg-slate-100 ${chatRoomOpen ? "visible" : "invisible"}`}>
            <div className='h-[31px] w-full flex justify-between text-body p-1 bg-gray-400 text-white'>
                <span>小組討論區</span>
                <button onClick={()=>{setChatRoomOpen(false)}} className='cursor-pointer rounded-lg hover:bg-gray-200 '>
                    <GrFormClose size={20} />
                </button>
            </div>
            <div className='h-[430px] w-full py-3 relative overflow-x-hidden overflow-y-scroll scrollbar-thin scrollbar-thumb-slate-400/70 scrollbar-track-slate-200 scrollbar-thumb-rounded-full scrollbar-track-rounded-full'>
                {
                    messageList.map((messages, index) => {
                        return (
                            <div key={index} className={`flex h-auto p-1 ${messages.author===getCurrentUsername()? "justify-end": "justify-start"}`}> 
                                <div>
                                    <div className={`w-fit max-w-[120px] rounded text-white flex items-center break-all px-[5px] mx-[5px] ${messages.author===getCurrentUsername()? "bg-[#5BA491]": "bg-sky-700"}`}>
                                        {messages.message}
                                    </div>
                                    <div className='flex justify-end text-caption mx-[5px]'>
                                        <p>{messages.time}</p>
                                        <p>{messages.author}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                }
                <div ref={bottomRef} />
            </div>
            <div className=' h-[35px] w-full flex justify-between text-body p-0 border-t-2 bg-slate-50 border-black/70'>
                <input
                    type="text"
                    className='w-10/12 outline-none p-1'
                    value={currentMessage}
                    onChange={e => setCurrentMessage(e.target.value)}
                    onKeyDown={e => {e.key === "Enter" && sendMessage()}}
                />
                <button 
                    className='mx-auto'
                    onClick={sendMessage}
                >
                    <GrSend size={20} />
                </button>
            </div>
        </div>
    )
}
