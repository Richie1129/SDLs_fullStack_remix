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
    // deps 改成具體欄位（F6）：父層重新 render 傳入同內容的新物件時不再重算；
    // 任一欄位（含陣列引用）變動仍會重新處理
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initialData.id,
    initialData.title,
    initialData.content,
    initialData.labels,
    initialData.owner,
    initialData.assignees,
    initialData.columnId,
    initialData.images,
    initialData.files,
    initialData.dueDate,
    initialData.createdAt,
    initialData.updatedAt,
  ]);

  return { cardData, setCardData };
}
