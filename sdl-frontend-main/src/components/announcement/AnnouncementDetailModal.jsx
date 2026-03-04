import React from 'react';
import { Trash2 } from 'lucide-react';
import Modal from '../Modal';
import Swal from 'sweetalert2';
import { deleteAnnouncement } from '../../api/announcement';

export default function AnnouncementDetailModal({ 
    announcement, 
    onClose, 
    role, 
    onDeleted 
}) {
    if (!announcement) return null;

    const handleDeleteAnnouncement = async () => {
        const result = await Swal.fire({
            title: '確認刪除',
            text: '確定要刪除此公告嗎？此操作無法復原！',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: '確定刪除',
            cancelButtonText: '取消'
        });

        if (!result.isConfirmed) return;

        try {
            await deleteAnnouncement(announcement.id);
            onDeleted(announcement.id);
            onClose();
            Swal.fire({
                icon: 'success',
                title: '刪除成功',
                text: '公告已成功刪除',
                timer: 2000,
                showConfirmButton: false
            });
        } catch (error) {
            console.error('刪除公告失敗:', error);
            Swal.fire({
                icon: 'error',
                title: '刪除失敗',
                text: error.response?.data?.message || '請稍後再試',
                confirmButtonText: '確定'
            });
        }
    };

    return (
        <Modal
            open={true}
            onClose={onClose}
            opacity={true}
            position="justify-center items-center"
        >
            <div className="p-component-md-lg">
                <div className="border-b-2 border-gray-200 pb-3 mb-4">
                    <h3 className="text-h2 font-bold text-gray-800">{announcement.title}</h3>
                    <p className="text-body-sm text-gray-500 mt-2">
                        由 <strong>{announcement.author}</strong> 發布於 {new Date(announcement.createdAt).toLocaleString('zh-TW', { dateStyle: 'long', timeStyle: 'short' })}
                    </p>
                </div>
                <p className="text-gray-700 mb-6 whitespace-pre-wrap leading-relaxed">{announcement.content}</p>
                <div className="flex justify-between items-center gap-stack-sm">
                    {role === "teacher" && (
                        <button
                            className="flex items-center gap-2 px-btn-x py-btn-y bg-red-500 text-white rounded-lg hover:bg-red-600 hover:shadow-lg transition-all duration-fast"
                            onClick={handleDeleteAnnouncement}
                        >
                            <Trash2 className="h-4 w-4" />
                            刪除公告
                        </button>
                    )}
                    <div className={`${role === "teacher" ? 'ml-auto' : 'text-right w-full'}`}>
                        <button
                            className="px-btn-x-lg py-btn-y-lg bg-[#5BA491] text-white rounded-lg hover:bg-[#5BA491]/90 hover:shadow-lg transition-all duration-fast"
                            onClick={onClose}
                        >關閉</button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
