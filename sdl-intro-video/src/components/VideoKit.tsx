/**
 * VideoKit — 共用動畫元件
 *
 * 截圖顯示於 1600px 寬，縮放比例 = 1600/1920 ≈ 0.8333
 * 在截圖座標 (sx, sy) → 疊加層座標 (sx * SCALE, sy * SCALE)
 */
import React from "react";
import { interpolate, spring } from "remotion";

export const SCALE = 1600 / 1920; // 0.8333 — 截圖座標轉換比例

// ─── 截圖外框 ──────────────────────────────────────────────────────────────
export const ScreenWrapper: React.FC<{
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  accentColor?: string;
  titleOpacity: number;
  screenOpacity: number;
  screenScale?: number;
  screenX?: number;
  screenY?: number;
}> = ({
  children, title, subtitle, accentColor = "#22c55e",
  titleOpacity, screenOpacity, screenScale = 1, screenX = 0, screenY = 0,
}) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
    {/* 標題 */}
    <div style={{ opacity: titleOpacity, textAlign: "center", marginBottom: 20, transition: "none" }}>
      <div style={{ fontSize: 13, color: accentColor, letterSpacing: 5, textTransform: "uppercase", marginBottom: 8, fontWeight: 700 }}>
        {subtitle}
      </div>
      <div style={{ fontSize: 40, fontWeight: 900, color: "#fff", letterSpacing: -1 }}>{title}</div>
    </div>
    {/* 截圖容器 */}
    <div style={{
      width: 1600, borderRadius: 14, overflow: "hidden",
      boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
      opacity: screenOpacity,
      transform: `scale(${screenScale}) translate(${screenX}px,${screenY}px)`,
      transformOrigin: "center center",
      position: "relative",
      border: "1px solid rgba(255,255,255,0.08)",
    }}>
      {children}
    </div>
  </div>
);

// ─── 步驟標注氣泡 ──────────────────────────────────────────────────────────
export const StepCallout: React.FC<{
  x: number; y: number;        // 截圖座標 (會自動 × SCALE)
  text: string;
  color?: string;
  step?: number;
  delay: number;
  frame: number;
  fps: number;
  direction?: "right" | "left" | "down";
}> = ({ x, y, text, color = "#22c55e", step, delay, frame, fps, direction = "right" }) => {
  const s = spring({ fps, frame: frame - delay, config: { damping: 100, stiffness: 200 } });
  const op = interpolate(frame, [delay, delay + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // 尾巴位置
  const tail: React.CSSProperties =
    direction === "right" ? { left: -8, top: "50%", transform: "translateY(-50%)", borderRight: `8px solid ${color}`, borderTop: "6px solid transparent", borderBottom: "6px solid transparent" } :
    direction === "left"  ? { right: -8, top: "50%", transform: "translateY(-50%)", borderLeft: `8px solid ${color}`, borderTop: "6px solid transparent", borderBottom: "6px solid transparent" } :
    { left: "50%", bottom: -8, transform: "translateX(-50%)", borderTop: `8px solid ${color}`, borderLeft: "6px solid transparent", borderRight: "6px solid transparent" };

  return (
    <div style={{
      position: "absolute",
      left: x * SCALE,
      top: y * SCALE,
      opacity: op,
      transform: `scale(${s})`,
      transformOrigin: "left center",
      display: "flex",
      alignItems: "center",
      gap: 8,
      pointerEvents: "none",
      zIndex: 20,
    }}>
      {step !== undefined && (
        <div style={{
          width: 26, height: 26, borderRadius: "50%",
          background: color, display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 13, fontWeight: 900,
          color: "#fff", flexShrink: 0,
          boxShadow: `0 0 12px ${color}80`,
        }}>
          {step}
        </div>
      )}
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", ...tail }} />
        <div style={{
          background: color,
          borderRadius: 8,
          padding: "7px 14px",
          fontSize: 16,
          fontWeight: 700,
          color: "#fff",
          whiteSpace: "nowrap",
          boxShadow: `0 4px 16px ${color}50`,
        }}>
          {text}
        </div>
      </div>
    </div>
  );
};

// ─── 閃爍高亮框 ────────────────────────────────────────────────────────────
export const HighlightBox: React.FC<{
  x: number; y: number; w: number; h: number;  // 截圖座標
  color?: string;
  delay: number;
  frame: number;
  fps: number;
  pulse?: boolean;
}> = ({ x, y, w, h, color = "#f59e0b", delay, frame, fps, pulse = true }) => {
  const op = interpolate(frame, [delay, delay + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const glow = pulse
    ? 8 + Math.sin((frame - delay) * 0.15) * 4
    : 8;

  return (
    <div style={{
      position: "absolute",
      left: x * SCALE,
      top: y * SCALE,
      width: w * SCALE,
      height: h * SCALE,
      border: `2.5px solid ${color}`,
      borderRadius: 8,
      opacity: op,
      boxShadow: `0 0 ${glow}px ${color}90, inset 0 0 ${glow / 2}px ${color}20`,
      pointerEvents: "none",
      zIndex: 15,
    }} />
  );
};

// ─── 模擬游標 ──────────────────────────────────────────────────────────────
export const FakeCursor: React.FC<{
  // 多個路徑點 [{frame, x, y}] — 截圖座標
  path: { frame: number; x: number; y: number }[];
  currentFrame: number;
  clickFrames?: number[];   // 哪些幀顯示點擊效果
}> = ({ path, currentFrame, clickFrames = [] }) => {
  if (path.length < 2) return null;

  // 找當前所在的段
  let cx = path[0].x, cy = path[0].y;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1];
    if (currentFrame >= a.frame && currentFrame <= b.frame) {
      const t = (currentFrame - a.frame) / (b.frame - a.frame);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // easeInOut
      cx = a.x + (b.x - a.x) * ease;
      cy = a.y + (b.y - a.y) * ease;
      break;
    }
    if (currentFrame > b.frame) { cx = b.x; cy = b.y; }
  }

  const isClick = clickFrames.some(f => Math.abs(currentFrame - f) < 8);
  const clickScale = isClick ? 0.8 : 1;

  const firstPoint = path[0];
  const lastPoint = path[path.length - 1];
  const visible = currentFrame >= firstPoint.frame - 5 && currentFrame <= lastPoint.frame + 15;
  if (!visible) return null;

  return (
    <div style={{
      position: "absolute",
      left: cx * SCALE - 8,
      top: cy * SCALE - 4,
      pointerEvents: "none",
      zIndex: 30,
      transform: `scale(${clickScale})`,
      transformOrigin: "top left",
    }}>
      {/* 游標 SVG */}
      <svg width="28" height="32" viewBox="0 0 28 32">
        <filter id="shadow">
          <feDropShadow dx="1" dy="2" stdDeviation="2" floodOpacity="0.5" />
        </filter>
        <path
          d="M4 2 L4 26 L10 20 L15 30 L18 29 L13 19 L22 19 Z"
          fill="white"
          stroke="#333"
          strokeWidth="1.5"
          filter="url(#shadow)"
        />
      </svg>
      {/* 點擊漣漪 */}
      {isClick && (
        <div style={{
          position: "absolute",
          left: -12, top: -8,
          width: 36, height: 36,
          borderRadius: "50%",
          border: "2px solid rgba(34,197,94,0.8)",
          animation: "none",
          opacity: 1 - Math.abs(currentFrame - clickFrames.find(f => Math.abs(currentFrame - f) < 8)!) / 8,
        }} />
      )}
    </div>
  );
};

// ─── 底部進度列 ────────────────────────────────────────────────────────────
export const ProgressBar: React.FC<{
  currentScene: number;
  totalScenes: number;
  labels: string[];
  frame: number;
  fps: number;
}> = ({ currentScene, totalScenes, labels, frame, fps }) => {
  const op = interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{
      position: "absolute",
      bottom: 0, left: 0, right: 0,
      height: 44,
      background: "rgba(0,0,0,0.75)",
      backdropFilter: "blur(8px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      opacity: op,
      zIndex: 50,
    }}>
      {labels.map((label, i) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "4px 10px",
            borderRadius: 20,
            background: i === currentScene ? "rgba(34,197,94,0.25)" : "transparent",
            border: i === currentScene ? "1px solid #22c55e" : "1px solid rgba(255,255,255,0.1)",
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: i < currentScene ? "#22c55e" : i === currentScene ? "#22c55e" : "rgba(255,255,255,0.3)",
            }} />
            <span style={{ fontSize: 11, color: i === currentScene ? "#22c55e" : "rgba(255,255,255,0.4)", fontWeight: i === currentScene ? 700 : 400 }}>
              {label}
            </span>
          </div>
          {i < labels.length - 1 && <div style={{ width: 16, height: 1, background: "rgba(255,255,255,0.15)" }} />}
        </div>
      ))}
    </div>
  );
};

// ─── 新增動作展示卡片（模擬 UI 元件出現）────────────────────────────────
export const FakeTaskCard: React.FC<{
  title: string;
  tag: string;
  tagColor: string;
  x: number; y: number;  // 截圖座標
  delay: number;
  frame: number;
  fps: number;
}> = ({ title, tag, tagColor, x, y, delay, frame, fps }) => {
  const s = spring({ fps, frame: frame - delay, config: { damping: 80, stiffness: 150 } });
  const op = interpolate(frame, [delay, delay + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute",
      left: x * SCALE,
      top: y * SCALE,
      width: 180 * SCALE,
      opacity: op,
      transform: `scale(${s})`,
      transformOrigin: "top center",
      background: "#fff",
      border: "1px solid rgba(0,0,0,0.12)",
      borderRadius: 8,
      padding: "10px 12px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
      zIndex: 25,
      pointerEvents: "none",
    }}>
      <div style={{ fontSize: 12, color: "#1e293b", marginBottom: 8, lineHeight: 1.4, fontWeight: 600 }}>{title}</div>
      <div style={{
        display: "inline-block", fontSize: 10, color: tagColor,
        background: `${tagColor}18`, border: `1px solid ${tagColor}44`,
        borderRadius: 4, padding: "2px 7px", fontWeight: 600,
      }}>{tag}</div>
    </div>
  );
};

// ─── 新增節點氣泡 ──────────────────────────────────────────────────────────
export const FakeNode: React.FC<{
  text: string;
  color: string;
  x: number; y: number;
  delay: number;
  frame: number;
  fps: number;
}> = ({ text, color, x, y, delay, frame, fps }) => {
  const s = spring({ fps, frame: frame - delay, config: { damping: 70, stiffness: 120 } });
  const op = interpolate(frame, [delay, delay + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute",
      left: x * SCALE,
      top: y * SCALE,
      opacity: op,
      transform: `scale(${s})`,
      transformOrigin: "center center",
      background: `${color}22`,
      border: `2px solid ${color}`,
      borderRadius: 10,
      padding: "10px 14px",
      fontSize: 13,
      fontWeight: 700,
      color,
      maxWidth: 160,
      textAlign: "center",
      boxShadow: `0 0 20px ${color}40`,
      zIndex: 25,
      pointerEvents: "none",
    }}>
      {text}
    </div>
  );
};
