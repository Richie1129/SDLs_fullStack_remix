import React, { useState } from "react";

const ChatInput = ({
  activeTab,
  isMinimized,
  screenWidth,
  isSubmitting,
  onSubmit,
  projectId
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
  );
};

export default ChatInput;