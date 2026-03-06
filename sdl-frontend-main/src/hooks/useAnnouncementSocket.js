import { useEffect } from 'react';
import { socket } from '../utils/socket';
import Swal from 'sweetalert2';

/**
 * Hook to handle real-time announcement updates via Socket.io
 */
export const useAnnouncementSocket = (projectId, setNotifications, selectedAnnouncement, setSelectedAnnouncement) => {
    useEffect(() => {
        const handleReceiveAnnouncement = (data) => {
            setNotifications((prev) => {
                if (prev.find(n => n.id === data.id)) {
                    return prev;
                }
                return [data, ...prev];
            });
        };

        const handleAnnouncementDeleted = (data) => {
            setNotifications((prev) => prev.filter(n => n.id !== data.id));

            // 如果正在查看被刪除的公告，關閉 Modal
            if (selectedAnnouncement && selectedAnnouncement.id === data.id) {
                setSelectedAnnouncement(null);
                Swal.fire({
                    icon: 'info',
                    title: '公告已被刪除',
                    text: '該公告已被管理者刪除',
                    timer: 3000,
                    showConfirmButton: false
                });
            }
        };

        socket.on('receiveAnnouncement', handleReceiveAnnouncement);
        socket.on('announcementDeleted', handleAnnouncementDeleted);

        return () => {
            socket.off('receiveAnnouncement', handleReceiveAnnouncement);
            socket.off('announcementDeleted', handleAnnouncementDeleted);
        };
    }, [selectedAnnouncement, setNotifications, setSelectedAnnouncement]);

    // 當 projectId 變更時，加入或離開對應的 socket room
    useEffect(() => {
        if (projectId) {
            socket.emit('join_project', projectId);
        }

        return () => {
            if (projectId) {
                socket.emit('leave_project', projectId);
            }
        };
    }, [projectId]);
};
