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
- **狀態**：`backlog`
- **優先級**：P2
- **建立日期**：2026-09-03
- **提案來源**：2026-09-03 資安審查 High 項「teacher 角色權限過寬」；IDOR 修復時刻意維持現況
- **為什麼現在不做**：
  - 目前 teacher 對所有專案放行的判斷散在 `checkProjectOwnerOrTeacher`、`checkTeacherRole`、teacherAgent、auditClient 等多處，IDOR 修復先把新路由的判定集中到 `middlewares/projectAccess.js` 的 `getProjectAccess`，teacher 放行只剩一個判斷點
  - 現行資料裡 `projects.mentorId` 是否每個專案都有填尚未盤點，貿然收斂會讓沒有 mentor 的專案教師端整個看不到
- **觸發條件**（任一成立）：
  - 平台跨校／跨機構使用，教師不應看到別校專案
  - 完成 `projects.mentorId` 的補齊盤點（無 null）
- **怎麼做**：
  1. 盤點 `projects.mentorId` 為 null 的專案並補齊（或提供 admin 指派介面）
  2. `getProjectAccess` 的 teacher 分支改為「僅當 `project.mentorId === userId`」，以 feature flag（例如 `TEACHER_SCOPE=mentor`）切換，預設維持全放行
  3. 逐一把 `checkProjectOwnerOrTeacher`、teacherAgent、auditClient 的 teacher 判斷改呼叫 `getProjectAccess`
  4. 回歸測試補「非 mentor 的教師 → 403」
- **估計工作量**：`M`
- **依賴 / 前置條件**：`projects.mentorId` 資料完整
- **風險 / 副作用**：多位教師共同指導同一專案時需要多對多關聯（目前只有單一 mentorId）
- **替代方案**：維持全放行，改以稽核紀錄追蹤教師跨專案讀取
- **相關檔案**：`sdl-backend-main/middlewares/projectAccess.js`、`sdl-backend-main/middlewares/projectViewingMiddleware.js`、`sdl-backend-main/routes/teacherAgent.js`、`sdl-backend-main/routes/auditClient.js`

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

---

## 變更記錄

- **2026-04-17**：建立文件；從 `sdl-coach-project-context-plan.md` 第 12、13 節遷入 F001–F013
- **2026-04-17**：完成 F014（`chat_turns` → `sdl_coach_messages`），作為首個完成案例；舊 migrations 的 `chat-turns` 命名保留為歷史紀錄不改
- **2026-04-20**：新增 F015（科學術語 Tooltip / Glossary）；伴隨 SDL Coach 多輪對話上線與認知師徒制 prompt 調整提出，prompt 注解為主、tooltip 為補充方案
- **2026-09-02**：新增 F016–F019；依效能審查報告（`docs/reports/PERFORMANCE_REVIEW_2026-09-02.md`）完成 23 項中的短期修法後，把差量廣播、總覽聚合端點、presigned 圖片、反思 BLOB 下線四項登錄為後續工作
- **2026-09-03**：新增 F020（JWT claim 失效機制）；資安止血項 code review 指出角色降級在 access token 到期前不生效，止血版先讓 `requireAdmin` 一律查 DB，全面方案登錄為後續工作
- **2026-09-03**：新增 F021（teacher 範圍收斂為 mentorId）、F022（tasks 附件正規化）；High 級 IDOR／XSS 修復時把專案存取判定集中到 `middlewares/projectAccess.js`，fileName 索引已在同批 migration 補上，剩 teacher 全放行與 tasks 陣列欄位掃描兩項登錄為後續工作
