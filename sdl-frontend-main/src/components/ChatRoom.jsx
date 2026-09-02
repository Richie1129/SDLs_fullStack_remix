import React, { useState, useEffect, useRef } from 'react'
import { GrFormClose, GrSend } from "react-icons/gr";
import { useParams } from 'react-router-dom';
import { socket } from '../utils/socket';
import { TbSend } from "react-icons/tb";
import { useLocation } from 'react-router-dom';
import { getChatroomHistory } from '../api/chatroom';  // 引入API函数

// 聊天史每頁筆數，與後端預設一致（B9）
const CHAT_HISTORY_PAGE_SIZE = 200;
import { formatTime } from '../utils/timeUtils';  // 使用統一的時間格式化函數
import { useUsername } from '../hooks/useUserInfo'; // 引入 username hook
import { getCurrentUserId } from '../utils/authUtils';

export default function ChatRoom({ chatRoomOpen, setChatRoomOpen }) {
    const [currentMessage, setCurrentMessage] = useState("");
    const { projectId } = useParams();
    const currentUsername = useUsername(); // 取得當前使用者名稱
    const [messageList, setMessageList] = useState([]);
    const bottomRef = useRef(null);
    const personImg = [
        '/person/man1.png', '/person/man2.png', '/person/man3.png',
        '/person/man4.png', '/person/man5.png', '/person/man6.png',
        '/person/woman1.png', '/person/woman2.png', '/person/woman3.png'
    ];


    // 移除本地的 formatTime 函數，使用從 timeUtils 導入的統一函數
    const sendMessage = async () => {
        // 使用trim()方法确保去除了前后空格
        if (currentMessage.trim() !== "") {
            const messageData = {
                room: projectId,
                author: currentUsername,
                creator: String(getCurrentUserId()),
                message: currentMessage.trim(),  // 也可以在这里直接发送去除空格后的消息
                createdAt: formatTime(new Date(), 'full')  // 使用格式化函数
            };
            socket.emit("send_message", messageData);
            setMessageList(prev => [...prev, messageData]);
            setCurrentMessage("");  // 清空输入框
        }
    }

    // 後端一次只回最新 CHAT_HISTORY_PAGE_SIZE 筆（B9），更早的訊息用「載入更早訊息」往前翻
    const [hasMoreHistory, setHasMoreHistory] = useState(false);
    const [loadingEarlier, setLoadingEarlier] = useState(false);
    const skipAutoScrollRef = useRef(false);

    const formatHistory = (history) => (history || []).map(message => ({
        ...message,
        rawCreatedAt: message.createdAt,
        createdAt: formatTime(message.createdAt, 'full') // 使用UTC时间转换
    }));

    useEffect(() => {
        // 当聊天室打开且projectId有效时，加载历史消息
        if (chatRoomOpen && projectId) {
            const loadHistory = async () => {
                try {
                    const history = await getChatroomHistory(projectId, { limit: CHAT_HISTORY_PAGE_SIZE });
                    setMessageList(formatHistory(history));
                    setHasMoreHistory((history || []).length >= CHAT_HISTORY_PAGE_SIZE);
                } catch (error) {
                    console.error('Failed to fetch chatroom history:', error);
                }
            };
            loadHistory();
        }
    }, [projectId, chatRoomOpen]);  // 依赖projectId和chatRoomOpen

    const loadEarlierMessages = async () => {
        const oldest = messageList.find(m => m.id != null);
        if (!oldest || loadingEarlier) return;
        setLoadingEarlier(true);
        try {
            const older = await getChatroomHistory(projectId, { before: oldest.id, limit: CHAT_HISTORY_PAGE_SIZE });
            skipAutoScrollRef.current = true;
            setMessageList(prev => [...formatHistory(older), ...prev]);
            setHasMoreHistory((older || []).length >= CHAT_HISTORY_PAGE_SIZE);
        } catch (error) {
            console.error('Failed to fetch earlier chatroom history:', error);
        } finally {
            setLoadingEarlier(false);
        }
    };

    useEffect(() => {
        // 往前翻頁時保持目前位置，不要跳到底部
        if (skipAutoScrollRef.current) {
            skipAutoScrollRef.current = false;
            return;
        }
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messageList]);

    useEffect(() => {
        function receive_message(data) {
            // M5: 去重 — 如果本地樂觀新增的同一條訊息已存在則跳過
            setMessageList(prev => {
                const isDuplicate = prev.some(m =>
                    m.message === data.message &&
                    m.author === data.author &&
                    m.createdAt === data.createdAt
                );
                if (isDuplicate) return prev;
                return [...prev, data];
            });
        }

        if (chatRoomOpen === true) {
            socket.emit("join_room", projectId);
            console.log("join_room");
        }
        socket.on("receive_message", receive_message)
        return () => {
            socket.off('receive_message', receive_message);
        };
    }, [socket, chatRoomOpen, projectId]);

    return (
        <div className={`z-50 w-72 sm:w-80 lg:w-96 h-80 sm:h-96 lg:h-[460px] fixed left-2 sm:left-4 bottom-2 sm:bottom-4 border-2 p-0 rounded-lg shadow-xl bg-slate-100 transform transition-all duration-slow ${chatRoomOpen ? "translate-x-0 translate-y-0 visible" : "-translate-x-full translate-y-full invisible"} flex flex-col`}>
            <div className='h-8 sm:h-9 lg:h-[31px] w-full flex justify-between text-body-sm sm:text-body font-semibold p-1 rounded-t-lg bg-slate-300 text-slate-600 shrink-0'>
                <span className='pl-2 text-caption sm:text-body-sm lg:text-body'>小組討論區</span>
                <button onClick={() => { setChatRoomOpen(false) }} className='cursor-pointer rounded-lg hover:bg-gray-200 '>
                    <GrFormClose size={16} className="sm:w-5 sm:h-5 lg:w-5 lg:h-5" />
                </button>
            </div>
            <div className='flex-1 w-full py-2 sm:py-3 relative overflow-x-hidden overflow-y-scroll scrollbar-thin scrollbar-thumb-slate-400/70 scrollbar-track-slate-200 scrollbar-thumb-rounded-full scrollbar-track-rounded-full'>
                {hasMoreHistory && (
                    <div className='flex justify-center px-component-sm sm:px-component-base md:px-component-md pb-component-xs'>
                        <button
                            type='button'
                            onClick={loadEarlierMessages}
                            disabled={loadingEarlier}
                            className='text-caption sm:text-body-sm text-ink-muted hover:text-ink underline underline-offset-2 transition-colors duration-fast disabled:opacity-50'
                        >
                            {loadingEarlier ? '載入中' : '載入更早的訊息'}
                        </button>
                    </div>
                )}
                {/* {
                    messageList.map((messages, index) => {
                        const imgIndex = parseInt(messages.userId) % 9;
                        const currentImgIndex = parseInt(messages.creator) % 9;
                        const userImg = personImg[imgIndex];
                        const currentUserImg = personImg[currentImgIndex];
                        const isCurrentUser = messages.author === currentUsername;

                        return (
                            <div key={index} className={`flex h-auto p-1 ${isCurrentUser ? "justify-end" : "justify-start"}`}>
                                <div className={`flex items-center ${isCurrentUser ? "flex-row-reverse" : "flex-row"}`}>
                                    <img src={currentUserImg ? currentUserImg : userImg} className="w-8 h-8 rounded-full mx-2" />
                                    <div className={`flex flex-col ${isCurrentUser ? "items-end" : "items-start"}`}>
                                        <div className={`shadow-md w-fit max-w-[240px] rounded-lg text-white flex items-center break-all px-3 py-2 ${isCurrentUser ? "bg-[#5BA491]" : "bg-sky-700"}`}>
                                            {messages.message}
                                        </div>
                                        <div className='text-caption mt-1 text-gray-500'>
                                            {messages.createdAt} | {messages.author}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                        );
                    })
                } */}
                {messageList.reduce((acc, messages, index) => {
                    if (!messages.createdAt || typeof messages.createdAt !== 'string') {
                        return acc;
                    }
                    const parts = messages.createdAt.split(' ');
                    const datePart = parts[0];
                    const timePart = parts.slice(1).join(' ');
                    const currentDate = new Date(datePart);

                    if (isNaN(currentDate.getTime())) {
                        return acc;
                    }

                    const dateString = `${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月${currentDate.getDate()}日`;

                    const today = new Date();
                    const todayString = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
                    // console.log("todayString", todayString)
                    // console.log("dateString", dateString)
                    const isNewDay = acc.lastDate !== dateString;
                    const imgIndex = parseInt(messages.userId) % 9;
                    const currentImgIndex = parseInt(messages.creator) % 9;
                    const userImg = personImg[imgIndex];
                    const currentUserImg = personImg[currentImgIndex];
                    const isCurrentUser = messages.author === currentUsername;
                    if (isNewDay) {
                        acc.elements.push(
                            <div key={`date-${dateString}`} className="text-center font-semibold py-2 my-1 text-body-sm">
                                {dateString === todayString ? "-今天-" : `- ${dateString} -`}
                            </div>
                        );
                    }
                    acc.lastDate = dateString;
                    acc.elements.push(
                        <div key={index} className={`flex h-auto p-1 ${messages.author === currentUsername ? "justify-end" : "justify-start"}`}>
                            <div className={`flex items-center ${isCurrentUser ? "flex-row-reverse" : "flex-row"}`}>
                                <img src={currentUserImg ? currentUserImg : userImg} className="w-6 h-6 sm:w-8 sm:h-8 rounded-full mx-1 sm:mx-2" />
                                <div className={`flex flex-col ${isCurrentUser ? "items-end" : "items-start"}`}>
                                    <div className={`shadow-md w-fit max-w-[180px] sm:max-w-[240px] lg:max-w-[280px] rounded-lg text-white flex items-center break-all px-2 sm:px-3 py-1 sm:py-2 text-caption sm:text-body-sm ${isCurrentUser ? "bg-[#5BA491]" : "bg-sky-700"}`}>
                                        {messages.message}
                                    </div>
                                    <div className='text-caption mt-1 text-gray-500 truncate max-w-[180px] sm:max-w-[240px]'>
                                        {timePart} | {messages.author}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                    return acc;
                }, { elements: [], lastDate: "" }).elements}

                <div ref={bottomRef} />
            </div>
            <div className='h-8 sm:h-9 lg:h-[35px] w-full flex justify-between text-body-sm sm:text-body p-0 border-t-2 bg-slate-50 shrink-0'>
                <input
                    type="text"
                    value={currentMessage} // 确保绑定了currentMessage状态
                    className='w-10/12 outline-none p-1 text-caption sm:text-body-sm'
                    placeholder="輸入訊息..."
                    onChange={e => setCurrentMessage(e.target.value)}
                    onKeyDown={e => { e.key === "Enter" && sendMessage() }}
                />
                <button
                    className='mx-auto p-1 hover:bg-gray-200 rounded'
                    onClick={sendMessage}
                >
                    <TbSend size={16} className="sm:w-5 sm:h-5 lg:w-5 lg:h-5" />
                </button>
            </div>
        </div>
    )
}
