import React, { useState } from "react";

const ChatInput = ({
  activeTab,
  isMinimized,
  screenWidth,
  isSubmitting,
  onSubmit,
  projectId,
  // ✅ 新增開關相關 props
  enableExternalLinks,
  toggleExternalLinks
}) => {
  const [question, setQuestion] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    onSubmit(question, projectId);
    setQuestion("");
  };

  // 僅在科學助手分頁顯示
  if (activeTab !== 'science') return null;

  return (
    <>
      {/* 輸入框 */}
      <form
        onSubmit={handleSubmit}
        className={`input-area ${isMinimized ? 'hidden' : ''} ${
          screenWidth < 768 ? 'px-4 py-3 gap-2' : 'px-5 py-4 gap-3'
        } border-t border-[#e9ecef] bg-white flex items-center`}
      >
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="輸入您的問題..."
          className={`flex-1 ${
            screenWidth < 768 ? 'py-[10px] px-[14px] text-[13px]' : 'py-3 px-4 text-[14px]'
          } border border-[#dee2e6] rounded-full outline-none transition-all bg-[#f8f9fa] focus:border-[#5BA491] focus:bg-white focus:ring-2 focus:ring-[rgba(91,164,145,0.1)]`}
        />
        <button
          type="submit"
          className={`${
            screenWidth < 768 ? 'py-[10px] px-4 text-[13px] min-w-[70px]' : 'py-3 px-5 text-[14px] min-w-[80px]'
          } rounded-full border-0 font-semibold ${
            isSubmitting
              ? 'bg-[#dee2e6] cursor-not-allowed shadow-none'
              : 'bg-[#5BA491] cursor-pointer shadow-[0_2px_8px_rgba(91,164,145,0.3)] hover:bg-[#4a9076] hover:-translate-y-px'
          } text-white transition-all`}
          disabled={isSubmitting}
        >
          {isSubmitting ? "送出中..." : "送出"}
        </button>
      </form>

      {/* ✅ 外部連結開關 */}
      <div className={`${isMinimized ? 'hidden' : ''} px-5 py-3 bg-[#f8f9fa] border-t border-[#e9ecef] flex items-center justify-between`}>
        <div className="flex items-start gap-2 flex-1">
          <svg className="w-4 h-4 text-[#5BA491] shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <div className="text-[12px] font-medium text-[#343a40] mb-0.5">網路延伸閱讀</div>
            <div className="text-[11px] text-[#6c757d] leading-[1.4]">
              開啟後將提供可點擊的外部參考連結，幫助你深入了解主題
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={toggleExternalLinks}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#5BA491] focus:ring-offset-2 shrink-0 ml-3 ${
            enableExternalLinks ? 'bg-[#5BA491]' : 'bg-[#dee2e6]'
          }`}
          role="switch"
          aria-checked={enableExternalLinks}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enableExternalLinks ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </>
  );
};

export default ChatInput;