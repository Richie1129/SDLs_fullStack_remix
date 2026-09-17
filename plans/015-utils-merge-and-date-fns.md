# 015：合併 authUtils / userUtils、dateformat 改 date-fns（F033）

- **嚴重度**：LOW
- **基準 commit**：`b0dda75`（在 013、014 合併之後執行）
- **執行模型**：sonnet；只用 Edit；不動業務邏輯

## 現況

- `src/utils/authUtils.js` 與 `src/utils/userUtils.js` 各自實作 `getCurrentUserId`、`getCurrentUserRole`、`getCurrentUsername`；`userUtils.js:41` 另有 `getUserDisplayName`（0 引用）。
- 23 個檔案從 `userUtils` 匯入（清單用 `grep -rln "utils/userUtils" src`），大多只要 `getCurrentUsername`；`TopBar.jsx` 同時從兩邊匯入。
- `src/utils/userDisplayUtils.js:36` `getUserDisplayName = formatUserDisplay` alias 0 引用。
- `dateformat` 用在 `src/pages/overview/ManagementOverview.jsx:196,283,370`（`"yyyy/mm/dd"`）、`src/pages/home/components/ProjectCard.jsx:294`（`"yyyy/mm/dd"`）、`src/utils/svgConvertUrl.jsx:139`（`"mm/dd HH:MM"`）。

## 目標

### 1. `userUtils.js` 只留 socket / listener / 組合函式

改寫為：

```js
/**
 * 使用者資訊工具：只保留 socket、事件監聽與組合函式。
 * 單一欄位 getter 一律從 authUtils 取得。
 */
import { getCurrentUserId, getCurrentUserRole, getCurrentUsername } from './authUtils';
import { userStorage } from '../services/storageService';

export const getCurrentUserAccount = () => userStorage.get('account', '');
export const getCurrentUserClass = () => userStorage.get('class', '');
export const getCurrentUserInfo = () => ({ username: getCurrentUsername(), account: getCurrentUserAccount(), role: getCurrentUserRole(), class: getCurrentUserClass(), id: getCurrentUserId() });
export const isCurrentUser = (username) => username === getCurrentUsername();
export const getUserForSocket = () => ({ username: getCurrentUsername(), id: getCurrentUserId() });
export const addUserUpdateListener = (callback) => { ... 原樣 ... };
export const triggerUserUpdate = (userInfo) => { ... 原樣 ... };
```

不再 export `getCurrentUsername` / `getCurrentUserId` / `getCurrentUserRole` / `getUserDisplayName`。

### 2. 逐檔改 import

對 23 個引用檔：把 `getCurrentUsername`、`getCurrentUserId` 移到 `from '<相對路徑>/utils/authUtils'`（若該檔已從 authUtils 匯入，合併到同一行）；`getUserForSocket`、`isCurrentUser`、`addUserUpdateListener` 留在 userUtils。相對路徑深度與原本 userUtils 的一致。

完成後 `grep -rn "from.*utils/userUtils" src` 每一行的具名匯入只能是 `getUserForSocket`、`isCurrentUser`、`addUserUpdateListener`、`triggerUserUpdate`、`getCurrentUserInfo`、`getCurrentUserAccount`、`getCurrentUserClass`。

### 3. 刪 alias

`src/utils/userDisplayUtils.js` 刪 `getUserDisplayName` 那段（含 JSDoc）。

### 4. `dateformat` 改 `date-fns`

新增 `src/utils/dateFormat.js`：

```js
import { format, isValid } from 'date-fns';
/** 安全格式化：無效日期回空字串，不丟例外 */
export function formatDate(value, pattern = 'yyyy/MM/dd') {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  return isValid(d) ? format(d, pattern) : '';
}
```

- `ManagementOverview.jsx` 三處：`dateFormat(x, "yyyy/mm/dd")` → `formatDate(x)`；`ProjectCard.jsx:294` 同。
- `svgConvertUrl.jsx:139`：`dateFormat(createdAt, "mm/dd HH:MM")` → `formatDate(createdAt, 'MM/dd HH:mm')`。
- 三個檔移除 `import dateFormat from 'dateformat'`，改 `import { formatDate } from '<路徑>/utils/dateFormat'`。
- 在 `sdl-frontend-main/` 執行 `npm uninstall dateformat`（同時更新 package-lock）。
- 完成後 `grep -rn "dateformat" src package.json` 無結果。

### 5. 不在本計畫內

25 處裸 `toLocaleDateString` / `toLocaleString` 維持現狀（各處格式不同，統一屬另一輪；已登錄 future-list F035）。

## 驗證

- `npx eslint src/utils src/components/TopBar.jsx`（其餘由主代理 build）。
- `npx vitest run`（主代理跑）。
