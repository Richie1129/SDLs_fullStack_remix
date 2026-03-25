import React, { Suspense } from "react";
import { useParams } from "react-router-dom";

// 自定義 Hooks
import { useProjectData } from "./hooks/useProjectData";
import { useStudentMetrics } from "./hooks/useStudentMetrics";
import { useUsageSession } from "./hooks/useUsageSession";

// 子組件
import TeamStats from "./components/TeamStats";
import PersonalData from "./components/PersonalData";
import LearningTrack from "./components/LearningTrack";
import LearningGoals from "./components/LearningGoals";
import TeammatesList from "./components/TeammatesList";
import Achievements from "./components/Achievements";
import QuickStats from "./components/QuickStats";
import LearningProgressRing from "./components/LearningProgressRing";
import StudentSelfRiskAlert from "./components/StudentSelfRiskAlert";
import FiveRsRadarChart from "./components/FiveRsRadarChart";
import StageSuggestions from "./components/StageSuggestions";
import { getCurrentUsername, getUserForSocket, isCurrentUser } from '../../utils/userUtils';
import { getCurrentUserId } from '../../utils/authUtils';

// 載入組件
const LoadingComponent = () => (
  <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-component-sm sm:p-component-md-lg flex items-center justify-center">
    <div className="text-center bg-white p-component-lg rounded-xl shadow-lg">
      <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-customgreen mx-auto mb-4"></div>
      <p className="text-body-lg text-gray-700 font-medium">載入學習資料中...</p>
      <p className="mt-2 text-body-sm text-gray-500">正在分析學習進度</p>
    </div>
  </div>
);

const StudentDashboard = () => {
  // 確保參數正確獲取
  const { projectId } = useParams();
  const userId = getCurrentUserId();
  const userName = getCurrentUsername();
  
  // 添加防護性檢查
  if (!projectId || !userId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-component-sm sm:p-component-md-lg flex items-center justify-center">
        <div className="text-center bg-white p-component-lg rounded-xl shadow-lg border border-red-100">
          <div className="text-red-500 mb-4">
            <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-body-lg font-semibold text-gray-800 mb-3">參數錯誤</h3>
          <div className="bg-red-50 border border-red-200 rounded-lg p-component-base">
            <p className="text-red-700 text-body-sm font-medium">缺少必要參數，請重新載入頁面</p>
          </div>
        </div>
      </div>
    );
  }
  
  // 獲取專案數據
  const projectData = useProjectData(projectId, userId);
  const { loading, ideaNodes, kanbanTasks, teamMembers, personalReflections, teamReflections } = projectData;
  // 啟用精準使用時間記錄（心跳）
  useUsageSession(projectId, userId);
  
  // 計算學生指標
  const metrics = useStudentMetrics(projectData, userName, projectId, userId);
  const { teamStats, personalData, learningTrack, teammates, learningGoals, achievements } = metrics;

  // 載入狀態
  if (loading) {
    return <LoadingComponent />;
  }

  return (
    <div className="w-full h-full bg-gray-50 overflow-y-auto">
      <div className="p-component-sm sm:p-component-md-lg">
        <div className="max-w-7xl mx-auto pb-6">
          {/* 頁面標題 */}
          <div className="mb-4 sm:mb-6">
            <h1 className="text-h3 sm:text-h2 lg:text-h1 font-extrabold text-teal-600 mb-2">我的學習歷程</h1>
            <p className="text-body-sm sm:text-body text-gray-600">歡迎回來，{personalData?.name || '學習者'}！繼續你的學習旅程吧。</p>
            {ideaNodes.length > 0 && (
              <p className="text-caption text-gray-500 mt-1">
                已載入 {ideaNodes.length} 個想法節點，{kanbanTasks.length} 個任務
              </p>
            )}
          </div>

          {/* ④ 個人自我風險提示 */}
          <StudentSelfRiskAlert personalData={personalData} projectId={projectId} />

          {/* 小組統計卡片區域 */}
          <TeamStats teamStats={teamStats} />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-stack-sm sm:gap-stack-md-lg">
            {/* 左側主要內容 */}
            <div className="lg:col-span-2 space-y-stack-sm sm:space-y-stack-md-lg">
              {/* 學習進度詳情 */}
              <PersonalData 
                personalData={personalData} 
                ideaNodes={ideaNodes} 
                kanbanTasks={kanbanTasks} 
              />

              {/* 學習軌跡 */}
              <LearningTrack learningTrack={learningTrack} />

              {/* ⑥ 5Rs 反思深度雷達圖 */}
              <FiveRsRadarChart personalReflections={personalReflections} />

              {/* 學習目標 */}
              <LearningGoals learningGoals={learningGoals} />
            </div>

            {/* 右側側邊欄 */}
            <div className="space-y-stack-sm sm:space-y-stack-md-lg">
              {/* ⑦ 階段感知可操作建議 */}
              <StageSuggestions personalData={personalData} projectId={projectId} />

              {/* 個人完成率環形圖 */}
              <LearningProgressRing progressPercentage={personalData?.progressPercentage || 0} />

              {/* 團隊成員狀況 */}
              <TeammatesList teammates={teammates} personalData={personalData} />

              {/* 近期成就 */}
              <Achievements
                achievements={achievements}
                enhancedStudents={teamMembers}
                realData={{
                  nodes: ideaNodes,
                  tasks: kanbanTasks,
                  nodeRelations: [],
                  reflections: [...personalReflections, ...teamReflections]
                }}
              />

              {/* 快速統計 */}
              <QuickStats personalData={personalData} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
