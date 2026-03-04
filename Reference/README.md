# Reference 文檔目錄

這個資料夾包含所有在主 README.md 中引用的技術文檔和實作記錄。

## 📁 資料夾結構

```
Reference/
├── backend/                    # 後端相關文檔
│   ├── BACKEND_API_README.md  # 後端 API 完整文檔
│   └── FIXES_SUMMARY.md        # 後端修復總結
│
├── frontend/                   # 前端相關文檔
│   └── LOGIN_FIX_TEST.md       # 登入功能修復測試
│
├── general/                    # 通用文檔
│   ├── CODE_REVIEW_CHECKLIST.md  # 代碼審查清單
│   └── IMPROVEMENTS_SUMMARY.md    # 系統改進總結
│
├── versions/                   # 版本更新記錄
│   ├── v2.1-advisor-upgrade.md     # v2.1 AI Advisor 升級
│   ├── v2.2-stage-aware.md         # v2.2 階段感知型 AI 助理
│   └── v2.3-stage-completion.md    # v2.3 階段完成功能
│
├── AI_ASSISTANT_GUIDE.md            # AI 助理完整使用指南
├── HELP_SEEKING_IN_SRL_ANALYSIS.md  # 求助行為研究文獻分析
├── MONITORING.md                    # 系統監控與日誌指南
├── REFRESH_TOKEN_IMPLEMENTATION.md  # Refresh Token 實作說明
├── SESSION_FIX_IMPLEMENTATION.md    # Session ID 修復實作
├── TOKENS_EXPLAINED.md              # Token 機制詳細說明
├── reflection-log-permission-fix.md # 反思日誌權限修復
└── student-portfolio-plan.md        # 學生學習歷程規劃
```

## 📚 文檔分類

### 🔐 身份驗證與安全
- [REFRESH_TOKEN_IMPLEMENTATION.md](REFRESH_TOKEN_IMPLEMENTATION.md) - Refresh Token 自動刷新機制
- [TOKENS_EXPLAINED.md](TOKENS_EXPLAINED.md) - JWT Token 機制完整說明

### 📊 監控與維運
- [MONITORING.md](MONITORING.md) - 系統監控、日誌管理與效能分析

### 🐛 問題修復記錄
- [reflection-log-permission-fix.md](reflection-log-permission-fix.md) - 反思日誌權限修復詳細記錄
- [frontend/LOGIN_FIX_TEST.md](frontend/LOGIN_FIX_TEST.md) - 登入功能修復與測試
- [backend/FIXES_SUMMARY.md](backend/FIXES_SUMMARY.md) - 後端修復總結

### 📈 版本更新
- [versions/v2.3-stage-completion.md](versions/v2.3-stage-completion.md) - v2.3 階段完成功能
- [versions/v2.2-stage-aware.md](versions/v2.2-stage-aware.md) - v2.2 階段感知型 AI 助理
- [versions/v2.1-advisor-upgrade.md](versions/v2.1-advisor-upgrade.md) - v2.1 AI Advisor 升級

### 🛠️ 開發指南
- [backend/BACKEND_API_README.md](backend/BACKEND_API_README.md) - 後端 API 完整文檔
- [general/CODE_REVIEW_CHECKLIST.md](general/CODE_REVIEW_CHECKLIST.md) - 代碼審查清單
- [general/IMPROVEMENTS_SUMMARY.md](general/IMPROVEMENTS_SUMMARY.md) - 系統改進總結
- [student-portfolio-plan.md](student-portfolio-plan.md) - 學生學習歷程規劃

## 📝 使用說明

### 為什麼需要這個資料夾？

1. **集中管理**：所有在 README 中引用的文檔都在這裡，方便查找
2. **版本控制**：確保重要文檔不會被 `.gitignore` 忽略
3. **獨立性**：即使原始 `docs/` 資料夾被清理，這些重要文檔仍然保留

### 如何使用？

- **快速查找**：根據上面的分類找到需要的文檔
- **從 README 跳轉**：主 README.md 中的所有連結都指向這個資料夾
- **保持同步**：如果更新了這些文檔，記得同步更新原始檔案

## 🔄 與原始 docs/ 的關係

| 原始路徑 | Reference 路徑 |
|---------|---------------|
| `docs/REFRESH_TOKEN_IMPLEMENTATION.md` | `Reference/REFRESH_TOKEN_IMPLEMENTATION.md` |
| `docs/TOKENS_EXPLAINED.md` | `Reference/TOKENS_EXPLAINED.md` |
| `docs/MONITORING.md` | `Reference/MONITORING.md` |
| `docs/reflection-log-permission-fix.md` | `Reference/reflection-log-permission-fix.md` |
| `docs/frontend/LOGIN_FIX_TEST.md` | `Reference/frontend/LOGIN_FIX_TEST.md` |
| `docs/backend/FIXES_SUMMARY.md` | `Reference/backend/FIXES_SUMMARY.md` |
| `docs/general/CODE_REVIEW_CHECKLIST.md` | `Reference/general/CODE_REVIEW_CHECKLIST.md` |
| `docs/general/IMPROVEMENTS_SUMMARY.md` | `Reference/general/IMPROVEMENTS_SUMMARY.md` |
| `sdl-backend-main/docs/README.md` | `Reference/backend/BACKEND_API_README.md` |
| `sdl-backend-main/docs/v2.1-advisor-upgrade.md` | `Reference/versions/v2.1-advisor-upgrade.md` |
| `sdl-backend-main/docs/v2.2-stage-aware.md` | `Reference/versions/v2.2-stage-aware.md` |
| `sdl-backend-main/docs/v2.3-stage-completion.md` | `Reference/versions/v2.3-stage-completion.md` |

### 🔍 求助行為研究
- [HELP_SEEKING_IN_SRL_ANALYSIS.md](HELP_SEEKING_IN_SRL_ANALYSIS.md) - 求助行為研究文獻分析（Won 2024, Li 2023）

### 🤖 AI 助理
- [AI_ASSISTANT_GUIDE.md](AI_ASSISTANT_GUIDE.md) - AI 專案助理完整使用指南（Streaming、RAG）

---

*最後更新：2026-03-04*
