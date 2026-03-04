# 檔案整理計畫

## 📂 目錄結構規劃

```
SDLs_fullStack_remix/
├── README.md                    # 保留：專案總覽
├── CLAUDE.md                    # 保留：Claude Code 指引
├── QUICKSTART.md                # 保留：快速開始指南
├── docker-compose.yml
├── docker-compose.dev.yml
├── docker-compose.prod.yml
├── nginx.conf
│
├── docs/                        # 📚 文檔中心
│   ├── guides/                  # 🎓 使用指南
│   │   ├── AI_ASSISTANT_GUIDE.md
│   │   ├── DYNAMIC_REFLECTION_GUIDE.md
│   │   ├── STAGE_REFLECTION_GUIDE_V2.md
│   │   ├── TOKEN_CLEANUP_GUIDE.md
│   │   └── TRACKING_PROVIDER_GUIDE.md
│   │
│   ├── releases/                # 🚀 版本發布記錄
│   │   ├── PHASE0_IMPLEMENTATION_COMPLETE.md
│   │   ├── PHASE1_COMPLETION_REPORT.md
│   │   ├── PHASE2_STORAGESERVICE_REPORT.md
│   │   ├── PHASE3_IMPLEMENTATION_COMPLETE.md
│   │   ├── ANNOUNCEMENT_DELETE_COMPLETE.md
│   │   ├── LOGGER_FIX_REPORT.md
│   │   └── OPTIMIZATION_REPORT.md
│   │
│   ├── proposals/               # 💡 改進提案
│   │   ├── Improve-SDLS.md
│   │   ├── Improve-Idea-Improver.md
│   │   ├── KanBan-improve.md
│   │   ├── AI-Scaffold_Orchestrator.md
│   │   └── SDL-Phase-Implementation-Plan.md
│   │
│   ├── testing/                 # 🧪 測試文檔
│   │   ├── PHASE0_TEST_GUIDE.md
│   │   ├── TEST_STAGE_SELECTOR.md
│   │   ├── HOW_TO_VERIFY_PHASE3.md
│   │   └── test-thinking-display.md
│   │
│   ├── architecture/            # 🏗️ 架構設計（已存在）
│   │   ├── PHASE_COMPARISON.md
│   │   ├── KB.md
│   │   └── Linus.md
│   │
│   ├── api/                     # 📡 API 文檔
│   │   ├── gemini_function-calling.md
│   │   └── gemini_search.md
│   │
│   ├── reports/                 # 📊 分析報告
│   │   ├── AI_FEATURES_COMPARISON.md
│   │   ├── AUDIT_COVERAGE_REPORT.md
│   │   ├── UI_DIFFERENTIATION_REPORT.md
│   │   └── KB_COACH_IMPLEMENTATION.md
│   │
│   └── misc/                    # 📝 其他
│       ├── AGENTS.md
│       ├── code-review-criteria.md
│       └── STAGE_SELECTOR_IMPLEMENTATION.md
│
├── Reference/                   # 📖 參考資料（保持現狀）
│   ├── AI_ASSISTANT_GUIDE.md
│   ├── SESSION_FIX_IMPLEMENTATION.md
│   ├── REFRESH_TOKEN_IMPLEMENTATION.md
│   └── ...
│
├── sdl-backend-main/
│   ├── tests/                   # 🧪 統一測試目錄
│   │   ├── unit/               # 單元測試
│   │   │   └── orchestrator.test.js
│   │   ├── integration/        # 整合測試
│   │   │   ├── fourStageBackend.test.js
│   │   │   └── subStageUserSubmit.test.js
│   │   └── e2e/                # E2E 測試
│   │       ├── phase1-auth.test.js
│   │       ├── phase2-socket.test.js
│   │       ├── phase3-p1.test.js
│   │       ├── ai-task-assistant.test.js
│   │       ├── kb-coach-fallback.test.js
│   │       └── tracking-batch.test.js
│   │
│   ├── docs/                    # 後端專屬文檔
│   │   ├── STRUCTURED_OUTPUT_README.md
│   │   ├── KB_COACH_FALLBACK.md
│   │   ├── KB_COACH_HISTORY_QUICKSTART.md
│   │   ├── CACHE_INVALIDATION_GUIDE.md
│   │   └── OPTIMIZATION_SUMMARY.md
│   │
│   └── ...（其他後端目錄維持不變）
│
└── sdl-frontend-main/
    ├── DESIGN_SYSTEM.md         # 保留在前端根目錄
    └── ...

```

## 🗂️ 檔案移動清單

### 根目錄 → docs/guides/
- DYNAMIC_REFLECTION_GUIDE.md
- STAGE_REFLECTION_GUIDE_V2.md

### 根目錄 → docs/releases/
- PHASE1_COMPLETION_REPORT.md
- PHASE2_STORAGESERVICE_REPORT.md
- PHASE3_IMPLEMENTATION_COMPLETE.md
- ANNOUNCEMENT_DELETE_COMPLETE.md
- LOGGER_FIX_REPORT.md
- OPTIMIZATION_REPORT.md

### 根目錄 → docs/proposals/
- Improve-SDLS.md
- Improve-Idea-Improver.md
- KanBan-improve.md
- AI-Scaffold Orchestrator for Knowledge Building.md
- SDL-Phase-Implementation-Plan.md

### 根目錄 → docs/testing/
- TEST_STAGE_SELECTOR.md
- test-thinking-display.md

### 根目錄 → docs/architecture/
- PHASE_COMPARISON.md
- KB.md
- Linus.md

### 根目錄 → docs/api/
- gemini_function-calling.md
- gemini_search.md

### 根目錄 → docs/misc/
- AGENTS.md
- code-review-criteria.md
- STAGE_SELECTOR_IMPLEMENTATION.md

### sdl-backend-main/ → sdl-backend-main/tests/e2e/
- test-ai-task-assistant.js → ai-task-assistant.test.js
- test-announcement-delete.js → announcement-delete.test.js
- test-kb-coach-fallback.js → kb-coach-fallback.test.js
- test-orchestrator.js → orchestrator.test.js (移到 unit/)
- test-phase1-auth.js → phase1-auth.test.js
- test-phase2-socket.js → phase2-socket.test.js
- test-phase3-p1.js → phase3-p1.test.js
- test-refactor.js → refactor.test.js
- test-tracking-batch.js → tracking-batch.test.js
- test-usage-session.js → usage-session.test.js
- test-vllm.js → vllm.test.js

### sdl-backend-main/__tests__/ → sdl-backend-main/tests/integration/
- fourStageBackend.test.js
- subStageUserSubmit.test.js

### 刪除舊目錄
- 刪除 `sdl-backend-main/__tests__/`（檔案已移走）
- 清理空的 `sdl-backend-main/tests/`（如果存在）

## 📝 需要刪除的臨時檔案
- 123.txt
- 指令.txt

## ✅ 執行順序
1. 創建新的目錄結構
2. 移動文檔檔案到 docs/ 子目錄
3. 移動測試檔案並重新命名
4. 刪除舊的測試目錄
5. 清理臨時檔案
6. 更新相關引用（如果有）
7. Commit 變更

## 📌 注意事項
- 保留根目錄的 `README.md`, `CLAUDE.md`, `QUICKSTART.md`
- `Reference/` 目錄保持現狀（包含重要的實作文檔）
- 前端的 `DESIGN_SYSTEM.md` 保留在前端根目錄
- 後端的 `docs/` 保留後端專屬文檔
