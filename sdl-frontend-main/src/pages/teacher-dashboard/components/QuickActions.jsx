import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FiDownload, FiPrinter, FiFileText, FiShare2, FiChevronDown } from 'react-icons/fi';

/**
 * QuickActions 元件 - 快速操作工具欄
 * 提供匯出、列印、分享等功能
 */
const QuickActions = ({ 
  data,
  fileName = 'dashboard-report',
  onExport,
  className = '' 
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 顯示提示訊息
  const showNotification = useCallback((message) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  }, []);

  // 匯出為 JSON
  const handleExportJSON = useCallback(() => {
    try {
      setIsExporting(true);
      const jsonData = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showNotification('✅ JSON 檔案已下載');
      if (onExport) onExport('json');
    } catch (error) {
      console.error('匯出 JSON 失敗:', error);
      showNotification('❌ 匯出失敗，請稍後再試');
    } finally {
      setIsExporting(false);
    }
  }, [data, fileName, onExport, showNotification]);

  // 匯出為 CSV
  const handleExportCSV = useCallback(() => {
    try {
      setIsExporting(true);
      
      // 將資料轉換為 CSV 格式
      let csvContent = '';
      
      if (data?.enhancedStudents && Array.isArray(data.enhancedStudents)) {
        // 標題列
        csvContent += '學生姓名,學習階段,節點數,任務數,反思數,最後活動時間\n';
        
        // 資料列
        data.enhancedStudents.forEach(student => {
          const name = student.displayName || student.name || `學生${student.id}`;
          const stage = student.currentStage || '未知';
          const nodes = student.nodeCount || 0;
          const tasks = student.taskCount || 0;
          const reflections = student.reflectionCount || 0;
          const lastActivity = student.lastActivityDate || '無';
          
          csvContent += `"${name}","${stage}",${nodes},${tasks},${reflections},"${lastActivity}"\n`;
        });
      } else {
        csvContent = '無可用數據\n';
      }
      
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showNotification('✅ CSV 檔案已下載');
      if (onExport) onExport('csv');
    } catch (error) {
      console.error('匯出 CSV 失敗:', error);
      showNotification('❌ 匯出失敗，請稍後再試');
    } finally {
      setIsExporting(false);
    }
  }, [data, fileName, onExport, showNotification]);

  // 列印報表
  const handlePrint = useCallback(() => {
    try {
      // 建立列印專用樣式
      const printStyle = `
        <style>
          @media print {
            body { 
              font-family: 'Noto Serif TC', serif;
              color: #000;
              background: #fff;
            }
            .no-print { display: none !important; }
            .print-title {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 20px;
              text-align: center;
            }
            .print-date {
              text-align: right;
              color: #666;
              margin-bottom: 20px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f3f4f6;
              font-weight: bold;
            }
          }
        </style>
      `;
      
      // 建立列印內容
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>教師儀錶板報表</title>
          ${printStyle}
        </head>
        <body>
          <div class="print-title">教師儀錶板報表</div>
          <div class="print-date">列印日期：${new Date().toLocaleString('zh-TW')}</div>
          ${document.querySelector('.analytics-view')?.innerHTML || '<p>無可列印內容</p>'}
        </body>
        </html>
      `;
      
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
        
        showNotification('✅ 列印視窗已開啟');
        if (onExport) onExport('print');
      }
    } catch (error) {
      console.error('列印失敗:', error);
      showNotification('❌ 列印失敗，請稍後再試');
    }
  }, [onExport, showNotification]);

  // 分享功能（複製連結）
  const handleShare = useCallback(async () => {
    try {
      const url = window.location.href;
      
      if (navigator.share) {
        // 使用瀏覽器原生分享 API
        await navigator.share({
          title: '教師儀錶板',
          text: '查看學習數據分析',
          url: url
        });
        showNotification('✅ 分享成功');
      } else if (navigator.clipboard) {
        // 複製到剪貼簿
        await navigator.clipboard.writeText(url);
        showNotification('✅ 連結已複製到剪貼簿');
      } else {
        // 降級方案
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('✅ 連結已複製');
      }
    } catch (error) {
      console.error('分享失敗:', error);
      showNotification('❌ 分享失敗');
    }
  }, [showNotification]);

  const handleMenuAction = useCallback((action) => {
    action();
    setIsMenuOpen(false);
  }, []);

  return (
    <>
      <div className={`glass-card rounded-xl p-component-base sm:p-component-md-lg ${className}`}>
        <div className="flex items-center justify-between mb-component-base">
          <h3 className="text-h3 font-bold text-gray-800">快速操作</h3>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen((prev) => !prev)}
            disabled={isExporting}
            className="w-full btn-ripple flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-customgreen to-teal-600 hover:from-teal-600 hover:to-customgreen text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            aria-label="開啟匯出選單"
            aria-expanded={isMenuOpen}
            aria-haspopup="menu"
          >
            <FiDownload className="w-5 h-5" />
            <span className="text-body-sm font-medium">匯出資料</span>
            <FiChevronDown className={`w-4 h-4 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {isMenuOpen && (
            <div
              className="absolute z-20 mt-2 w-full bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden"
              role="menu"
              aria-label="匯出與分享操作"
            >
              <button
                onClick={() => handleMenuAction(handleExportCSV)}
                className="w-full flex items-center space-x-2 px-4 py-3 text-body-sm text-gray-700 hover:bg-gray-50 transition-colors"
                role="menuitem"
              >
                <FiDownload className="w-4 h-4 text-customgreen" />
                <span>匯出 CSV</span>
              </button>
              <button
                onClick={() => handleMenuAction(handleExportJSON)}
                className="w-full flex items-center space-x-2 px-4 py-3 text-body-sm text-gray-700 hover:bg-gray-50 transition-colors"
                role="menuitem"
              >
                <FiFileText className="w-4 h-4 text-trust-blue-600" />
                <span>匯出 JSON</span>
              </button>
              <button
                onClick={() => handleMenuAction(handlePrint)}
                className="w-full flex items-center space-x-2 px-4 py-3 text-body-sm text-gray-700 hover:bg-gray-50 transition-colors"
                role="menuitem"
              >
                <FiPrinter className="w-4 h-4 text-action-orange-600" />
                <span>列印報表</span>
              </button>
              <button
                onClick={() => handleMenuAction(handleShare)}
                className="w-full flex items-center space-x-2 px-4 py-3 text-body-sm text-gray-700 hover:bg-gray-50 transition-colors"
                role="menuitem"
              >
                <FiShare2 className="w-4 h-4 text-purple-600" />
                <span>分享連結</span>
              </button>
            </div>
          )}

          <p className="text-caption text-gray-500 mt-2">
            點擊「匯出資料」可開啟完整選單。
          </p>
        </div>
      </div>

      {/* Toast 提示訊息 */}
      {showToast && (
        <div 
          className="fixed bottom-4 right-4 z-50 glass-card px-4 py-3 rounded-lg shadow-xl animate-fade-in"
          role="alert"
          aria-live="polite"
        >
          <p className="text-body-sm font-medium text-gray-800">
            {toastMessage}
          </p>
        </div>
      )}

      {/* Toast 動畫樣式 */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default QuickActions;
