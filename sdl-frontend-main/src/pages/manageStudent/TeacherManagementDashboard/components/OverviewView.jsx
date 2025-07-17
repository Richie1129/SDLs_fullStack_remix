import React from 'react';
import { formatRelativeTime, getActivityColor } from '../utils';

const OverviewView = ({ enhancedStudents, classStats, realData }) => {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 班級概況 */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
        <h2 className="text-lg sm:text-2xl font-semibold mb-4 text-gray-700">班級概況</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-gradient-to-r from-teal-500 to-cyan-600 p-4 rounded-lg text-white">
            <h3 className="text-sm font-medium mb-2">學習進度分佈</h3>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>優秀 (80%+)</span>
                <span>{enhancedStudents.filter(s => s.status === 'excellent').length}人</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>良好 (60-79%)</span>
                <span>{enhancedStudents.filter(s => s.status === 'active').length}人</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>需關注 (&lt;60%)</span>
                <span>{enhancedStudents.filter(s => s.status === 'attention' || s.status === 'inactive').length}人</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4 rounded-lg text-white">
            <h3 className="text-sm font-medium mb-2">活動統計</h3>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>看板任務</span>
                <span>{classStats.totalTasks}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>反思記錄</span>
                <span>{classStats.totalReflections}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>想法節點</span>
                <span>{classStats.totalIdeaNodes}</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4 rounded-lg text-white">
            <h3 className="text-sm font-medium mb-2">專案狀態</h3>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>總專案數</span>
                <span>{classStats.totalProjects}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>當前專案</span>
                <span>{realData.projectName}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>參與學生</span>
                <span>{enhancedStudents.length}人</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 最近活動 */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
        <h2 className="text-lg sm:text-2xl font-semibold mb-4 text-gray-700">最近活動</h2>
        <div className="space-y-3 max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-customgreen scrollbar-track-gray-50" 
             style={{ scrollBehavior: 'smooth' }}>
          {(() => {
            // 合併所有活動
            const allActivities = [
              ...realData.reflections.map(r => ({
                type: 'reflection',
                user: r.username || r.user_name || '未知用戶',
                content: `新增反思記錄`,
                time: r.createdAt || r.created_at,
                icon: '📝'
              })),
              ...realData.tasks.slice(0, 10).map(t => ({
                type: 'kanban',
                user: t.owner || t.created_by || '未知用戶',
                content: `創建任務: ${t.title || '無標題'}`,
                time: t.createdAt || t.created_at,
                icon: '📋'
              })),
              ...realData.nodes.slice(0, 10).map(n => ({
                type: 'idea',
                user: n.owner || n.username || n.user_name || '未知用戶',
                content: `新增想法: ${n.title || '無標題'}`,
                time: n.createdAt || n.created_at,
                icon: '💡'
              })),
              ...realData.chatHistory.slice(0, 10).map(msg => ({
                type: 'chat',
                user: msg.username || msg.user_name || '未知用戶',
                content: `聊天室訊息`,
                time: msg.createdAt || msg.created_at,
                icon: '💬'
              })),
              ...realData.submissions.slice(0, 10).map(s => ({
                type: 'submit',
                user: s.username || s.user_name || '未知用戶',
                content: `提交作業`,
                time: s.createdAt || s.created_at,
                icon: '📤'
              }))
            ];

            // 排序並取前15個
            const sortedActivities = allActivities
              .filter(activity => activity.time)
              .sort((a, b) => new Date(b.time) - new Date(a.time))
              .slice(0, 15);

            if (sortedActivities.length === 0) {
              return (
                <div className="text-center text-gray-500 py-8">
                  暫無活動記錄
                </div>
              );
            }

            return sortedActivities.map((activity, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <span className="text-lg">{activity.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    <span className={getActivityColor(activity.type)}>{activity.user}</span>
                    <span className="text-gray-600 ml-2">{activity.content}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatRelativeTime(activity.time)}
                  </p>
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
