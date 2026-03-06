---
name: debug
description: "除錯前先收集完整環境快照，避免連鎖除錯問題。自動檢查 Docker 狀態、服務 logs、DB 連線、env 變數，讓 Claude 一次掌握全貌再診斷。"
---

# Debug 環境快照 Skill

當使用者執行 `/debug` 時，在開始任何除錯之前，先收集完整環境上下文。

## 使用方式
```
/debug                          # 收集全域環境快照
/debug api                      # 聚焦在 api 服務
/debug postgres                 # 聚焦在資料庫
/debug <錯誤訊息或問題描述>      # 聚焦在特定問題
```

## 執行步驟

### 步驟 1：Docker 服務狀態
```bash
docker compose ps
```
列出所有服務狀態，標記哪些是 `Up`、`Exit`、`Restarting`。

### 步驟 2：收集 Logs（最近 50 行）

若使用者指定服務，只查該服務；否則查 api 和 front：
```bash
docker compose logs --tail=50 api
docker compose logs --tail=50 front
```

若看到 ERROR 或 WARN，額外取得更多上下文：
```bash
docker compose logs --tail=200 <問題服務> | grep -E "ERROR|WARN|error|Error"
```

### 步驟 3：環境變數存在性確認

**只確認變數是否存在，絕對不顯示實際值：**
```bash
docker compose exec api sh -c '
  for var in GEMINI_API_KEY JWT_SECRET PG_HOST PG_DB MINIO_ENDPOINT MINIO_BUCKET_NAME; do
    if [ -n "$(eval echo \$$var)" ]; then
      echo "$var: ✅ 已設定"
    else
      echo "$var: ❌ 未設定"
    fi
  done
'
```

### 步驟 4：資料庫連線確認
```bash
docker compose exec postgres psql -U postgres -d postgres -c "SELECT 1 as connection_test;" 2>&1
```

若使用者問題涉及特定資料表，額外執行：
```bash
docker compose exec postgres psql -U postgres -d postgres -c "\dt" 2>&1
```

### 步驟 5：網路連通性（若涉及服務間通訊）
```bash
docker compose exec api sh -c 'curl -s -o /dev/null -w "%{http_code}" http://minio:9000/minio/health/live' 2>&1
```

### 步驟 6：整理快照報告

以結構化格式輸出：
```
## 環境快照

### Docker 服務
| 服務 | 狀態 | 備註 |
|------|------|------|
| api  | ✅ Up | - |
| ...  | ...  | ... |

### 環境變數
- GEMINI_API_KEY: ✅
- JWT_SECRET: ✅
- ...

### 資料庫
- 連線: ✅ / ❌

### 關鍵 Logs
<貼上最相關的錯誤訊息>

### 診斷結論
<根據收集到的資訊，列出 1-3 個最可能的問題根源>
<建議的修復順序>
```

### 步驟 7：開始除錯

基於快照報告，從最可能的根源開始診斷，**不要**跳過步驟或假設某個服務正常運作。

## 注意事項
- 絕對不顯示任何 API Key、密碼、Token 的實際值
- 若 Docker 未運行，改為檢查本地環境
- 先做快照再提建議，不要在收集完整資訊前就猜測問題
