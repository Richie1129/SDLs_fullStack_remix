import { useState, useEffect, useRef } from 'react';
import { buildFileImageUrl } from '@/utils/fileUrlBuilder.js';

const emptyCard = () => ({
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

/**
 * 把 props 傳入的卡片資料轉成內部格式：
 * - `sdls-files/` 的圖片路徑統一走代理 API
 * - files / owner 補預設值
 */
function normalizeCard(initialData) {
  if (!initialData) return emptyCard();
  const processedImages = (initialData.images || []).map((imageUrl) => {
    if (typeof imageUrl === 'string' && imageUrl.includes('sdls-files/')) {
      const fileName = imageUrl.split('/').pop();
      return buildFileImageUrl(fileName);
    }
    return imageUrl;
  });

  return {
    ...emptyCard(),
    ...initialData,
    images: processedImages,
    files: initialData.files || [],
    owner: initialData.owner || "",
  };
}

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
  // 首幀就用 props 初始化，避免第一次 render 出現沒有標題的白殼
  const [cardData, setCardData] = useState(() => normalizeCard(initialData));
  const isFirstRunRef = useRef(true);

  useEffect(() => {
    // 掛載那一次 state 已經是 props 的內容，跳過以免多一次 render
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false;
      return;
    }
    setCardData(normalizeCard(initialData));
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
