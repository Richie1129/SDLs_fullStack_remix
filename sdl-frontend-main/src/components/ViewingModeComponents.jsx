import React from 'react';
import { FaEye, FaInfoCircle, FaTimes } from 'react-icons/fa';

/**
 * 觀摩模式指示器組件
 * 當用戶以觀摩模式進入專案時顯示
 */
const ViewingModeIndicator = ({ projectName, onExit }) => {
    return (
        <div className="sticky top-0 z-40 bg-gradient-to-r from-green-500 to-teal-600 text-white shadow-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between py-3">
                    {/* 左側資訊 */}
                    <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-stack-xs">
                            <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                                <FaEye className="text-white text-body-sm" />
                            </div>
                            <div className="hidden sm:block">
                                <h3 className="text-body-sm font-semibold">觀摩模式</h3>
                                <p className="text-caption opacity-90">正在觀摩：{projectName}</p>
                            </div>
                            <div className="sm:hidden">
                                <h3 className="text-body-sm font-semibold">觀摩模式</h3>
                            </div>
                        </div>
                    </div>

                    {/* 中間提示 */}
                    <div className="hidden md:flex items-center space-x-stack-xs bg-white bg-opacity-10 rounded-full px-4 py-2">
                        <FaInfoCircle className="text-body-sm" />
                        <span className="text-body-sm">您正以只讀模式瀏覽此專案內容</span>
                    </div>

                    {/* 右側操作 */}
                    <div className="flex items-center space-x-stack-xs">
                        <button
                            onClick={onExit}
                            className="flex items-center space-x-stack-xs bg-white bg-opacity-10 hover:bg-opacity-20 rounded-lg px-3 py-2 transition-colors duration-fast"
                        >
                            <FaTimes className="text-body-sm" />
                            <span className="text-body-sm font-medium hidden sm:inline">退出觀摩</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* 手機版額外提示 */}
            <div className="md:hidden bg-black bg-opacity-10 px-4 py-2 border-t border-white border-opacity-20">
                <div className="flex items-center space-x-stack-xs justify-center">
                    <FaInfoCircle className="text-caption" />
                    <span className="text-caption">只讀模式 - 無法編輯內容</span>
                </div>
            </div>
        </div>
    );
};

/**
 * 觀摩模式功能限制提示組件
 * 當用戶嘗試進行編輯操作時顯示
 */
const ViewingModeRestriction = ({ isVisible, onClose, actionType = '編輯' }) => {
    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-component-base">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                <div className="p-component-md-lg text-center">
                    <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FaEye className="text-yellow-600 text-h2" />
                    </div>
                    <h3 className="text-body-lg font-semibold text-gray-800 mb-2">
                        觀摩模式限制
                    </h3>
                    <p className="text-gray-600 mb-6">
                        您目前正以觀摩模式瀏覽此專案，無法進行{actionType}操作。
                        觀摩模式僅允許瀏覽內容，不可進行任何修改。
                    </p>
                    <button
                        onClick={onClose}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors duration-fast"
                    >
                        我了解了
                    </button>
                </div>
            </div>
        </div>
    );
};

/**
 * 觀摩模式內容卡片包裝器
 * 為觀摩模式下的內容添加視覺提示
 */
const ViewingModeContentWrapper = ({ children, readOnly = false, title = '內容區塊' }) => {
    if (!readOnly) {
        return children;
    }

    return (
        <div className="relative">
            {/* 觀摩模式遮罩 */}
            <div className="absolute top-0 right-0 z-10">
                <div className="bg-green-500 text-white px-3 py-1 rounded-bl-lg shadow-lg">
                    <div className="flex items-center space-x-1 text-caption">
                        <FaEye />
                        <span>觀摩模式</span>
                    </div>
                </div>
            </div>
            
            {/* 內容區域 */}
            <div className="relative">
                {children}
                
                {/* 觀摩模式覆蓋層 */}
                <div className="absolute inset-0 bg-green-50 bg-opacity-30 pointer-events-none border-2 border-green-200 border-dashed rounded-lg"></div>
            </div>
        </div>
    );
};

/**
 * 觀摩模式按鈕禁用包裝器
 */
const ViewingModeButton = ({ children, readOnly = false, onClick, actionType = '操作', ...props }) => {
    const [showRestriction, setShowRestriction] = React.useState(false);

    const handleClick = (e) => {
        if (readOnly) {
            e.preventDefault();
            setShowRestriction(true);
        } else if (onClick) {
            onClick(e);
        }
    };

    return (
        <>
            <button
                {...props}
                onClick={handleClick}
                className={`${props.className} ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={readOnly || props.disabled}
            >
                {children}
            </button>
            
            <ViewingModeRestriction
                isVisible={showRestriction}
                onClose={() => setShowRestriction(false)}
                actionType={actionType}
            />
        </>
    );
};

export { 
    ViewingModeIndicator, 
    ViewingModeRestriction, 
    ViewingModeContentWrapper, 
    ViewingModeButton 
};
