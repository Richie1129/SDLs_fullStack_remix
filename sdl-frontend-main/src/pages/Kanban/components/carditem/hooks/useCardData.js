import { useState, useEffect } from 'react';
import { buildFileImageUrl } from '@/utils/fileUrlBuilder.js';

/**
 * useCardData - 管理卡片數據狀態
 *
 * 職責：
 * - 維護卡片的核心數據結構
 * - 處理圖片 URL 轉換（統一使用代理 API）
 * - 提供清晰的數據所有權
 *
 * Linus: "壞程序員關心代碼，好程序員關心數據結構"
 * 這個 hook 擁有 cardData，清晰的所有權。
 *
 * @param {Object} initialData - 初始卡片數據
 * @returns {{ cardData: Object, setCardData: Function }}
 */
export function useCardData(initialData) {
  const [cardData, setCardData] = useState({
    id: "",
    title: "",
    content: "",
    labels: [],
    owner: "",
    assignees: [],
    columnId: "",
    images: [],
    files: [],
  });

  useEffect(() => {
    // 完全按照原始 Carditem.jsx 的邏輯
    const processedImages = (initialData.images || []).map(imageUrl => {
      if (imageUrl.includes('sdls-files/')) {
        const fileName = imageUrl.split('/').pop();
        return buildFileImageUrl(fileName);
      }
      return imageUrl;
    });

    setCardData({
      ...initialData,
      images: processedImages,
      files: initialData.files || [],
      owner: initialData.owner || "",
    });
  }, [initialData]); // 保持原始邏輯：依賴整個 data 對象

  return { cardData, setCardData };
}
