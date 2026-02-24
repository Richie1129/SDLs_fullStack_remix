import React from "react";

const ChatInput = ({
  inputRef,
  isLoading,
  projectId,
  onSubmit,
  embedded = false
}) => {
  return (
    <form
      onSubmit={onSubmit}
      className={`input-area px-5 py-4 gap-3 border-t border-[#e9ecef] ${embedded ? 'bg-transparent' : 'bg-white'} flex items-center`}
    >
      <input
        ref={inputRef}
        type="text"
        placeholder={
          !projectId
            ? '請先選擇專案'
            : isLoading
              ? '等待回應中...'
              : '詢問專案相關問題...'
        }
        className="flex-1 py-3 px-4 text-[14px] border border-[#dee2e6] rounded-full outline-none transition-all bg-[#f8f9fa] focus:border-[#5BA491] focus:bg-white focus:ring-2 focus:ring-[rgba(91,164,145,0.1)] disabled:bg-[#e9ecef] disabled:cursor-not-allowed"
        disabled={isLoading || !projectId}
        autoFocus
      />
      <button
        type="submit"
        className={`py-3 px-5 text-[14px] min-w-[80px] rounded-full border-0 font-semibold ${
          isLoading
            ? 'bg-[#dee2e6] cursor-not-allowed shadow-none'
            : 'bg-[#5BA491] cursor-pointer shadow-[0_2px_8px_rgba(91,164,145,0.3)] hover:bg-[#4a9076] hover:shadow-lg'
        } text-white transition-all duration-fast`}
        disabled={isLoading || !projectId}
      >
        {isLoading ? "送出中..." : "送出"}
      </button>
    </form>
  );
};

export default ChatInput;
