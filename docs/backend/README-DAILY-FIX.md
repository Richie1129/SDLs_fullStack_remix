# 小組日誌更新跳轉 /login 問題 - 診斷與修復指南

## 問題現象

- **症狀**：在虛擬機上編輯小組日誌並按下「更新」按鈕時，會跳轉到 `/login` 頁面
- **本地環境**：正常運作，沒有問題
- **個人日誌**：在虛擬機上也正常運作
- **僅影響**：虛擬機上的小組日誌更新功能

## 根本原因分析

從 Linus 的視角來看，這是個**資料結構不一致**的問題：

### 問題1：模型定義缺失外鍵欄位

`daily_personal.js` 和 `daily_team.js` 模型**沒有明確定義** `projectId` 和 `userId` 欄位。

雖然 Sequelize 的 `hasMany` 關聯會自動創建這些外鍵，但這依賴於：
1. 資料庫同步（`sequelize.sync()`）正確執行
2. 模型載入順序正確
3. 關聯定義在模型使用前已載入

### 問題2：本地與虛擬機的資料庫結構不同

**本地環境**：
- 可能在某次開發中執行過 `sequelize.sync({ alter: true })`
- 或者手動執行過 migration
- `daily_teams` 表有 `projectId` 欄位

**虛擬機環境**：
- 可能沒有執行過同步或 migration
- `daily_teams` 表**缺少** `projectId` 欄位
- 當權限中間件嘗試查詢 `projectId` 時返回 `undefined`

### 問題3：權限檢查流程

小組日誌更新的中間件鏈：
```javascript
validateToken → getProjectIdFromDaily → checkProjectViewingPermission → checkWritePermission
```

**getProjectIdFromDaily 中間件**：
```javascript
const daily = await DailyTeam.findByPk(dailyId);
req.params.projectId = daily.projectId;  // ❌ 如果資料庫沒有 projectId 欄位，這裡是 undefined
```

**checkProjectViewingPermission 中間件**：
```javascript
const projectId = req.params.projectId || req.query.projectId || req.body.projectId;
if (!projectId) {
    return res.status(400).json({ message: '缺少專案 ID' });  // ❌ 400 錯誤
}
```

前端收到 400/401/403 後，`client.js` 攔截器會自動跳轉到 `/login`。

## 修復方案

### 步驟 1：診斷虛擬機資料庫結構

在**虛擬機**上執行診斷腳本：

\`\`\`bash
cd sdl-backend-main
node scripts/check-daily-schema.js
\`\`\`

這個腳本會檢查：
- `daily_personals` 和 `daily_teams` 表的完整結構
- 是否存在 `projectId` 和 `userId` 欄位
- 外鍵約束是否正確
- 最新的小組日誌記錄

**預期輸出**：
```
✅ 欄位檢查結果:
daily_personals:
  - projectId: ✅ 存在
  - userId: ✅ 存在
daily_teams:
  - projectId: ✅ 存在
```

**如果顯示 `❌ 缺失`**，繼續步驟 2。

### 步驟 2：修復資料庫結構（如果需要）

在**虛擬機**上執行 SQL 修復腳本：

\`\`\`bash
# 方法 1: 使用 MySQL 客戶端
mysql -u <username> -p <database_name> < scripts/fix-daily-schema.sql

# 方法 2: 透過 docker (如果使用 docker-compose)
docker exec -i <mysql_container_name> mysql -u <username> -p<password> <database_name> < scripts/fix-daily-schema.sql
\`\`\`

這個腳本會：
1. 檢查欄位是否存在
2. 如果不存在，自動添加 `projectId` 和 `userId` 欄位
3. 顯示更新後的表結構

### 步驟 3：重啟後端服務

\`\`\`bash
cd sdl-backend-main
npm restart
# 或
pm2 restart sdl-backend
\`\`\`

### 步驟 4：驗證修復

1. 清除瀏覽器快取並重新登入
2. 進入專案的小組日誌頁面
3. 嘗試編輯並更新一條小組日誌
4. 確認沒有跳轉到 `/login` 頁面

## 程式碼修改說明

已修改的檔案：

### 1. `models/daily_personal.js`
```diff
+ userId: {
+     type: DataTypes.INTEGER,
+     allowNull: true,
+     comment: '用戶 ID (外鍵)'
+ },
+ projectId: {
+     type: DataTypes.INTEGER,
+     allowNull: true,
+     comment: '專案 ID (外鍵)'
+ }
```

### 2. `models/daily_team.js`
```diff
+ projectId: {
+     type: DataTypes.INTEGER,
+     allowNull: true,
+     comment: '專案 ID (外鍵)'
+ }
```

### 3. `middlewares/AuthMiddleware.js`
```diff
  catch (err){
      console.log('JWT verification error:', err);
-     return res.json({error: err});
+     return res.status(401).json({error: "Invalid or expired token"});
  }
```

## 為什麼本地正常但虛擬機異常？

這是經典的**環境不一致**問題：

| 環境 | 資料庫結構 | 原因 |
|------|------------|------|
| 本地開發 | 有 `projectId` | 可能執行過 `sequelize.sync({ alter: true })` 或手動 migration |
| 虛擬機生產 | 缺少 `projectId` | 可能直接從舊的資料庫備份還原，沒有執行同步 |

## Linus 評論

> "This is the kind of shit that happens when you rely on magic instead of being explicit."

這個問題的教訓：
1. **永遠明確定義外鍵欄位** - 不要依賴 ORM 的自動魔法
2. **環境一致性檢查** - 本地和生產的資料庫結構必須一致
3. **Migration 管理** - 使用版本控制的 migration 而不是 `sync()`
4. **錯誤訊息要清晰** - "缺少專案 ID" 比 "未認證" 更容易 debug

## 後續建議

1. **建立 Migration 系統**：
   ```bash
   npm install --save sequelize-cli
   npx sequelize-cli init
   ```

2. **記錄所有資料庫變更**：
   ```bash
   npx sequelize-cli migration:generate --name add-projectId-to-daily-tables
   ```

3. **自動化部署檢查**：
   在部署腳本中加入資料庫結構驗證

4. **監控和告警**：
   記錄所有 400/401/403 錯誤，方便快速定位問題

## 聯絡與回報

如果問題仍然存在，請提供：
1. `node scripts/check-daily-schema.js` 的完整輸出
2. 虛擬機後端的錯誤日誌（最近 50 行）
3. 瀏覽器 Network 面板的請求/回應詳情
