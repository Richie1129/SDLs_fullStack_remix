import React, { useState } from "react";
import { useParams } from "react-router-dom";

// Hooks
import { useTeacherDashboard } from "./hooks/useTeacherDashboard";

// Components
import ViewModeButtons from "./components/ViewModeButtons";
import StatsCards from "./components/StatsCards";
import OverviewView from "./components/OverviewView";
import AllStudentsView from "./components/AllStudentsView";
import GroupsView from "./components/GroupsView";
import IndividualView from "./components/IndividualView";
import AnalyticsView from "./components/AnalyticsView";
import ErrorBoundary from "../student-dashboard/components/ErrorBoundary";

const TeacherManagementDashboard = () => {
  const { projectId } = useParams();
  const parsedProjectId = projectId ? parseInt(projectId, 10) : null;
  
  // 檢視模式狀態
  const [viewMode, setViewMode] = useState('overview');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  
  // 用戶角色
  const userRole = localStorage.getItem("role");
  
  // 使用新的統合Hook獲取資料
  const {
    realData,
    allProjectMembers,
    enhancedStudents,
    groupData,
    classStats,
    loading,
    error,
    dataIntegrity
  } = useTeacherDashboard(parsedProjectId, userRole);

  // 載入狀態
  if (loading) {
    return (
      <div className="h-full w-full bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
        <div className="h-full flex items-center justify-center">
          <div className="text-center bg-white p-8 rounded-xl shadow-lg">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-customgreen mx-auto"></div>
            <p className="mt-4 text-lg text-gray-700 font-medium">載入教師儀表板中...</p>
            <p className="mt-2 text-sm text-gray-500">正在整理學生資料</p>
          </div>
        </div>
      </div>
    );
  }

  // 錯誤狀態
  if (error) {
    return (
      <div className="h-full w-full bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
        <div className="h-full flex items-center justify-center">
          <div className="text-center bg-white p-8 rounded-xl shadow-lg border border-red-100">
            <div className="text-red-500 mb-4">
              <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">載入失敗</h3>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
            {dataIntegrity?.issues && dataIntegrity.issues.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-yellow-700 text-sm font-medium">資料問題：{dataIntegrity.issues.join(', ')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 渲染檢視內容 - 用 ErrorBoundary 包裹每個組件
  const renderViewContent = () => {
    if (userRole === 'teacher') {
      switch (viewMode) {
        case 'overview':
          return (
            <ErrorBoundary>
              <OverviewView
                enhancedStudents={enhancedStudents}
                classStats={classStats}
                realData={realData}
              />
            </ErrorBoundary>
          );
        case 'all-students':
          return (
            <ErrorBoundary>
              <AllStudentsView
                enhancedStudents={enhancedStudents}
                setViewMode={setViewMode}
                setSelectedStudent={setSelectedStudent}
              />
            </ErrorBoundary>
          );
        case 'groups':
          return (
            <ErrorBoundary>
              <GroupsView
                groupData={groupData}
                selectedGroup={selectedGroup}
                setSelectedGroup={setSelectedGroup}
                enhancedStudents={enhancedStudents}
              />
            </ErrorBoundary>
          );
        case 'individual':
          return (
            <ErrorBoundary>
              <IndividualView
                selectedStudent={selectedStudent}
                setSelectedStudent={setSelectedStudent}
                enhancedStudents={enhancedStudents}
                userRole={userRole}
                realData={realData}
              />
            </ErrorBoundary>
          );
        case 'analytics':
          return (
            <ErrorBoundary>
              <AnalyticsView
                enhancedStudents={enhancedStudents}
                realData={realData}
              />
            </ErrorBoundary>
          );
        default:
          return (
            <ErrorBoundary>
              <OverviewView
                enhancedStudents={enhancedStudents}
                classStats={classStats}
                realData={realData}
              />
            </ErrorBoundary>
          );
      }
    } else {
      // 學生模式，只顯示個人檢視
      return (
        <ErrorBoundary>
          <IndividualView
            selectedStudent={selectedStudent}
            setSelectedStudent={setSelectedStudent}
            enhancedStudents={enhancedStudents}
            userRole={userRole}
            realData={realData}
          />
        </ErrorBoundary>
      );
    }
  };

  return (
    <div className="h-full w-full bg-gray-50 overflow-hidden">
      <div className="h-full overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-customgreen scrollbar-track-gray-100 hover:scrollbar-thumb-customgreen/80" 
           style={{ scrollBehavior: 'smooth' }}>
        <div className="p-3 sm:p-6">
          <div className="max-w-7xl mx-auto">
            {/* 標題和檢視模式切換 */}
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-4 sm:mb-6 space-y-3 lg:space-y-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-teal-600">
                {userRole === 'teacher' ? '教師管理儀表板' : '我的學習歷程'}
              </h1>
              
              {userRole === 'teacher' && (
                <ViewModeButtons viewMode={viewMode} setViewMode={setViewMode} />
              )}
            </div>

            {/* 統計卡片 */}
            <ErrorBoundary>
              <StatsCards classStats={classStats} />
            </ErrorBoundary>

            {/* 主要內容區域 */}
            <div className="space-y-6 pb-6">
              {renderViewContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherManagementDashboard;
