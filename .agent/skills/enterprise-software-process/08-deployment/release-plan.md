---
description: 發布計畫（Release Plan）標準流程與最佳實踐
---

# Release Plan 發布計畫

## 概述

此 skill 提供軟體發布計畫撰寫指引，確保發布有條理地進行。

## 適用角色

| 角色 | 職責 |
|------|------|
| **Release Manager** | 制定/執行計畫 |
| **Product Manager** | 確認需求範圍 |
| **Tech Lead** | 技術決策 |

---

## 1. 發布類型

| 類型 | 頻率 | 內容 |
|------|------|------|
| **Major** | 季度 | 重大功能、Breaking Changes |
| **Minor** | 雙週 | 新功能、改進 |
| **Patch** | 隨時 | Bug 修復、安全更新 |
| **Hotfix** | 緊急 | 嚴重問題修復 |

---

## 2. 發布計畫模板

```markdown
# Release Plan - v2.5.0

## 發布資訊
- **版本**: v2.5.0
- **類型**: Minor Release
- **預計日期**: 2024-01-25 22:00 UTC
- **Release Manager**: [Name]

## 發布範圍

### 新功能
| Feature | 負責人 | 狀態 |
|---------|--------|------|
| 優惠碼功能 | @dev1 | ✅ 完成 |
| 訂單通知優化 | @dev2 | ✅ 完成 |

### Bug 修復
| Bug ID | 描述 | 狀態 |
|--------|------|------|
| #1234 | 登入頁面緩慢 | ✅ 已修復 |

### 技術變更
- Database migration: 新增 coupons 表
- API 變更: 無 Breaking Change

## 時程表

| 日期 | 里程碑 |
|------|--------|
| 01-15 | 功能凍結 |
| 01-18 | QA 驗證完成 |
| 01-23 | Staging 部署 |
| 01-25 | Production 發布 |

## 依賴項
- [ ] Stripe API 版本升級
- [ ] SendGrid 模板更新

## 風險評估
| 風險 | 可能性 | 緩解措施 |
|------|--------|---------|
| Migration 失敗 | 低 | 已在 Staging 驗證 |
| 第三方服務中斷 | 中 | 有 fallback 機制 |

## 回滾計畫
參考 [rollback-plan.md](./rollback-plan.md)

## 通知計畫
- 內部：發布前 24 小時
- 用戶：發布後通知新功能
```

---

## 3. 發布時程

### 標準發布週期

```
┌────────────────────────────────────────────────┐
│  Week 1    │  Week 2    │  Release Day         │
├────────────┼────────────┼──────────────────────┤
│ 功能開發    │  QA 驗證   │ Staging → Production │
│ Code Review │  Bug 修復  │ 監控 & 觀察          │
└────────────┴────────────┴──────────────────────┘
```

### 發布時間選擇

| 建議 | 不建議 |
|------|--------|
| 週二~週四 | 週五 |
| 上班時間 | 深夜 |
| 低流量時段 | 活動高峰 |

---

## 4. 發布決策

### Go/No-Go 會議

```markdown
## 發布決策會議

### 參與者
- Release Manager
- QA Lead
- Tech Lead
- Product Manager

### 確認事項
- [ ] 所有 P0 功能完成
- [ ] 無 P0/P1 Bug
- [ ] 效能測試通過
- [ ] 回滾計畫就緒
- [ ] On-call 人員確認

### 決策
- [ ] ✅ Go - 如期發布
- [ ] ⏸️ Delay - 延後發布
- [ ] ❌ Cancel - 取消發布
```

---

## 5. 版本管理

### 語義化版本

```
MAJOR.MINOR.PATCH

2.5.3
│ │ └── Patch: Bug 修復
│ └──── Minor: 新功能（向後相容）
└────── Major: Breaking Changes
```

### 變更日誌

```markdown
# Changelog

## [2.5.0] - 2024-01-25

### Added
- 優惠碼功能 (#123)
- 訂單狀態通知 (#124)

### Fixed
- 登入頁面效能問題 (#1234)

### Changed
- 更新 Stripe SDK 版本
```

---

## 檢查清單

- [ ] 發布範圍已確認
- [ ] 時程表已排定
- [ ] 風險已評估
- [ ] 回滾計畫就緒
- [ ] 相關人員已通知

---

## 相關 Skills

- [release-checklist.md](./release-checklist.md) - 發布檢查清單
- [rollback-plan.md](./rollback-plan.md) - 回滾計畫
- [feature-flag.md](./feature-flag.md) - Feature Flag
