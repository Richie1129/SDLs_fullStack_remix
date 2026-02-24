---
description: 發布檢查清單（Release Checklist）標準流程與最佳實踐
---

# Release Checklist 發布檢查清單

## 概述

此 skill 提供軟體發布前的完整檢查清單，確保發布順利且可靠。

## 適用角色

| 角色 | 職責 |
|------|------|
| **Release Manager** | 協調發布流程 |
| **開發工程師** | 程式碼準備 |
| **QA** | 品質確認 |
| **DevOps** | 部署執行 |

---

## 1. 發布前準備

### 程式碼準備

- [ ] 所有 PR 已合併到 release 分支
- [ ] 版本號已更新 (package.json, CHANGELOG)
- [ ] 所有自動化測試通過
- [ ] 程式碼已通過 Code Review
- [ ] Lint 檢查無錯誤

### 文件更新

- [ ] CHANGELOG.md 已更新
- [ ] API 文件已同步
- [ ] 用戶指南已更新（如需要）
- [ ] 內部 Wiki 已更新

### QA 驗證

- [ ] Staging 環境已驗證
- [ ] 回歸測試通過
- [ ] 新功能驗收完成
- [ ] 效能測試通過

---

## 2. 部署前檢查

### 環境確認

- [ ] 環境變數已設定
- [ ] Secrets 已更新
- [ ] Database migration 已準備
- [ ] 第三方服務配置正確

### 基礎設施

- [ ] 伺服器資源充足
- [ ] 資料庫已備份
- [ ] CDN 快取已準備清除
- [ ] 監控告警已設定

### 團隊準備

- [ ] On-call 人員已安排
- [ ] 回滾計畫已確認
- [ ] 相關團隊已通知

---

## 3. 部署執行

### 部署步驟

- [ ] 執行 database migration
- [ ] 部署應用程式
- [ ] 驗證健康檢查通過
- [ ] 清除 CDN 快取
- [ ] Feature flag 開啟（如適用）

### 驗證檢查

- [ ] 主要 API 端點回應正常
- [ ] 用戶可正常登入
- [ ] 核心功能運作正常
- [ ] 無異常錯誤日誌

---

## 4. 發布後監控

### 監控指標

- [ ] 錯誤率 < 0.1%
- [ ] 回應時間正常
- [ ] CPU/Memory 使用率正常
- [ ] 無異常告警

### 持續觀察

- [ ] 發布後 15 分鐘：初步確認
- [ ] 發布後 1 小時：穩定性確認
- [ ] 發布後 24 小時：全面確認

---

## 5. 回滾判斷

### 觸發回滾條件

- 錯誤率 > 1%
- 核心功能無法使用
- 安全漏洞發現
- 資料異常

### 回滾決策

| 嚴重度 | 決策者 | 時間限制 |
|--------|--------|---------|
| 嚴重 | On-call 可直接回滾 | 立即 |
| 高 | Tech Lead 決定 | 15 分鐘 |
| 中 | 團隊討論 | 1 小時 |

---

## 6. 發布通知模板

```markdown
# 發布通知

## 版本：v2.5.0
## 時間：2024-01-20 22:00 UTC

## 新功能
- 新增購物車優惠碼功能
- 訂單狀態通知優化

## Bug 修復
- 修正登入頁面載入緩慢問題

## 注意事項
- 首次使用需清除瀏覽器快取

## 聯絡人
- Release Manager: @release-manager
- On-call: @oncall-engineer
```

---

## 檢查清單模板

```markdown
# Release v2.5.0 Checklist

## 日期：2024-01-20
## Release Manager：[Name]

### 發布前
- [x] PR 已合併
- [x] 測試通過
- [x] 文件更新
- [x] Staging 驗證

### 部署
- [ ] Migration 執行
- [ ] 應用程式部署
- [ ] 健康檢查
- [ ] Smoke test

### 發布後
- [ ] 15 分鐘確認
- [ ] 1 小時確認
- [ ] 通知發送

### 簽核
- [ ] QA Lead
- [ ] Tech Lead
```

---

## 相關 Skills

- [release-plan.md](./release-plan.md) - 發布計畫
- [rollback-plan.md](./rollback-plan.md) - 回滾計畫
- [cicd-pipeline.md](./cicd-pipeline.md) - CI/CD Pipeline
