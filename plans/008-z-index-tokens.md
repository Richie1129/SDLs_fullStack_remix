# 008 — 建立 z-index 語意 token，讓 AI 助手落到抽屜與 Modal 之下

- **Status**: TODO
- **Commit**: 564c298
- **Severity**: HIGH（實測：AI 助手泡泡蓋住評論抽屜、活動串流、卡片詳情 Modal；手機版蓋住 Kanban「新增卡片」按鈕）
- **Category**: 版面層級
- **Estimated scope**: 1 個 config + 約 14 個檔案各 1 到 3 行 class 替換 + 移除 1 段 hack（`useUIState.js`）

## Problem

全站沒有 z-index 尺度，各元件自己喊數字：Modal 與下拉是 `z-50`，抽屜 `z-[120]`，導覽 `z-[200]`，AI 助手頭像 `z-[1000]`、泡泡 `z-[1001]`、聊天視窗 `z-[1002]`、全螢幕聊天 `z-[9999]`，`useUIState.js` 還在 runtime 把 Swal 改成 `99999` 才蓋得過聊天視窗。結果 AI 助手永遠在最上層，實測時泡泡壓在抽屜和 Modal 上。

現況清單（全部要換掉）：

| 檔案:行 | 現況 | 元件性質 |
|---|---|---|
| `src/components/TopBar.jsx:195,266` | `z-40` | 頂欄 |
| `src/components/TopBar.jsx:233` | `z-50` | 使用者下拉 |
| `src/components/SideBar.jsx:71` | `z-50` | 階段 tooltip |
| `src/components/Modal.jsx:17,26` | `z-50` | 共用 Modal |
| `src/pages/Kanban/components/carditem/components/CardDetailModal.jsx:416` | `position="justify-center items-center z-[70]"` | 卡片 Modal |
| `src/pages/Kanban/components/carditem/components/CardDetailModal.jsx:476` | `position="justify-center items-center z-[80]"` | 卡片內圖片 Modal（疊在上一個之上） |
| `src/components/ProjectCommentDrawer.jsx:406`、`src/components/IdeaWall/IdeaWallChatPanel.jsx:44` | `z-[120]` | 右側抽屜 |
| `src/components/ActivityStream/ActivityStream.jsx:76` | `z-50` | 右側抽屜 |
| `src/components/ProjectCommentDrawer.jsx:499` | `position="justify-center items-center z-[80]"` | 抽屜內圖片 Modal |
| `src/pages/Kanban/Kanban.jsx:453` | `z-[100]` | 範本選擇 overlay |
| `src/pages/Kanban/components/ExampleTasksDialog.jsx:75` | `z-[150]` | 範例任務 overlay |
| `src/pages/student-dashboard/components/StageSuggestions.jsx:245` | `z-[1000]` | 建議 overlay |
| `src/pages/Kanban/components/KanbanOnboarding.jsx:51`、`src/pages/ideaWall/components/IdeaWallOnboarding.jsx:51` | `z-[200]` | 首次導覽 |
| `src/pages/Kanban/components/DraggableImage/components/DraggableAvatar.jsx:23` | `z-[1000]` | AI 助手頭像 |
| `src/pages/Kanban/components/DraggableImage/index.jsx:92` | `z-[1001]` | 手機聊天遮罩 |
| `src/pages/Kanban/components/DraggableImage/index.jsx:113` | `z-[1001]` | AI 助手泡泡 |
| `src/pages/Kanban/components/DraggableImage/components/ChatWindow.jsx:78,81` | `z-[1002]` | 聊天視窗（手機 sheet / 桌面浮窗） |
| `src/pages/Kanban/components/DraggableImage/components/ChatWindow.jsx:75` | `z-[9999]` | 全螢幕聊天 |
| `src/pages/Kanban/components/DraggableImage/hooks/useUIState.js:57-100` | `showSwalWithCorrectZIndex` 用 DOM 改 zIndex 到 `99999` | Swal hack |

```js
// src/pages/Kanban/components/DraggableImage/hooks/useUIState.js:57-100 — current（節錄）
  const showSwalWithCorrectZIndex = (options) => {
    if (isFullscreen) {
      const chatContainer = document.querySelector('.chat-container.fullscreen');
      // ... chatContainer.style.zIndex = '9998'; Swal didOpen 把 container/popup 改成 '99999' ...
    } else {
      return Swal.fire(options);
    }
  };
```

## Target

`tailwind.config.cjs` 的 `theme.extend` 新增（放在 `transitionTimingFunction` 區塊之後）：

```js
      // ========================================
      // 層級系統：由低到高，元件只能用這些名稱，禁止任意 z-[n]
      // ========================================
      zIndex: {
        'nav':         '40',   // 頂欄、側欄
        'assistant':   '45',   // AI 助手頭像與泡泡（在抽屜與 Modal 之下）
        'dropdown':    '50',   // 下拉選單、tooltip
        'chat':        '55',   // AI 聊天視窗與其手機遮罩
        'drawer':      '60',   // 右側抽屜
        'modal':       '70',   // 所有 Modal 與 overlay
        'modal-stack': '80',   // Modal 之上再疊一層（圖片放大）
        'onboarding':  '90',   // 首次導覽
        'fullscreen':  '100',  // 全螢幕聊天
      },
```

SweetAlert2 預設 z-index 為 1060、react-hot-toast 為 9999，都高於 `fullscreen`，所以 `useUIState.js` 的 hack 整段移除，`showSwalWithCorrectZIndex` 直接回傳 `Swal.fire(options)`。

替換對照：

| 現況 | 改為 |
|---|---|
| TopBar `z-40` | `z-nav` |
| TopBar 下拉、SideBar tooltip `z-50` | `z-dropdown` |
| Modal.jsx `z-50` | `z-modal` |
| CardDetailModal `z-[70]` | 刪除該片段（Modal 本身已是 `z-modal`） |
| CardDetailModal `z-[80]`、ProjectCommentDrawer:499 `z-[80]` | `z-modal-stack` |
| 三個抽屜 `z-[120]` / `z-50` | `z-drawer` |
| Kanban.jsx `z-[100]`、ExampleTasksDialog `z-[150]`、StageSuggestions `z-[1000]` | `z-modal` |
| 兩個 Onboarding `z-[200]` | `z-onboarding` |
| DraggableAvatar `z-[1000]`、泡泡 `z-[1001]` | `z-assistant` |
| 手機聊天遮罩 `z-[1001]`、聊天視窗 `z-[1002]` | `z-chat` |
| 全螢幕聊天 `z-[9999]` | `z-fullscreen` |

## Repo conventions to follow

- `tailwind.config.cjs` 的分段註解與行尾繁中註解風格（見 `transitionDuration`）。
- `DESIGN_SYSTEM.md` 補一節「層級系統」表格（Token / Class / 用途），放在「動畫速度」節之後。
- `CLAUDE.md`「設計系統」違規清單追加「層級只用 `z-nav` 到 `z-fullscreen` token，禁止任意 `z-[n]`」。

## Steps

1. `tailwind.config.cjs`：插入 Target 的 `zIndex` 區塊。
2. 依「替換對照」逐檔替換上表所有位置。`position="justify-center items-center z-[70]"` 改為 `position="justify-center items-center"`。
3. `useUIState.js`：把 `showSwalWithCorrectZIndex` 函式體整個換成 `return Swal.fire(options);`，保留函式名與 export（呼叫端不動）。若因此 `isFullscreen` 在該檔內不再被使用，保留變數（其他地方仍用），只確認 lint 不報錯。
4. `DESIGN_SYSTEM.md` 與 `CLAUDE.md` 依 Repo conventions 補文件。
5. 全專案 `grep -rn "z-\[" src` 應為零。

## Boundaries

- 只改 class 字串、config、文件與 `useUIState.js` 那一個函式。不改任何元件結構或定位邏輯。
- 不處理手機版泡泡「位置」蓋住按鈕的問題（那是定位，登錄於 `future-list.md` F031）。
- 不動 `SideBar.jsx:26,28` 的 `z-10` / `z-0`（同一元件內的區域層級，非全域）與 `ChatWindow.jsx:184` 的 `z-10`（視窗內部）。
- 任一行內容與表格不符，跳過該行並回報。

## Verification

- **Mechanical**：
  ```bash
  cd sdl-frontend-main
  grep -rn "z-\[" src                                   # 預期無輸出
  grep -n "zIndex" tailwind.config.cjs                  # 預期 1 行
  grep -n "99999\|9998" src/pages/Kanban/components/DraggableImage/hooks/useUIState.js   # 預期無輸出
  npm run build && npx vitest run
  ```
- **Feel check**（dev 環境，專案 8 的 Kanban）：
  - AI 助手泡泡出現時開啟「專案評論」與「專案活動」抽屜：抽屜完整蓋在泡泡與頭像之上。
  - 開啟卡片詳情 Modal：泡泡與頭像在遮罩之下。
  - 開啟 AI 聊天視窗再開卡片 Modal：Modal 在聊天視窗之上。
  - 聊天視窗切全螢幕後觸發任一 Swal（例如清除對話）：Swal 在全螢幕之上。
  - 首次導覽（清掉 localStorage 的 `kanban_onboarded_8`）：導覽在所有東西之上。
- **Done when**：三條 grep 符合、build 與測試通過、五項目視檢查通過。
