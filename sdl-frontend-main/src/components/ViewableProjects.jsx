import React, { useState, useEffect } from 'react';
import { FaEye, FaUsers, FaCalendarAlt, FaGraduationCap, FaArrowRight } from 'react-icons/fa';
import { useQuery } from 'react-query';
import { getAllProject } from '../../api/project';
import { useNavigate } from 'react-router-dom';
import dateFormat from 'dateformat';
import Loader from '../Loader';

/**
 * 學生端觀摩專案區塊組件
 * 顯示學生可觀摩的其他班級專案
 */
const ViewableProjects = () => {
    const navigate = useNavigate();
    const userClass = localStorage.getItem('userClass') || 'defaultClass'; // 假設儲存在 localStorage
    const [expandedCard, setExpandedCard] = useState(null);

    // 取得可觀摩的專案
    const { 
        data: viewableProjects, 
        isLoading, 
        error 
    } = useQuery(
        ['viewableProjects', userClass], 
        () => getAllProject({ params: { viewable_by: userClass } }),
        {
            staleTime: 5 * 60 * 1000, // 5分鐘快取
        }
    );

    const handleViewProject = (projectId) => {
        // 導航到專案頁面，並帶上觀摩模式參數
        navigate(`/project/${projectId}?mode=viewing`);
    };

    const toggleCardExpansion = (projectId) => {
        setExpandedCard(expandedCard === projectId ? null : projectId);
    };

    if (isLoading) {
        return (
            <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center space-x-2 mb-4">
                    <FaEye className="text-blue-600 text-lg" />
                    <h3 className="text-lg font-semibold text-gray-800">觀摩專案</h3>
                </div>
                <Loader />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center space-x-2 mb-4">
                    <FaEye className="text-blue-600 text-lg" />
                    <h3 className="text-lg font-semibold text-gray-800">觀摩專案</h3>
                </div>
                <div className="text-center py-8 text-gray-500">
                    載入觀摩專案時發生錯誤
                </div>
            </div>
        );
    }

    if (!viewableProjects?.projects || viewableProjects.projects.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center space-x-2 mb-4">
                    <FaEye className="text-blue-600 text-lg" />
                    <h3 className="text-lg font-semibold text-gray-800">觀摩專案</h3>
                </div>
                <div className="text-center py-8 text-gray-500">
                    <FaGraduationCap className="mx-auto text-4xl mb-3 text-gray-300" />
                    <p className="text-lg mb-2">目前沒有可觀摩的專案</p>
                    <p className="text-sm">等待老師開放其他班級的專案供觀摩學習</p>
                </div>
            </div>
        );
    }

    // 過濾掉使用者自己參與的專案
    const meId = String(localStorage.getItem('id') || '');
    const meName = localStorage.getItem('username') || '';
    const safeProjects = Array.isArray(viewableProjects?.projects) ? viewableProjects.projects : [];
    const filteredProjects = safeProjects.filter(p => {
        if (!Array.isArray(p?.members)) return true; // 若無成員資訊，保留顯示（後端可補強）
        return !p.members.some(m => String(m?.id ?? '') === meId || (m?.username || '') === meName);
    });

    return (
        <div className="bg-white rounded-lg shadow-sm">
            {/* 標題區域 */}
            <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <FaEye className="text-blue-600 text-lg" />
                        <h3 className="text-lg font-semibold text-gray-800">觀摩專案</h3>
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                            {filteredProjects.length} 個專案
                        </span>
                    </div>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                    觀摩其他班級的專案，學習不同的做法與想法
                </p>
            </div>

            {/* 專案卡片網格 */}
            <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProjects.map((project) => (
                        <div
                            key={project.id}
                            className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-lg hover:shadow-lg transition-all duration-300 overflow-hidden group"
                        >
                            {/* 專案標題區域 */}
                            <div className="p-4 border-b border-gray-100">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-lg font-semibold text-gray-800 truncate group-hover:text-blue-600 transition-colors">
                                            {project.name}
                                        </h4>
                                        <p className="text-sm text-gray-600 mt-1">
                                            指導老師：{project.mentor}
                                        </p>
                                    </div>
                                    <div className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                                        觀摩
                                    </div>
                                </div>
                            </div>

                            {/* 專案描述 */}
                            <div className="p-4 space-y-3">
                                <p className={`text-sm text-gray-600 ${
                                    expandedCard === project.id ? '' : 'line-clamp-2'
                                }`}>
                                    {project.describe}
                                </p>

                                {project.describe && project.describe.length > 100 && (
                                    <button
                                        onClick={() => toggleCardExpansion(project.id)}
                                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                    >
                                        {expandedCard === project.id ? '收起' : '展開'}
                                    </button>
                                )}

                                {/* 專案資訊 */}
                                <div className="flex items-center justify-between text-xs text-gray-500">
                                    <div className="flex items-center space-x-1">
                                        <FaUsers className="text-gray-400" />
                                        <span>{project.members?.length || 0} 位成員</span>
                                    </div>
                                    {project.createdAt && (
                                        <div className="flex items-center space-x-1">
                                            <FaCalendarAlt className="text-gray-400" />
                                            <span>{dateFormat(new Date(project.createdAt), 'mm/dd')}</span>
                                        </div>
                                    )}
                                </div>

                                {/* 成員列表 */}
                                {project.members && project.members.length > 0 && (
                                    <div className="pt-2 border-t border-gray-100">
                                        <p className="text-xs text-gray-500 mb-2">專案成員：</p>
                                        <div className="flex flex-wrap gap-1">
                                            {project.members.slice(0, 3).map((member, index) => (
                                                <span
                                                    key={member.id || index}
                                                    className="inline-flex items-center text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full"
                                                >
                                                    {member.username}
                                                    {member.class && (
                                                        <span className="ml-1 text-gray-500">
                                                            ({member.class})
                                                        </span>
                                                    )}
                                                </span>
                                            ))}
                                            {project.members.length > 3 && (
                                                <span className="text-xs text-gray-500 px-2 py-1">
                                                    +{project.members.length - 3} 位
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 觀摩按鈕 */}
                            <div className="p-4 bg-gray-50 border-t border-gray-100">
                                <button
                                    onClick={() => handleViewProject(project.id)}
                                    className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors duration-200 group"
                                >
                                    <FaEye className="text-sm" />
                                    <span className="text-sm font-medium">開始觀摩</span>
                                    <FaArrowRight className="text-sm transform group-hover:translate-x-1 transition-transform duration-200" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 底部提示 */}
            <div className="px-6 pb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                <FaEye className="text-white text-xs" />
                            </div>
                        </div>
                        <div className="flex-1 text-sm text-blue-800">
                            <p className="font-medium mb-1">觀摩模式說明</p>
                            <p>在觀摩模式下，您可以瀏覽其他專案的所有內容，但無法進行編輯或留言。</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewableProjects;
