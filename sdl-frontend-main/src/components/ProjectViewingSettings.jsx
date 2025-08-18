import React, { useState, useEffect } from 'react';
import { FaCog, FaEye, FaEyeSlash, FaTimes } from 'react-icons/fa';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { getAllClasses, updateViewingSettings, checkViewingPermission } from '../../api/project';
import Swal from 'sweetalert2';

/**
 * 教師端專案觀摩權限設定組件
 * 支援響應式設計 (RWD)
 */
const ProjectViewingSettings = ({ project, onClose }) => {
    const [isOpen, setIsOpen] = useState(project.is_open_for_viewing || false);
    const [selectedClasses, setSelectedClasses] = useState(project.allowed_classes || []);
    const [availableClasses, setAvailableClasses] = useState([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    
    const queryClient = useQueryClient();

    // 取得所有班級列表
    const { data: classesData } = useQuery('availableClasses', getAllClasses);

    useEffect(() => {
        if (classesData?.classes) {
            setAvailableClasses(classesData.classes);
        }
    }, [classesData]);

    // 更新觀摩設定
    const { mutate: updateSettings, isLoading } = useMutation(
        (data) => updateViewingSettings(project.id, data),
        {
            onSuccess: (res) => {
                queryClient.invalidateQueries('projectDatas');
                onClose();
                Swal.fire({
                    icon: 'success',
                    title: '設定成功',
                    text: '觀摩權限設定已更新',
                    customClass: {
                        popup: 'bg-white',
                    },
                });
            },
            onError: (error) => {
                Swal.fire({
                    icon: 'error',
                    title: '設定失敗',
                    text: error.response?.data?.message || '設定觀摩權限時發生錯誤',
                });
            }
        }
    );

    const handleToggleOpen = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            setSelectedClasses([]);
        }
    };

    const handleClassToggle = (className) => {
        setSelectedClasses(prev => 
            prev.includes(className)
                ? prev.filter(c => c !== className)
                : [...prev, className]
        );
    };

    const handleSave = () => {
        if (isOpen && selectedClasses.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: '請選擇班級',
                text: '開放觀摩時至少需要選擇一個班級',
            });
            return;
        }

        updateSettings({
            is_open_for_viewing: isOpen,
            allowed_classes: isOpen ? selectedClasses : null
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden">
                {/* 標題列 */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <FaCog className="text-lg" />
                        <h2 className="text-lg font-semibold">觀摩權限設定</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white hover:text-gray-200 transition-colors"
                    >
                        <FaTimes className="text-lg" />
                    </button>
                </div>

                <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
                    {/* 專案資訊 */}
                    <div className="mb-6 p-3 bg-gray-50 rounded-lg">
                        <h3 className="font-medium text-gray-800 mb-1">{project.name}</h3>
                        <p className="text-sm text-gray-600 line-clamp-2">{project.describe}</p>
                    </div>

                    {/* 開放觀摩開關 */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                                {isOpen ? (
                                    <FaEye className="text-green-600 text-xl" />
                                ) : (
                                    <FaEyeSlash className="text-gray-400 text-xl" />
                                )}
                                <div>
                                    <h4 className="font-medium text-gray-800">開放觀摩</h4>
                                    <p className="text-sm text-gray-600">
                                        {isOpen ? '其他班級可觀摩此專案' : '僅限專案成員可見'}
                                    </p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={isOpen}
                                    onChange={handleToggleOpen}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </div>

                    {/* 班級選擇 */}
                    {isOpen && (
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                                可觀摩的班級 <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className="w-full px-4 py-3 text-left bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-700">
                                            {selectedClasses.length === 0
                                                ? '請選擇班級...'
                                                : `已選擇 ${selectedClasses.length} 個班級`
                                            }
                                        </span>
                                        <svg className={`w-5 h-5 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </button>

                                {isDropdownOpen && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                        {availableClasses.map((className) => (
                                            <label
                                                key={className}
                                                className="flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer"
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                    checked={selectedClasses.includes(className)}
                                                    onChange={() => handleClassToggle(className)}
                                                />
                                                <span className="ml-3 text-gray-700">{className}</span>
                                            </label>
                                        ))}
                                        {availableClasses.length === 0 && (
                                            <div className="px-4 py-3 text-gray-500 text-sm">
                                                暫無可用班級
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* 已選擇的班級標籤 */}
                            {selectedClasses.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {selectedClasses.map((className) => (
                                        <span
                                            key={className}
                                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                                        >
                                            {className}
                                            <button
                                                type="button"
                                                onClick={() => handleClassToggle(className)}
                                                className="ml-2 text-blue-600 hover:text-blue-800"
                                            >
                                                <FaTimes className="text-xs" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 操作按鈕 */}
                <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row gap-3 sm:justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                    >
                        取消
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isLoading}
                        className={`w-full sm:w-auto px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isLoading ? '儲存中...' : '儲存設定'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProjectViewingSettings;
