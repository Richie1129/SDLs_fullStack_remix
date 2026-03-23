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

export const PortfolioScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 0-60: 截圖一進場
  const screen1Scale = interpolate(frame, [0, 60], [0.92, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const screen1Opacity = interpolate(frame, [0, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 150-180: 截圖一淡出
  const screen1FadeOut = interpolate(frame, [150, 180], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 180-240: 截圖三進場
  const screen3Opacity = interpolate(frame, [180, 230], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const screen3Scale = interpolate(frame, [180, 240], [0.92, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 標題切換
  const title1Opacity = interpolate(frame, [20, 60, 150, 175], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const title2Opacity = interpolate(frame, [180, 220], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const showScreen1 = frame < 185;
  const showScreen3 = frame >= 175;

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
      {/* 截圖一：提交任務 */}
      {showScreen1 && (
        <div style={{ opacity: screen1FadeOut, position: "absolute", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <ScreenWrapper
            title="學習歷程上傳"
            subtitle="SDL Platform"
            accentColor="#06b6d4"
            titleOpacity={title1Opacity}
            screenOpacity={screen1Opacity}
            screenScale={screen1Scale}
          >
            <Img
              src={staticFile("screenshots/06-submit.png")}
              style={{ width: 1600, display: "block" }}
            />

            {/* 60-150: 上傳功能說明 */}
            <StepCallout
              x={500}
              y={300}
              text="1. 上傳學習歷程文件"
              color="#06b6d4"
              delay={60}
              frame={frame}
              fps={fps}
              direction="right"
            />
            <HighlightBox
              x={160}
              y={200}
              w={1600}
              h={600}
              color="#06b6d4"
              delay={60}
              frame={frame}
              fps={fps}
              pulse={false}
            />
            <StepCallout
              x={500}
              y={500}
              text="2. 支援圖片、PDF、影片等格式"
              color="#22c55e"
              delay={100}
              frame={frame}
              fps={fps}
              direction="right"
            />
          </ScreenWrapper>
        </div>
      )}

      {/* 截圖三：學生儀表板 */}
      {showScreen3 && (
        <div style={{ opacity: screen3Opacity, position: "absolute", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <ScreenWrapper
            title="個人學習進度分析"
            subtitle="SDL Platform"
            accentColor="#22c55e"
            titleOpacity={title2Opacity}
            screenOpacity={screen3Scale}
            screenScale={screen3Scale}
          >
            <Img
              src={staticFile("screenshots/09-student-dashboard.png")}
              style={{ width: 1600, display: "block" }}
            />

            {/* 240-320: 儀表板說明 */}
            <HighlightBox
              x={160}
              y={50}
              w={1600}
              h={120}
              color="#22c55e"
              delay={240}
              frame={frame}
              fps={fps}
              pulse={false}
            />
            <StepCallout
              x={400}
              y={220}
              text="3. AI 自動分析學習進度"
              color="#22c55e"
              delay={250}
              frame={frame}
              fps={fps}
              direction="right"
            />
            <HighlightBox
              x={160}
              y={180}
              w={500}
              h={350}
              color="#8b5cf6"
              delay={270}
              frame={frame}
              fps={fps}
              pulse={true}
            />
            <StepCallout
              x={900}
              y={300}
              text="4. 5Rs 反思趨勢分析"
              color="#8b5cf6"
              delay={290}
              frame={frame}
              fps={fps}
              direction="right"
            />

            {/* 320-360: 收尾 */}
            <StepCallout
              x={700}
              y={600}
              text="完整記錄每個學習階段"
              color="#f59e0b"
              delay={330}
              frame={frame}
              fps={fps}
              direction="right"
            />
          </ScreenWrapper>
        </div>
      )}

      <ProgressBar
        currentScene={6}
        totalScenes={8}
        labels={LABELS}
        frame={frame}
        fps={fps}
      />
    </AbsoluteFill>
  );
};
