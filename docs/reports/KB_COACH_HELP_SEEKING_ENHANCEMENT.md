# KB Coach 求助引導強化：實作計畫

> **背景**：KB Coach 手動觸發是一種「主動策略型求助」行為，但原設計未加入任何後設認知鷹架，且未將此行為納入 help-seeking 追蹤。本計畫修正此缺口。
>
> **理論依據**：`Reference/HELP_SEEKING_IN_SRL_ANALYSIS.md` 第 3.6 節（2026-02-25 修訂）
>
> **建立日期**：2026-02-25

---

## 問題描述

| 現況 | 問題 |
|------|------|
| 學生打開 KB Coach → 直接選 Agent → 拿到 AI 建議 | 無前置意圖問題，AI 不知道學生是卡住還是主動求精進 |
| `kb_coach_history` 無 `trigger_source` 欄位 | 無法區分 Orchestrator 自動建議 vs 學生手動觸發 |
| 手動觸發未記錄 `help_seeking_intent` | 無法分析不同意圖類型的 helpful 率差異 |
| `stuck` 意圖的學生應獲得較溫和的引導 | 目前 AI 對所有學生一視同仁，不根據意圖調整語氣 |

---

## 實作範圍

### Phase A：資料模型

**目標**：為 `kb_coach_histories` 表新增兩個追蹤欄位。

**新增欄位**：

| 欄位 | 類型 | 允許 NULL | 說明 |
|------|------|----------|------|
| `help_seeking_intent` | STRING(50) | ✅ | `proactive_improve` / `proactive_judge` / `stuck` / `null`（Orchestrator 觸發時為 null）|
| `trigger_source` | STRING(20) | ✅ | `manual` / `orchestrator`，預設 `manual` |

**影響檔案**：
- `sdl-backend-main/migrations/20260225000000-add-intent-to-kb-coach-history.js`（新建）
- `sdl-backend-main/models/kb_coach_history.js`（更新）

---

### Phase B：前端

**目標**：降低認知負荷，讓知識翻新在不知不覺中發生。

> **⚠️ 設計決策修訂（2026-02-25）**：初版實作了「前置意圖問題 → 選擇 Agent」兩層選擇的流程。
> 經過 UX 評估，此流程對知識翻新初期的學生認知負荷過高，且有悖於「漸進式揭露」的鷹架設計原則。
> 最終採用 **Option 2：自動預設 + 事後換角度** 模式。

**最終 UI 流程**：

```
第一步：打開 KB Coach
┌─────────────────────────────────────────┐
│  [讓 AI 看看這個想法]  ← 只有一個按鈕    │
└─────────────────────────────────────────┘

第二步：AI 自動回應（預設使用 IMPROVER）
┌─────────────────────────────────────────┐
│  你提到校園湖泊比較方便...              │
│  ─────────────────────────────────      │
│  換個角度看？                           │
│  [🔗 整合觀點]  [⚖️ 找出漏洞]          │
└─────────────────────────────────────────┘

Orchestrator 自動觸發：行為不變（直接觸發 suggestedAgent）
```

**設計原則說明**：
- 第一次互動零決策負擔，降低進入門檻
- AI 自動選用 IMPROVER 提供初始回饋
- 回應後才顯示其他角度按鈕（漸進式揭露）
- 學生在有了初始回饋的脈絡後，更容易決定是否需要不同視角

**換角度按鈕（事後顯示）**：
- 「整合觀點」→ SYNTHESIZER（連結多個想法）
- 「找出漏洞」→ DEVIL（挑戰既有觀點）
- 切換後若需再換，顯示其他兩個角度（永遠排除當前 activeAgent）

**影響檔案**：
- `sdl-frontend-main/src/pages/ideaWall/components/KB_Coach.jsx`（更新）

---

### Phase C：後端

**目標**：kbCoach.js controller 接收 `helpSeekingIntent` 和 `triggerSource`，調整 prompt 並存入資料庫。

**API 請求新增參數**：

```json
{
  "helpSeekingIntent": "stuck",
  "triggerSource": "manual"
}
```

**處理邏輯**：

1. 接收 `helpSeekingIntent`（預設 `null`）和 `triggerSource`（預設 `'manual'`）
2. 若 `helpSeekingIntent === 'stuck'`：在 user message 末尾附加引導提示
3. 儲存至 `kb_coach_history`：`helpSeekingIntent` 和 `triggerSource` 欄位

**影響檔案**：
- `sdl-backend-main/controllers/kbCoach.js`（更新）

---

## 驗證計畫

### 短期（實作後 2-4 週）

| 指標 | 查詢方式 | 預期 |
|------|---------|------|
| 意圖分布 | `SELECT help_seeking_intent, COUNT(*) FROM kb_coach_histories WHERE trigger_source='manual' GROUP BY help_seeking_intent` | `proactive_*` 應佔多數 |
| 各意圖 helpful 率 | join `ai_feedback` by `session_id` | `stuck` helpful 率可能偏低（需持續改進） |
| 前置問題跳出率 | 前端埋點：選了意圖但關閉視窗的比例 | 目標 < 20% |

### 中期（累積足夠資料後）

1. `stuck` 意圖的學生，KB Coach 後 24 小時內是否有新增節點？（討論品質追蹤）
2. 主動策略型（`proactive_*`）使用頻率較高的學生，在 AI Task Assistant 的 `helpSeekingType` 是否也傾向 `adaptive`？（跨工具 SRL 能力一致性）
3. 加入前置問題前後，overall helpful 率的變化（AI 回應精準度驗證）

---

## 實作進度

| Phase | 狀態 | 完成時間 | 備註 |
|-------|------|---------|------|
| 文件更新（HELP_SEEKING_IN_SRL_ANALYSIS.md） | ✅ 完成 | 2026-02-25 | 新增第 3.6 節、修訂第 2.1D、2.3 節 |
| Phase A：資料庫 migration + model | ✅ 完成 | 2026-02-25 | |
| Phase B：前端 UX 重設計（自動預設 + 事後換角度） | ✅ 完成 | 2026-02-25 | 取代初版的前置意圖問題設計，降低認知負荷 |
| Phase C：後端 controller | ✅ 完成 | 2026-02-25 | |
