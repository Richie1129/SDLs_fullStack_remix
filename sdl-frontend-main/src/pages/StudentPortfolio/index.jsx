/**
 * 個人學習歷程頁面
 *
 * 功能：
 * 1. 載入個人學習資料（自動依 userId 篩選）
 * 2. 選擇 PDF 模板（3 種）
 * 3. 可選觸發 AI 學習敘事生成（Streaming）
 * 4. 匯出前完整度提醒（軟提醒）
 * 5. 匯出 PDF（瀏覽器原生列印，保留文字層與完整排版）
 */

import React, { useState, useRef } from 'react';
import './StudentPortfolio.print.css';
import { useParams, useNavigate } from 'react-router-dom';
import { FiDownload, FiZap, FiStopCircle, FiRefreshCw, FiFileText } from 'react-icons/fi';
import Lottie from 'lottie-react';
import PortfolioIcon from '../../assets/AnimationProtfoliio.json';
import Loader from '../../components/Loader';

import { useStudentPortfolio } from './hooks/useStudentPortfolio';
import TemplateSelector from './components/TemplateSelector';
import PreExportReminder from './components/PreExportReminder';
import ClassicTemplate from './templates/ClassicTemplate';
import ModernTemplate from './templates/ModernTemplate';
import TimelineTemplate from './templates/TimelineTemplate';

const TEMPLATE_MAP = {
  classic: ClassicTemplate,
  modern: ModernTemplate,
  timeline: TimelineTemplate
};

export default function StudentPortfolio() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const contentRef = useRef(null);

  const [selectedTemplate, setSelectedTemplate] = useState('classic');
  const [showReminder, setShowReminder] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const {
    portfolioData,
    isLoading,
    isError,
    narrative,
    isGenerating,
    generateError,
    startGenerate,
    stopGenerate,
    clearNarrative
  } = useStudentPortfolio(projectId);

  const TemplateComponent = TEMPLATE_MAP[selectedTemplate];

  const handleExportClick = () => {
    if (!portfolioData) return;
    const { completeness } = portfolioData;
    if (completeness.needsReminder) {
      setShowReminder(true);
    } else {
      doExport();
    }
  };

  const doExport = () => {
    if (!portfolioData || isExporting) return;
    setIsExporting(true);

    // 建立隱藏 iframe，只列印模板內容，不印整頁 UI
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(iframe);

    const frameDoc = iframe.contentDocument || iframe.contentWindow.document;
    frameDoc.open();
    frameDoc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4 portrait; margin: 15mm 0; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: white; }
  </style>
</head>
<body>${contentRef.current.outerHTML}</body>
</html>`);
    frameDoc.close();

    const cleanup = () => {
      setIsExporting(false);
      if (document.body.contains(iframe)) document.body.removeChild(iframe);
    };

    iframe.contentWindow.addEventListener('afterprint', cleanup);

    // 等字型載入完成後再列印
    iframe.contentWindow.document.fonts.ready.then(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-stack-sm text-gray-500">
        <FiFileText className="w-12 h-12 text-gray-300" />
        <p className="text-body">載入學習歷程資料失敗</p>
        <button
          onClick={() => navigate(-1)}
          className="text-body-sm text-customgreen underline"
        >
          返回
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 portfolio-page-root">

      {/* 頂部控制列 */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm portfolio-no-print">
        <div className="max-w-6xl mx-auto px-component-md py-3 flex items-center justify-between gap-stack-sm flex-wrap">

          {/* 標題 */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8">
              <Lottie animationData={PortfolioIcon} loop />
            </div>
            <div>
              <div className="text-h3 font-bold text-gray-800">個人學習歷程</div>
              {portfolioData && (
                <div className="text-caption text-gray-500">
                  {portfolioData.student.username} · {portfolioData.project.name}
                </div>
              )}
            </div>
          </div>

          {/* 操作按鈕群 */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* AI 生成敘事 */}
            {!narrative && !isGenerating ? (
              <button
                onClick={startGenerate}
                disabled={!portfolioData}
                className="flex items-center gap-2 px-btn-x py-btn-y rounded-lg border border-purple-200 text-purple-700 text-body-sm hover:bg-purple-50 transition-shadow duration-fast disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FiZap className="w-4 h-4" />
                AI 生成學習敘事
              </button>
            ) : isGenerating ? (
              <button
                onClick={stopGenerate}
                className="flex items-center gap-2 px-btn-x py-btn-y rounded-lg border border-red-200 text-red-600 text-body-sm hover:bg-red-50 transition-shadow duration-fast"
              >
                <FiStopCircle className="w-4 h-4" />
                停止生成
              </button>
            ) : (
              <button
                onClick={clearNarrative}
                className="flex items-center gap-2 px-btn-x py-btn-y rounded-lg border border-gray-200 text-gray-500 text-body-sm hover:bg-gray-50 transition-shadow duration-fast"
              >
                <FiRefreshCw className="w-4 h-4" />
                清除敘事
              </button>
            )}

            {/* 匯出 PDF */}
            <button
              onClick={handleExportClick}
              disabled={isExporting || !portfolioData}
              className="flex items-center gap-2 px-btn-x-lg py-btn-y rounded-lg bg-customgreen text-white text-body-sm font-semibold hover:bg-customgreen/90 transition-shadow duration-fast disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FiDownload className="w-4 h-4" />
              {isExporting ? '匯出中...' : '匯出 PDF'}
            </button>
          </div>
        </div>
      </div>

      {/* 主內容區 */}
      <div className="max-w-6xl mx-auto px-component-md py-component-md">

        {/* AI 生成中提示 */}
        {isGenerating && (
          <div className="mb-4 p-3 bg-purple-50 border border-purple-100 rounded-lg flex items-center gap-3 portfolio-no-print">
            <div className="w-4 h-4 rounded-full border-2 border-purple-400 border-t-transparent animate-spin" />
            <span className="text-body-sm text-purple-700">AI 正在生成學習敘事，生成完成後將自動填入文件...</span>
          </div>
        )}

        {/* AI 生成錯誤 */}
        {generateError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-body-sm text-red-600 portfolio-no-print">
            AI 生成失敗：{generateError}
          </div>
        )}

        {/* 模板選擇器 */}
        <div className="bg-white rounded-xl border border-gray-200 p-component-md mb-component-md portfolio-no-print">
          <div className="text-h3 font-semibold text-gray-800 mb-stack-sm">選擇 PDF 模板</div>
          <TemplateSelector selected={selectedTemplate} onSelect={setSelectedTemplate} />
        </div>

        {/* 模板預覽 */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-component-md py-3 border-b border-gray-100 flex items-center justify-between portfolio-no-print">
            <span className="text-body-sm text-gray-500">預覽（列印時以 A4 紙張輸出，文字可選取複製）</span>
            <span className="text-caption text-gray-400">
              {{
                classic: '典雅學術版',
                modern: '現代活力版',
                timeline: '時間軸敘事版'
              }[selectedTemplate]}
            </span>
          </div>
          <div className="overflow-auto p-4 bg-gray-100 portfolio-print-frame">
            <div ref={contentRef} style={{ width: '210mm', margin: '0 auto', overflow: 'hidden' }}>
              {portfolioData && (
                <TemplateComponent
                  data={portfolioData}
                  narrative={narrative}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 匯出前提醒 Modal */}
      {showReminder && portfolioData && (
        <PreExportReminder
          completeness={portfolioData.completeness}
          onConfirm={() => { setShowReminder(false); doExport(); }}
          onCancel={() => setShowReminder(false)}
        />
      )}
    </div>
  );
}
