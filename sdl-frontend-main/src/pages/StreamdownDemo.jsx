import React, { useState } from 'react';
import MessageContent from '../components/MessageContent';

/**
 * Streamdown 渲染效果示範頁面
 * 訪問路徑：/streamdown-demo
 */
export default function StreamdownDemo() {
  const [isStreaming, setIsStreaming] = useState(false);

  // 各種 Markdown 語法示例
  const examples = {
    basic: `# 基礎 Markdown 測試

這是一段普通文字，包含 **粗體**、*斜體*、~~刪除線~~ 和 \`行內程式碼\`。

## 列表測試

### 無序列表
- 項目 1
- 項目 2
  - 子項目 2.1
  - 子項目 2.2
- 項目 3

### 有序列表
1. 第一步
2. 第二步
3. 第三步

### 任務列表（GFM）
- [x] 已完成的任務
- [ ] 待完成的任務
- [x] 另一個已完成的任務`,

    code: `# 程式碼區塊測試

## JavaScript 範例
\`\`\`javascript
// React Hook 示例
import { useState, useEffect } from 'react';

function useCounter(initialValue = 0) {
  const [count, setCount] = useState(initialValue);

  useEffect(() => {
    console.log('Count changed:', count);
  }, [count]);

  const increment = () => setCount(c => c + 1);
  const decrement = () => setCount(c => c - 1);

  return { count, increment, decrement };
}

export default useCounter;
\`\`\`

## Python 範例
\`\`\`python
# 斐波那契數列
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

# 生成前 10 個斐波那契數
result = [fibonacci(i) for i in range(10)]
print(f"前 10 個斐波那契數：{result}")
\`\`\`

## SQL 範例
\`\`\`sql
-- 複雜查詢示例
SELECT
    u.username,
    COUNT(p.id) as project_count,
    AVG(t.completion_rate) as avg_completion
FROM users u
LEFT JOIN projects p ON u.id = p.user_id
LEFT JOIN tasks t ON p.id = t.project_id
WHERE u.created_at >= '2024-01-01'
GROUP BY u.id, u.username
HAVING COUNT(p.id) > 5
ORDER BY avg_completion DESC
LIMIT 10;
\`\`\``,

    table: `# 表格測試

## 簡單表格

| 功能 | 支援 | 說明 |
|------|------|------|
| **基礎 Markdown** | ✅ | 粗體、斜體、連結等 |
| **GFM 表格** | ✅ | GitHub Flavored Markdown |
| **語法高亮** | ✅ | Shiki，支援 100+ 語言 |
| **數學公式** | ✅ | KaTeX 渲染 |
| **Mermaid 圖表** | ✅ | 流程圖、時序圖等 |

## 對齊測試

| 左對齊 | 居中對齊 | 右對齊 |
|:-------|:-------:|-------:|
| Left | Center | Right |
| 資料1 | 資料2 | 資料3 |
| A | B | C |

## 複雜表格

| 專案階段 | 任務數 | 完成率 | 預計完成時間 | 負責人 |
|---------|--------|--------|-------------|--------|
| 需求分析 | 12 | 100% | 2024-01-15 | Alice |
| 設計階段 | 8 | 75% | 2024-02-01 | Bob |
| 開發階段 | 25 | 40% | 2024-03-15 | Team |
| 測試階段 | 15 | 0% | 2024-04-01 | QA |`,

    math: `# 數學公式測試（KaTeX）

## 行內公式

這是愛因斯坦的質能方程：$E = mc^2$

圓周率的值約為 $\\pi \\approx 3.14159$

## 區塊公式

$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$

## 矩陣運算

$$
\\begin{bmatrix}
a & b \\\\
c & d
\\end{bmatrix}
\\begin{bmatrix}
x \\\\
y
\\end{bmatrix}
=
\\begin{bmatrix}
ax + by \\\\
cx + dy
\\end{bmatrix}
$$

## 求和公式

$$
\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}
$$

## 二次方程式

$$
x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
$$`,

    mermaid: `# Mermaid 圖表測試

## 流程圖

\`\`\`mermaid
graph TD
    A[開始] --> B{是否登入?}
    B -->|是| C[顯示主頁]
    B -->|否| D[顯示登入頁]
    C --> E[選擇專案]
    E --> F[進入看板]
    D --> G[輸入帳密]
    G --> H{驗證成功?}
    H -->|是| C
    H -->|否| I[顯示錯誤]
    I --> D
\`\`\`

## 時序圖

\`\`\`mermaid
sequenceDiagram
    participant U as 使用者
    participant F as 前端
    participant B as 後端
    participant D as 資料庫

    U->>F: 提交表單
    F->>B: POST /api/submit
    B->>D: INSERT 資料
    D-->>B: 確認新增
    B-->>F: 回傳結果
    F-->>U: 顯示成功訊息
\`\`\``,

    advanced: `# 進階功能測試

## 引用區塊

> "好程式設計師關心的是資料結構，而不是程式碼。"
>
> — Linus Torvalds

> **巢狀引用**
>
> > 這是第二層引用
> >
> > > 這是第三層引用

## 連結測試

- 外部連結：[Google](https://www.google.com)
- 內部連結：[專案助手](/project/123)
- 自動連結：https://github.com/anthropics/streamdown

## 圖片測試（如果有圖片 URL）

![範例圖片](https://via.placeholder.com/400x200?text=Streamdown+Demo)

## 分隔線

---

## 混合內容

這是一段包含多種元素的內容：

1. **粗體文字** 和 *斜體文字*
2. \`行內程式碼\` 和連結 [GitHub](https://github.com)
3. 數學公式 $x^2 + y^2 = z^2$

\`\`\`javascript
// 程式碼區塊
const message = "Hello, Streamdown!";
console.log(message);
\`\`\`

| 欄位 | 值 |
|------|-----|
| 名稱 | Streamdown |
| 版本 | 1.4.0 |

> 最後是一段引用

---

**結論**：Streamdown 完美支援所有這些功能！ 🎉`
  };

  const [currentExample, setCurrentExample] = useState('basic');

  return (
    <div className="min-h-screen bg-gray-50 p-component-lg">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-display font-bold text-gray-900 mb-2">
            Streamdown 渲染效果示範
          </h1>
          <p className="text-gray-600">
            展示 Streamdown 在「專案助手」中的 Markdown 渲染能力
          </p>
        </div>

        {/* Controls */}
        <div className="mb-6 bg-white rounded-lg shadow-sm p-component-base">
          <div className="flex items-center gap-stack-sm mb-4">
            <label className="flex items-center gap-stack-xs">
              <input
                type="checkbox"
                checked={isStreaming}
                onChange={(e) => setIsStreaming(e.target.checked)}
                className="rounded"
              />
              <span className="text-body-sm text-gray-700">
                模擬 Streaming 模式（啟用動畫效果）
              </span>
            </label>
          </div>

          <div className="flex flex-wrap gap-stack-xs">
            {Object.keys(examples).map((key) => (
              <button
                key={key}
                onClick={() => setCurrentExample(key)}
                className={`px-4 py-2 rounded-lg text-body-sm font-medium transition-colors ${
                  currentExample === key
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {key === 'basic' && '📝 基礎語法'}
                {key === 'code' && '💻 程式碼'}
                {key === 'table' && '📊 表格'}
                {key === 'math' && '🔢 數學公式'}
                {key === 'mermaid' && '📈 圖表'}
                {key === 'advanced' && '🚀 進階功能'}
              </button>
            ))}
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-stack-md">
          {/* Raw Markdown */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="bg-gray-800 text-white px-4 py-2 text-body-sm font-mono">
              原始 Markdown
            </div>
            <pre className="p-component-base overflow-auto max-h-[600px] text-body-sm font-mono bg-gray-50">
              {examples[currentExample]}
            </pre>
          </div>

          {/* Rendered Output */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="bg-teal-600 text-white px-4 py-2 text-body-sm font-semibold flex items-center justify-between">
              <span>Streamdown 渲染結果</span>
              {isStreaming && (
                <span className="text-caption bg-teal-700 px-2 py-1 rounded">
                  🔄 Streaming 模式
                </span>
              )}
            </div>
            <div className="p-component-base overflow-auto max-h-[600px]">
              <MessageContent
                content={examples[currentExample]}
                isStreaming={isStreaming}
              />
            </div>
          </div>
        </div>

        {/* Feature Comparison */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-component-md-lg">
          <h2 className="text-h2 font-bold text-gray-900 mb-4">
            vs react-markdown 對比
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-body-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">功能</th>
                  <th className="px-4 py-3 text-center font-semibold">react-markdown</th>
                  <th className="px-4 py-3 text-center font-semibold">Streamdown</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="px-4 py-3">基礎 Markdown</td>
                  <td className="px-4 py-3 text-center">✅</td>
                  <td className="px-4 py-3 text-center">✅</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">GFM（表格、任務列表）</td>
                  <td className="px-4 py-3 text-center">✅ 需安裝 plugin</td>
                  <td className="px-4 py-3 text-center">✅ 內建</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">語法高亮</td>
                  <td className="px-4 py-3 text-center">✅ 需安裝 plugin</td>
                  <td className="px-4 py-3 text-center">✅ 內建 Shiki</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">數學公式（KaTeX）</td>
                  <td className="px-4 py-3 text-center">✅ 需安裝 plugin</td>
                  <td className="px-4 py-3 text-center">✅ 內建</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Mermaid 圖表</td>
                  <td className="px-4 py-3 text-center">❌</td>
                  <td className="px-4 py-3 text-center">✅ 內建</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">處理未完成 Markdown</td>
                  <td className="px-4 py-3 text-center">❌</td>
                  <td className="px-4 py-3 text-center">✅ AI Streaming 優化</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">XSS 防護</td>
                  <td className="px-4 py-3 text-center">✅ 需配置</td>
                  <td className="px-4 py-3 text-center">✅ 預設啟用</td>
                </tr>
                <tr className="bg-teal-50">
                  <td className="px-4 py-3 font-semibold">配置複雜度</td>
                  <td className="px-4 py-3 text-center">😰 高</td>
                  <td className="px-4 py-3 text-center">😊 低</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-component-md-lg">
          <h3 className="text-body-lg font-semibold text-blue-900 mb-2">
            💡 如何在專案助手中測試
          </h3>
          <ol className="list-decimal list-inside space-y-stack-xs text-blue-800">
            <li>進入任意專案頁面</li>
            <li>開啟「AI 導師」（專案助手）</li>
            <li>輸入包含 Markdown 語法的訊息</li>
            <li>查看 AI 回應是否正確渲染</li>
          </ol>
          <div className="mt-4 p-component-sm bg-white rounded border border-blue-200">
            <p className="text-body-sm text-gray-700 mb-2 font-semibold">測試範例（複製貼到 AI 導師）：</p>
            <code className="text-caption block bg-gray-50 p-component-xs rounded">
              請用 Markdown 格式回覆：列出專案管理的**三個關鍵步驟**，並用表格展示每個步驟的重要性評分（1-5分）
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
