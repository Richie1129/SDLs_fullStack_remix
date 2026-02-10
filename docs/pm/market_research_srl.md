# SRL-Based Project Management Platform: Market Research & Business Case

> **Document Version:** 1.0
> **Date:** 2026-01-21
> **Author:** Product Management Team
> **Status:** Initial Research Complete

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [SRL Theory Application](#srl-theory-application)
3. [Market Overview](#market-overview)
4. [Competitor Landscape](#competitor-landscape)
5. [Gap Analysis](#gap-analysis)
6. [Proposed Unique Value Proposition](#proposed-unique-value-proposition)
7. [Key Feature Opportunities](#key-feature-opportunities)
8. [Recommendations](#recommendations)
9. [References](#references)

---

## Executive Summary

### Vision Statement

開發一個結合 **自我調節學習 (Self-Regulated Learning, SRL)** 理論與現代專案管理工具的創新平台，專為需要進行長期專案、論文研究或自主學習的學生與知識工作者設計。

### Key Findings

| Category | Insight |
|----------|---------|
| **市場規模** | 全球 EdTech 市場 2025 年達 1,891 億美元，預計 2034 年成長至 5,887 億美元 (CAGR 13.45%) |
| **理論基礎** | Zimmerman 的 SRL 三階段循環模型 (Forethought → Performance → Self-Reflection) 提供堅實的學術基礎 |
| **競品缺口** | 通用專案工具缺乏反思機制；教育工具缺乏靈活的任務管理；專注力工具缺乏學習策略整合 |
| **技術趨勢** | AI 驅動的自適應學習支架 (Adaptive Metacognitive Scaffolding) 是 2025 年研究熱點 |
| **機會定位** | 「後設認知儀表板」結合「行為介入機制」是未被滿足的藍海市場 |

### Strategic Opportunity

現有市場存在明顯的「理論-實踐」鴻溝：

- **學術研究** 已證實 SRL 對學習成效的顯著影響
- **現有工具** 僅提供基礎的任務追蹤，缺乏認知層面的支援
- **目標用戶** (研究生、知識工作者) 需要的不是「做更多」，而是「學會如何更有效率地做」

---

## SRL Theory Application

### Zimmerman's Cyclical Model Overview

Barry J. Zimmerman (1989, 2000, 2013) 提出的 SRL 循環模型是自我調節學習領域最具影響力的理論框架。該模型描述學習者如何在任務**之前、期間、之後**進行認知互動，形成持續改進的循環。

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│    ┌──────────────┐                                            │
│    │  FORETHOUGHT │ ◄────────────────────────────────┐        │
│    │    (預備)     │                                  │        │
│    └──────┬───────┘                                  │        │
│           │                                          │        │
│           ▼                                          │        │
│    ┌──────────────┐                                  │        │
│    │ PERFORMANCE  │                                  │        │
│    │    (執行)     │                                  │        │
│    └──────┬───────┘                                  │        │
│           │                                          │        │
│           ▼                                          │        │
│    ┌──────────────┐                                  │        │
│    │SELF-REFLECTION│─────────────────────────────────┘        │
│    │    (反思)     │                                           │
│    └──────────────┘                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Theory-to-Feature Mapping

| SRL Phase | Sub-Processes (Zimmerman) | Potential Software Feature | Priority |
|-----------|---------------------------|---------------------------|----------|
| **Forethought (預備階段)** | Task Analysis (任務分析) | **Goal Decomposition Wizard** - 引導式目標拆解，將大型專案分解為可執行的子任務 | P0 |
| | Goal Setting (目標設定) | **SMART Goal Builder** - 確保目標具體、可測量、可達成、相關、有時限 | P0 |
| | Strategic Planning (策略規劃) | **Strategy Recommendation Engine** - 基於任務類型推薦學習策略 | P1 |
| | Self-Efficacy Beliefs | **Confidence Tracker** - 開始前記錄對任務的信心程度，追蹤信心與表現的相關性 | P2 |
| | Outcome Expectations | **Time Estimation vs. Actual** - 預估時間 vs 實際時間的追蹤與分析 | P0 |
| | Intrinsic Interest | **Motivation Tagging** - 標記任務動機類型 (內在興趣/外在壓力) | P2 |
| **Performance (執行階段)** | Self-Control (自我控制) | **Focus Mode with Pomodoro** - 整合番茄鐘的專注模式 | P0 |
| | Attention Focusing | **Distraction Logger** - 記錄分心事件與類型 | P1 |
| | Task Strategies | **Strategy Library** - 可搜尋的學習策略庫 | P1 |
| | Self-Monitoring (自我監控) | **Progress Pulse** - 執行中的進度快照與狀態紀錄 | P0 |
| | Metacognitive Monitoring | **Emotion & Energy Logger** - 情緒與精力狀態紀錄 | P0 |
| | Self-Recording | **Work Session Analytics** - 自動記錄工作時段與模式 | P1 |
| **Self-Reflection (反思階段)** | Self-Judgment (自我評價) | **Performance Review Prompt** - 引導式完成後檢討 | P0 |
| | Self-Evaluation | **Goal Achievement Score** - 目標達成度評分 | P0 |
| | Causal Attribution | **Attribution Analysis** - 成敗歸因分析 (能力/努力/策略/運氣) | P1 |
| | Self-Reaction (自我反應) | **Learning Journal** - 結構化學習日誌 | P1 |
| | Self-Satisfaction | **Achievement Celebration** - 成就慶祝與里程碑記錄 | P2 |
| | Adaptive Inferences | **Strategy Adjustment Suggestions** - AI 驅動的策略調整建議 | P0 |

### Metacognitive Scaffolding Approaches

根據 2025 年最新研究，後設認知支架可分為兩種類型：

#### 1. Planned Metacognitive Scaffolding (PMS) - 計畫型支架
- 預設的提示與引導，以統一方式呈現
- 優點：易於實作
- 缺點：無法適應個別學習者的需求

#### 2. Adaptive Metacognitive Scaffolding (AMS) - 自適應支架
- 根據學習者的即時行為提供個人化、即時的反饋
- 優點：更有效地促進深度認知參與
- 缺點：需要 AI 技術支持，實作複雜度高

**研究結論**：AMS 顯著提升學習表現，並促進更複雜、多元的技能運用。

> "Recent research has explored explicit phase scaffolding approaches—such as asking learners to select a self-regulated learning phase before querying or providing phase-specific hint categories."
> — [Scaffolding Metacognition in Programming Education (2025)](https://arxiv.org/html/2511.04144v1)

---

## Market Overview

### EdTech Market Size & Growth

| Metric | Value | Source |
|--------|-------|--------|
| 2025 市場規模 | $189.15B | Fortune Business Insights |
| 2026 預估 | $214.58B | Fortune Business Insights |
| 2034 預估 | $588.72B | Fortune Business Insights |
| CAGR (2026-2034) | 13.45% | Fortune Business Insights |
| AI-in-Education 市場 (2024) | $5.88B | StartUs Insights |
| AI-in-Education 預估 (2030) | $32.27B | StartUs Insights |
| AI-in-Education CAGR | 31% | StartUs Insights |

### Key Market Trends (2025-2026)

```
┌─────────────────────────────────────────────────────────────────┐
│                    2025-2026 EdTech Trends                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  AI-Driven      │  │  Personalized   │  │  Lifelong       │ │
│  │  Personalization│  │  Learning Paths │  │  Learning       │ │
│  │     ★★★★★      │  │     ★★★★☆      │  │     ★★★★☆      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Gamification   │  │  Mobile-First   │  │  Learning       │ │
│  │  & Engagement   │  │  Design         │  │  Analytics      │ │
│  │     ★★★★☆      │  │     ★★★★☆      │  │     ★★★★★      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                 │
│  ★ = Market Importance (5-star scale)                          │
└─────────────────────────────────────────────────────────────────┘
```

### Target User Segments

| Segment | Size Estimate | Key Pain Points | Willingness to Pay |
|---------|---------------|-----------------|-------------------|
| **研究生** | 全球 ~3M | 論文進度失控、拖延、缺乏反饋 | Medium ($10-20/mo) |
| **自學者** | 全球 ~50M | 無結構化路徑、動機維持困難 | Medium ($5-15/mo) |
| **知識工作者** | 全球 ~500M | 多專案管理、深度工作時間不足 | High ($15-30/mo) |
| **教育機構** | 全球 ~200K | 學生學習成效追蹤、介入時機判斷 | High (Enterprise) |

---

## Competitor Landscape

### Competitor Matrix

| Tool | Category | Task Management | Reflection Support | Learning Analytics | Metacognitive Scaffolding | SRL Integration | Pricing |
|------|----------|-----------------|-------------------|-------------------|--------------------------|-----------------|---------|
| **Trello** | General PM | ★★★★☆ | ★☆☆☆☆ | ★☆☆☆☆ | ☆☆☆☆☆ | ☆☆☆☆☆ | Free/$5-17.50/mo |
| **Notion** | General PM | ★★★★★ | ★★☆☆☆ | ★☆☆☆☆ | ☆☆☆☆☆ | ☆☆☆☆☆ | Free/$10-15/mo |
| **Linear** | Dev PM | ★★★★★ | ★☆☆☆☆ | ★★★☆☆ | ☆☆☆☆☆ | ☆☆☆☆☆ | Free/$8/mo |
| **Moodle** | LMS | ★★☆☆☆ | ★★★☆☆ | ★★★☆☆ | ★★☆☆☆ | ★★☆☆☆ | Open Source |
| **Canvas** | LMS | ★★☆☆☆ | ★★★☆☆ | ★★★★☆ | ★★☆☆☆ | ★★☆☆☆ | Enterprise |
| **Forest** | Focus | ★☆☆☆☆ | ★☆☆☆☆ | ★★☆☆☆ | ☆☆☆☆☆ | ☆☆☆☆☆ | $3.99 one-time |
| **Todoist** | Task | ★★★★☆ | ★☆☆☆☆ | ★★☆☆☆ | ☆☆☆☆☆ | ☆☆☆☆☆ | Free/$4-6/mo |
| **Our Platform** | SRL PM | ★★★★☆ | ★★★★★ | ★★★★★ | ★★★★☆ | ★★★★★ | TBD |

### Detailed Competitor Analysis

#### Category 1: General Project Management Tools

**Trello**
- **Strengths**: 極簡的看板介面、學習曲線平緩、Power-Ups 生態系豐富
- **Weaknesses**:
  - 僅支援看板視圖，缺乏彈性
  - 無法建立複雜的任務依賴關係
  - 缺乏進階報告功能
  - 完全沒有反思或學習追蹤機制
- **Quote**: *"Trello remains very rigid: you can't really get out of the Kanban board."*

**Notion**
- **Strengths**: 極高的客製化彈性、多功能整合 (Wiki + Database + PM)
- **Weaknesses**:
  - 學習曲線陡峭 (*"I used several months to fully grasp Notion"*)
  - 大型資料庫效能問題
  - 手機版體驗不佳
  - 無內建的學習分析或反思提示
- **Gap**: 功能強大但缺乏「學習如何學習」的引導

**Linear**
- **Strengths**: 專為軟體開發團隊設計、優秀的專案組合管理、強大的自動化
- **Weaknesses**:
  - 僅適用於軟體開發場景
  - 整合選項有限
  - 無個人學習追蹤功能

#### Category 2: Learning Management Systems (LMS)

**Moodle**
- **Strengths**: 開源免費、高度可客製化、全球社群支持
- **Weaknesses**:
  - 介面過時、設定複雜
  - 需要技術專業知識進行客製化
  - 任務管理功能受限
  - 以課程為中心，不支援專案導向學習
- **Quote**: *"Moodle's block-based structure and detailed settings can overwhelm and impede course management."*

**Canvas**
- **Strengths**: 優秀的使用者體驗、穩定可靠、良好的分析功能
- **Weaknesses**:
  - 客製化受限
  - 批次編輯功能不足
  - 不適合自主學習者
  - 需要機構授權

**LMS 共同問題**:
- 設計理念以「課程交付」為中心，非「自主學習」
- 任務管理僵化，不支援動態調整
- 缺乏對個人學習策略的支援

#### Category 3: Focus & Productivity Tools

**Forest**
- **Strengths**: 遊戲化設計有效、視覺化進度、真實種樹公益連結
- **Weaknesses**:
  - 僅限於專注計時，無任務管理
  - 誤觸即「殺樹」，缺乏彈性
  - 無學習策略或反思功能
  - 無原生整合，需手動搭配其他工具
- **Quote**: *"Limited integrations: Works independently. Some users pair it with other productivity tools manually."*

---

## Gap Analysis

### Identified Market Gaps

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         MARKET GAP ANALYSIS                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                          ┌─────────────────┐                            │
│                          │   BLUE OCEAN    │                            │
│                          │    OPPORTUNITY  │                            │
│                          └────────┬────────┘                            │
│                                   │                                     │
│    ┌──────────────────────────────┼──────────────────────────────┐     │
│    │                              │                              │     │
│    ▼                              ▼                              ▼     │
│ ┌──────────┐              ┌──────────────┐              ┌──────────┐  │
│ │   GAP 1  │              │    GAP 2     │              │   GAP 3  │  │
│ │  反思機制 │              │ 後設認知支架  │              │行為介入  │  │
│ │  缺失    │              │   不足       │              │  機制   │  │
│ └──────────┘              └──────────────┘              └──────────┘  │
│                                                                         │
│ PM Tools:                 LMS Tools:                    Focus Tools:   │
│ - No reflection           - Rigid structure             - No strategy  │
│ - No self-evaluation      - Course-centric              - No analytics │
│ - No strategy tracking    - Limited adaptivity          - Isolated use │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Gap 1: Reflection Mechanism Deficit (反思機制缺失)

**問題描述**:
通用專案管理工具 (Trello, Notion, Linear) 僅關注「做完了什麼」，完全忽略「學到了什麼」和「如何做得更好」。

**Evidence**:
- Trello/Notion 無任何內建的完成後反思提示
- 無法追蹤「預估時間 vs 實際時間」的差距
- 無法記錄任務完成後的心得或改進想法

**Opportunity**:
- 內建結構化的反思提示 (What went well? What was challenging? What would I do differently?)
- 時間預估 vs 實際時間的自動追蹤與分析
- 學習日誌與心得記錄功能

### Gap 2: Metacognitive Scaffolding Insufficiency (後設認知支架不足)

**問題描述**:
現有工具假設使用者「已經知道如何規劃和執行任務」，但研究顯示許多學習者缺乏後設認知技能。

**Evidence**:
- LMS 提供內容，但不教使用者「如何學習」
- PM 工具提供框架，但不引導「如何分解任務」
- *"Novice students often lack metacognitive skills. This can be a disadvantage, particularly when learning in unfamiliar domains."*

**Opportunity**:
- 引導式目標分解 (Goal Decomposition Wizard)
- 學習策略推薦系統
- 明確的 SRL 階段提示 (現在是 Forethought/Performance/Reflection 哪個階段?)

### Gap 3: Behavioral Intervention Mechanism (行為介入機制)

**問題描述**:
現有專注力工具 (Forest) 提供「防止分心」，但不處理拖延的根本原因。

**Evidence**:
- Forest 僅提供計時器，無法解決心理層面的拖延
- 傳統時間管理 App 缺乏認知行為療法策略
- *"Traditional time management apps lack therapeutic strategies like cognitive behavioral therapy to address procrastination's psychological aspects."*

**Opportunity**:
- 拖延行為偵測與早期預警
- 基於 CBT 的介入提示
- 情緒與精力追蹤，找出拖延模式

---

## Proposed Unique Value Proposition

### Positioning Statement

> **For** 研究生、自學者與知識工作者
> **Who** 需要管理長期專案但常因拖延、缺乏反思而效率低落
> **Our product** 是一個結合 SRL 理論的智能專案管理平台
> **That** 不只幫你追蹤任務，更教你如何更有效率地學習與工作
> **Unlike** Trello、Notion 等傳統工具僅關注任務完成
> **We** 提供後設認知支架、行為介入機制與學習分析儀表板

### Value Proposition Canvas

#### Customer Jobs (用戶任務)
1. 完成論文/專案的各個里程碑
2. 維持長期專案的動力與專注
3. 改善自己的學習與工作效率
4. 避免拖延、deadline 前的焦慮衝刺

#### Pains (痛點)
1. 專案太大不知從何開始
2. 時間估計總是失準
3. 反覆犯同樣的錯誤
4. 不知道自己的時間花在哪裡
5. 缺乏反饋，不知道自己進步了沒有

#### Gains (期望獲益)
1. 清晰的專案路徑圖
2. 準確的時間預估能力
3. 從失敗中學習的系統
4. 可視化的成長軌跡
5. 持續的小贏維持動力

#### Products & Services (產品功能)
1. 引導式目標分解 Wizard
2. 時間追蹤與預估分析
3. 結構化反思提示
4. 學習行為儀表板
5. AI 驅動的策略建議

### Differentiation Matrix

| Differentiator | Traditional PM | LMS | Our Platform |
|---------------|----------------|-----|--------------|
| 任務追蹤 | ✅ 強 | ⚠️ 中 | ✅ 強 |
| 彈性架構 | ✅ 強 | ❌ 弱 | ✅ 強 |
| 反思機制 | ❌ 無 | ⚠️ 有限 | ✅ 結構化 |
| 時間分析 | ⚠️ 基本 | ⚠️ 有限 | ✅ 深度 |
| 策略推薦 | ❌ 無 | ❌ 無 | ✅ AI 驅動 |
| 行為介入 | ❌ 無 | ❌ 無 | ✅ 個人化 |
| 學習曲線 | 低-中 | 高 | 中 (有引導) |

---

## Key Feature Opportunities

### USP 1: Metacognitive Dashboard (後設認知儀表板)

**Description**:
一個專為「學習如何學習」設計的分析儀表板，將散落的行為數據轉化為可行動的洞察。

**Core Components**:

```
┌─────────────────────────────────────────────────────────────────┐
│                  METACOGNITIVE DASHBOARD                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  TIME ESTIMATION ACCURACY                                │   │
│  │  ┌───────────────────────────────────────────────────┐  │   │
│  │  │  This Month: 72% accurate (+5% from last month)   │  │   │
│  │  │  ████████████████████░░░░░░░░                     │  │   │
│  │  │  Insight: You tend to underestimate coding tasks  │  │   │
│  │  └───────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────┐  ┌──────────────────────────────┐   │
│  │  PRODUCTIVITY PEAKS  │  │  ENERGY PATTERNS             │   │
│  │  ┌────────────────┐  │  │  ┌────────────────────────┐ │   │
│  │  │ Best: 9-11 AM  │  │  │  │ Mon: ██████████ High   │ │   │
│  │  │ Worst: 2-4 PM  │  │  │  │ Tue: ████████░░ Med    │ │   │
│  │  └────────────────┘  │  │  │ Wed: ████░░░░░░ Low    │ │   │
│  └──────────────────────┘  │  └────────────────────────┘ │   │
│                            └──────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  STRATEGY EFFECTIVENESS                                  │   │
│  │  Most effective: Pomodoro (25/5) for writing tasks       │   │
│  │  Least effective: Long sessions (>2hr) for coding        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key Metrics**:
- 時間預估準確度趨勢
- 最佳工作時段分析
- 情緒/精力與產出的相關性
- 策略有效性評估
- 拖延模式識別

**Research Basis**:
> *"Goal setting, monitoring, and self-evaluation are the most prevalent SRL processes supported in educational tools."*
> — [Tools Designed to Support Self-Regulated Learning (IEEE)](https://ieeexplore.ieee.org/document/9852014/)

---

### USP 2: Procrastination Intervention System (拖延介入系統)

**Description**:
基於 2025 年最新研究，整合數位 Nudge 與認知行為療法 (CBT) 原則的早期介入系統。

**Intervention Triggers**:

| Trigger | Detection Method | Intervention |
|---------|-----------------|--------------|
| 任務多次延期 | 截止日修改紀錄 | 「這個任務已經延期 3 次了。想聊聊是什麼阻礙了你嗎？」 |
| 長時間未開始 | 任務建立後無進度更新 | 「分解成更小的步驟可能會有幫助。需要我引導你嗎？」 |
| 臨近截止急趕 | 截止前 24hr 內大量活動 | 「下次可以試試這個策略：在截止日前 3 天設定假截止日」|
| 情緒低落模式 | 連續低情緒紀錄 | 「休息一下吧。研究顯示短暫休息能提升後續效率。」 |

**CBT-Inspired Features**:
1. **認知重構提示**: 挑戰「完美主義」思維
2. **小步驟分解**: 將龐大任務分解為 15 分鐘可完成的單位
3. **成就回顧**: 定期提醒過去的完成紀錄
4. **Moa 風格聊天機器人**: 引導自我觀察、策略建立與反思

**Research Basis**:
> *"Traditional time management apps lack therapeutic strategies like cognitive behavioral therapy to address procrastination's psychological aspects, leading researchers to develop and integrate a semigenerative chatbot."*
> — [JMIR mHealth (2025)](https://mhealth.jmir.org/2025/1/e53133)

---

### USP 3: SRL Phase-Aware Task Interface (階段感知任務介面)

**Description**:
任務介面明確標示當前 SRL 階段，並提供對應的支援工具。

**Phase-Specific Interface**:

```
┌─────────────────────────────────────────────────────────────────┐
│  TASK: Complete Literature Review Chapter                       │
│  Current Phase: [🎯 FORETHOUGHT] [▶️ PERFORMANCE] [🔍 REFLECTION] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🎯 FORETHOUGHT (Current)                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  □ Define success criteria for this task                │   │
│  │  □ Break down into sub-tasks (recommended: 3-5)         │   │
│  │  □ Estimate time required: [____] hours                 │   │
│  │  □ Rate your confidence (1-10): [____]                  │   │
│  │  □ Identify potential blockers: [________________]      │   │
│  │                                                         │   │
│  │  [Start Working →]                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ▶️ PERFORMANCE (Locked until Forethought complete)            │
│  🔍 REFLECTION (Locked until task marked complete)              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Phase Transitions**:
- **Forethought → Performance**: 完成目標設定與策略規劃後解鎖
- **Performance → Reflection**: 標記任務完成後自動觸發
- **Reflection → Next Forethought**: 完成反思後，洞察自動注入下次規劃

---

### USP 4: Focus Session with Emotion Tracking (情緒追蹤的專注時段)

**Description**:
整合番茄鐘與情緒/精力追蹤，建立個人化的最佳工作模式。

**Session Flow**:

```
開始專注 → 選擇任務 → 設定時長 → 記錄初始精力
    │
    ▼
[專注中] → 可選：記錄分心事件
    │
    ▼
專注結束 → 記錄完成進度 → 記錄情緒/精力 → 30秒反思
    │
    ▼
數據累積 → 發現個人模式 → 提供最佳化建議
```

**Tracked Data Points**:
- 開始/結束時的精力等級 (1-5)
- 情緒標籤 (focused, anxious, bored, energized...)
- 分心類型 (social media, email, snack, other)
- 完成度自評 (0-100%)

**Pattern Insights**:
- 「你在上午 9-11 點精力最高，產出也最多」
- 「連續工作超過 90 分鐘後，你的情緒評分會下降」
- 「週三的產出通常最低，考慮安排輕鬆的任務」

---

### USP 5: AI-Powered Strategy Advisor (AI 策略顧問)

**Description**:
結合 RAG (Retrieval-Augmented Generation) 與個人學習數據，提供個人化的策略建議。

**Advisor Capabilities**:

| Scenario | AI Response Example |
|----------|---------------------|
| 任務類型分析 | 「根據你過去的數據，這類『寫作任務』你通常需要比預估多 30% 的時間。建議設定 6.5 小時而非 5 小時。」|
| 策略推薦 | 「你上次用 Pomodoro 25/5 完成類似任務，效果不錯。要不要繼續用同樣的策略？」|
| 困難分析 | 「我注意到這個任務已經停滯 3 天了。根據你的紀錄，『釐清需求』常是你的卡點。要不要先花 15 分鐘重新確認任務目標？」|
| 反思引導 | 「這次任務比預期多花了 2 小時。主要在哪個環節花最多時間？這對下次有什麼啟示？」|

**RAG Integration**:
- 檢索個人歷史任務數據
- 檢索學習策略知識庫
- 檢索 SRL 理論最佳實踐
- 生成個人化、情境化的建議

---

## Recommendations

### Short-term (0-6 months)

1. **MVP 核心功能**:
   - 基本任務管理 (支援 Kanban 與 List 視圖)
   - 時間預估 vs 實際時間追蹤
   - 簡單的完成後反思提示
   - 基礎學習分析儀表板

2. **驗證假設**:
   - 用戶是否願意在任務完成後花 30 秒反思？
   - 時間追蹤功能是否被實際使用？
   - 哪些用戶族群最活躍？

### Medium-term (6-12 months)

1. **差異化功能**:
   - SRL 階段感知介面
   - 專注時段 + 情緒追蹤
   - 初版 AI 策略顧問
   - 拖延早期預警系統

2. **整合策略**:
   - 與 Google Calendar 整合
   - 與 Notion/Obsidian 筆記整合
   - 行動端 App 開發

### Long-term (12-24 months)

1. **進階功能**:
   - 自適應後設認知支架 (AMS)
   - CBT 風格的介入機器人
   - 機構版本 (教師/教練儀表板)
   - 社群學習功能

2. **商業模式**:
   - B2C: Freemium + Premium ($9-19/mo)
   - B2B: 教育機構授權 (per student pricing)
   - B2B2C: 與線上課程平台整合

---

## References

### Academic Sources

1. Zimmerman, B. J. (2000). Attaining self-regulation: A social cognitive perspective. In M. Boekaerts, P. R. Pintrich, & M. Zeidner (Eds.), *Handbook of self-regulation* (pp. 13–39).

2. Panadero, E. (2017). A Review of Self-regulated Learning: Six Models and Four Directions for Research. *Frontiers in Psychology, 8*, 422. [Link](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2017.00422/full)

3. Fan, X. et al. (2025). Scaffolding Metacognition in Programming Education: Understanding Student–AI Interactions and Design Implications. *arXiv*. [Link](https://arxiv.org/html/2511.04144v1)

4. Nikolopoulou, K. et al. (2025). Mapping the Scaffolding of Metacognition and Learning by AI Tools in STEM Classrooms. *Journal of Intelligence, 13*(11), 148. [Link](https://pmc.ncbi.nlm.nih.gov/articles/PMC12653222/)

5. JMIR (2025). Development of a Mobile Intervention for Procrastination Augmented With a Semigenerative Chatbot. [Link](https://mhealth.jmir.org/2025/1/e53133)

6. JMIR (2025). Behavior Change Support Systems for Self-Treating Procrastination: Systematic Search in App Stores. [Link](https://www.jmir.org/2025/1/e65214)

### Industry Sources

7. Fortune Business Insights (2025). EdTech Market Size & Growth Report 2034. [Link](https://www.fortunebusinessinsights.com/edtech-market-111377)

8. StartUs Insights (2025). EdTech Industry Report 2025. [Link](https://www.startus-insights.com/innovators-guide/edtech-industry-report/)

9. Nuclino (2026). Notion vs Trello Comparison. [Link](https://www.nuclino.com/solutions/notion-vs-trello)

10. Educate-Me (2026). Moodle vs Canvas LMS Comparison. [Link](https://www.educate-me.co/blog/moodle-vs-canvas)

### Tool Reviews

11. Tool Finder (2025). Forest App Review. [Link](https://toolfinder.co/tools/forest)

12. Software Advice (2025). Notion vs Trello Comparison. [Link](https://www.softwareadvice.com/project-management/notion-profile/vs/trello/)

---

## Appendix: Research Data Summary

### Search Queries Executed

| Query | Key Findings |
|-------|--------------|
| Zimmerman SRL cycle model | 三階段循環模型 (Forethought, Performance, Self-Reflection) 的完整架構 |
| Scaffolding metacognitive support | AMS (自適應支架) 優於 PMS (計畫型支架) |
| SRL software features | 目標設定、監控、自我評估是最常見的 SRL 支援功能 |
| Trello Notion Linear comparison | 缺乏反思機制是共同弱點 |
| Moodle Canvas limitations | 任務管理僵化、客製化困難 |
| Forest app review | 有效的專注工具但缺乏整合與策略支援 |
| Procrastination intervention | 數位 Nudge + CBT 是 2025 研究熱點 |
| EdTech market 2025-2026 | 市場 CAGR 13.45%，AI 子領域 CAGR 31% |

---

*Document generated on 2026-01-21. For questions or updates, contact the Product Management team.*
