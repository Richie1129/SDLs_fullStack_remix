---
description: 回滾計畫（Rollback Plan）標準流程與最佳實踐
---

# Rollback Plan 回滾計畫

## 概述

此 skill 提供發布回滾的完整指引，確保能快速安全地回復到穩定版本。

## 適用角色

| 角色 | 職責 |
|------|------|
| **執行者** | DevOps、On-call 工程師 |
| **決策者** | Tech Lead、Release Manager |

---

## 1. 回滾觸發條件

| 嚴重度 | 條件 | 決策時間 |
|--------|------|---------|
| 🔴 Critical | 核心功能無法使用 | 立即回滾 |
| 🔴 Critical | 資料遺失/損壞 | 立即回滾 |
| 🟠 High | 錯誤率 > 1% | 15 分鐘內決定 |
| 🟠 High | P95 延遲 > 2x | 15 分鐘內決定 |
| 🟡 Medium | 次要功能異常 | 評估後決定 |

---

## 2. 回滾方式

### 2.1 應用程式回滾

```bash
# Kubernetes
kubectl rollout undo deployment/api-server

# 回滾到特定版本
kubectl rollout undo deployment/api-server --to-revision=5

# Docker Compose
docker-compose up -d --no-deps api:v2.4.0
```

### 2.2 資料庫回滾

```bash
# Prisma
npx prisma migrate resolve --rolled-back 20240120_add_coupons

# Knex
npx knex migrate:rollback

# 手動 SQL
psql -f migrations/20240120_rollback.sql
```

### 2.3 Feature Flag 回滾

```bash
# 關閉功能
curl -X PUT /admin/flags/new_checkout -d '{"enabled": false}'
```

---

## 3. 回滾計畫模板

```markdown
# 回滾計畫 - v2.5.0

## 基本資訊
- 發布版本: v2.5.0
- 回滾目標: v2.4.5
- 預估時間: 5-10 分鐘

## 回滾命令

### 1. 應用程式回滾
\`\`\`bash
kubectl rollout undo deployment/api-server -n production
kubectl rollout undo deployment/web-app -n production
\`\`\`

### 2. 資料庫回滾 (如適用)
\`\`\`bash
# 此版本無破壞性 migration，無需回滾
\`\`\`

### 3. Feature Flag
\`\`\`bash
# 關閉新功能
curl -X PUT https://api.example.com/admin/flags/new_checkout \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"enabled": false}'
\`\`\`

### 4. 快取清除
\`\`\`bash
redis-cli FLUSHDB
# 或 CDN
aws cloudfront create-invalidation --distribution-id $CDN_ID --paths "/*"
\`\`\`

## 驗證步驟
1. [ ] 健康檢查通過
2. [ ] 主頁載入正常
3. [ ] 登入功能正常
4. [ ] 錯誤率恢復正常

## 聯絡人
- On-call: +886-xxx-xxx
- Tech Lead: @tech-lead
```

---

## 4. 回滾執行流程

```
發現問題 → 評估嚴重度 → 決策 → 執行回滾 → 驗證 → 通知
              │
              └── 不需回滾 → 修復問題
```

### 執行步驟

1. **宣布開始回滾**
   - 通知團隊 Slack channel
   - 記錄開始時間

2. **執行回滾命令**
   - 按照回滾計畫執行
   - 監控執行狀態

3. **驗證回滾成功**
   - 健康檢查
   - Smoke test
   - 監控指標

4. **事後處理**
   - 通知完成
   - 記錄事件
   - 安排 Postmortem

---

## 5. 無法回滾的情況

| 情況 | 處理方式 |
|------|---------|
| 資料格式變更 | Hotfix 修復 |
| 外部 API 變更 | 協調版本相容 |
| 不可逆 migration | 資料修復腳本 |

---

## 6. 回滾後檢查

### 立即檢查
- [ ] 服務健康狀態
- [ ] 錯誤率回復正常
- [ ] 用戶可正常操作

### 後續行動
- [ ] 召開 Postmortem
- [ ] 根因分析
- [ ] 更新回滾計畫
- [ ] 預防措施

---

## 檢查清單

### 發布前
- [ ] 回滾計畫已撰寫
- [ ] 回滾命令已測試
- [ ] 回滾權限已確認

### 回滾時
- [ ] 通知團隊
- [ ] 執行回滾
- [ ] 驗證成功
- [ ] 記錄時間軸

---

## 相關 Skills

- [release-plan.md](./release-plan.md) - 發布計畫
- [release-checklist.md](./release-checklist.md) - 發布檢查清單
- [../09-operations/incident-response.md](../09-operations/incident-response.md) - 事件回應
