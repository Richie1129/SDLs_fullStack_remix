import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  FakeCursor,
  HighlightBox,
  ProgressBar,
  SCALE,
  ScreenWrapper,
  StepCallout,
} from "../components/VideoKit";

const LABELS = ["開始", "登入", "儀表板", "看板", "想法牆", "反思", "歷程", "結束"];

export const LoginScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 0-60: 截圖進場
  const screenScale = interpolate(frame, [0, 60], [0.92, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const screenOpacity = interpolate(frame, [0, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleOpacity = interpolate(frame, [20, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 220-300: 最後標注淡入
  const jwtOpacity = interpolate(frame, [220, 240], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "#0a0f1e",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter','Noto Sans TC',sans-serif",
      }}
    >
      <ScreenWrapper
        title="使用者登入"
        subtitle="SDL Platform"
        accentColor="#22c55e"
        titleOpacity={titleOpacity}
        screenOpacity={screenOpacity}
        screenScale={screenScale}
      >
        {/* 截圖 */}
        <Img
          src={staticFile("screenshots/01-login.png")}
          style={{ width: 1600, display: "block" }}
        />

        {/* 60-120: 左側品牌面板標注 */}
        <StepCallout x={80} y={340} text="AI 輔助學習" color="#22c55e" delay={60} frame={frame} fps={fps} direction="right" />
        <StepCallout x={80} y={400} text="科學探究方法" color="#22c55e" delay={75} frame={frame} fps={fps} direction="right" />
        <StepCallout x={80} y={460} text="協作學習空間" color="#22c55e" delay={90} frame={frame} fps={fps} direction="right" />

        {/* 120-220: HighlightBox + FakeCursor */}
        {frame >= 130 && frame <= 300 && (
          <HighlightBox x={960} y={280} w={380} h={50} color="#f59e0b" delay={130} frame={frame} fps={fps} pulse={false} />
        )}
        {frame >= 160 && frame <= 300 && (
          <HighlightBox x={960} y={360} w={380} h={50} color="#f59e0b" delay={160} frame={frame} fps={fps} pulse={false} />
        )}
        {frame >= 185 && frame <= 300 && (
          <HighlightBox x={960} y={435} w={380} h={50} color="#22c55e" delay={185} frame={frame} fps={fps} pulse={true} />
        )}

        <FakeCursor
          path={[
            { frame: 120, x: 1100, y: 950 },
            { frame: 155, x: 1150, y: 310 },
            { frame: 175, x: 1150, y: 390 },
            { frame: 200, x: 1150, y: 465 },
            { frame: 220, x: 1150, y: 465 },
          ]}
          currentFrame={frame}
          clickFrames={[190, 210]}
        />

        {/* 220-300: JWT 標注 */}
        <StepCallout
          x={1000}
          y={500}
          text="支援 JWT 安全認證"
          color="#3b82f6"
          delay={220}
          frame={frame}
          fps={fps}
          direction="left"
        />
      </ScreenWrapper>

      <ProgressBar
        currentScene={1}
        totalScenes={8}
        labels={LABELS}
        frame={frame}
        fps={fps}
      />
    </AbsoluteFill>
  );
};
