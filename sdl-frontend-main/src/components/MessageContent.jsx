import { Streamdown } from 'streamdown';

/**
 * MessageContent - 專門用於渲染 AI 助手消息內容的組件
 *
 * 為什麼使用 Streamdown 而非 react-markdown：
 * 1. 專為 AI streaming 設計，處理未完成的 Markdown 語法
 * 2. 內建 GitHub Flavored Markdown、語法高亮、數學公式、Mermaid 圖表
 * 3. 更好的安全性（XSS 防護）
 * 4. 為未來 streaming 功能留下零成本升級路徑
 *
 * @param {string} content - Markdown 格式的消息內容
 * @param {boolean} isStreaming - 是否正在串流中（未來擴展用）
 * @returns {JSX.Element}
 */
export default function MessageContent({ content, isStreaming = false }) {
  return (
    <Streamdown
      isAnimating={isStreaming}
      shikiTheme={['github-light', 'github-dark']}
      className="prose prose-sm max-w-none break-words"
      parseIncompleteMarkdown={true}
    >
      {content}
    </Streamdown>
  );
}
