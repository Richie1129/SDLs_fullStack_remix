import React, { useState, useCallback } from 'react';
import { FaMedal } from 'react-icons/fa';
import AuthImage from '@/components/AuthImage';
import { generateStudentActivityStats, calculateCreatorStats } from '../utils';
import {
  getSafeArrayData,
  getSafeDisplayName,
  getSafeValue
} from '../../student-dashboard/utils';
import LoadingState from '../../student-dashboard/components/LoadingState';

// 圖表元件
import {
  ProgressLineChart,
  ReflectionBarChart
} from '../../../components/charts';
import ClassFiveRsRadarChart from './ClassFiveRsRadarChart';

// 互動元件
import FilterBar from './FilterBar';
import QuickActions from './QuickActions';

// 優化 Hooks
import {
  useFilteredData,
  usePerformanceMonitor,
  useLazyLoad
} from '../hooks/useOptimization';

const AnalyticsView = ({ enhancedStudents, realData }) => {
  // 效能監控
  usePerformanceMonitor('AnalyticsView');
  
  // 篩選狀態
  const [filterOptions, setFilterOptions] = useState({
    timeRange: 'all',
    students: []
  });
  const [nodeDetailModal, setNodeDetailModal] = useState({
    isOpen: false,
    nodeTitle: '',
    relatedNodes: []
  });
  const [expandedRelatedNodeKeys, setExpandedRelatedNodeKeys] = useState({});

  // 安全資料驗證
  if (!realData) {
    return <LoadingState type="loading" message="分析資料載入中..." />;
  }

  // 處理篩選變更
  const handleFilterChange = useCallback((newFilters) => {
    setFilterOptions(newFilters);
  }, []);

  // 應用篩選
  const filteredData = useFilteredData(realData, filterOptions);

  // 安全的資料存取（使用篩選後的資料）
  const safeNodes = getSafeArrayData(filteredData.nodes);
  const safeTasks = getSafeArrayData(filteredData.tasks);
  const safeNodeRelations = getSafeArrayData(filteredData.nodeRelations);
  const safeReflections = getSafeArrayData(filteredData.reflections);
  const safeEnhancedStudents = getSafeArrayData(enhancedStudents);
  
  // 根據篩選條件過濾學生
  const filteredStudents = safeEnhancedStudents.filter(student => {
    if (filterOptions.students.length === 0) return true;
    return filterOptions.students.includes(student.id) || 
           filterOptions.students.includes(student.userId);
  });

  // 節點延遲載入
  const {
    visibleData: visibleNodes,
    loadMore: loadMoreNodes,
    hasMore: hasMoreNodes
  } = useLazyLoad(safeNodes, 20);

  // 建立關聯對照表 - 安全版本
  const relationMap = {};
  try {
    safeNodeRelations.forEach(relation => {
      const fromNodeId = relation?.from_node_id
        ?? relation?.fromNodeId
        ?? relation?.fromId
        ?? relation?.from
        ?? relation?.source
        ?? relation?.source_id
        ?? relation?.sourceId;
      const toNodeId = relation?.to_node_id
        ?? relation?.toNodeId
        ?? relation?.toId
        ?? relation?.to
        ?? relation?.target
        ?? relation?.target_id
        ?? relation?.targetId;

      if (fromNodeId != null && toNodeId != null) {
        const fromKey = String(fromNodeId);
        if (!relationMap[fromKey]) {
          relationMap[fromKey] = [];
        }
        relationMap[fromKey].push(toNodeId);
      }
    });
  } catch (error) {
    console.warn('建立關聯對照表時發生錯誤:', error);
  }

  // 計算統計數據 - 安全版本（使用篩選後的學生）
  const nodeCreators = calculateCreatorStats(safeNodes, 'owner');
  const taskCreators = calculateCreatorStats(safeTasks, 'owner');
  const studentActivity = generateStudentActivityStats(filteredStudents);

  const openNodeDetailModal = useCallback((nodeTitle, relatedIds) => {
    const relatedNodes = relatedIds.map((id) => {
      const targetNode = safeNodes.find((node) => String(node?.id) === String(id));
      return {
        id,
        title: targetNode?.title || `節點${id}`,
        content: targetNode?.content || '無內容'
      };
    });

    setNodeDetailModal({
      isOpen: true,
      nodeTitle: nodeTitle || '無標題',
      relatedNodes
    });

    setExpandedRelatedNodeKeys({});
  }, [safeNodes]);

  const closeNodeDetailModal = useCallback(() => {
    setNodeDetailModal({
      isOpen: false,
      nodeTitle: '',
      relatedNodes: []
    });

    setExpandedRelatedNodeKeys({});
  }, []);

  const toggleRelatedNodeExpand = useCallback((nodeKey) => {
    setExpandedRelatedNodeKeys((prev) => ({
      ...prev,
      [nodeKey]: !prev[nodeKey]
    }));
  }, []);

  // 渲染節點表格行 - 抽取成獨立函數
  const renderNodeTableRows = () => {
    if (visibleNodes.length === 0) {
      return (
        <tr>
          <td colSpan="5" className="border p-component-base text-center text-gray-500">無節點數據</td>
        </tr>
      );
    }

    try {
      const validNodes = visibleNodes
        .filter(node => node && typeof node === 'object')
        .sort((a, b) => {
          const ownerA = (getSafeDisplayName(a) || '未知').toString();
          const ownerB = (getSafeDisplayName(b) || '未知').toString();
          if (ownerA !== ownerB) return ownerA.localeCompare(ownerB, 'zh-Hant');

          const timeA = new Date(a?.createdAt || 0).getTime();
          const timeB = new Date(b?.createdAt || 0).getTime();
          return timeA - timeB;
        });

      return validNodes.map((node, index) => {
        const owner = getSafeDisplayName(node) || '未知';
        const previousOwner = index > 0 ? (getSafeDisplayName(validNodes[index - 1]) || '未知') : null;
        const isFirstInOwnerGroup = owner !== previousOwner;

        const safeNodeId = node.id || `node-${index}`;
        const relatedIds = relationMap[String(node.id)] || [];

        return (
          <tr key={safeNodeId} className="hover:bg-gray-50">
            <td className="border p-component-xs font-medium bg-purple-50 text-purple-800 text-center align-top break-words">
              {isFirstInOwnerGroup ? owner : <span className="text-transparent select-none">　</span>}
            </td>
            <td className="border p-component-xs break-words">{node.title || '無標題'}</td>
            <td className="border p-component-xs">
              <div className="max-w-xs truncate">
                {node.content || '無內容'}
              </div>
            </td>
            <td className="border p-component-xs text-center text-body-sm">
              {node.createdAt ?
                new Date(node.createdAt).toLocaleString('zh-TW') :
                "無資料"}
            </td>
            <td className="border p-component-xs text-center">
              {relatedIds.length > 0 ? (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-teal-600 font-medium">{relatedIds.length} 個</span>
                  <button
                    onClick={() => openNodeDetailModal(node.title || '無標題', relatedIds)}
                    className="text-trust-blue-600 hover:text-trust-blue-700 underline text-caption font-medium"
                    aria-label="查看延伸節點詳情"
                  >
                    查看
                  </button>
                </div>
              ) : (
                <span className="text-gray-500">無延伸節點</span>
              )}
            </td>
          </tr>
        );
      });
    } catch (error) {
      console.warn('渲染節點表格時發生錯誤:', error);
      return (
        <tr>
          <td colSpan="5" className="border p-component-base text-center text-red-500">
            渲染失敗，請重新載入
          </td>
        </tr>
      );
    }
  };

  return (
    <div className="space-y-stack-sm sm:space-y-stack-md analytics-view">
      {/* 篩選與快速操作區 */}
      <div className="relative z-30 grid grid-cols-1 lg:grid-cols-3 gap-component-md-lg">
        <div className="lg:col-span-2">
          <FilterBar
            students={safeEnhancedStudents}
            onFilterChange={handleFilterChange}
            defaultTimeRange="all"
          />
        </div>
        <div>
          <QuickActions
            data={{
              enhancedStudents: filteredStudents,
              nodes: safeNodes,
              tasks: safeTasks,
              reflections: safeReflections
            }}
            fileName="teacher-dashboard"
          />
        </div>
      </div>

      {/* 數據視覺化圖表區 */}
      <div className="grid grid-cols-1 gap-component-md-lg">
        {/* 學習進度折線圖 */}
        <div>
          <ProgressLineChart
            enhancedStudents={filteredStudents}
            realData={filteredData}
          />
        </div>

        {/* 反思品質長條圖 */}
        <div>
          <ReflectionBarChart
            enhancedStudents={filteredStudents}
            realData={filteredData}
          />
        </div>

        {/* ③ 全班 5Rs 反思深度聚合雷達圖 */}
        <div>
          <ClassFiveRsRadarChart reflections={safeReflections} />
        </div>
      </div>

      {/* 數據統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-stack-sm sm:gap-stack-md">
        <div className="bg-gradient-to-r from-customgreen to-teal-600 p-component-base sm:p-component-md-lg rounded-lg text-white">
          <h3 className="text-body-sm font-medium mb-2">總想法節點</h3>
          <p className="text-h2 sm:text-h1 font-bold">{safeNodes.length}</p>
          <p className="text-caption mt-1 opacity-80">
            活躍創作者: {Object.keys(nodeCreators).length}人
          </p>
        </div>

        <div className="bg-gradient-to-r from-teal-500 to-teal-600 p-component-base sm:p-component-md-lg rounded-lg text-white">
          <h3 className="text-body-sm font-medium mb-2">看板任務</h3>
          <p className="text-h2 sm:text-h1 font-bold">{safeTasks.length}</p>
          <p className="text-caption mt-1 opacity-80">
            已完成: {safeTasks.filter(t => t?.status === '已完成' || t?.status === 'Done').length}
          </p>
        </div>

        <div className="bg-gradient-to-r from-customgreen to-customgreen/80 p-component-base sm:p-component-md-lg rounded-lg text-white">
          <h3 className="text-body-sm font-medium mb-2">節點關聯</h3>
          <p className="text-h2 sm:text-h1 font-bold">{safeNodeRelations.length}</p>
          <p className="text-caption mt-1 opacity-80">
            平均每節點: {safeNodes.length > 0 ? (safeNodeRelations.length / safeNodes.length).toFixed(1) : 0} 個連結
          </p>
        </div>

        <div className="bg-gradient-to-r from-teal-600 to-customgreen p-component-base sm:p-component-md-lg rounded-lg text-white">
          <h3 className="text-body-sm font-medium mb-2">學習反思</h3>
          <p className="text-h2 sm:text-h1 font-bold">{safeReflections.length}</p>
          <p className="text-caption mt-1 opacity-80">
            平均每人: {safeEnhancedStudents.length > 0 ? (safeReflections.length / safeEnhancedStudents.length).toFixed(1) : 0} 篇
          </p>
        </div>
      </div>

      {/* 學生活動排行榜 */}
      <div className="bg-white p-component-base sm:p-component-md-lg rounded-lg shadow-md">
        <h2 className="text-body-lg sm:text-h2 font-semibold mb-4 text-gray-700">學生活動排行榜</h2>
        <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-customgreen scrollbar-track-gray-50" 
             style={{ scrollBehavior: 'smooth' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-sm">
            {studentActivity.slice(0, 10).map((student, index) => (
              <div key={index} className="flex items-center space-x-3 p-component-sm bg-gray-50 rounded-lg">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-body-sm font-bold text-white ${
                  index === 0 ? 'bg-yellow-500' :
                  index === 1 ? 'bg-gray-400' :
                  index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{student.name}</p>
                  <div className="text-caption text-gray-600 flex space-x-3">
                    <span>反思: {student.reflections}</span>
                    <span>想法: {student.nodes}</span>
                    <span>任務: {student.tasks}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-body-sm font-bold text-teal-600">{student.totalActivity}</p>
                  <p className="text-caption text-gray-500">總活動</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 想法牆統計 */}
      <div className="bg-white p-component-base rounded-lg shadow-md">
        <h2 className="text-body-lg sm:text-h2 font-semibold mb-4 text-gray-700">想法牆統計</h2>
        
        {/* 創作者排行 */}
        <div className="mb-6">
          <h3 className="text-md font-semibold mb-3 text-gray-600">創作者排行</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-customgreen scrollbar-track-gray-50" 
               style={{ scrollBehavior: 'smooth' }}>
            {Object.entries(nodeCreators)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 3)
              .map(([creator, count], index) => (
                <div key={creator} className="relative flex items-center justify-between p-component-xs bg-purple-50 rounded">
                  {index < 3 && (
                    <div className="absolute -top-1 -left-1 text-body-lg">
                      <FaMedal className={`w-5 h-5 ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : 'text-orange-600'}`} />
                    </div>
                  )}
                  <span className={`text-body-sm font-medium text-purple-800 ${index < 3 ? 'ml-4' : ''}`}>{creator}</span>
                  <span className="text-body-sm text-purple-600">{count} 個節點</span>
                </div>
              ))}
          </div>
        </div>
        
        {/* 桌面版表格 */}
        <div className="hidden lg:block overflow-x-auto">
          <div className="max-h-96 overflow-y-auto border border-gray-300 rounded scrollbar-thin scrollbar-thumb-customgreen scrollbar-track-gray-50" 
               style={{ scrollBehavior: 'smooth' }}>
            <table className="w-full border-collapse table-fixed">
              <colgroup>
                <col className="w-[10%]" />
                <col className="w-[20%]" />
                <col className="w-[34%]" />
                <col className="w-[15%]" />
                <col className="w-[21%]" />
              </colgroup>
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="border p-component-xs text-left">擁有者</th>
                  <th className="border p-component-xs text-left">標題</th>
                  <th className="border p-component-xs text-left">內容</th>
                  <th className="border p-component-xs text-center">建立時間</th>
                  <th className="border p-component-xs text-center">延伸節點</th>
                </tr>
              </thead>
              <tbody>
                {renderNodeTableRows()}
              </tbody>
            </table>
          </div>
        </div>

        {/* 行動裝置版卡片 */}
        <div className="lg:hidden space-y-3 max-h-96 overflow-y-auto">
          {visibleNodes.length > 0 ? visibleNodes.filter(node => node && typeof node === 'object').map((node, index) => {
            const relatedIds = relationMap[String(node.id)] || [];
            return (
            <div key={node.id || index} className="border border-gray-200 rounded-lg p-component-sm sm:p-component-base hover:bg-gray-50">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-gray-800 text-body-sm">{node.title || '無標題'}</h3>
                <span className="text-caption bg-purple-100 text-purple-700 px-2 py-1 rounded">
                  {getSafeDisplayName(node) || '未知'}
                </span>
              </div>
              <p className="text-caption text-gray-500 mb-2">
                {node.createdAt ? new Date(node.createdAt).toLocaleString('zh-TW') : "無資料"}
              </p>
              <p className="text-caption text-gray-600 mb-2">
                <span className="font-medium">內容: </span>
                <span className="truncate">{node.content || '無內容'}</span>
              </p>
              <div className="text-caption">
                <span className="text-gray-600">延伸節點: </span>
                {relatedIds.length > 0 ? (
                  <>
                    <span className="font-medium text-teal-600">{relatedIds.length} 個</span>
                    <button
                      onClick={() => openNodeDetailModal(node.title || '無標題', relatedIds)}
                      className="ml-2 text-trust-blue-600 hover:text-trust-blue-700 underline"
                      aria-label="查看延伸節點詳情"
                    >
                      查看詳情
                    </button>
                  </>
                ) : (
                  <span className="text-gray-500">無延伸節點</span>
                )}
              </div>
            </div>
            );
          }) : (
            <div className="text-center text-gray-500 py-8">無節點數據</div>
          )}
        </div>

        {/* 載入更多按鈕 */}
        {hasMoreNodes && (
          <div className="mt-4 text-center">
            <button
              onClick={loadMoreNodes}
              className="btn-ripple px-6 py-2 bg-gradient-to-r from-trust-blue-500 to-trust-blue-600 hover:from-trust-blue-600 hover:to-trust-blue-700 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
              aria-label="載入更多節點"
            >
              載入更多 ({visibleNodes.length} / {safeNodes.length})
            </button>
          </div>
        )}
      </div>

      {nodeDetailModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeNodeDetailModal} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-body-lg font-semibold text-gray-800">延伸節點詳情</h3>
                <p className="text-caption text-gray-600 mt-1">來源節點：{nodeDetailModal.nodeTitle}</p>
              </div>
              <button
                onClick={closeNodeDetailModal}
                className="text-gray-500 hover:text-gray-700 text-body-lg"
                aria-label="關閉延伸節點詳情"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {nodeDetailModal.relatedNodes.length > 0 ? (
                <div className="space-y-2">
                  {nodeDetailModal.relatedNodes.map((relatedNode, index) => (
                    (() => {
                      const nodeKey = `${relatedNode.id}-${index}`;
                      const isExpanded = !!expandedRelatedNodeKeys[nodeKey];
                      const contentText = relatedNode.content || '無內容';
                      const shouldShowToggle = contentText.length > 90;

                      return (
                        <div
                          key={nodeKey}
                          className="p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-body-sm font-medium text-gray-800 break-words">{relatedNode.title}</p>
                            <span className="text-caption text-gray-500 flex-shrink-0">#{relatedNode.id}</span>
                          </div>

                          <p
                            className="text-caption text-gray-600 mt-1 break-words"
                            style={!isExpanded ? {
                              display: '-webkit-box',
                              WebkitBoxOrient: 'vertical',
                              WebkitLineClamp: 3,
                              overflow: 'hidden'
                            } : undefined}
                          >
                            {contentText}
                          </p>

                          {shouldShowToggle && (
                            <button
                              onClick={() => toggleRelatedNodeExpand(nodeKey)}
                              className="mt-1 text-caption text-trust-blue-700 hover:text-trust-blue-800 underline"
                              aria-label={isExpanded ? '收合內容' : '展開內容'}
                            >
                              {isExpanded ? '收合' : '展開'}
                            </button>
                          )}
                        </div>
                      );
                    })()
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-body-sm">無延伸節點</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 進度看板統計 */}
      <div className="bg-white p-component-base rounded-lg shadow-md">
        <h2 className="text-body-lg sm:text-h2 font-semibold mb-4 text-gray-700">進度看板統計</h2>
        
        {/* 任務創建者排行 */}
        <div className="mb-6">
          <h3 className="text-md font-semibold mb-3 text-gray-600">任務創建者排行</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-customgreen scrollbar-track-gray-50" 
               style={{ scrollBehavior: 'smooth' }}>
            {Object.entries(taskCreators)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 3)
              .map(([creator, count], index) => (
                <div key={creator} className="relative flex items-center justify-between p-component-xs bg-orange-50 rounded">
                  {index < 3 && (
                    <div className="absolute -top-1 -left-1 text-body-lg">
                      <FaMedal className={`w-5 h-5 ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : 'text-orange-600'}`} />
                    </div>
                  )}
                  <span className={`text-body-sm font-medium text-orange-800 ${index < 3 ? 'ml-4' : ''}`}>{creator}</span>
                  <span className="text-body-sm text-orange-600">{count} 個任務</span>
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
                  <th className="border p-component-xs text-left">狀態</th>
                  <th className="border p-component-xs text-left">標題</th>
                  <th className="border p-component-xs text-left">內容</th>
                  <th className="border p-component-xs text-center">建立者</th>
                  <th className="border p-component-xs text-center">負責人</th>
                  <th className="border p-component-xs text-center">圖片</th>
                </tr>
              </thead>
              <tbody>
                {safeTasks.length > 0 ? (
                  safeTasks.filter(task => task && typeof task === 'object').sort((a, b) => (a.columnId || 0) - (b.columnId || 0)).reduce((acc, task, index, array) => {
                    const prevTask = array[index - 1];
                    const showStatus = !prevTask || prevTask.status !== task.status;
                    
                    acc.push(
                      <tr key={task.id || index} className="hover:bg-gray-50">
                        {showStatus && (
                          <td 
                            className="border p-component-xs font-medium bg-gray-50 text-center" 
                            rowSpan={array.filter(t => t.status === task.status).length}
                          >
                            <span className="px-2 py-1 bg-teal-100 text-teal-800 rounded-full text-caption">
                              {task.status}
                            </span>
                          </td>
                        )}
                        <td className="border p-component-xs">{task.title || '無標題'}</td>
                        <td className="border p-component-xs">
                          <div className="max-w-xs truncate">
                            {task.content || '無內容'}
                          </div>
                        </td>
                        <td className="border p-component-xs text-center">{task.owner || task.created_by || '未知'}</td>
                        <td className="border p-component-xs text-center">
                          {task.assignees?.length > 0 
                            ? task.assignees.map(a => a.username || a.name).join(", ")
                            : task.assigned_to || '未指派'}
                        </td>
                        <td className="border p-component-xs text-center">
                          {task.images?.length > 0 ? (
                            <AuthImage 
                              src={task.images[0]} 
                              alt="任務圖片" 
                              className="w-8 h-8 object-cover rounded mx-auto"
                            />
                          ) : task.image ? (
                            <AuthImage 
                              src={task.image} 
                              alt="任務圖片" 
                              className="w-8 h-8 object-cover rounded mx-auto"
                            />
                          ) : (
                            <span className="text-gray-400 text-caption">無圖片</span>
                          )}
                        </td>
                      </tr>
                    );
                    return acc;
                  }, [])
                ) : (
                  <tr>
                    <td colSpan="6" className="border p-component-base text-center text-gray-500">無任務數據</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 行動裝置版卡片 */}
        <div className="lg:hidden space-y-3 max-h-96 overflow-y-auto">
          {safeTasks.length > 0 ? safeTasks.filter(task => task && typeof task === 'object').map((task, index) => (
            <div key={task.id || index} className="border border-gray-200 rounded-lg p-component-sm sm:p-component-base hover:bg-gray-50">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-gray-800 text-body-sm">{task.title || '無標題'}</h3>
                <span className="px-2 py-1 bg-teal-100 text-teal-800 rounded-full text-caption">
                  {task.status}
                </span>
              </div>
              <p className="text-caption text-gray-600 mb-2">
                {task.content || '無內容'}
              </p>
              <div className="grid grid-cols-2 gap-stack-xs text-caption">
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
                  <AuthImage 
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
