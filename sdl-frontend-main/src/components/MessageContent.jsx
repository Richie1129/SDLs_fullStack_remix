import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * MessageContent - 專門用於渲染 AI 助手消息內容的組件
 *
 * 改用 react-markdown + remark-gfm（取代 streamdown）：
 * 1. 唯一的正式使用端 SdlCoachChat 一次拿到完整回答再渲染，沒有串流中途的不完整 Markdown
 * 2. 回答內容只用 GFM（標題、清單、粗體、表格、程式碼區塊），沒有 mermaid / KaTeX / 圖表
 * 3. react-markdown 與 remark-gfm 已被同一棵 Kanban 元件樹（ChatContent.jsx）載入，零額外體積；
 *    streamdown 會帶入 shiki / mermaid / katex / cytoscape 約 738 KB
 *
 * @param {string} content - Markdown 格式的消息內容
 * @returns {JSX.Element}
 */

const REMARK_PLUGINS = [remarkGfm];

// react-markdown v9+ 不再提供 inline 旗標：有 language-* class 或含換行者視為區塊程式碼
const isBlockCode = (className, children) =>
  /language-/.test(className || '') || String(children).includes('\n');

const components = {
  p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
  h1: ({ children }) => <h1 className="text-body font-bold text-gray-800 mt-3 mb-1">{children}</h1>,
  h2: ({ children }) => <h2 className="text-body font-bold text-gray-800 mt-3 mb-1">{children}</h2>,
  h3: ({ children }) => <h3 className="text-body-sm font-semibold text-gray-800 mt-2 mb-1">{children}</h3>,
  ul: ({ children }) => <ul className="list-disc pl-5 my-1 space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 my-1 space-y-0.5">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-customgreen underline hover:text-customgreen/80 transition-colors duration-fast break-all"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-customgreen/60 pl-3 my-2 text-gray-600">{children}</blockquote>
  ),
  strong: ({ children }) => <strong className="font-semibold text-gray-800">{children}</strong>,
  hr: () => <hr className="my-2 border-gray-200" />,
  table: ({ children }) => (
    <div className="overflow-x-auto my-2">
      <table className="min-w-full text-caption border border-gray-200">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border border-gray-200 bg-gray-50 px-2 py-1 text-left font-semibold">{children}</th>,
  td: ({ children }) => <td className="border border-gray-200 px-2 py-1 align-top">{children}</td>,
  pre: ({ children }) => (
    <pre className="bg-gray-50 border border-gray-200 rounded-lg p-component-sm my-2 overflow-x-auto text-caption font-mono">
      {children}
    </pre>
  ),
  code: ({ node: _node, className, children, ...props }) =>
    isBlockCode(className, children) ? (
      <code className={className} {...props}>{children}</code>
    ) : (
      <code className="bg-gray-100 text-gray-700 px-1 py-0.5 rounded text-caption font-mono" {...props}>
        {children}
      </code>
    ),
};

export default function MessageContent({ content }) {
  return (
    <div className="text-body-sm text-gray-800 break-words">
      <ReactMarkdown remarkPlugins={REMARK_PLUGINS} components={components}>
        {content || ''}
      </ReactMarkdown>
    </div>
  );
}
