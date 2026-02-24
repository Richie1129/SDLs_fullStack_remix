import React, { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { FiBarChart2, FiHelpCircle, FiLink, FiUser, FiUsers } from 'react-icons/fi';

// Hooks
import { useTeacherDashboard } from "./hooks/useTeacherDashboard";
import { getCurrentUserRole } from "../../utils/authUtils";

// Components
import ViewModeButtons from "./components/ViewModeButtons";
import StatsCards from "./components/StatsCards";
import OverviewView from "./components/OverviewView";
import AllStudentsView from "./components/AllStudentsView";
import GroupsView from "./components/GroupsView";
import IndividualView from "./components/IndividualView";
import AnalyticsView from "./components/AnalyticsView";
import HelpSeekingView from "./components/HelpSeekingView";
import { DashboardErrorBoundary } from "../../components/ErrorBoundary";
import { SkeletonDashboard } from "../../components/SkeletonLoader";
import { FiAlertTriangle } from 'react-icons/fi';

const STAGE_LABELS = {
  1: '定標階段',
  2: '擇策階段',
  3: '監評階段',
  4: '調節階段'
};

const SUB_STAGE_LABELS = {
  '1-1': '提出研究主題',
  '1-2': '提出研究目的',
  '1-3': '提出研究問題',
  '2-1': '訂定研究構想表',
  '2-2': '設計研究記錄表',
  '2-3': '規劃研究排程',
  '3-1': '進行嘗試性研究',
  '3-2': '分析資料與繪圖',
  '3-3': '撰寫研究結果',
  '4-1': '檢視研究進度',
  '4-2': '進行研究討論',
  '4-3': '撰寫研究結論'
};

const TeacherManagementDashboard = () => {
  const { projectId } = useParams();
  const parsedProjectId = projectId ? parseInt(projectId, 10) : null;
  
  // 檢視模式狀態
  const [viewMode, setViewMode] = useState('overview');
  const [studentViewMode, setStudentViewMode] = useState('all-students');
  const [analyticsViewMode, setAnalyticsViewMode] = useState('analytics');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  
  // 用戶角色
  const userRole = getCurrentUserRole();
  
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

  const dominantStageInfo = useMemo(() => {
    if (userRole !== 'teacher' || !Array.isArray(enhancedStudents) || enhancedStudents.length === 0) {
      return null;
    }

    const toInteger = (value) => {
      if (value === null || value === undefined) return null;
      const numeric = Number(value);
      if (Number.isInteger(numeric)) return numeric;
      const matched = String(value).match(/\d+/);
      return matched ? Number(matched[0]) : null;
    };

    const normalizeStage = (value) => {
      const num = toInteger(value);
      if (!num) return null;
      if (num === 5) return 4;
      if (num >= 1 && num <= 4) return num;
      return null;
    };

    const normalizeSubStage = (value) => {
      const num = toInteger(value);
      if (!num) return null;
      if (num >= 1 && num <= 3) return num;
      if (num >= 1 && num <= 12) return ((num - 1) % 3) + 1;
      return null;
    };

    const parseCompositeStage = (value) => {
      if (value === null || value === undefined) return { stage: null, subStage: null };
      const text = String(value).trim();
      if (!text.includes('-') && !text.includes('/')) {
        return { stage: null, subStage: null };
      }
      const parts = text.split(/[-/]/);
      if (parts.length < 2) return { stage: null, subStage: null };
      return {
        stage: normalizeStage(parts[0]),
        subStage: normalizeSubStage(parts[1])
      };
    };

    const resolveStageAndSubStage = (student) => {
      const subCandidates = [
        student?.currentSubStage,
        student?.current_sub_stage,
        student?.subStage,
        student?.sub_stage,
        student?.currentSubStageIndex,
        student?.current_sub_stage_index,
        student?.projectCurrentSubStage,
        student?.project?.currentSubStage,
        student?.project?.current_sub_stage
      ];

      for (const candidate of subCandidates) {
        const { stage, subStage } = parseCompositeStage(candidate);
        if (stage && subStage) {
          return { stage, subStage };
        }
      }

      const stageCandidates = [
        student?.currentStage,
        student?.current_stage,
        student?.stage,
        student?.stageIndex,
        student?.stage_index,
        student?.projectCurrentStage,
        student?.project?.currentStage,
        student?.project?.current_stage
      ];

      let stage = null;
      for (const candidate of stageCandidates) {
        stage = normalizeStage(candidate);
        if (stage) break;
      }

      let subStage = null;
      for (const candidate of subCandidates) {
        subStage = normalizeSubStage(candidate);
        if (subStage) break;
      }

      if (!stage) {
        const progress = Number(student?.progressPercentage);
        if (!Number.isNaN(progress) && progress >= 0) {
          const safeProgress = Math.min(progress, 100);
          stage = Math.max(1, Math.min(4, Math.ceil(Math.max(safeProgress, 1) / 25)));
          const stageBase = (stage - 1) * 25;
          const stageProgress = Math.max(0, Math.min(25, safeProgress - stageBase));
          subStage = Math.max(1, Math.min(3, Math.ceil((Math.max(stageProgress, 1) / 25) * 3)));
        }
      }

      if (!subStage) subStage = 1;
      if (!stage) return null;

      return { stage, subStage };
    };

    const stageSubCount = new Map();

    enhancedStudents.forEach((student) => {
      const resolved = resolveStageAndSubStage(student);
      if (!resolved) return;
      const key = `${resolved.stage}-${resolved.subStage}`;
      stageSubCount.set(key, (stageSubCount.get(key) || 0) + 1);
    });

    if (stageSubCount.size === 0) return null;

    const [dominantKey, dominantCount] = [...stageSubCount.entries()]
      .sort((a, b) => b[1] - a[1])[0];

    const [stageNumText, subStageNumText] = dominantKey.split('-');
    const stageNum = Number(stageNumText);
    const subStageNum = Number(subStageNumText);

    return {
      stageLabel: STAGE_LABELS[stageNum] || `${stageNum} 階段`,
      subStageLabel: SUB_STAGE_LABELS[dominantKey] || `子階段 ${subStageNum}`,
      count: dominantCount,
      total: enhancedStudents.length
    };
  }, [enhancedStudents, userRole]);

  // 載入狀態
  if (loading) {
    return (
      <div className="h-full w-full bg-gray-50 overflow-hidden">
        <div className="h-full overflow-y-auto p-component-sm sm:p-component-md-lg">
          <div className="max-w-7xl mx-auto">
            <SkeletonDashboard />
          </div>
        </div>
      </div>
    );
  }

  // 錯誤狀態
  if (error) {
    return (
      <div className="h-full w-full bg-gray-50 overflow-hidden">
        <div className="h-full flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="bg-white p-component-lg rounded-2xl shadow-lg border border-red-100">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-red-100">
                <FiAlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-h3 font-semibold text-gray-800 mb-3 text-center">載入失敗</h3>
              <div className="bg-red-50 border border-red-200 rounded-lg p-component-base mb-4">
                <p className="text-red-700 text-body-sm font-medium text-center">{error}</p>
              </div>
              {dataIntegrity?.issues && dataIntegrity.issues.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-component-sm">
                  <p className="text-yellow-700 text-body-sm font-medium text-center">
                    資料問題：{dataIntegrity.issues.join(', ')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const studentSubModes = [
    { key: 'all-students', label: '所有學生', icon: <FiUsers className="w-4 h-4" /> },
    { key: 'groups', label: '小組檢視', icon: <FiLink className="w-4 h-4" /> },
    { key: 'individual', label: '個人檢視', icon: <FiUser className="w-4 h-4" /> }
  ];

  const analyticsSubModes = [
    { key: 'analytics', label: '數據分析', icon: <FiBarChart2 className="w-4 h-4" /> },
    { key: 'help-seeking', label: 'Help-Seeking', icon: <FiHelpCircle className="w-4 h-4" /> }
  ];

  const renderStudentSubTabs = () => (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {studentSubModes.map(({ key, label, icon }) => (
        <button
          key={key}
          onClick={() => setStudentViewMode(key)}
          className={`
            flex items-center space-x-2 px-3 py-2 rounded-lg border
            text-body-sm font-medium transition-all duration-normal
            ${studentViewMode === key
              ? 'bg-teal-50 border-teal-300 text-teal-700'
              : 'bg-white border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }
          `}
          aria-label={`切換到${label}`}
          aria-pressed={studentViewMode === key}
        >
          {icon}
          <span>{label}</span>
        </button>
      ))}
    </div>
  );

  const renderAnalyticsSubTabs = () => (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {analyticsSubModes.map(({ key, label, icon }) => (
        <button
          key={key}
          onClick={() => setAnalyticsViewMode(key)}
          className={`
            flex items-center space-x-2 px-3 py-2 rounded-lg border
            text-body-sm font-medium transition-all duration-normal
            ${analyticsViewMode === key
              ? 'bg-teal-50 border-teal-300 text-teal-700'
              : 'bg-white border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }
          `}
          aria-label={`切換到${label}`}
          aria-pressed={analyticsViewMode === key}
        >
          {icon}
          <span>{label}</span>
        </button>
      ))}
    </div>
  );

  const renderStudentsContent = () => {
    switch (studentViewMode) {
      case 'all-students':
        return (
          <DashboardErrorBoundary>
            <AllStudentsView
              enhancedStudents={enhancedStudents}
              onViewDetails={(student) => {
                setSelectedStudent(student);
                setStudentViewMode('individual');
              }}
            />
          </DashboardErrorBoundary>
        );
      case 'groups':
        return (
          <DashboardErrorBoundary>
            <GroupsView
              groupData={groupData}
              selectedGroup={selectedGroup}
              setSelectedGroup={setSelectedGroup}
              enhancedStudents={enhancedStudents}
            />
          </DashboardErrorBoundary>
        );
      case 'individual':
      default:
        return (
          <DashboardErrorBoundary>
            <IndividualView
              selectedStudent={selectedStudent}
              setSelectedStudent={setSelectedStudent}
              enhancedStudents={enhancedStudents}
              userRole={userRole}
              realData={realData}
            />
          </DashboardErrorBoundary>
        );
    }
  };

  const renderAnalyticsContent = () => {
    if (analyticsViewMode === 'help-seeking') {
      return (
        <DashboardErrorBoundary>
          <HelpSeekingView projectId={parsedProjectId} />
        </DashboardErrorBoundary>
      );
    }

    return (
      <DashboardErrorBoundary>
        <AnalyticsView
          enhancedStudents={enhancedStudents}
          realData={realData}
        />
      </DashboardErrorBoundary>
    );
  };

  // 渲染檢視內容 - 用 DashboardErrorBoundary 包裹每個組件
  const renderViewContent = () => {
    if (userRole === 'teacher') {
      switch (viewMode) {
        case 'overview':
          return (
            <DashboardErrorBoundary>
              <OverviewView
                enhancedStudents={enhancedStudents}
                classStats={classStats}
                realData={realData}
              />
            </DashboardErrorBoundary>
          );
        case 'students':
          return (
            <>
              {renderStudentSubTabs()}
              {renderStudentsContent()}
            </>
          );
        case 'analytics':
          return (
            <>
              {renderAnalyticsSubTabs()}
              {renderAnalyticsContent()}
            </>
          );
        default:
          return (
            <DashboardErrorBoundary>
              <OverviewView
                enhancedStudents={enhancedStudents}
                classStats={classStats}
                realData={realData}
              />
            </DashboardErrorBoundary>
          );
      }
    } else {
      // 學生模式，只顯示個人檢視
      return (
        <DashboardErrorBoundary>
          <IndividualView
            selectedStudent={selectedStudent}
            setSelectedStudent={setSelectedStudent}
            enhancedStudents={enhancedStudents}
            userRole={userRole}
            realData={realData}
          />
        </DashboardErrorBoundary>
      );
    }
  };

  return (
    <div className="h-full w-full bg-gray-50 overflow-hidden">
      <div className="h-full overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-customgreen scrollbar-track-gray-100 hover:scrollbar-thumb-customgreen/80" 
           style={{ scrollBehavior: 'smooth' }}>
        <div className="p-component-sm sm:p-component-md-lg">
          <div className="max-w-7xl mx-auto">
            {/* 標題和檢視模式切換 */}
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-4 sm:mb-6 space-y-3 lg:space-y-0">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <h1 className="text-h3 sm:text-h2 lg:text-h1 font-extrabold text-teal-600">
                  {userRole === 'teacher' ? '教師管理儀表板' : '我的學習歷程'}
                </h1>
                {userRole === 'teacher' && dominantStageInfo && (
                  <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1">
                    <span className="text-body-sm font-semibold text-teal-700">
                      {dominantStageInfo.stageLabel}・{dominantStageInfo.subStageLabel}
                    </span>
                    <span className="text-caption text-teal-600">
                      {dominantStageInfo.count}/{dominantStageInfo.total}
                    </span>
                  </div>
                )}
              </div>
              
              {userRole === 'teacher' && (
                <ViewModeButtons
                  viewMode={viewMode}
                  setViewMode={(nextMode) => {
                    setViewMode(nextMode);
                    if (nextMode === 'students') {
                      setStudentViewMode('all-students');
                    }
                    if (nextMode === 'analytics') {
                      setAnalyticsViewMode('analytics');
                    }
                  }}
                />
              )}
            </div>

            {/* 統計卡片 */}
            <DashboardErrorBoundary>
              <StatsCards classStats={classStats} />
            </DashboardErrorBoundary>

            {/* 主要內容區域 */}
            <div className="space-y-stack-md pb-6">
              {renderViewContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherManagementDashboard;
