---
description: 撰寫用戶故事，以用戶視角描述功能需求
---

# 用戶故事撰寫

## 概述
此 skill 協助撰寫高品質的用戶故事 (User Story)，使用標準格式描述功能需求，包含驗收標準、估算和優先級設定。

## 適用角色
- **主要負責**: 產品經理、商業分析師
- **協作角色**: 開發團隊、UX 設計師、QA 工程師

## 輸入需求
- 功能需求描述
- 目標用戶角色
- 預期價值或目標

範例：`請幫我撰寫用戶故事：[功能描述]`

## 執行步驟

### 步驟 1: 識別用戶角色和目標
### 步驟 2: 使用標準格式撰寫故事
### 步驟 3: 定義驗收標準
### 步驟 4: 拆分大故事為小故事
### 步驟 5: 估算和排序優先級

## 輸出模板

```markdown
# 用戶故事

## Story ID: US-001

### 故事標題
[簡短描述，例如：使用者登入功能]

### 用戶故事格式

**As a** [用戶角色]  
**I want** [功能/行為]  
**So that** [商業價值/目標]

**範例**:
As a **registered user**  
I want **to log in with my email and password**  
So that **I can access my personal dashboard**

---

### 故事描述
[詳細說明此故事的背景、情境和需求]

---

### 驗收標準 (Acceptance Criteria)

使用 **Given-When-Then** 格式：

#### Scenario 1: 成功登入
- **Given** 我是已註冊的使用者
- **When** 我輸入正確的 email 和密碼並點擊「登入」
- **Then** 系統應導向我的個人儀表板
- **And** 顯示歡迎訊息「歡迎回來，[使用者名稱]」

#### Scenario 2: 登入失敗 - 錯誤密碼
- **Given** 我是已註冊的使用者
- **When** 我輸入正確的 email 但錯誤的密碼
- **Then** 系統應顯示錯誤訊息「Email 或密碼錯誤」
- **And** 不應導向儀表板
- **And** 密碼欄位應被清空

#### Scenario 3: 記住我功能
- **Given** 我勾選「記住我」選項
- **When** 我成功登入後關閉瀏覽器
- **Then** 下次開啟網站時應自動登入
- **And** Session 應保持 30 天

---

### 功能需求清單

#### 必須有 (Must Have)
- [ ] Email 和密碼輸入欄位
- [ ] 登入按鈕
- [ ] 錯誤訊息顯示
- [ ] 導向儀表板功能

#### 應該有 (Should Have)
- [ ] 「記住我」選項
- [ ] 「忘記密碼」連結
- [ ] 輸入驗證 (email 格式)

#### 可以有 (Could Have)
- [ ] 社群登入 (Google, Facebook)
- [ ] 雙因素認證
- [ ] 登入嘗試次數限制

#### 不會有 (Won't Have)
- 生物識別登入 (留待未來版本)

---

### 非功能需求

- **效能**: 登入回應時間 < 2 秒
- **安全**: 密碼必須加密傳輸 (HTTPS)
- **可用性**: 符合 WCAG 2.1 AA 標準
- **瀏覽器支援**: Chrome, Firefox, Safari (最新兩個版本)

---

### 邊界條件與例外情況

| 情境 | 預期行為 |
|------|----------|
| 未註冊的 Email | 顯示「Email 或密碼錯誤」(不透露 Email 不存在) |
| 帳號被停用 | 顯示「帳號已被停用，請聯繫客服」 |
| 連續 5 次登入失敗 | 鎖定帳號 15 分鐘 |
| 網路斷線 | 顯示「無法連線，請檢查網路」 |

---

### 使用者介面建議

```
┌─────────────────────────────┐
│  [Logo]        登入         │
├─────────────────────────────┤
│                             │
│  Email                      │
│  [________________]         │
│                             │
│  密碼                        │
│  [________________] [顯示]   │
│                             │
│  ☐ 記住我                    │
│                             │
│  [     登入     ]           │
│                             │
│  忘記密碼？ | 註冊新帳號      │
│                             │
└─────────────────────────────┘
```

---

### 技術考量

**後端 API**:
- Endpoint: `POST /api/auth/login`
- Request: `{ email, password, rememberMe }`
- Response: `{ token, user, expiresAt }`

**前端實作**:
- Form validation
- Password visibility toggle
- Loading state during login
- Error handling

**資料庫**:
- Users table: email (unique), password_hash
- Sessions table: user_id, token, expires_at

---

### 相依性

**前置需求**:
- [ ] US-000: 使用者註冊功能已完成
- [ ] 資料庫 schema 已建立

**阻礙項目**:
- 等待 OAuth provider 設定 (如需社群登入)

---

### 估算

**故事點數**: 5 (斐波那契: 1, 2, 3, 5, 8, 13, 21)

**時間估算** (參考):
- 後端開發: 1 天
- 前端開發: 1.5 天
- 測試: 0.5 天
- Code review & 修正: 0.5 天
- **總計**: 3.5 天

**估算假設**:
- 不包含社群登入
- 使用現有的 UI 元件庫
- 團隊熟悉技術棧

---

### 優先級

**優先級**: 🔴 P0 (Critical - 必須在 MVP)

**理由**: 登入是產品的核心功能，無此功能無法存取其他功能

**MoSCoW**:
- **M** Must Have ✅
- **S** Should Have
- **C** Could Have
- **W** Won't Have

---

### 測試計畫

#### 單元測試
- [ ] 測試 email 驗證邏輯
- [ ] 測試密碼驗證邏輯
- [ ] 測試 token 生成

#### 整合測試
- [ ] 測試完整登入流程
- [ ] 測試 Session 管理

#### E2E 測試
- [ ] 測試使用者登入旅程
- [ ] 測試錯誤情境

#### 手動測試
- [ ] 可用性測試
- [ ] 跨瀏覽器測試
- [ ] 無障礙測試

---

### 完成定義 (Definition of Done)

- [ ] 程式碼已撰寫並通過 code review
- [ ] 所有驗收標準已滿足
- [ ] 單元測試覆蓋率 > 80%
- [ ] 整合測試通過
- [ ] 文件已更新 (API 文件、使用者手冊)
- [ ] QA 測試通過
- [ ] 無 Critical/High bugs
- [ ] 已部署至 Staging 環境
- [ ] PO 已驗收

---

### 備註與討論

**日期**: YYYY-MM-DD  
**討論者**: [團隊成員]

**問題**:
- Q: 密碼複雜度要求？
  - A: 至少 8 字元，包含英文和數字

**決策**:
- 先不實作社群登入，留待 Sprint 2
- 使用 JWT 作為 token 格式

**風險**:
- 需確保密碼加密方式符合安全標準

---

### 故事拆分 (如需要)

如果此故事太大 (>8 點)，可拆分為：

- **US-001-1**: 基礎登入功能 (email + 密碼)
- **US-001-2**: 「記住我」功能
- **US-001-3**: 錯誤處理和訊息
- **US-001-4**: 無障礙改進
```

---

## 品質檢查清單

- [ ] 遵循「As a, I want, So that」格式
- [ ] 驗收標準清楚且可測試
- [ ] 故事大小適中 (1-2 Sprint 可完成)
- [ ] 包含邊界條件
- [ ] 定義完成標準 (DoD)
- [ ] 估算合理
- [ ] 優先級明確
- [ ] 相依性已識別
- [ ] 技術考量已記錄

---

## 範例

### 輸入範例
```
請幫我撰寫用戶故事：使用者可以搜尋產品
```

### 輸出範例
```
As a **customer**
I want **to search for products by keyword**
So that **I can quickly find what I'm looking for**

驗收標準:
- Given 我在首頁
- When 我在搜尋框輸入「手機」並按 Enter
- Then 顯示所有包含「手機」關鍵字的產品
- And 結果應在 1 秒內顯示
```

---

## 相關 Skills
- `product-discovery.md` - 產品探索
- `prd.md` - 產品需求文件
- `requirements-prioritization.md` - 需求優先級排序

## INVEST 原則提醒

好的用戶故事應符合 INVEST:
- **I**ndependent (獨立)
- **N**egotiable (可協商)
- **V**aluable (有價值)
- **E**stimable (可估算)
- **S**mall (小)
- **T**estable (可測試)
