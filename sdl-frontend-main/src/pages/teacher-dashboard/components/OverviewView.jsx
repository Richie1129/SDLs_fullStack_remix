import React from 'react';
import { FiFileText, FiClipboard, FiInfo, FiMessageSquare, FiUpload, FiTrendingUp, FiActivity, FiFolder } from 'react-icons/fi';
import { formatRelativeTime, getActivityColor } from '../utils';
import ClassProgressBar from './ClassProgressBar';
import InactiveStudentsList from './InactiveStudentsList';

const SummaryCard = ({ icon, iconBg, iconColor, title, items }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-component-base">
    <div className="flex items-center gap-2 mb-3">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconBg} ${iconColor}`}>
        {icon}
      </div>
      <h3 className="text-body-sm font-semibold text-gray-700">{title}</h3>
    </div>
    <div className="space-y-1.5">
      {items.map(({ label, value }) => (
        <div key={label} className="flex justify-between items-center">
          <span className="text-caption text-[#888780]">{label}</span>
          <span className="metric-value text-body-sm font-medium text-[#2C2C2A]">{value}</span>
        </div>
      ))}
    </div>
  </div>
);

const OverviewView = ({ enhancedStudents, classStats, realData }) => {
  const excellent = enhancedStudents.filter((s) => s.status === 'excellent').length;
  const active    = enhancedStudents.filter((s) => s.status === 'active').length;
  const attention = enhancedStudents.filter((s) => s.status === 'attention' || s.status === 'inactive').length;

  return (
    <div className="space-y-stack-sm sm:space-y-stack-md">
      {/* 班級概況 3 欄 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-stack-sm">
        <SummaryCard
          icon={<FiTrendingUp className="w-4 h-4" />}
          iconBg="bg-[#E1F5EE]"
          iconColor="text-customgreen"
          title="學習進度分佈"
          items={[
            { label: '優秀 (80%+)',   value: `${excellent} 人` },
            { label: '良好 (60–79%)', value: `${active} 人` },
            { label: '需關注 (<60%)', value: `${attention} 人` },
          ]}
        />
        <SummaryCard
          icon={<FiActivity className="w-4 h-4" />}
          iconBg="bg-[#E6F1FB]"
          iconColor="text-trust-blue-600"
          title="活動統計"
          items={[
            { label: '看板任務', value: classStats.totalTasks },
            { label: '反思記錄', value: classStats.totalReflections },
            { label: '想法節點', value: classStats.totalIdeaNodes },
          ]}
        />
        <SummaryCard
          icon={<FiFolder className="w-4 h-4" />}
          iconBg="bg-[#EAF3DE]"
          iconColor="text-teal-600"
          title="專案狀態"
          items={[
            { label: '總專案數', value: classStats.totalProjects },
            { label: '當前專案', value: realData.projectName || '—' },
            { label: '參與學生', value: `${enhancedStudents.length} 人` },
          ]}
        />
      </div>

      {/* 班級進度長條圖 + 未活躍警示 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-stack-sm">
        <div className="lg:col-span-2">
          <ClassProgressBar students={enhancedStudents} />
        </div>
        <div>
          <InactiveStudentsList students={enhancedStudents} />
        </div>
      </div>

      {/* 最近活動 */}
      <div className="bg-white border border-gray-200 rounded-xl p-component-base sm:p-component-md-lg">
        <h2 className="text-body-sm sm:text-body font-semibold mb-4 text-gray-700">最近活動</h2>
        <div
          className="space-y-3 max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-customgreen scrollbar-track-gray-50"
          style={{ scrollBehavior: 'smooth' }}
        >
          {(() => {
            const allActivities = [
              ...realData.reflections.map((r) => ({
                type: 'reflection',
                user: r.username || r.user_name || '未知用戶',
                content: '新增反思記錄',
                time: r.createdAt || r.created_at,
                icon: <FiFileText className="w-4 h-4" />,
              })),
              ...realData.tasks.slice(0, 10).map((t) => ({
                type: 'kanban',
                user: t.owner || t.created_by || '未知用戶',
                content: `創建任務: ${t.title || '無標題'}`,
                time: t.createdAt || t.created_at,
                icon: <FiClipboard className="w-4 h-4" />,
              })),
              ...realData.nodes.slice(0, 10).map((n) => ({
                type: 'idea',
                user: n.owner || n.username || n.user_name || '未知用戶',
                content: `新增想法: ${n.title || '無標題'}`,
                time: n.createdAt || n.created_at,
                icon: <FiInfo className="w-4 h-4" />,
              })),
              ...realData.chatHistory.slice(0, 10).map((msg) => ({
                type: 'chat',
                user: msg.username || msg.user_name || '未知用戶',
                content: '聊天室訊息',
                time: msg.createdAt || msg.created_at,
                icon: <FiMessageSquare className="w-4 h-4" />,
              })),
              ...realData.submissions.slice(0, 10).map((s) => ({
                type: 'submit',
                user: s.username || s.user_name || '未知用戶',
                content: '提交作業',
                time: s.createdAt || s.created_at,
                icon: <FiUpload className="w-4 h-4" />,
              })),
            ];

            const sorted = allActivities
              .filter((a) => a.time)
              .sort((a, b) => new Date(b.time) - new Date(a.time))
              .slice(0, 15);

            if (!sorted.length) {
              return <p className="text-center text-gray-400 text-body-sm py-8">暫無活動記錄</p>;
            }

            return sorted.map((activity, index) => (
              <div
                key={index}
                className="flex items-center space-x-3 p-component-sm bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-fast"
              >
                <span className="text-gray-400">{activity.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-body-sm font-medium text-gray-900 truncate">
                    <span className={getActivityColor(activity.type)}>{activity.user}</span>
                    <span className="text-gray-600 ml-2">{activity.content}</span>
                  </p>
                  <p className="text-caption text-[#888780]">{formatRelativeTime(activity.time)}</p>
                </div>
              </div>
            ));
          })()}
        </div>
      </div>
    </div>
  );
};

export default OverviewView;
