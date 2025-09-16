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
    top = Math.min(
      Math.max(padding, top),
      viewH - containerH - padding
    );

    return { left, top };
  };

  // 計算氣泡提示位置，避免被裁切
  const computeMessagePosition = (position) => {
    const padding = 8;
    const bubbleW = 300;
    const imgW = 80;
    const viewW = window.innerWidth;

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

    // 垂直位置維持靠近圖示下方
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