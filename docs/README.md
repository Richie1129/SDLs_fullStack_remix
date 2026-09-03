# 📚 SDL 文檔中心

> 所有技術文檔的集中導航。依照分類快速找到你需要的資料。

---

## 📁 目錄結構

```
docs/
├── architecture/     🏗️ 架構設計
├── api/              📡 外部 API 參考
├── backend/          ⚙️ 後端實作文檔
├── frontend/         🎨 前端實作文檔
├── guides/           📖 使用與操作指南
├── proposals/        💡 功能提案與改進計畫
├── releases/         🚀 版本發佈與實作報告
├── reports/          📊 分析報告與審查
├── testing/          🧪 測試文檔
├── pm/               📋 專案管理
├── general/          📝 通用文檔
└── misc/             🗄️ 其他
```

---

## 🏗️ architecture/ — 架構設計

| 文檔 | 說明 |
|------|------|
| [FOUR_STAGE_SRL_REFACTOR.md](architecture/FOUR_STAGE_SRL_REFACTOR.md) | 四階段自我調整學習 (SRL) 重構方案 |
| [KB.md](architecture/KB.md) | Knowledge Building 理論架構與系統設計 |
| [PHASE_COMPARISON.md](architecture/PHASE_COMPARISON.md) | 各版本架構比較分析 |
| [Linus.md](architecture/Linus.md) | Linus 式程式碼審查原則 |

## 📡 api/ — 外部 API 參考

| 文檔 | 說明 |
|------|------|
| [gemini_function-calling.md](api/gemini_function-calling.md) | Gemini Function Calling 完整指南 |
| [gemini_search.md](api/gemini_search.md) | Gemini Search API 使用參考 |

## ⚙️ backend/ — 後端實作文檔

| 文檔 | 說明 |
|------|------|
| [HELP_SEEKING_IMPLEMENTATION.md](backend/HELP_SEEKING_IMPLEMENTATION.md) | 求助行為分析系統後端實作 |
| [PASSWORD_RESET_SETUP.md](backend/PASSWORD_RESET_SETUP.md) | 密碼重設功能設定指南 |
| [README-DAILY-FIX.md](backend/README-DAILY-FIX.md) | 個人/團隊日誌修復記錄 |

## 🎨 frontend/ — 前端實作文檔

| 文檔 | 說明 |
|------|------|
| [HELP_SEEKING_FRONTEND_IMPLEMENTATION.md](frontend/HELP_SEEKING_FRONTEND_IMPLEMENTATION.md) | 求助行為分析前端實作 |
| [TEACHER_DASHBOARD_REDESIGN_PLAN.md](frontend/TEACHER_DASHBOARD_REDESIGN_PLAN.md) | 教師儀表板重新設計規劃 |
| [TEACHER_DASHBOARD_DESIGN_REVIEW.md](frontend/TEACHER_DASHBOARD_DESIGN_REVIEW.md) | 教師儀表板設計評審 |
| [ADDITIONAL_FIXES.md](frontend/ADDITIONAL_FIXES.md) | 前端額外修復記錄 |
| [FINAL_LOGIN_FIX.md](frontend/FINAL_LOGIN_FIX.md) | 登入功能最終修復 |
| [QUICKSTART_REVIEW.md](frontend/QUICKSTART_REVIEW.md) | 快速啟動檢視 |

## 📖 guides/ — 使用與操作指南

| 文檔 | 說明 |
|------|------|
| [QUICKSTART.md](guides/QUICKSTART.md) | 階段選擇器快速啟動指南 |
| [DYNAMIC_REFLECTION_GUIDE.md](guides/DYNAMIC_REFLECTION_GUIDE.md) | 動態反思引導使用指南 |
| [STAGE_REFLECTION_GUIDE_V2.md](guides/STAGE_REFLECTION_GUIDE_V2.md) | 階段反思指南 V2 |
| [HOW_TO_VERIFY_PHASE3.md](guides/HOW_TO_VERIFY_PHASE3.md) | Phase 3 驗證步驟指南 |
| [TOKEN_CLEANUP_GUIDE.md](guides/TOKEN_CLEANUP_GUIDE.md) | Token 清理指南 |
| [TRACKING_PROVIDER_GUIDE.md](guides/TRACKING_PROVIDER_GUIDE.md) | 追蹤提供者整合指南 |

## 💡 proposals/ — 功能提案與改進計畫

| 文檔 | 說明 |
|------|------|
| [Improve-SDLS.md](proposals/Improve-SDLS.md) | SDL 平台整體改進提案 |
| [Improve-Idea-Improver.md](proposals/Improve-Idea-Improver.md) | Idea Improver 2.0 改進計畫 (Shadow Orchestrator) |
| [AI-Scaffold Orchestrator for Knowledge Building.md](proposals/AI-Scaffold%20Orchestrator%20for%20Knowledge%20Building.md) | AI 鷹架編排器設計提案 |
| [KanBan-improve.md](proposals/KanBan-improve.md) | 看板功能改進提案 |
| [SDL-Phase-Implementation-Plan.md](proposals/SDL-Phase-Implementation-Plan.md) | SDL 階段實作計畫 |
| [TYPESCRIPT_MIGRATION_PLAN.md](proposals/TYPESCRIPT_MIGRATION_PLAN.md) | TypeScript 務實遷移計畫 |

## 🚀 releases/ — 版本發佈與實作報告

| 文檔 | 說明 | 版本 |
|------|------|------|
| [PHASE3_IMPLEMENTATION_COMPLETE.md](releases/PHASE3_IMPLEMENTATION_COMPLETE.md) | Phase 3 P1 審計追蹤（9 個追蹤點） | v3.2 |
| [PHASE2_IMPLEMENTATION_COMPLETE.md](releases/PHASE2_IMPLEMENTATION_COMPLETE.md) | Phase 2 實作完成報告 | v3.1 |
| [PHASE2_STORAGESERVICE_REPORT.md](releases/PHASE2_STORAGESERVICE_REPORT.md) | StorageService 統一儲存報告 | v3.2 |
| [PHASE1_IMPLEMENTATION_COMPLETE.md](releases/PHASE1_IMPLEMENTATION_COMPLETE.md) | Phase 1 實作完成報告 | v3.0 |
| [PHASE1_COMPLETION_REPORT.md](releases/PHASE1_COMPLETION_REPORT.md) | Phase 1 完成報告 | v3.0 |
| [PHASE0_IMPLEMENTATION_COMPLETE.md](releases/PHASE0_IMPLEMENTATION_COMPLETE.md) | Phase 0 P0 最高風險審計追蹤 | v3.0 |
| [ANNOUNCEMENT_DELETE_COMPLETE.md](releases/ANNOUNCEMENT_DELETE_COMPLETE.md) | 公告刪除功能完整實作 | v3.2 |
| [OPTIMIZATION_REPORT.md](releases/OPTIMIZATION_REPORT.md) | 深度分析與優化建議 | v3.1 |
| [LOGGER_FIX_REPORT.md](releases/LOGGER_FIX_REPORT.md) | Logger 循環引用修復 | v3.2 |
| [IMPLEMENTATION_COMPLETE.md](releases/IMPLEMENTATION_COMPLETE.md) | 功能實作完成報告 | — |
| [AUDIT_LOG_DELIVERY.md](releases/AUDIT_LOG_DELIVERY.md) | 審計日誌交付報告 | v3.3 |
| [AUDIT_LOG_IMPLEMENTATION_SUMMARY.md](releases/AUDIT_LOG_IMPLEMENTATION_SUMMARY.md) | 審計日誌實作總結 | v3.3 |
| [STUDENT_AUDIT_LOG_IMPLEMENTATION.md](releases/STUDENT_AUDIT_LOG_IMPLEMENTATION.md) | 學生審計日誌實作 | v3.3 |

## 📊 reports/ — 分析報告與審查

| 文檔 | 說明 |
|------|------|
| [AUDIT_COVERAGE_REPORT.md](reports/AUDIT_COVERAGE_REPORT.md) | 審計覆蓋率報告 |
| [KB_COACH_IMPLEMENTATION.md](reports/KB_COACH_IMPLEMENTATION.md) | KB Coach 知識建構教練實作報告 |
| [KB_COACH_HELP_SEEKING_ENHANCEMENT.md](reports/KB_COACH_HELP_SEEKING_ENHANCEMENT.md) | KB Coach 與求助引導整合增強 |
| [AI_FEATURES_COMPARISON.md](reports/AI_FEATURES_COMPARISON.md) | AI 功能比較分析 |
| [responsive-test-report.md](reports/responsive-test-report.md) | 手機端響應式測試報告 |
| [個人反思日誌錯誤碼對照表.md](reports/個人反思日誌錯誤碼對照表.md) | 反思日誌錯誤碼對照 |

## 🧪 testing/ — 測試文檔

| 文檔 | 說明 |
|------|------|
| [PHASE0_TEST_GUIDE.md](testing/PHASE0_TEST_GUIDE.md) | Phase 0 測試指南 |
| [TEST_STAGE_SELECTOR.md](testing/TEST_STAGE_SELECTOR.md) | 階段選擇器測試指南 |
| [test-thinking-display.md](testing/test-thinking-display.md) | AI 思考過程顯示測試 |

## 📋 pm/ — 專案管理

| 文檔 | 說明 |
|------|------|
| [market_research_srl.md](pm/market_research_srl.md) | 自我調整學習市場研究 |
| [stage_refactor_investigation_report.md](pm/stage_refactor_investigation_report.md) | 階段重構調研報告 |

## 📝 general/ — 通用文檔

| 文檔 | 說明 |
|------|------|
| [code-review-2025-10-11.md](general/code-review-2025-10-11.md) | 2025-10-11 代碼審查 |
| [code-review-2025-12-23.md](general/code-review-2025-12-23.md) | 2025-12-23 代碼審查 |
| [diff_output.md](general/diff_output.md) | Diff 輸出記錄 |

## 🗄️ misc/ — 其他

| 文檔 | 說明 |
|------|------|
| [AGENTS.md](misc/AGENTS.md) | AI 編碼代理開發指南 |
| [STAGE_SELECTOR_IMPLEMENTATION.md](misc/STAGE_SELECTOR_IMPLEMENTATION.md) | 階段選擇器詳細實作文檔 |
| [UI_DIFFERENTIATION_REPORT.md](misc/UI_DIFFERENTIATION_REPORT.md) | UI 差異化實施報告 |
| [code-review-criteria.md](misc/code-review-criteria.md) | 代碼審查標準 |
| [FILE_ORGANIZATION_PLAN.md](misc/FILE_ORGANIZATION_PLAN.md) | 檔案整理計畫 |

---

## 📎 其他文檔位置

| 位置 | 說明 |
|------|------|
| [Reference/](../Reference/README.md) | 參考資料（Token、Session、監控、版本歷史） |
| [CLAUDE.md](../CLAUDE.md) | AI 輔助開發指南 |
| [CHANGELOG.md](../CHANGELOG.md) | 完整版本更新日誌 |
| [sdl-backend-main/docs/](../sdl-backend-main/docs/README.md) | 後端專屬文檔 |

---

*最後更新：2026-03-04*
