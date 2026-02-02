---
description: Bug 報告（Bug Report）標準流程與最佳實踐
---

# Bug Report Bug 報告

## 概述

此 skill 提供 Bug 報告的撰寫指引，確保缺陷能被清楚描述、快速重現、有效追蹤。

## 適用角色

| 角色 | 職責 |
|------|------|
| **回報者** | QA、開發、用戶 |
| **處理者** | 開發工程師 |
| **審核者** | QA 工程師 |

---

## 1. Bug 嚴重度

| 等級 | 定義 | 範例 | SLA |
|------|------|------|-----|
| **🔴 Critical** | 系統崩潰、資料遺失 | 付款失敗無法恢復 | 4 小時 |
| **🟠 High** | 核心功能無法使用 | 無法登入 | 1 工作天 |
| **🟡 Medium** | 功能異常但有替代方案 | 搜尋結果排序錯誤 | 3 工作天 |
| **🟢 Low** | 小問題、UI 瑕疵 | 錯字、對齊問題 | 1 週 |

---

## 2. Bug 報告模板

```markdown
## Bug 標題
[簡潔描述問題] - [發生位置]

範例：登入失敗 - 使用 Google OAuth 時顯示 500 錯誤

---

## 環境資訊
- **版本**: v2.3.1
- **環境**: Staging / Production
- **瀏覽器**: Chrome 120 / Safari 17
- **作業系統**: macOS 14 / Windows 11
- **裝置**: Desktop / iPhone 15

## 重現步驟
1. 開啟登入頁面 (https://app.example.com/login)
2. 點擊「使用 Google 登入」
3. 選擇 Google 帳號並授權
4. 等待跳轉回應用程式

## 預期結果
- 成功登入並跳轉至儀表板

## 實際結果
- 顯示「500 Internal Server Error」錯誤頁面
- 用戶無法登入

## 附件
- 截圖: [screenshot.png]
- 影片: [screen-recording.mp4]
- Console Log: [console-error.txt]

## 額外資訊
- 發生頻率: 每次都發生 / 偶發
- 影響用戶: 所有用戶 / 特定用戶
- 相關 Log:
```
Error: OAuth callback failed
  at /app/auth/google.ts:45
  code: OAUTH_INVALID_STATE
```
```

---

## 3. Bug 生命週期

```
┌─────────┐    ┌─────────┐    ┌─────────┐
│   New   │ → │  Open   │ → │ In Fix  │
└─────────┘    └─────────┘    └─────────┘
                                   │
     ┌─────────────────────────────┤
     ▼                             ▼
┌─────────┐    ┌─────────┐    ┌─────────┐
│ Reopen  │ ← │ Verify  │ ← │ Fixed   │
└─────────┘    └─────────┘    └─────────┘
                    │
                    ▼
              ┌─────────┐
              │ Closed  │
              └─────────┘
```

| 狀態 | 說明 |
|------|------|
| **New** | 新建立，待分配 |
| **Open** | 已分配，待修復 |
| **In Fix** | 修復中 |
| **Fixed** | 已修復，待驗證 |
| **Verify** | 驗證中 |
| **Closed** | 驗證通過 |
| **Reopen** | 驗證失敗，重新開啟 |

---

## 4. 好的 Bug 報告範例

```markdown
## [Critical] 付款完成後訂單狀態未更新 - 結帳流程

### 環境
- Production v2.4.0
- Chrome 120, macOS

### 重現步驟
1. 加入商品到購物車
2. 進入結帳頁面
3. 選擇信用卡付款
4. 完成 3D 驗證
5. 系統跳轉回訂單頁面

### 預期結果
訂單狀態顯示「已付款」

### 實際結果
訂單狀態仍為「待付款」，但信用卡已扣款

### 影響
- 用戶重複付款風險
- 客訴量增加

### Log
```
[ERROR] PaymentWebhook: Failed to update order
OrderId: ORD-12345
PaymentId: PAY-67890
Error: Database connection timeout
```

### 附件
- [payment-success-screenshot.png]
- [order-status-screenshot.png]
```

---

## 5. 不良報告 vs 改善

| ❌ 不良 | ✅ 改善 |
|---------|---------|
| 「登入壞了」 | 「使用無效密碼登入時未顯示錯誤訊息」 |
| 「有時候會出錯」 | 「連續點擊送出按鈕 3 次時會出現重複訂單」 |
| 沒有截圖 | 附上錯誤畫面截圖和 Console Log |

---

## 6. GitHub Issue 模板

```yaml
# .github/ISSUE_TEMPLATE/bug_report.yml
name: Bug Report
description: Report a bug
labels: ["bug", "triage"]

body:
  - type: dropdown
    id: severity
    attributes:
      label: Severity
      options:
        - Critical
        - High  
        - Medium
        - Low
    validations:
      required: true

  - type: textarea
    id: description
    attributes:
      label: Bug Description
      placeholder: Clear description of the bug
    validations:
      required: true

  - type: textarea
    id: steps
    attributes:
      label: Steps to Reproduce
      placeholder: |
        1. Go to...
        2. Click on...
        3. See error
    validations:
      required: true

  - type: textarea
    id: expected
    attributes:
      label: Expected Behavior
    validations:
      required: true

  - type: textarea
    id: environment
    attributes:
      label: Environment
      placeholder: |
        - Version: 
        - Browser: 
        - OS:
```

---

## 檢查清單

### 報告前
- [ ] 確認是 Bug 而非預期行為
- [ ] 搜尋是否已有重複報告
- [ ] 能穩定重現

### 報告內容
- [ ] 標題簡潔明確
- [ ] 步驟可重現
- [ ] 附上截圖/Log
- [ ] 設定正確嚴重度

---

## 相關 Skills

- [test-case.md](./test-case.md) - 測試案例
- [../09-operations/incident-response.md](../09-operations/incident-response.md) - 事件回應
