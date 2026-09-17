# 未來清單 (Future List)

## 前言

這份文件是整個 SDL 專案的**未來工作中央帳本**。任何「目前刻意不做、但未來可能要做」的項目都進這裡，取代散落在各個 plan 文件末端的 backlog 段落。

**為什麼要有這份文件？**

- 先前各 plan 文件（如 `sdl-backend-main/docs/sdl-coach-project-context-plan.md`）都各自在「不在範圍」「backlog」章節寫延後項目，時間一久就散
- 跨模組的「以後再做」項目沒有統一入口，新成員看不到全貌
- 延後的理由（「為什麼現在不做」）與觸發條件（「什麼訊號出現才要做」）才是關鍵，缺了就變成無限延後
- 有這份帳本後，每次 standup/規劃時可以一起看、重估優先級

**使用規則**

1. 新增未來項目時**優先加到此檔**，不要再另外在 plan 文件裡開 backlog 章節；plan 文件最多用一行「詳見 `future-list.md` F00X」引用
2. 每個項目照下方欄位填寫；無法填寫的欄位明確寫「—」，不要跳過
3. 狀態變更時**保留舊狀態歷史**（在狀態欄位用「`backlog → scheduled (2026-05-01)`」格式）
4. 做完的項目**不要刪除**，狀態改為 `done` 並保留，未來回顧可以看到演進
5. ID 一旦指派就永久綁定，新項目遞增（F001, F002...）

---

## 欄位定義

| 欄位 | 必填 | 說明 |
|---|---|---|
| **ID** | ✅ | 全局唯一識別碼，格式 F###，遞增分配，**不重用** |
| **標題** | ✅ | 一句話描述項目 |
| **類別** | ✅ | Backend / Frontend / DevOps / Data / Education / Research / Security |
| **狀態** | ✅ | `backlog` / `evaluating` / `scheduled` / `done` / `dropped` |
| **優先級** | ✅ | `P0`（最高，若觸發條件成立立刻做）/ `P1` / `P2` / `P3`（最低，長期理想） |
| **建立日期** | ✅ | YYYY-MM-DD |
| **提案來源** | ✅ | 哪個 PR、commit、文件章節、對話中提出；有 audit 價值 |
| **為什麼現在不做** | ✅ | 刻意延後的原因（scope、ROI、技術 / 組織前置未就緒等）。這是**最核心的欄位**，避免重複討論「為什麼不做」 |
| **觸發條件** | ✅ | 什麼訊號出現才值得動手（量化指標、使用者抱怨、資料規模、外部事件）。沒有這條等於無限延後 |
| **怎麼做** | ✅ | 實作路徑草稿（可用 bullet 短列），不需鉅細靡遺但要讓接手者不用再從零開始想 |
| **估計工作量** | ✅ | `S`（<4 小時）/ `M`（0.5-1 天）/ `L`（>1 天，需拆成 PR）/ `XL`（需另開 spec） |
| **依賴 / 前置條件** | 選填 | 需要另一個項目先完成、DB migration、外部系統等 |
| **風險 / 副作用** | 選填 | 做了會影響什麼、回滾難度、有沒有不可逆操作 |
| **替代方案** | 選填 | 若不做此項、是否有輕量替代 |
| **相關檔案** | 選填 | 具體檔案路徑，讓查找起點明確 |

---

## 項目清單

### F001: SDL Coach 使用統計 API 與儀表板

- **類別**：Backend / Frontend
- **狀態**：`backlog`
- **優先級**：P2
- **建立日期**：2026-04-17
- **提案來源**：SDL Coach 50 題煙霧測試後、使用者詢問「audit metadata 可觀察性」
- **為什麼現在不做**：
  - SDL Coach 才剛上線（commit `140551d`），還沒有 production 真實流量
  - audit log 的原始 event 已經寫入（含 `truncated`, `answerChars`, `contextSource`, `snapshotChars`, `provider`），查詢 API (`GET /api/audit-client/events?action=SDL_COACH_ASK`) 也可用，只是沒有聚合端點
  - 此時做儀表板是**無資料可看**，價值低
- **觸發條件**（任一成立）：
  - 週對話量 > 500 筆（代表有足夠統計意義）
  - 教師/研究端明確要求看「截斷比例」「回答長度分布」「snapshot 注入覆蓋率」
  - 實際發生一次截斷相關的客訴（表示需要實時監控）
- **怎麼做**：
  1. 後端加 `GET /api/sdl-coach/stats?days=N` 端點，聚合：
     - `truncated` 比例、`answerChars` 的 p50/p95/p99
     - `contextSource` 分佈（snapshot / frontend / none）
     - 平均 `snapshotChars`、provider 分佈
  2. 教師頁加一張卡或獨立頁面顯示上述數字
  3. （選擇性）加 Grafana dashboard 並接 Prometheus metric
- **估計工作量**：`M`（小版本 API 約 30 分鐘，儀表板 2-4 小時）
- **依賴 / 前置條件**：audit_event 表要保留 metadata 完整性（目前 `auditService.clampMetadataSize` 會截斷 metadata 過大的 key，要確認 `truncated` 欄位不會被砍）
- **風險 / 副作用**：聚合 query 若 audit_event 資料量大會慢，需要索引 `(action, timestamp)`
- **替代方案**：短期用 `psql` 直連 DB 下 ad-hoc SQL 就夠
- **相關檔案**：`sdl-backend-main/controllers/sdlCoach.js`, `sdl-backend-main/routes/auditClient.js`

---

### F002: SDL Coach 反依賴守則

- **類別**：Education / Backend
- **狀態**：`backlog`
- **優先級**：P3
- **建立日期**：2026-04-17
- **提案來源**：`sdl-backend-main/docs/sdl-coach-project-context-plan.md` 第 13.1 節
- **為什麼現在不做**：
  - SDL 的目的是「學會自主決定下一步」，不是「學會問助手下一步」。給 LLM 越多脈絡，學生越容易依賴
  - 但要設計「連續 N 次依賴型問題就轉為反問」的門檻，需要先觀察真實學生使用 pattern 才知道 N 要設多少
  - 現在拍腦袋設 N=3，很可能誤傷真正需要幫助的學生
- **觸發條件**：
  - 有 50+ 學生連續使用 2 週以上，累積足夠 sdl_coach_messages 資料
  - 觀察到某些學生頻繁問「下一步」「怎麼辦」但不自己動腦
  - 老師反映學生對助手過度依賴
- **怎麼做**：
  1. 新增 sdl_coach_messages 行為分析：計算學生 session 內「依賴型問句」比例
  2. 當比例 > 閾值時，在 system prompt 動態加一條「此學生連續問了 N 次下一步，請主動反問『你自己覺得看板上哪張最久沒動？』」
  3. A/B test 驗證教育效果
- **估計工作量**：`L`（需要行為分析模組 + A/B test 基礎）
- **依賴 / 前置條件**：要有 sdl_coach_messages 歷史查詢機制（目前計畫第 12 節 sdl_coach_messages 歷史輪次是延後的）
- **風險 / 副作用**：判斷錯誤會讓學生覺得助手「冷漠」，反而削弱使用意願
- **替代方案**：無技術解法下，教師端觀察 + 人工提醒即可
- **相關檔案**：`sdl-backend-main/docs/sdl-coach-knowledge-base.md`

---

### F003: Submit 模板 / AI 生成內容偵測

- **類別**：Education / Data
- **狀態**：`backlog`
- **優先級**：P3
- **建立日期**：2026-04-17
- **提案來源**：SDL Coach v2 煙霧測試觀察 + `sdl-coach-project-context-plan.md` 第 13.2 節
- **為什麼現在不做**：
  - 高中科展文化常見「套用學長姊模板」、近期也有 AI 生成內容問題
  - 但偵測需要額外語料比對（學長姐範本庫、AI 生成特徵模型），投入成本高
  - 即使偵測到，處置方式也需要教育專業設計（標示？扣分？提醒學生？），不只是技術問題
- **觸發條件**：
  - 教師實際反映「學生 Submit 內容高度重複」
  - 看到多個 project 的 Submit 文字幾乎一模一樣
- **怎麼做**：
  1. 建立範本/過往 Submit 向量庫（可用 embedding）
  2. 新 Submit 入庫時做相似度檢索，高於閾值時 flag
  3. flag 結果不直接呈現給學生，先給教師 / 助手參考
- **估計工作量**：`XL`
- **依賴 / 前置條件**：embedding 服務、向量資料庫
- **風險 / 副作用**：偽陽性會冤枉學生；學生若知道被偵測會改寫方式對抗
- **替代方案**：目前 LLM 透過 knowledge-base 守則知道「學生提交可能有模板」，但不做懲罰性處置
- **相關檔案**：—

---

### F004: 想法牆 Node.owner 組員貢獻可視化

- **類別**：Frontend / Backend
- **狀態**：`backlog`
- **優先級**：P3
- **建立日期**：2026-04-17
- **提案來源**：`sdl-coach-project-context-plan.md` 第 13.3 節
- **為什麼現在不做**：
  - `models/node.js` 有 `owner` 欄位但目前 snapshot 只取 title，LLM 看不到是誰貼的
  - SDL Coach 當前設計（見 第 4.2 節「小組共用」）是把所有成員的 Submit 都當作共同產出，不強調個人貢獻落差
  - 做了「誰貢獻多」的可視化可能反而破壞合作氣氛
- **觸發條件**：
  - 教師明確需要看「組內貢獻均衡度」做分組管理
  - 出現組員搭便車抱怨且無處理機制
- **怎麼做**：
  1. snapshot formatter 加入 `owner` 資訊（需評估隱私影響）
  2. 前端想法牆加 filter/highlight by owner
  3. 教師端有 dashboard 顯示各組員貢獻分佈
- **估計工作量**：`M`
- **依賴 / 前置條件**：—
- **風險 / 副作用**：可能讓內向學生被「顯性落後」標籤，損害學習動機
- **替代方案**：教師透過觀察課堂互動即可，不必技術化
- **相關檔案**：`sdl-backend-main/models/node.js`, `sdl-backend-main/controllers/sdlCoach.js`

---

### F005: SDL Coach API rate limiting

- **類別**：Security / Backend
- **狀態**：`backlog`
- **優先級**：P1
- **建立日期**：2026-04-17
- **提案來源**：`sdl-coach-project-context-plan.md` 第 13.4 節、第二次 ultrareview G8
- **為什麼現在不做**：
  - 目前 `/api/sdl-coach/ask` 無速率限制，學生若濫用會打爆 LLM provider 額度（尤其 Gemini 雲端）
  - 屬於整個 SDL Coach 的**基礎建設**，應跟其他 LLM 端點（`rag_message`、`kb_coach` 等）一起做統一的 rate limit 中介層
  - 不應單獨為 sdlCoach 寫 rate limit 後再重構
- **觸發條件**（任一成立）：
  - 實際發生一次 LLM 額度濫用/爆噴事件
  - production 上線且有 > 100 活躍學生
  - 發現可疑自動化請求 pattern
- **怎麼做**：
  1. 新增 `middlewares/llmRateLimit.js`（可複用 express-rate-limit）
  2. 設定預設：每位 user 每分鐘 ≤10 次、每日 ≤200 次
  3. 套用到所有 LLM 相關 endpoint（sdl-coach, rag-message, kb-coach）
  4. 超限回 429 + `Retry-After` header
- **估計工作量**：`M`
- **依賴 / 前置條件**：無
- **風險 / 副作用**：閾值設太嚴會影響正常使用；Redis/記憶體存儲選擇需考慮多 instance 部署
- **替代方案**：先手動在 LLM provider 設定每日額度上限，出事再做
- **相關檔案**：`sdl-backend-main/routes/sdlCoach.js`, `sdl-backend-main/middlewares/`

---

### F006: 學生情緒訊號識別 → 導師通知

- **類別**：Education / Backend
- **狀態**：`backlog`
- **優先級**：P2
- **建立日期**：2026-04-17
- **提案來源**：`sdl-coach-project-context-plan.md` 第 13.5 節
- **為什麼現在不做**：
  - Submit 或 chat 訊息可能含情緒表達（「好煩」「不想做」）— 目前品質過篩會 skip 掉短於 3 字的內容
  - 但這些可能是**重要的心理健康訊號**，值得專門模組（可觸發輔導老師通知）
  - 屬於獨立功能領域（「助人求助偵測」），不應跟本計畫的 snapshot 設計混做
- **觸發條件**：
  - 學輔端明確表達需要
  - 有先例學生透過 SDL 平台文字透露壓力但未被察覺
- **怎麼做**：
  1. 獨立 `services/emotionDetection.js`（可用 sentiment API 或小型分類模型）
  2. 對 Submit / chat_message 新增時做輕量分類
  3. 高風險內容寫入 `help_seeking_log` 並通知導師
  4. 學生端不顯示判定結果（避免 stigma）
- **估計工作量**：`XL`
- **依賴 / 前置條件**：學輔流程定義清楚（誰收到通知、後續處理 SOP）
- **風險 / 副作用**：
  - 誤判會造成學生被不必要關切
  - 學生若知道被監測會改用隱語表達，反而更難察覺
  - 法規 / 家長同意
- **替代方案**：教師定期翻閱 SDL Coach 對話紀錄
- **相關檔案**：—

---

### F007: 中文姓名 PII redaction

- **類別**：Security / Data
- **狀態**：`backlog`
- **優先級**：P3
- **建立日期**：2026-04-17
- **提案來源**：`sdl-coach-project-context-plan.md` 第 13.6 節
- **為什麼現在不做**：
  - `controllers/sdlCoach.js` 的 `redactPII` 不處理中文姓名（沒有穩定 pattern）
  - 需要 NER 模型或組員名單比對，複雜度高
  - 目前靠 knowledge-base 第 13.2 節約束 LLM **不複誦姓名**，已足夠
- **觸發條件**：
  - 實際發生 LLM 回應複誦學生或他人姓名的客訴
  - 外部 LLM provider（Gemini）資料外洩事故
- **怎麼做**：
  1. 建立當前專案的組員姓名白名單
  2. redactPII 讀入白名單後做 exact match 替換（組員姓名不遮罩、非組員中文 3 字元連續才遮罩）
  3. 或接 NER 服務（如 CKIP tagger）
- **估計工作量**：`M`
- **依賴 / 前置條件**：組員姓名查詢必須快（每次 snapshot 都會跑）
- **風險 / 副作用**：組員姓名以外的合法中文名詞（如學者、地名）被誤遮
- **替代方案**：依賴 LLM system prompt 守則即可
- **相關檔案**：`sdl-backend-main/controllers/sdlCoach.js`（`redactPII`）

---

### F008: Sequelize 查詢 AbortController / PG statement_timeout

- **類別**：Backend / DevOps
- **狀態**：`backlog`
- **優先級**：P2
- **建立日期**：2026-04-17
- **提案來源**：SDL Coach controller code review #4
- **為什麼現在不做**：
  - 目前 `withTimeout(Promise.race, 2000ms)` reject 後，**DB query 仍在背景跑到回應**，佔用連線池
  - 在低流量時不會爆，但高並發（多位學生同時問）會 cascading 連線池滿
  - 屬於全系統基礎建設，需要統一做，不應單為 sdlCoach 改
- **觸發條件**：
  - 實際觀察到連線池耗盡 incident
  - audit log 發現 snapshot timeout 次數 > 1%
  - 升級到 Sequelize 7（原生支援 AbortController）
- **怎麼做**：
  - 方案 A：DB 層用 `SET LOCAL statement_timeout = 1800` 讓 PG 主動砍 query
  - 方案 B：升 Sequelize 7 後用 AbortController
  - 方案 C：query options 傳 `logging: false` + 加強連線池參數（治標）
- **估計工作量**：`L`
- **依賴 / 前置條件**：Sequelize 版本、PG 版本確認
- **風險 / 副作用**：statement_timeout 設太嚴可能砍到合法慢 query
- **替代方案**：目前的 Promise.race 在低流量下夠用
- **相關檔案**：`sdl-backend-main/controllers/sdlCoach.js`（`withTimeout`）

---

### F009: knowledge-base / snapshot context 自動壓縮

- **類別**：Backend
- **狀態**：`backlog`
- **優先級**：P3
- **建立日期**：2026-04-17
- **提案來源**：`sdl-coach-project-context-plan.md` 第 13.7 節
- **為什麼現在不做**：
  - 主力 provider Gemma-4-26B-A4B-it 有 **256K tokens** context window，目前 knowledge-base (~14K chars) + snapshot (~1.4K chars) + user prompt 綽綽有餘
  - 若未來 fallback 到更小模型（8K context），才會爆
- **觸發條件**：
  - LLM provider 切換到 context window < 32K 的模型
  - 實際回傳 context_length_exceeded 錯誤
- **怎麼做**：
  1. knowledge-base 做兩層：完整版 + 精簡版（僅核心守則 + 四階段摘要）
  2. 依 provider 選擇載入版本
  3. snapshot 的 `MAX_CONTEXT_LEN` 改成動態（依 provider context window）
- **估計工作量**：`M`
- **依賴 / 前置條件**：`llmGateway` 能告知當前 provider 的 context window
- **風險 / 副作用**：精簡版知識掌握度下降，LLM 回答品質降
- **替代方案**：不做；fallback 時直接回 500 讓使用者重試
- **相關檔案**：`sdl-backend-main/docs/sdl-coach-knowledge-base.md`, `sdl-backend-main/controllers/sdlCoach.js`

---

### F010: SDL Coach multi-turn（多輪對話）測試與守則遵守

- **類別**：Research / Backend
- **狀態**：`backlog`
- **優先級**：P2
- **建立日期**：2026-04-17
- **提案來源**：SDL Coach v3 煙霧測試報告觀察與分析
- **為什麼現在不做**：
  - 目前 50 題煙霧測試都是 **single-turn**（每題獨立）
  - 實際學生使用會多輪對話，但目前 session 無記憶（每輪從 0 開始想），守則遵守度在 multi-turn 下未驗證
  - 先確認 single-turn 達標，再擴展 multi-turn，循序較穩
- **觸發條件**：
  - single-turn 指標穩定後（truncated < 1%、平均字數 ≤ 320）
  - production 有實際 multi-turn 對話紀錄可分析
  - 發現 multi-turn 出現「越聊越偏離守則」的案例
- **怎麼做**：
  1. 擴充 `scripts/sdl-coach-smoke-50.js` 支援多輪
  2. 設計 10 組「3-5 輪連續對話」情境（學生逐步揭露問題、要求更細節等）
  3. 每輪評估守則遵守度、是否把前輪資訊編入 context
  4. 若要做 multi-turn 真實體驗，要引入 `sdl_coach_messages` 歷史回讀（目前計畫第 12 節是刻意延後的）
- **估計工作量**：`L`
- **依賴 / 前置條件**：sdl_coach_messages 歷史回讀機制（目前 backlog）
- **風險 / 副作用**：sdl_coach_messages 加入 context 後，context 長度增長快，可能觸發 F009 context 壓縮需求
- **替代方案**：定期跑 single-turn smoke test 作為回歸基線即可
- **相關檔案**：`sdl-backend-main/scripts/sdl-coach-smoke-50.js`, `sdl-backend-main/docs/sdl-coach-smoke-test-report.md`

---

### F011: SDL Coach snapshot 快取與 invalidation

- **類別**：Backend
- **狀態**：`dropped`（刻意不做）
- **優先級**：—
- **建立日期**：2026-04-17
- **提案來源**：`sdl-coach-project-context-plan.md` 第 12 節
- **為什麼現在不做**：
  - 計畫初衷就是「即時查詢、零快取」以避免「專案助理」當初的 invalidation 地獄
  - 實測 snapshot 建立 5-92ms，遠低於 100ms 目標，**沒有效能動機做快取**
  - 永久丟進 dropped 狀態；若未來真要做，再重新評估
- **觸發條件**：snapshot 建立耗時 p99 > 500ms 且無法用 DB 索引解決（目前不可能，寫在這裡作為紀錄）
- **怎麼做**：—
- **估計工作量**：—
- **相關檔案**：`sdl-backend-main/docs/sdl-coach-project-context-plan.md`（計畫第 12 節明確列為 ❌）

---

### F012: 串接 rag_message / Gemini Grounding 到 SDL Coach

- **類別**：Research / Backend
- **狀態**：`dropped`（刻意不做）
- **優先級**：—
- **建立日期**：2026-04-17
- **提案來源**：`sdl-coach-project-context-plan.md` 第 12 節
- **為什麼現在不做**：
  - SDL Coach 的定位是「學習方法論 / 探究鷹架」，rag_message 則是「查前人研究案例」—— 兩者互補不互通
  - 強行合併會讓 LLM 角色模糊，反而降低教育效果
  - 保持兩個獨立助手、學生自行切換
- **觸發條件**：教學端明確要求「一個助手解決所有問題」（但這本身就違反好的教育設計原則）
- **怎麼做**：—
- **估計工作量**：—
- **相關檔案**：`sdl-backend-main/docs/sdl-coach-project-context-plan.md`

---

### F013: 清理 submit.js 第 131-145 行的 legacy Idea_wall 建立死碼

- **類別**：Backend
- **狀態**：`backlog`
- **優先級**：P3
- **建立日期**：2026-04-17
- **提案來源**：`sdl-coach-project-context-plan.md` 第 12 節
- **為什麼現在不做**：
  - 屬於 submit 模組的重構，不在 SDL Coach PR 範圍
  - legacy 邏輯「每個子階段建一個 Idea_wall」已廢棄（實際只有一個 project-level Idea_wall）
  - 程式碼雖然 dead 但不會 break 任何東西，清理是 nice-to-have
- **觸發條件**：有人重構 submit 模組或發現該死碼在某條件下被意外執行
- **怎麼做**：
  1. 讀 `controllers/submit.js:131-145` 確認邏輯分支真的沒被呼叫
  2. 加 log 觀察一週看是否觸發
  3. 無觸發後刪除並補測試
- **估計工作量**：`S`
- **依賴 / 前置條件**：—
- **風險 / 副作用**：若誤判為 dead code 但實際有舊資料仰賴，會 break
- **替代方案**：保留，加 `@deprecated` 註解
- **相關檔案**：`sdl-backend-main/controllers/submit.js:131-145`

---

### F014: `chat_turns` 表名 rename 為 `sdl_coach_messages`

- **類別**：Backend / Data
- **狀態**：`backlog → done (2026-04-17)`
- **優先級**：—
- **建立日期**：2026-04-17
- **提案來源**：使用者詢問「chat_turn 表名稱不明確」
- **為什麼現在不做**：—（已完成）
- **觸發條件**：—
- **怎麼做**：
  1. migration `20260417000002-rename-chat-turns-to-sdl-coach-messages.js`（rename table / index / pkey / FK / sequence）
  2. model `chat_turn.js` → `sdl_coach_message.js`
  3. controller `chatTurns.js` → `sdlCoachMessages.js`（順便修正原 raw SQL 對 `session_id` 欄位名誤用 camelCase 的 bug）
  4. route import 同步更新
  5. 文件同步（future-list、plan、gaps）
- **估計工作量**：`S`（實測約 30 分鐘）
- **依賴 / 前置條件**：—
- **風險 / 副作用**：API URL `/api/projects/:projectId/chat*` 刻意保留不變，前端無需更動
- **相關檔案**：
  - `sdl-backend-main/migrations/20260417000002-rename-chat-turns-to-sdl-coach-messages.js`
  - `sdl-backend-main/models/sdl_coach_message.js`
  - `sdl-backend-main/controllers/sdlCoachMessages.js`
  - `sdl-backend-main/routes/project.js`

---

### F015: SDL Coach 科學術語 Tooltip / Glossary

- **類別**：Frontend / Education
- **狀態**：`backlog`
- **優先級**：P3
- **建立日期**：2026-04-20
- **提案來源**：多輪對話 + 認知師徒制 prompt 調整後的對話，使用者觀察 LLM 回應會出現「自變項 / 應變項 / 控制變因」等術語，高中生未必懂
- **為什麼現在不做**：
  - 已在 `controllers/sdlCoach.js` 的 system prompt 加了「使用術語首次在括號附口語注解」的規則，涵蓋主要 pain point
  - Tooltip 要做 glossary 維護 + 前端渲染掃描 + 詞義歧義處理（「假設」當名詞 vs 動詞），非小工程
  - 應先觀察 prompt 方案是否足以讓學生理解，再決定要不要追加 tooltip
- **觸發條件**（任一成立）：
  - 教師或學生反饋「看不懂某術語」超過 3 次
  - prompt 注解方案失效（LLM 忽略規則或注解太繁重）
  - 進入監評階段後出現較多統計詞彙（p 值、顯著差異、標準差）且學生明顯卡住
- **怎麼做**：
  1. 後端維護 glossary（`sdl-backend-main/docs/sdl-coach-glossary.json` 或 `glossary` DB table），每條含：`term`, `short_explanation`, `full_explanation`
  2. 提供 `GET /api/sdl-coach/glossary` 端點（cache-friendly，語料不常變）
  3. 前端 `MessageContent` 元件渲染 markdown 時 post-process，把命中詞彙替換成 `<span class="term" data-tooltip="...">詞</span>`
  4. 用 `@radix-ui/react-tooltip` 或 headlessui popover；mobile 要改 tap-to-show
  5. 限定白名單詞彙（不要所有專業詞彙都標注），避免對話滿是藍線字
- **估計工作量**：`M`（glossary + API ~2 小時，前端渲染與 tooltip UI ~4 小時）
- **依賴 / 前置條件**：
  - glossary 內容需科學教育專業審定
  - 前端 markdown 渲染管線（`MessageContent.jsx`）要能擴充 post-process hook
- **風險 / 副作用**：
  - 詞義歧義（「假設」當名詞還是動詞）誤標
  - 過多 tooltip 反而讓學生分心 / 閱讀負擔增加
  - 術語定義過時或不精確會誤導學生
- **替代方案**：
  - 繼續依賴 prompt 注解規則（目前方案），只在觸發條件達成後啟動本項
  - 退而求其次：在 SDL Coach 頁面側邊加一個「名詞小字典」按鈕，手動查詢
- **相關檔案**：
  - `sdl-backend-main/controllers/sdlCoach.js`（執行守則「科學方法論術語注解」那條）
  - `sdl-frontend-main/src/components/MessageContent.jsx`
  - `sdl-frontend-main/src/components/SdlCoachChat.jsx`

---

### F016: 看板拖曳改差量廣播

- **類別**：Backend / Frontend
- **狀態**：`backlog`
- **優先級**：P2
- **建立日期**：2026-09-02
- **提案來源**：`docs/reports/PERFORMANCE_REVIEW_2026-09-02.md` 第 B5 節（階段三項目）
- **為什麼現在不做**：
  - 2026-09-02 已把 `buildKanbanData` 的逐欄 N+1 改成單次查詢，一次拖曳的 DB 成本已從約 20 次 round-trip 降到個位數
  - 目前 `dragtaskItem` / `columnOrderUpdated` 廣播整張看板，前端 `useKanbanData.kanbanDragEvent` 以整板 JSON 比對做收斂；改差量要同時處理併發拖曳的順序衝突與 tempId 卡片，屬 socket 契約變更，需一起改前後端並做回歸
  - 專案房間人數為小組規模（6 人以內），整板 payload 約 20 KB，尚未成為瓶頸
- **觸發條件**（任一成立）：
  - 單一看板卡片數超過 100 張，或 socket 出站流量在課堂尖峰明顯上升
  - 學生回報拖曳後其他人畫面「跳動」或順序錯亂
- **怎麼做**：
  1. 後端 `taskHandler.handleTaskDrag` 改廣播 `{ taskId, fromColumnId, toColumnId, index, version }`，`columnHandler` 的欄位順序改廣播 `{ columnOrder }`
  2. 前端 `useKanbanData` 用 payload 就地搬移卡片；收到的 version 落後於本地時忽略，落後過多時退回整板 invalidate
  3. 保留整板事件一段時間作為 fallback，觀察一個學期再移除
- **估計工作量**：`M`
- **依賴 / 前置條件**：F7 已完成（socket listener 已整併到看板層）
- **風險 / 副作用**：併發拖曳收斂錯誤會造成各端順序不一致；需要保留「重新整理即正確」的退路
- **替代方案**：維持整板廣播，只在 payload 上做欄位瘦身
- **相關檔案**：`sdl-backend-main/sockets/handlers/taskHandler.js`、`sdl-backend-main/sockets/handlers/columnHandler.js`、`sdl-frontend-main/src/pages/Kanban/hooks/useKanbanData.js`

---

### F017: 學生／管理總覽的後端聚合端點

- **類別**：Backend / Frontend
- **狀態**：`backlog`
- **優先級**：P2
- **建立日期**：2026-09-02
- **提案來源**：`docs/reports/PERFORMANCE_REVIEW_2026-09-02.md` 第 F10 節
- **為什麼現在不做**：
  - 2026-09-02 已做短期止血：`StudentOverview` 只抓目前選定學期的專案、搬進 React Query（staleTime 5 分鐘）、每批 3 個專案並行；`ManagementOverview` 與 `useTeacherData` 改用既有的 `batch-project-users` 批次端點
  - 聚合端點需要重新定義總覽頁的資料契約（反思、聊天、活動、看板、想法牆、AI 互動七類），屬新 API 設計
- **觸發條件**（任一成立）：
  - 單一學生同學期專案數超過 5 個，總覽頁載入仍超過 3 秒
  - 教師端要求跨學期一次看全部專案
- **怎麼做**：
  1. 新增 `GET /api/overview/student?semester=` 一次回傳各專案的統計摘要（後端用 `IN (...) GROUP BY` 聚合，參考 `teacherOverviewController.getProjectsSummary`）
  2. 前端 `StudentOverview` 改吃摘要，明細（例如反思內容）改為展開時再抓
- **估計工作量**：`L`
- **依賴 / 前置條件**：—
- **風險 / 副作用**：總覽頁圖表（GrowthTrendChart 等）依賴明細資料，聚合後需確認欄位夠用
- **替代方案**：維持目前的分批與快取
- **相關檔案**：`sdl-frontend-main/src/pages/overview/StudentOverview.jsx`、`sdl-backend-main/controllers/teacherOverviewController.js`

---

### F018: 受保護圖片改 presigned URL 由瀏覽器原生快取

- **類別**：Backend / Frontend
- **狀態**：`backlog`
- **優先級**：P3
- **建立日期**：2026-09-02
- **提案來源**：`docs/reports/PERFORMANCE_REVIEW_2026-09-02.md` 第 F9 節
- **為什麼現在不做**：
  - 2026-09-02 已在 `AuthImage` 加模組層快取（同路徑共用 blob 與 in-flight 請求、引用計數延遲釋放），後端 `/api/file/image` 改 streaming、支援 `If-None-Match` 回 304、Cache-Control 改 `private`
  - presigned URL 需讓瀏覽器直連 MinIO，目前 MinIO 9000 只綁 loopback、對外一律經 nginx 與後端代理（見 `deploy/docker-compose.server.yml`），要先決定是否開放對外路徑
- **觸發條件**（任一成立）：
  - 圖片流量成為 API 容器 CPU 或連線數的主要來源
  - 決定讓 MinIO 經 nginx 對外提供唯讀路徑
- **怎麼做**：
  1. nginx 加 `/files/` 反代到 MinIO，後端 `/api/file/image/:name` 改回 302 到 presigned URL（`getPresignedDownloadUrl` 已存在）
  2. `AuthImage` 對 302 目標直接用 `<img src>`，移除 blob 快取
- **估計工作量**：`M`
- **依賴 / 前置條件**：MinIO 對外路徑與 Cloudflare 快取策略決策
- **風險 / 副作用**：presigned URL 有效期內可被轉傳；需評估教育資料的分享風險
- **替代方案**：維持後端代理 + 瀏覽器 304 條件請求
- **相關檔案**：`sdl-backend-main/routes/file.js`、`sdl-frontend-main/src/components/AuthImage.jsx`

---

### F019: 反思紀錄的 legacy fileData BLOB 欄位下線

- **類別**：Backend / Data
- **狀態**：`backlog`
- **優先級**：P3
- **建立日期**：2026-09-02
- **提案來源**：`docs/reports/PERFORMANCE_REVIEW_2026-09-02.md` 第 B9 節（`services/dailyService.js` 老師視角撈全班反思）
- **為什麼現在不做**：
  - `submits` 的列表查詢已排除 `fileData`；但 `daily_personals` / `daily_teams` 的 `fileData` 仍被前端當作舊資料的 fallback（`FiveRsReflectionForm.jsx`、`DailyFormFields.jsx` 在沒有 `fileName` 時讀 `fileData`），列表查詢若排除會讓舊紀錄的附件消失
  - 需要先把仍存在 BLOB 的舊紀錄搬到 MinIO 並補上 `fileName`，才能安全排除該欄位
- **觸發條件**（任一成立）：
  - 老師視角反思列表回應超過 2 秒
  - 決定做一次歷史附件遷移（可併入 `docs/proposals/BACKUP_AND_STORAGE_PLAN.md`）
- **怎麼做**：
  1. 一次性腳本：把 `fileData IS NOT NULL AND fileName IS NULL` 的紀錄寫入 MinIO 並回填 `fileName` / `fileUrl`
  2. 前端移除 `fileData` fallback
  3. `dailyService.getDailies` 加 `attributes: { exclude: ['fileData'] }`，並依老師視角加分頁
- **估計工作量**：`M`
- **依賴 / 前置條件**：MinIO 備份策略（`docs/proposals/BACKUP_AND_STORAGE_PLAN.md`）
- **風險 / 副作用**：遷移腳本需可重跑；遷移期間新舊路徑並存
- **替代方案**：維持現狀
- **相關檔案**：`sdl-backend-main/services/dailyService.js`、`sdl-frontend-main/src/components/FiveRsReflectionForm.jsx`、`sdl-frontend-main/src/pages/reflection/components/DailyFormFields.jsx`

---

### F020: JWT claim 失效機制（roleChangedAt / token 版本）

- **類別**：Backend / Auth
- **狀態**：`backlog`
- **優先級**：P2
- **建立日期**：2026-09-03
- **提案來源**：2026-09-03 資安止血項 code review（admin 變更角色端點 H3）
- **為什麼現在不做**：
  - 止血版已讓 `requireAdmin` 一律查 DB，admin 端點不再信任 JWT 內的 role；但其他以 `req.user.role` 判斷 teacher 的路徑（`checkProjectOwnerOrTeacher`、teacherAgent、auditClient 等）在 access token 到期前（預設 24 小時）仍沿用舊角色
  - 全面改成每次查 DB 會影響高頻端點效能，需要一個「claim 版本」機制而非逐點修補
- **觸發條件**（任一成立）：
  - 出現需要即時撤銷教師權限的事件（帳號誤開通、離職）
  - 縮短 `JWT_EXPIRES_IN` 到 1 小時以下仍不滿足需求
- **怎麼做**：
  1. `users` 加 `role_changed_at`（或整數 `token_version`），變更角色／重設密碼時更新
  2. `validateToken` 以 `me:` 快取查該欄位，JWT 的 `iat` 早於 `role_changed_at` 即回 401 `TOKEN_STALE`，前端走既有 refresh 流程重新簽發
  3. 簽 token 時把 `token_version` 放進 payload，比對不符即拒絕
- **估計工作量**：`S`
- **依賴 / 前置條件**：無
- **風險 / 副作用**：所有使用者在上線當下需重新登入一次；`me:` 快取 TTL（60 秒）內仍有短暫延遲
- **替代方案**：把 `JWT_EXPIRES_IN` 縮到 15 分鐘並依賴 refresh rotation
- **相關檔案**：`sdl-backend-main/middlewares/AuthMiddleware.js`、`sdl-backend-main/middlewares/requireAdmin.js`、`sdl-backend-main/controllers/adminController.js`、`sdl-backend-main/config/index.js`

---

### F021: teacher 存取範圍收斂為 project.mentorId 綁定

- **類別**：Security / Backend
- **狀態**：`backlog → done (2026-09-05)`
- **優先級**：P2
- **建立日期**：2026-09-03
- **提案來源**：2026-09-03 資安審查 High 項「teacher 角色權限過寬」；IDOR 修復時刻意維持現況。2026-09-05 使用者確認產品規則就是「老師只能看自己是指導老師的專案」，前端清單雖然只列自己的專案，但伺服器端沒有擋
- **為什麼現在不做**：—（已完成）
- **觸發條件**：—
- **怎麼做**（實際做法）：
  1. 生產 DB 盤點：151 個專案只有第 26 號（114-1 普202 第六組）缺 `mentorId`，經使用者確認補為 id 5；`mentorId` 指向不存在或非教師帳號的專案 0 個、`mentorId` 與 `mentor` 名字欄位不一致 0 個。教師以成員身分加入但不是 mentor 的情況只有 3 個 114-2 測試專案，多對多關聯不需要
  2. `getProjectAccess` 移除 teacher 全放行分支，教師只在 `project.mentorId` 指向自己的專案算 `mentor`；沒有做 feature flag，回退方式是 revert 該 commit 重新部署
  3. 新增 `isAdmin`、`getMentoredProjectIds`、`isMentorOfStudent`、`requireProjectMentor`；`isTeacherOrAdmin` 只剩「教師身分」語意（欄位可見度、發言者標籤），跨專案的全域範圍一律改用 `isAdmin`
  4. 改走同一判定的地方：`checkProjectOwnerOrTeacher`、檔案讀取／刪除、公告查詢／建立／刪除／socket 廣播、問答室、KB Coach 歷史與回饋統計、求助統計、稽核事件歸屬與查詢、依老師名稱列專案／列學期、批次觀摩設定、專案列表 `userId` 參數、專案成員清單（單筆／批次）
  5. teacher-agent 三條路由與 kb-coach orchestrator 手動觸發加 `requireProjectMentor`
  6. 回歸測試 `tests/integration/teacherScope.test.js`（36 案例），既有四個測試檔的教師斷言同步更新
- **估計工作量**：`M`
- **依賴 / 前置條件**：`projects.mentorId` 資料完整（已達成）
- **風險 / 副作用**：教師開啟非自己指導的專案會拿到 403（原本就是，`checkProjectViewingPermission` 一直只認 mentor）；公告總覽不再看到其他老師專案的公告
- **相關檔案**：`sdl-backend-main/middlewares/projectAccess.js`、`sdl-backend-main/middlewares/projectViewingMiddleware.js`、`sdl-backend-main/routes/teacherAgent.js`、`sdl-backend-main/routes/auditClient.js`、`sdl-backend-main/tests/integration/teacherScope.test.js`

---

### F022: tasks 附件正規化，消除檔案授權的 unnest 全表掃描

- **類別**：Backend / Performance
- **狀態**：`backlog`
- **優先級**：P3
- **建立日期**：2026-09-03
- **提案來源**：2026-09-03 IDOR 修復（`utils/fileAccess.js`）code review W1：`tasks.files`（jsonb[]）與 `tasks.images`（text[]）只能 `unnest` 展開後比對，索引幫不上忙
- **為什麼現在不做**：
  - 其餘五張表的 `fileName` 已在 `20260903000001-add-file-name-indexes.js` 加索引，且「檔案 → 歸屬」結果以 fileName 為 key 快取 600 秒，目前資料量下 tasks 的掃描成本可接受
  - 把陣列欄位拆成獨立附件表牽涉看板 socket 事件的 payload 與前端 `useFileManagement`，屬結構性重構，與 F019（反思 BLOB 下線）同類
- **觸發條件**（任一成立）：
  - DB 慢查詢紀錄出現 `unnest(t.files)` / `unnest(t.images)` 的 seq scan，或 `GET /api/file/image` p95 明顯上升
  - 動到 F019 或看板附件模型時一併處理
- **怎麼做**：
  1. 新增 `task_attachments(taskId, fileName, kind, originalName, size, mimeType)`，`fileName` 加索引
  2. 卡片儲存時同步寫入；migration 回填既有 `tasks.files` / `tasks.images`
  3. `resolveFileScope` 改查 `task_attachments`，並把六次查詢合併成一條 UNION ALL
  4. 前端仍以 `tasks.files` / `images` 為介面時，由後端組裝，逐步下線陣列欄位
- **估計工作量**：`M`
- **依賴 / 前置條件**：F019 的方向確認
- **風險 / 副作用**：回填期間新舊兩套並存，需雙寫一段時間
- **替代方案**：維持現狀，靠快取吸收
- **相關檔案**：`sdl-backend-main/utils/fileAccess.js`、`sdl-backend-main/models/task.js`、`sdl-backend-main/sockets/handlers/taskHandler.js`、`sdl-frontend-main/src/pages/Kanban/components/carditem/hooks/useFileManagement.js`

### F023: 前端 CSP 由 Report-Only 轉為正式強制

- **類別**：Security / Frontend / Deploy
- **狀態**：`backlog`
- **優先級**：P2
- **建立日期**：2026-09-05
- **提案來源**：2026-09-03 資安審查 High 項「前端 token 存 localStorage 且 nginx 全站無安全標頭」；2026-09-05 已在 `nginx.conf` 對前端頁面加上 nosniff / X-Frame-Options / Referrer-Policy / Permissions-Policy / HSTS，CSP 則只以 `Content-Security-Policy-Report-Only` 送出，違規由 `POST /api/csp-report`（`routes/cspReport.js`）寫進 API 日誌
- **為什麼現在不做**：
  - 本機建置產物掃描：`html2pdf`、`socket.io`、`recharts`、`vis-network` 四個 chunk 含 `Function("return this")` 全域偵測，`sweetalert2` 含 `new Function(`，`index.es` chunk 含 `eval(`。沒有 `'unsafe-eval'` 直接強制 `script-src 'self'` 可能讓這些模組初始化失敗，需要真實流量回報確認哪些是實際執行路徑
  - 學習歷程匯出（`StudentPortfolio`）與教師儀錶板列印（`QuickActions`）用 `document.write` 寫入 about:blank iframe／視窗，會繼承頁面 CSP，需要確認 Google Fonts 與 inline style 的規則足夠
- **觸發條件**（任一成立）：
  - 上線 Report-Only 兩週後，`docker compose logs api | grep '\[csp\]'` 的回報只剩已知且可接受的來源
  - 再次發生前端 XSS 類漏洞
- **怎麼做**：
  1. 彙整回報中的 `effectiveDirective` / `blockedUri`，逐一決定是放寬規則還是修程式（例如把需要 eval 的套件換掉或升級）
  2. 若 `script-src` 仍需 `'unsafe-eval'`，優先評估以 `'wasm-unsafe-eval'` 或套件升級替代，最後才放寬
  3. `nginx.conf` 的 `$csp_report_only` 改名為正式 policy，`add_header Content-Security-Policy ... always;`，保留 `report-uri` 持續監看
  4. scp 到伺服器 `~/SDLs_fullStack_remix/nginx.conf` 後 `docker compose exec nginx nginx -t && docker compose exec nginx nginx -s reload`，用 Chrome 逐頁確認 console 無 CSP 錯誤
- **相關檔案**：`nginx.conf`、`sdl-backend-main/routes/cspReport.js`、`sdl-frontend-main/src/pages/StudentPortfolio/index.jsx`、`sdl-frontend-main/src/pages/teacher-dashboard/components/QuickActions.jsx`

---

### F024: 專案範圍以外的列舉面：socket 房間加入與班級清單端點未做授權

- **類別**：Security / Backend
- **狀態**：`backlog`
- **優先級**：P2
- **建立日期**：2026-09-05
- **提案來源**：F021 教師範圍收斂時盤點發現；HTTP 端點已全面走 `getProjectAccess`，但下列兩處仍是任何登入者都能碰
- **為什麼現在不做**：
  - `join_project`／`join_room`／`join_ideawall` 三個 socket 事件直接 `socket.join`，沒有驗證呼叫者對該專案／看板的存取權，任何登入者知道 id 就能收到該專案的即時事件（看板、想法牆、公告）。修法要在 handler 加 `canAccessProject(allowViewer: true)`，並確認觀摩者、指導教師與 socket 重連流程不受影響，需要在 dev 環境用真實前端驗證，不適合跟 F021 一起推
  - `GET /api/projects/classes/list` 與 `GET /api/projects/classes/:className/users-projects` 任何登入者都能列出某班的學生與專案名稱；觀摩設定頁需要它，收斂成教師／admin 前要先確認學生端沒有用到
- **觸發條件**（任一成立）：
  - 下一輪資安審查
  - 平台跨校使用
- **怎麼做**：
  1. `sockets/handlers/messageHandler.js` 的 `handleJoinProject` 加 `canAccessProject(socket.user.id, projectId, { allowViewer: true })`，不符則 emit 錯誤且不 join；`join_ideawall` 先由 ideaWallId 反查 projectId 再判定；`join_room` 依 roomId 的型別（聊天室／問答室）反查
  2. `socketHandlers.js` 的 `broadcastToProject` 自動 join 的路徑同樣過一次判定
  3. 班級清單兩個端點加 `checkTeacherRole`（或 admin）；學生端若有使用改走自己所屬專案的資料
  4. 回歸測試補「非成員 join → 拒絕」
- **估計工作量**：`S`
- **相關檔案**：`sdl-backend-main/sockets/handlers/messageHandler.js`、`sdl-backend-main/sockets/socketHandlers.js`、`sdl-backend-main/controllers/project/projectViewingController.js`、`sdl-backend-main/routes/project.js`

---

### F025: 通知系統統一為單一套件，Toaster 掛到根層

- **類別**：Frontend
- **狀態**：`backlog`
- **優先級**：P2
- **建立日期**：2026-09-17
- **提案來源**：`/improve-animations` 動畫稽核（`plans/README.md`）；`/pick-ui-library` skill 的「toast 用 Sonner」建議
- **為什麼現在不做**：
  - 目前三套通知並存：react-hot-toast（93 次呼叫，`<Toaster />` 分散掛在 6 個頁面）、sweetalert2（81 次，多為確認對話框）、`QuickActions.jsx` 自製內聯 keyframes toast。react-hot-toast 預設進場 `scale(.6)` 且是不可中斷的 keyframes，新 toast 堆疊時既有 toast 位移會從頭重播
  - 替換觸及 170 餘處呼叫與多個頁面，屬 L 級改動，且 sweetalert2 的「確認 / 取消」用法不是 toast，需先決定是否一併換成 base-ui 之類的 dialog
- **觸發條件**（任一成立）：
  - 下一次大規模 UI 收尾或設計系統升版
  - 使用者回報通知重疊、閃爍或跑到 Modal 後面
- **怎麼做**：
  1. 短期止血：`react-hot-toast` 的 `<Toaster />` 移到 `App.jsx` 根層一份，並用 `toastOptions` 覆寫進場 scale 為 0.95、時長 200ms
  2. 中期：以 Sonner 取代 react-hot-toast，依 `/ask-sonner` skill 設定 `<Toaster richColors position="top-right" />`；sweetalert2 只保留確認對話框用途或改 base-ui Dialog
  3. 移除 `QuickActions.jsx` 自製 toast，改呼叫統一 API
- **估計工作量**：`L`
- **風險 / 副作用**：toast 樣式與位置全站改變；需回歸測試每個呼叫點的成功 / 錯誤路徑
- **相關檔案**：`sdl-frontend-main/src/App.jsx`、`sdl-frontend-main/src/pages/teacher-dashboard/components/QuickActions.jsx`、所有 `import toast from 'react-hot-toast'` 的檔案

---

### F026: 全站可按壓元件缺少按壓回饋

- **類別**：Frontend
- **狀態**：`backlog`
- **優先級**：P3
- **建立日期**：2026-09-17
- **提案來源**：`/improve-animations` 動畫稽核（`plans/README.md`）
- **為什麼現在不做**：
  - `grep ":active" src` 只有 2 處（其中 1 處只是游標樣式），framer `whileTap` 只出現在死碼。這不是單點缺陷而是系統性缺席，正確做法是在共用元件層（按鈕、卡片、NavItem）統一加，而非逐處補
  - 專案沒有共用 Button 元件，各頁面自己寫 `<button className=...>`，先做元件抽取才有地方放
- **觸發條件**（任一成立）：
  - 抽出共用 Button / Card 元件時
  - 手機端使用者回報「按了沒反應」
- **怎麼做**：
  1. 在 `tailwind.config.cjs` 的 `plugins` 加一個 `pressable` utility：`active:scale-[0.97] transition-transform duration-fast ease-out`（`DESIGN_SYSTEM.md` 只禁 hover 用 scale，`:active` 不衝突）
  2. 套到 `SideBar.jsx` NavItem、`ProjectCard.jsx`、Kanban `CarditemRefactored.jsx`、`TopBar.jsx` 下拉選項、各頁主要 CTA
  3. `DESIGN_SYSTEM.md`「互動狀態」節補「按壓回饋」規範（scale 0.95 到 0.98、100 到 160ms）
- **估計工作量**：`M`
- **相關檔案**：`sdl-frontend-main/tailwind.config.cjs`、`sdl-frontend-main/DESIGN_SYSTEM.md`、`sdl-frontend-main/src/components/SideBar.jsx`

---

### F027: 進度條與手風琴改用 transform / grid-rows，並統一進度條時長

- **類別**：Frontend
- **狀態**：`backlog`
- **優先級**：P3
- **建立日期**：2026-09-17
- **提案來源**：`/improve-animations` 動畫稽核（`plans/README.md`）；`plans/003` 只修 class 無效問題，layout 屬性動畫留此
- **為什麼現在不做**：
  - 進度條有 12 處以上用 `transition-all` 搭配 inline `width: X%`，時長 500 / 700 / 1000ms 三種並存，都超過 300ms 預算；改成 `scaleX` 需要把圓角與漸層背景的視覺處理一併調整（scaleX 會壓扁圓角）
  - `ProjectSection.jsx` 與 `ManagementOverview.jsx` 手風琴以像素 height 過渡，改 `grid-template-rows: 0fr / 1fr` 要動 DOM 結構並移除 rAF 量測
  - `FiveRsReflectionForm.jsx`、`FiveRsReflectionDisplay.jsx` 的 framer `height: 'auto'` 展開同理
- **觸發條件**（任一成立）：
  - dashboard 一次渲染數十條進度條時出現可感知的掉幀
  - 抽出共用 ProgressBar 元件時
- **怎麼做**：
  1. 抽 `ProgressBar` 元件：外層 `overflow-hidden rounded-full`，內層 `origin-left transition-transform duration-normal ease-out` 用 `style={{ transform: \`scaleX(${pct / 100})\` }}`
  2. 手風琴改 grid-rows 兩層結構，移除 `useEffect` + rAF 的 scrollHeight 量測
  3. framer `height: 'auto'` 的三處改用同一 grid-rows 模式或 `AnimatePresence` + `layout`
- **估計工作量**：`M`
- **相關檔案**：`sdl-frontend-main/src/pages/student-dashboard/components/PersonalData.jsx`、`LearningGoals.jsx`、`Achievements.jsx`、`HelpSeekingAwareness.jsx`、`sdl-frontend-main/src/pages/overview/ManagementOverview.jsx`、`sdl-frontend-main/src/pages/home/components/ProjectSection.jsx`、`sdl-frontend-main/src/components/FiveRsReflectionForm.jsx`

---

### F028: Kanban 樂觀新增卡片在 temp id 換真 id 時重掛閃動

- **類別**：Frontend
- **狀態**：`backlog`
- **優先級**：P2
- **建立日期**：2026-09-17
- **提案來源**：`/improve-animations` 動畫稽核「錯失機會」類別（`plans/README.md`）；與 `CLAUDE.md` 已知地雷「React Query 與 vis-network ID 同步」同源
- **為什麼現在不做**：
  - `KanbanColumn.jsx:84` 的 `key={item.id.toString()}`，`useKanbanData.js:301` 樂觀插入 `temp-${Date.now()}`，伺服器回傳真實 id 後 key 改變，React 卸載再重掛同一張卡，使用者看到「出現、消失、再出現」；且卡片沒有 mount 動畫，也沒有「暫存中」的視覺訊號
  - 修法需要一個穩定的 client key（例如 `clientId` 欄位在整個生命週期不變），牽涉樂觀更新、socket 廣播與 React Query 快取三層的資料形狀，需獨立驗證
- **觸發條件**（任一成立）：
  - 使用者回報新增卡片閃一下
  - 重構 Kanban 樂觀更新流程時
- **怎麼做**：
  1. 樂觀物件加 `clientId: nanoid()`，`confirmCreate` 替換 id 時保留 `clientId`；`key` 改用 `item.clientId ?? item.id`
  2. `CarditemRefactored.jsx` 依 `id` 前綴 `temp-` 顯示半透明或細邊框的「送出中」狀態
  3. 卡片 mount 加 `animate-fade-in`（計畫 004 統一後的 200ms 版本）
- **估計工作量**：`M`
- **依賴 / 前置條件**：`plans/004` 完成（fade-in 單一定義）
- **相關檔案**：`sdl-frontend-main/src/pages/Kanban/hooks/useKanbanData.js`、`sdl-frontend-main/src/pages/Kanban/components/KanbanColumn.jsx`、`sdl-frontend-main/src/pages/Kanban/components/carditem/CarditemRefactored.jsx`

---

### F029: 錯失的狀態轉場：階段列切換、骨架換內容、Onboarding 進場、活動串流 stagger

- **類別**：Frontend
- **狀態**：`backlog`
- **優先級**：P3
- **建立日期**：2026-09-17
- **提案來源**：`/improve-animations` 動畫稽核「錯失機會」類別（`plans/README.md`）
- **為什麼現在不做**：
  - 這四項都是「該動但沒動」的加法，不是修錯；依克制原則先把現有錯誤（`plans/001` 到 `007`）修完，再評估加法是否真的提升體驗
  - 各項具體接縫：`SubStageBar.jsx:275-280` 目前階段 pill 的底色寫在 inline style 且無 `transition-colors`，階段推進時 0ms 互換，這是 SDL 流程最核心的狀態指示器；`teacher-dashboard/index.jsx:104-114` 與 `KnowledgeGraphView.jsx:471` 的 `loading` early return 讓骨架與內容不共用容器，pulse 在隨機相位被硬切；`KanbanOnboarding.jsx:51`、`IdeaWallOnboarding.jsx:51` 是每專案只看一次的 overlay，卻連 backdrop 淡入都沒有；`ActivityItem.jsx` 有 `index` prop 卻沒用於 stagger，整份列表同時落下
- **觸發條件**（任一成立）：
  - `plans/001` 到 `007` 全部完成後的下一輪動畫檢視
  - 使用者回報「階段推進了但沒感覺」
- **怎麼做**：
  1. SubStageBar pill 加 `transition-colors duration-normal`（底色改用 class 或保留 inline 皆可）
  2. 骨架與內容改為同一容器內的 opacity crossfade（`AnimatePresence mode="wait"` 或 CSS `@starting-style`）
  3. Onboarding overlay：backdrop `opacity` 200ms、卡片 `scale 0.95 → 1` 250ms ease-out
  4. ActivityItem `transition={{ delay: Math.min(index, 8) * 0.04 }}`，上限避免長列表尾端延遲過久；同時把 `y: -20` 簡寫改 transform 字串
- **估計工作量**：`M`
- **依賴 / 前置條件**：`plans/002`（reduced-motion 防線）與 `plans/004`（easing token）
- **相關檔案**：`sdl-frontend-main/src/components/SubStageBar.jsx`、`sdl-frontend-main/src/pages/teacher-dashboard/index.jsx`、`sdl-frontend-main/src/pages/Kanban/components/KanbanOnboarding.jsx`、`sdl-frontend-main/src/components/ActivityStream/components/ActivityItem.jsx`

---

### F030: 手機側欄改抽屜式導覽，底部階段列改可橫向捲動

- **類別**：Frontend
- **狀態**：`backlog → done (2026-09-17)`
- **優先級**：P2
- **建立日期**：2026-09-17
- **提案來源**：2026-09-17 用學生帳號在 390px 寬度實測（`plans/README.md` 第二批）
- **為什麼現在不做**：—（已完成，commit 670bc20，計畫 `plans/013`）
- **觸發條件**：—
- **怎麼做**（實際做法）：
  1. 新增 `hooks/useMediaQuery.js`；`SideBar` 在 md 以下改為 `fixed` 抽屜（256px、遮罩、Escape / 遮罩 / 點連結關閉、開啟時焦點進第一個連結、關閉時 `invisible` 離開 Tab 順序），手機一律展開顯示文字；md 以上維持原本的靜態收合欄與行為
  2. `TopBar` 專案頁在 md 以下加漢堡鈕（只有 `ProjectLayout` 傳入 `onOpenMobileNav` 才顯示，首頁 / 總覽頁不受影響）
  3. `SubStageBar` 把 `overflow-x-auto` 移到 pill 容器，加 `snap-x` 與 `scrollIntoView` 自動捲到目前子階段（尊重 reduced motion），機器人圖示固定不被擠掉
  4. 順手完成 F032 第 4、5 項：`ProjectLayout` 加「跳至主內容」連結、`SideBar` 目前項 `aria-current="page"` 與綠色粗體
- **估計工作量**：`M`
- **相關檔案**：`sdl-frontend-main/src/components/SideBar.jsx`、`sdl-frontend-main/src/layouts/ProjectLayout.jsx`、`sdl-frontend-main/src/components/TopBar.jsx`、`sdl-frontend-main/src/components/SubStageBar.jsx`

---

### F031: UI 收尾雜項（AI 助手定位、刪除鈕降級、alert 統一、emoji、文案）

- **類別**：Frontend
- **狀態**：`backlog → done (2026-09-17)`
- **優先級**：P2
- **建立日期**：2026-09-17
- **提案來源**：2026-09-17 靜態稽核（`redesign-existing-projects` 清單）與實測
- **為什麼現在不做**：—（已完成，commit 670bc20，計畫 `plans/014`）
- **觸發條件**：—
- **怎麼做**（實際做法）：
  1. AI 助手泡泡：手機 FAB 與泡泡改為緊貼底部階段列上方並含 safe-area；使用者關過一次後不再每 10 秒重現；`Kanban.jsx` 傳 `suppressMessage={showOnboarding}` 讓導覽期間不顯示
  2. Kanban 刪除欄位鈕改 hover / focus-visible 才出現（觸控裝置半透明常駐），確認對話框本來就是 Swal，文案改「刪除欄位」
  3. 新增 `utils/dialogs.js`（`confirmDialog` / `alertError` / `alertInfo`），10 處 `window.alert` / `confirm` 全部改走
  4. 約 30 處 UI emoji 換 `react-icons/fi`（歷程模板、TemplateSelector、QuickActions 通知改 type 驅動圖示、`✓` / `✕` 字元）；`<option>` 內的 `★` 改「（推薦）」後綴
  5. 學習狀態提醒標題列 `flex-wrap` + `whitespace-nowrap`
  6. 404 頁改繁中，`<Link>` 直接當按鈕
  7. 約 25 處成功訊息去驚嘆號、錯誤頁「糟糕」改「頁面發生錯誤」、反思與任務空狀態文案改直述
  8. `ChatRoom` 頭像補 `alt`
  9. `scrollbar-hidden` 確認為無效 class 且頁面捲軸本來就可見，決定保留捲軸、只刪掉該 class
- **估計工作量**：`M`
- **相關檔案**：見各項

---

### F032: 共用 Button / Overlay 元件、全域 focus ring、skip-to-content、導覽 aria-current

- **類別**：Frontend
- **狀態**：`backlog → done (2026-09-17)`
- **優先級**：P3
- **建立日期**：2026-09-17
- **提案來源**：2026-09-17 靜態稽核：主要按鈕至少 8 種 className 寫法、15 處在 Modal 之外自畫 `fixed inset-0` 遮罩、495 個 `<button>` 無 focus 樣式、`focus-visible:` 僅 1 處、無 skip link、SideBar 目前頁只靠 20% 底色且無 `aria-current`
- **為什麼現在不做**：—（已完成，計畫 `plans/016`；第 4、5 項隨 `plans/013` 在 commit 670bc20 完成）
- **觸發條件**：—
- **怎麼做**（實際做法）：
  1. 新增 `components/ui/Button.jsx`（primary / secondary / danger / ghost 四種 variant、sm / md / lg 三種 size，內建 `focus-visible` ring 與 `active:scale-[0.97]`）；先採用在 GlobalErrorBoundary、HelpSeekingView 錯誤態、Kanban 與想法牆導覽主按鈕，全站逐頁替換登錄為 F036
  2. 新增 `components/ui/Overlay.jsx`（portal 到 body、Escape 與點遮罩關閉、開啟時焦點進面板、`stacked` / `align="bottom"`），11 處自畫 `fixed inset-0` 對話框遮罩全部改走（其中 `ProjectViewingSettings.jsx` 經 review 發現是 import 路徑壞掉的零引用死檔，直接刪除）；表單類對話框（範例任務、樣板欄位、觀摩設定兩處）傳 `closeOnBackdrop={false}` 保留原本「點遮罩不關」的行為；導覽、聊天遮罩、點擊外部關閉層依計畫不動
  3. `index.css` 在 `@layer base` 加全域 `:focus-visible` 綠色 outline（放 base 層讓既有 `focus:outline-none` + `focus:ring` 能覆寫）；`Profile.jsx` 兩處裸 `focus:outline-none` 補 ring；另外 9 個檔有 `focus:ring-*` 但沒有 `focus:outline-none`，會同時出現 outline 與 ring，一併補上
  4. `ProjectLayout` 加「跳至主內容」連結（`plans/013`）
  5. `SideBar` 目前項 `aria-current="page"` 與綠色粗體（`plans/013`）
- **估計工作量**：`L`
- **相關檔案**：`sdl-frontend-main/src/components/`、`sdl-frontend-main/src/index.css`、`sdl-frontend-main/src/layouts/ProjectLayout.jsx`

---

### F033: 合併 authUtils / userUtils，統一日期格式化到 date-fns

- **類別**：Frontend
- **狀態**：`backlog → done (2026-09-17)`
- **優先級**：P3
- **建立日期**：2026-09-17
- **提案來源**：2026-09-17 死碼稽核
- **為什麼現在不做**：—（已完成，計畫 `plans/015`）
- **觸發條件**：—
- **怎麼做**（實際做法）：
  1. `userUtils.js` 只留 `getCurrentUserAccount` / `getCurrentUserClass` / `getCurrentUserInfo` / `isCurrentUser` / `getUserForSocket` / `addUserUpdateListener` / `triggerUserUpdate`，單一欄位 getter 一律從 `authUtils` 匯入；23 個引用檔的 import 逐檔改好；review 時發現其中 12 個檔原本就沒用到搬過去的函式，一併刪掉未用 import，`userUtils` 最後只剩 `TopBar`、`IdeaWall`、`CardDetailModal` 三個引用檔
  2. 刪 `userDisplayUtils.js` 與 `userUtils.js` 的 `getUserDisplayName`（0 引用）
  3. 新增 `utils/dateFormat.js`（date-fns `format` + `isValid` 防呆），`dateformat` 的 3 處改走並 `npm uninstall dateformat`
  4. 25 處裸 `toLocaleDateString` / `toLocaleString` 未動，登錄為 F035
- **估計工作量**：`M`
- **相關檔案**：`sdl-frontend-main/src/utils/authUtils.js`、`sdl-frontend-main/src/utils/userUtils.js`、`sdl-frontend-main/src/utils/userDisplayUtils.js`、`sdl-frontend-main/src/utils/timeUtils.js`

---

### F034: Kanban 卡片首幀空殼與圖片延後出現

- **類別**：Frontend
- **狀態**：`backlog → done (2026-09-17)`
- **優先級**：P3
- **建立日期**：2026-09-17
- **提案來源**：plans/011 Step 5 診斷（2026-09-17）。`GET /kanbans/:projectId` 一次帶回每欄的 `task` 陣列（實測欄 62/63 各 1 張、64 為 0 張），不存在第二段請求；「欄位先出現、卡片約 3 秒後才到」是自動化實測時分頁處於 `document.visibilityState === 'hidden'`，Chrome 對背景分頁節流與凍結造成的假象，前景使用者看不到 3 秒空窗。真正存在的只有兩個小閃現：
  1. `carditem/hooks/useCardData.js` 用空物件初始化 `cardData`，再靠 `useEffect` 從 props 複製，首幀卡片是沒有標題的白殼（一幀）
  2. 卡片圖片走 `AuthImage.jsx` 帶授權 fetch 轉 blob，圖片區在回應前沒有佔位高度
- **為什麼現在不做**：—（已完成，commit 670bc20，計畫 `plans/017`）
- **觸發條件**：—
- **怎麼做**（實際做法）：
  1. `useCardData` 抽出 `normalizeCard`，`useState(() => normalizeCard(initialData))` 首幀即有內容，掛載那一次的 effect 跳過避免多一次 render
  2. `SharedComponents.CardImage` 容器加 `bg-gray-100 rounded-t-lg overflow-hidden`，圖片 blob 回來前顯示 160px 灰底
- **估計工作量**：`S`
- **相關檔案**：`sdl-frontend-main/src/pages/Kanban/components/carditem/hooks/useCardData.js`、`sdl-frontend-main/src/components/AuthImage.jsx`、`sdl-frontend-main/src/pages/Kanban/components/carditem/components/CardImage.jsx`

---

### F035: 25 處裸 `toLocaleDateString` / `toLocaleString` 統一到 `utils/dateFormat.js`

- **類別**：Frontend
- **狀態**：`backlog`
- **優先級**：P3
- **建立日期**：2026-09-17
- **提案來源**：F033 執行時（`plans/015`）只把 `dateformat` 的 3 處改成 date-fns，剩下的裸呼叫散在歷程模板、教師儀表板、公告、學生儀表板等 25 處
- **為什麼現在不做**：各處格式刻意不同（有的只要月日、有的含星期、有的是 `dateStyle: 'long'`），統一前要先決定每個情境的顯示格式，屬文案 / 產品決策，不是純技術替換
- **觸發條件**：使用者反映日期格式不一致，或下一次動歷程模板 / 儀表板時順手做
- **怎麼做**：
  1. 在 `utils/dateFormat.js` 加固定情境的 helper（`formatDateShort`、`formatDateTime`、`formatDateLong`）
  2. 用 `grep -rn "toLocale\(Date\|Time\)\?String" src | grep -v utils/timeUtils` 列清單逐處替換，每處保留原本的視覺格式
  3. `timeUtils.js` 的 `formatTime` 內部也改用 date-fns，保留對外簽名
- **估計工作量**：`M`
- **相關檔案**：`sdl-frontend-main/src/utils/dateFormat.js`、`sdl-frontend-main/src/utils/timeUtils.js`、各呼叫處

---

### F036: 共用 `Button` 元件全站逐頁替換

- **類別**：Frontend
- **狀態**：`backlog`
- **優先級**：P3
- **建立日期**：2026-09-17
- **提案來源**：F032 執行時（`plans/016`）建立了 `components/ui/Button.jsx`，只在錯誤頁與導覽等少數地方採用，其餘主要按鈕仍有至少 8 種 className 寫法
- **為什麼現在不做**：全站替換要逐頁回歸每個按鈕的尺寸與狀態，工作量與風險都大；先靠全域 `:focus-visible` ring 補上鍵盤焦點，視覺一致性留到有 UI 大改版時一起做
- **觸發條件**：設計系統升版、或某頁要重做時把該頁按鈕全部換成 `Button`
- **怎麼做**：
  1. 以頁為單位替換，每頁一個 commit
  2. 替換時只允許 `variant` / `size` 對應，不允許在 `className` 覆寫顏色
  3. 全部換完後把 `DESIGN_SYSTEM.md` 的按鈕範例改成引用 `Button`
- **估計工作量**：`L`
- **相關檔案**：`sdl-frontend-main/src/components/ui/Button.jsx`、`sdl-frontend-main/DESIGN_SYSTEM.md`

---

### F037: 前端 eslint flat config 補 `.jsx` 與 react-hooks 外掛

- **類別**：Frontend / DevOps
- **狀態**：`backlog`
- **優先級**：P2
- **建立日期**：2026-09-17
- **提案來源**：`plans/013` 到 `016` 的 code review 指出 `eslint.config.js` 只 match `**/*.{js,mjs,cjs}`，所有 `.jsx` 都被靜默忽略，`react-hooks/exhaustive-deps` 的 disable 註解反而報 rule not found；各計畫寫的 `npx eslint <檔>.jsx` 驗證步驟其實是空轉
- **為什麼現在不做**：補上 `files: ['**/*.{js,jsx}']` 與 `eslint-plugin-react` / `eslint-plugin-react-hooks` 後，既有程式碼會冒出大量 no-unused-vars 與 hooks deps 警告，要另開一輪清理才能讓 lint 在 CI 有意義
- **觸發條件**：下一次要在 CI 加 lint gate，或連續兩次因為 deps 漏寫出現 bug
- **怎麼做**：
  1. `eslint.config.js` 加 jsx 檔案 pattern、`languageOptions.parserOptions.ecmaFeatures.jsx`、react 與 react-hooks 外掛
  2. 先以 `--max-warnings` 不設限跑一次，把 error 級（no-undef、hooks 規則）修完，warning 分批清
  3. 清完後在 `plans/README.md` 恢復用 eslint 當驗證手段
- **估計工作量**：`M`
- **相關檔案**：`sdl-frontend-main/eslint.config.js`、`sdl-frontend-main/package.json`

---

## 變更記錄

- **2026-04-17**：建立文件；從 `sdl-coach-project-context-plan.md` 第 12、13 節遷入 F001–F013
- **2026-04-17**：完成 F014（`chat_turns` → `sdl_coach_messages`），作為首個完成案例；舊 migrations 的 `chat-turns` 命名保留為歷史紀錄不改
- **2026-04-20**：新增 F015（科學術語 Tooltip / Glossary）；伴隨 SDL Coach 多輪對話上線與認知師徒制 prompt 調整提出，prompt 注解為主、tooltip 為補充方案
- **2026-09-02**：新增 F016–F019；依效能審查報告（`docs/reports/PERFORMANCE_REVIEW_2026-09-02.md`）完成 23 項中的短期修法後，把差量廣播、總覽聚合端點、presigned 圖片、反思 BLOB 下線四項登錄為後續工作
- **2026-09-03**：新增 F020（JWT claim 失效機制）；資安止血項 code review 指出角色降級在 access token 到期前不生效，止血版先讓 `requireAdmin` 一律查 DB，全面方案登錄為後續工作
- **2026-09-03**：新增 F021（teacher 範圍收斂為 mentorId）、F022（tasks 附件正規化）；High 級 IDOR／XSS 修復時把專案存取判定集中到 `middlewares/projectAccess.js`，fileName 索引已在同批 migration 補上，剩 teacher 全放行與 tasks 陣列欄位掃描兩項登錄為後續工作
- **2026-09-05**：新增 F023（CSP 轉正式強制）；資安 Medium 項收尾時 nginx 先上 Report-Only 並加 `/api/csp-report` 回報端點，等真實流量回報確認 eval 類套件的影響後再強制
- **2026-09-05**：完成 F021（teacher 範圍收斂為 mentorId）；生產 151 個專案只有第 26 號缺 mentorId、已補，共同指導只出現在 3 個測試專案、不需多對多；新增 F024（socket 房間加入與班級清單端點的列舉面）
- **2026-09-17**：新增 F025–F029；安裝 emilkowalski/skills 與 taste-skill 的 `redesign-existing-projects` 後跑 `/improve-animations` 全站稽核，7 項可直接執行的修法寫成 `plans/001` 到 `007`，通知系統統一、按壓回饋、layout 屬性動畫、Kanban 樂觀卡片閃動、錯失的狀態轉場五項登錄為後續工作
- **2026-09-17**：完成 `plans/001` 到 `007`（動畫稽核七項，commit dd55663 到 564c298）；新增 F030–F033；以學生帳號在本機 dev 實測桌面與 390px 寬度，加上 redesign-existing-projects 與 mobile-native 清單的靜態稽核與死碼稽核，五項可直接執行的修法寫成 `plans/008` 到 `012`，側欄抽屜化、收尾雜項、共用元件與 focus ring、utils 合併四項登錄為後續工作
- **2026-09-17**：完成 `plans/008` 到 `012`（z-index token、Modal 無障礙、手機基礎、狀態與文案、死碼清理與 production drop console）；新增 F034（Kanban 卡片首幀空殼與圖片延後）並在 F031 追加兩處 `scrollbar-hidden`；plans/011 的卡片空窗診斷結論：API 一次帶回 task，空窗是背景分頁節流假象，不補 per-column 骨架
- **2026-09-17**：完成 F030–F034（`plans/013` 到 `017`，commit 670bc20 與後續 commit）；新增 F035（裸 `toLocale*` 統一到 `dateFormat.js`）、F036（`Button` 全站逐頁替換）；code review 後補 `closeOnBackdrop`、刪 `ProjectViewingSettings.jsx` 死檔、補 9 檔 `focus:outline-none`、清 12 檔未用 import，並新增 F037（eslint 補 `.jsx`）
