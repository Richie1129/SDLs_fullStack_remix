import React, { useState, useEffect } from "react";
import TopBar from "../components/TopBar";
import SideBar from "../components/SideBar";
import { Outlet, useLocation, useParams } from "react-router-dom";
import SubStageComponent from "../components/SubStageBar";
import ActivityStream from "../components/ActivityStream";

export default function ProjectLayout() {
  const location = useLocation();
  const { projectId } = useParams();
  const [inKanBan, setinKanBan] = useState(false);
  const [showActivityStream, setShowActivityStream] = useState(false);

  useEffect(() => {
    setinKanBan(location.pathname === `/project/${projectId}/kanban`);
  }, [projectId, location.pathname]);

  return (
    <div className="relative h-screen bg-gray-100 overflow-hidden flex flex-col">
      <TopBar
        showActivityStream={showActivityStream}
        setShowActivityStream={setShowActivityStream}
      />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <SideBar />
        <main className="flex-1 flex flex-col min-h-0">
          {/*
            For Kanban: prevent parent scrolling and let Kanban manage its own
            vertical (inside columns) and horizontal (board) scroll.
            For other pages: allow normal vertical scrolling.
          */}
          <div className={inKanBan ? "flex-1 min-h-0 overflow-hidden" : "flex-1 overflow-y-auto"}>
            <Outlet />
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
    </div>
  );
}
