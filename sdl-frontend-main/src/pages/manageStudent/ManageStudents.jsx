import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getKanbanColumns } from "../../api/kanban";
import { getNodes, getNodeRelation } from "../../api/nodes";
import { getIdeaWall } from "../../api/ideaWall";

const ManageStudent = () => {
  const { projectId } = useParams();
  const parsedProjectId = projectId ? parseInt(projectId, 10) : null;
  const [ideaWallIds, setIdeaWallIds] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [nodeRelations, setNodeRelations] = useState([]);
  const [tasks, setTasks] = useState([]);
  
  // 新增狀態管理
  const [viewMode, setViewMode] = useState('all'); // 'all', 'group', 'individual'
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const userRole = localStorage.getItem("role");

  // 假資料
  const mockStudents = [
    {
      id: 1,
      name: "王小明",
      projectId: 1,
      projectName: "環境科學研究",
      currentStage: 3,
      currentSubStage: 2,
      progressPercentage: 65,
      lastActivity: "2024-01-15T10:30:00Z",
      weeklyReflections: 3,
      ideaNodes: 8,
      status: "active",
      teamRole: "組長",
      chatMessages: 25,
      qaQuestions: 5,
      aiInteractions: 12
    },
    {
      id: 2,
      name: "李小華",
      projectId: 1,
      projectName: "環境科學研究",
      currentStage: 2,
      currentSubStage: 3,
      progressPercentage: 45,
      lastActivity: "2024-01-14T15:20:00Z",
      weeklyReflections: 2,
      ideaNodes: 5,
      status: "attention",
      teamRole: "研究員",
      chatMessages: 18,
      qaQuestions: 3,
      aiInteractions: 8
    },
    {
      id: 3,
      name: "張小美",
      projectId: 2,
      projectName: "智慧農業系統",
      currentStage: 4,
      currentSubStage: 1,
      progressPercentage: 78,
      lastActivity: "2024-01-15T09:15:00Z",
      weeklyReflections: 4,
      ideaNodes: 12,
      status: "excellent",
      teamRole: "技術負責人",
      chatMessages: 32,
      qaQuestions: 7,
      aiInteractions: 15
    },
    {
      id: 4,
      name: "陳小強",
      projectId: 2,
      projectName: "智慧農業系統",
      currentStage: 3,
      currentSubStage: 3,
      progressPercentage: 72,
      lastActivity: "2024-01-15T11:45:00Z",
      weeklyReflections: 3,
      ideaNodes: 9,
      status: "active",
      teamRole: "資料分析師",
      chatMessages: 20,
      qaQuestions: 4,
      aiInteractions: 10
    }
  ];

  const mockGroups = [
    {
      id: 1,
      name: "環境科學研究小組",
      projectName: "校園空氣品質調查",
      members: ["王小明", "李小華"],
      averageProgress: 55,
      collaborationScore: 78,
      totalIdeaNodes: 13,
      teamReflections: 5
    },
    {
      id: 2,
      name: "智慧農業團隊",
      projectName: "智慧灌溉系統設計",
      members: ["張小美", "陳小強"],
      averageProgress: 75,
      collaborationScore: 85,
      totalIdeaNodes: 21,
      teamReflections: 7
    }
  ];

  useEffect(() => {
    if (!parsedProjectId) {
      console.warn("❌ projectId 未定義");
      return;
    }

    const fetchData = async () => {
      try {
        console.log("📢 取得 Kanban Columns, projectId:", parsedProjectId);
        const columnData = await getKanbanColumns(parsedProjectId);
        console.log("✅ 取得的 Column Data:", columnData);

        if (columnData && columnData.length > 0) {
          let allTasks = [];
          columnData.forEach(column => {
            column.task.forEach(task => {
              allTasks.push({
                ...task,
                columnId: column.id,
                status: column.name
              });
            });
          });

          allTasks.sort((a, b) => a.columnId - b.columnId);
          setTasks(allTasks);
          console.log("📋 最終 Tasks 數據:", allTasks);
        } else {
          console.warn("❌ 此專案沒有對應的 column");
        }

        console.log("📢 取得 IdeaWall Data, projectId:", parsedProjectId);
        const ideaWallData = await getIdeaWall(parsedProjectId, "1-1");
        console.log("✅ 取得的 IdeaWall Data:", ideaWallData);

        if (ideaWallData && ideaWallData.id) {
          const fetchedIdeaWallIds = [ideaWallData.id]; 
          setIdeaWallIds(fetchedIdeaWallIds);
          console.log("📢 取得 Nodes, ideaWallIds:", fetchedIdeaWallIds);

          const nodePromises = fetchedIdeaWallIds.map(id => getNodes(id));
          const allNodeData = await Promise.all(nodePromises);
          const mergedNodes = allNodeData.flat();
          setNodes(mergedNodes);
          console.log("✅ Nodes Data:", mergedNodes);

          // 取得節點關聯
          console.log("📢 取得 Node 關聯, ideaWallIds:", fetchedIdeaWallIds);
          const relationPromises = fetchedIdeaWallIds.map(id => getNodeRelation(id));
          const allRelationData = await Promise.all(relationPromises);
          const mergedRelations = allRelationData.flat();
          setNodeRelations(mergedRelations);
          console.log("✅ Node Relations Data:", mergedRelations);
        } else {
          console.warn("❌ 無法獲取 IdeaWall IDs");
        }

      } catch (error) {
        console.error("❌ 載入數據失敗:", error);
      }
    };

    fetchData();
  }, [parsedProjectId]);

  // 🔹 建立關聯對照表
  const relationMap = {};
  nodeRelations.forEach(relation => {
    if (!relationMap[relation.from]) {
      relationMap[relation.from] = [];
    }
    relationMap[relation.from].push(relation.to);
  });

  // 計算進度百分比
  const calculateProgress = (stage, subStage) => {
    const totalStages = 5;
    const subStagesPerStage = 3; // 平均每階段3個子階段
    const completed = (stage - 1) * subStagesPerStage + subStage;
    const total = totalStages * subStagesPerStage;
    return Math.min((completed / total) * 100, 100);
  };

  // 狀態顏色映射
  const getStatusColor = (status) => {
    switch (status) {
      case 'excellent': return 'bg-green-100 text-green-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'attention': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // 格式化時間
  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return '剛剛';
    if (diffInHours < 24) return `${diffInHours}小時前`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}天前`;
  };

  // 渲染統計卡片
  const renderStatsCards = () => {
    if (userRole === 'teacher') {
      const totalStudents = mockStudents.length;
      const averageProgress = Math.round(mockStudents.reduce((sum, s) => sum + s.progressPercentage, 0) / totalStudents);
      const activeStudents = mockStudents.filter(s => s.status === 'active' || s.status === 'excellent').length;
      const needAttention = mockStudents.filter(s => s.status === 'attention' || s.status === 'inactive').length;

      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-white p-3 sm:p-4 rounded-lg shadow-md">
            <h3 className="text-xs sm:text-sm font-medium text-gray-500">總學生數</h3>
            <p className="text-xl sm:text-2xl font-bold text-teal-600">{totalStudents}</p>
          </div>
          <div className="bg-white p-3 sm:p-4 rounded-lg shadow-md">
            <h3 className="text-xs sm:text-sm font-medium text-gray-500">平均進度</h3>
            <p className="text-xl sm:text-2xl font-bold text-blue-600">{averageProgress}%</p>
          </div>
          <div className="bg-white p-3 sm:p-4 rounded-lg shadow-md">
            <h3 className="text-xs sm:text-sm font-medium text-gray-500">活躍學習者</h3>
            <p className="text-xl sm:text-2xl font-bold text-green-600">{activeStudents}</p>
          </div>
          <div className="bg-white p-3 sm:p-4 rounded-lg shadow-md">
            <h3 className="text-xs sm:text-sm font-medium text-gray-500">需要關注</h3>
            <p className="text-xl sm:text-2xl font-bold text-yellow-600">{needAttention}</p>
          </div>
        </div>
      );
    } else {
      // 學生版本 - 顯示個人統計
      const currentUser = mockStudents[0]; // 假設當前用戶是第一個學生
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-white p-3 sm:p-4 rounded-lg shadow-md">
            <h3 className="text-xs sm:text-sm font-medium text-gray-500">我的進度</h3>
            <p className="text-xl sm:text-2xl font-bold text-teal-600">{currentUser.progressPercentage}%</p>
          </div>
          <div className="bg-white p-3 sm:p-4 rounded-lg shadow-md">
            <h3 className="text-xs sm:text-sm font-medium text-gray-500">本週反思</h3>
            <p className="text-xl sm:text-2xl font-bold text-blue-600">{currentUser.weeklyReflections}</p>
          </div>
          <div className="bg-white p-3 sm:p-4 rounded-lg shadow-md">
            <h3 className="text-xs sm:text-sm font-medium text-gray-500">想法節點</h3>
            <p className="text-xl sm:text-2xl font-bold text-green-600">{currentUser.ideaNodes}</p>
          </div>
          <div className="bg-white p-3 sm:p-4 rounded-lg shadow-md">
            <h3 className="text-xs sm:text-sm font-medium text-gray-500">AI互動次數</h3>
            <p className="text-xl sm:text-2xl font-bold text-purple-600">{currentUser.aiInteractions}</p>
          </div>
        </div>
      );
    }
  };

  // 渲染所有學生檢視
  const renderAllStudentsView = () => (
    <div className="bg-white p-3 sm:p-6 rounded-lg shadow-md">
      <h2 className="text-lg sm:text-2xl font-semibold mb-4 text-gray-700">所有學生概覽</h2>
      
      {/* 桌面版表格 */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-3 text-left">學生姓名</th>
              <th className="border p-3 text-left">當前專案</th>
              <th className="border p-3 text-center">進度</th>
              <th className="border p-3 text-center">最後活動</th>
              <th className="border p-3 text-center">本週反思</th>
              <th className="border p-3 text-center">想法節點</th>
              <th className="border p-3 text-center">狀態</th>
              <th className="border p-3 text-center">操作</th>
            </tr>
          </thead>
          <tbody>
            {mockStudents.map((student) => (
              <tr key={student.id} className="hover:bg-gray-50">
                <td className="border p-3 font-medium">{student.name}</td>
                <td className="border p-3">{student.projectName}</td>
                <td className="border p-3 text-center">
                  <div className="flex items-center justify-center">
                    <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                      <div 
                        className="bg-teal-600 h-2 rounded-full" 
                        style={{ width: `${student.progressPercentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm">{student.progressPercentage}%</span>
                  </div>
                </td>
                <td className="border p-3 text-center text-sm text-gray-600">
                  {formatRelativeTime(student.lastActivity)}
                </td>
                <td className="border p-3 text-center">{student.weeklyReflections}</td>
                <td className="border p-3 text-center">{student.ideaNodes}</td>
                <td className="border p-3 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(student.status)}`}>
                    {student.status === 'excellent' ? '優秀' : 
                     student.status === 'active' ? '活躍' :
                     student.status === 'attention' ? '需關注' : '不活躍'}
                  </span>
                </td>
                <td className="border p-3 text-center">
                  <button 
                    onClick={() => {
                      setSelectedStudent(student);
                      setViewMode('individual');
                    }}
                    className="bg-teal-500 text-white px-3 py-1 rounded text-sm hover:bg-teal-600"
                  >
                    查看詳情
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 行動裝置版卡片 */}
      <div className="lg:hidden space-y-3">
        {mockStudents.map((student) => (
          <div key={student.id} className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:bg-gray-50">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-medium text-gray-800">{student.name}</h3>
                <p className="text-sm text-gray-600">{student.projectName}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(student.status)}`}>
                {student.status === 'excellent' ? '優秀' : 
                 student.status === 'active' ? '活躍' :
                 student.status === 'attention' ? '需關注' : '不活躍'}
              </span>
            </div>
            
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">進度</span>
                <span className="text-sm font-medium">{student.progressPercentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-teal-600 h-2 rounded-full" 
                  style={{ width: `${student.progressPercentage}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-3 text-sm">
              <div className="text-center">
                <p className="text-xs text-gray-500">反思</p>
                <p className="font-medium">{student.weeklyReflections}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">想法</p>
                <p className="font-medium">{student.ideaNodes}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">最後活動</p>
                <p className="font-medium">{formatRelativeTime(student.lastActivity)}</p>
              </div>
            </div>

            <button 
              onClick={() => {
                setSelectedStudent(student);
                setViewMode('individual');
              }}
              className="w-full bg-teal-500 text-white px-3 py-2 rounded text-sm hover:bg-teal-600"
            >
              查看詳情
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  // 渲染小組檢視
  const renderGroupView = () => (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white p-3 sm:p-6 rounded-lg shadow-md">
        <h2 className="text-lg sm:text-2xl font-semibold mb-4 text-gray-700">小組選擇</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {mockGroups.map((group) => (
            <div 
              key={group.id} 
              onClick={() => setSelectedGroup(group)}
              className={`p-3 sm:p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedGroup?.id === group.id 
                  ? 'border-teal-500 bg-teal-50' 
                  : 'border-gray-200 hover:border-teal-300'
              }`}
            >
              <h3 className="font-semibold text-base sm:text-lg">{group.name}</h3>
              <p className="text-gray-600 text-sm">{group.projectName}</p>
              <div className="mt-2 flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-1 sm:space-y-0">
                <span className="text-xs sm:text-sm text-gray-500">成員: {group.members.join(', ')}</span>
                <span className="text-xs sm:text-sm font-medium text-teal-600">平均進度: {group.averageProgress}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedGroup && (
        <div className="bg-white p-3 sm:p-6 rounded-lg shadow-md">
          <h2 className="text-lg sm:text-2xl font-semibold mb-4 text-gray-700">{selectedGroup.name} - 詳細分析</h2>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="bg-teal-50 p-3 sm:p-4 rounded-lg">
              <h3 className="text-xs sm:text-sm font-medium text-teal-700">平均進度</h3>
              <p className="text-lg sm:text-2xl font-bold text-teal-600">{selectedGroup.averageProgress}%</p>
            </div>
            <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
              <h3 className="text-xs sm:text-sm font-medium text-blue-700">協作分數</h3>
              <p className="text-lg sm:text-2xl font-bold text-blue-600">{selectedGroup.collaborationScore}</p>
            </div>
            <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
              <h3 className="text-xs sm:text-sm font-medium text-green-700">總想法節點</h3>
              <p className="text-lg sm:text-2xl font-bold text-green-600">{selectedGroup.totalIdeaNodes}</p>
            </div>
            <div className="bg-purple-50 p-3 sm:p-4 rounded-lg">
              <h3 className="text-xs sm:text-sm font-medium text-purple-700">團隊反思</h3>
              <p className="text-lg sm:text-2xl font-bold text-purple-600">{selectedGroup.teamReflections}</p>
            </div>
          </div>

          {/* 桌面版表格 */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-3 text-left">成員姓名</th>
                  <th className="border p-3 text-center">角色</th>
                  <th className="border p-3 text-center">個人進度</th>
                  <th className="border p-3 text-center">貢獻度</th>
                  <th className="border p-3 text-center">最後活動</th>
                </tr>
              </thead>
              <tbody>
                {mockStudents
                  .filter(student => selectedGroup.members.includes(student.name))
                  .map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="border p-3 font-medium">{student.name}</td>
                      <td className="border p-3 text-center">{student.teamRole}</td>
                      <td className="border p-3 text-center">
                        <div className="flex items-center justify-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className="bg-teal-600 h-2 rounded-full" 
                              style={{ width: `${student.progressPercentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm">{student.progressPercentage}%</span>
                        </div>
                      </td>
                      <td className="border p-3 text-center">
                        <span className="text-sm font-medium">
                          {Math.round((student.chatMessages + student.ideaNodes + student.weeklyReflections) / 3)}%
                        </span>
                      </td>
                      <td className="border p-3 text-center text-sm text-gray-600">
                        {formatRelativeTime(student.lastActivity)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* 行動裝置版卡片 */}
          <div className="lg:hidden space-y-3">
            {mockStudents
              .filter(student => selectedGroup.members.includes(student.name))
              .map((student) => (
                <div key={student.id} className="border border-gray-200 rounded-lg p-3 sm:p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-medium text-gray-800">{student.name}</h3>
                      <p className="text-sm text-gray-600">{student.teamRole}</p>
                    </div>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {formatRelativeTime(student.lastActivity)}
                    </span>
                  </div>
                  
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600">個人進度</span>
                      <span className="text-sm font-medium">{student.progressPercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-teal-600 h-2 rounded-full" 
                        style={{ width: `${student.progressPercentage}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600">
                    <span>貢獻度: </span>
                    <span className="font-medium text-gray-800">
                      {Math.round((student.chatMessages + student.ideaNodes + student.weeklyReflections) / 3)}%
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );

  // 渲染個人檢視
  const renderIndividualView = () => {
    const student = selectedStudent || mockStudents[0]; // 如果沒有選擇，預設顯示第一個學生
    
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="bg-white p-3 sm:p-6 rounded-lg shadow-md">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 space-y-2 sm:space-y-0">
            <h2 className="text-lg sm:text-2xl font-semibold text-gray-700">{student.name} - 詳細學習歷程</h2>
            {userRole === 'teacher' && (
              <div className="w-full sm:w-auto">
                <select 
                  value={student.id}
                  onChange={(e) => {
                    const newStudent = mockStudents.find(s => s.id === parseInt(e.target.value));
                    setSelectedStudent(newStudent);
                  }}
                  className="w-full sm:w-auto border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  {mockStudents.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-2">
              <h3 className="text-base sm:text-lg font-semibold mb-3">學習進度分析</h3>
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">專案進度</span>
                  <span className="text-sm text-gray-600">{student.progressPercentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-teal-600 h-3 rounded-full transition-all duration-300" 
                    style={{ width: `${student.progressPercentage}%` }}
                  ></div>
                </div>
                <div className="mt-3 text-xs sm:text-sm text-gray-600 space-y-1">
                  <p>當前階段: 第 {student.currentStage} 階段 - 子階段 {student.currentSubStage}</p>
                  <p>專案名稱: {student.projectName}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <h4 className="text-xs sm:text-sm font-medium text-blue-700">學習活躍度</h4>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>聊天訊息</span>
                      <span>{student.chatMessages}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Q&A 提問</span>
                      <span>{student.qaQuestions}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>AI 互動</span>
                      <span>{student.aiInteractions}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 p-3 rounded-lg">
                  <h4 className="text-xs sm:text-sm font-medium text-green-700">創作表現</h4>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>想法節點</span>
                      <span>{student.ideaNodes}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>本週反思</span>
                      <span>{student.weeklyReflections}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>檔案上傳</span>
                      <span>{Math.floor(Math.random() * 10) + 5}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-semibold mb-3">狀態與建議</h3>
              <div className="space-y-3">
                <div className={`p-3 rounded-lg ${getStatusColor(student.status)}`}>
                  <span className="text-xs sm:text-sm font-medium">
                    {student.status === 'excellent' ? '學習表現優秀' : 
                     student.status === 'active' ? '學習狀態良好' :
                     student.status === 'attention' ? '需要關注' : '學習不活躍'}
                  </span>
                </div>

                <div className="bg-yellow-50 p-3 rounded-lg">
                  <h4 className="text-xs sm:text-sm font-medium text-yellow-700 mb-2">學習建議</h4>
                  <ul className="text-xs text-yellow-600 space-y-1">
                    {student.status === 'attention' ? (
                      <>
                        <li>• 建議增加反思記錄頻率</li>
                        <li>• 可嘗試更多想法創作</li>
                        <li>• 建議主動參與小組討論</li>
                      </>
                    ) : (
                      <>
                        <li>• 保持良好的學習習慣</li>
                        <li>• 可協助其他同學學習</li>
                        <li>• 嘗試挑戦更深入的主題</li>
                      </>
                    )}
                  </ul>
                </div>

                <div className="bg-purple-50 p-3 rounded-lg">
                  <h4 className="text-xs sm:text-sm font-medium text-purple-700 mb-2">團隊角色</h4>
                  <p className="text-xs text-purple-600">{student.teamRole}</p>
                  <p className="text-xs text-purple-500 mt-1">最後活動: {formatRelativeTime(student.lastActivity)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 學習軌跡時間線 */}
        <div className="bg-white p-3 sm:p-6 rounded-lg shadow-md">
          <h3 className="text-base sm:text-lg font-semibold mb-4 text-gray-700">近期學習軌跡</h3>
          <div className="space-y-3 sm:space-y-4">
            {[
              { time: '2小時前', action: '完成專案階段 3-2', type: 'progress' },
              { time: '5小時前', action: '發布新想法節點：「水質檢測方法」', type: 'idea' },
              { time: '1天前', action: '提交每日反思記錄', type: 'reflection' },
              { time: '2天前', action: '參與 Q&A 討論', type: 'qa' },
              { time: '3天前', action: '上傳實驗數據檔案', type: 'file' }
            ].map((activity, index) => (
              <div key={index} className="flex items-start space-x-3 sm:space-x-4">
                <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${
                  activity.type === 'progress' ? 'bg-teal-500' :
                  activity.type === 'idea' ? 'bg-yellow-500' :
                  activity.type === 'reflection' ? 'bg-blue-500' :
                  activity.type === 'qa' ? 'bg-green-500' : 'bg-purple-500'
                }`}></div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-800 break-words">{activity.action}</p>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full overflow-auto p-3 sm:p-6 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-4 sm:mb-6 space-y-3 lg:space-y-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-teal-600">
            {userRole === 'teacher' ? '學生學習管理儀表板' : '我的學習歷程'}
          </h1>
          
          {userRole === 'teacher' && (
            <div className="flex flex-wrap gap-1 sm:gap-2">
              <button
                onClick={() => setViewMode('all')}
                className={`px-2 sm:px-4 py-1 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  viewMode === 'all' 
                    ? 'bg-teal-600 text-white' 
                    : 'bg-white text-teal-600 border border-teal-600 hover:bg-teal-50'
                }`}
              >
                所有學生
              </button>
              <button
                onClick={() => setViewMode('group')}
                className={`px-2 sm:px-4 py-1 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  viewMode === 'group' 
                    ? 'bg-teal-600 text-white' 
                    : 'bg-white text-teal-600 border border-teal-600 hover:bg-teal-50'
                }`}
              >
                小組檢視
              </button>
              <button
                onClick={() => setViewMode('individual')}
                className={`px-2 sm:px-4 py-1 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  viewMode === 'individual' 
                    ? 'bg-teal-600 text-white' 
                    : 'bg-white text-teal-600 border border-teal-600 hover:bg-teal-50'
                }`}
              >
                個人檢視
              </button>
            </div>
          )}
        </div>

        {renderStatsCards()}

        <div className="space-y-6">
          {userRole === 'teacher' ? (
            <>
              {viewMode === 'all' && renderAllStudentsView()}
              {viewMode === 'group' && renderGroupView()}
              {viewMode === 'individual' && renderIndividualView()}
            </>
          ) : (
            renderIndividualView()
          )}

          {/* 原有的想法牆統計和進度看板統計 */}
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4 text-gray-700">想法牆統計</h2>
            <div className="overflow-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-2">擁有者</th>
                    <th className="border p-2">標題</th>
                    <th className="border p-2">建立時間</th>
                    <th className="border p-2">延伸節點</th>
                  </tr>
                </thead>
                <tbody>
                  {nodes.length > 0 ? (
                    (() => {
                      // 🔹 計算 rowSpan
                      const ownerRowSpan = {};
                      nodes.forEach((node) => {
                        ownerRowSpan[node.owner] = (ownerRowSpan[node.owner] || 0) + 1;
                      });

                      let processedOwners = new Set();

                      return nodes.map((node, index) => (
                        <tr key={node.id} className="text-center hover:bg-gray-50">
                          {processedOwners.has(node.owner) ? null : (
                            <td className="border p-2" rowSpan={ownerRowSpan[node.owner]}>
                              {node.owner}
                            </td>
                          )}
                          {processedOwners.add(node.owner) && null}

                          <td className="border p-2">{node.title}</td>
                          <td className="border p-2">{node.createdAt ? new Date(node.createdAt).toLocaleString() : "N/A"}</td>
                          <td className={`border p-2 ${relationMap[node.id]?.length > 0 ? "font-bold" : ""}`}>
                            {relationMap[node.id]?.length > 0
                              ? relationMap[node.id]
                                  .map(id => {
                                    const foundNode = nodes.find(n => n.id === id);
                                    return foundNode ? foundNode.title : `節點 ${id}`;
                                  })
                                  .join(", ")
                              : "無延伸節點"}
                          </td>
                        </tr>
                      ));
                    })()
                  ) : (
                    <tr>
                      <td colSpan="4" className="border p-2 text-center">無節點數據</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 進度看板統計 */}
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4 text-gray-700">進度看板統計</h2>
            <div className="overflow-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-2">狀態</th>
                    <th className="border p-2">標題</th>
                    <th className="border p-2">內容</th>
                    <th className="border p-2">建立者</th>
                    <th className="border p-2">負責人</th>
                    <th className="border p-2">圖片</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.length > 0 ? (
                    tasks.sort((a, b) => a.columnId - b.columnId).reduce((acc, task, index, array) => {
                      const prevTask = array[index - 1];
                      const showStatus = !prevTask || prevTask.status !== task.status;
                      return [
                        ...acc,
                        <tr key={task.id} className="text-center hover:bg-gray-50">
                          {showStatus && (
                            <td className="border p-2" rowSpan={array.filter(t => t.status === task.status).length}>
                              {task.status}
                            </td>
                          )}
                          <td className="border p-2">{task.title}</td>
                          <td className="border p-2">{task.content || "無內容"}</td>
                          <td className="border p-2">{task.owner || "❌"}</td>
                          <td className={`border p-2 ${task.assignees?.length > 0 ? "font-bold" : ""}`}>
                            {task.assignees?.length > 0 
                              ? task.assignees.map(a => a.username).join(", ") 
                              : "未指派"}
                          </td>
                          <td className="border p-2">
                            {task.images?.length > 0 ? (
                              <img src={task.images[0]} alt="任務圖片" className="w-16 h-16 mx-auto" />
                            ) : "無圖片"}
                          </td>
                        </tr>
                      ];
                    }, [])
                  ) : (
                    <tr>
                      <td colSpan="6" className="border p-2 text-center">無任務數據</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageStudent;