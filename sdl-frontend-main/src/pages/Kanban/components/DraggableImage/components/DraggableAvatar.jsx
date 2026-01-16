import React from "react";

const DraggableAvatar = ({
  position,
  isDragging,
  imgRef,
  onMouseDown,
  onClick,
  imageSrc = "/說話.png"
}) => {
  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt="科學助手"
      className={`fixed cursor-pointer select-none z-[1000] w-20 h-20 rounded-full shadow-[0_4px_12px_rgba(91,164,145,0.3)] hover:shadow-[0_6px_20px_rgba(91,164,145,0.4)] ${
        isDragging ? 'transition-none' : 'transition-shadow duration-normal ease-in-out'
      }`}
      style={{ left: position.x, top: position.y + 150 }}
      onClick={onClick}
      onMouseDown={onMouseDown}
      draggable={false}
    />
  );
};

export default DraggableAvatar;