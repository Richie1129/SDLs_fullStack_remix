// 工具函式

// 計算專案進度
export const calculateProgress = (currentStage, currentSubStage) => {
  if (!currentStage || !currentSubStage) return 0;
  
  if (currentStage === 5) {
    return 100;
  } else {
    const stageProgress = ((currentStage - 1) * 20);
    const subStageProgress = ((currentSubStage - 1) / 2) * 20;
    return Math.round(stageProgress + subStageProgress);
  }
};

// 格式化相對時間
export const formatRelativeTime = (dateString) => {
  if (!dateString) return '無資料';
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

// 獲取學生狀態顏色
export const getStatusColor = (status) => {
  switch (status) {
    case 'excellent':
      return 'bg-green-100 text-green-800';
    case 'active':
      return 'bg-blue-100 text-blue-800';
    case 'attention':
      return 'bg-yellow-100 text-yellow-800';
    case 'inactive':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// 獲取活動類型顏色
export const getActivityColor = (type) => {
  const colors = {
    'reflection': 'text-blue-600',
    'kanban': 'text-orange-600',
    'idea': 'text-purple-600',
    'chat': 'text-teal-600',
    'submit': 'text-green-600',
    'default': 'text-gray-600'
  };
  return colors[type] || colors.default;
};

// 生成學生活動統計
export const generateStudentActivityStats = (students, realData) => {
  return students.map(student => ({
    name: student.username || student.name,
    reflections: student.weeklyReflections || 0,
    nodes: student.ideaNodes || 0,
    tasks: student.kanbanTasks || 0,
    totalActivity: (student.weeklyReflections || 0) + (student.ideaNodes || 0) + (student.kanbanTasks || 0)
  })).sort((a, b) => b.totalActivity - a.totalActivity);
};

// 計算創作者統計
export const calculateCreatorStats = (items, creatorField = 'owner') => {
  return items.reduce((acc, item) => {
    const creator = item[creatorField] || '未知';
    acc[creator] = (acc[creator] || 0) + 1;
    return acc;
  }, {});
};
