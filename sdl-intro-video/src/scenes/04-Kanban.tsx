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
  FakeTaskCard,
  HighlightBox,
  ProgressBar,
  ScreenWrapper,
  StepCallout,
} from "../components/VideoKit";

const LABELS = ["開始", "登入", "儀表板", "看板", "想法牆", "反思", "歷程", "結束"];

export const KanbanScene: React.FC = () => {
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
        title="學習看板"
        subtitle="SDL Platform"
        accentColor="#22c55e"
        titleOpacity={titleOpacity}
        screenOpacity={screenOpacity}
        screenScale={screenScale}
      >
        {/* 截圖 */}
        <Img
          src={staticFile("screenshots/04-kanban.png")}
          style={{ width: 1600, display: "block" }}
        />

        {/* 60-150: 欄位說明 */}
        <StepCallout
          x={160}
          y={60}
          text="1. 欄位代表學習階段"
          color="#22c55e"
          delay={60}
          frame={frame}
          fps={fps}
          direction="right"
        />
        <HighlightBox
          x={158}
          y={55}
          w={248}
          h={600}
          color="#22c55e"
          delay={65}
          frame={frame}
          fps={fps}
          pulse={false}
        />
        <StepCallout
          x={420}
          y={60}
          text="2. 任務卡片顯示進度"
          color="#f59e0b"
          delay={90}
          frame={frame}
          fps={fps}
          direction="right"
        />
        <HighlightBox
          x={412}
          y={55}
          w={248}
          h={600}
          color="#f59e0b"
          delay={95}
          frame={frame}
          fps={fps}
          pulse={false}
        />

        {/* 150-280: 新增任務操作 */}
        <FakeCursor
          path={[
            { frame: 150, x: 900, y: 900 },
            { frame: 200, x: 175, y: 680 },
            { frame: 220, x: 175, y: 680 },
            { frame: 240, x: 175, y: 680 },
          ]}
          currentFrame={frame}
          clickFrames={[220]}
        />
        <StepCallout
          x={380}
          y={700}
          text="3. 點擊 + 新增任務卡片"
          color="#22c55e"
          delay={200}
          frame={frame}
          fps={fps}
          direction="right"
        />

        {/* frame=230 後顯示 FakeTaskCard */}
        {frame >= 230 && (
          <FakeTaskCard
            title="撰寫實驗結果分析"
            tag="分析"
            tagColor="#3b82f6"
            x={160}
            y={120}
            delay={230}
            frame={frame}
            fps={fps}
          />
        )}

        {/* 280-420: 拖拽說明 */}
        <FakeCursor
          path={[
            { frame: 280, x: 175, y: 680 },
            { frame: 340, x: 420, y: 130 },
            { frame: 380, x: 420, y: 130 },
          ]}
          currentFrame={frame}
          clickFrames={[290, 300]}
        />
        <StepCallout
          x={700}
          y={100}
          text="4. 拖拽更新任務狀態"
          color="#8b5cf6"
          delay={300}
          frame={frame}
          fps={fps}
          direction="right"
        />
        <StepCallout
          x={1200}
          y={500}
          text="5. 即時同步，全組可見"
          color="#06b6d4"
          delay={340}
          frame={frame}
          fps={fps}
          direction="left"
        />
      </ScreenWrapper>

      <ProgressBar
        currentScene={3}
        totalScenes={8}
        labels={LABELS}
        frame={frame}
        fps={fps}
      />
    </AbsoluteFill>
  );
};
