# 5Rs 漸進式反思框架重構方案

> 狀態：已實作（待合併）  
> 建立日期：2026-04-10  
> 完成日期：2026-04-10  
> 分支：refactor/carditem-decomposition

## 1. 背景與動機

### 問題

5Rs 反思框架（Reporting → Responding → Relating → Reasoning → Reconstructing）目前要求學生填寫全部 5 個欄位。對高中生而言，這可能造成不必要的認知負荷。

### 文獻依據

| 文獻 | 關鍵發現 |
|------|---------|
| Bain et al. (2002). *Reflecting on Practice: Student Teachers' Perspectives.* | 5Rs 原始設計對象為**大學師培生**，非中學生 |
| Sweller (1988). Cognitive Load Theory. | 同時切換多種思維模式會增加 extraneous load，高中生工作記憶尚在發展 |
| Moon (1999). *Reflection in Learning and Professional Development.* | 大多數學生停留在描述性層次，要求同時操作 5 個反思層次可能超出能力 |
| Kember et al. (2000). Reflective Thinking Questionnaire. | 即使大學生，多數只達 understanding 層次；原始 7 級分類被認為 "too fine-grained" 而簡化為 4 級 |
| Dyment & O'Connell (2011). Quality of Reflection in Student Journals. | 大多數學生日誌以描述性內容為主，缺乏批判性反思 |
| Van de Pol et al. (2019). Fading Distributed Scaffolds. | contingent support 搭配 fading 最有效，支持漸進式開放設計 |

### 設計原則

基於 fading scaffolding 理論，採用**漸進式開放**：
- 入門模式：最少填 2 個 R（Reporting + Responding，描述層次）
- 全部 5 個 R 皆為**選填**，UI 上標示推薦順序
- 以視覺引導鼓勵學生逐步挑戰更深層的 R（Relating → Reasoning → Reconstructing）
- AI 分析根據**實際填寫的欄位**給予回饋，未填欄位提供引導而非扣分

## 2. 設計方案

### 2.1 前端表單行為

- 5 個 R 全部顯示，但 Reporting 和 Responding 標記為「建議填寫」
- 其餘 3 個標記為「進階反思（選填）」
- 驗證規則：至少填寫 **2 個**欄位才可儲存
- 進度條顯示 `n/5`，不再暗示「全填才完整」
- AI 分析觸發條件：至少填寫 **2 個**欄位

### 2.2 資料格式

JSON 結構**不變**（向後相容），空欄位存為空字串 `""`：

```json
{
  "type": "5Rs_reflection",
  "version": "1.0",
  "data": {
    "reporting": "學生填寫的內容...",
    "responding": "學生填寫的內容...",
    "relating": "",
    "reasoning": "",
    "reconstructing": ""
  }
}
```

### 2.3 AI 分析調整

Prompt 改為：只針對已填欄位給出深度回饋，對未填欄位提供「為什麼值得嘗試」的溫和引導（而非「此部分未完成」的負面標記）。

### 2.4 顯示層調整

- LogCard 預覽：只顯示已填的 R
- FiveRsReflectionDisplay：已填欄位正常展示，未填欄位不顯示（而非顯示紅色「未完成」）
- 完成度：改為「已填 n 個反思層次」而非「n/5 (xx%)」

## 3. 受影響檔案與改動範圍

| 檔案 | 改動內容 | 影響程度 |
|------|---------|---------|
| `sdl-frontend-main/src/utils/5RsUtils.js` | validate 改為至少 2 個；completeness 動態計算 | 大 |
| `sdl-frontend-main/src/components/FiveRsReflectionForm.jsx` | 驗證邏輯、進度條文案、AI 觸發條件、R 分組標籤 | 大 |
| `sdl-frontend-main/src/components/FiveRsReflectionDisplay.jsx` | 只顯示已填欄位、移除紅色未完成標記 | 大 |
| `sdl-frontend-main/src/components/reflection/LogCard.jsx` | 預覽只顯示已填的 R（已完成） | 小 |
| `sdl-frontend-main/src/pages/reflection/hooks/use5RsReflection.js` | 無需改動（已相容部分填寫） | 無 |
| `sdl-backend-main/controllers/llm_5R.js` | Prompt 改為動態處理已填/未填欄位 | 中 |
| `sdl-backend-main/controllers/export.js` | 匯出跳過空欄位（已相容） | 小 |
| DB models / API routes | **不需要改動** | 無 |

## 4. 向後相容性

- 既有「5 個全填」的反思資料 → 正常讀取顯示，不受影響
- 新的「部分填寫」資料 → 空欄位為空字串，parse/display 邏輯自動跳過
- JSON `version` 維持 `"1.0"`（結構未變，僅驗證規則放寬）

## 5. 實作順序

1. ~~**5RsUtils.js** — 修改驗證與完成度計算~~ ✅
2. ~~**FiveRsReflectionForm.jsx** — 表單 UI 與驗證邏輯~~ ✅
3. ~~**FiveRsReflectionDisplay.jsx** — 顯示層改為只顯示已填欄位~~ ✅
4. ~~**llm_5R.js（後端）** — AI Prompt 動態處理~~ ✅
5. ~~**Code Review**~~ ✅ — 修復 2 個 HIGH + 4 個 MEDIUM 問題
6. ~~**更新本文件狀態**~~ ✅
