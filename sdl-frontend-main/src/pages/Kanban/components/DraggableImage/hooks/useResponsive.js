import { useState, useEffect } from "react";

export const useResponsive = () => {
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 計算聊天視窗位置，確保不被裁切
  const computeChatPosition = (position, showSidebar, isFullscreen) => {
    if (isFullscreen) {
      return { left: 0, top: 0 };
    }

    const padding = 8;
    const imgW = 80;
    const containerW = showSidebar ? 580 : 380;
    const containerH = 520;
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;

    // 優先顯示在圖示左側；若左側空間不足，改顯示在右側
    let left;
    const preferLeft = position.x - containerW;
    const canPlaceLeft = preferLeft >= padding;
    const rightSideLeft = position.x + imgW + padding;
    const canPlaceRight = rightSideLeft + containerW + padding <= viewW;

    if (canPlaceLeft) {
      left = preferLeft;
    } else if (canPlaceRight) {
      left = rightSideLeft;
    } else {
      // 左右都不夠，強制夾在畫面內
      left = Math.min(
        Math.max(padding, preferLeft),
        viewW - containerW - padding
      );
    }

    // 垂直方向也做夾取，避免超出上下邊界
    let top = position.y - 200;
    
    // Linus: 修復小螢幕計算錯誤
    // 1. 絕對優先：Top 必須 >= padding (保證標題列可見)
    top = Math.max(padding, top);

    // 2. 只有在螢幕高度足夠時，才考慮底部邊界
    // 如果 viewH < containerH，這個檢查會被忽略，top 維持在 padding
    if (viewH > containerH + padding * 2) {
      top = Math.min(top, viewH - containerH - padding);
    }

    return { left, top };
  };

  // 計算氣泡提示位置，避免被裁切
  const computeMessagePosition = (position) => {
    const padding = 8;
    const viewW = window.innerWidth;

    // 手機：FAB 固定在右下角 (right:16, bottom:96)，氣泡對齊 FAB 左側
    // 使用 right 定位，避免計算 position.x 時 SideBar 重疊問題
    if (viewW < 768) {
      const bubbleW = Math.min(240, viewW - 80); // 手機氣泡縮小，確保不超出螢幕
      return {
        right: 16,          // 對齊 FAB 右邊
        bottom: 160,        // FAB bottom:96 + avatar height 56 + gap
        left: 'auto',
        top: 'auto',
        maxWidth: bubbleW,
      };
    }

    // 桌面：依頭像位置計算
    const bubbleW = 300;
    const imgW = 80;
    let left;
    const preferLeft = position.x - (bubbleW - 20);
    const canPlaceLeft = preferLeft >= padding;
    const rightSideLeft = position.x + imgW + padding;
    const canPlaceRight = rightSideLeft + bubbleW + padding <= viewW;

    if (canPlaceLeft) {
      left = preferLeft;
    } else if (canPlaceRight) {
      left = rightSideLeft;
    } else {
      left = Math.min(Math.max(padding, preferLeft), viewW - bubbleW - padding);
    }

    const top = position.y + 165;
    return { left, top };
  };

  // 獲取響應式樣式類名
  const getResponsiveClasses = (base, mobile, desktop) => {
    return screenWidth < 768 ? `${base} ${mobile}` : `${base} ${desktop}`;
  };

  // 獲取響應式尺寸
  const getResponsiveSize = (mobileSize, desktopSize) => {
    return screenWidth < 768 ? mobileSize : desktopSize;
  };

  // 檢查是否為移動設備
  const isMobile = screenWidth < 768;

  return {
    screenWidth,
    isMobile,
    computeChatPosition,
    computeMessagePosition,
    getResponsiveClasses,
    getResponsiveSize,
  };
};