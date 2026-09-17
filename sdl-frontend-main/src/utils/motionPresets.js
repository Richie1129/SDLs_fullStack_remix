/**
 * framer-motion 共用動畫 preset。
 * 曲線與時長對應 tailwind.config.cjs 的 token：
 *   DRAWER_EASE  = ease-drawer  cubic-bezier(0.32, 0.72, 0, 1)
 *   duration 0.4 = duration-slow 400ms
 * 位移用完整 transform 字串而非 x/y 簡寫，讓瀏覽器走合成層。
 */
export const DRAWER_EASE = [0.32, 0.72, 0, 1];

export const DRAWER_RIGHT = {
  initial: { transform: 'translateX(100%)', opacity: 0 },
  animate: { transform: 'translateX(0%)', opacity: 1 },
  exit: { transform: 'translateX(100%)', opacity: 0 },
  transition: { duration: 0.4, ease: DRAWER_EASE },
};
