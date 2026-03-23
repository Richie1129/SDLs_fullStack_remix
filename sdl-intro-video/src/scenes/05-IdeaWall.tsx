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
  FakeCursor,
  FakeNode,
  HighlightBox,
  ProgressBar,
  ScreenWrapper,
  StepCallout,
} from "../components/VideoKit";

const LABELS = ["開始", "登入", "儀表板", "看板", "想法牆", "反思", "歷程", "結束"];

export const IdeaWallScene: React.FC = () => {
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

  // 260-340: zoom in
  const zoomScale = interpolate(frame, [260, 320], [1, 1.25], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const zoomX = interpolate(frame, [260, 320], [0, -200], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const zoomY = interpolate(frame, [260, 320], [0, -100], {
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
        title="想法牆"
        subtitle="SDL Platform"
        accentColor="#22c55e"
        titleOpacity={titleOpacity}
        screenOpacity={screenOpacity}
        screenScale={screenScale * zoomScale}
        screenX={zoomX}
        screenY={zoomY}
      >
        {/* 截圖 */}
        <Img
          src={staticFile("screenshots/05-idea-wall.png")}
          style={{ width: 1600, display: "block" }}
        />

        {/* 60-150: 節點說明 */}
        <HighlightBox
          x={200}
          y={100}
          w={250}
          h={130}
          color="#22c55e"
          delay={60}
          frame={frame}
          fps={fps}
          pulse={true}
        />
        <StepCallout
          x={480}
          y={80}
          text="1. 點擊節點查看與編輯"
          color="#22c55e"
          delay={60}
          frame={frame}
          fps={fps}
          direction="right"
        />
        <HighlightBox
          x={700}
          y={300}
          w={250}
          h={130}
          color="#f59e0b"
          delay={90}
          frame={frame}
          fps={fps}
          pulse={true}
        />
        <StepCallout
          x={980}
          y={280}
          text="2. 每個節點可留言討論"
          color="#f59e0b"
          delay={90}
          frame={frame}
          fps={fps}
          direction="right"
        />

        {/* 150-260: 新增節點 */}
        <StepCallout
          x={1100}
          y={920}
          text="3. 點擊右下角 + 新增節點"
          color="#8b5cf6"
          delay={150}
          frame={frame}
          fps={fps}
          direction="left"
        />
        <HighlightBox
          x={1840}
          y={1000}
          w={56}
          h={50}
          color="#8b5cf6"
          delay={150}
          frame={frame}
          fps={fps}
          pulse={true}
        />
        <FakeCursor
          path={[
            { frame: 155, x: 800, y: 600 },
            { frame: 200, x: 1868, y: 1025 },
            { frame: 215, x: 1868, y: 1025 },
          ]}
          currentFrame={frame}
          clickFrames={[200]}
        />

        {/* frame=215 後顯示 FakeNode */}
        {frame >= 215 && (
          <FakeNode
            text="新的研究方向"
            color="#22c55e"
            x={900}
            y={600}
            delay={215}
            frame={frame}
            fps={fps}
          />
        )}

        {/* 260-340: zoom 後標注 */}
        <StepCallout
          x={500}
          y={400}
          text="4. 節點間可建立連結"
          color="#06b6d4"
          delay={280}
          frame={frame}
          fps={fps}
          direction="right"
        />

        {/* 340-420: AI 分析 */}
        <StepCallout
          x={400}
          y={700}
          text="5. AI 助理可分析節點內容"
          color="#3b82f6"
          delay={350}
          frame={frame}
          fps={fps}
          direction="right"
        />
      </ScreenWrapper>

      <ProgressBar
        currentScene={4}
        totalScenes={8}
        labels={LABELS}
        frame={frame}
        fps={fps}
      />
    </AbsoluteFill>
  );
};
