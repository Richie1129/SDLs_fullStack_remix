import React from 'react';
import { formatRelativeTime, getStatusColor } from '../utils';

const AllStudentsView = ({ enhancedStudents, setViewMode, setSelectedStudent }) => {
  const handleViewDetails = (student) => {
    setSelectedStudent(student);
    setViewMode('individual');
  };

  return (
    <div className="bg-white p-3 sm:p-6 rounded-lg shadow-md">
      <h2 className="text-lg sm:text-2xl font-semibold mb-4 text-gray-700">
        所有學生概覽
        <span className="ml-2 text-sm text-gray-500">({enhancedStudents.length} 位學生)</span>
      </h2>
      
      {/* 統計摘要 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-blue-50 p-3 rounded-lg text-center">
          <h3 className="text-sm font-medium text-blue-700">總反思記錄</h3>
          <p className="text-xl font-bold text-blue-600">
            {enhancedStudents.reduce((sum, s) => sum + s.weeklyReflections, 0)}
          </p>
        </div>
        <div className="bg-purple-50 p-3 rounded-lg text-center">
          <h3 className="text-sm font-medium text-purple-700">總想法節點</h3>
          <p className="text-xl font-bold text-purple-600">
            {enhancedStudents.reduce((sum, s) => sum + s.ideaNodes, 0)}
          </p>
        </div>
        <div className="bg-orange-50 p-3 rounded-lg text-center">
          <h3 className="text-sm font-medium text-orange-700">總看板任務</h3>
          <p className="text-xl font-bold text-orange-600">
            {enhancedStudents.reduce((sum, s) => sum + s.kanbanTasks, 0)}
          </p>
        </div>
        <div className="bg-green-50 p-3 rounded-lg text-center">
          <h3 className="text-sm font-medium text-green-700">平均進度</h3>
          <p className="text-xl font-bold text-green-600">
            {enhancedStudents.length > 0 ? Math.round(enhancedStudents.reduce((sum, s) => sum + s.progressPercentage, 0) / enhancedStudents.length) : 0}%
          </p>
        </div>
      </div>
      
      {/* 桌面版表格 */}
      <div className="hidden lg:block overflow-x-auto">
        <div className="max-h-[500px] overflow-y-auto border border-gray-300 rounded scrollbar-thin scrollbar-thumb-customgreen scrollbar-track-gray-50" 
             style={{ scrollBehavior: 'smooth' }}>
          <table className="w-full border-collapse">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="border p-3 text-left">學生姓名</th>
                <th className="border p-3 text-left">當前專案</th>
                <th className="border p-3 text-center">進度</th>
                <th className="border p-3 text-center">最後活動</th>
                <th className="border p-3 text-center">反思記錄</th>
                <th className="border p-3 text-center">想法節點</th>
                <th className="border p-3 text-center">看板任務</th>
                <th className="border p-3 text-center">聊天訊息</th>
                <th className="border p-3 text-center">狀態</th>
                <th className="border p-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {enhancedStudents.length > 0 ? enhancedStudents.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="border p-3 font-medium">
                    <div>
                      <p className="font-semibold">{student.username || student.name}</p>
                      <p className="text-xs text-gray-500">{student.teamRole}</p>
                    </div>
                  </td>
                  <td className="border p-3">
                    <div>
                      <p className="font-medium">{student.projectName}</p>
                      <p className="text-xs text-gray-500">階段 {student.currentStage}-{student.currentSubStage}</p>
                    </div>
                  </td>
                  <td className="border p-3 text-center">
                    <div className="flex items-center justify-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="bg-teal-600 h-2 rounded-full" 
                          style={{ width: `${student.progressPercentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{student.progressPercentage}%</span>
                    </div>
                  </td>
                  <td className="border p-3 text-center text-sm text-gray-600">
                    {student.lastActivity ? formatRelativeTime(student.lastActivity) : '無資料'}
                  </td>
                  <td className="border p-3 text-center">
                    <span className={`font-bold ${student.weeklyReflections > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                      {student.weeklyReflections}
                    </span>
                  </td>
                  <td className="border p-3 text-center">
                    <span className={`font-bold ${student.ideaNodes > 0 ? 'text-purple-600' : 'text-gray-400'}`}>
                      {student.ideaNodes}
                    </span>
                  </td>
                  <td className="border p-3 text-center">
                    <span className={`font-bold ${student.kanbanTasks > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                      {student.kanbanTasks}
                    </span>
                  </td>
                  <td className="border p-3 text-center">
                    <span className={`font-bold ${student.chatMessages > 0 ? 'text-teal-600' : 'text-gray-400'}`}>
                      {student.chatMessages}
                    </span>
                  </td>
                  <td className="border p-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(student.status)}`}>
                      {student.status === 'excellent' ? '優秀' : 
                       student.status === 'active' ? '活躍' :
                       student.status === 'attention' ? '需關注' : '不活躍'}
                    </span>
                  </td>
                  <td className="border p-3 text-center">
                    <button 
                      onClick={() => handleViewDetails(student)}
                      className="bg-teal-500 text-white px-3 py-1 rounded text-sm hover:bg-teal-600 transition-colors"
                    >
                      查看詳情
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="10" className="border p-6 text-center text-gray-500">
                    暫無學生資料
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 行動裝置版卡片 */}
      <div className="lg:hidden space-y-3 max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-customgreen scrollbar-track-gray-50" 
           style={{ scrollBehavior: 'smooth' }}>
        {enhancedStudents.length > 0 ? enhancedStudents.map((student) => (
          <div key={student.id} className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:bg-gray-50 transition-colors">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-medium text-gray-800">{student.username || student.name}</h3>
                <p className="text-sm text-gray-600">{student.projectName}</p>
                <p className="text-xs text-gray-500">{student.teamRole} • 階段 {student.currentStage}-{student.currentSubStage}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(student.status)}`}>
                {student.status === 'excellent' ? '優秀' : 
                 student.status === 'active' ? '活躍' :
                 student.status === 'attention' ? '需關注' : '不活躍'}
              </span>
            </div>
            
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">學習進度</span>
                <span className="text-sm font-medium">{student.progressPercentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-teal-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${student.progressPercentage}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 mb-3 text-sm">
              <div className="text-center">
                <p className="text-xs text-gray-500">反思</p>
                <p className={`font-medium ${student.weeklyReflections > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                  {student.weeklyReflections}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">想法</p>
                <p className={`font-medium ${student.ideaNodes > 0 ? 'text-purple-600' : 'text-gray-400'}`}>
                  {student.ideaNodes}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">任務</p>
                <p className={`font-medium ${student.kanbanTasks > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                  {student.kanbanTasks}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">聊天</p>
                <p className={`font-medium ${student.chatMessages > 0 ? 'text-teal-600' : 'text-gray-400'}`}>
                  {student.chatMessages}
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">
                最後活動: {student.lastActivity ? formatRelativeTime(student.lastActivity) : '無資料'}
              </span>
              <button 
                onClick={() => handleViewDetails(student)}
                className="bg-teal-500 text-white px-3 py-2 rounded text-sm hover:bg-teal-600 transition-colors"
              >
                查看詳情
              </button>
            </div>
          </div>
        )) : (
          <div className="text-center text-gray-500 py-8">
            暫無學生資料
          </div>
        )}
      </div>
    </div>
  );
};

export default AllStudentsView;
