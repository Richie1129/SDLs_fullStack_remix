import React, { useState, useEffect } from "react";
import { getAllProject } from "../../api/project";
import { getProjectUser } from "../../api/users";
import { getAllPersonalDaily } from "../../api/reflection";
import { useQuery } from "react-query";
import { useNavigate } from "react-router-dom";
import { HiArrowLeft } from "react-icons/hi";
import TopBar from "../../components/TopBar";

const StudentOverview = () => {
  const navigate = useNavigate();
  const userId = localStorage.getItem("id");
  const userName = localStorage.getItem("username");
  
  // 狀態管理
  const [allProjects, setAllProjects] = useState([]);
  const [allReflections, setAllReflections] = useState([]);
  const [projectMembers, setProjectMembers] = useState({});
  const [loading, setLoading] = useState(true);

  // 獲取學生的所有專案
  const { data: projectData, isLoading: projectsLoading } = useQuery(
    "studentAllProjects", 
    () => getAllProject({ params: { userId } }),
    {
      onSuccess: (data) => {
        setAllProjects(data || []);
      }
    }
  );

  // 獲取所有反思記錄
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        
        if (!allProjects.length) return;

        // 獲取所有專案的反思記錄
        const reflectionPromises = allProjects.map(async (project) => {
          try {
            const reflections = await getAllPersonalDaily({ 
              projectId: project.id, 
              isTeacher: false 
            });
            return reflections?.map(r => ({ ...r, projectId: project.id, projectName: project.name })) || [];
          } catch (error) {
            console.error(`獲取專案 ${project.id} 反思失敗:`, error);
            return [];
          }
        });

        // 獲取所有專案的成員資料
        const memberPromises = allProjects.map(async (project) => {
          try {
            const members = await getProjectUser(project.id);
            return { [project.id]: members || [] };
          } catch (error) {
            console.error(`獲取專案 ${project.id} 成員失敗:`, error);
            return { [project.id]: [] };
          }
        });

        const [reflectionResults, memberResults] = await Promise.all([
          Promise.all(reflectionPromises),
          Promise.all(memberPromises)
        ]);

        // 合併反思資料
        const allReflectionsData = reflectionResults.flat();
        setAllReflections(allReflectionsData);

        // 合併成員資料
        const membersData = memberResults.reduce((acc, curr) => ({ ...acc, ...curr }), {});
        setProjectMembers(membersData);

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

  // 計算個人統計
  const personalStats = React.useMemo(() => {
    const totalProjects = allProjects.length;
    const completedProjects = allProjects.filter(p => p.ProjectEnd).length;
    const inProgressProjects = totalProjects - completedProjects;
    
    const averageProgress = totalProjects > 0 ? 
      Math.round(allProjects.reduce((sum, project) => {
        return sum + calculateProgress(project.currentStage, project.currentSubStage);
      }, 0) / totalProjects) : 0;

    const totalReflections = allReflections.length;
    const thisWeekReflections = allReflections.filter(r => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return new Date(r.createdAt) > oneWeekAgo;
    }).length;

    return {
      totalProjects,
      completedProjects,
      inProgressProjects,
      averageProgress,
      totalReflections,
      thisWeekReflections
    };
  }, [allProjects, allReflections]);

  // 最近學習活動
  const recentActivities = React.useMemo(() => {
    const activities = [];
    
    // 添加反思活動
    allReflections.slice(0, 5).forEach(reflection => {
      activities.push({
        type: "reflection",
        title: `提交學習反思`,
        description: `在 ${reflection.projectName} 中記錄學習心得`,
        time: formatRelativeTime(reflection.createdAt),
        projectName: reflection.projectName
      });
    });

    // 添加專案進度更新
    allProjects.forEach(project => {
      activities.push({
        type: "progress",
        title: `專案進度更新`,
        description: `${project.name} - 第${project.currentStage}階段`,
        time: formatRelativeTime(project.updatedAt),
        projectName: project.name
      });
    });

    return activities
      .sort((a, b) => new Date(b.createdAt || b.updatedAt) - new Date(a.createdAt || a.updatedAt))
      .slice(0, 8);
  }, [allProjects, allReflections, formatRelativeTime]);

  // 獲取狀態顏色
  const getStatusColor = (progress) => {
    if (progress >= 80) return "bg-green-100 text-green-800";
    if (progress >= 50) return "bg-yellow-100 text-yellow-800";
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
            {/* 頁面標題 */}
            <div className="mb-6 sm:mb-16">
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
                    我的學習歷程
                  </h1>
                  <p className="text-base sm:text-lg text-gray-600">
                    歡迎回來，{userName}！追踪你的整體學習進度與成長軌跡。
                  </p>
                </div>
              </div>
            </div>

            {/* 統計卡片區域 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-6 mb-6 sm:mb-8">
              <div className="bg-gradient-to-r from-teal-500 to-teal-600 p-4 sm:p-6 rounded-xl text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-teal-100 text-xs sm:text-sm">參與專案</p>
                    <p className="text-2xl sm:text-3xl font-bold">{personalStats.totalProjects}</p>
                  </div>
                  <div className="text-3xl sm:text-4xl">📚</div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 sm:p-6 rounded-xl text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-xs sm:text-sm">平均進度</p>
                    <p className="text-2xl sm:text-3xl font-bold">{personalStats.averageProgress}%</p>
                  </div>
                  <div className="text-3xl sm:text-4xl">📈</div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 sm:p-6 rounded-xl text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-xs sm:text-sm">已完成</p>
                    <p className="text-2xl sm:text-3xl font-bold">{personalStats.completedProjects}</p>
                  </div>
                  <div className="text-3xl sm:text-4xl">✅</div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 sm:p-6 rounded-xl text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-xs sm:text-sm">進行中</p>
                    <p className="text-2xl sm:text-3xl font-bold">{personalStats.inProgressProjects}</p>
                  </div>
                  <div className="text-3xl sm:text-4xl">🔄</div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 sm:p-6 rounded-xl text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-xs sm:text-sm">總反思</p>
                    <p className="text-2xl sm:text-3xl font-bold">{personalStats.totalReflections}</p>
                  </div>
                  <div className="text-3xl sm:text-4xl">📝</div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-pink-500 to-pink-600 p-4 sm:p-6 rounded-xl text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-pink-100 text-xs sm:text-sm">本週反思</p>
                    <p className="text-2xl sm:text-3xl font-bold">{personalStats.thisWeekReflections}</p>
                  </div>
                  <div className="text-3xl sm:text-4xl">🎯</div>
                </div>
              </div>
            </div>

            {/* 主要內容區域 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
              {/* 左側 - 專案列表 */}
              <div className="lg:col-span-2 space-y-6 sm:space-y-8">
                {/* 我的專案 */}
                <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm">
                  <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-4 sm:mb-6">我的專案</h2>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {allProjects.length > 0 ? (
                      allProjects.map((project, index) => {
                        const progress = calculateProgress(project.currentStage, project.currentSubStage);
                        const members = projectMembers[project.id] || [];
                        return (
                          <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 space-y-2 sm:space-y-0">
                              <h3 className="font-semibold text-gray-800 text-base sm:text-lg">{project.name}</h3>
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(progress)}`}>
                                  {project.ProjectEnd ? "已完成" : `${progress}%`}
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
                              <span>指導老師: {project.mentor}</span>
                            </div>
                            
                            <div className="mt-2 flex items-center text-xs text-gray-500">
                              <span className="mr-2">團隊成員:</span>
                              <div className="flex items-center space-x-1">
                                {members.slice(0, 3).map((member, idx) => (
                                  <span key={idx} className="bg-gray-100 px-2 py-1 rounded text-xs">
                                    {member.username}
                                  </span>
                                ))}
                                {members.length > 3 && (
                                  <span className="text-gray-400">+{members.length - 3}</span>
                                )}
                              </div>
                            </div>
                            
                            {!project.ProjectEnd && (
                              <div className="mt-3">
                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                  <span>進度</span>
                                  <span>{progress}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-teal-600 h-2 rounded-full transition-all duration-500" 
                                    style={{ width: `${progress}%` }}
                                  ></div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p>尚未參與任何專案</p>
                        <button
                          onClick={() => navigate("/homepage")}
                          className="mt-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                        >
                          前往首頁加入專案
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 學習軌跡圖表 */}
                <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm">
                  <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-4">學習進度軌跡</h2>
                  <div className="space-y-4">
                    {allProjects.map((project, index) => {
                      const progress = calculateProgress(project.currentStage, project.currentSubStage);
                      return (
                        <div key={index} className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-gray-700">{project.name}</span>
                            <span className="text-sm text-gray-500">{progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                              className="bg-gradient-to-r from-teal-500 to-teal-600 h-3 rounded-full transition-all duration-500" 
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                          <div className="mt-2 text-xs text-gray-500">
                            目前階段: 第{project.currentStage}階段 - 子階段{project.currentSubStage}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 右側 - 最近活動 */}
              <div className="space-y-6 sm:space-y-8">
                {/* 最近學習活動 */}
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

                {/* 本週反思摘要 */}
                <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm">
                  <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-4">本週反思</h2>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {allReflections
                      .filter(r => {
                        const oneWeekAgo = new Date();
                        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                        return new Date(r.createdAt) > oneWeekAgo;
                      })
                      .slice(0, 5)
                      .map((reflection, index) => (
                        <div key={index} className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-sm font-medium text-teal-600">{reflection.projectName}</span>
                            <span className="text-xs text-gray-400">{formatRelativeTime(reflection.createdAt)}</span>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2">{reflection.content || "無內容"}</p>
                        </div>
                      ))}
                    {personalStats.thisWeekReflections === 0 && (
                      <p className="text-gray-500 text-center py-4">本週尚未撰寫反思</p>
                    )}
                  </div>
                </div>

                {/* 學習統計 */}
                <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm">
                  <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-4">學習統計</h2>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">總學習時數</span>
                      <span className="font-semibold text-gray-800">{personalStats.totalProjects * 20}小時</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">平均專案進度</span>
                      <span className="font-semibold text-gray-800">{personalStats.averageProgress}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">反思頻率</span>
                      <span className="font-semibold text-gray-800">
                        {personalStats.totalProjects > 0 ? 
                          Math.round(personalStats.totalReflections / personalStats.totalProjects) : 0}篇/專案
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">學習活躍度</span>
                      <span className="font-semibold text-green-600">
                        {personalStats.thisWeekReflections > 0 ? "高" : "待提升"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentOverview; 