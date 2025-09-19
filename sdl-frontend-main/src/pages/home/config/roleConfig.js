// 角色配置 - 消除條件分支，統一行為管理
export const roleConfig = {
  student: {
    // 顯示的區塊配置
    sections: [
      {
        index: 0,
        title: "可觀摩專案",
        type: "viewable",
        showCreateButton: false,
        showJoinButton: false,
        showFilter: false,
        tourAttribute: "student-dashboard"
      },
      {
        index: 1,
        title: "進行中活動",
        type: "normal",
        showCreateButton: true,
        showJoinButton: true,
        showFilter: false,
        tourAttribute: "ongoing-projects"
      },
      {
        index: 2,
        title: "已結束活動",
        type: "completed",
        showCreateButton: false,
        showJoinButton: false,
        showFilter: true,
        showClassFilter: false // 學生不顯示班級篩選
      },
      {
        index: 3,
        title: "已完成歷程",
        type: "done",
        showCreateButton: false,
        showJoinButton: false,
        showFilter: true,
        showClassFilter: false
      }
    ],

    // 權限配置
    permissions: {
      canCreate: true,
      canEdit: true,
      canDelete: false,
      canViewObservation: true,
      canManageClassFilter: false
    },

    // 查詢配置
    queryKey: "projectDatas",

    // 專案獲取函數標識
    fetchFunction: "getAllProject",

    // 專案參數
    fetchParams: () => ({
      params: { userId: localStorage.getItem("id") }
    })
  },

  teacher: {
    // 顯示的區塊配置
    sections: [
      {
        index: 0,
        title: "進行中活動",
        type: "normal",
        showCreateButton: true,
        showJoinButton: true,
        showFilter: true,
        showClassFilter: true,
        tourAttribute: "teacher-ongoing-projects"
      },
      {
        index: 1,
        title: "已結束活動",
        type: "completed",
        showCreateButton: false,
        showJoinButton: false,
        showFilter: true,
        showClassFilter: true
      },
      {
        index: 2,
        title: "已完成歷程",
        type: "done",
        showCreateButton: false,
        showJoinButton: false,
        showFilter: true,
        showClassFilter: true
      }
    ],

    // 權限配置
    permissions: {
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canViewObservation: false,
      canManageClassFilter: true
    },

    // 查詢配置
    queryKey: "TeacherProjectDatas",

    // 專案獲取函數標識
    fetchFunction: "getProjectsByMentor",

    // 專案參數 - 教師使用用戶名
    fetchParams: (userName) => userName
  }
};

// 根據角色獲取配置
export const getRoleConfig = (role) => {
  return roleConfig[role] || roleConfig.student; // 預設為學生配置
};

// 根據角色和區塊索引獲取區塊配置
export const getSectionConfig = (role, sectionIndex) => {
  const config = getRoleConfig(role);
  return config.sections.find(section => section.index === sectionIndex);
};

// 檢查用戶權限
export const hasPermission = (role, permission) => {
  const config = getRoleConfig(role);
  return config.permissions[permission] || false;
};

// 獲取專案資料配置
export const getProjectDataConfig = (role, userName) => {
  const config = getRoleConfig(role);
  return {
    queryKey: config.queryKey,
    fetchFunction: config.fetchFunction,
    fetchParams: config.fetchParams(userName)
  };
};