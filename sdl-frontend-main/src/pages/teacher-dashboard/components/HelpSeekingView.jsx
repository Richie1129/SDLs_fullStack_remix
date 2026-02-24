import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { 
  FaHandPaper, 
  FaStar, 
  FaChartLine,
  FaSearch,
  FaSync,
  FaExclamationTriangle,
  FaCheckCircle,
  FaArrowUp,
  FaArrowDown 
} from 'react-icons/fa';
import { HiChartBar } from 'react-icons/hi';
import { useHelpSeeking } from '../hooks/useHelpSeeking';
import AvoidanceRiskAlert from './AvoidanceRiskAlert';

/**
 * 教師端 Help-Seeking 儀表板主組件 (A2)
 * 整合求助分析、迴避預警、成效追蹤
 */
const HelpSeekingView = ({ projectId }) => {
  const [activeTab, setActiveTab] = useState('overview'); // overview, risks, effectiveness
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // 使用自定義 Hook 獲取資料
  const {
    overview,
    projectStats,
    avoidanceRisks,
    followUpCases,
    loading,
    error,
    lastUpdate,
    fetchStudentDetails,
    updateAvoidanceRisk,
    triggerAvoidanceDetection,
    triggerEffectivenessCheck,
    refresh
  } = useHelpSeeking(projectId);

  /**
   * 獲取學生詳細資料
   */
  const handleViewStudentDetails = async (userId) => {
    setSelectedStudent(userId);
    setLoadingDetails(true);
    try {
      const details = await fetchStudentDetails(userId, { timeRange: '30d' });
      setStudentDetails(details);
    } catch (err) {
      console.error('獲取學生詳情失敗:', err);
      alert('無法載入學生詳情，請重試');
      setSelectedStudent(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  /**
   * 關閉學生詳情模態框
   */
  const handleCloseDetails = () => {
    setSelectedStudent(null);
    setStudentDetails(null);
  };

  /**
   * 渲染統計卡片
   */
  const renderStatsCards = () => {
    if (!projectStats) return null;

    const cards = [
      {
        title: '總求助次數',
        value: projectStats.totalHelpSeekingCount,
        icon: <FaHandPaper className="text-blue-500" />,
        color: 'blue',
        trend: projectStats.weeklyTrend?.helpSeekingChange
      },
      {
        title: '求助品質平均',
        value: projectStats.avgQualityScore?.toFixed(1),
        suffix: ' / 10',
        icon: <FaStar className="text-yellow-500" />,
        color: 'yellow'
      },
      {
        title: '迴避風險學生',
        value: projectStats.highRiskCount,
        icon: <FaExclamationTriangle className="text-red-500" />,
        color: 'red',
        highlight: projectStats.highRiskCount > 0
      },
      {
        title: '求助成效',
        value: `${projectStats.effectivenessStats?.avgScore?.toFixed(1) || 'N/A'}`,
        suffix: projectStats.effectivenessStats?.avgScore ? ' / 10' : '',
        icon: <FaChartLine className="text-green-500" />,
        color: 'green'
      }
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((card, idx) => (
          <div
            key={idx}
            className={`bg-white rounded-lg shadow-sm border-2 p-4 ${
              card.highlight ? 'border-red-300 animate-pulse' : 'border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{card.icon}</span>
              {card.trend && (
                <span className={`text-xs flex items-center gap-1 ${card.trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {card.trend > 0 ? <FaArrowUp /> : <FaArrowDown />} {Math.abs(card.trend)}%
                </span>
              )}
            </div>
            <div className="text-2xl font-bold text-gray-800">
              {card.value}
              {card.suffix && <span className="text-sm text-gray-500">{card.suffix}</span>}
            </div>
            <div className="text-sm text-gray-600 mt-1">{card.title}</div>
          </div>
        ))}
      </div>
    );
  };

  /**
   * 渲染學生求助品質表格
   */
  const renderStudentQualityTable = () => {
    if (!projectStats?.studentStats || projectStats.studentStats.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <p>尚無學生求助資料</p>
        </div>
      );
    }

    // 依品質分數排序（低到高，凸顯需要關注的學生）
    const sortedStudents = [...projectStats.studentStats].sort(
      (a, b) => a.avgQualityScore - b.avgQualityScore
    );

    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">學生</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">求助次數</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">品質分數</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">成效分數</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">迴避風險</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedStudents.map((student) => {
              const qualityLevel = student.avgQualityScore >= 7 ? 'high' : student.avgQualityScore >= 4 ? 'medium' : 'low';
              const qualityColors = {
                high: 'text-green-600 bg-green-50',
                medium: 'text-yellow-600 bg-yellow-50',
                low: 'text-red-600 bg-red-50'
              };

              return (
                <tr key={student.userId} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">
                      {student.studentName || `學生 #${student.userId}`}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-gray-700">{student.helpSeekingCount}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-sm font-semibold ${qualityColors[qualityLevel]}`}>
                      {student.avgQualityScore.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {student.avgEffectivenessScore ? (
                      <span className="text-gray-700">{student.avgEffectivenessScore.toFixed(1)}</span>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {student.avoidanceRiskLevel ? (
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        student.avoidanceRiskLevel === 'high' ? 'bg-red-100 text-red-800' :
                        student.avoidanceRiskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {student.avoidanceRiskLevel === 'high' ? '高' :
                         student.avoidanceRiskLevel === 'medium' ? '中' : '低'}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleViewStudentDetails(student.userId)}
                      className="text-blue-600 hover:text-blue-800 text-sm underline"
                    >
                      詳情
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  /**
   * 渲染成效追蹤列表
   */
  const renderEffectivenessTracking = () => {
    if (!followUpCases || followUpCases.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <FaCheckCircle className="text-4xl mb-2 mx-auto text-green-500" />
          <p className="text-body-base">無待追蹤案例</p>
          <p className="text-body-sm mt-1">所有求助都已完成成效檢查</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {followUpCases.map((caseItem) => (
          <div
            key={caseItem.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-grow">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-gray-800">
                    {caseItem.studentName || `學生 #${caseItem.userId}`}
                  </span>
                  {caseItem.followUpNeeded && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
                      需要追蹤
                    </span>
                  )}
                </div>
                
                <p className="text-sm text-gray-700 mb-1">
                  <strong>求助內容：</strong>{caseItem.question}
                </p>
                
                <div className="flex items-center gap-4 text-xs text-gray-600 mt-2">
                  <span>求助時間：{formatDistanceToNow(new Date(caseItem.createdAt), { addSuffix: true, locale: zhTW })}</span>
                  {caseItem.effectivenessScore !== null && (
                    <span className={`font-semibold ${
                      caseItem.effectivenessScore >= 7 ? 'text-green-600' :
                      caseItem.effectivenessScore >= 4 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      成效分數：{caseItem.effectivenessScore.toFixed(1)}
                    </span>
                  )}
                </div>

                {caseItem.taskStatusBefore && caseItem.taskStatusAfter24h && (
                  <div className="mt-2 text-xs">
                    <span className="text-gray-600">狀態變化：</span>
                    <span className="ml-1 px-2 py-1 bg-gray-100 rounded">{caseItem.taskStatusBefore}</span>
                    <span className="mx-1">→</span>
                    <span className="px-2 py-1 bg-blue-100 rounded">{caseItem.taskStatusAfter24h}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  /**
   * 載入狀態
   */
  if (loading && !projectStats) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">載入 Help-Seeking 資料中...</p>
        </div>
      </div>
    );
  }

  /**
   * 錯誤狀態
   */
  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-xl shadow-sm border border-red-200">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">載入失敗</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={refresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            重試
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6 bg-gray-50">
      {/* 標題列 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaHandPaper className="text-blue-600" />
            Help-Seeking 分析儀表板
          </h2>
          {lastUpdate && (
            <p className="text-sm text-gray-500 mt-1">
              最後更新：{formatDistanceToNow(lastUpdate, { addSuffix: true, locale: zhTW })}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={triggerAvoidanceDetection}
            disabled={loading}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 text-sm flex items-center gap-2"
          >
            <FaSearch /> 偵測迴避
          </button>
          <button
            onClick={refresh}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm flex items-center gap-2"
          >
            <FaSync /> 重新整理
          </button>
        </div>
      </div>

      {/* 統計卡片 */}
      {renderStatsCards()}

      {/* 分頁導航 */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          <HiChartBar /> 總覽分析
        </button>
        <button
          onClick={() => setActiveTab('risks')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'risks'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          <FaExclamationTriangle /> 迴避預警 {avoidanceRisks.length > 0 && `(${avoidanceRisks.length})`}
        </button>
        <button
          onClick={() => setActiveTab('effectiveness')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'effectiveness'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          <FaChartLine /> 成效追蹤 {followUpCases.length > 0 && `(${followUpCases.length})`}
        </button>
      </div>

      {/* 分頁內容 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {activeTab === 'overview' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">學生求助品質分析</h3>
            {renderStudentQualityTable()}
          </div>
        )}

        {activeTab === 'risks' && (
          <AvoidanceRiskAlert
            risks={avoidanceRisks}
            onUpdate={updateAvoidanceRisk}
            loading={loading}
            onRefresh={refresh}
          />
        )}

        {activeTab === 'effectiveness' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">求助成效追蹤</h3>
            {renderEffectivenessTracking()}
          </div>
        )}
      </div>

      {/* 學生詳情模態框 */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">學生求助詳情</h3>
              <button
                onClick={handleCloseDetails}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                &times;
              </button>
            </div>
            
            <div className="p-6">
              {loadingDetails ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 mt-4">載入中...</p>
                </div>
              ) : studentDetails ? (
                <div className="space-y-4">
                  {/* 學生基本資訊 */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-700 mb-2">基本資訊</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">學生姓名：</span>
                        <span className="font-medium">{studentDetails.username || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">求助次數：</span>
                        <span className="font-medium">{studentDetails.totalHelpSeeking || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">品質分數：</span>
                        <span className="font-medium">{studentDetails.qualityScore?.toFixed(1) || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">成效分數：</span>
                        <span className="font-medium">{studentDetails.avgEffectivenessScore?.toFixed(1) || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* 求助類型分布 */}
                  {studentDetails.helpSeekingTypeDistribution && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-700 mb-2">求助類型分布</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">適應性求助：</span>
                          <span className="font-medium text-green-600">{studentDetails.helpSeekingTypeDistribution.adaptive || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">快速求助：</span>
                          <span className="font-medium text-yellow-600">{studentDetails.helpSeekingTypeDistribution.expedient || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">混合模式：</span>
                          <span className="font-medium text-blue-600">{studentDetails.helpSeekingTypeDistribution.mixed || 0}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 最近求助記錄 */}
                  {studentDetails.recentLogs && studentDetails.recentLogs.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">最近求助記錄</h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {studentDetails.recentLogs.slice(0, 5).map((log) => (
                          <div key={log.id} className="bg-white border border-gray-200 rounded p-3 text-sm">
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-medium text-gray-800">{log.taskTitle || '無任務'}</span>
                              <span className="text-xs text-gray-500">
                                {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: zhTW })}
                              </span>
                            </div>
                            <div className="text-gray-600">
                              <span className="text-xs">類型：{log.helpSeekingType === 'adaptive' ? '適應性' : log.helpSeekingType === 'expedient' ? '快速' : '混合'}</span>
                              {log.askedSources && log.askedSources.length > 0 && (
                                <span className="text-xs ml-2">來源：{log.askedSources.join(', ')}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>無法載入詳細資料</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpSeekingView;
