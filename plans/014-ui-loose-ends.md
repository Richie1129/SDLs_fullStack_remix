# 014：UI 收尾雜項（F031 全部九項）

- **嚴重度**：MEDIUM
- **基準 commit**：`b0dda75`
- **執行模型**：sonnet；只用 Edit 改既有檔，新檔才用 Write；每一項改完用 grep 驗證
- **不要碰**：`SideBar.jsx`、`ProjectLayout.jsx`、`TopBar.jsx`、`SubStageBar.jsx`（另一個代理正在改）；不動任何 `import ... from '.../utils/userUtils'` 那一行（下一批會改）

## 1. AI 助手泡泡手機定位與導覽期間隱藏

檔案：`src/pages/Kanban/components/DraggableImage/hooks/useResponsive.js`、`.../components/DraggableAvatar.jsx`、`.../hooks/useUIState.js`、`.../index.jsx`、`src/pages/Kanban/Kanban.jsx`

- `DraggableAvatar.jsx:15` 手機 FAB 改 `{ right: 16, bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }`（SubStageBar 手機高 3rem + 16px 間隙）。
- `useResponsive.js:70` 手機分支改：`right: 16, bottom: 'calc(4rem + 3.5rem + 0.5rem + env(safe-area-inset-bottom, 0px))'`（FAB 底 + 頭像 56px + 8px 間隙），`maxWidth: Math.min(240, viewW - 32)`。
- `useUIState.js:17` 的 10 秒 interval：新增 `const dismissedRef = useRef(false)`；`setShowMessage(false)` 的關閉路徑（使用者按 X）把 `dismissedRef.current = true`；interval 內 `if (!showChat && !dismissedRef.current) setShowMessage(true)`。使用者關過一次後不再每 10 秒跳出（桌面與手機一致）。
- `index.jsx`：新增 prop `suppressMessage = false`；泡泡條件改 `showMessage && !suppressMessage && !(isMobile && showChat)`。
- `Kanban.jsx:535` 傳 `suppressMessage={showOnboarding}`。
- `index.jsx:125` 的 `✕` 改 `<FiX className="w-3.5 h-3.5" aria-hidden="true" />`，按鈕加 `aria-label="關閉提示"`。

## 2. Kanban 欄位「刪除列」降級

檔案：`src/pages/Kanban/components/KanbanColumn.jsx`

- 欄位容器（`:48` `group-container w-full md:w-60 ...`）加 `group/column`。
- 刪除鈕 class 改 `text-[#494b4a] hover:text-[#494b4a]/60 transition-opacity duration-fast opacity-0 group-hover/column:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-60`；`title="删除列"` 改 `title="刪除欄位"`，加 `aria-label="刪除欄位"`。
- 確認對話框已經在 `Kanban.jsx:394 handleDeleteColumn` 走 Swal，不需改；但把該 Swal 的 `text` 改「欄位內的卡片會一併刪除，確定要刪除嗎」、`title` 改「刪除欄位」。

## 3. 10 處 `window.alert` / `confirm` 統一走 Swal

新增 `src/utils/dialogs.js`：

```js
import Swal from 'sweetalert2';
const BRAND = '#5BA491';
const DANGER = '#d33';
export async function confirmDialog({ title = '請確認', text = '', confirmText = '確定', cancelText = '取消', icon = 'warning', danger = false } = {}) {
  const result = await Swal.fire({ title, text, icon, showCancelButton: true, confirmButtonColor: danger ? DANGER : BRAND, cancelButtonColor: danger ? BRAND : DANGER, confirmButtonText: confirmText, cancelButtonText: cancelText, reverseButtons: danger });
  return result.isConfirmed;
}
export function alertError(text, title = '發生錯誤') {
  return Swal.fire({ title, text, icon: 'error', confirmButtonColor: BRAND, confirmButtonText: '確定' });
}
export function alertInfo(text, title = '提示') {
  return Swal.fire({ title, text, icon: 'info', confirmButtonColor: BRAND, confirmButtonText: '確定' });
}
```

逐處替換（`danger: true` 用於刪除類）：

| 位置 | 現況 | 改法 |
|---|---|---|
| `src/pages/reflection/hooks/usePersonalDaily.js:135` | `window.confirm` 刪除個人日誌 | `await confirmDialog({ title: '刪除日誌', text: \`確定要刪除「${...}」嗎？此動作無法復原。\`, confirmText: '刪除', danger: true })`；函式改 async |
| `src/pages/reflection/hooks/useTeamDaily.js:126` | 同上（小組） | 同上 |
| `src/pages/Kanban/components/carditem/components/CommentSection.jsx:81` | `window.confirm` 刪除評論 | `confirmDialog({ title: '刪除評論', text: '確定要刪除這則評論嗎？', confirmText: '刪除', danger: true })` |
| `src/pages/ideaWall/IdeaWall.jsx:156` | `window.confirm` 取消連結 | `confirmDialog({ title: '取消連結', text: '確定要取消此連結嗎？', confirmText: '取消連結', danger: true })` |
| `src/components/SdlCoachChat.jsx:119` | `window.confirm` 清空紀錄 | `confirmDialog({ title: '清空歷史紀錄', text: '確定要清空與自主學習助手的所有歷史紀錄嗎？此動作無法復原。', confirmText: '清空', danger: true })` |
| `src/components/SdlCoachChat.jsx:127` | `window.alert` 清空失敗 | `alertError('清空失敗，請稍後再試')` |
| `src/pages/teacher-dashboard/components/HelpSeekingView.jsx:56` | `alert` | `alertError('無法載入學生詳情，請重試')` |
| `src/pages/teacher-dashboard/components/AvoidanceRiskAlert.jsx:68` | `alert` | `alertError('更新失敗，請重試')` |
| `src/pages/ExportPreview/index.jsx:97` | `alert` | `alertError('PDF 生成失敗，請稍後再試')` |
| `src/components/ErrorBoundary/KanbanErrorBoundary.jsx:160` | `window.confirm` 重新載入 | `confirmDialog({ title: '重新載入頁面', text: '請確認您的工作已保存。', confirmText: '重新載入', icon: 'question' }).then(ok => { if (ok) window.location.reload(); })`（class component，改成 promise 鏈） |

替換後：`grep -rn "window\.alert\|window\.confirm\|[^a-zA-Z.]alert(\|[^a-zA-Z.]confirm(" src --exclude-dir=test` 只剩測試字串。注意 `usePersonalDaily` / `useTeamDaily` 內部變數名 `confirm` 會與 import 衝突，改名 `ok`。

## 4. UI emoji 換 react-icons

規則：只改會渲染到畫面上的字串；`console.*`、註解、`ideaWallConstants.js` 的註解不動。`<option>` 內不能放 SVG。

| 檔案 | 改法 |
|---|---|
| `src/pages/StudentPortfolio/templates/ModernTemplate.jsx`、`TimelineTemplate.jsx` | `STAGE_ICONS` 改成元件對照：`{ 1: FiTarget, 2: FiMap, 3: FiSearch, 4: FiRefreshCw }`，使用處改 `React.createElement(Icon, { size: 14, style: { verticalAlign: 'middle', marginRight: 4 } })`；其餘標題前綴 `📚`→`FiBookOpen`、`👩‍🏫`→`FiUser`、`📅`→`FiCalendar`、`✨`→`FiStar`、`📋`→`FiClipboard`、`💭`→`FiMessageCircle`、`💡`→`FiZap`、`🌟`→`FiSun`、`📌`→`FiMapPin`、`🤖`→`FiCpu`，一律 `size={14}`、`style={{ verticalAlign: 'middle', marginRight: 4 }}`（這些模板用 inline style，維持同一套） |
| `src/pages/StudentPortfolio/templates/ClassicTemplate.jsx:153,292` | `💡` → `FiZap` 同上 |
| `src/pages/StudentPortfolio/components/TemplateSelector.jsx:42,63` | `🎯 定標階段`→`<FiTarget className="inline w-3.5 h-3.5 mr-1" />定標階段`，`🗺️ 擇策階段`→`FiMap`；`:63` 的陣列改成 `[{ Icon: FiTarget, label: '定標階段' }, { Icon: FiMap, label: '擇策階段' }]` |
| `src/pages/teacher-dashboard/components/HelpSeekingView.jsx:316` | `⚠️` → `<FiAlertTriangle className="w-10 h-10 mx-auto text-red-500" />` |
| `src/pages/ideaWall/components/modals/CreateNodeModal.jsx:30` | `💡 AI 建議參考` → `<FiZap className="inline w-4 h-4 mr-1" />AI 建議參考` |
| `src/pages/teacher-dashboard/components/QuickActions.jsx:55,59,102,106,181,186,202,206,218,222` | 去掉 `✅ ` / `❌ ` 前綴；`showNotification(message, type = 'success')`，失敗處傳 `'error'`；toast 元素依 type 顯示 `FiCheckCircle` / `FiAlertCircle` 圖示與顏色（讀該檔的 toast JSX 後改） |
| `src/pages/home/components/ProjectCard.jsx:267,272` | `✓`→`<FiCheck className="inline w-3.5 h-3.5 mr-1" />`，`✗`→`<FiX .../>` |
| `src/pages/protfolio/Protfolio.jsx:475` | `'✓'` → `<FiCheck className="w-4 h-4" />` |
| `src/components/AITaskAssistant/AITaskAssistantModalContent.jsx:403`、`AITaskHistoryDetail.jsx:167`、`src/pages/teacher-dashboard/components/FilterBar.jsx:200` | `✓` → `<FiCheck className="w-4 h-4" />`（保留原 span 的 class） |
| `src/pages/teacher-dashboard/components/AnalyticsView.jsx:480`、`src/components/ActivityStream/ActivityStream.jsx:89`、`src/pages/Kanban/components/DraggableImage/components/ChatWindow.jsx:176` | `✕` → `<FiX className="w-5 h-5" aria-hidden="true" />`，按鈕補 `aria-label="關閉"` |
| `src/components/reflection/StageSelector.jsx:65` | `<option>` 內 `★ ` 改成後綴 `（推薦）` |

完成後 `grep -rnP '[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}\x{2B50}\x{2705}\x{274C}\x{2716}\x{2715}\x{2714}\x{2713}\x{2728}]' src --exclude-dir=test | grep -vE ':\s*(//|\*|/\*)' | grep -v 'console\.'` 應只剩 `ideaWallConstants.js` 的行尾註解。

## 5. 學習狀態提醒標題列手機換行

`src/pages/student-dashboard/components/StudentSelfRiskAlert.jsx:101-124`：header 容器加 `gap-2 flex-wrap`；左群組 `min-w-0`、「學習狀態提醒」span 加 `whitespace-nowrap`、「N 項」badge 加 `whitespace-nowrap shrink-0`；右群組加 `shrink-0 ml-auto`，「今天不看」按鈕加 `whitespace-nowrap`。

## 6. 404 頁

`src/pages/notFound/NotFound.jsx` 重寫：

```jsx
import React from 'react';
import { Link } from 'react-router-dom';
export default function NotFound() {
  return (
    <div className="w-screen h-[100dvh] flex flex-col justify-center items-center gap-stack-sm px-component-base text-center">
      <h1 className="text-display text-amber-500">404</h1>
      <h2 className="text-h2 text-gray-900">找不到這個頁面</h2>
      <p className="text-body text-gray-600">網址可能打錯了，或這個頁面已經不存在。</p>
      <Link to="/" className="mt-2 inline-flex items-center px-btn-x py-btn-y rounded-lg bg-customgreen text-white font-semibold hover:bg-customgreen/90 hover:shadow-lg transition-all duration-fast">回到首頁</Link>
    </div>
  );
}
```

## 7. 文案：去驚嘆號、錯誤頁直述、空狀態

逐行改（只改字串，不動邏輯）：

| 檔案:行 | 改成 |
|---|---|
| `src/components/ProjectCommentDrawer.jsx:61` | `'儲存成功'` |
| `src/components/ProjectCommentDrawer.jsx:217` | `'此操作無法復原'` |
| `src/pages/Kanban/hooks/useKanbanData.js:176,208` | `'已刪除'` |
| `src/pages/login/Login.jsx:179` | text 改 `` `歡迎回來，${res.data.username}` `` |
| `src/components/announcement/AnnouncementDetailModal.jsx:18` | `'確定要刪除此公告嗎？此操作無法復原'` |
| `src/pages/submit/SubmitTask.jsx:191` | `"請確認所有欄位皆填寫完整"` |
| `src/pages/login/Register.jsx:104` | title `'註冊成功'`、text `'您已成功註冊'` |
| `src/pages/login/Register.jsx:112` | text `'請檢查您的帳號或密碼'` |
| `src/pages/ideaWall/IdeaWall.jsx:144,162` | `'連線建立成功'`、`'連線已取消'` |
| `src/pages/reflection/components/SmartReflectionBanner.jsx:115,128` | `"試試看深度反思"`、`"已進入新階段"` |
| `src/pages/protfolio/Protfolio.jsx:174` | `"儲存成功"` |
| `src/pages/AskQuestion/AskQuestion.jsx:142` | `"此操作無法復原"` |
| `src/components/FiveRsReflectionForm.jsx:166` | `'AI 分析完成'` |
| `src/pages/observation/ClassObservationPage.jsx:133,144,198,207` | `'觀摩設定已更新'`、`'請重試'`、`'批量設定成功'`、`... || '請重試'` |
| `src/pages/ideaWall/components/KB_Coach.jsx:138,196` | `` `${agentType} 分析完成` ``、`'感謝您的回饋'` / `'感謝您的回饋，我們會持續改進'` |
| `src/pages/Kanban/components/carditem/components/CardDetailModal.jsx:152` | `"請填寫卡片標題"` |
| `src/pages/home/HomePage.jsx:204` | `"刪除後將無法恢復"` |
| `src/pages/ideaWall/hooks/useNodeOperations.js:86,153,243` | `"標題及內容請填寫完整"` x2、`'已為您準備好節點，請繼續完成您的想法'` |
| `src/pages/Kanban/components/DraggableImage/hooks/useChatSession.js:526,582` | `'刪除後將無法恢復'`、`'刪除成功'` |
| `src/components/ErrorBoundary/GlobalErrorBoundary.jsx:97` | `頁面發生錯誤` |
| `src/pages/reflection/components/ReflectionLayout.jsx:189,257` | `"還沒有個人日誌，寫下第一篇吧"`、`"還沒有小組日誌，寫下第一篇吧"` |
| `src/pages/student-dashboard/components/PersonalData.jsx:98` | `還沒有任務，到看板建立第一張卡片` |

## 8. `ChatRoom.jsx` 的 `<img>` 補 `alt`

`src/components/ChatRoom.jsx:178`（以及檔內任何沒有 alt 的 `<img>`）：`alt={message.username ? \`${message.username} 的頭像\` : '使用者頭像'}`，依該處實際變數名調整；純裝飾就 `alt=""`。

## 9. 兩處 `scrollbar-hidden`

`src/pages/home/HomePage.jsx:305`、`src/pages/overview/ManagementOverview.jsx:163`：`scrollbar-hidden` 不是任何套件提供的 class，目前沒有作用、頁面捲軸本來就看得到。決定：**保留可見捲軸**，只刪掉這個無效 class，不換成 `scrollbar-none`。

## 驗證

- 每項對應的 grep；`npx eslint` 改過的檔案。
- 不跑 build 與 vitest（主代理統一跑）。
