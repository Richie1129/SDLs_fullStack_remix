import React, { useState, useEffect } from 'react';
import { Bell, MessageCircle, Trash2 } from 'lucide-react';
import Modal from './Modal';
import Swal from 'sweetalert2';
import { useQuery } from 'react-query';
import { getAnnouncements, createAnnouncement, deleteAnnouncement } from '../api/announcement';
import { getProjectUser, batchGetProjectUsers } from '../api/users';
import { getProjectsByMentor } from '../api/project'; // 新增引入
import { socket } from '../utils/socket';
import { getCurrentUsername, addUserUpdateListener } from '../utils/userUtils';

// 日期格式化工具函式
const formatDistanceToNow = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.round((now - date) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);

    if (seconds < 60) return `${seconds} 秒前`;
    if (minutes < 60) return `${minutes} 分鐘前`;
    if (hours < 24) return `${hours} 小時前`;
    if (days < 7) return `${days} 天前`;
    return date.toLocaleDateString('zh-TW');
};


export default function Announcement({ projectId, role, projectList }) {
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [newNotificationModalOpen, setNewNotificationModalOpen] = useState(false);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
    
    // 新增狀態管理
    const [announcementMode, setAnnouncementMode] = useState('project'); // 'project' 或 'student'
    const [selectedTarget, setSelectedTarget] = useState('all'); // 選中的專案或學生ID
    const [availableStudents, setAvailableStudents] = useState([]); // 可用的學生列表
    const [teacherProjects, setTeacherProjects] = useState([]); // 教師的專案列表
    const [projectMembersMap, setProjectMembersMap] = useState({}); // 專案成員對應表
    const [studentProjectsMap, setStudentProjectsMap] = useState({}); // 學生專案對應表

    // 當 projectId 改變時，重新獲取公告
    const { data: announcementsData, error: announcementsError } = useQuery(
        ['announcements', projectId],
        () => getAnnouncements(projectId),
        {
            onSuccess: (data) => {
                setNotifications(data);
            },
            // 移除 enabled 限制，讓 Overview 頁面也能獲取公告
        }
    );

    // 處理 socket.io 的公告接收和刪除
    useEffect(() => {
        const handleReceiveAnnouncement = (data) => {
            console.log("從 socket 收到公告:", data);
            setNotifications((prev) => {
                if (prev.find(n => n.id === data.id)) {
                    return prev;
                }
                return [data, ...prev];
            });
        };

        const handleAnnouncementDeleted = (data) => {
            console.log("從 socket 收到公告刪除通知:", data);
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
    }, [selectedAnnouncement]);

    // 當 projectId 變更時，加入或離開對應的 socket room
    useEffect(() => {
        if (projectId) {
            console.log(`加入 socket 房間: project-${projectId}`);
            socket.emit('join_project', projectId);
        }

        return () => {
            if (projectId) {
                console.log(`離開 socket 房間: project-${projectId}`);
                socket.emit('leave_project', projectId);
            }
        };
    }, [projectId]);

    // 獲取教師指導的專案和學生資料
    useEffect(() => {
        const fetchTeacherData = async () => {
            if (role !== 'teacher') return;
            
            const userName = getCurrentUsername();
            if (!userName) {
                console.error("未找到教師名稱");
                return;
            }

            try {
                console.log("正在獲取教師指導的專案:", userName);
                
                // 使用現有的 API 獲取教師指導的專案
                const projects = await getProjectsByMentor(userName);
                console.log("教師指導的專案:", projects);
                setTeacherProjects(projects || []);

                // 獲取所有專案的學生資料
                if (projects && projects.length > 0) {
                    const projectMembers = {}; // 專案成員對應表
                    const studentProjects = {}; // 學生專案對應表
                    const allStudents = []; // 所有學生列表
                    const projectIds = projects.map(project => project.id).filter(Boolean);

                    try {
                        const usersByProject = await batchGetProjectUsers(projectIds);
                        projects.forEach((project) => {
                            const students = usersByProject?.[project.id] || [];
                            projectMembers[project.id] = students;
                            students.forEach(student => {
                                if (!studentProjects[student.id]) {
                                    studentProjects[student.id] = [];
                                }
                                studentProjects[student.id].push({
                                    id: project.id,
                                    name: project.name
                                });
                                allStudents.push({
                                    ...student,
                                    projectId: project.id,
                                    projectName: project.name
                                });
                            });
                        });
                    } catch (error) {
                        console.error("批次獲取學生失敗，改用逐專案請求:", error);
                        const studentPromises = projects.map(async (project) => {
                            try {
                                const students = await getProjectUser(project.id);
                                projectMembers[project.id] = students || [];
                                if (students) {
                                    students.forEach(student => {
                                        if (!studentProjects[student.id]) {
                                            studentProjects[student.id] = [];
                                        }
                                        studentProjects[student.id].push({
                                            id: project.id,
                                            name: project.name
                                        });
                                        allStudents.push({
                                            ...student,
                                            projectId: project.id,
                                            projectName: project.name
                                        });
                                    });
                                }
                                return students || [];
                            } catch (innerError) {
                                console.error(`獲取專案 ${project.id} 學生失敗:`, innerError);
                                projectMembers[project.id] = [];
                                return [];
                            }
                        });

                        await Promise.all(studentPromises);
                    }
                    
                    // 去重複學生（同一個學生可能在多個專案中）
                    const uniqueStudents = Array.from(
                        new Map(allStudents.map(student => [student.id, student])).values()
                    );
                    
                    setProjectMembersMap(projectMembers);
                    setStudentProjectsMap(studentProjects);
                    setAvailableStudents(uniqueStudents);
                    
                    console.log("專案成員對應表:", projectMembers);
                    console.log("學生專案對應表:", studentProjects);
                    console.log("所有可用學生:", uniqueStudents);
                }
            } catch (error) {
                console.error("獲取教師資料失敗:", error);
            }
        };

        fetchTeacherData();
    }, [role]);

    const handleAddNotification = () => {
        setSelectedTarget(projectId || 'all');
        setAnnouncementMode('project');
        setNewNotificationModalOpen(true);
    };

    // 處理模式切換
    const handleModeChange = (mode) => {
        setAnnouncementMode(mode);
        setSelectedTarget(mode === 'project' ? 'all' : '');
    };

    const handleSaveNotification = async (newTitle, newDescription) => {
        if (!selectedTarget) {
            Swal.fire('錯誤', '請選擇發布對象後再發佈公告', 'warning');
            return;
        }

        let payload;

        if (announcementMode === 'project') {
            // 專案模式：發布給特定專案或所有專案
            payload = {
                title: newTitle,
                content: newDescription,
                author: getCurrentUsername() || 'Unknown Author',
                projectId: selectedTarget === 'all' ? null : selectedTarget,
            };
        } else {
            // 學生模式：發布給特定學生
            // 我們使用 projectId 欄位來儲存學生ID，但在後端需要特殊處理
            payload = {
                title: newTitle,
                content: newDescription,
                author: getCurrentUsername() || 'Unknown Author',
                projectId: `student_${selectedTarget}`, // 用前綴標識這是學生模式
            };
        }

        try {
            await createAnnouncement(payload);
            setNewNotificationModalOpen(false);
            Swal.fire('成功', '公告已成功發佈', 'success');
        } catch (error) {
            console.error('公告發佈失敗:', error);
            Swal.fire('公告發佈失敗', error.response?.data?.message || '請稍後再試', 'error');
        }
    };

    // 處理刪除公告
    const handleDeleteAnnouncement = async (announcementId) => {
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

        if (!result.isConfirmed) {
            return;
        }

        try {
            await deleteAnnouncement(announcementId);

            // 本地更新：從列表中移除已刪除的公告
            setNotifications((prev) => prev.filter(n => n.id !== announcementId));

            // 關閉公告詳情 Modal
            setSelectedAnnouncement(null);

            Swal.fire({
                icon: 'success',
                title: '刪除成功',
                text: '公告已成功刪除',
                timer: 2000,
                showConfirmButton: false
            });
        } catch (error) {
            console.error('刪除公告失敗:', error);

            const errorMessage = error.response?.data?.message || '請稍後再試';
            const errorCode = error.response?.data?.code;

            // 處理權限錯誤
            if (errorCode === 'PERMISSION_DENIED') {
                Swal.fire({
                    icon: 'error',
                    title: '權限不足',
                    text: errorMessage,
                    confirmButtonText: '確定'
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: '刪除失敗',
                    text: errorMessage,
                    confirmButtonText: '確定'
                });
            }
        }
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
                                            <span>{formatDistanceToNow(notification.createdAt)}</span>
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
                                onClick={handleAddNotification}
                            >
                                + 發佈新公告
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* 新增公告 Modal */}
            <Modal 
                open={newNotificationModalOpen} 
                onClose={() => setNewNotificationModalOpen(false)}
                opacity={true}
                position="justify-center items-center"
            >
                <div className="p-component-md-lg">
                    <h3 className="text-h2 font-semibold mb-6 text-center">發佈新公告</h3>
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        const newTitle = e.target.elements.newTitle.value;
                        const newDescription = e.target.elements.newDescription.value;
                        handleSaveNotification(newTitle, newDescription);
                    }}>
                        {/* 發布模式選擇 */}
                        <div className="mb-4">
                            <label className="block text-body-sm font-medium text-gray-700 mb-2">
                                發布模式
                            </label>
                            <div className="flex space-x-stack-sm">
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        name="announcementMode"
                                        value="project"
                                        checked={announcementMode === 'project'}
                                        onChange={(e) => handleModeChange(e.target.value)}
                                        className="mr-2"
                                    />
                                    <span className="text-body-sm">按專案發布</span>
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        name="announcementMode"
                                        value="student"
                                        checked={announcementMode === 'student'}
                                        onChange={(e) => handleModeChange(e.target.value)}
                                        className="mr-2"
                                    />
                                    <span className="text-body-sm">按學生發布</span>
                                </label>
                            </div>
                        </div>

                        {/* 發布對象選擇 */}
                        <div className="mb-4">
                            <label htmlFor="targetSelect" className="block text-body-sm font-medium text-gray-700 mb-1">
                                {announcementMode === 'project' ? '選擇專案' : '選擇學生'}
                            </label>
                            <select
                                id="targetSelect"
                                value={selectedTarget}
                                onChange={(e) => setSelectedTarget(e.target.value)}
                                className="w-full p-component-sm border border-gray-300 rounded-lg"
                                required
                            >
                                <option value="">
                                    {announcementMode === 'project' ? '請選擇專案...' : '請選擇學生...'}
                                </option>
                                
                                {announcementMode === 'project' ? (
                                    <>
                                        <option value="all">全部專案</option>
                                        {teacherProjects.map((project) => {
                                            const members = projectMembersMap[project.id] || [];
                                            const memberNames = members.map(m => m.username).join(', ');
                                            return (
                                                <option key={project.id} value={project.id}>
                                                    {project.name} ({members.length}人: {memberNames || '無成員'})
                                                </option>
                                            );
                                        })}
                                    </>
                                ) : (
                                    availableStudents.map((student) => {
                                        const projects = studentProjectsMap[student.id] || [];
                                        const projectNames = projects.map(p => p.name).join(', ');
                                        return (
                                            <option key={student.id} value={student.id}>
                                                {student.username} (參與專案: {projectNames || '無專案'})
                                            </option>
                                        );
                                    })
                                )}
                            </select>
                        </div>

                        {/* 顯示選中對象的詳細資訊 */}
                        {selectedTarget && selectedTarget !== 'all' && (
                            <div className="mb-4 p-component-sm bg-blue-50 border border-blue-200 rounded-lg">
                                <h4 className="text-body-sm font-semibold text-blue-800 mb-2">
                                    {announcementMode === 'project' ? '專案詳情' : '學生詳情'}
                                </h4>
                                {announcementMode === 'project' ? (
                                    <div>
                                        {(() => {
                                            const project = teacherProjects.find(p => p.id.toString() === selectedTarget);
                                            const members = projectMembersMap[selectedTarget] || [];
                                            return (
                                                <div>
                                                    <p className="text-body-sm text-blue-700">
                                                        <strong>專案名稱：</strong>{project?.name || '未知專案'}
                                                    </p>
                                                    <p className="text-body-sm text-blue-700">
                                                        <strong>成員人數：</strong>{members.length} 人
                                                    </p>
                                                    {members.length > 0 && (
                                                        <p className="text-body-sm text-blue-700">
                                                            <strong>成員名單：</strong>
                                                            {members.map(member => member.username).join('、')}
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                ) : (
                                    <div>
                                        {(() => {
                                            const student = availableStudents.find(s => s.id.toString() === selectedTarget);
                                            const projects = studentProjectsMap[selectedTarget] || [];
                                            return (
                                                <div>
                                                    <p className="text-body-sm text-blue-700">
                                                        <strong>學生姓名：</strong>{student?.username || '未知學生'}
                                                    </p>
                                                    <p className="text-body-sm text-blue-700">
                                                        <strong>參與專案：</strong>{projects.length} 個
                                                    </p>
                                                    {projects.length > 0 && (
                                                        <p className="text-body-sm text-blue-700">
                                                            <strong>專案列表：</strong>
                                                            {projects.map(project => project.name).join('、')}
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mb-4">
                            <label htmlFor="newTitle" className="block text-body-sm font-medium text-gray-700 mb-1">
                                標題
                            </label>
                            <input
                                type="text"
                                id="newTitle"
                                name="newTitle"
                                placeholder="請輸入公告標題"
                                className="w-full p-component-sm border border-gray-300 rounded-lg"
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="newDescription" className="block text-body-sm font-medium text-gray-700 mb-1">
                                內容
                            </label>
                            <textarea
                                id="newDescription"
                                name="newDescription"
                                placeholder="請輸入公告內容"
                                rows="4"
                                className="w-full p-component-sm border border-gray-300 rounded-lg"
                                required
                            ></textarea>
                        </div>
                        <div className="flex justify-between">
                            <button
                                type="button"
                                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400"
                                onClick={() => setNewNotificationModalOpen(false)}
                            >
                                取消
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-[#5BA491] text-white rounded-lg hover:bg-opacity-90"
                            >
                                發佈公告
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* 公告詳情 Modal */}
            {selectedAnnouncement && (
                <Modal
                    open={true}
                    onClose={() => setSelectedAnnouncement(null)}
                    opacity={true}
                    position="justify-center items-center"
                >
                    <div className="p-component-md-lg">
                        <div className="border-b-2 border-gray-200 pb-3 mb-4">
                            <h3 className="text-h2 font-bold text-gray-800">{selectedAnnouncement.title}</h3>
                            <p className="text-body-sm text-gray-500 mt-2">
                                由 <strong>{selectedAnnouncement.author}</strong> 發布於 {new Date(selectedAnnouncement.createdAt).toLocaleString('zh-TW', { dateStyle: 'long', timeStyle: 'short' })}
                            </p>
                        </div>
                        <p className="text-gray-700 mb-6 whitespace-pre-wrap leading-relaxed">{selectedAnnouncement.content}</p>
                        <div className="flex justify-between items-center gap-stack-sm">
                            {/* 刪除按鈕（只有教師可見） */}
                            {role === "teacher" && (
                                <button
                                    className="flex items-center gap-2 px-btn-x py-btn-y bg-red-500 text-white rounded-lg hover:bg-red-600 hover:shadow-lg transition-all duration-fast"
                                    onClick={() => handleDeleteAnnouncement(selectedAnnouncement.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                    刪除公告
                                </button>
                            )}
                            <div className={`${role === "teacher" ? 'ml-auto' : 'text-right w-full'}`}>
                                <button
                                    className="px-btn-x-lg py-btn-y-lg bg-[#5BA491] text-white rounded-lg hover:bg-[#5BA491]/90 hover:shadow-lg transition-all duration-fast"
                                    onClick={() => setSelectedAnnouncement(null)}
                                >
                                    關閉
                                </button>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
} 
