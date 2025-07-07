# 📝 Console 日誌輸出說明

當你成功上傳檔案時，將會在 console 中看到詳細的操作日誌。

## 🚀 檔案上傳成功時的 Console 輸出

### 1. 通用檔案上傳 (`/api/upload`)
```
=== MinIO 檔案上傳結果 ===
上傳的檔案數量: 2
MinIO 上傳檔案詳情: [
  {
    fileName: '1703123456789-abc123-example.jpg',
    originalName: 'example.jpg',
    url: 'http://localhost:9000/sdl-files/1703123456789-abc123-example.jpg',
    mimeType: 'image/jpeg',
    size: 156789
  },
  // ... 更多檔案
]
✅ 檔案上傳成功!
處理後的檔案資訊: [檔案陣列]
========================
```

### 2. 個人日誌上傳 (`/api/daily`)
```
=== 創建個人日誌 ===
用戶ID: 123
專案ID: 456
標題: 我的日誌標題
內容: 日誌內容
上傳的檔案: [檔案陣列]
📁 檢測到 1 個檔案
處理檔案 1/1: {
  fileName: '1703123456789-abc123-document.pdf',
  originalName: 'document.pdf',
  url: 'http://localhost:9000/sdl-files/1703123456789-abc123-document.pdf',
  size: 245678
}
✅ 創建個人日誌成功 (1 個檔案)
==================
```

### 3. 團隊日誌上傳 (`/api/daily/team`)
```
=== 創建團隊日誌 ===
用戶ID: 123
專案ID: 456
創建者: John Doe
標題: 團隊日誌標題
內容: 團隊日誌內容
上傳的檔案: [檔案陣列]
📁 檢測到 2 個檔案
處理檔案 1/2: { fileName: 'file1.jpg', ... }
處理檔案 2/2: { fileName: 'file2.pdf', ... }
✅ 創建團隊日誌成功 (2 個檔案)
==================
```

### 4. 提交檔案上傳 (`/api/submit`)
```
=== 創建提交 ===
接收到的資料: { content: '...', currentStage: '1', currentSubStage: '2' }
接收到的檔案: [檔案陣列]
階段: 1-2
專案ID: 456
內容: {"描述": "提交內容"}
📁 檢測到 1 個檔案
處理檔案 1/1: { fileName: 'submission.docx', ... }
✅ 創建 Submit 成功 (1 個檔案)
==================
```

### 5. 更新檔案 (`PUT` 請求)
```
=== 更新個人日誌 ===
日誌ID: 789
新標題: 更新後的標題
新內容: 更新後的內容
上傳的檔案: { fileName: 'new-file.jpg', ... }
📁 檢測到新檔案上傳: {
  fileName: '1703123456789-xyz789-new-file.jpg',
  originalName: 'new-file.jpg',
  url: 'http://localhost:9000/sdl-files/1703123456789-xyz789-new-file.jpg',
  size: 98765
}
✅ 更新個人日誌成功: 789
==================
```

## 📁 取得檔案時的 Console 輸出

### 1. 取得所有提交
```
=== 取得所有提交 ===
專案ID: 456
找到 5 筆提交記錄
檔案資訊: {
  fileName: '1703123456789-abc123-file.pdf',
  originalName: 'file.pdf',
  fileUrl: 'http://localhost:9000/sdl-files/1703123456789-abc123-file.pdf'
}
✅ 成功取得所有提交
==================
```

### 2. 取得單一提交檔案
```
=== 取得提交檔案 ===
提交ID: 123
✅ 取得檔案資訊: {
  fileName: '1703123456789-abc123-document.pdf',
  originalName: 'document.pdf',
  fileUrl: 'http://localhost:9000/sdl-files/1703123456789-abc123-document.pdf'
}
==================
```

## ❌ 錯誤情況的 Console 輸出

### 1. 沒有檔案上傳
```
=== MinIO 檔案上傳結果 ===
上傳的檔案數量: 0
❌ 沒有檔案被上傳
```

### 2. MinIO 連線失敗
```
❌ 檔案上傳失敗: Error: MinIO 服務無法連接
```

### 3. 找不到檔案
```
=== 取得提交檔案 ===
提交ID: 999
❌ 無檔案附件
```

## 🔧 如何啟用詳細日誌

1. **確保已安裝 MinIO 依賴項**：
   ```bash
   npm run quick-install
   ```

2. **啟動 MinIO 服務**：
   ```bash
   docker run -d --name minio-dev -p 9000:9000 -p 9001:9001 \
     -e "MINIO_ROOT_USER=minioadmin" -e "MINIO_ROOT_PASSWORD=minioadmin" \
     minio/minio server /data --console-address ":9001"
   ```

3. **創建 bucket**：
   - 訪問 http://localhost:9001
   - 使用 minioadmin/minioadmin 登入
   - 創建名為 `sdl-files` 的 bucket

4. **重啟應用程式**：
   ```bash
   npm run dev
   ```

5. **測試上傳**：
   使用任何檔案上傳 API 端點，檢查 console 輸出

## 📋 日誌說明

- **`===`** 開始和結束標記：清楚標示每個操作的範圍
- **`📁`** 檔案相關操作：檔案處理、上傳等
- **`📝`** 純文字操作：無檔案的內容操作
- **`✅`** 成功操作：操作成功完成
- **`❌`** 錯誤操作：操作失敗或錯誤
- **`⚠️`** 警告信息：非致命性問題

這些日誌幫助你：
- 確認檔案是否成功上傳到 MinIO
- 追蹤檔案的處理流程
- 調試上傳相關問題
- 監控系統運行狀態 