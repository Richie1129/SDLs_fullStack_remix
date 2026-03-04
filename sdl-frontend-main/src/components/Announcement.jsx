import React, { useState } from 'react';
import { Bell, MessageCircle } from 'lucide-react';
import { useQuery } from 'react-query';
import { getAnnouncements } from '../api/announcement';
import { formatRelativeTime } from '../utils/timeUtils';
import { useAnnouncementSocket } from '../hooks/useAnnouncementSocket';
import { useTeacherData } from '../hooks/useTeacherData';
import AnnouncementFormModal from './announcement/AnnouncementFormModal';
import AnnouncementDetailModal from './announcement/AnnouncementDetailModal';

export default function Announcement({ projectId, role }) {
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [newNotificationModalOpen, setNewNotificationModalOpen] = useState(false);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

    // 獲取公告列表
    useQuery(
        ['announcements', projectId],
        () => getAnnouncements(projectId),
        {
            onSuccess: (data) => setNotifications(data),
        }
    );

    // Socket.io 即時更新
    useAnnouncementSocket(projectId, setNotifications, selectedAnnouncement, setSelectedAnnouncement);

    // 教師專用資料
    const teacherData = useTeacherData(role);

    const handleDeleted = (announcementId) => {
        setNotifications((prev) => prev.filter(n => n.id !== announcementId));
    };

    return (
        <div className="relative">
            <Bell
                className="ml-2 h-6 w-6 cursor-pointer"
                onClick={() => setShowNotifications(!showNotifications)}
            />
            
            {showNotifications && (
                <div
                    className="absolute right-0 top-14 w-80 sm:w-96 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden z-50"
                    style={{ maxWidth: "calc(100vw - 2rem)" }}
                >
                    <div className="p-component-sm bg-gray-50 border-b border-gray-200">
                        <h3 className="text-body font-semibold text-gray-800">通知中心</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length > 0 ? (
                            notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className="flex items-start space-x-3 p-component-sm border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors duration-150"
                                    onClick={() => setSelectedAnnouncement(notification)}
                                >
                                    <div className="bg-green-100 text-green-600 rounded-full p-component-xs mt-1">
                                        <MessageCircle className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-body-sm font-semibold text-gray-900">{notification.title}</h4>
                                        <p className="text-caption text-gray-600 mt-1 truncate">{notification.content || "沒有內容"}</p>
                                        <div className="text-caption text-gray-400 mt-2 flex justify-between items-center">
                                            <span className="font-medium">{notification.author}</span>
                                            <span>{formatRelativeTime(notification.createdAt)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-500 text-center py-10">目前沒有任何公告。</p>
                        )}
                    </div>
                    {role === "teacher" && (
                        <div className="p-component-xs bg-gray-50 border-t border-gray-200">
                            <button
                                className="w-full py-2 bg-[#5BA491] text-white text-body-sm font-semibold rounded-lg hover:bg-opacity-90 transition-all"
                                onClick={() => setNewNotificationModalOpen(true)}
                            >
                                + 發佈新公告
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* 新增公告 Modal */}
            {newNotificationModalOpen && (
                <AnnouncementFormModal 
                    open={newNotificationModalOpen}
                    onClose={() => setNewNotificationModalOpen(false)}
                    initialProjectId={projectId}
                    teacherData={teacherData}
                />
            )}

            {/* 公告詳情 Modal */}
            {selectedAnnouncement && (
                <AnnouncementDetailModal 
                    announcement={selectedAnnouncement}
                    onClose={() => setSelectedAnnouncement(null)}
                    role={role}
                    onDeleted={handleDeleted}
                />
            )}
        </div>
    );
}
