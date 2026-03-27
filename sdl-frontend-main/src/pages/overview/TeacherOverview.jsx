import React, { useState, useEffect } from "react";
import { getProjectsByMentor } from "../../api/project";
import { getProjectUser } from "../../api/users";
import { getAllPersonalDaily } from "../../api/reflection";
import { getKanbanColumns, getProjectActivity } from "../../api/kanban";
import { getAllSubmit } from "../../api/submit";
import { useQuery } from "react-query";
import { useNavigate } from "react-router-dom";
import { HiArrowLeft } from "react-icons/hi";
import { FiBookOpen, FiUsers, FiTrendingUp, FiAlertTriangle, FiStar, FiFileText, FiInfo } from 'react-icons/fi';
import TopBar from "../../components/TopBar";
import { getCurrentUsername, getUserForSocket, isCurrentUser } from '../../utils/userUtils';
import { 
  calculateProgress, 
  formatRelativeTime, 
  getStatusColor 
} from './utils/overviewUtils';

const Tooltip = ({ text }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-flex ml-1">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        onClick={() => setShow(v => !v)}
        className="w-4 h-4 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-500 flex items-center justify-center transition-colors duration-fast"
        aria-label="說明"
        type="button"
      >
        <FiInfo className="w-2.5 h-2.5" />
      </button>
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 px-3 py-2 bg-gray-800 text-white text-caption rounded-lg z-50 pointer-events-none shadow-lg leading-relaxed">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
        </div>
      )}
    </div>
  );
};

const TeacherOverview = () => {
  const navigate = useNavigate();
  const userName = getCurrentUsername();
  
  // 狀態管理
  const [allProjects, setAllProjects] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [allReflections, setAllReflections] = useState([]);
  const [allSubmissions, setAllSubmissions] = useState([]);
  const [allActivities, setAllActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('overview'); // 'overview', 'students'
  const [selectedSemester, setSelectedSemester] = useState('all');

  // 從所有專案中提取可用學期（降序排列）
  const availableSemesters = React.useMemo(() => {
    const semesters = [...new Set(allProjects.map(p => p.semester).filter(Boolean))];
    return semesters.sort((a, b) => b.localeCompare(a));
  }, [allProjects]);

  // 根據學期篩選後的專案
  const filteredProjects = React.useMemo(() => {
    if (selectedSemester === 'all') return allProjects;
    return allProjects.filter(p => p.semester === selectedSemester);
  }, [allProjects, selectedSemester]);

  // 獲取教師的所有專案
  const { data: projectData, isLoading: projectsLoading } = useQuery(
    "teacherAllProjects", 
    () => getProjectsByMentor(userName, 'all'),
    {
      onSuccess: (data) => {
        setAllProjects(data || []);
      }
    }
  );

  // 獲取所有相關資料
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        
        if (!allProjects.length) return;

        // 獲取所有專案的學生資料
        const studentPromises = allProjects.map(async (project) => {
          try {
            const students = await getProjectUser(project.id);
            return students?.map(s => ({ 
              ...s, 
              projectId: project.id, 
              projectName: project.name,
              projectProgress: calculateProgress(project.currentStage, project.currentSubStage)
            })) || [];
          } catch (error) {
            console.error(`獲取專案 ${project.id} 學生失敗:`, error);
            return [];
          }
        });

        // 獲取所有專案的反思記錄
        const reflectionPromises = allProjects.map(async (project) => {
          try {
            const reflections = await getAllPersonalDaily({ 
              projectId: project.id, 
              isTeacher: true 
            });
            return reflections?.map(r => ({ 
              ...r, 
              projectId: project.id, 
              projectName: project.name 
            })) || [];
          } catch (error) {
            console.error(`獲取專案 ${project.id} 反思失敗:`, error);
            return [];
          }
        });

        // 獲取所有專案的提交記錄
        const submissionPromises = allProjects.map(async (project) => {
          try {
            const submissions = await getAllSubmit({ params: { projectId: project.id } });
            return submissions?.map(s => ({ 
              ...s, 
              projectId: project.id, 
              projectName: project.name 
            })) || [];
          } catch (error) {
            console.error(`獲取專案 ${project.id} 提交失敗:`, error);
            return [];
          }
        });

        // 獲取所有專案的活動記錄
        const activityPromises = allProjects.map(async (project) => {
          try {
            const activities = await getProjectActivity(project.id);
            return activities?.map(a => ({ 
              ...a, 
              projectId: project.id, 
              projectName: project.name 
            })) || [];
          } catch (error) {
            console.error(`獲取專案 ${project.id} 活動失敗:`, error);
            return [];
          }
        });

        const [studentResults, reflectionResults, submissionResults, activityResults] = await Promise.all([
          Promise.all(studentPromises),
          Promise.all(reflectionPromises),
          Promise.all(submissionPromises),
          Promise.all(activityPromises)
        ]);

        // 合併資料
        const allStudentsData = studentResults.flat();
        const allReflectionsData = reflectionResults.flat();
        const allSubmissionsData = submissionResults.flat();
        const allActivitiesData = activityResults.flat();

        setAllStudents(allStudentsData);
        setAllReflections(allReflectionsData);
        setAllSubmissions(allSubmissionsData);
        setAllActivities(allActivitiesData);

      } catch (error) {
        console.error("獲取資料失敗:", error);
      } finally {
        setLoading(false);
      }
    };

    if (allProjects.length > 0) {
      fetchAllData();
    } else {
      setLoading(false);
    }
  }, [allProjects]);

  // SDL 四階段分布
  const stageDistribution = React.useMemo(() => {
    const stages = [
      { key: 1, name: '定標', color: 'bg-blue-400',   barBg: 'bg-blue-50',   text: 'text-blue-700',  border: 'border-blue-200' },
      { key: 2, name: '擇策', color: 'bg-teal-400',   barBg: 'bg-teal-50',   text: 'text-teal-700',  border: 'border-teal-200' },
      { key: 3, name: '監評', color: 'bg-amber-400',  barBg: 'bg-amber-50',  text: 'text-amber-700', border: 'border-amber-200' },
      { key: 4, name: '調節', color: 'bg-purple-400', barBg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    ];
    const total = filteredProjects.length;
    const maxCount = Math.max(...stages.map(s => filteredProjects.filter(p => p.currentStage === s.key).length), 1);
    return stages.map(stage => {
      const count = filteredProjects.filter(p => p.currentStage === stage.key).length;
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      const barWidth = Math.round((count / maxCount) * 100);
      const isMax = count === maxCount && count > 0;
      return { ...stage, count, pct, barWidth, isMax };
    });
  }, [filteredProjects]);

  // 計算教學統計
  const teachingStats = React.useMemo(() => {
    const filteredProjectIds = new Set(filteredProjects.map(p => p.id));
    const filteredStudents = allStudents.filter(s => filteredProjectIds.has(s.projectId));
    const filteredReflections = allReflections.filter(r => filteredProjectIds.has(r.projectId));
    const filteredSubmissions = allSubmissions.filter(s => filteredProjectIds.has(s.projectId));

    const totalProjects = filteredProjects.length;
    const totalStudents = filteredStudents.length;
    const uniqueStudents = new Set(filteredStudents.map(s => s.id)).size;
    
    const averageProgress = totalProjects > 0 ? 
      Math.round(filteredProjects.reduce((sum, project) => {
        return sum + calculateProgress(project.currentStage, project.currentSubStage);
      }, 0) / totalProjects) : 0;

    const completedProjects = filteredProjects.filter(p => p.ProjectEnd).length;
    const totalReflections = filteredReflections.length;
    const totalSubmissions = filteredSubmissions.length;
    
    const thisWeekReflections = allReflections.filter(r => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return new Date(r.createdAt) > oneWeekAgo;
    }).length;

    // 需要關注的學生（進度低於30% 或 7天無反思活動）
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const needAttentionList = filteredStudents
      .map(student => {
        const studentReflections = allReflections.filter(r =>
          r.projectId === student.projectId &&
          (r.userId === student.id || r.user_id === student.id)
        );
        const lastReflection = studentReflections
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
        const lastActivityDate = lastReflection ? new Date(lastReflection.createdAt) : null;
        const daysSinceActivity = lastActivityDate
          ? Math.floor((Date.now() - lastActivityDate) / (1000 * 60 * 60 * 24))
          : null;
        const isSilent = daysSinceActivity === null || daysSinceActivity >= 7;
        return { ...student, daysSinceActivity, isSilent };
      })
      .filter(student => student.projectProgress < 30 || student.isSilent);
    const needAttentionStudents = needAttentionList.length;

    // 優秀學生（進度高於80%）
    const excellentStudents = filteredStudents.filter(student => {
      return student.projectProgress >= 80;
    }).length;

    return {
      totalProjects,
      totalStudents,
      uniqueStudents,
      averageProgress,
      completedProjects,
      totalReflections,
      totalSubmissions,
      thisWeekReflections,
      needAttentionStudents,
      needAttentionList,
      excellentStudents
    };
  }, [filteredProjects, allStudents, allReflections, allSubmissions]);

  // 各專案健康度評分（進度 33% + 本週反思率 33% + 最近活躍度 34%）
  const projectHealthScores = React.useMemo(() => {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    return filteredProjects.map(project => {
      const progress = calculateProgress(project.currentStage, project.currentSubStage);
      const projectStudents = allStudents.filter(s => s.projectId === project.id);
      const studentCount = Math.max(projectStudents.length, 1);
      const projectReflections = allReflections.filter(r => r.projectId === project.id);
      const projectActivities = allActivities.filter(a => a.projectId === project.id);
      const weeklyReflections = projectReflections.filter(r => new Date(r.createdAt) > oneWeekAgo).length;
      const hasWeeklyActivity =
        projectReflections.some(r => new Date(r.createdAt) > oneWeekAgo) ||
        projectActivities.some(a => new Date(a.createdAt || a.updatedAt) > oneWeekAgo);
      const hasBiweeklyActivity =
        projectReflections.some(r => new Date(r.createdAt) > twoWeeksAgo) ||
        projectActivities.some(a => new Date(a.createdAt || a.updatedAt) > twoWeeksAgo);

      const progressScore = (progress / 100) * 33;
      const reflectionScore = Math.min(weeklyReflections / studentCount, 1) * 33;
      const activityScore = hasWeeklyActivity ? 34 : hasBiweeklyActivity ? 17 : 0;
      const healthScore = Math.round(progressScore + reflectionScore + activityScore);

      return {
        ...project,
        healthScore,
        progress,
        studentCount: projectStudents.length,
        weeklyReflections,
        hasWeeklyActivity,
      };
    }).sort((a, b) => a.healthScore - b.healthScore);
  }, [filteredProjects, allStudents, allReflections, allActivities]);

  // 最近教學活動
  const recentActivities = React.useMemo(() => {
    const activities = [];
    
    // 添加反思活動
    allReflections.slice(0, 3).forEach(reflection => {
      activities.push({
        type: "reflection",
        title: `學生提交反思`,
        description: `${reflection.userName || '學生'} 在 ${reflection.projectName} 中提交學習反思`,
        time: formatRelativeTime(reflection.createdAt),
        projectName: reflection.projectName
      });
    });

    // 添加提交活動
    allSubmissions.slice(0, 3).forEach(submission => {
      activities.push({
        type: "submission",
        title: `作業提交`,
        description: `${submission.userName || '學生'} 在 ${submission.projectName} 中提交作業`,
        time: formatRelativeTime(submission.createdAt),
        projectName: submission.projectName
      });
    });

    // 添加專案活動
    allActivities.slice(0, 3).forEach(activity => {
      activities.push({
        type: "activity",
        title: `專案活動`,
        description: `${activity.projectName} - ${activity.action || activity.description}`,
        time: formatRelativeTime(activity.createdAt),
        projectName: activity.projectName
      });
    });

    return activities
      .sort((a, b) => new Date(b.createdAt || b.updatedAt) - new Date(a.createdAt || a.updatedAt))
      .slice(0, 10);
  }, [allReflections, allSubmissions, allActivities]);

  // 獲取專案狀態顏色
  const getProjectStatusColor = (status) => {
    if (status === "優秀") return "bg-green-100 text-green-800";
    if (status === "良好") return "bg-blue-100 text-blue-800";
    return "bg-red-100 text-red-800";
  };

  if (projectsLoading || loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="relative h-screen bg-gray-50 overflow-hidden flex flex-col">
      <TopBar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-component-sm sm:p-component-md-lg">
          <div className="max-w-7xl mx-auto">
            {/* 頁面標題與導航 */}
            <div className="mb-6 sm:mb-8">
              <div className="flex items-center mb-4">
                <button
                  onClick={() => navigate("/homepage")}
                  className="flex items-center p-component-xs mr-3 text-gray-600 hover:text-teal-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="返回首頁"
                >
                  <HiArrowLeft size={24} />
                </button>
                <div>
                  <h1 className="text-h2 sm:text-h1 lg:text-display font-extrabold text-teal-600 mb-2">
                    教師總覽儀表板
                  </h1>
                  <p className="text-body sm:text-body-lg text-gray-600">
                    歡迎回來，{userName}！掌握所有學生的學習狀況與專案進度。
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-stack-xs sm:gap-3">
                <button
                  onClick={() => setViewMode('overview')}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-body-sm font-medium transition-colors ${
                    viewMode === 'overview' 
                      ? 'bg-teal-600 text-white' 
                      : 'bg-white text-teal-600 border border-teal-600 hover:bg-teal-50'
                  }`}
                >
                  總覽
                </button>
                <button
                  onClick={() => setViewMode('students')}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-body-sm font-medium transition-colors ${
                    viewMode === 'students' 
                      ? 'bg-teal-600 text-white' 
                      : 'bg-white text-teal-600 border border-teal-600 hover:bg-teal-50'
                  }`}
                >
                  學生管理
                </button>
              </div>
            </div>

            {/* 學期篩選 */}
            {availableSemesters.length > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="text-body-sm text-gray-500 font-medium">學期：</span>
                <button
                  onClick={() => setSelectedSemester('all')}
                  className={`px-3 py-1 rounded-full text-body-sm font-medium transition-colors ${
                    selectedSemester === 'all'
                      ? 'bg-teal-600 text-white'
                      : 'bg-white text-gray-600 border border-gray-300 hover:border-teal-500 hover:text-teal-600'
                  }`}
                >
                  全部學期
                </button>
                {availableSemesters.map(sem => (
                  <button
                    key={sem}
                    onClick={() => setSelectedSemester(sem)}
                    className={`px-3 py-1 rounded-full text-body-sm font-medium transition-colors ${
                      selectedSemester === sem
                        ? 'bg-teal-600 text-white'
                        : 'bg-white text-gray-600 border border-gray-300 hover:border-teal-500 hover:text-teal-600'
                    }`}
                  >
                    {sem}
                  </button>
                ))}
              </div>
            )}

            {/* 統計卡片區域 */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-stack-sm sm:gap-stack-md mb-6 sm:mb-8">
              {/* 指導專案 */}
              <div className="bg-white border border-gray-200 hover:border-gray-400 transition-colors duration-fast rounded-xl p-component-sm sm:p-component-md">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-caption text-[#888780]">指導專案</h3>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#E1F5EE] text-teal-600">
                    <FiBookOpen className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-h2 font-medium text-[#2C2C2A] mb-1">{teachingStats.totalProjects}</p>
                <p className="text-caption text-[#888780] mb-3">完成 {teachingStats.completedProjects} 個</p>
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-teal-500" style={{ width: `${teachingStats.totalProjects > 0 ? 100 : 0}%` }} />
                </div>
              </div>

              {/* 指導學生 */}
              <div className="bg-white border border-gray-200 hover:border-gray-400 transition-colors duration-fast rounded-xl p-component-sm sm:p-component-md">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-caption text-[#888780]">指導學生</h3>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#E6F1FB] text-blue-600">
                    <FiUsers className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-h2 font-medium text-[#2C2C2A] mb-1">{teachingStats.uniqueStudents}</p>
                <p className="text-caption text-[#888780] mb-3">活躍學生數</p>
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-blue-400" style={{ width: `${teachingStats.uniqueStudents > 0 ? Math.min(100, teachingStats.uniqueStudents * 5) : 0}%` }} />
                </div>
              </div>

              {/* 平均進度 */}
              <div className="bg-white border border-gray-200 hover:border-gray-400 transition-colors duration-fast rounded-xl p-component-sm sm:p-component-md">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-caption text-[#888780]">平均進度</h3>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#E1F5EE] text-customgreen">
                    <FiTrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-h2 font-medium text-[#2C2C2A] mb-1">{teachingStats.averageProgress}%</p>
                <p className="text-caption text-[#888780] mb-3">整體進度</p>
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-customgreen" style={{ width: `${teachingStats.averageProgress}%` }} />
                </div>
              </div>

              {/* 需關注 */}
              <div className="bg-white border border-gray-200 hover:border-gray-400 transition-colors duration-fast rounded-xl p-component-sm sm:p-component-md">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-caption text-[#888780]">需關注</h3>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#FAEEDA] text-amber-600">
                    <FiAlertTriangle className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-h2 font-medium text-[#2C2C2A] mb-1">{teachingStats.needAttentionStudents}</p>
                <p className="text-caption text-[#888780] mb-3">進度 &lt;30%</p>
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-amber-400" style={{ width: `${teachingStats.uniqueStudents > 0 ? Math.round((teachingStats.needAttentionStudents / teachingStats.uniqueStudents) * 100) : 0}%` }} />
                </div>
              </div>

              {/* 優秀學生 */}
              <div className="bg-white border border-gray-200 hover:border-gray-400 transition-colors duration-fast rounded-xl p-component-sm sm:p-component-md">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-caption text-[#888780]">優秀學生</h3>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#EAF3DE] text-teal-600">
                    <FiStar className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-h2 font-medium text-[#2C2C2A] mb-1">{teachingStats.excellentStudents}</p>
                <p className="text-caption text-[#888780] mb-3">進度 ≥80%</p>
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-teal-400" style={{ width: `${teachingStats.uniqueStudents > 0 ? Math.round((teachingStats.excellentStudents / teachingStats.uniqueStudents) * 100) : 0}%` }} />
                </div>
              </div>

              {/* 本週反思 */}
              <div className="bg-white border border-gray-200 hover:border-gray-400 transition-colors duration-fast rounded-xl p-component-sm sm:p-component-md">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-caption text-[#888780]">本週反思</h3>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#E1F5EE] text-teal-600">
                    <FiFileText className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-h2 font-medium text-[#2C2C2A] mb-1">{teachingStats.thisWeekReflections}</p>
                <p className="text-caption text-[#888780] mb-3">共 {teachingStats.totalReflections} 篇</p>
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-teal-400" style={{ width: '65%' }} />
                </div>
              </div>
            </div>

            {/* 根據viewMode顯示不同內容 */}
            {viewMode === 'overview' && (
              <div className="space-y-stack-md sm:space-y-stack-md-lg">
              {/* ① SDL 四階段分布圖 */}
              <div className="bg-white p-component-base sm:p-component-md-lg rounded-xl shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-h3 sm:text-h2 font-semibold text-gray-800">SDL 階段分布</h2>
                  <span className="text-caption text-gray-400">共 {filteredProjects.length} 個專案</span>
                </div>
                {filteredProjects.length === 0 ? (
                  <p className="text-center text-gray-400 py-4 text-body-sm">尚無專案資料</p>
                ) : (
                  <div className="space-y-3">
                    {stageDistribution.map(stage => (
                      <div key={stage.key} className="flex items-center gap-3">
                        <span className={`w-10 text-right text-body-sm font-semibold shrink-0 ${stage.text}`}>
                          {stage.name}
                        </span>
                        <div className="flex-1 relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                          <div
                            className={`h-full ${stage.color} rounded-lg transition-all duration-slow flex items-center`}
                            style={{ width: stage.count === 0 ? '0%' : `${Math.max(stage.barWidth, 4)}%` }}
                          />
                          {stage.isMax && stage.count > 0 && (
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-caption font-medium text-gray-500 whitespace-nowrap">
                              ← 本週重點關注
                            </span>
                          )}
                        </div>
                        <div className="shrink-0 flex items-center gap-1.5 w-24 justify-end">
                          <span className={`text-body-sm font-bold ${stage.count > 0 ? stage.text : 'text-gray-300'}`}>
                            {stage.count} 組
                          </span>
                          <span className="text-caption text-gray-400">({stage.pct}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ③ 各專案健康度橫向比較 */}
              <div className="bg-white p-component-base sm:p-component-md-lg rounded-xl shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center">
                      <h2 className="text-h3 sm:text-h2 font-semibold text-gray-800">各專案健康度一覽</h2>
                      <Tooltip text="健康分（0–100）由三項加權：進度（33%）+ 本週每人平均反思數（33%）+ 近期活躍度（34%，涵蓋反思與活動記錄）。7 天內有動靜得 34 分，14 天內得 17 分，無活動得 0 分。分數越低排越前，方便優先關注。" />
                    </div>
                    <p className="text-caption text-gray-400 mt-0.5">綜合進度、本週反思率、最近動態 — 由低至高排列</p>
                  </div>
                  <span className="text-caption text-gray-400">{filteredProjects.length} 個專案</span>
                </div>
                {filteredProjects.length === 0 ? (
                  <p className="text-center text-gray-400 py-4 text-body-sm">尚無專案資料</p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-customgreen scrollbar-track-gray-50">
                    {projectHealthScores.map((project) => {
                      const scoreStyle = project.healthScore >= 75
                        ? { badge: 'bg-green-100 text-green-700 border-green-200', bar: 'bg-green-400', label: '運作良好' }
                        : project.healthScore >= 45
                        ? { badge: 'bg-amber-100 text-amber-700 border-amber-200', bar: 'bg-amber-400', label: '待關注' }
                        : { badge: 'bg-red-100 text-red-700 border-red-200', bar: 'bg-red-400', label: '需介入' };

                      return (
                        <div key={project.id} className="flex items-center gap-3 p-component-xs border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors duration-fast">
                          {/* 健康分數 */}
                          <div className={`shrink-0 w-12 text-center px-1.5 py-1 rounded-lg border text-body-sm font-bold ${scoreStyle.badge}`}>
                            {project.healthScore}
                          </div>
                          {/* 專案資訊 */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-body-sm font-medium text-gray-800 truncate">{project.name}</p>
                              <span className={`shrink-0 text-caption px-1.5 py-0.5 rounded-full border ${scoreStyle.badge}`}>{scoreStyle.label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-full ${scoreStyle.bar} rounded-full transition-all duration-slow`} style={{ width: `${project.healthScore}%` }} />
                              </div>
                              <div className="flex gap-2 text-caption text-gray-500 shrink-0">
                                <span>進度 {project.progress}%</span>
                                <span>·</span>
                                <span>本週反思 {project.weeklyReflections} 篇</span>
                                <span>·</span>
                                <span className={project.hasWeeklyActivity ? 'text-green-600' : 'text-amber-600'}>
                                  {project.hasWeeklyActivity ? '本週活躍' : '近期沉寂'}
                                </span>
                              </div>
                            </div>
                          </div>
                          {/* 進入按鈕 */}
                          <button
                            onClick={() => navigate(`/project/${project.id}/teacherDashboard`)}
                            className="shrink-0 text-caption px-3 py-1 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors duration-fast"
                          >
                            查看
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-stack-md sm:gap-stack-md-lg">
                {/* 左側 - 專案總覽 */}
                <div className="lg:col-span-2 space-y-stack-md sm:space-y-stack-md-lg">
                  {/* 專案進度概覽 */}
                  <div className="bg-white p-component-base sm:p-component-md-lg rounded-xl shadow-sm">
                    <h2 className="text-h3 sm:text-h2 font-semibold text-gray-800 mb-4 sm:mb-6">專案進度概覽</h2>
                    <div className="space-y-stack-sm max-h-96 overflow-y-auto">
                      {filteredProjects.length > 0 ? (
                        filteredProjects.map((project, index) => {
                          const progress = calculateProgress(project.currentStage, project.currentSubStage);
                          const projectStudents = allStudents.filter(s => s.projectId === project.id);
                          const status = progress >= 80 ? "優秀" : progress >= 50 ? "良好" : "需關注";
                          
                          return (
                            <div key={index} className="border border-gray-200 rounded-lg p-component-base hover:shadow-md transition-shadow">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 space-y-stack-xs sm:space-y-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-semibold text-gray-800 text-body sm:text-body-lg">{project.name}</h3>
                                  {project.semester && (
                                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-caption font-medium rounded-full border border-indigo-200">
                                      {project.semester}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center space-x-stack-xs">
                                  <span className={`px-2 py-1 rounded-full text-caption font-medium ${getProjectStatusColor(status)}`}>
                                    {status}
                                  </span>
                                  <button
                                    onClick={() => navigate(`/project/${project.id}/kanban`)}
                                    className="px-3 py-1 bg-teal-600 text-white text-caption rounded-lg hover:bg-teal-700 transition-colors"
                                  >
                                    進入專案
                                  </button>
                                </div>
                              </div>
                              
                              <p className="text-gray-600 text-body-sm mb-2 truncate">{project.describe}</p>
                              
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-caption text-gray-500 space-y-1 sm:space-y-0">
                                <span>階段: {project.currentStage}-{project.currentSubStage}</span>
                                <span>學生數: {projectStudents.length}</span>
                              </div>
                              
                              <div className="mt-3">
                                <div className="flex justify-between text-caption text-gray-500 mb-1">
                                  <span>整體進度</span>
                                  <span>{progress}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-teal-600 h-2 rounded-full transition-all duration-slow" 
                                    style={{ width: `${progress}%` }}
                                  ></div>
                                </div>
                              </div>
                              
                              {projectStudents.length > 0 && (
                                <div className="mt-2 flex items-center text-caption text-gray-500">
                                  <span className="mr-2">學生:</span>
                                  <div className="flex items-center space-x-1">
                                    {projectStudents.slice(0, 3).map((student, idx) => (
                                      <span key={idx} className="bg-gray-100 px-2 py-1 rounded text-caption">
                                        {student.username}
                                      </span>
                                    ))}
                                    {projectStudents.length > 3 && (
                                      <span className="text-gray-400">+{projectStudents.length - 3}</span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <p>{selectedSemester === 'all' ? '尚未指導任何專案' : `${selectedSemester} 學期無專案`}</p>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* 右側 - 最近活動和統計 */}
                <div className="space-y-stack-md sm:space-y-stack-md-lg">
                  {/* 最近教學活動 */}
                  <div className="bg-white p-component-base sm:p-component-md-lg rounded-xl shadow-sm">
                    <h2 className="text-h3 sm:text-h2 font-semibold text-gray-800 mb-4 sm:mb-6">最近活動</h2>
                    <div className="space-y-stack-sm max-h-96 overflow-y-auto">
                      {recentActivities.length > 0 ? (
                        recentActivities.map((activity, index) => (
                          <div key={index} className="border-l-4 border-teal-500 pl-4 py-2">
                            <h4 className="font-medium text-gray-800 text-body-sm">{activity.title}</h4>
                            <p className="text-caption text-gray-600 mt-1">{activity.description}</p>
                            <div className="flex justify-between items-center mt-2">
                              <span className="text-caption text-teal-600 font-medium">{activity.projectName}</span>
                              <span className="text-caption text-gray-400">{activity.time}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-center py-4">暫無最近活動</p>
                      )}
                    </div>
                  </div>

                  {/* ② 需要關注的學生 - 具名清單 */}
                  <div className="bg-white p-component-base sm:p-component-md-lg rounded-xl shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-h3 sm:text-h2 font-semibold text-gray-800">需要關注</h2>
                      {teachingStats.needAttentionStudents > 0 && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-caption font-medium rounded-full">
                          {teachingStats.needAttentionStudents} 人
                        </span>
                      )}
                    </div>
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {teachingStats.needAttentionStudents === 0 ? (
                        <p className="text-gray-500 text-center py-4 text-body-sm">所有學生表現良好</p>
                      ) : (
                        teachingStats.needAttentionList.slice(0, 8).map((student, index) => {
                          const isLowProgress = student.projectProgress < 30;
                          const riskReason = isLowProgress
                            ? (student.projectProgress < 10
                              ? '幾乎無進度，需立即關注'
                              : student.projectProgress < 20
                              ? `進度僅 ${student.projectProgress}%，嚴重落後`
                              : `進度 ${student.projectProgress}%，低於門檻 30%`)
                            : (student.daysSinceActivity === null
                              ? '尚未在此專案撰寫任何反思'
                              : `已 ${student.daysSinceActivity} 天無學習活動`);
                          return (
                            <div key={index} className={`border rounded-lg p-component-sm ${isLowProgress ? 'border-amber-200 bg-amber-50' : 'border-orange-200 bg-orange-50'}`}>
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div className="min-w-0">
                                  <span className="text-body-sm font-semibold text-gray-800 block truncate">
                                    {student.username}
                                  </span>
                                  <span className="text-caption text-gray-500 block truncate">{student.projectName}</span>
                                </div>
                                {isLowProgress ? (
                                  <span className="shrink-0 text-caption font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                                    {student.projectProgress}%
                                  </span>
                                ) : (
                                  <span className="shrink-0 text-caption font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded">
                                    {student.daysSinceActivity === null ? '從未' : `${student.daysSinceActivity}天`}
                                  </span>
                                )}
                              </div>
                              <p className={`text-caption mb-2 ${isLowProgress ? 'text-amber-700' : 'text-orange-700'}`}>{riskReason}</p>
                              <button
                                onClick={() => navigate(`/project/${student.projectId}/teacherDashboard`)}
                                className="w-full text-caption bg-teal-600 text-white py-1 rounded hover:bg-teal-700 transition-colors duration-fast"
                              >
                                前往查看
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
              </div>
            )}

            {/* 學生管理視圖 */}
            {viewMode === 'students' && (
              <div className="bg-white p-component-base sm:p-component-md-lg rounded-xl shadow-sm">
                <h2 className="text-h3 sm:text-h2 font-semibold text-gray-800 mb-4 sm:mb-6">所有學生管理</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-stack-sm max-h-96 overflow-y-auto">
                  {allStudents.filter(s => filteredProjects.some(p => p.id === s.projectId)).map((student, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-component-base">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-gray-800">{student.username}</h3>
                        <span className={`px-2 py-1 rounded text-caption font-medium ${getStatusColor(student.projectProgress)}`}>
                          {student.projectProgress}%
                        </span>
                      </div>
                      <p className="text-body-sm text-gray-600 mb-2">{student.projectName}</p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div 
                          className="bg-teal-600 h-2 rounded-full transition-all duration-slow" 
                          style={{ width: `${student.projectProgress}%` }}
                        ></div>
                      </div>
                      <button
                        onClick={() => navigate(`/project/${student.projectId}/studentDashboard`)}
                        className="w-full text-caption bg-teal-600 text-white py-1 rounded hover:bg-teal-700 transition-colors"
                      >
                        查看詳情
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
};

export default TeacherOverview;