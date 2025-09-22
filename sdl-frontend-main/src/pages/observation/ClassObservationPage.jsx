import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { FaTimes, FaCog, FaSearch, FaFilter } from 'react-icons/fa';
import TopBar from '../../components/TopBar';
import SideBar from '../../components/SideBar';
import { getProjectsByMentor, getAllClasses, updateViewingSettings, batchUpdateViewingSettings } from '../../api/project';
import { getProjectUser } from '../../api/users';
import Swal from 'sweetalert2';
import { getCurrentUsername, getUserForSocket, isCurrentUser } from '../../utils/userUtils';

/**
 * 專案分享與權限管理頁面
 */
const ClassObservationPage = () => {
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState(null);
    const [mentorName, setMentorName] = useState('');
    const [showViewingSettings, setShowViewingSettings] = useState(false); // 控制觀摩設定模態框
    const [selectedProjectForSetting, setSelectedProjectForSetting] = useState(null);
    const [allowedClasses, setAllowedClasses] = useState([]);
    const [classSearch, setClassSearch] = useState('');
    // 專案列表搜尋與過濾
    const [projectSearch, setProjectSearch] = useState('');
    const [filterClass, setFilterClass] = useState('ALL'); // 依「開放的班級」過濾
    const [filterStatus, setFilterStatus] = useState('ALL'); // ALL | OPEN | CLOSED
    const [projectClassMap, setProjectClassMap] = useState({}); // projectId -> classes[]
    const [projectMembersMap, setProjectMembersMap] = useState({}); // projectId -> users[]
    const [ownedClassOptions, setOwnedClassOptions] = useState([]); // 從專案所屬班級彙整

    // 批量觀摩設定
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [selectedSourceClass, setSelectedSourceClass] = useState('');
    const [selectedTargetClasses, setSelectedTargetClasses] = useState([]);
    
    // 取得當前用戶資訊和指導老師名稱
    useEffect(() => {
        // 教師直接用自己的名稱作為指導老師
        const userName = getCurrentUsername();
        const userRole = localStorage.getItem('role');
        
        if (userRole === 'teacher') {
            setMentorName(userName);
            setCurrentUser({ username: userName, role: userRole });
        } else {
            console.warn('觀摩功能僅限教師使用');
        }
    }, []);

    // 取得所有班級列表（供權限設定 Modal 使用）
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

    const handleProjectClick = (projectId) => {
        // 指導老師直接進入專案，不使用觀摩模式
        navigate(`/project/${projectId}/kanban`);
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

    // 批量觀摩處理函數
    const handleOpenBatchModal = () => {
        setSelectedSourceClass('');
        setSelectedTargetClasses([]);
        setShowBatchModal(true);
    };

    const addTargetClass = (className) => {
        if (!selectedTargetClasses.includes(className)) {
            setSelectedTargetClasses(prev => [...prev, className]);
        }
    };

    const removeTargetClass = (className) => {
        setSelectedTargetClasses(prev => prev.filter(c => c !== className));
    };

    const handleBatchSave = async () => {
        if (!selectedSourceClass || selectedTargetClasses.length === 0) {
            Swal.fire({
                icon: 'error',
                title: '請選擇來源班級和目標班級',
                text: '請確保至少選擇一個來源班級和一個目標班級'
            });
            return;
        }

        try {
            const result = await batchUpdateViewingSettings({
                sourceClass: selectedSourceClass,
                targetClasses: selectedTargetClasses,
                mentorName: mentorName
            });

            setShowBatchModal(false);
            refetchProjects();

            Swal.fire({
                icon: 'success',
                title: '批量設定成功！',
                text: `已設定 ${result.updatedProjects} 個專案開放給 ${selectedTargetClasses.join(', ')} 觀摩`,
                showConfirmButton: true
            });
        } catch (error) {
            console.error('批量設定觀摩權限失敗:', error);
            Swal.fire({
                icon: 'error',
                title: '批量設定失敗',
                text: error.response?.data?.message || '請重試！'
            });
        }
    };

    // 依據教師專案動態載入每個專案的成員與班級，建立「所屬班級」清單
    useEffect(() => {
        const loadProjectClasses = async () => {
            try {
                if (!Array.isArray(mentorProjects) || mentorProjects.length === 0) {
                    setProjectClassMap({});
                    setProjectMembersMap({});
                    setOwnedClassOptions([]);
                    return;
                }
                const entries = await Promise.all(
                    mentorProjects.map(async (p) => {
                        try {
                            const users = await getProjectUser(p.id);
                            const classes = Array.from(new Set((users || []).map(u => u.class).filter(Boolean)));
                            return [p.id, { classes, users: users || [] }];
                        } catch (e) {
                            console.error('載入專案成員失敗', p.id, e);
                            return [p.id, { classes: [], users: [] }];
                        }
                    })
                );
                const classMap = Object.fromEntries(entries.map(([id, v]) => [id, v.classes]));
                const memberMap = Object.fromEntries(entries.map(([id, v]) => [id, v.users]));
                setProjectClassMap(classMap);
                setProjectMembersMap(memberMap);
                const all = Array.from(new Set(entries.flatMap(([, v]) => v.classes))).sort();
                setOwnedClassOptions(all);
                // 若目前過濾值在新選項中不存在，重置為 ALL
                if (filterClass !== 'ALL' && !all.includes(filterClass)) {
                    setFilterClass('ALL');
                }
            } catch (err) {
                console.error('彙整專案所屬班級失敗:', err);
            }
        };
        loadProjectClasses();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mentorProjects]);

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
                                    <FaCog className='text-3xl text-blue-600' />
                                    <h1 className='text-3xl font-bold text-gray-800'>專案分享與權限管理</h1>
                                </div>
                                <p className='text-gray-600 text-lg'>
                                    管理您指導的專案，設定開放給其他班級觀摩的權限。
                                </p>
                            </div>

                            {/* 專案列表：以教師自己的專案為核心 */}
                            <div className='bg-white rounded-lg shadow-md p-6 mb-8'>
                                <div className='flex flex-col gap-4 mb-4'>
                                    <div className='flex items-center justify-between'>
                                        <h2 className='text-xl font-semibold text-gray-800'>
                                            您指導的專案
                                        </h2>
                                        <button
                                            onClick={handleOpenBatchModal}
                                            className='px-4 py-2 bg-customgreen text-white text-sm rounded hover:bg-customgreen/80 transition-colors'
                                        >
                                            班級觀摩
                                        </button>
                                    </div>
                                    {/* 搜尋與過濾列 */}
                                    <div className='flex flex-col md:flex-row gap-3'>
                                        {/* 搜尋 */}
                                        <div className='relative md:flex-1'>
                                            <input
                                                type='text'
                                                value={projectSearch}
                                                onChange={(e) => setProjectSearch(e.target.value)}
                                                placeholder='搜尋專案名稱或描述...'
                                                className='w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                                            />
                                            <FaSearch className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400' />
                                            {projectSearch && (
                                                <button
                                                    onClick={() => setProjectSearch('')}
                                                    className='absolute right-9 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600'
                                                    aria-label='清除搜尋'
                                                >
                                                    <FaTimes />
                                                </button>
                                            )}
                                        </div>
                                        {/* 狀態過濾 */}
                                        <div className='flex items-center gap-2'>
                                            <FaFilter className='text-gray-500' />
                                            <select
                                                value={filterStatus}
                                                onChange={(e) => setFilterStatus(e.target.value)}
                                                className='px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                                            >
                                                <option value='ALL'>全部狀態</option>
                                                <option value='OPEN'>已開放</option>
                                                <option value='CLOSED'>未開放</option>
                                            </select>
                                        </div>
                                        {/* 班級過濾（依「專案所屬的班級」） */}
                                        <div>
                                            <select
                                                value={filterClass}
                                                onChange={(e) => setFilterClass(e.target.value)}
                                                className='w-full md:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                                            >
                                                <option value='ALL'>全部班級</option>
                                                {ownedClassOptions.map((cls) => (
                                                    <option key={cls} value={cls}>{cls}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {isLoadingProjects ? (
                                    <p className='text-gray-500'>載入中...</p>
                                ) : projectsError ? (
                                    <p className='text-red-500'>無法載入專案，請稍後再試。</p>
                                ) : !mentorProjects || mentorProjects.length === 0 ? (
                                    <p className='text-gray-500'>目前沒有您指導的專案。</p>
                                ) : (
                                    <div className='space-y-3'>
                                        {(mentorProjects
                                            .filter((p) => {
                                                if (!projectSearch) return true;
                                                const name = (p.name || '').toLowerCase();
                                                const desc = (p.describe || '').toLowerCase();
                                                const q = projectSearch.toLowerCase();
                                                return name.includes(q) || desc.includes(q);
                                            })
                                            .filter((p) => {
                                                if (filterStatus === 'ALL') return true;
                                                const allowed = Array.isArray(p.allowed_classes) ? p.allowed_classes : [];
                                                const open = p.is_open_for_viewing && allowed.length > 0;
                                                return filterStatus === 'OPEN' ? open : !open;
                                            })
                                            .filter((p) => {
                                                if (filterClass === 'ALL') return true;
                                                const owned = projectClassMap[p.id] || [];
                                                return owned.includes(filterClass);
                                            }))
                                            .map((project) => {
                                            const allowed = Array.isArray(project.allowed_classes) ? project.allowed_classes : [];
                                            const isOpen = project.is_open_for_viewing && allowed.length > 0;
                                            const statusText = isOpen ? `開放給 ${allowed.length} 個班級` : '未開放';
                                            return (
                                                <div key={project.id} className='bg-white rounded-lg p-4 shadow-sm border border-gray-200'>
                                                    <div className='flex items-start justify-between'>
                                                        <div className='flex-1 min-w-0'>
                                                            <div className='flex items-center gap-2'>
                                                                <h3 className='font-medium text-gray-900 truncate'>{project.name}</h3>
                                                                <span className={`text-xs px-2 py-0.5 rounded ${isOpen ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                                                                    {statusText}
                                                                </span>
                                                            </div>
                                                            <p className='text-sm text-gray-600 mt-1'>{project.describe || '未提供描述'}</p>
                                                            {/* 專案成員 */}
                                                            {(projectMembersMap[project.id] || []).length > 0 && (
                                                                <div className='text-xs text-gray-600 mt-2'>
                                                                    成員：{(projectMembersMap[project.id] || []).map(u => u.username).join(', ')}
                                                                </div>
                                                            )}
                                                            {/* 所屬班級 */}
                                                            {(projectClassMap[project.id] || []).length > 0 && (
                                                                <div className='text-xs text-gray-500 mt-1'>
                                                                    所屬班級：{(projectClassMap[project.id] || []).join(', ')}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className='ml-4 flex-shrink-0 flex gap-2'>
                                                            <button
                                                                onClick={() => handleOpenViewingSettings(project)}
                                                                className='px-3 py-2 bg-customgreen text-white text-sm rounded hover:bg-customgreen/80 transition-colors'
                                                            >
                                                                設定觀摩權限
                                                            </button>
                                                            <button
                                                                onClick={() => handleProjectClick(project.id)}
                                                                className='px-3 py-2 bg-gray-100 text-gray-800 text-sm rounded hover:bg-gray-200 transition-colors'
                                                            >
                                                                檢視專案
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className='text-xs text-gray-500 mt-2'>
                                                        {isOpen && allowed.length > 0
                                                            ? `已開放班級：${allowed.join(', ')}`
                                                            : '尚未開放給任何班級觀摩'}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

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
                                                className='px-4 py-2 bg-customgreen text-white rounded-lg hover:bg-customgreen/80 transition-colors'
                                            >
                                                儲存設定
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 批量觀摩設定Modal */}
                            {showBatchModal && (
                                <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
                                    <div className='bg-white rounded-lg shadow-xl max-w-lg w-full mx-4'>
                                        <div className='px-6 py-4 border-b border-gray-200'>
                                            <h3 className='text-lg font-semibold text-gray-800'>
                                                班級觀摩設定
                                            </h3>
                                            <p className='text-sm text-gray-600 mt-1'>
                                                讓目標班級觀摩來源班級的所有專案
                                            </p>
                                        </div>
                                        <div className='p-6'>
                                            {/* 來源班級選擇 */}
                                            <div className='mb-6'>
                                                <div className='text-sm font-medium text-gray-700 mb-2'>來源班級</div>
                                                <select
                                                    value={selectedSourceClass}
                                                    onChange={(e) => setSelectedSourceClass(e.target.value)}
                                                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                                                >
                                                    <option value=''>請選擇來源班級</option>
                                                    {ownedClassOptions.map((cls) => (
                                                        <option key={cls} value={cls}>{cls}</option>
                                                    ))}
                                                </select>
                                                <div className='text-xs text-gray-500 mt-1'>
                                                    這個班級的專案將被開放觀摩
                                                </div>
                                            </div>

                                            {/* 目標班級選擇 */}
                                            <div className='mb-4'>
                                                <div className='text-sm font-medium text-gray-700 mb-2'>目標班級</div>
                                                {selectedTargetClasses.length === 0 ? (
                                                    <div className='text-xs text-gray-500 mb-2'>尚未選擇任何目標班級</div>
                                                ) : (
                                                    <div className='flex flex-wrap gap-2 mb-2'>
                                                        {selectedTargetClasses.map((cls) => (
                                                            <span key={cls} className='inline-flex items-center bg-green-100 text-green-800 text-xs px-2 py-1 rounded'>
                                                                {cls}
                                                                <button
                                                                    onClick={() => removeTargetClass(cls)}
                                                                    className='ml-1 text-green-700 hover:text-green-900'
                                                                    aria-label={`移除 ${cls}`}
                                                                >
                                                                    <FaTimes />
                                                                </button>
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                <div className='text-xs text-gray-500 mb-2'>
                                                    這些班級將能觀摩來源班級的專案
                                                </div>

                                                {/* 可選班級清單 */}
                                                <div className='space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded p-2'>
                                                    {(() => {
                                                        const all = classesData?.classes || [];
                                                        const available = all.filter(c =>
                                                            c !== selectedSourceClass &&
                                                            !selectedTargetClasses.includes(c)
                                                        );

                                                        return available.length === 0 ? (
                                                            <div className='text-xs text-gray-500'>沒有可選的班級</div>
                                                        ) : (
                                                            available.map((c) => (
                                                                <button
                                                                    key={c}
                                                                    onClick={() => addTargetClass(c)}
                                                                    className='w-full flex items-center justify-between px-2 py-1 text-left border border-gray-100 rounded hover:bg-gray-50'
                                                                >
                                                                    <span className='text-sm text-gray-700'>{c}</span>
                                                                    <span className='text-xs text-gray-400'>加入</span>
                                                                </button>
                                                            ))
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                        <div className='px-6 py-4 border-t border-gray-200 flex justify-end space-x-3'>
                                            <button
                                                onClick={() => setShowBatchModal(false)}
                                                className='px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
                                            >
                                                取消
                                            </button>
                                            <button
                                                onClick={handleBatchSave}
                                                className='px-4 py-2 bg-customgreen text-white rounded-lg hover:bg-customgreen/80 transition-colors'
                                            >
                                                確認設定
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
