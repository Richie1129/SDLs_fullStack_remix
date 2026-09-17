# 011 — 錯誤態實質 bug、Kanban 載入骨架、首頁學期假空狀態、除錯文案

- **Status**: TODO
- **Commit**: 564c298
- **Severity**: HIGH（兩個實質 bug：API 失敗畫面空白；實測：剛登入看到假的「還沒有活動」）
- **Category**: 狀態完整性與文案
- **Estimated scope**: 6 個檔案，約 60 行

## Problem

**A. `isError.message` 是 undefined（實質 bug）**

react-query 的 `isError` 是布林，`true.message` 是 `undefined`，API 失敗時畫面只剩一個空的 `<p>`。

```jsx
{/* src/pages/Kanban/Kanban.jsx:908-909 — current */}
                  kanbanIsLoading ? <Loader /> :
                    kanbansIsError ? <p className=' font-bold text-h2'>{kanbansIsError.message}</p> :
```
```jsx
{/* src/pages/protfolio/Protfolio.jsx:447-451 — current */}
                        ) : isError ? (
                            <div className="text-center py-12 px-4">
                                <p className="text-red-500 font-medium">{isError.message}</p>
                            </div>
```
`useKanbanData.js:30-35` 的 `useQuery` 已解構 `error` 但第 622 行起的回傳沒有把它交出去；`Kanban.jsx:42-43` 只拿 `isLoading` 與 `isError`。

**B. Kanban 載入只有全頁 spinner，且實測欄位先出現、卡片約 3 秒後才進來**

`Kanban.jsx:908` 在 `kanbanIsLoading` 時渲染 `<Loader />`。實測重新整理專案 8 的看板，三個欄位與「新增卡片」按鈕先畫出來、卡片延遲出現，中間看起來像沒有任務。`SkeletonLoader.jsx` 已有 `SkeletonCard` 但沒有欄位骨架。

**C. 首頁學期預設造成假空狀態**

`useProjectData.js:21` 的 `semesterFilter` 預設 `getCurrentSemester()`（115-1）；學生的專案都在 114-2，登入後「進行中活動」顯示「還沒有進行中活動／開始您的學習旅程，點擊下方按鈕加入活動吧！」。`HomePage.jsx:81-84` 已有 `allStudentProjects`（不受學期篩選的完整清單），可以算出其他學期的數量。空狀態文案在 `ProjectSection.jsx:64-75`，且已支援 `emptyStateConfig` 覆寫。

**D. 除錯文案**

```jsx
{/* src/pages/student-dashboard/index.jsx:90-94 — current */}
              {ideaNodes.length > 0 && (
                <p className="text-caption text-gray-500 mt-1">
                  已載入 {ideaNodes.length} 個想法節點，{kanbanTasks.length} 個任務
                </p>
              )}
```
讀起來像 console log，對學生沒有意義。

## Target

**A.**
```js
// useKanbanData.js 回傳物件（第 622 行起）加 error 與 refetch：
//   useQuery 解構處（第 30-35 行）加 refetch；回傳物件加 `error, refetch,`
```
```jsx
{/* Kanban.jsx:42-43 解構加 error: kanbanError, refetch: refetchKanban */}
{/* Kanban.jsx:909 target */}
                    kanbansIsError ? (
                      <div className="flex flex-col items-center justify-center gap-stack-sm py-12 text-center">
                        <p className="text-body font-medium text-gray-700">看板載入失敗，{kanbanError?.message || '請稍後再試'}</p>
                        <button type="button" onClick={() => refetchKanban()} className="px-4 py-2 rounded-md bg-customgreen text-white text-body-sm font-medium hover:bg-customgreen/90 transition-colors duration-fast">重新載入</button>
                      </div>
                    ) :
```
Protfolio.jsx：先 `grep -n "isError" src/pages/protfolio/Protfolio.jsx` 找到 `useQuery` 解構處，加 `error, refetch`，第 449 行改為 `{error?.message || '載入失敗，請稍後再試'}` 並在下方加同款「重新載入」按鈕。

**B.**
```jsx
// src/components/SkeletonLoader.jsx 新增 export（放在 SkeletonDashboard 之前）
/**
 * SkeletonKanbanColumn - 看板欄位骨架
 * 用於 Kanban 初次載入，代替全頁 spinner
 */
export const SkeletonKanbanColumn = ({ cards = 2 }) => (
  <div className="animate-pulse w-[280px] flex-shrink-0 bg-gray-100 rounded-lg p-component-sm space-y-3">
    <div className="h-5 bg-gray-300 rounded w-24" />
    {Array.from({ length: cards }).map((_, i) => (
      <div key={i} className="bg-gray-200 rounded-lg h-24" />
    ))}
    <div className="h-8 bg-gray-300 rounded w-20" />
  </div>
);
```
```jsx
{/* Kanban.jsx:908 target */}
                  kanbanIsLoading ? (
                    <div className="flex gap-stack-base">
                      <SkeletonKanbanColumn /><SkeletonKanbanColumn /><SkeletonKanbanColumn cards={0} />
                    </div>
                  ) :
```
並在 Kanban.jsx 頂部 `import { SkeletonKanbanColumn } from '../../components/SkeletonLoader';`。

「欄位先出現、卡片後到」的 3 秒空窗要先診斷：DevTools Network 設 Slow 3G 重新整理，觀察 `kanbanDatas` 回應是否一次帶回 `task` 陣列。若是一次帶回，空窗來自其他非同步（例如成員或圖片查詢），在回報中寫明來源；若 `task` 是第二段請求補進來的，在 `KanbanColumn.jsx:78` 附近於 `column.task` 尚未到齊時渲染 `SkeletonCard`（本計畫不預先寫這段，因為要看診斷結果）。

**C.**
```jsx
// HomePage.jsx：在 studentAvailableSemesters 之後新增
  const otherSemesterCount = useMemo(() => (
    role === 'student' ? allStudentProjects.filter(p => p.semester && p.semester !== semesterFilter).length : 0
  ), [role, allStudentProjects, semesterFilter]);
```
```jsx
{/* HomePage.jsx:341 起的「進行中活動」<ProjectSection ...> 加 prop */}
  emptyStateConfig={otherSemesterCount > 0 ? {
    title: '這個學期還沒有活動',
    description: `其他學期有 ${otherSemesterCount} 個活動，可從右上角切換學期查看`,
  } : undefined}
```
同時把 `ProjectSection.jsx:73` 預設描述 `"開始您的學習旅程，點擊下方按鈕加入活動吧！"` 改為 `"點擊下方按鈕加入活動"`（去驚嘆號與冗詞）。

**D.** 刪除 `student-dashboard/index.jsx:90-94` 整段。

## Repo conventions to follow

- 按鈕樣式沿用 `DESIGN_SYSTEM.md` 主要按鈕：`bg-customgreen hover:bg-customgreen/90 transition-colors duration-fast`。
- 骨架元件放 `SkeletonLoader.jsx`，註解格式沿用該檔既有 JSDoc。
- 錯誤文案直述，不用「糟糕」「Oops」，不加驚嘆號。

## Steps

1. `useKanbanData.js`：解構加 `refetch`，回傳加 `error, refetch`。
2. `Kanban.jsx`：解構改名、匯入骨架、替換第 908 到 909 行兩個分支。
3. `Protfolio.jsx`：依 Target A 修。
4. `SkeletonLoader.jsx`：新增 `SkeletonKanbanColumn`，並加進檔尾 `export default {}` 物件。
5. 診斷卡片延遲空窗，結果寫進回報。
6. `HomePage.jsx`：加 `otherSemesterCount` 與 `emptyStateConfig`；`ProjectSection.jsx:73` 改文案。
7. `student-dashboard/index.jsx`：刪第 90 到 94 行。

## Boundaries

- 不改 `useProjectData.js` 的學期預設值（教師端也用，且「目前學期」是刻意的）。
- 不改 Kanban 的資料流、樂觀更新與 socket。
- 不動 Loader 元件本身（其他 12 處仍在用）。
- 任一「current」摘錄與實際不符，跳過該項並回報。

## Verification

- **Mechanical**：
  ```bash
  cd sdl-frontend-main
  grep -rn "isError\.message\|kanbansIsError\.message" src        # 無輸出
  grep -n "SkeletonKanbanColumn" src/components/SkeletonLoader.jsx src/pages/Kanban/Kanban.jsx   # 各 >= 1
  grep -n "已載入" src/pages/student-dashboard/index.jsx           # 無輸出
  grep -n "otherSemesterCount" src/pages/home/HomePage.jsx         # >= 2
  npm run build && npx vitest run
  ```
- **Feel check**：
  - 停掉 api 容器（`docker compose -f docker-compose.dev.yml stop api`）後重新整理 Kanban 與作品集頁：看到「載入失敗」與「重新載入」按鈕，不是空白；啟動 api 後按重新載入可恢復。
  - Kanban 重新整理：先看到三欄骨架，不是全頁轉圈。
  - 學生帳號首頁維持在「115-1 目前」：空狀態顯示「其他學期有 3 個活動」。
  - 學習歷程頁問候語下方沒有「已載入 N 個」。
- **Done when**：grep 符合、build 與測試通過、四項目視檢查通過，且回報含卡片延遲的診斷結論。
