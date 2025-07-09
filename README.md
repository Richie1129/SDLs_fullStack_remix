# SDLs Full Stack Remix

> **🎉 最新更新 (2024)**：檔案儲存系統已完全遷移至 MinIO 對象儲存，詳見 [MinIO 遷移完成報告](./MINIO_MIGRATION_COMPLETE.md)。
SDLs Full Stack Remix 是一個以教育研究為核心的自主學習平台，整合了專案管理、即時通訊、反思與 AI 輔助等多元功能。前端採用 React 與 Vite，後端以 Express.js 搭配 PostgreSQL，並透過 Docker Compose 進行容器化部署。

## 🏗️ 專案架構

專案主要分為前端 `sdl-frontend-main` 與後端 `sdl-backend-main` 兩個目錄，並利用 Nginx、PostgreSQL、pgAdmin 等服務形成完整的微服務架構。詳細功能模組與流程請參考 [OverView.md](./OverView.md)。

```
├── sdl-frontend-main/  # 前端 React 應用
├── sdl-backend-main/   # 後端 Express API
├── docker-compose.yml  # 本地開發與測試環境
├── docker-compose.prod.yml # 生產環境範例
├── nginx.conf          # 反向代理設定
└── MINIO_MIGRATION_COMPLETE.md
```

## 🚀 快速開始

1. **複製環境設定**：於 `sdl-backend-main` 目錄內將 `env.prod.example` 複製為 `.env.prod`，並依需求填入 `OPENAI_API_KEY` 及 MinIO 相關參數。
2. **啟動服務**：在專案根目錄執行：
   ```bash
   docker compose up -d
   ```
   服務包含前端、後端、資料庫、Nginx 及 pgAdmin，啟動後即可在瀏覽器透過 `http://localhost` 進入平台。
3. **初次設定 MinIO**：若使用 `docker-compose.prod.yml`，MinIO 會自動初始化並建立預設 bucket，可於 `http://localhost:9001` 進行管理。

## 📚 進一步閱讀

- [OverView.md](./OverView.md) – 完整的技術堆疊與系統設計說明。
- [MINIO_MIGRATION_COMPLETE.md](./MINIO_MIGRATION_COMPLETE.md) – 檔案系統遷移細節。
- `sdl-backend-main/MINIO_SETUP.md` – MinIO 設定與使用方式。

本倉庫提供以 Docker 為核心的全端範例，適合需要快速部署自主學習平台或參考微服務架構的開發者。
