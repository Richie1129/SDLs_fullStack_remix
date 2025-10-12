# Refresh Token 清理任務設定

## 方案 1: 使用系統 crontab (推薦)

### 設定步驟

1. 開啟 crontab 編輯器：
```bash
crontab -e
```

2. 加入以下行 (每 6 小時執行一次)：
```
0 */6 * * * /home/richie1129/SDLs_fullStack_remix/sdl-backend-main/scripts/cleanup-tokens.sh
```

3. 儲存並退出

### 驗證設定

```bash
# 查看當前 crontab
crontab -l

# 查看 cron 日誌
tail -f /var/log/token-cleanup.log
```

---

## 方案 2: 使用 Docker Compose (如果使用 Docker)

在 `docker-compose.yml` 中加入定時任務服務：

```yaml
services:
  token-cleanup:
    image: postgres:latest
    environment:
      PGPASSWORD: ${PG_PASSWORD}
    command: >
      sh -c "while true; do
        sleep 21600;  # 6 hours
        psql -h postgres -U ${PG_USER} -d ${PG_NAME} -c 'DELETE FROM refresh_tokens WHERE \"expiresAt\" < NOW();';
      done"
    depends_on:
      - postgres
```

---

## 方案 3: 使用 pg_cron (PostgreSQL 擴展)

### 安裝 pg_cron

```sql
CREATE EXTENSION pg_cron;
```

### 設定定時任務

```sql
SELECT cron.schedule(
  'cleanup-expired-tokens',
  '0 */6 * * *',  -- 每 6 小時
  $$DELETE FROM refresh_tokens WHERE "expiresAt" < NOW()$$
);
```

### 查看任務

```sql
SELECT * FROM cron.job;
```

### 刪除任務

```sql
SELECT cron.unschedule('cleanup-expired-tokens');
```

---

## 測試清理腳本

手動執行一次測試：

```bash
/home/richie1129/SDLs_fullStack_remix/sdl-backend-main/scripts/cleanup-tokens.sh
```

---

## 注意事項

1. **權限**：確保腳本有執行權限 (`chmod +x cleanup-tokens.sh`)
2. **路徑**：腳本中的路徑需要根據實際部署環境調整
3. **日誌**：確保 `/var/log/token-cleanup.log` 有寫入權限
4. **時區**：cron 使用系統時區，注意時區設定
