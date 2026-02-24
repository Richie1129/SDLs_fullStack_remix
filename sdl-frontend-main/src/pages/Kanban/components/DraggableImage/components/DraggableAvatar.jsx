import React from "react";

const DraggableAvatar = ({
  position,
  isDragging,
  imgRef,
  onMouseDown,
  onClick,
  imageSrc = "/說話.png",
  isMobile = false,
}) => {
  // 手機：固定右下角 FAB（避免被拖離畫面、位置可預測）
  // 桌面：跟隨拖拽位置
  const avatarStyle = isMobile
    ? { right: 16, bottom: 96 }   // bottom: 96 = SubStageBar(~56px) + gap
    : { left: position.x, top: position.y + 150 };

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt="科學助手"
      className={`fixed cursor-pointer select-none z-[1000] ${
        isMobile ? 'w-14 h-14' : 'w-20 h-20'
      } rounded-full shadow-[0_4px_12px_rgba(91,164,145,0.3)] hover:shadow-[0_6px_20px_rgba(91,164,145,0.4)] ${
        isDragging && !isMobile ? 'transition-none' : 'transition-shadow duration-normal ease-in-out'
      }`}
      style={avatarStyle}
      onClick={onClick}
      onMouseDown={isMobile ? undefined : onMouseDown}
      draggable={false}
    />
  );
};

export default DraggableAvatar;