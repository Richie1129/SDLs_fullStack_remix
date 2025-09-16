import { useState, useRef, useEffect } from "react";

export const useDraggable = (containerRef) => {
  const initialPosition = { x: window.innerWidth - 100, y: window.innerHeight / 2 };
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);

  const imgRef = useRef(null);
  const dragStateRef = useRef({
    offsetX: 0,
    offsetY: 0,
    containerRect: null,
    imgW: 0,
    imgH: 0,
    lastLeft: 0,
    lastTop: 0
  });
  const dragIntentRef = useRef({ moved: false, startX: 0, startY: 0 });
  const draggingRef = useRef(false);

  // 響應視窗大小變化，保持貼齊右側
  useEffect(() => {
    const handleResize = () => {
      setPosition((prevPosition) => ({
        x: window.innerWidth - 100,
        y: prevPosition.y,
      }));
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getBounds = () => {
    const containerRect = dragStateRef.current.containerRect || (containerRef?.current
      ? containerRef.current.getBoundingClientRect()
      : { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight, width: window.innerWidth, height: window.innerHeight });
    return { containerRect };
  };

  const onMouseDown = (e) => {
    const imgEl = imgRef.current;
    if (!imgEl) return;
    e.preventDefault();

    const rect = imgEl.getBoundingClientRect();
    const containerRect = containerRef?.current
      ? containerRef.current.getBoundingClientRect()
      : { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight, width: window.innerWidth, height: window.innerHeight };

    dragStateRef.current.offsetX = e.clientX - rect.left;
    dragStateRef.current.offsetY = e.clientY - rect.top;
    dragStateRef.current.containerRect = containerRect;
    dragStateRef.current.imgW = imgEl.offsetWidth || 0;
    dragStateRef.current.imgH = imgEl.offsetHeight || 0;
    dragStateRef.current.lastLeft = rect.left;
    dragStateRef.current.lastTop = rect.top;

    dragIntentRef.current.startX = e.clientX;
    dragIntentRef.current.startY = e.clientY;
    dragIntentRef.current.moved = false;

    draggingRef.current = true;
    setIsDragging(true);

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const onMouseMove = (e) => {
    if (!draggingRef.current) return;

    const bounds = getBounds();
    if (!bounds) return;

    const { containerRect } = bounds;
    const imgEl = imgRef.current;
    const imgW = dragStateRef.current.imgW || imgEl?.offsetWidth || 0;
    const imgH = dragStateRef.current.imgH || imgEl?.offsetHeight || 0;

    let targetLeft = e.clientX - dragStateRef.current.offsetX;
    let targetTop = e.clientY - dragStateRef.current.offsetY;

    // 限制在容器內
    const minLeft = containerRect.left;
    const maxLeft = containerRect.right - imgW;
    const minTop = containerRect.top;
    const maxTop = containerRect.bottom - imgH;

    if (targetLeft < minLeft) targetLeft = minLeft;
    if (targetLeft > maxLeft) targetLeft = maxLeft;
    if (targetTop < minTop) targetTop = minTop;
    if (targetTop > maxTop) targetTop = maxTop;

    // 檢測是否為有意拖拽
    const moveDX = Math.abs(e.clientX - dragIntentRef.current.startX);
    const moveDY = Math.abs(e.clientY - dragIntentRef.current.startY);
    if (moveDX > 3 || moveDY > 3) {
      dragIntentRef.current.moved = true;
    }

    // 立即以 DOM 方式移動，避免頻繁 re-render
    dragStateRef.current.lastLeft = targetLeft;
    dragStateRef.current.lastTop = targetTop;
    if (imgEl) {
      imgEl.style.left = `${Math.round(targetLeft)}px`;
      imgEl.style.top = `${Math.round(targetTop)}px`;
    }
  };

  const onMouseUp = () => {
    draggingRef.current = false;
    setIsDragging(false);

    // 將最終位置同步到 React 狀態
    const finalLeft = dragStateRef.current.lastLeft;
    const finalTop = dragStateRef.current.lastTop;
    if (Number.isFinite(finalLeft) && Number.isFinite(finalTop)) {
      setPosition({ x: Math.round(finalLeft), y: Math.round(finalTop - 150) });
    }

    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  };

  const handleClick = (onImageClick) => {
    if (dragIntentRef.current.moved) return; // 拖拽後不觸發點擊
    onImageClick?.();
  };

  return {
    position,
    isDragging,
    imgRef,
    dragIntentRef,
    draggingRef,
    onMouseDown,
    handleClick,
  };
};