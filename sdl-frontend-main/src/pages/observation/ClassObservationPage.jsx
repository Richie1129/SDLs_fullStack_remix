import React, { useState, useEffect,useMemo } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaUsers, FaSearch, FaFilter, FaTimes, FaChalkboardTeacher, FaCog, FaCheck, FaProjectDiagram } from 'react-icons/fa';
import TopBar from '../../components/TopBar';
import SideBar from '../../components/SideBar';
import { getProjectsByMentor, getAllClasses, getClassUsersAndProjects, updateViewingSettings } from '../../api/project';
import Swal from 'sweetalert2';

/**
 * 教師跨班觀摩頁面
 */
const ClassObservationPage = () => {
    const navigate = useNavigate();
    const [selectedProject, setSelectedProject] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [mentorName, setMentorName] = useState('');
    const [classData, setClassData] = useState(null); // 存儲選中班級的用戶和專案資料
    const [showViewingSettings, setShowViewingSettings] = useState(false); // 控制觀摩設定模態框
    const [selectedProjectForSetting, setSelectedProjectForSetting] = useState(null);
    const [allowedClasses, setAllowedClasses] = useState([]);
    const [classSearch, setClassSearch] = useState('');
    
    // 取得當前用戶資訊和指導老師名稱
    useEffect(() => {
        // 教師直接用自己的名稱作為指導老師
        const userName = localStorage.getItem('username');
        const userRole = localStorage.getItem('role');
        
        if (userRole === 'teacher') {
            setMentorName(userName);
            setCurrentUser({ username: userName, role: userRole });
        } else {
            console.warn('觀摩功能僅限教師使用');
        }
    }, []);

    // 取得所有班級列表
    const { data: classesData, isLoading: isLoadingClasses, error: classesError } = useQuery(
        'availableClasses', 
        getAllClasses,
        {
            onSuccess: (data) => {
                console.log('班級列表查詢成功:', data);
            },
            onError: (error) => {
                console.error('班級列表查詢失敗:', error);
                console.error('錯誤詳情:', {
                    message: error.message,
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    data: error.response?.data
                });
            },
            retry: 1, // 只重試一次
            staleTime: 0, // 不使用緩存
            cacheTime: 0 // 不緩存結果
        }
    );

    // 當選擇班級時，獲取該班級的用戶和專案
    const { data: selectedClassData, isLoading: isLoadingClassData } = useQuery(
        ['classUsersProjects', selectedClass],
        () => selectedClass ? getClassUsersAndProjects(selectedClass) : null,
        {
            enabled: !!selectedClass,
            onSuccess: (data) => {
                console.log(`${selectedClass} 班級資料:`, data);
                // 正規化資料：將後端的 seat_number 轉為前端使用的 seatNumber
                const mapUserSeatNumber = (u = {}) => ({
                    ...u,
                    seatNumber: u.seatNumber ?? u.seat_number ?? null,
                });

                const normalizedUsers = Array.isArray(data?.users)
                    ? data.users.map(mapUserSeatNumber)
                    : [];

                // 一些版本的後端在 projects 內提供 users 或 classMembers
                const normalizedProjects = Array.isArray(data?.projects)
                    ? data.projects.map(p => {
                        const projectUsers = Array.isArray(p?.users)
                            ? p.users
                            : (Array.isArray(p?.classMembers) ? p.classMembers : []);
                        const mappedUsers = projectUsers.map(mapUserSeatNumber);
                        return {
                            ...p,
                            // 確保前端後續統一讀取 project.users
                            users: mappedUsers,
                            classMembers: Array.isArray(p?.classMembers)
                                ? p.classMembers.map(mapUserSeatNumber)
                                : undefined,
                        };
                    })
                    : [];

                setClassData({
                    ...data,
                    users: normalizedUsers,
                    projects: normalizedProjects,
                });
            },
            onError: (error) => {
                console.error(`獲取 ${selectedClass} 班級資料失敗:`, error);
            }
        }
    );

    // 取得指導老師的所有專案
    const { 
        data: mentorProjects, 
        isLoading: isLoadingProjects, 
        error: projectsError,
        refetch: refetchProjects 
    } = useQuery(
        ['mentorProjects', mentorName],
        () => mentorName ? getProjectsByMentor(mentorName) : Promise.resolve([]),
        {
            enabled: !!mentorName,
            onError: (error) => {
                console.error('Failed to fetch mentor projects:', error);
            }
        }
    );

    // 過濾的專案和用戶
    const filteredClassProjects = useMemo(() => {
        if (!classData?.projects) return [];
        
        const projects = selectedProject 
            ? classData.projects.filter(p => p.id === parseInt(selectedProject))
            : classData.projects;
            
        if (!searchTerm) return projects;
        
        return projects.filter(project => 
            project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            project.users?.some(user => 
                user.username.toLowerCase().includes(searchTerm.toLowerCase())
            )
        );
    }, [classData?.projects, selectedProject, searchTerm]);

    const filteredClassUsers = useMemo(() => {
        if (!classData?.users) return [];
        
        let users = classData.users;
        
        if (selectedProject) {
            const project = classData.projects.find(p => p.id === parseInt(selectedProject));
            users = project?.users || [];
        }
        
        if (!searchTerm) return users;
        
        return users.filter(user => 
            user.username.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [classData?.users, classData?.projects, selectedProject, searchTerm]);

    // 過濾可觀摩的專案（開放觀摩且允許指定班級）
    const viewableProjects = mentorProjects?.filter(project => 
        project.is_open_for_viewing && 
        project.allowed_classes && 
        selectedClass && 
        project.allowed_classes.includes(selectedClass)
    ) || [];

    // 進一步根據搜尋條件過濾
    const filteredProjects = viewableProjects.filter(project => 
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.describe.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleClassChange = (className) => {
        console.log('選擇班級:', className);
        setSelectedClass(className);
        setSelectedProject('');
        setSearchTerm('');
        setClassData(null); // 重置班級資料
    };

    const handleProjectChange = (projectId) => {
        setSelectedProject(projectId);
    };

    const handleProjectClick = (projectId) => {
        navigate(`/project/${projectId}/kanban?mode=observation`);
    };

    // 處理觀摩設定
    const handleOpenViewingSettings = (project) => {
        setSelectedProjectForSetting(project);
        setAllowedClasses(project.allowed_classes || []);
        setShowViewingSettings(true);
    };

    const handleSaveViewingSettings = async () => {
    if (!selectedProjectForSetting) return;
    
    try {
        await updateViewingSettings(selectedProjectForSetting.id, {
            is_open_for_viewing: allowedClasses.length > 0,
            allowed_classes: allowedClasses
        });
        
        // 重新載入專案資料
        refetchProjects();

        // 同步更新當前班級資料中的該專案，確保再次開啟時顯示正確狀態
        setClassData(prev => {
            if (!prev) return prev;
            const updated = {
                ...prev,
                projects: (prev.projects || []).map(p => 
                    p.id === selectedProjectForSetting.id
                        ? { ...p, is_open_for_viewing: allowedClasses.length > 0, allowed_classes: allowedClasses }
                        : p
                )
            };
            return updated;
        });

        setShowViewingSettings(false);

        // ✅ 成功提示
        Swal.fire({
            icon: 'success',
            title: '觀摩設定已更新！',
            showConfirmButton: false,
            timer: 1500
        });
    } catch (error) {
        console.error('更新觀摩設定失敗:', error);

        // ❌ 失敗提示
        Swal.fire({
            icon: 'error',
            title: '更新失敗',
            text: '請重試！'
        });
    }
};

    // GitHub Reviewers-like interactions
    const addClassForViewing = (className) => {
        setAllowedClasses(prev => (prev.includes(className) ? prev : [...prev, className]));
    };

    const removeClassForViewing = (className) => {
        setAllowedClasses(prev => prev.filter(c => c !== className));
    };

    return (
        <div className="relative h-screen bg-gray-100 overflow-hidden flex flex-col">
            <TopBar />

            <div className="flex flex-1 min-h-0 overflow-hidden">
                <SideBar />
                <main className="flex-1 flex flex-col min-h-0">
                    <div className="flex-1 overflow-y-auto">
                        <div className='px-4 sm:px-6 md:px-8 lg:px-10 xl:px-20 py-10'>
                            {/* 頁面標題 */}
                            <div className='mb-8'>
                                <div className='flex items-center space-x-3 mb-4'>
                                    <FaEye className='text-3xl text-blue-600' />
                                    <h1 className='text-3xl font-bold text-gray-800'>跨班專案觀摩</h1>
                                </div>
                                <p className='text-gray-600 text-lg'>
                                    讓同學探索 <span className="font-semibold text-blue-600">{mentorName}</span> 老師指導的專案作品，學習不同班級的創意與實作方法
                                </p>
                            </div>

                            {/* 篩選與選擇區域 */}
                            <div className='bg-white rounded-lg shadow-md p-6 mb-8'>
                                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                                    {/* 班級選擇 */}
                                    <div>
                                        <label className='block text-sm font-medium text-gray-700 mb-2'>
                                            <FaFilter className='inline mr-2' />
                                            選擇觀摩班級
                                        </label>
                                        <select
                                            value={selectedClass}
                                            onChange={(e) => handleClassChange(e.target.value)}
                                            className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                                        >
                                            <option value="">請選擇班級...</option>
                                            {classesData?.classes?.map((className) => (
                                                                                        <option key={className} value={className}>
                                            {className}
                                        </option>
                                            ))}
                                        </select>
                                        <p className='text-xs text-gray-500 mt-1'>
                                            選擇您要觀摩的班級，只會顯示該班級可觀摩的專案
                                        </p>
                                    </div>

                                    {/* 專案選擇 */}
                                    <div>
                                        <label className='block text-sm font-medium text-gray-700 mb-2'>
                                            <FaChalkboardTeacher className='inline mr-2' />
                                            選擇專案
                                        </label>
                                        <select
                                            value={selectedProject}
                                            onChange={(e) => handleProjectChange(e.target.value)}
                                            disabled={!selectedClass || viewableProjects.length === 0}
                                            className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed'
                                        >
                                            <option value="">
                                                {!selectedClass 
                                                    ? '請先選擇班級...' 
                                                    : viewableProjects.length === 0 
                                                        ? '該班級無可觀摩專案...'
                                                        : '請選擇專案...'
                                                }
                                            </option>
                                            {viewableProjects.map((project) => (
                                                <option key={project.id} value={project.id}>
                                                    {project.name}
                                                </option>
                                            ))}
                                        </select>
                                        <p className='text-xs text-gray-500 mt-1'>
                                            選擇您要觀摩的具體專案
                                        </p>
                                    </div>
                                </div>

                                {/* 搜尋框 */}
                                {selectedClass && viewableProjects.length > 0 && (
                                    <div className='mt-6'>
                                        <label className='block text-sm font-medium text-gray-700 mb-2'>
                                            <FaSearch className='inline mr-2' />
                                            搜尋專案
                                        </label>
                                        <div className='relative'>
                                            <input
                                                type="text"
                                                placeholder="搜尋專案名稱或描述..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className='w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                                            />
                                            {searchTerm && (
                                                <button
                                                    onClick={() => setSearchTerm('')}
                                                    className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600'
                                                >
                                                    <FaTimes />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 班級資料顯示區域 */}
                            {selectedClass && classData && (
                                <div className='bg-white rounded-lg shadow-md mb-8'>
                                    <div className='px-6 py-4 border-b border-gray-200'>
                                        <h2 className='text-xl font-semibold text-gray-800'>
                                            {selectedClass} 班級資料
                                        </h2>
                                    </div>
                                    <div className='p-6'>
                                        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
                                            {/* 班級成員 */}
                                            <div>
                                                <h3 className='text-lg font-medium text-gray-800 mb-4 flex items-center'>
                                                    <FaUsers className='mr-2 text-blue-600' />
                                                    班級成員 ({filteredClassUsers.length} 人)
                                                </h3>
                                                <div className='bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto'>
                                                    {filteredClassUsers.length === 0 ? (
                                                        <p className='text-gray-500 text-center py-4'>目前沒有成員資料</p>
                                                    ) : (
                                                        <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                                                            {filteredClassUsers.map((user) => (
                                                                <div key={user.id} className='bg-white rounded-lg p-3 shadow-sm'>
                                                                    <div className='text-sm font-medium text-gray-800'>{user.username}</div>
                                                                    <div className='text-xs text-gray-500'>
                                                                        座號: {user.seatNumber || '未設定'}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* 班級專案 */}
                                            <div>
                                                <h3 className='text-lg font-medium text-gray-800 mb-4 flex items-center'>
                                                    <FaProjectDiagram className='mr-2 text-green-600' />
                                                    班級專案 ({filteredClassProjects.length} 個)
                                                </h3>
                                                <div className='bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto'>
                                                    {filteredClassProjects.length === 0 ? (
                                                        <p className='text-gray-500 text-center py-4'>目前沒有專案資料</p>
                                                    ) : (
                                                        <div className='space-y-3'>
                                                            {filteredClassProjects.map((project) => (
                                                                <div key={project.id} className='bg-white rounded-lg p-4 shadow-sm border-l-4 border-blue-500'>
                                                                    <div className='flex items-start justify-between mb-2'>
                                                                        <h4 className='font-medium text-gray-800 text-sm'>{project.name}</h4>
                                                                        <div className='flex space-x-2 ml-2'>
                                                                            <button
                                                                                onClick={() => handleOpenViewingSettings(project)}
                                                                                className='bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs hover:bg-blue-200 transition-colors'
                                                                            >
                                                                                設定觀摩權限
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleProjectClick(project.id)}
                                                                                className='bg-green-100 text-green-800 px-2 py-1 rounded text-xs hover:bg-green-200 transition-colors'
                                                                            >
                                                                                檢視專案
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                    <p className='text-xs text-gray-600 mb-2'>{project.describe}</p>
                                                                    <div className='text-xs text-gray-500'>
                                                                        成員: {project.classMembers?.map(u => u.username).join(', ') || '無'}
                                                                    </div>
                                                                    <div className='text-xs text-gray-500 mt-1'>
                                                                        觀摩狀態: {project.is_open_for_viewing ? '開放' : '關閉'}
                                                                        {project.allowed_classes?.length > 0 && ` | 允許班級: ${project.allowed_classes.join(', ')}`}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 搜尋框 - 只在有選擇班級時顯示 */}
                            {selectedClass && (
                                <div className='bg-white rounded-lg shadow-md p-6 mb-8'>
                                    <label className='block text-sm font-medium text-gray-700 mb-2'>
                                        <FaSearch className='inline mr-2' />
                                        搜尋成員或專案
                                    </label>
                                    <div className='relative'>
                                        <input
                                            type="text"
                                            placeholder="搜尋成員姓名或專案名稱..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className='w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                                        />
                                        {searchTerm && (
                                            <button
                                                onClick={() => setSearchTerm('')}
                                                className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600'
                                            >
                                                <FaTimes />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* 觀摩設定Modal */}
                            {showViewingSettings && selectedProjectForSetting && (
                                <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
                                    <div className='bg-white rounded-lg shadow-xl max-w-md w-full mx-4'>
                                        <div className='px-6 py-4 border-b border-gray-200'>
                                            <h3 className='text-lg font-semibold text-gray-800'>
                                                設定專案觀摩權限
                                            </h3>
                                            <p className='text-sm text-gray-600 mt-1'>
                                                專案：{selectedProjectForSetting.name}
                                            </p>
                                        </div>
                                        <div className='p-6'>
                                            {/* 已選定班級 */}
                                            <div className='mb-4'>
                                                <div className='text-sm font-medium text-gray-700 mb-2'>已選定班級</div>
                                                {allowedClasses.length === 0 ? (
                                                    <div className='text-xs text-gray-500'>尚未選擇任何班級</div>
                                                ) : (
                                                    <div className='flex flex-wrap gap-2'>
                                                        {allowedClasses.map((cls) => (
                                                            <span key={cls} className='inline-flex items-center bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded'>
                                                                {cls}
                                                                <button
                                                                    onClick={() => removeClassForViewing(cls)}
                                                                    className='ml-1 text-blue-700 hover:text-blue-900'
                                                                    aria-label={`移除 ${cls}`}
                                                                >
                                                                    <FaTimes />
                                                                </button>
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <hr className='my-3' />

                                            {/* 可選班級清單 + 搜尋 */}
                                            <div>
                                                <div className='flex items-center justify-between mb-2'>
                                                    <div className='text-sm font-medium text-gray-700'>所有可選班級</div>
                                                    <div className='relative'>
                                                        <input
                                                            type='text'
                                                            placeholder='搜尋班級...'
                                                            value={classSearch}
                                                            onChange={(e) => setClassSearch(e.target.value)}
                                                            className='text-sm px-3 py-1 pr-8 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500'
                                                        />
                                                        {classSearch && (
                                                            <button
                                                                onClick={() => setClassSearch('')}
                                                                className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600'
                                                                aria-label='清除搜尋'
                                                            >
                                                                <FaTimes />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {(() => {
                                                    const all = classesData?.classes || [];
                                                    const available = all
                                                        .filter(c => !allowedClasses.includes(c))
                                                        .filter(c => c.toLowerCase().includes(classSearch.toLowerCase()));

                                                    return (
                                                        <div className='space-y-2 max-h-48 overflow-y-auto'>
                                                            {available.length === 0 ? (
                                                                <div className='text-xs text-gray-500'>沒有可加入的班級</div>
                                                            ) : (
                                                                available.map((c) => (
                                                                    <button
                                                                        key={c}
                                                                        onClick={() => addClassForViewing(c)}
                                                                        className='w-full flex items-center justify-between px-3 py-2 text-left border border-gray-200 rounded hover:bg-gray-50'
                                                                    >
                                                                        <span className='text-sm text-gray-700'>{c}</span>
                                                                        <span className='text-xs text-gray-400'>加入</span>
                                                                    </button>
                                                                ))
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                        <div className='px-6 py-4 border-t border-gray-200 flex justify-end space-x-3'>
                                            <button
                                                onClick={() => setShowViewingSettings(false)}
                                                className='px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
                                            >
                                                取消
                                            </button>
                                            <button
                                                onClick={handleSaveViewingSettings}
                                                className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
                                            >
                                                儲存設定
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default ClassObservationPage;
