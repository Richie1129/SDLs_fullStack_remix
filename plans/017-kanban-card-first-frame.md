# 017：Kanban 卡片首幀空殼與圖片佔位（F034）

- **嚴重度**：LOW
- **基準 commit**：`b0dda75`
- **範圍**：`src/pages/Kanban/components/carditem/hooks/useCardData.js`、`src/pages/Kanban/components/carditem/components/SharedComponents.jsx`

## 現況

- `useCardData.js:19` 以空物件初始化 `cardData`，靠 `useEffect` 從 props 複製，首幀是沒有標題的白殼。
- `SharedComponents.jsx:20` `CardImage` 容器 `relative w-full h-40`，內部 `AuthImage` 在 blob 回來前 `opacity-0`，容器本身透明，圖片區在載入時是白色空洞。

## 目標

1. `useCardData.js`：抽出 `normalizeCard(initialData)`（處理 images / files / owner），`useState(() => normalizeCard(initialData))`，effect 內改呼叫同一個函式。
2. `CardImage` 容器加 `bg-gray-100 rounded-t-lg overflow-hidden`，圖片載入前顯示固定 160px 灰底。

## 驗證

- `grep -n "useState(() => normalizeCard" src/pages/Kanban/components/carditem/hooks/useCardData.js`
