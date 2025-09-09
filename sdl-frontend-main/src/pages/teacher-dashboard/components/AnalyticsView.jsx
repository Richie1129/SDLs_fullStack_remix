import React from 'react';
import { generateStudentActivityStats, calculateCreatorStats } from '../utils';

const AnalyticsView = ({ enhancedStudents, realData }) => {
  // 建立關聯對照表
  const relationMap = {};
  realData.nodeRelations.forEach(relation => {
    if (!relationMap[relation.from_node_id]) {
      relationMap[relation.from_node_id] = [];
    }
    relationMap[relation.from_node_id].push(relation.to_node_id);
  });

  // 計算統計數據
  const nodeCreators = calculateCreatorStats(realData.nodes, 'owner');
  const taskCreators = calculateCreatorStats(realData.tasks, 'owner');
  const studentActivity = generateStudentActivityStats(enhancedStudents, realData);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 數據統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 sm:p-6 rounded-lg text-white">
          <h3 className="text-sm font-medium mb-2">總想法節點</h3>
          <p className="text-2xl sm:text-3xl font-bold">{realData.nodes.length}</p>
          <p className="text-xs mt-1 opacity-80">
            活躍創作者: {Object.keys(nodeCreators).length}人
          </p>
        </div>
        
        <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 sm:p-6 rounded-lg text-white">
          <h3 className="text-sm font-medium mb-2">看板任務</h3>
          <p className="text-2xl sm:text-3xl font-bold">{realData.tasks.length}</p>
          <p className="text-xs mt-1 opacity-80">
            已完成: {realData.tasks.filter(t => t.status === '已完成' || t.status === 'Done').length}
          </p>
        </div>
        
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 sm:p-6 rounded-lg text-white">
          <h3 className="text-sm font-medium mb-2">節點關聯</h3>
          <p className="text-2xl sm:text-3xl font-bold">{realData.nodeRelations.length}</p>
          <p className="text-xs mt-1 opacity-80">
            平均每節點: {realData.nodes.length > 0 ? (realData.nodeRelations.length / realData.nodes.length).toFixed(1) : 0} 個連結
          </p>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 sm:p-6 rounded-lg text-white">
          <h3 className="text-sm font-medium mb-2">學習反思</h3>
          <p className="text-2xl sm:text-3xl font-bold">{realData.reflections.length}</p>
          <p className="text-xs mt-1 opacity-80">
            平均每人: {enhancedStudents.length > 0 ? (realData.reflections.length / enhancedStudents.length).toFixed(1) : 0} 篇
          </p>
        </div>
      </div>

      {/* 學生活動排行榜 */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
        <h2 className="text-lg sm:text-2xl font-semibold mb-4 text-gray-700">學生活動排行榜</h2>
        <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-customgreen scrollbar-track-gray-50" 
             style={{ scrollBehavior: 'smooth' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {studentActivity.slice(0, 10).map((student, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                  index === 0 ? 'bg-yellow-500' :
                  index === 1 ? 'bg-gray-400' :
                  index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{student.name}</p>
                  <div className="text-xs text-gray-600 flex space-x-3">
                    <span>反思: {student.reflections}</span>
                    <span>想法: {student.nodes}</span>
                    <span>任務: {student.tasks}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-teal-600">{student.totalActivity}</p>
                  <p className="text-xs text-gray-500">總活動</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 想法牆統計 */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <h2 className="text-lg sm:text-2xl font-semibold mb-4 text-gray-700">想法牆統計</h2>
        
        {/* 創作者排行 */}
        <div className="mb-6">
          <h3 className="text-md font-semibold mb-3 text-gray-600">創作者排行</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-customgreen scrollbar-track-gray-50" 
               style={{ scrollBehavior: 'smooth' }}>
            {Object.entries(nodeCreators)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 9)
              .map(([creator, count], index) => (
                <div key={creator} className="flex items-center justify-between p-2 bg-purple-50 rounded">
                  <span className="text-sm font-medium text-purple-800">{creator}</span>
                  <span className="text-sm text-purple-600">{count} 個節點</span>
                </div>
              ))}
          </div>
        </div>
        
        {/* 桌面版表格 */}
        <div className="hidden lg:block overflow-x-auto">
          <div className="max-h-96 overflow-y-auto border border-gray-300 rounded scrollbar-thin scrollbar-thumb-customgreen scrollbar-track-gray-50" 
               style={{ scrollBehavior: 'smooth' }}>
            <table className="w-full border-collapse">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="border p-2 text-left">擁有者</th>
                  <th className="border p-2 text-left">標題</th>
                  <th className="border p-2 text-center">建立時間</th>
                  <th className="border p-2 text-center">延伸節點</th>
                </tr>
              </thead>
              <tbody>
                {realData.nodes.length > 0 ? (
                  (() => {
                    // 計算 rowSpan
                    const ownerRowSpan = {};
                    realData.nodes.forEach((node) => {
                      const owner = node.owner || node.username || node.user_name || '未知';
                      ownerRowSpan[owner] = (ownerRowSpan[owner] || 0) + 1;
                    });

                    let processedOwners = new Set();

                    return realData.nodes.map((node, index) => {
                      const owner = node.owner || node.username || node.user_name || '未知';
                      const isFirstOccurrence = !processedOwners.has(owner);
                      if (isFirstOccurrence) {
                        processedOwners.add(owner);
                      }

                      return (
                        <tr key={node.id || index} className="hover:bg-gray-50">
                          {isFirstOccurrence && (
                            <td 
                              className="border p-2 font-medium bg-purple-50 text-purple-800 text-center align-top" 
                              rowSpan={ownerRowSpan[owner]}
                            >
                              {owner}
                            </td>
                          )}
                          <td className="border p-2">{node.title || '無標題'}</td>
                          <td className="border p-2 text-center text-sm">
                            {node.createdAt ? new Date(node.createdAt).toLocaleString('zh-TW') : "無資料"}
                          </td>
                          <td className="border p-2 text-center">
                            <span className={relationMap[node.id]?.length > 0 ? "text-teal-600 font-medium" : "text-gray-500"}>
                              {relationMap[node.id]?.length > 0
                                ? relationMap[node.id]
                                    .map(id => {
                                      const targetNode = realData.nodes.find(n => n.id === id);
                                      return targetNode ? targetNode.title : `節點${id}`;
                                    })
                                    .join(", ")
                                : "無延伸節點"}
                            </span>
                          </td>
                        </tr>
                      );
                    });
                  })()
                ) : (
                  <tr>
                    <td colSpan="4" className="border p-4 text-center text-gray-500">無節點數據</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 行動裝置版卡片 */}
        <div className="lg:hidden space-y-3 max-h-96 overflow-y-auto">
          {realData.nodes.length > 0 ? realData.nodes.map((node, index) => (
            <div key={node.id || index} className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:bg-gray-50">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-gray-800 text-sm">{node.title || '無標題'}</h3>
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                  {node.owner || node.username || node.user_name || '未知'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-2">
                {node.createdAt ? new Date(node.createdAt).toLocaleString('zh-TW') : "無資料"}
              </p>
              <div className="text-xs">
                <span className="text-gray-600">延伸節點: </span>
                <span className={relationMap[node.id]?.length > 0 ? "font-medium text-teal-600" : "text-gray-500"}>
                  {relationMap[node.id]?.length > 0
                    ? relationMap[node.id]
                        .map(id => {
                          const targetNode = realData.nodes.find(n => n.id === id);
                          return targetNode ? targetNode.title : `節點${id}`;
                        })
                        .join(", ")
                    : "無延伸節點"}
                </span>
              </div>
            </div>
          )) : (
            <div className="text-center text-gray-500 py-8">無節點數據</div>
          )}
        </div>
      </div>

      {/* 進度看板統計 */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <h2 className="text-lg sm:text-2xl font-semibold mb-4 text-gray-700">進度看板統計</h2>
        
        {/* 任務創建者排行 */}
        <div className="mb-6">
          <h3 className="text-md font-semibold mb-3 text-gray-600">任務創建者排行</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-customgreen scrollbar-track-gray-50" 
               style={{ scrollBehavior: 'smooth' }}>
            {Object.entries(taskCreators)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 9)
              .map(([creator, count], index) => (
                <div key={creator} className="flex items-center justify-between p-2 bg-orange-50 rounded">
                  <span className="text-sm font-medium text-orange-800">{creator}</span>
                  <span className="text-sm text-orange-600">{count} 個任務</span>
                </div>
              ))}
          </div>
        </div>
        
        {/* 桌面版表格 */}
        <div className="hidden lg:block overflow-x-auto">
          <div className="max-h-96 overflow-y-auto border border-gray-300 rounded scrollbar-thin scrollbar-thumb-customgreen scrollbar-track-gray-50" 
               style={{ scrollBehavior: 'smooth' }}>
            <table className="w-full border-collapse">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="border p-2 text-left">狀態</th>
                  <th className="border p-2 text-left">標題</th>
                  <th className="border p-2 text-left">內容</th>
                  <th className="border p-2 text-center">建立者</th>
                  <th className="border p-2 text-center">負責人</th>
                  <th className="border p-2 text-center">圖片</th>
                </tr>
              </thead>
              <tbody>
                {realData.tasks.length > 0 ? (
                  realData.tasks.sort((a, b) => a.columnId - b.columnId).reduce((acc, task, index, array) => {
                    const prevTask = array[index - 1];
                    const showStatus = !prevTask || prevTask.status !== task.status;
                    
                    acc.push(
                      <tr key={task.id || index} className="hover:bg-gray-50">
                        {showStatus && (
                          <td 
                            className="border p-2 font-medium bg-gray-50 text-center" 
                            rowSpan={array.filter(t => t.status === task.status).length}
                          >
                            <span className="px-2 py-1 bg-teal-100 text-teal-800 rounded-full text-xs">
                              {task.status}
                            </span>
                          </td>
                        )}
                        <td className="border p-2">{task.title || '無標題'}</td>
                        <td className="border p-2">
                          <div className="max-w-xs truncate">
                            {task.content || '無內容'}
                          </div>
                        </td>
                        <td className="border p-2 text-center">{task.owner || task.created_by || '未知'}</td>
                        <td className="border p-2 text-center">
                          {task.assignees?.length > 0 
                            ? task.assignees.map(a => a.username || a.name).join(", ")
                            : task.assigned_to || '未指派'}
                        </td>
                        <td className="border p-2 text-center">
                          {task.images?.length > 0 ? (
                            <img 
                              src={task.images[0]} 
                              alt="任務圖片" 
                              className="w-8 h-8 object-cover rounded mx-auto"
                            />
                          ) : task.image ? (
                            <img 
                              src={task.image} 
                              alt="任務圖片" 
                              className="w-8 h-8 object-cover rounded mx-auto"
                            />
                          ) : (
                            <span className="text-gray-400 text-xs">無圖片</span>
                          )}
                        </td>
                      </tr>
                    );
                    return acc;
                  }, [])
                ) : (
                  <tr>
                    <td colSpan="6" className="border p-4 text-center text-gray-500">無任務數據</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 行動裝置版卡片 */}
        <div className="lg:hidden space-y-3 max-h-96 overflow-y-auto">
          {realData.tasks.length > 0 ? realData.tasks.map((task, index) => (
            <div key={task.id || index} className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:bg-gray-50">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-gray-800 text-sm">{task.title || '無標題'}</h3>
                <span className="px-2 py-1 bg-teal-100 text-teal-800 rounded-full text-xs">
                  {task.status}
                </span>
              </div>
              <p className="text-xs text-gray-600 mb-2">
                {task.content || '無內容'}
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">建立者: </span>
                  <span className="font-medium">{task.owner || task.created_by || '未知'}</span>
                </div>
                <div>
                  <span className="text-gray-500">負責人: </span>
                  <span className="font-medium">
                    {task.assignees?.length > 0 
                      ? task.assignees.map(a => a.username || a.name).join(", ")
                      : task.assigned_to || '未指派'}
                  </span>
                </div>
              </div>
              {(task.images?.length > 0 || task.image) && (
                <div className="mt-2">
                  <img 
                    src={task.images?.[0] || task.image} 
                    alt="任務圖片" 
                    className="w-16 h-16 object-cover rounded"
                  />
                </div>
              )}
            </div>
          )) : (
            <div className="text-center text-gray-500 py-8">無任務數據</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsView;
