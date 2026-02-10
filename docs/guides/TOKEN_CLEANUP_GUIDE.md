# Token 清理服務使用指南

## 📋 服務說明

`token-cleanup` 是一個自動化的背景服務，用於定期清理資料庫中已過期的 refresh tokens。

---

## 🎯 功能

- **自動清理**：每 6 小時執行一次
- **零干擾**：獨立運行，不影響其他服務
- **可靠性高**：使用 Docker Compose 管理，自動重啟
- **有日誌**：可以查看清理記錄

---

## 🚀 使用方式

### 1. 啟動服務

```bash
# 啟動清理服務
docker compose up -d token-cleanup

# 查看服務狀態
docker compose ps | grep token-cleanup
```

### 2. 查看日誌

```bash
# 查看實時日誌
docker compose logs -f token-cleanup

# 查看最近的日誌
docker compose logs token-cleanup --tail 20
```

### 3. 手動觸發清理（測試用）

```bash
# 進入容器手動執行清理
docker compose exec token-cleanup psql -h postgres -U postgres -d postgres -c "DELETE FROM refresh_tokens WHERE \"expiresAt\" < NOW();"
```

### 4. 停止服務

```bash
# 停止清理服務
docker compose stop token-cleanup

# 重新啟動
docker compose start token-cleanup
```

---

## ⚙️ 配置說明

### 清理頻率

在 `docker-compose.yml` 中：

```yaml
sleep 21600;  # 21600 秒 = 6 小時
```

**修改頻率**：

| 時間間隔 | 秒數 | 說明 |
|---------|------|------|
| 1 小時 | 3600 | 測試用，太頻繁 |
| 6 小時 | 21600 | **推薦** |
| 12 小時 | 43200 | 適合低流量系統 |
| 24 小時 | 86400 | 不推薦，會累積太多 |

### 環境變數

```yaml
environment:
  - PGPASSWORD=postgres  # PostgreSQL 密碼
```

---

## 🧪 測試清理功能

### 1. 創建測試數據

```bash
docker compose exec postgres psql -U postgres -d postgres -c "
-- 插入過期 token (測試用)
INSERT INTO refresh_tokens (\"userId\", token, \"expiresAt\", \"createdAt\")
VALUES (1, 'test-expired', NOW() - INTERVAL '1 day', NOW() - INTERVAL '8 days');

-- 查看所有 tokens
SELECT id, LEFT(token, 25) as token_prefix,
       \"expiresAt\" < NOW() as is_expired
FROM refresh_tokens
ORDER BY \"createdAt\" DESC;
"
```

### 2. 執行清理

```bash
# 手動觸發清理
docker compose exec token-cleanup psql -h postgres -U postgres -d postgres -c "
DELETE FROM refresh_tokens WHERE \"expiresAt\" < NOW();
"
```

### 3. 驗證結果

```bash
# 確認過期 token 已被刪除
docker compose exec postgres psql -U postgres -d postgres -c "
SELECT COUNT(*) as total,
       COUNT(*) FILTER (WHERE \"expiresAt\" < NOW()) as expired
FROM refresh_tokens;
"
```

預期結果：`expired` 應該是 0

---

## 📊 監控與維護

### 查看清理統計

```bash
# 查看清理服務日誌（每 6 小時有一筆記錄）
docker compose logs token-cleanup | grep "已刪除"
```

輸出範例：
```
✅ [Sat Oct 12 04:00:00 UTC 2025] 已刪除 15 個過期 tokens
✅ [Sat Oct 12 10:00:00 UTC 2025] 已刪除 8 個過期 tokens
```

### 檢查資料庫健康度

```bash
# 查看 refresh_tokens 表狀態
docker compose exec postgres psql -U postgres -d postgres -c "
SELECT
  COUNT(*) as total_tokens,
  COUNT(*) FILTER (WHERE \"expiresAt\" < NOW()) as expired_tokens,
  COUNT(*) FILTER (WHERE \"expiresAt\" >= NOW()) as valid_tokens,
  pg_size_pretty(pg_total_relation_size('refresh_tokens')) as table_size
FROM refresh_tokens;
"
```

---

## 🔧 故障排除

### 問題 1: 服務無法啟動

**檢查**：
```bash
docker compose logs token-cleanup
```

**常見原因**：
- PostgreSQL 未啟動：等待 `postgres` 服務健康檢查通過
- 權限問題：檢查 PGPASSWORD 環境變數

### 問題 2: 清理未執行

**檢查服務狀態**：
```bash
docker compose ps token-cleanup
```

如果狀態是 `Exited`，查看日誌找出原因。

### 問題 3: 過期 tokens 仍在資料庫

**手動清理**：
```bash
docker compose exec postgres psql -U postgres -d postgres -c "
DELETE FROM refresh_tokens WHERE \"expiresAt\" < NOW();
"
```

---

## 💡 最佳實踐

1. **定期檢查日誌**：每週查看一次清理日誌，確保服務正常
2. **監控表大小**：如果 refresh_tokens 表超過 10MB，考慮增加清理頻率
3. **測試清理邏輯**：每次部署後，手動觸發一次清理測試
4. **備份前清理**：在資料庫備份前執行清理，減少備份大小

---

## 📈 預期效果

### 清理前
```sql
SELECT COUNT(*) FROM refresh_tokens;
-- 可能: 1000+ 筆（包含大量過期 tokens）
```

### 清理後
```sql
SELECT COUNT(*) FROM refresh_tokens;
-- 預期: 100-300 筆（只剩有效 tokens）
```

### 表大小變化
- **未清理**：可能達到 50-100MB (1 年)
- **定期清理**：維持在 1-5MB

---

## 🎯 總結

| 項目 | 說明 |
|------|------|
| **運行方式** | Docker Compose 背景服務 |
| **清理頻率** | 每 6 小時 |
| **資源消耗** | 極小 (< 50MB RAM) |
| **維護成本** | 零維護，自動運行 |
| **可靠性** | 高 (自動重啟) |

---

**建議**：讓服務持續運行，定期檢查日誌即可。無需手動干預。
