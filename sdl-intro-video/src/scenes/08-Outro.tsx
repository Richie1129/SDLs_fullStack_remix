import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ProgressBar } from "../components/VideoKit";

const LABELS = ["開始", "登入", "儀表板", "看板", "想法牆", "反思", "歷程", "結束"];

const BADGES = [
  { label: "React 18", color: "#61dafb" },
  { label: "Node.js", color: "#68a063" },
  { label: "PostgreSQL", color: "#336791" },
  { label: "Socket.IO", color: "#25c2a0" },
  { label: "Gemini AI", color: "#4285f4" },
  { label: "Docker", color: "#2496ed" },
];

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 0-60: SDL logo spring 彈入
  const sScale = spring({ fps, frame: frame - 5, config: { damping: 80, stiffness: 180 } });
  const dScale = spring({ fps, frame: frame - 15, config: { damping: 80, stiffness: 180 } });
  const lScale = spring({ fps, frame: frame - 25, config: { damping: 80, stiffness: 180 } });

  // 60-100: 分隔線延伸
  const dividerW = interpolate(frame, [60, 100], [0, 500], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 100-150: 主標語淡入
  const tagline1Opacity = interpolate(frame, [100, 150], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const tagline1Y = interpolate(frame, [100, 150], [16, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 150-200: 副標語淡入
  const tagline2Opacity = interpolate(frame, [150, 200], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const tagline2Y = interpolate(frame, [150, 200], [12, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #0a0f1e 0%, #0d2137 50%, #0a0f1e 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter','Noto Sans TC',sans-serif",
      }}
    >
      {/* 背景同心圓 */}
      {[700, 500, 340, 200].map((size, i) => (
        <div
          key={size}
          style={{
            position: "absolute",
            width: size,
            height: size,
            borderRadius: "50%",
            border: `1px solid rgba(34,197,94,${0.03 + i * 0.025})`,
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
          }}
        />
      ))}

      {/* SDL Logo */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        {(
          [
            { letter: "S", scale: sScale, color: "#22c55e" },
            { letter: "D", scale: dScale, color: "#fff" },
            { letter: "L", scale: lScale, color: "#22c55e" },
          ] as { letter: string; scale: number; color: string }[]
        ).map(({ letter, scale, color }) => (
          <div
            key={letter}
            style={{
              fontSize: 100,
              fontWeight: 900,
              color,
              transform: `scale(${scale})`,
              lineHeight: 1,
              letterSpacing: -4,
              textShadow: color === "#22c55e" ? "0 0 50px rgba(34,197,94,0.45)" : "none",
            }}
          >
            {letter}
          </div>
        ))}
      </div>

      {/* 分隔線 */}
      <div
        style={{
          width: dividerW,
          height: 2,
          background: "linear-gradient(90deg, transparent, #22c55e, transparent)",
          marginBottom: 24,
        }}
      />

      {/* 主標語 */}
      <div
        style={{
          fontSize: 32,
          fontWeight: 700,
          color: "rgba(255,255,255,0.9)",
          letterSpacing: 2,
          opacity: tagline1Opacity,
          transform: `translateY(${tagline1Y}px)`,
          marginBottom: 12,
        }}
      >
        自主學習的最佳夥伴
      </div>

      {/* 副標語 */}
      <div
        style={{
          fontSize: 18,
          color: "rgba(255,255,255,0.45)",
          letterSpacing: 3,
          opacity: tagline2Opacity,
          transform: `translateY(${tagline2Y}px)`,
          marginBottom: 48,
        }}
      >
        Self-Directed · AI-Powered · Collaborative
      </div>

      {/* 技術 Badge 列 */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center", maxWidth: 700 }}>
        {BADGES.map(({ label, color }, i) => {
          const badgeDelay = 200 + i * 8;
          const s = spring({ fps, frame: frame - badgeDelay, config: { damping: 90, stiffness: 160 } });
          const op = interpolate(frame, [badgeDelay, badgeDelay + 10], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div
              key={label}
              style={{
                opacity: op,
                transform: `scale(${s})`,
                transformOrigin: "center center",
                background: `${color}18`,
                border: `1.5px solid ${color}55`,
                borderRadius: 20,
                padding: "7px 18px",
                fontSize: 14,
                fontWeight: 700,
                color,
                letterSpacing: 0.5,
                boxShadow: `0 0 14px ${color}30`,
              }}
            >
              {label}
            </div>
          );
        })}
      </div>

      <ProgressBar
        currentScene={7}
        totalScenes={8}
        labels={LABELS}
        frame={frame}
        fps={fps}
      />
    </AbsoluteFill>
  );
};
