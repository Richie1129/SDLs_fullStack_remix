import React, { useState, useEffect, useRef } from 'react';  // 引入 useEffect
import { createChatroom, createMessage, getAllChatrooms, getUserChatrooms, getMessages, deleteChatroom } from '../../api/question';
import { useParams } from 'react-router-dom';
import { socket } from '../../utils/socket';
import Lottie from "lottie-react";
import Select_icon from "../../assets/AnimationQuestionSelect.json";
import { RxCross2 } from "react-icons/rx";
import Swal from 'sweetalert2';
import { TbSend } from "react-icons/tb";

export default function AskQuestion() {
    const [currentChat, setCurrentChat] = useState(null);  // ✅ 改為 null，因為它是物件不是陣列
    const [chats, setChats] = useState([]);
    const { projectId } = useParams();
    const [message, setMessage] = useState('');
    const userRole = localStorage.getItem('role');  // 從本地存儲獲取使用者角色
    const [selectedChatId, setSelectedChatId] = useState(null); // 新增狀態來追蹤選擇的聊天室ID
    const [newTitle, setNewTitle] = useState('');  // 新提問標題的狀態
    const [AddindQuestion, setAddindQuestion] = useState(false);  // 新提問標題的狀態
    const currentChatRef = useRef(null);
    const prevChatIdRef = useRef(null);

    
    // 用於初始化和更新聊天列表的函數
    // const fetchChats = async () => {
    //     const data = await getAllChatrooms(projectId);
    //     setChats(data);
    // };

    const fetchChats = async () => {
        try {
            let data;
            if (userRole === 'teacher') {
                data = await getAllChatrooms(projectId);
            } else if (userRole === 'student') {
                data = await getUserChatrooms(projectId, localStorage.getItem("id"));
            }
            // ✅ 確保 data 是陣列，否則設為空陣列
            setChats(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch data:', error);
            // ✅ 錯誤時設為空陣列，避免 undefined
            setChats([]);
        }
    };

    // 裝載組件時抓取聊天室列表
    useEffect(() => {
        fetchChats();
    }, [projectId, userRole]);  // 當 projectId 變化時重新執行此函數

    const refreshMessages = async (chatId) => {
        const updatedMessages = await getMessages(chatId);
        const chat = currentChatRef.current;
        if (chat && chat.id === chatId) {
            setCurrentChat({ ...chat, messages: updatedMessages });
        }
    };

    const toggleAddQuiestionInput = () => {
        setAddindQuestion(!AddindQuestion); // 切換輸入框的顯示狀態
    };


    const addNewChatroom = async () => {
        if (newTitle) {
            const newChat = {
                title: newTitle,
                userId: localStorage.getItem("id"),
                projectId
            };

            await createChatroom(newChat);
            await fetchChats();  // 重新獲取列表以更新 UI
            setNewTitle('');  // 清空輸入框
            toggleAddQuiestionInput();
        }
    };
    const fetchMessages = async (chat) => {
        const messages = await getMessages(chat.id); // 通過 API 獲取特定聊天室的消息
        setCurrentChat({ ...chat, messages }); // 更新當前聊天室的狀態，包括消息
        setSelectedChatId(chat.id); // 設置當前選擇的聊天室ID
    };


    // 同步 ref（每次 currentChat 變更時更新，不觸發 socket 操作）
    useEffect(() => {
        currentChatRef.current = currentChat;
    }, [currentChat]);

    // Socket 房間管理（只在 chatId 變更時觸發，避免每次 messages 更新都重綁）
    useEffect(() => {
        const chatId = currentChat?.id;
        if (!chatId) return;

        // 離開舊房間
        if (prevChatIdRef.current && prevChatIdRef.current !== chatId) {
            socket.emit("leave_QuestionRoom", prevChatIdRef.current);
        }
        prevChatIdRef.current = chatId;

        socket.emit("join_QuestionRoom", chatId);

        const handleReceive = () => {
            refreshMessages(chatId);
        };
        socket.on("receive_QuestionMessage", handleReceive);

        return () => {
            socket.off("receive_QuestionMessage", handleReceive);
            // unmount 或切換時離開當前房間
            if (chatId) {
                socket.emit("leave_QuestionRoom", chatId);
            }
        };
    }, [currentChat?.id, socket]);

    const sendMessage = async () => {
        // console.log(chat)
        if (message && currentChat) {
            const data = {
                message: message,
                author: localStorage.getItem("role"),
                questionId: currentChat.id
            };
            socket.emit("send_QuestionMessage", data);
            setCurrentChat(prev => {
                return { ...prev, messages: [...(prev.messages || []), data] };
            });
            setMessage('');

        }
    };


    const handleDeleteChatroom = async (questionId) => {
        // await deleteChatroom(questionId);
        // fetchChats();  // Refresh the list after deletion

        Swal.fire({
            title: '確定要刪除這個聊天室嗎？',
            text: "你將無法恢復此操作！",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#5BA491',
            cancelButtonColor: '#d33',
            confirmButtonText: '確定',
            cancelButtonText: '取消'
        }).then((result) => {
            if (result.isConfirmed) {
                // 如果用戶確認刪除
                deleteChatroom(questionId).then(() => {
                    fetchChats();  // 刷新聊天室列表
                    setCurrentChat(null);  // ✅ 改為 null
                    Swal.fire(
                        '已刪除！',
                        '聊天室已被刪除。',
                        'success'
                    );
                }).catch((error) => {
                    // 處理錯誤情況
                    Swal.fire(
                        '錯誤',
                        '無法刪除聊天室：' + error.message,
                        'error'
                    );
                });
            }
        });
    };

    return (
        <div className="flex flex-col h-full w-full bg-gray-50">
            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden p-component-base sm:p-component-md-lg gap-stack-sm">
                <div className="w-full lg:w-1/3 bg-gray-100 overflow-auto p-component-sm rounded-lg lg:min-h-0">
                    <div className="shadow-md rounded-lg mb-4 p-component-base flex justify-between items-center bg-white">
                        {AddindQuestion ? (
                            <div className="flex flex-col sm:flex-row gap-stack-xs w-full">
                                <input
                                    type="text"
                                    value={newTitle}
                                    onChange={(e) => {
                                        setNewTitle(e.target.value);
                                        console.log(newTitle)
                                    }}
                                    placeholder="輸入新提問標題"
                                    className="flex-1 border border-gray-300 p-component-xs rounded focus:outline-none focus:ring-2 focus:ring-[#5BA491]"
                                />
                                <div className="flex gap-stack-xs">
                                    <button
                                        onClick={addNewChatroom}
                                        className="font-bold py-2 px-4 rounded bg-[#5BA491] text-white hover:bg-[#5BA491]/80 transition duration-300"
                                    >
                                        新增
                                    </button>
                                    <button
                                        onClick={toggleAddQuiestionInput}
                                        className="flex items-center justify-center p-component-xs py-1 hover:bg-gray-200 rounded"
                                    >
                                        <RxCross2 />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <h1 className="text-h3 font-bold" style={{ color: '#5BA491' }}>提問聊天室</h1>

                                <button
                                    onClick={toggleAddQuiestionInput}
                                    className="font-bold py-2 px-4 rounded bg-[#5BA491] text-white hover:bg-[#5BA491]/80 transition duration-300"
                                >
                                    新增提問
                                </button>
                            </>
                        )}
                    </div>
                    {Array.isArray(chats) && chats.map(chat => (
                        <div key={chat.id}
                            className={`p-component-sm mb-2 rounded shadow flex justify-between items-center cursor-pointer transition duration-300 ${selectedChatId === chat.id ? "bg-[#5BA491]/80 text-white font-semibold" : "bg-white hover:bg-[#5BA491]/50"}`}
                            onClick={() => fetchMessages(chat)}>
                            <span className="flex-1 text-body-sm sm:text-body truncate pr-2">{chat.title}</span>
                            {selectedChatId === chat.id && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDeleteChatroom(chat.id) }} 
                                    className="flex items-center justify-center text-red-500 hover:text-red-700 p-1 rounded flex-shrink-0"
                                >
                                    <RxCross2 size={20} className="sm:w-6 sm:h-6" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
                <div className="w-full lg:w-2/3 flex flex-col bg-white shadow-lg rounded-lg lg:min-h-0 mt-4 lg:mt-0">
                    {!currentChat ? (
                        <div className="flex flex-col items-center gap-stack-md sm:gap-12 justify-center h-full p-component-base">
                            <Lottie className="w-48 sm:w-72 lg:w-96 max-w-full" animationData={Select_icon} />
                            <p className="text-body-lg sm:text-h3 font-bold text-center">請選擇左側聊天室列表</p>
                        </div>

                    ) : (
                        <>
                            <div className="px-4 py-2 text-white text-body-lg font-semibold rounded-t-lg" style={{ backgroundColor: '#5BA491' }}>
                                {currentChat.title}
                            </div>
                            <div className="flex-1 overflow-auto p-component-sm sm:p-component-base">
                                {currentChat?.messages?.map((m, index) => (
                                    <div key={index} className={`flex items-start mb-3 ${m.author === 'teacher' ? 'justify-start' : 'justify-end'}`}>
                                        <div className={`max-w-[85%] sm:max-w-[80%] p-component-sm rounded-lg shadow-sm ${m.author === 'teacher' ? 'bg-blue-100' : 'bg-green-100'}`}>
                                            <div className="text-body-sm sm:text-body mb-1">{m.message}</div>
                                            <small className="text-caption text-gray-600">{m.author}</small>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex p-component-xs border-t min-h-[60px] gap-stack-xs">
                                <input 
                                    type="text" 
                                    value={message} 
                                    onChange={e => setMessage(e.target.value)}
                                    className="flex-1 border p-component-xs rounded transition duration-300 focus:outline-none focus:ring ring-[#5BA491]/60"
                                    placeholder="輸入訊息..."
                                    onKeyDown={e => e.key === 'Enter' && sendMessage()} 
                                />
                                <button 
                                    onClick={sendMessage} 
                                    className="font-bold bg-[#5BA491] text-white px-3 sm:px-4 py-2 rounded hover:bg-[#5BA491]/80 transition duration-300 flex items-center justify-center flex-shrink-0"
                                >
                                    <TbSend size={18} className="sm:w-5 sm:h-5" />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}