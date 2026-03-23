import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sScale = spring({ fps, frame: frame - 5, config: { damping: 80 } });
  const dScale = spring({ fps, frame: frame - 15, config: { damping: 80 } });
  const lScale = spring({ fps, frame: frame - 25, config: { damping: 80 } });

  const subtitleOpacity = interpolate(frame, [40, 58], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const subtitleY = interpolate(frame, [40, 58], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const taglineOpacity = interpolate(frame, [62, 80], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const dividerW = interpolate(frame, [68, 88], [0, 360], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #0a0f1e 0%, #0d2137 50%, #0a0f1e 100%)",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        fontFamily: "'Inter', 'Noto Sans TC', sans-serif",
      }}
    >
      {/* 背景同心圓 */}
      {[700, 500, 340].map((size, i) => (
        <div
          key={size}
          style={{
            position: "absolute",
            width: size,
            height: size,
            borderRadius: "50%",
            border: `1px solid rgba(34,197,94,${0.04 + i * 0.03})`,
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
          }}
        />
      ))}

      {/* SDL 主標 */}
      <div style={{ display: "flex", gap: 20, marginBottom: 24 }}>
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
              fontSize: 152,
              fontWeight: 900,
              color,
              transform: `scale(${scale})`,
              lineHeight: 1,
              letterSpacing: -6,
              textShadow: color === "#22c55e" ? "0 0 60px rgba(34,197,94,0.4)" : "none",
            }}
          >
            {letter}
          </div>
        ))}
      </div>

      {/* 副標 */}
      <div
        style={{
          fontSize: 30,
          color: "rgba(255,255,255,0.8)",
          fontWeight: 300,
          letterSpacing: 6,
          opacity: subtitleOpacity,
          transform: `translateY(${subtitleY}px)`,
          textTransform: "uppercase",
        }}
      >
        Self-Directed Learning Platform
      </div>

      {/* 分隔線 */}
      <div
        style={{
          width: dividerW,
          height: 2,
          background: "linear-gradient(90deg, transparent, #22c55e, transparent)",
          margin: "22px 0",
        }}
      />

      {/* 標語 */}
      <div
        style={{
          fontSize: 20,
          color: "rgba(255,255,255,0.45)",
          opacity: taglineOpacity,
          letterSpacing: 3,
        }}
      >
        科學探究 × AI 輔助 × 協作學習
      </div>
    </AbsoluteFill>
  );
};
