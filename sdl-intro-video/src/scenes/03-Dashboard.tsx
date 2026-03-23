import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  HighlightBox,
  ProgressBar,
  ScreenWrapper,
  StepCallout,
} from "../components/VideoKit";

const LABELS = ["開始", "登入", "儀表板", "看板", "想法牆", "反思", "歷程", "結束"];

export const DashboardScene: React.FC = () => {
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

  // 120-200: zoom in 到專案卡片區域
  const zoomScale = interpolate(frame, [120, 200], [1, 1.3], {
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
        title="學習儀表板"
        subtitle="SDL Platform"
        accentColor="#22c55e"
        titleOpacity={titleOpacity}
        screenOpacity={screenOpacity}
        screenScale={screenScale * zoomScale}
      >
        {/* 截圖 */}
        <Img
          src={staticFile("screenshots/02-dashboard.png")}
          style={{ width: 1600, display: "block" }}
        />

        {/* 60-120: 頂部統計標注 */}
        <StepCallout
          x={200}
          y={80}
          text="查看個人學習概況"
          color="#22c55e"
          delay={60}
          frame={frame}
          fps={fps}
          direction="right"
        />
        <StepCallout
          x={700}
          y={80}
          text="快速切換學習階段"
          color="#f59e0b"
          delay={80}
          frame={frame}
          fps={fps}
          direction="right"
        />

        {/* 200-300: 卡片區域 HighlightBox + StepCallout */}
        <HighlightBox
          x={160}
          y={200}
          w={500}
          h={300}
          color="#22c55e"
          delay={200}
          frame={frame}
          fps={fps}
          pulse={true}
        />
        <StepCallout
          x={700}
          y={400}
          text="點擊進入專案"
          color="#22c55e"
          delay={200}
          frame={frame}
          fps={fps}
          direction="left"
        />
        <HighlightBox
          x={680}
          y={200}
          w={500}
          h={300}
          color="#3b82f6"
          delay={220}
          frame={frame}
          fps={fps}
          pulse={true}
        />
        <StepCallout
          x={500}
          y={560}
          text="多個專案並行管理"
          color="#3b82f6"
          delay={240}
          frame={frame}
          fps={fps}
          direction="right"
        />
      </ScreenWrapper>

      <ProgressBar
        currentScene={2}
        totalScenes={8}
        labels={LABELS}
        frame={frame}
        fps={fps}
      />
    </AbsoluteFill>
  );
};
