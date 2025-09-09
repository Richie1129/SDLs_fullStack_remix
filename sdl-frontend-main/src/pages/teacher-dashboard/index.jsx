import React, { useState } from "react";
import { useParams } from "react-router-dom";

// Hooks
import { useTeacherDashboardData } from "./hooks/useTeacherDashboardData";
import { useTeacherMetrics } from "./hooks/useTeacherMetrics";

// Components
import ViewModeButtons from "./components/ViewModeButtons";
import StatsCards from "./components/StatsCards";
import OverviewView from "./components/OverviewView";
import AllStudentsView from "./components/AllStudentsView";
import GroupsView from "./components/GroupsView";
import IndividualView from "./components/IndividualView";
import AnalyticsView from "./components/AnalyticsView";

const TeacherManagementDashboard = () => {
  const { projectId } = useParams();
  const parsedProjectId = projectId ? parseInt(projectId, 10) : null;
  
  // 檢視模式狀態
  const [viewMode, setViewMode] = useState('overview');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  
  // 用戶角色
  const userRole = localStorage.getItem("role");
  
  // 獲取資料
  const { realData, allProjectMembers } = useTeacherDashboardData(parsedProjectId, userRole);
  const { enhancedStudents, groupData, classStats } = useTeacherMetrics(realData, allProjectMembers);

  // 載入狀態
  if (realData.loading) {
    return (
      <div className="h-full w-full bg-gray-50 overflow-hidden">
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-600 mx-auto"></div>
            <p className="mt-4 text-lg text-gray-600">載入中...</p>
          </div>
        </div>
      </div>
    );
  }

  // 渲染檢視內容
  const renderViewContent = () => {
    if (userRole === 'teacher') {
      switch (viewMode) {
        case 'overview':
          return <OverviewView 
            enhancedStudents={enhancedStudents} 
            classStats={classStats} 
            realData={realData} 
          />;
        case 'all-students':
          return <AllStudentsView 
            enhancedStudents={enhancedStudents}
            setViewMode={setViewMode}
            setSelectedStudent={setSelectedStudent}
          />;
        case 'groups':
          return <GroupsView 
            groupData={groupData}
            selectedGroup={selectedGroup}
            setSelectedGroup={setSelectedGroup}
            enhancedStudents={enhancedStudents}
          />;
        case 'individual':
          return <IndividualView 
            selectedStudent={selectedStudent}
            setSelectedStudent={setSelectedStudent}
            enhancedStudents={enhancedStudents}
            userRole={userRole}
            realData={realData}
          />;
        case 'analytics':
          return <AnalyticsView 
            enhancedStudents={enhancedStudents}
            realData={realData}
          />;
        default:
          return <OverviewView 
            enhancedStudents={enhancedStudents} 
            classStats={classStats} 
            realData={realData} 
          />;
      }
    } else {
      // 學生模式，只顯示個人檢視
      return <IndividualView 
        selectedStudent={selectedStudent}
        setSelectedStudent={setSelectedStudent}
        enhancedStudents={enhancedStudents}
        userRole={userRole}
        realData={realData}
      />;
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
            <StatsCards classStats={classStats} />

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
