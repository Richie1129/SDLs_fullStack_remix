import React, { useState, useEffect, useCallback } from "react";
import TopBar from "../components/TopBar";
import SideBar from "../components/SideBar";
import { Outlet, useLocation, useParams } from "react-router-dom";
import SubStageComponent from "../components/SubStageBar";
import ActivityStream from "../components/ActivityStream";
import ProjectCommentDrawer from "../components/ProjectCommentDrawer";
import { CommentErrorBoundary, PageErrorBoundary } from "../components/ErrorBoundary";
import { ObservationProvider } from "../providers/ObservationProvider";

export default function ProjectLayout() {
  const location = useLocation();
  const { projectId } = useParams();
  const [inKanBan, setinKanBan] = useState(false);
  const [showActivityStream, setShowActivityStream] = useState(false);
  const [showProjectCommentDrawer, setShowProjectCommentDrawer] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setinKanBan(location.pathname === `/project/${projectId}/kanban`);
  }, [projectId, location.pathname]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  const openMobileNav = useCallback(() => setMobileNavOpen(true), []);
  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);

  return (
    <ObservationProvider>
    <div className="relative h-[100dvh] bg-gray-100 overflow-hidden flex flex-row">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-onboarding focus:bg-white focus:text-customgreen focus:px-btn-x focus:py-btn-y focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-customgreen">跳至主內容</a>
      {/* Left navigation rail */}
      <SideBar mobileOpen={mobileNavOpen} onMobileClose={closeMobileNav} />

      {/* Main column: TopBar + main content */}
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        <TopBar
          showActivityStream={showActivityStream}
          setShowActivityStream={setShowActivityStream}
          showProjectCommentDrawer={showProjectCommentDrawer}
          setShowProjectCommentDrawer={setShowProjectCommentDrawer}
          onOpenMobileNav={openMobileNav}
          mobileNavOpen={mobileNavOpen}
        />

        <main id="main-content" tabIndex={-1} className="flex-1 flex flex-col min-h-0 min-w-0 outline-none">
          <div
            className={
              inKanBan
                ? "flex-1 h-full min-h-0 min-w-0 overflow-hidden md:overflow-x-auto md:overflow-y-hidden"
                : "flex-1 overflow-y-auto"
            }
          >
            <PageErrorBoundary key={location.pathname}>
              <Outlet />
            </PageErrorBoundary>
          </div>
          {inKanBan && <SubStageComponent />}
        </main>
      </div>

      {/* 專案活動流組件 - 移到外層避免 flex 布局衝突 */}
      {showActivityStream && (
        <ActivityStream
          projectId={projectId}
          isOpen={showActivityStream}
          onClose={() => setShowActivityStream(false)}
        />
      )}

      {/* 專案評論抽屜 - 固定在右側，與活動流類似 */}
      {showProjectCommentDrawer && (
        <CommentErrorBoundary context="project_comment_drawer">
          <ProjectCommentDrawer
            projectId={projectId}
            isOpen={showProjectCommentDrawer}
            onClose={() => setShowProjectCommentDrawer(false)}
          />
        </CommentErrorBoundary>
      )}
    </div>
    </ObservationProvider>
  );
}
