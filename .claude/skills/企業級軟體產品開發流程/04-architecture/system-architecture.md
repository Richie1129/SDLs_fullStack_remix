---
description: 設計系統架構，包含 C4 模型、技術選型和架構決策
---

# 系統架構設計 (System Architecture)

## 概述
此 skill 協助設計完整的系統架構，包括使用 C4 模型（Context、Container、Component、Code）描述系統結構、技術棧選型、架構模式選擇、非功能需求設計和架構決策記錄。

## 適用角色
- **主要負責**: 系統架構師、技術主管
- **協作角色**: 資深工程師、DevOps 工程師、安全專家

## 輸入需求
使用者需要提供：
- 系統需求文件（功能性和非功能性）
- 預期負載和效能目標
- 技術限制和約束條件
- 預算和時程限制
- 團隊技能和經驗

範例：`請幫我設計 [系統名稱] 的架構，預期日活躍用戶 [數量]，需要支援 [功能列表]`

## 執行步驟

### 步驟 1: 需求分析與整理
- 整理功能性需求
- 明確非功能需求（效能、可用性、擴展性、安全性）
- 識別關鍵約束條件
- 定義成功標準

### 步驟 2: 架構風格選擇
- 評估不同架構風格（單體、微服務、事件驅動、分層）
- 分析各風格的優缺點
- 根據需求選擇合適風格
- 記錄選擇理由

### 步驟 3: C4 模型設計

#### Level 1 - Context 圖
- 識別系統邊界
- 標註外部使用者和系統
- 描述互動關係

#### Level 2 - Container 圖
- 定義主要容器（應用程式、資料庫、訊息佇列等）
- 描述容器間互動
- 標註技術選擇

#### Level 3 - Component 圖
- 拆解關鍵容器為元件
- 定義元件職責
- 描述元件互動

#### Level 4 - Code 圖（選擇性）
- 關鍵類別和介面設計
- 設計模式應用

### 步驟 4: 技術棧選型
- 評估前端框架/函式庫
- 選擇後端語言和框架
- 決定資料庫類型
- 選擇基礎設施和雲端服務
- 評估第三方服務整合

### 步驟 5: 非功能需求設計
- **效能**: 設計快取策略、負載平衡、CDN
- **可用性**: 設計容錯機制、備援方案
- **擴展性**: 設計水平/垂直擴展策略
- **安全性**: 設計認證授權、加密、防護機制
- **可維護性**: 設計日誌、監控、部署策略

### 步驟 6: 架構決策記錄
- 記錄關鍵架構決策（ADR）
- 說明決策背景和選項
- 記錄選擇理由和後果
- 建立決策追溯機制

## 輸出模板

```markdown
# 系統架構設計文件

**系統名稱**: [系統名稱]  
**版本**: 1.0  
**文件日期**: YYYY-MM-DD  
**架構師**: [姓名、職稱]  
**審核者**: [姓名、職稱]  
**狀態**: 草稿 / 審核中 / 已核准

---

## 目錄

1. [執行摘要](#1-執行摘要)
2. [系統概述](#2-系統概述)
3. [架構目標與限制](#3-架構目標與限制)
4. [架構風格與原則](#4-架構風格與原則)
5. [C4 架構模型](#5-c4-架構模型)
6. [技術棧選型](#6-技術棧選型)
7. [非功能需求設計](#7-非功能需求設計)
8. [資料架構](#8-資料架構)
9. [安全架構](#9-安全架構)
10. [部署架構](#10-部署架構)
11. [架構決策記錄](#11-架構決策記錄)
12. [風險與緩解](#12-風險與緩解)
13. [附錄](#13-附錄)

---

## 1. 執行摘要

### 系統簡介
[用 2-3 句話描述系統的核心功能和目的]

### 架構風格
**選擇**: [微服務 / 單體 / 事件驅動 / 混合]

**理由**: [簡要說明為何選擇此架構風格]

### 關鍵技術決策

| 層次 | 技術選擇 | 理由 |
|------|---------|------|
| 前端 | [框架] | [簡要理由] |
| 後端 | [框架] | [簡要理由] |
| 資料庫 | [類型] | [簡要理由] |
| 基礎設施 | [雲端/本地] | [簡要理由] |

### 架構亮點
1. [亮點 1]
2. [亮點 2]
3. [亮點 3]

---

## 2. 系統概述

### 2.1 業務背景
[描述系統要解決的業務問題和目標]

### 2.2 功能概述

**核心功能**:
1. [功能 1]: [簡述]
2. [功能 2]: [簡述]
3. [功能 3]: [簡述]

**次要功能**:
- [功能 A]
- [功能 B]

### 2.3 使用者角色

| 角色 | 說明 | 主要用例 |
|------|------|---------|
| [角色 1] | [說明] | [用例列表] |
| [角色 2] | [說明] | [用例列表] |

### 2.4 系統邊界

**包含在內**:
- [範圍項目 1]
- [範圍項目 2]

**排除在外**:
- [排除項目 1]
- [排除項目 2]

---

## 3. 架構目標與限制

### 3.1 非功能需求

#### 效能需求
- **回應時間**: P95 < X ms，P99 < Y ms
- **吞吐量**: X 請求/秒
- **並發用戶**: X 人同時在線
- **頁面載入**: 首屏 < X 秒

#### 可用性需求
- **SLA**: 99.9% 可用性（年度停機 < 8.76 小時）
- **RTO** (Recovery Time Objective): < X 小時
- **RPO** (Recovery Point Objective): < Y 分鐘
- **容錯**: 可承受單點故障

#### 擴展性需求
- **用戶增長**: 支援未來 X 倍用戶增長
- **資料增長**: 支援 X TB 資料量
- **地理擴展**: 支援多區域部署

#### 安全性需求
- **認證**: [要求說明]
- **授權**: [要求說明]
- **資料加密**: 傳輸加密 + 靜態加密
- **合規**: [GDPR / HIPAA / PCI-DSS 等]

#### 可維護性需求
- **程式碼品質**: 測試覆蓋率 > X%
- **監控**: 完整的日誌和監控
- **部署**: 支援 CI/CD 自動化
- **文件**: 完整的架構和 API 文件

### 3.2 技術限制

**硬性限制**:
- [限制 1]: [說明]
- [限制 2]: [說明]

**偏好限制**:
- [偏好 1]: [說明]
- [偏好 2]: [說明]

### 3.3 業務限制

**預算**: [金額]

**時程**: [X 個月]

**團隊規模**: [X 人]

**技能**: [團隊現有技能說明]

---

## 4. 架構風格與原則

### 4.1 架構風格

**選擇**: [架構風格名稱]

**定義**: [簡要說明此架構風格]

**選擇理由**:
1. [理由 1]
2. [理由 2]
3. [理由 3]

**替代方案分析**:

| 風格 | 優點 | 缺點 | 適用性評分 |
|------|------|------|-----------|
| 單體架構 | [優點] | [缺點] | ⭐⭐ |
| 微服務 | [優點] | [缺點] | ⭐⭐⭐⭐ |
| 事件驅動 | [優點] | [缺點] | ⭐⭐⭐ |

### 4.2 架構原則

1. **單一職責原則 (SRP)**
   - 每個服務/模組只負責一個業務能力
   - 避免過度耦合

2. **關注點分離 (Separation of Concerns)**
   - 清晰的分層架構
   - 前後端分離

3. **鬆耦合高內聚**
   - 服務間通過 API 溝通
   - 避免共享資料庫

4. **可測試性**
   - 設計支援單元測試和整合測試
   - 依賴注入和模擬

5. **可觀測性**
   - 完整的日誌記錄
   - 分散式追蹤
   - 監控和告警

6. **安全優先**
   - 零信任架構
   - 最小權限原則
   - 深度防禦

7. **效能優先**
   - 快取策略
   - 異步處理
   - 懶加載

8. **故障隔離**
   - 斷路器模式
   - 降級策略
   - 限流和背壓

### 4.3 設計模式

**應用的設計模式**:
- [模式 1]: [應用場景]
- [模式 2]: [應用場景]
- [模式 3]: [應用場景]

---

## 5. C4 架構模型

### 5.1 Level 1 - Context 圖

#### 系統上下文

```
                 [外部支付系統]
                        ↓
    [用戶] ----→ [系統名稱] ----→ [第三方 API]
                        ↓
                  [管理員]
                        ↓
                 [監控系統]
```

#### 外部實體說明

| 實體 | 類型 | 說明 | 互動方式 |
|------|------|------|---------|
| 用戶 | 人員 | 系統的主要使用者 | Web/Mobile App |
| 管理員 | 人員 | 系統管理人員 | Admin Portal |
| 外部支付系統 | 系統 | 第三方支付服務 | REST API |
| 第三方 API | 系統 | 外部資料提供者 | REST API |
| 監控系統 | 系統 | APM 和日誌系統 | Agent/API |

### 5.2 Level 2 - Container 圖

#### 容器概覽

```
┌─────────────────────────────────────────────────┐
│                   用戶層                         │
├─────────────────────────────────────────────────┤
│  [Web App]  [Mobile App]  [Admin Portal]        │
│   (React)     (React Native)   (React)          │
└────────┬────────────┬───────────────┬───────────┘
         │            │               │
         ├────────────┼───────────────┘
         ↓            ↓
┌─────────────────────────────────────────────────┐
│              應用層 (API Gateway)                │
│                  (Node.js)                       │
└────────┬────────────────────────────────────────┘
         │
    ┌────┴────┬─────────┬──────────┐
    ↓         ↓         ↓          ↓
[用戶服務] [訂單服務] [支付服務] [通知服務]
 (Node.js)  (Node.js)  (Node.js)  (Node.js)
    ↓         ↓         ↓          ↓
┌─────────────────────────────────────────────────┐
│                   資料層                         │
├─────────────────────────────────────────────────┤
│ [PostgreSQL] [Redis] [MongoDB] [Message Queue]  │
└─────────────────────────────────────────────────┘
```

#### 容器清單

| 容器名稱 | 技術 | 職責 | 互動方式 |
|---------|------|------|---------|
| Web App | React + Vite | 使用者介面 | HTTPS + WebSocket |
| Mobile App | React Native | 行動裝置介面 | HTTPS + WebSocket |
| Admin Portal | React | 管理後台 | HTTPS |
| API Gateway | Node.js + Express | 統一入口、路由、認證 | REST + GraphQL |
| 用戶服務 | Node.js + Express | 用戶管理、認證授權 | REST API |
| 訂單服務 | Node.js + Express | 訂單處理 | REST API |
| 支付服務 | Node.js + Express | 支付整合 | REST API |
| 通知服務 | Node.js + Express | 推播、Email、簡訊 | Message Queue |
| PostgreSQL | PostgreSQL 14 | 關聯式資料儲存 | TCP/IP |
| Redis | Redis 7 | 快取、Session | TCP/IP |
| MongoDB | MongoDB 6 | 非結構化資料 | TCP/IP |
| Message Queue | RabbitMQ | 異步訊息傳遞 | AMQP |

### 5.3 Level 3 - Component 圖（用戶服務範例）

```
┌─────────────────────────────────────────────────┐
│              用戶服務 (User Service)             │
├─────────────────────────────────────────────────┤
│                                                  │
│  [Auth Controller] ──→ [Auth Service]           │
│         ↓                    ↓                   │
│  [User Controller] ──→ [User Service]           │
│         ↓                    ↓                   │
│  [Profile Controller] ──→ [Profile Service]     │
│                              ↓                   │
│              ┌───────────────┴──────┐            │
│              ↓                      ↓            │
│      [User Repository]    [JWT Service]          │
│              ↓                                   │
│      [User Model]                                │
│              ↓                                   │
│       [PostgreSQL]                               │
└─────────────────────────────────────────────────┘
```

#### 元件說明

| 元件 | 職責 | 依賴 |
|------|------|------|
| Auth Controller | 處理認證相關 HTTP 請求 | Auth Service |
| Auth Service | 實現認證邏輯（登入、登出、刷新 Token） | User Repository, JWT Service |
| User Controller | 處理用戶 CRUD HTTP 請求 | User Service |
| User Service | 實現用戶業務邏輯 | User Repository |
| Profile Controller | 處理用戶資料 HTTP 請求 | Profile Service |
| Profile Service | 實現用戶資料業務邏輯 | User Repository |
| User Repository | 資料存取層 | User Model |
| User Model | 資料模型定義 | PostgreSQL |
| JWT Service | JWT Token 生成和驗證 | - |

### 5.4 Level 4 - Code 圖（關鍵類別）

```typescript
// 認證服務核心類別
class AuthService {
  constructor(
    private userRepository: UserRepository,
    private jwtService: JwtService,
    private passwordHasher: PasswordHasher
  ) {}
  
  async login(email: string, password: string): Promise<AuthToken>
  async register(userData: RegisterDTO): Promise<User>
  async refreshToken(refreshToken: string): Promise<AuthToken>
  async logout(userId: string): Promise<void>
}

// 用戶倉儲
interface UserRepository {
  findById(id: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  create(user: CreateUserDTO): Promise<User>
  update(id: string, data: UpdateUserDTO): Promise<User>
  delete(id: string): Promise<void>
}
```

---

## 6. 技術棧選型

### 6.1 前端技術棧

#### Web 前端

**框架**: React 18.x

**建置工具**: Vite 5.x

**狀態管理**: Zustand / Redux Toolkit

**UI 框架**: TailwindCSS + shadcn/ui

**路由**: React Router 6.x

**HTTP 客戶端**: Axios

**表單處理**: React Hook Form + Zod

**選擇理由**:
- ✅ 團隊熟悉 React 生態系
- ✅ Vite 提供極快的開發體驗
- ✅ TailwindCSS 加速 UI 開發
- ✅ 社群資源豐富

**替代方案**: Vue 3 + Nuxt, Next.js

#### Mobile 前端

**框架**: React Native 0.72+

**導航**: React Navigation 6.x

**狀態管理**: Zustand

**選擇理由**:
- ✅ 與 Web 共用邏輯程式碼
- ✅ 跨平台開發節省成本
- ✅ 團隊技能可複用

### 6.2 後端技術棧

**語言**: Node.js 20.x (LTS)

**框架**: Express.js 4.x

**ORM**: Sequelize / Prisma

**驗證**: JWT (jsonwebtoken)

**驗證**: Joi / Zod

**測試**: Jest + Supertest

**選擇理由**:
- ✅ JavaScript 全端統一
- ✅ 非阻塞 I/O 適合高並發
- ✅ 豐富的 npm 生態系
- ✅ 團隊技能匹配

**替代方案**: Python (FastAPI), Java (Spring Boot), Go

### 6.3 資料庫選型

#### 主資料庫

**選擇**: PostgreSQL 14.x

**用途**: 關聯式資料儲存（用戶、訂單等）

**選擇理由**:
- ✅ ACID 特性保證資料一致性
- ✅ 強大的查詢能力
- ✅ JSON 支援混合查詢
- ✅ 開源且成熟穩定

#### 快取層

**選擇**: Redis 7.x

**用途**: Session、快取、排行榜、限流

**選擇理由**:
- ✅ 極高的讀寫效能
- ✅ 豐富的資料結構
- ✅ 支援持久化

#### 文件資料庫（選擇性）

**選擇**: MongoDB 6.x

**用途**: 非結構化資料、日誌、事件

**選擇理由**:
- ✅ 靈活的 Schema
- ✅ 水平擴展能力強
- ✅ 適合大量寫入

### 6.4 訊息佇列

**選擇**: RabbitMQ 3.x

**用途**: 異步任務、事件驅動、解耦服務

**選擇理由**:
- ✅ 可靠的訊息傳遞
- ✅ 多種交換模式
- ✅ 完善的管理介面

**替代方案**: Apache Kafka (大規模事件流), AWS SQS (雲端託管)

### 6.5 基礎設施

#### 雲端平台

**選擇**: AWS / Azure / GCP

**服務**:
- 計算: EC2 / App Service / Compute Engine
- 容器: ECS / AKS / GKE
- 儲存: S3 / Blob Storage / Cloud Storage
- CDN: CloudFront / Azure CDN / Cloud CDN
- 監控: CloudWatch / Application Insights / Cloud Monitoring

#### 容器化

**選擇**: Docker + Kubernetes

**選擇理由**:
- ✅ 環境一致性
- ✅ 易於擴展
- ✅ 服務編排能力

#### CI/CD

**選擇**: GitHub Actions / GitLab CI

**理由**:
- ✅ 與版本控制整合
- ✅ 靈活的工作流程
- ✅ 豐富的社群 Actions

### 6.6 監控與日誌

**APM**: Datadog / New Relic / Elastic APM

**日誌**: ELK Stack (Elasticsearch + Logstash + Kibana)

**錯誤追蹤**: Sentry

**正常運行監控**: UptimeRobot / Pingdom

---

## 7. 非功能需求設計

### 7.1 效能設計

#### 快取策略

**多層快取架構**:

```
Client (Browser Cache)
    ↓
CDN Cache (Static Assets)
    ↓
API Gateway Cache (Response Cache)
    ↓
Application Cache (Redis)
    ↓
Database Query Cache
    ↓
Database
```

**快取策略**:

| 資料類型 | 快取位置 | TTL | 更新策略 |
|---------|---------|-----|---------|
| 靜態資源 | CDN | 7 天 | 版本號更新 |
| API 回應 | Redis | 5 分鐘 | Cache-Aside |
| 用戶 Session | Redis | 24 小時 | Sliding Expiration |
| 熱門資料 | Redis | 1 小時 | Write-Through |

#### 資料庫優化

**索引策略**:
- 所有外鍵建立索引
- 查詢頻繁的欄位建立索引
- 複合索引針對多條件查詢

**查詢優化**:
- 使用 Connection Pool (最大 100 連線)
- 避免 N+1 查詢問題
- 使用 Eager Loading 減少查詢次數
- 分頁查詢避免全表掃描

**讀寫分離**:
- 主資料庫處理寫入
- 副本資料庫處理讀取
- 讀寫比例約 8:2

#### 負載平衡

```
                [Load Balancer]
                      │
        ┌─────────────┼─────────────┐
        ↓             ↓             ↓
   [API Server 1] [API Server 2] [API Server 3]
```

**策略**: Round Robin + Health Check

**自動擴展**:
- CPU > 70% 時自動增加實例
- CPU < 30% 時自動減少實例
- 最小 2 個實例，最大 10 個實例

### 7.2 可用性設計

#### 高可用架構

**目標**: 99.9% 可用性

**策略**:
1. **無單點故障**: 所有關鍵服務至少 2 個實例
2. **健康檢查**: 每 10 秒檢查一次，失敗 3 次則移除
3. **自動故障轉移**: 主節點失敗自動切換到備用
4. **資料備份**: 每日全量備份 + 實時增量備份

#### 災難復原

**RTO** (Recovery Time Objective): 2 小時

**RPO** (Recovery Point Objective): 15 分鐘

**備份策略**:
- 每日 00:00 自動全量備份
- 每 15 分鐘增量備份
- 備份保留 30 天
- 異地備份（不同可用區）

**復原程序**:
1. 檢測故障（自動 + 人工）
2. 啟動復原計畫
3. 從備份還原資料
4. 驗證資料完整性
5. 切換流量到新環境
6. 監控穩定性

### 7.3 擴展性設計

#### 水平擴展

**無狀態設計**:
- 所有 API 服務無狀態
- Session 儲存在 Redis
- 檔案儲存在物件存儲

**服務拆分**:
- 按業務領域拆分微服務
- 每個服務獨立擴展
- 服務間通過 API/Message 溝通

#### 垂直擴展

**資料庫**:
- 讀寫分離
- 分庫分表（未來）
- 歷史資料歸檔

**快取**:
- Redis Cluster 模式
- 資料分片

#### 資料分片策略（未來）

**分片鍵**: User ID

**分片數**: 16

**路由規則**: Hash(UserID) % 16

### 7.4 安全性設計

**詳見第 9 節: 安全架構**

### 7.5 可觀測性設計

#### 日誌系統

**結構化日誌**:
```json
{
  "timestamp": "2024-01-18T10:30:00Z",
  "level": "INFO",
  "service": "user-service",
  "traceId": "abc123",
  "userId": "12345",
  "action": "login",
  "duration": 150,
  "status": "success"
}
```

**日誌等級**:
- DEBUG: 詳細除錯資訊
- INFO: 一般資訊事件
- WARN: 警告但不影響功能
- ERROR: 錯誤需要關注
- FATAL: 嚴重錯誤系統停止

**日誌收集**: Filebeat → Logstash → Elasticsearch → Kibana

#### 監控指標

**系統指標**:
- CPU、記憶體、磁碟、網路使用率
- 服務健康狀態

**應用指標**:
- 請求數、錯誤率、回應時間
- 資料庫查詢時間
- 快取命中率

**業務指標**:
- 每日活躍用戶
- 新增註冊用戶
- 訂單轉換率

#### 分散式追蹤

**工具**: OpenTelemetry + Jaeger

**追蹤範圍**:
- API Gateway → 微服務 → 資料庫
- 完整請求鏈路
- 效能瓶頸分析

---

## 8. 資料架構

### 8.1 資料模型（ER 圖）

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    User     │───────│    Order    │───────│ OrderItem   │
├─────────────┤ 1   n ├─────────────┤ 1   n ├─────────────┤
│ id (PK)     │       │ id (PK)     │       │ id (PK)     │
│ email       │       │ userId (FK) │       │ orderId(FK) │
│ username    │       │ status      │       │ productId   │
│ password    │       │ total       │       │ quantity    │
│ role        │       │ createdAt   │       │ price       │
│ createdAt   │       └─────────────┘       └─────────────┘
└─────────────┘
       │ 1
       │
       │ n
┌─────────────┐
│   Profile   │
├─────────────┤
│ id (PK)     │
│ userId (FK) │
│ firstName   │
│ lastName    │
│ avatar      │
└─────────────┘
```

### 8.2 資料庫設計原則

**正規化**: 第三正規化 (3NF)

**命名規範**:
- 表名: snake_case 複數 (users, order_items)
- 欄位名: snake_case (user_id, created_at)
- 主鍵: id (UUID 或 BIGINT)
- 外鍵: [table]_id

**必要欄位**:
- created_at: 建立時間
- updated_at: 更新時間
- deleted_at: 軟刪除時間（選擇性）

### 8.3 資料遷移策略

**版本控制**: Sequelize Migrations / Flyway

**遷移原則**:
1. 向前相容（新欄位使用預設值）
2. 分階段遷移（先加欄位，再改程式碼，最後移除舊欄位）
3. 可回滾設計
4. 生產環境遷移需審核

### 8.4 資料保留政策

| 資料類型 | 保留期間 | 歸檔策略 |
|---------|---------|---------|
| 用戶資料 | 永久 | 不歸檔 |
| 訂單資料 | 7 年 | 1 年後歸檔至冷儲存 |
| 日誌資料 | 90 天 | 30 天後歸檔，90 天後刪除 |
| 臨時資料 | 7 天 | 自動刪除 |

---

## 9. 安全架構

### 9.1 認證與授權

#### 認證機制

**JWT Token 架構**:
```
Access Token:
- 有效期: 15 分鐘
- 存放: Memory / SessionStorage
- 內容: userId, role, permissions

Refresh Token:
- 有效期: 7 天
- 存放: HttpOnly Cookie
- 用途: 刷新 Access Token
```

**認證流程**:
1. 用戶登入 → 驗證帳密
2. 簽發 Access Token + Refresh Token
3. 客戶端攜帶 Access Token 請求 API
4. Access Token 過期 → 使用 Refresh Token 刷新
5. Refresh Token 過期 → 重新登入

#### 授權機制

**RBAC** (Role-Based Access Control):

```
Role: Admin
  ├─ Permission: user.create
  ├─ Permission: user.read
  ├─ Permission: user.update
  └─ Permission: user.delete

Role: User
  ├─ Permission: profile.read
  └─ Permission: profile.update
```

**權限檢查**:
```javascript
// Middleware 範例
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user.permissions.includes(permission)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}
```

### 9.2 資料安全

#### 加密

**傳輸加密**:
- 強制 HTTPS (TLS 1.3)
- HSTS Header
- Certificate Pinning (Mobile App)

**靜態加密**:
- 密碼: bcrypt (cost 12)
- 敏感欄位: AES-256-GCM
- 資料庫加密: Transparent Data Encryption (TDE)

#### 敏感資料處理

**PII** (Personally Identifiable Information):
- 最小化收集
- 加密儲存
- 日誌遮蔽（email → e***@***.com）
- 定期審查存取

### 9.3 API 安全

**速率限制**:
- 未認證: 100 請求/小時/IP
- 已認證: 1000 請求/小時/用戶
- 登入端點: 5 次/5 分鐘

**輸入驗證**:
- 所有輸入使用 Schema 驗證（Joi/Zod）
- SQL 注入防護（使用 ORM）
- XSS 防護（輸出編碼）
- CSRF 防護（Token 驗證）

**安全標頭**:
```
Content-Security-Policy: default-src 'self'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000
```

### 9.4 網路安全

**網路分層**:
```
DMZ (Public)
  ├─ Load Balancer
  └─ Web Application Firewall (WAF)
        ↓
Application Layer (Private)
  ├─ API Servers
  └─ Application Servers
        ↓
Data Layer (Private)
  ├─ Databases
  └─ Cache
```

**防護機制**:
- WAF: 阻擋常見攻擊（SQL 注入、XSS）
- DDoS 防護: Rate Limiting + CDN
- Firewall: 白名單 IP + 最小權限

---

## 10. 部署架構

### 10.1 環境規劃

| 環境 | 用途 | 規模 | 資料 |
|------|------|------|------|
| 開發 (Dev) | 開發人員日常開發 | 最小 | 假資料 |
| 測試 (Test) | 自動化測試 | 小型 | 測試資料 |
| 預演 (Staging) | 上線前驗證 | 同生產 | 脫敏真實資料 |
| 生產 (Production) | 正式服務 | 完整 | 真實資料 |

### 10.2 容器部署

#### Docker Compose (開發環境)

```yaml
version: '3.8'
services:
  api:
    build: ./api
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
  
  postgres:
    image: postgres:14
    environment:
      POSTGRES_PASSWORD: password
  
  redis:
    image: redis:7
```

#### Kubernetes (生產環境)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
      - name: api
        image: myapp/api:v1.0.0
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
```

### 10.3 部署策略

**藍綠部署** (Blue-Green Deployment):
```
Production Traffic → Blue (Current)
                   → Green (New) → Test → Switch Traffic
```

**優點**:
- 快速回滾
- 零停機時間
- 完整測試

**滾動更新** (Rolling Update):
```
Instance 1: v1.0 → v1.1 ✓
Instance 2: v1.0 → v1.1 ✓
Instance 3: v1.0 → v1.1 ✓
```

**優點**:
- 資源利用率高
- 漸進式更新
- 降低風險

### 10.4 CI/CD 流程

```
Git Push
  ↓
Build (Compile, Test)
  ↓
Test (Unit, Integration)
  ↓
Security Scan (SAST, Dependency Check)
  ↓
Build Docker Image
  ↓
Push to Registry
  ↓
Deploy to Staging
  ↓
E2E Test
  ↓
Manual Approval
  ↓
Deploy to Production
  ↓
Health Check
  ↓
Success / Rollback
```

---

## 11. 架構決策記錄 (ADR)

### ADR-001: 選擇微服務架構

**狀態**: 已接受

**日期**: 2024-01-15

**決策者**: 技術主管、架構師團隊

#### 背景
系統預期需要支援高並發、快速迭代和團隊擴展。

#### 決策
採用微服務架構，按業務領域拆分服務。

#### 理由
1. ✅ 支援獨立部署和擴展
2. ✅ 團隊可並行開發
3. ✅ 技術棧可彈性選擇
4. ✅ 故障隔離

#### 後果
- **正面**: 靈活性高、擴展性好
- **負面**: 增加複雜度、需要服務治理
- **風險**: 分散式事務處理、網路延遲

#### 緩解措施
- 使用 API Gateway 統一入口
- 使用 Service Mesh 管理服務間通訊
- 實作 Saga 模式處理分散式事務

---

### ADR-002: 選擇 PostgreSQL 作為主資料庫

**狀態**: 已接受

**日期**: 2024-01-15

**決策者**: 架構師、DBA

#### 背景
需要選擇可靠的關聯式資料庫。

#### 決策
使用 PostgreSQL 14 作為主資料庫。

#### 理由
1. ✅ ACID 保證資料一致性
2. ✅ 強大的查詢能力
3. ✅ JSON 支援混合查詢
4. ✅ 開源且社群活躍
5. ✅ 成熟的備份和復原工具

#### 替代方案
- MySQL: 較簡單但功能較少
- MongoDB: 適合非結構化但缺乏事務
- CockroachDB: 分散式但較新

#### 後果
- **正面**: 可靠性高、功能豐富
- **負面**: 垂直擴展有限
- **風險**: 需要專業 DBA 維護

---

### ADR-003: JWT 認證機制

**狀態**: 已接受

**日期**: 2024-01-16

#### 決策
使用 JWT (Access Token + Refresh Token) 作為認證機制。

#### 理由
1. ✅ 無狀態，適合分散式架構
2. ✅ 跨域支援好
3. ✅ 行動應用友善

#### 後果
- **正面**: 擴展性好、實作簡單
- **負面**: Token 無法主動撤銷
- **風險**: Token 洩漏風險

#### 緩解措施
- 短期 Access Token (15 分鐘)
- Refresh Token 白名單機制
- 敏感操作需重新驗證

---

## 12. 風險與緩解

### 技術風險

| 風險 | 機率 | 影響 | 緩解措施 | 負責人 |
|------|------|------|---------|--------|
| 效能瓶頸 | 中 | 高 | 完整的效能測試、快取策略 | 技術主管 |
| 資料遺失 | 低 | 極高 | 多重備份、異地備援 | DBA |
| 安全漏洞 | 中 | 高 | 定期安全審查、滲透測試 | 安全專家 |
| 第三方服務故障 | 中 | 中 | 降級策略、備用服務商 | 架構師 |

### 架構風險

| 風險 | 影響 | 緩解措施 |
|------|------|---------|
| 過度設計 | 增加複雜度和成本 | 從簡單開始，按需擴展 |
| 技術債累積 | 降低開發速度 | 定期重構、程式碼審查 |
| 文件過時 | 知識流失 | 自動化文件生成、定期更新 |

---

## 13. 附錄

### 13.1 術語表

| 術語 | 定義 |
|------|------|
| C4 Model | Context, Container, Component, Code 四層架構模型 |
| ACID | Atomicity, Consistency, Isolation, Durability |
| JWT | JSON Web Token |
| RBAC | Role-Based Access Control |
| SLA | Service Level Agreement |
| RTO | Recovery Time Objective |
| RPO | Recovery Point Objective |

### 13.2 參考資料
- [C4 Model Documentation](https://c4model.com/)
- [Twelve-Factor App](https://12factor.net/)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)

---

## 審核與核准

| 角色 | 姓名 | 簽名 | 日期 | 意見 |
|------|------|------|------|------|
| 架構師 | | | | |
| 技術主管 | | | | |
| 安全專家 | | | | |
| DBA | | | | |
| 最終核准者 | | | | |

**狀態**: ✅ 已核准 / 🔄 需修改 / ❌ 已拒絕

**核准日期**: YYYY-MM-DD
```

---

## 品質檢查清單

- [ ] C4 模型四層都已完整描述
- [ ] 技術棧選型有明確理由
- [ ] 非功能需求都有對應設計
- [ ] 關鍵架構決策已記錄 ADR
- [ ] 安全性設計完整
- [ ] 部署和擴展策略明確
- [ ] 監控和日誌設計完整
- [ ] 風險識別並有緩解措施
- [ ] 架構圖清晰易懂
- [ ] 已由技術主管和架構師審核

---

## 相關 Skills
- `adr.md` - 架構決策記錄（詳細 ADR 撰寫）
- `data-model.md` - 資料模型設計（資料庫詳細設計）
- `api-design.md` - API 設計（API 詳細規範）
- `tech-stack-evaluation.md` - 技術棧評估（技術選型詳細分析）
- `infrastructure.md` - 基礎設施設計（DevOps 和雲端架構）

---

## 範例

### 輸入範例
```
請幫我設計「線上學習平台」的系統架構，
預期日活躍用戶 10 萬人，
需要支援影片串流、即時聊天、作業批改、
要求 99.9% 可用性。
```

### 輸出範例
[生成完整架構文件，包含：]
- **架構風格**: 微服務架構
- **核心服務**: 用戶服務、課程服務、影片服務、聊天服務、作業服務
- **技術棧**: 
  - 前端: React + Vite
  - 後端: Node.js + Express
  - 資料庫: PostgreSQL + Redis + MongoDB
  - 串流: AWS S3 + CloudFront
  - 即時通訊: Socket.IO + Redis Pub/Sub
- **效能設計**: CDN + 多層快取 + 負載平衡
- **高可用**: 多區域部署 + 自動故障轉移
