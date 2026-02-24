import React, { useState, useCallback, useMemo } from 'react';
import { FiFilter, FiCalendar, FiUsers, FiX, FiChevronDown } from 'react-icons/fi';

/**
 * FilterBar 元件 - 數據篩選工具欄
 * 提供時間範圍和學生篩選功能
 */
const FilterBar = ({ 
  students = [], 
  onFilterChange,
  defaultTimeRange = '7days',
  className = '' 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [timeRange, setTimeRange] = useState(defaultTimeRange);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);

  // 時間範圍選項
  const timeRangeOptions = useMemo(() => [
    { value: '7days', label: '最近 7 天' },
    { value: '30days', label: '最近 30 天' },
    { value: '90days', label: '最近 3 個月' },
    { value: 'semester', label: '本學期' },
    { value: 'all', label: '全部' }
  ], []);

  // 處理時間範圍變更
  const handleTimeRangeChange = useCallback((value) => {
    setTimeRange(value);
    if (onFilterChange) {
      onFilterChange({
        timeRange: value,
        students: selectedStudents
      });
    }
  }, [selectedStudents, onFilterChange]);

  // 處理學生選擇
  const handleStudentToggle = useCallback((studentId) => {
    setSelectedStudents(prev => {
      const newSelection = prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId];
      
      if (onFilterChange) {
        onFilterChange({
          timeRange,
          students: newSelection
        });
      }
      
      return newSelection;
    });
  }, [timeRange, onFilterChange]);

  // 清除所有篩選
  const handleClearAll = useCallback(() => {
    setTimeRange(defaultTimeRange);
    setSelectedStudents([]);
    setShowStudentDropdown(false);
    
    if (onFilterChange) {
      onFilterChange({
        timeRange: defaultTimeRange,
        students: []
      });
    }
  }, [defaultTimeRange, onFilterChange]);

  // 安全的學生陣列
  const safeStudents = useMemo(() => 
    Array.isArray(students) ? students : [], 
    [students]
  );

  return (
    <div className={`glass-card rounded-xl p-component-base sm:p-component-md-lg transition-all duration-300 ${className}`}>
      {/* 標題列 */}
      <div className="flex items-center justify-between mb-component-base">
        <div className="flex items-center space-x-2">
          <div className="icon-bg bg-gradient-to-br from-trust-blue-500 to-trust-blue-600">
            <FiFilter className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-h3 font-bold text-gray-800">數據篩選</h3>
        </div>
        
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label={isOpen ? '收起篩選' : '展開篩選'}
          aria-expanded={isOpen}
        >
          <FiChevronDown 
            className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      {/* 篩選選項 */}
      <div className={`space-y-component-base ${isOpen ? 'block' : 'hidden lg:block'}`}>
        {/* 時間範圍篩選 */}
        <div>
          <label 
            className="flex items-center text-body-sm font-medium text-gray-700 mb-2"
            id="time-range-label"
          >
            <FiCalendar className="w-4 h-4 mr-1" />
            時間範圍
          </label>
          <div 
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2"
            role="radiogroup"
            aria-labelledby="time-range-label"
          >
            {timeRangeOptions.map(option => (
              <button
                key={option.value}
                onClick={() => handleTimeRangeChange(option.value)}
                className={`px-3 py-2 rounded-lg text-body-sm font-medium transition-all duration-200 ${
                  timeRange === option.value
                    ? 'bg-gradient-to-r from-trust-blue-500 to-trust-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                role="radio"
                aria-checked={timeRange === option.value}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* 學生篩選 */}
        <div>
          <label 
            className="flex items-center text-body-sm font-medium text-gray-700 mb-2"
            id="student-filter-label"
          >
            <FiUsers className="w-4 h-4 mr-1" />
            學生篩選
            {selectedStudents.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-trust-blue-100 text-trust-blue-700 rounded-full text-caption font-semibold">
                {selectedStudents.length}
              </span>
            )}
          </label>
          
          <div className="relative">
            <button
              onClick={() => setShowStudentDropdown(!showStudentDropdown)}
              className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-left text-body-sm transition-colors flex items-center justify-between"
              aria-label="選擇要篩選的學生"
              aria-expanded={showStudentDropdown}
              aria-controls="student-dropdown"
            >
              <span className="text-gray-700">
                {selectedStudents.length === 0 
                  ? '選擇學生...' 
                  : `已選擇 ${selectedStudents.length} 位學生`}
              </span>
              <FiChevronDown 
                className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                  showStudentDropdown ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* 下拉選單 */}
            {showStudentDropdown && (
              <div 
                id="student-dropdown"
                className="absolute z-10 w-full mt-2 bg-white rounded-lg shadow-xl border border-gray-200 max-h-64 overflow-y-auto"
                role="listbox"
                aria-labelledby="student-filter-label"
              >
                {safeStudents.length > 0 ? (
                  safeStudents.map(student => {
                    const studentId = student.id || student.userId;
                    const studentName = student.displayName || student.name || `學生${studentId}`;
                    const isSelected = selectedStudents.includes(studentId);
                    
                    return (
                      <button
                        key={studentId}
                        onClick={() => handleStudentToggle(studentId)}
                        className={`w-full px-4 py-2 text-left text-body-sm transition-colors ${
                          isSelected
                            ? 'bg-trust-blue-50 text-trust-blue-700 font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                        role="option"
                        aria-selected={isSelected}
                      >
                        <div className="flex items-center justify-between">
                          <span>{studentName}</span>
                          {isSelected && (
                            <span className="text-trust-blue-500">✓</span>
                          )}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="px-4 py-3 text-center text-body-sm text-gray-500">
                    無可用學生
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 清除按鈕 */}
        {(timeRange !== '7days' || selectedStudents.length > 0) && (
          <div className="flex justify-end pt-2">
            <button
              onClick={handleClearAll}
              className="flex items-center space-x-1 px-3 py-1.5 text-body-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="清除所有篩選條件"
            >
              <FiX className="w-4 h-4" />
              <span>清除篩選</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FilterBar;
