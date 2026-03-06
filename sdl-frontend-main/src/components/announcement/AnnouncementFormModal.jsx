import React, { useState } from 'react';
import Modal from '../Modal';
import Swal from 'sweetalert2';
import { createAnnouncement } from '../../api/announcement';

export default function AnnouncementFormModal({ 
    open, 
    onClose, 
    initialProjectId,
    teacherData 
}) {
    const { teacherProjects = [], availableStudents = [], projectMembersMap = {}, studentProjectsMap = {} } = teacherData || {};
    const [announcementMode, setAnnouncementMode] = useState('project');
    const [selectedTarget, setSelectedTarget] = useState(initialProjectId || 'all');

    const handleModeChange = (mode) => {
        setAnnouncementMode(mode);
        setSelectedTarget(mode === 'project' ? 'all' : '');
    };

    const handleSaveNotification = async (e) => {
        e.preventDefault();
        const newTitle = e.target.elements.newTitle.value;
        const newDescription = e.target.elements.newDescription.value;

        if (!selectedTarget) {
            Swal.fire('錯誤', '請選擇發布對象後再發佈公告', 'warning');
            return;
        }

        let payload;
        if (announcementMode === 'project') {
            payload = {
                title: newTitle,
                content: newDescription,
                projectId: selectedTarget === 'all' ? null : selectedTarget,
            };
        } else {
            payload = {
                title: newTitle,
                content: newDescription,
                projectId: `student_${selectedTarget}`,
            };
        }

        try {
            await createAnnouncement(payload);
            onClose();
            Swal.fire('成功', '公告已成功發佈', 'success');
        } catch (error) {
            console.error('公告發佈失敗:', error);
            Swal.fire('公告發佈失敗', error.response?.data?.message || '請稍後再試', 'error');
        }
    };

    return (
        <Modal 
            open={open} 
            onClose={onClose}
            opacity={true}
            position="justify-center items-center"
        >
            <div className="p-component-md-lg">
                <h3 className="text-h2 font-semibold mb-6 text-center">發佈新公告</h3>
                <form onSubmit={handleSaveNotification}>
                    <div className="mb-4">
                        <label className="block text-body-sm font-medium text-gray-700 mb-2">發布模式</label>
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
                            <option value="">{announcementMode === 'project' ? '請選擇專案...' : '請選擇學生...'}</option>
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
                                                <p className="text-body-sm text-blue-700"><strong>專案名稱：</strong>{project?.name || '未知專案'}</p>
                                                <p className="text-body-sm text-blue-700"><strong>成員人數：</strong>{members.length} 人</p>
                                                {members.length > 0 && (
                                                    <p className="text-body-sm text-blue-700"><strong>成員名單：</strong>{members.map(member => member.username).join('、')}</p>
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
                                                <p className="text-body-sm text-blue-700"><strong>學生姓名：</strong>{student?.username || '未知學生'}</p>
                                                <p className="text-body-sm text-blue-700"><strong>參與專案：</strong>{projects.length} 個</p>
                                                {projects.length > 0 && (
                                                    <p className="text-body-sm text-blue-700"><strong>專案列表：</strong>{projects.map(project => project.name).join('、')}</p>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mb-4">
                        <label htmlFor="newTitle" className="block text-body-sm font-medium text-gray-700 mb-1">標題</label>
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
                        <label htmlFor="newDescription" className="block text-body-sm font-medium text-gray-700 mb-1">內容</label>
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
                            onClick={onClose}
                        >取消</button>
                        <button
                            type="submit"
                            className="px-btn-x py-btn-y bg-customgreen text-white rounded-lg hover:bg-customgreen/90"
                        >發佈公告</button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}
