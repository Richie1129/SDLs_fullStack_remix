import React from "react";
import { useParams } from "react-router-dom";

// 自定義 Hooks
import { useProjectData } from "./hooks/useProjectData";
import { useStudentMetrics } from "./hooks/useStudentMetrics";

// 子組件
import TeamStats from "./components/TeamStats";
import PersonalData from "./components/PersonalData";
import LearningTrack from "./components/LearningTrack";
import LearningGoals from "./components/LearningGoals";
import TeammatesList from "./components/TeammatesList";
import Achievements from "./components/Achievements";
import QuickStats from "./components/QuickStats";

const StudentDashboard = () => {
  const { projectId } = useParams();
  const userId = localStorage.getItem("id");
  const userName = localStorage.getItem("username");
  
  // 獲取專案數據
  const projectData = useProjectData(projectId, userId);
  const { loading, ideaNodes, kanbanTasks } = projectData;
  
  // 計算學生指標
  const metrics = useStudentMetrics(projectData, userName, projectId, userId);
  const { teamStats, personalData, learningTrack, teammates, learningGoals, achievements } = metrics;

  // 載入狀態
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-3 sm:p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">載入學習資料中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-gray-50 overflow-y-auto pt-16 pl-16">
      <div className="p-3 sm:p-6">
        <div className="max-w-7xl mx-auto pb-6">
          {/* 頁面標題 */}
          <div className="mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-teal-600 mb-2">我的學習歷程</h1>
            <p className="text-sm sm:text-base text-gray-600">歡迎回來，{personalData?.name || '學習者'}！繼續你的學習旅程吧。</p>
            {ideaNodes.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                已載入 {ideaNodes.length} 個想法節點，{kanbanTasks.length} 個任務
              </p>
            )}
          </div>

          {/* 小組統計卡片區域 */}
          <TeamStats teamStats={teamStats} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
            {/* 左側主要內容 */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-8">
              {/* 學習進度詳情 */}
              <PersonalData 
                personalData={personalData} 
                ideaNodes={ideaNodes} 
                kanbanTasks={kanbanTasks} 
              />

              {/* 學習軌跡 */}
              <LearningTrack learningTrack={learningTrack} />

              {/* 學習目標 */}
              <LearningGoals learningGoals={learningGoals} />
            </div>

            {/* 右側側邊欄 */}
            <div className="space-y-4 sm:space-y-8">
              {/* 團隊成員狀況 */}
              <TeammatesList teammates={teammates} personalData={personalData} />

              {/* 近期成就 */}
              <Achievements achievements={achievements} />

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
