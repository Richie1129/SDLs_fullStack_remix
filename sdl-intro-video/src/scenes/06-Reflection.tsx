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

export const ReflectionScene: React.FC = () => {
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
        title="5Rs 反思日誌"
        subtitle="SDL Platform"
        accentColor="#8b5cf6"
        titleOpacity={titleOpacity}
        screenOpacity={screenOpacity}
        screenScale={screenScale}
      >
        {/* 截圖 */}
        <Img
          src={staticFile("screenshots/07-reflection.png")}
          style={{ width: 1600, display: "block" }}
        />

        {/* 60-140: 主要說明 */}
        <StepCallout
          x={400}
          y={200}
          text="1. 撰寫每日學習反思"
          color="#8b5cf6"
          delay={60}
          frame={frame}
          fps={fps}
          direction="right"
        />
        <HighlightBox
          x={160}
          y={60}
          w={1740}
          h={900}
          color="#8b5cf6"
          delay={60}
          frame={frame}
          fps={fps}
          pulse={false}
        />

        {/* 140-220: 5Rs 說明 */}
        <StepCallout
          x={200}
          y={820}
          text="R1 Reporting — 描述發生了什麼"
          color="#3b82f6"
          delay={140}
          frame={frame}
          fps={fps}
          direction="right"
        />
        <StepCallout
          x={200}
          y={860}
          text="R2 Responding — 你的感受與反應"
          color="#8b5cf6"
          delay={155}
          frame={frame}
          fps={fps}
          direction="right"
        />
        <StepCallout
          x={200}
          y={900}
          text="R3 Relating — 連結過去的知識"
          color="#22c55e"
          delay={170}
          frame={frame}
          fps={fps}
          direction="right"
        />
        <StepCallout
          x={200}
          y={940}
          text="R4 Reasoning — 分析原因"
          color="#f59e0b"
          delay={185}
          frame={frame}
          fps={fps}
          direction="right"
        />
        <StepCallout
          x={200}
          y={980}
          text="R5 Reconstructing — 建立新認知"
          color="#ec4899"
          delay={200}
          frame={frame}
          fps={fps}
          direction="right"
        />

        {/* 220-300: AI 分析區 */}
        <StepCallout
          x={700}
          y={400}
          text="AI 即時分析每個反思層次"
          color="#3b82f6"
          delay={220}
          frame={frame}
          fps={fps}
          direction="right"
        />
        <HighlightBox
          x={1400}
          y={100}
          w={480}
          h={800}
          color="#3b82f6"
          delay={230}
          frame={frame}
          fps={fps}
          pulse={true}
        />
      </ScreenWrapper>

      <ProgressBar
        currentScene={5}
        totalScenes={8}
        labels={LABELS}
        frame={frame}
        fps={fps}
      />
    </AbsoluteFill>
  );
};
