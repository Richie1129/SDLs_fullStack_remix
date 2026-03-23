# sdl-intro-video

SDL 學習平台的**介紹影片製作工具**，使用 [Remotion](https://www.remotion.dev/) 以 React 程式碼驅動影片生成。

影片以系統**真實頁面截圖**搭配動畫標注，向高中生介紹各核心功能。

---

## 影片結構

| 場景編號 | 檔案 | 內容 | 時長 |
|----------|------|------|------|
| S01 | `01-Intro.tsx` | SDL 品牌片頭 | 10 秒 |
| S02 | `02-Login.tsx` | 登入頁面介紹 | 10 秒 |
| S03 | `03-Dashboard.tsx` | 學生儀表板 | 10 秒 |
| S04 | `04-Kanban.tsx` | 看板任務管理 | 14 秒 |
| S05 | `05-IdeaWall.tsx` | 想法牆協作 | 14 秒 |
| S06 | `06-Reflection.tsx` | 5Rs 反思日誌 | 10 秒 |
| S07 | `07-Portfolio.tsx` | 學習歷程檔案 | 12 秒 |
| S08 | `08-Outro.tsx` | 結尾 CTA | 10 秒 |

**總時長：約 90 秒（1.5 分鐘）**

---

## 前置作業：截圖更新

影片素材放在 `public/screenshots/`，截圖須在系統運行時重新拍攝：

```
public/screenshots/
  01-login.png
  02-dashboard.png
  04-kanban.png
  05-idea-wall.png
  07-reflection.png
  08-portfolio.png
```

### 自動截圖（Playwright）

確認系統已啟動（`http://localhost:8080`），再執行：

```bash
npx playwright install chromium   # 首次需安裝瀏覽器
node scripts/capture-screenshots.js
```

### 手動截圖

若要手動更換截圖，請確保解析度為 **1920×1080**，存成 PNG 格式後放入對應路徑。

---

## 開發預覽

```bash
# 安裝依賴（首次）
npm install

# 啟動 Remotion Studio（即時預覽）
npm start
```

瀏覽器會開啟 Remotion Studio，可在左側選擇場景，用播放器預覽動畫效果。

---

## 算圖輸出

```bash
# 輸出完整影片（約需 3-5 分鐘）
npm run render
```

輸出檔案位於 `out/sdl-intro.mp4`，規格為 1920×1080 / 30fps。

### 只輸出單一場景

```bash
npx remotion render src/index.ts S04-Kanban out/kanban.mp4
```

可用的場景 ID：`S01-Intro` / `S02-Login` / `S03-Dashboard` / `S04-Kanban` / `S05-IdeaWall` / `S06-Reflection` / `S07-Portfolio` / `S08-Outro`

---

## 修改場景內容

每個場景檔案位於 `src/scenes/`，皆為標準 React 元件，使用 Remotion 的 Hook：

| Hook | 用途 |
|------|------|
| `useCurrentFrame()` | 取得目前影格編號，用來驅動動畫 |
| `interpolate()` | 將影格編號對應到數值（透明度、位移等） |
| `spring()` | 彈性動畫效果 |

### 調整各場景時長

編輯 `src/Root.tsx` 中的 `D` 物件：

```ts
const D = {
  intro:      10 * FPS,  // 修改這裡的秒數
  kanban:     14 * FPS,
  // ...
};
```

---

## 專案結構

```
sdl-intro-video/
├── public/
│   └── screenshots/        # 系統頁面截圖（影片素材）
├── src/
│   ├── Root.tsx             # 場景排列與時長設定（主入口）
│   ├── index.ts             # Remotion 進入點
│   ├── components/
│   │   └── VideoKit.tsx     # 共用動畫元件（字卡、標注框等）
│   └── scenes/
│       ├── 01-Intro.tsx
│       ├── 02-Login.tsx
│       ├── 03-Dashboard.tsx
│       ├── 04-Kanban.tsx
│       ├── 05-IdeaWall.tsx
│       ├── 06-Reflection.tsx
│       ├── 07-Portfolio.tsx
│       └── 08-Outro.tsx
├── out/                     # 輸出影片（git 忽略）
├── remotion.config.ts
├── package.json
└── tsconfig.json
```

---

## 系統需求

- Node.js 18+
- 系統需運行 SDL 開發環境才能執行自動截圖腳本
  ```bash
  # 在專案根目錄
  docker compose -f docker-compose.dev.yml up -d
  ```
