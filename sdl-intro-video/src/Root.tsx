import React from "react";
import { Composition, Series } from "remotion";
import { IntroScene } from "./scenes/01-Intro";
import { LoginScene } from "./scenes/02-Login";
import { DashboardScene } from "./scenes/03-Dashboard";
import { KanbanScene } from "./scenes/04-Kanban";
import { IdeaWallScene } from "./scenes/05-IdeaWall";
import { ReflectionScene } from "./scenes/06-Reflection";
import { PortfolioScene } from "./scenes/07-Portfolio";
import { OutroScene } from "./scenes/08-Outro";

const FPS = 30;

// 各場景時長（秒 × FPS）
const D = {
  intro:      10 * FPS,  // 10s 片頭 SDL 動畫
  login:      10 * FPS,  // 10s 登入頁面
  dashboard:  10 * FPS,  // 10s 儀表板
  kanban:     14 * FPS,  // 14s 看板
  ideaWall:   14 * FPS,  // 14s 想法牆
  reflection: 10 * FPS,  // 10s 5Rs 反思
  portfolio:  12 * FPS,  // 12s 學習歷程
  outro:      10 * FPS,  // 10s 結尾
};

const TOTAL = Object.values(D).reduce((a, b) => a + b, 0);

const SDLIntroFull: React.FC = () => (
  <Series>
    <Series.Sequence durationInFrames={D.intro}><IntroScene /></Series.Sequence>
    <Series.Sequence durationInFrames={D.login}><LoginScene /></Series.Sequence>
    <Series.Sequence durationInFrames={D.dashboard}><DashboardScene /></Series.Sequence>
    <Series.Sequence durationInFrames={D.kanban}><KanbanScene /></Series.Sequence>
    <Series.Sequence durationInFrames={D.ideaWall}><IdeaWallScene /></Series.Sequence>
    <Series.Sequence durationInFrames={D.reflection}><ReflectionScene /></Series.Sequence>
    <Series.Sequence durationInFrames={D.portfolio}><PortfolioScene /></Series.Sequence>
    <Series.Sequence durationInFrames={D.outro}><OutroScene /></Series.Sequence>
  </Series>
);

export const RemotionRoot: React.FC = () => (
  <>
    {/* 完整影片 */}
    <Composition id="SDLIntro" component={SDLIntroFull} durationInFrames={TOTAL} fps={FPS} width={1920} height={1080} />

    {/* 個別場景預覽 */}
    <Composition id="S01-Intro"      component={IntroScene}      durationInFrames={D.intro}      fps={FPS} width={1920} height={1080} />
    <Composition id="S02-Login"      component={LoginScene}      durationInFrames={D.login}      fps={FPS} width={1920} height={1080} />
    <Composition id="S03-Dashboard"  component={DashboardScene}  durationInFrames={D.dashboard}  fps={FPS} width={1920} height={1080} />
    <Composition id="S04-Kanban"     component={KanbanScene}     durationInFrames={D.kanban}     fps={FPS} width={1920} height={1080} />
    <Composition id="S05-IdeaWall"   component={IdeaWallScene}   durationInFrames={D.ideaWall}   fps={FPS} width={1920} height={1080} />
    <Composition id="S06-Reflection" component={ReflectionScene} durationInFrames={D.reflection} fps={FPS} width={1920} height={1080} />
    <Composition id="S07-Portfolio"  component={PortfolioScene}  durationInFrames={D.portfolio}  fps={FPS} width={1920} height={1080} />
    <Composition id="S08-Outro"      component={OutroScene}      durationInFrames={D.outro}      fps={FPS} width={1920} height={1080} />
  </>
);
