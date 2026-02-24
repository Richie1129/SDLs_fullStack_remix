import React from 'react';
import { formatRelativeTime } from '../utils';

const GroupsView = ({ groupData, selectedGroup, setSelectedGroup, enhancedStudents }) => {
  return (
    <div className="space-y-stack-sm sm:space-y-stack-md">
      <div className="bg-white p-component-sm sm:p-component-md-lg rounded-lg shadow-md">
        <h2 className="text-body-lg sm:text-h2 font-semibold mb-4 text-gray-700">小組選擇</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-stack-sm max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-customgreen scrollbar-track-gray-50" 
             style={{ scrollBehavior: 'smooth' }}>
          {groupData.map((group) => (
            <div 
              key={group.id} 
              onClick={() => setSelectedGroup(group)}
              className={`p-component-sm sm:p-component-base rounded-lg border-2 cursor-pointer transition-all ${
                selectedGroup?.id === group.id 
                  ? 'border-teal-500 bg-teal-50' 
                  : 'border-gray-200 hover:border-teal-300'
              }`}
            >
              <h3 className="font-semibold text-body sm:text-body-lg">{group.name}</h3>
              <p className="text-gray-600 text-body-sm">{group.projectName}</p>
              <div className="mt-2 flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-1 sm:space-y-0">
                <span className="text-caption sm:text-body-sm text-gray-500">成員: {group.members.join(', ')}</span>
                <span className="text-caption sm:text-body-sm font-medium text-teal-600">平均進度: {group.averageProgress}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedGroup && (
        <div className="bg-white p-component-sm sm:p-component-md-lg rounded-lg shadow-md">
          <h2 className="text-body-lg sm:text-h2 font-semibold mb-4 text-gray-700">{selectedGroup.name} - 詳細分析</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-stack-sm mb-4 sm:mb-6">
            <div className="bg-teal-50 p-component-sm sm:p-component-base rounded-lg">
              <h3 className="text-caption sm:text-body-sm font-medium text-teal-700">平均進度</h3>
              <p className="text-body-lg sm:text-h2 font-bold text-teal-600">{selectedGroup.averageProgress}%</p>
            </div>
            <div className="bg-blue-50 p-component-sm sm:p-component-base rounded-lg">
              <h3 className="text-caption sm:text-body-sm font-medium text-blue-700">協作分數</h3>
              <p className="text-body-lg sm:text-h2 font-bold text-blue-600">{selectedGroup.collaborationScore}</p>
            </div>
            <div className="bg-green-50 p-component-sm sm:p-component-base rounded-lg">
              <h3 className="text-caption sm:text-body-sm font-medium text-green-700">總想法節點</h3>
              <p className="text-body-lg sm:text-h2 font-bold text-green-600">{selectedGroup.totalIdeaNodes}</p>
            </div>
            <div className="bg-purple-50 p-component-sm sm:p-component-base rounded-lg">
              <h3 className="text-caption sm:text-body-sm font-medium text-purple-700">團隊反思</h3>
              <p className="text-body-lg sm:text-h2 font-bold text-purple-600">{selectedGroup.teamReflections}</p>
            </div>
          </div>

          {/* 桌面版表格 */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-component-sm text-left">成員姓名</th>
                  <th className="border p-component-sm text-center">角色</th>
                  <th className="border p-component-sm text-center">個人進度</th>
                  <th className="border p-component-sm text-center">貢獻度</th>
                  <th className="border p-component-sm text-center">最後活動</th>
                </tr>
              </thead>
              <tbody>
                {enhancedStudents
                  .filter(student => selectedGroup.members.includes(student.username || student.name))
                  .map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="border p-component-sm font-medium">{student.username || student.name}</td>
                      <td className="border p-component-sm text-center">{student.teamRole}</td>
                      <td className="border p-component-sm text-center">
                        <div className="flex items-center justify-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className="bg-teal-600 h-2 rounded-full" 
                              style={{ width: `${student.progressPercentage}%` }}
                            ></div>
                          </div>
                          <span className="text-body-sm">{student.progressPercentage}%</span>
                        </div>
                      </td>
                      <td className="border p-component-sm text-center">
                        <span className="text-body-sm font-medium">
                          {Math.round((student.chatMessages + student.ideaNodes + student.weeklyReflections) / 3)}%
                        </span>
                      </td>
                      <td className="border p-component-sm text-center text-body-sm text-gray-600">
                        {student.lastActivity ? formatRelativeTime(student.lastActivity) : '無資料'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* 行動裝置版卡片 */}
          <div className="lg:hidden space-y-3">
            {enhancedStudents
              .filter(student => selectedGroup.members.includes(student.username || student.name))
              .map((student) => (
                <div key={student.id} className="border border-gray-200 rounded-lg p-component-sm sm:p-component-base">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-medium text-gray-800">{student.username || student.name}</h3>
                      <p className="text-body-sm text-gray-600">{student.teamRole}</p>
                    </div>
                    <span className="text-caption bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {student.lastActivity ? formatRelativeTime(student.lastActivity) : '無資料'}
                    </span>
                  </div>
                  
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-body-sm text-gray-600">個人進度</span>
                      <span className="text-body-sm font-medium">{student.progressPercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-teal-600 h-2 rounded-full" 
                        style={{ width: `${student.progressPercentage}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="text-body-sm text-gray-600">
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
};

export default GroupsView;
