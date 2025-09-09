import React from 'react';
import { formatRelativeTime, getStatusColor } from '../utils';

const IndividualView = ({ 
  selectedStudent, 
  setSelectedStudent, 
  enhancedStudents, 
  userRole, 
  realData 
}) => {
  // 如果沒有選中學生，選擇第一個學生或當前用戶
  const student = selectedStudent || enhancedStudents[0];
  
  if (!student) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md text-center">
        <p className="text-gray-500">無學生資料可顯示</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white p-3 sm:p-6 rounded-lg shadow-md">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 space-y-2 sm:space-y-0">
          <h2 className="text-lg sm:text-2xl font-semibold text-gray-700">
            {student.username || student.name} - 詳細學習歷程
          </h2>
          {userRole === 'teacher' && enhancedStudents.length > 1 && (
            <div className="w-full sm:w-auto">
              <select 
                value={student.id}
                onChange={(e) => {
                  const selectedId = parseInt(e.target.value);
                  const newStudent = enhancedStudents.find(s => s.id === selectedId);
                  setSelectedStudent(newStudent);
                }}
                className="w-full sm:w-auto border border-gray-300 rounded px-3 py-2 text-sm"
              >
                {enhancedStudents.map(s => (
                  <option key={s.id} value={s.id}>{s.username || s.name}</option>
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
                    <span>反思記錄</span>
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
                  {student.status === 'attention' || student.status === 'inactive' ? (
                    <>
                      <li>• 建議增加反思記錄頻率</li>
                      <li>• 可嘗試更多想法創作</li>
                      <li>• 建議主動參與小組討論</li>
                    </>
                  ) : (
                    <>
                      <li>• 保持良好的學習習慣</li>
                      <li>• 可協助其他同學學習</li>
                      <li>• 嘗試挑戰更深入的主題</li>
                    </>
                  )}
                </ul>
              </div>

              <div className="bg-purple-50 p-3 rounded-lg">
                <h4 className="text-xs sm:text-sm font-medium text-purple-700 mb-2">團隊角色</h4>
                <p className="text-xs text-purple-600">{student.teamRole}</p>
                <p className="text-xs text-purple-500 mt-1">
                  最後活動: {student.lastActivity ? formatRelativeTime(student.lastActivity) : '無資料'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 近期學習軌跡 */}
      <div className="bg-white p-3 sm:p-6 rounded-lg shadow-md">
        <h3 className="text-base sm:text-lg font-semibold mb-4 text-gray-700">近期學習軌跡</h3>
        <div className="space-y-3 sm:space-y-4 max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-customgreen scrollbar-track-gray-50" 
             style={{ scrollBehavior: 'smooth' }}>
          {(() => {
            const studentId = student.id;
            const username = student.username || student.name;
            
            // 收集該學生的所有活動
            const studentActivities = [
              ...realData.reflections
                .filter(r => 
                  r.user_id === studentId || r.userId === studentId || 
                  r.username === username || r.user_name === username
                )
                .map(r => ({
                  type: 'reflection',
                  content: '新增反思記錄',
                  time: r.createdAt || r.created_at,
                  icon: '📝',
                  details: r.content?.substring(0, 50) + '...' || '無內容'
                })),
              ...realData.tasks
                .filter(t => 
                  t.user_id === studentId || t.userId === studentId ||
                  t.owner === username || t.created_by === username ||
                  (t.assignees && t.assignees.some(a => a.id === studentId || a.username === username))
                )
                .map(t => ({
                  type: 'task',
                  content: `任務: ${t.title || '無標題'}`,
                  time: t.createdAt || t.created_at,
                  icon: '📋',
                  details: t.content?.substring(0, 50) + '...' || '無內容'
                })),
              ...realData.nodes
                .filter(n => 
                  n.user_id === studentId || n.userId === studentId ||
                  n.owner === username || n.username === username || n.user_name === username
                )
                .map(n => ({
                  type: 'idea',
                  content: `想法: ${n.title || '無標題'}`,
                  time: n.createdAt || n.created_at,
                  icon: '💡',
                  details: n.content?.substring(0, 50) + '...' || '無內容'
                })),
              ...realData.chatHistory
                .filter(msg => 
                  msg.user_id === studentId || msg.userId === studentId ||
                  msg.username === username || msg.user_name === username
                )
                .map(msg => ({
                  type: 'chat',
                  content: '參與聊天討論',
                  time: msg.createdAt || msg.created_at,
                  icon: '💬',
                  details: msg.content?.substring(0, 50) + '...' || '無內容'
                }))
            ];

            // 排序並取前10個
            const sortedActivities = studentActivities
              .filter(activity => activity.time)
              .sort((a, b) => new Date(b.time) - new Date(a.time))
              .slice(0, 10);

            if (sortedActivities.length === 0) {
              return (
                <div className="text-center text-gray-500 py-8">
                  暫無學習活動記錄
                </div>
              );
            }

            return sortedActivities.map((activity, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <span className="text-lg flex-shrink-0">{activity.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {activity.content}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {activity.details}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
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

export default IndividualView;
