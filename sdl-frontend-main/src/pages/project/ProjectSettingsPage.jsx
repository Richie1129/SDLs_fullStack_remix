import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FaCog, FaEye, FaUsers, FaChartBar } from 'react-icons/fa';
import ProjectViewingSettings from '../../components/ProjectViewingSettings';
import { getProject } from '../../api/project';

/**
 * 專案設定頁面 - 教師可在此管理專案的各種設定，包含觀摩權限
 */
const ProjectSettingsPage = () => {
    const { projectId } = useParams();
    const [project, setProject] = useState(null);
    const [activeTab, setActiveTab] = useState('general');
    const [showViewingSettings, setShowViewingSettings] = useState(false);

    useEffect(() => {
        const fetchProject = async () => {
            try {
                const projectData = await getProject(projectId);
                setProject(projectData);
            } catch (error) {
                console.error('取得專案資料失敗:', error);
            }
        };
        fetchProject();
    }, [projectId]);

    const tabs = [
        { id: 'general', name: '基本設定', icon: FaCog },
        { id: 'viewing', name: '觀摩權限', icon: FaEye },
        { id: 'members', name: '成員管理', icon: FaUsers },
        { id: 'analytics', name: '數據分析', icon: FaChartBar },
    ];

    if (!project) return <div>載入中...</div>;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* 頁面標題 */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{project.name} - 專案設定</h1>
                            <p className="mt-1 text-sm text-gray-500">管理專案的各項設定與權限</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="lg:grid lg:grid-cols-12 lg:gap-x-8">
                    {/* 側邊欄選單 */}
                    <div className="lg:col-span-3">
                        <nav className="space-y-1 bg-white rounded-lg shadow p-4">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                            activeTab === tab.id
                                                ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-600'
                                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                        }`}
                                    >
                                        <Icon className="mr-3 text-lg" />
                                        {tab.name}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    {/* 主要內容區域 */}
                    <div className="mt-8 lg:mt-0 lg:col-span-9">
                        <div className="bg-white rounded-lg shadow">
                            {/* 觀摩權限設定頁籤 */}
                            {activeTab === 'viewing' && (
                                <div className="p-6">
                                    <div className="mb-6">
                                        <h2 className="text-lg font-semibold text-gray-900 mb-2">觀摩權限管理</h2>
                                        <p className="text-gray-600">設定哪些班級可以觀摩此專案的內容</p>
                                    </div>

                                    {/* 目前觀摩狀態 */}
                                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <div className={`w-4 h-4 rounded-full ${project.is_open_for_viewing ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                                                <div>
                                                    <h3 className="font-medium">
                                                        {project.is_open_for_viewing ? '已開放觀摩' : '未開放觀摩'}
                                                    </h3>
                                                    <p className="text-sm text-gray-600">
                                                        {project.is_open_for_viewing 
                                                            ? `${project.allowed_classes?.length || 0} 個班級可觀摩`
                                                            : '目前僅限專案成員可見'
                                                        }
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setShowViewingSettings(true)}
                                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                                            >
                                                修改設定
                                            </button>
                                        </div>
                                    </div>

                                    {/* 可觀摩班級列表 */}
                                    {project.is_open_for_viewing && project.allowed_classes && (
                                        <div>
                                            <h4 className="font-medium text-gray-900 mb-3">可觀摩的班級</h4>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                {project.allowed_classes.map((className, index) => (
                                                    <div
                                                        key={index}
                                                        className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center"
                                                    >
                                                        <div className="text-blue-800 font-medium">{className}</div>
                                                        <div className="text-blue-600 text-sm">可觀摩</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* 觀摩功能說明 */}
                                    <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <h4 className="font-medium text-blue-900 mb-2">觀摩功能說明</h4>
                                        <ul className="text-sm text-blue-800 space-y-1">
                                            <li>• 觀摩者可以瀏覽專案的所有內容模組</li>
                                            <li>• 觀摩者無法編輯、留言或進行任何修改</li>
                                            <li>• 觀摩權限可隨時開啟或關閉</li>
                                            <li>• 可選擇特定班級進行觀摩授權</li>
                                        </ul>
                                    </div>
                                </div>
                            )}

                            {/* 其他頁籤內容 */}
                            {activeTab === 'general' && (
                                <div className="p-6">
                                    <h2 className="text-lg font-semibold mb-4">基本設定</h2>
                                    {/* 基本設定內容 */}
                                </div>
                            )}

                            {activeTab === 'members' && (
                                <div className="p-6">
                                    <h2 className="text-lg font-semibold mb-4">成員管理</h2>
                                    {/* 成員管理內容 */}
                                </div>
                            )}

                            {activeTab === 'analytics' && (
                                <div className="p-6">
                                    <h2 className="text-lg font-semibold mb-4">數據分析</h2>
                                    {/* 數據分析內容 */}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 觀摩權限設定模態框 */}
            {showViewingSettings && (
                <ProjectViewingSettings
                    project={project}
                    onClose={() => {
                        setShowViewingSettings(false);
                        // 重新載入專案資料以獲取最新的觀摩設定
                        window.location.reload();
                    }}
                />
            )}
        </div>
    );
};

export default ProjectSettingsPage;
