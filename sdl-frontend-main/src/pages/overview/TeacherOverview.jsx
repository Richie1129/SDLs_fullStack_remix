import React, { useState, useEffect } from "react";
import { getProjectsByMentor } from "../../api/project";
import { getProjectUser } from "../../api/users";
import { getAllPersonalDaily } from "../../api/reflection";
import { getKanbanColumns, getProjectActivity } from "../../api/kanban";
import { getAllSubmit } from "../../api/submit";
import { useQuery } from "react-query";
import { useNavigate } from "react-router-dom";
import { HiArrowLeft } from "react-icons/hi";
import TopBar from "../../components/TopBar";

const TeacherOverview = () => {
  const navigate = useNavigate();
  const userName = localStorage.getItem("username");
  
  // 狀態管理
  const [allProjects, setAllProjects] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [allReflections, setAllReflections] = useState([]);
  const [allSubmissions, setAllSubmissions] = useState([]);
  const [allActivities, setAllActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('overview'); // 'overview', 'students', 'projects', 'analytics'

  // 獲取教師的所有專案
  const { data: projectData, isLoading: projectsLoading } = useQuery(
    "teacherAllProjects", 
    () => getProjectsByMentor(userName),
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
    }
  }, [allProjects]);

  // 計算進度百分比的函數
  const calculateProgress = (stage, subStage) => {
    if (!stage || !subStage) return 0;
    const totalSubStages = [3, 4, 5, 3]; // 各階段的子階段數量
    let completedSubStages = 0;
    
    for (let i = 1; i < stage; i++) {
      completedSubStages += totalSubStages[i - 1] || 0;
    }
    completedSubStages += Math.max(0, subStage - 1);
    
    const totalStages = totalSubStages.reduce((sum, stages) => sum + stages, 0);
    return Math.min(Math.round((completedSubStages / totalStages) * 100), 100);
  };

  // 計算教學統計
  const teachingStats = React.useMemo(() => {
    const totalProjects = allProjects.length;
    const totalStudents = allStudents.length;
    const uniqueStudents = new Set(allStudents.map(s => s.id)).size;
    
    const averageProgress = totalProjects > 0 ? 
      Math.round(allProjects.reduce((sum, project) => {
        return sum + calculateProgress(project.currentStage, project.currentSubStage);
      }, 0) / totalProjects) : 0;

    const completedProjects = allProjects.filter(p => p.ProjectEnd).length;
    const totalReflections = allReflections.length;
    const totalSubmissions = allSubmissions.length;
    
    const thisWeekReflections = allReflections.filter(r => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return new Date(r.createdAt) > oneWeekAgo;
    }).length;

    // 需要關注的學生（進度低於30%）
    const needAttentionStudents = allStudents.filter(student => {
      return student.projectProgress < 30;
    }).length;

    // 優秀學生（進度高於80%）
    const excellentStudents = allStudents.filter(student => {
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
      excellentStudents
    };
  }, [allProjects, allStudents, allReflections, allSubmissions]);

  // 格式化相對時間
  const formatRelativeTime = (dateString) => {
    if (!dateString) return '未知時間';
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return '剛剛';
    if (diffInMinutes < 60) return `${diffInMinutes}分鐘前`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}小時前`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}天前`;
  };

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
  }, [allReflections, allSubmissions, allActivities, formatRelativeTime]);

  // 獲取狀態顏色
  const getStatusColor = (progress) => {
    if (progress >= 80) return "bg-green-100 text-green-800";
    if (progress >= 50) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

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
    <div className="min-h-screen w-full bg-gray-50">
      <TopBar />
      <div className="pt-20 h-screen overflow-y-auto">
        <div className="p-3 sm:p-6">
          <div className="max-w-7xl mx-auto">
            {/* 頁面標題與導航 */}
            <div className="mb-6 sm:mb-8">
              <div className="flex items-center mb-4">
                <button
                  onClick={() => navigate("/homepage")}
                  className="flex items-center p-2 mr-3 text-gray-600 hover:text-teal-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="返回首頁"
                >
                  <HiArrowLeft size={24} />
                </button>
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-teal-600 mb-2">
                    教師總覽儀表板
                  </h1>
                  <p className="text-base sm:text-lg text-gray-600">
                    歡迎回來，{userName}！掌握所有學生的學習狀況與專案進度。
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 sm:gap-3">
                <button
                  onClick={() => setViewMode('overview')}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'overview' 
                      ? 'bg-teal-600 text-white' 
                      : 'bg-white text-teal-600 border border-teal-600 hover:bg-teal-50'
                  }`}
                >
                  總覽
                </button>
                <button
                  onClick={() => setViewMode('students')}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'students' 
                      ? 'bg-teal-600 text-white' 
                      : 'bg-white text-teal-600 border border-teal-600 hover:bg-teal-50'
                  }`}
                >
                  學生管理
                </button>
                <button
                  onClick={() => setViewMode('projects')}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'projects' 
                      ? 'bg-teal-600 text-white' 
                      : 'bg-white text-teal-600 border border-teal-600 hover:bg-teal-50'
                  }`}
                >
                  專案監控
                </button>
                <button
                  onClick={() => setViewMode('analytics')}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'analytics' 
                      ? 'bg-teal-600 text-white' 
                      : 'bg-white text-teal-600 border border-teal-600 hover:bg-teal-50'
                  }`}
                >
                  數據分析
                </button>
              </div>
            </div>

            {/* 統計卡片區域 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-6 mb-6 sm:mb-8">
              <div className="bg-gradient-to-r from-teal-500 to-teal-600 p-4 sm:p-6 rounded-xl text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-teal-100 text-xs sm:text-sm">指導專案</p>
                    <p className="text-2xl sm:text-3xl font-bold">{teachingStats.totalProjects}</p>
                  </div>
                  <div className="text-3xl sm:text-4xl">📚</div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 sm:p-6 rounded-xl text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-xs sm:text-sm">指導學生</p>
                    <p className="text-2xl sm:text-3xl font-bold">{teachingStats.uniqueStudents}</p>
                  </div>
                  <div className="text-3xl sm:text-4xl">👥</div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 sm:p-6 rounded-xl text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-xs sm:text-sm">平均進度</p>
                    <p className="text-2xl sm:text-3xl font-bold">{teachingStats.averageProgress}%</p>
                  </div>
                  <div className="text-3xl sm:text-4xl">📈</div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 sm:p-6 rounded-xl text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-xs sm:text-sm">需關注</p>
                    <p className="text-2xl sm:text-3xl font-bold">{teachingStats.needAttentionStudents}</p>
                  </div>
                  <div className="text-3xl sm:text-4xl">⚠️</div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 sm:p-6 rounded-xl text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-xs sm:text-sm">優秀學生</p>
                    <p className="text-2xl sm:text-3xl font-bold">{teachingStats.excellentStudents}</p>
                  </div>
                  <div className="text-3xl sm:text-4xl">⭐</div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-pink-500 to-pink-600 p-4 sm:p-6 rounded-xl text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-pink-100 text-xs sm:text-sm">本週反思</p>
                    <p className="text-2xl sm:text-3xl font-bold">{teachingStats.thisWeekReflections}</p>
                  </div>
                  <div className="text-3xl sm:text-4xl">📝</div>
                </div>
              </div>
            </div>

            {/* 根據viewMode顯示不同內容 */}
            {viewMode === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                {/* 左側 - 專案總覽 */}
                <div className="lg:col-span-2 space-y-6 sm:space-y-8">
                  {/* 專案進度概覽 */}
                  <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm">
                    <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-4 sm:mb-6">專案進度概覽</h2>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {allProjects.length > 0 ? (
                        allProjects.map((project, index) => {
                          const progress = calculateProgress(project.currentStage, project.currentSubStage);
                          const projectStudents = allStudents.filter(s => s.projectId === project.id);
                          const status = progress >= 80 ? "優秀" : progress >= 50 ? "良好" : "需關注";
                          
                          return (
                            <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 space-y-2 sm:space-y-0">
                                <h3 className="font-semibold text-gray-800 text-base sm:text-lg">{project.name}</h3>
                                <div className="flex items-center space-x-2">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getProjectStatusColor(status)}`}>
                                    {status}
                                  </span>
                                  <button
                                    onClick={() => navigate(`/project/${project.id}/kanban`)}
                                    className="px-3 py-1 bg-teal-600 text-white text-xs rounded-lg hover:bg-teal-700 transition-colors"
                                  >
                                    進入專案
                                  </button>
                                </div>
                              </div>
                              
                              <p className="text-gray-600 text-sm mb-2 truncate">{project.describe}</p>
                              
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-gray-500 space-y-1 sm:space-y-0">
                                <span>階段: {project.currentStage}-{project.currentSubStage}</span>
                                <span>學生數: {projectStudents.length}</span>
                              </div>
                              
                              <div className="mt-3">
                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                  <span>整體進度</span>
                                  <span>{progress}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-teal-600 h-2 rounded-full transition-all duration-500" 
                                    style={{ width: `${progress}%` }}
                                  ></div>
                                </div>
                              </div>
                              
                              {projectStudents.length > 0 && (
                                <div className="mt-2 flex items-center text-xs text-gray-500">
                                  <span className="mr-2">學生:</span>
                                  <div className="flex items-center space-x-1">
                                    {projectStudents.slice(0, 3).map((student, idx) => (
                                      <span key={idx} className="bg-gray-100 px-2 py-1 rounded text-xs">
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
                          <p>尚未指導任何專案</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 學生學習表現分析 */}
                  <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm">
                    <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-4">學生表現分析</h2>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-green-50 p-4 rounded-lg text-center">
                          <h3 className="text-lg font-bold text-green-600">{teachingStats.excellentStudents}</h3>
                          <p className="text-sm text-gray-600">優秀學生 (≥80%)</p>
                        </div>
                        <div className="bg-yellow-50 p-4 rounded-lg text-center">
                          <h3 className="text-lg font-bold text-yellow-600">
                            {teachingStats.uniqueStudents - teachingStats.excellentStudents - teachingStats.needAttentionStudents}
                          </h3>
                          <p className="text-sm text-gray-600">表現良好 (50-79%)</p>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg text-center">
                          <h3 className="text-lg font-bold text-red-600">{teachingStats.needAttentionStudents}</h3>
                          <p className="text-sm text-gray-600">需要關注 (50%)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 右側 - 最近活動和統計 */}
                <div className="space-y-6 sm:space-y-8">
                  {/* 最近教學活動 */}
                  <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm">
                    <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-4 sm:mb-6">最近活動</h2>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {recentActivities.length > 0 ? (
                        recentActivities.map((activity, index) => (
                          <div key={index} className="border-l-4 border-teal-500 pl-4 py-2">
                            <h4 className="font-medium text-gray-800 text-sm">{activity.title}</h4>
                            <p className="text-xs text-gray-600 mt-1">{activity.description}</p>
                            <div className="flex justify-between items-center mt-2">
                              <span className="text-xs text-teal-600 font-medium">{activity.projectName}</span>
                              <span className="text-xs text-gray-400">{activity.time}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-center py-4">暫無最近活動</p>
                      )}
                    </div>
                  </div>

                  {/* 教學統計摘要 */}
                  <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm">
                    <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-4">教學統計</h2>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">總教學時數</span>
                        <span className="font-semibold text-gray-800">{teachingStats.totalProjects * 40}小時</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">學生反思數量</span>
                        <span className="font-semibold text-gray-800">{teachingStats.totalReflections}篇</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">作業提交數量</span>
                        <span className="font-semibold text-gray-800">{teachingStats.totalSubmissions}份</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">平均學習進度</span>
                        <span className="font-semibold text-gray-800">{teachingStats.averageProgress}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">教學效果</span>
                        <span className={`font-semibold ${teachingStats.averageProgress >= 70 ? 'text-green-600' : teachingStats.averageProgress >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {teachingStats.averageProgress >= 70 ? "優秀" : teachingStats.averageProgress >= 50 ? "良好" : "待改善"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 需要關注的學生 */}
                  <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm">
                    <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-4">需要關注</h2>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {allStudents
                        .filter(student => student.projectProgress < 50)
                        .slice(0, 5)
                        .map((student, index) => (
                          <div key={index} className="bg-red-50 p-3 rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-sm font-medium text-red-800">{student.username}</span>
                              <span className="text-xs text-red-600">{student.projectProgress}%</span>
                            </div>
                            <p className="text-xs text-gray-600">{student.projectName}</p>
                          </div>
                        ))}
                      {teachingStats.needAttentionStudents === 0 && (
                        <p className="text-gray-500 text-center py-4">所有學生表現良好</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 學生管理視圖 */}
            {viewMode === 'students' && (
              <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-4 sm:mb-6">所有學生管理</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                  {allStudents.map((student, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-gray-800">{student.username}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(student.projectProgress)}`}>
                          {student.projectProgress}%
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{student.projectName}</p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div 
                          className="bg-teal-600 h-2 rounded-full transition-all duration-500" 
                          style={{ width: `${student.projectProgress}%` }}
                        ></div>
                      </div>
                      <button
                        onClick={() => navigate(`/project/${student.projectId}/studentDashboard`)}
                        className="w-full text-xs bg-teal-600 text-white py-1 rounded hover:bg-teal-700 transition-colors"
                      >
                        查看詳情
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 專案監控視圖 */}
            {viewMode === 'projects' && (
              <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-4 sm:mb-6">專案監控</h2>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {allProjects.map((project, index) => {
                    const progress = calculateProgress(project.currentStage, project.currentSubStage);
                    const projectStudents = allStudents.filter(s => s.projectId === project.id);
                    const avgStudentProgress = projectStudents.length > 0 ? 
                      Math.round(projectStudents.reduce((sum, s) => sum + s.projectProgress, 0) / projectStudents.length) : 0;
                    
                    return (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="font-semibold text-gray-800">{project.name}</h3>
                          <button
                            onClick={() => navigate(`/project/${project.id}/teacherDashboard`)}
                            className="px-3 py-1 bg-teal-600 text-white text-xs rounded hover:bg-teal-700 transition-colors"
                          >
                            詳細管理
                          </button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">專案進度</span>
                            <div className="font-semibold">{progress}%</div>
                          </div>
                          <div>
                            <span className="text-gray-500">學生數量</span>
                            <div className="font-semibold">{projectStudents.length}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">平均表現</span>
                            <div className="font-semibold">{avgStudentProgress}%</div>
                          </div>
                          <div>
                            <span className="text-gray-500">階段</span>
                            <div className="font-semibold">{project.currentStage}-{project.currentSubStage}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 數據分析視圖 */}
            {viewMode === 'analytics' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">學習趨勢分析</h2>
                  <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="font-medium text-blue-800 mb-2">整體學習表現</h3>
                      <p className="text-sm text-gray-600">
                        平均進度: {teachingStats.averageProgress}%<br/>
                        完成專案: {teachingStats.completedProjects}/{teachingStats.totalProjects}<br/>
                        學習活躍度: {teachingStats.thisWeekReflections > 0 ? "高" : "需提升"}
                      </p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h3 className="font-medium text-green-800 mb-2">教學成效</h3>
                      <p className="text-sm text-gray-600">
                        優秀學生比例: {teachingStats.uniqueStudents > 0 ? Math.round((teachingStats.excellentStudents / teachingStats.uniqueStudents) * 100) : 0}%<br/>
                        需關注學生: {teachingStats.needAttentionStudents}人<br/>
                        反思參與度: {teachingStats.totalReflections > 0 ? "良好" : "待提升"}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">改進建議</h2>
                  <div className="space-y-3">
                    {teachingStats.needAttentionStudents > 0 && (
                      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3">
                        <p className="text-sm text-yellow-800">
                          建議加強對 {teachingStats.needAttentionStudents} 位進度落後學生的個別指導
                        </p>
                      </div>
                    )}
                    {teachingStats.thisWeekReflections < teachingStats.uniqueStudents && (
                      <div className="bg-blue-50 border-l-4 border-blue-400 p-3">
                        <p className="text-sm text-blue-800">
                          可考慮鼓勵學生更頻繁地撰寫學習反思
                        </p>
                      </div>
                    )}
                    {teachingStats.averageProgress < 50 && (
                      <div className="bg-red-50 border-l-4 border-red-400 p-3">
                        <p className="text-sm text-red-800">
                          整體進度偏慢，建議檢視教學方式或調整專案難度
                        </p>
                      </div>
                    )}
                    {teachingStats.excellentStudents / teachingStats.uniqueStudents > 0.7 && (
                      <div className="bg-green-50 border-l-4 border-green-400 p-3">
                        <p className="text-sm text-green-800">
                          教學成效優異！大部分學生表現優秀
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherOverview;