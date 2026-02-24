import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { 
  FaCircle, 
  FaBullseye, 
  FaSync, 
  FaStar, 
  FaCommentDots,
  FaCheck
} from 'react-icons/fa';
import { HiChartBar } from 'react-icons/hi';

/**
 * 迴避風險預警組件 (B3)
 * 顯示學生的求助迴避風險並提供介入操作
 */
const AvoidanceRiskAlert = ({ risks, onUpdate, loading, onRefresh }) => {
  const [expandedRisk, setExpandedRisk] = useState(null);
  const [updateLoading, setUpdateLoading] = useState(null);

  // 風險等級配置
  const riskConfig = {
    high: {
      label: '高風險',
      color: 'red',
      icon: <FaCircle className="text-red-500" />,
      bgClass: 'bg-red-50 border-red-200',
      textClass: 'text-red-800',
      badgeClass: 'bg-red-100 text-red-800'
    },
    medium: {
      label: '中風險',
      color: 'yellow',
      icon: <FaCircle className="text-yellow-500" />,
      bgClass: 'bg-yellow-50 border-yellow-200',
      textClass: 'text-yellow-800',
      badgeClass: 'bg-yellow-100 text-yellow-800'
    },
    low: {
      label: '低風險',
      color: 'green',
      icon: <FaCircle className="text-green-500" />,
      bgClass: 'bg-green-50 border-green-200',
      textClass: 'text-green-800',
      badgeClass: 'bg-green-100 text-green-800'
    }
  };

  // 依風險等級排序
  const sortedRisks = [...risks].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.riskLevel] - order[b.riskLevel];
  });

  // 未確認的高風險數量
  const criticalCount = risks.filter(r => r.riskLevel === 'high' && !r.teacherConfirmed).length;

  /**
   * 更新風險狀態
   */
  const handleUpdateRisk = async (riskId, updateData) => {
    setUpdateLoading(riskId);
    try {
      await onUpdate(riskId, updateData);
    } catch (err) {
      console.error('更新失敗:', err);
      alert('更新失敗，請重試');
    } finally {
      setUpdateLoading(null);
    }
  };

  /**
   * 格式化掙扎訊號
   */
  const renderStruggleSignals = (signals) => {
    if (!signals || signals.length === 0) return null;

    const signalLabels = {
      task_stagnation: '任務停滯',
      blocked_tasks: '任務阻塞',
      reflection_quality_drop: '反思品質下降',
      avoidance_pattern: '迴避模式'
    };

    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {signals.map((signal, idx) => (
          <span
            key={idx}
            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
          >
            {signalLabels[signal] || signal}
          </span>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-100 rounded"></div>
          <div className="h-32 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (!risks || risks.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <FaBullseye className="text-blue-600" />
            求助迴避預警清單
          </h3>
          <button
            onClick={onRefresh}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1"
          >
            <FaSync /> 重新整理
          </button>
        </div>
        <div className="text-center py-8 text-gray-500">
          <FaStar className="text-4xl mb-2 mx-auto text-yellow-400" />
          <p className="text-body-base">目前無預警案例</p>
          <p className="text-body-sm mt-1">學生們的求助行為正常</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {/* 標題列 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <FaBullseye className="text-blue-600" />
            求助迴避預警清單
          </h3>
          {criticalCount > 0 && (
            <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-semibold rounded-full">
              {criticalCount} 個高風險待確認
            </span>
          )}
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1"
        >
          <FaSync /> 重新整理
        </button>
      </div>

      {/* 風險清單 */}
      <div className="space-y-3">
        {sortedRisks.map((risk) => {
          const config = riskConfig[risk.riskLevel];
          const isExpanded = expandedRisk === risk.id;

          return (
            <div
              key={risk.id}
              className={`border rounded-lg overflow-hidden transition-all ${config.bgClass}`}
            >
              {/* 風險摘要 */}
              <div
                className="p-4 cursor-pointer hover:bg-opacity-70"
                onClick={() => setExpandedRisk(isExpanded ? null : risk.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-grow">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{config.icon}</span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${config.badgeClass}`}>
                        {config.label}
                      </span>
                      <span className="font-semibold text-gray-800">
                        {risk.studentName || `學生 #${risk.userId}`}
                      </span>
                      {!risk.teacherConfirmed && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          待確認
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-700 mb-1">
                      <strong>任務：</strong>{risk.taskTitle || `Task #${risk.taskId}`}
                    </p>
                    
                    <p className="text-xs text-gray-600">
                      偵測時間：{formatDistanceToNow(new Date(risk.detectedAt), { addSuffix: true, locale: zhTW })}
                    </p>

                    {renderStruggleSignals(risk.struggleSignals)}
                  </div>

                  <button className="text-gray-400 hover:text-gray-600 ml-4">
                    {isExpanded ? '▲' : '▼'}
                  </button>
                </div>
              </div>

              {/* 展開的詳細資訊 */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-gray-200 mt-2 pt-3">
                  {/* 風險詳情 */}
                  {risk.riskDetails && (
                    <div className="bg-white bg-opacity-50 rounded p-3">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                        <HiChartBar /> 風險詳情
                      </h4>
                      <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                        {JSON.stringify(risk.riskDetails, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* 教師備註 */}
                  {risk.teacherNotes && (
                    <div className="bg-white bg-opacity-50 rounded p-3">
                      <h4 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1">
                        <FaCommentDots /> 教師備註
                      </h4>
                      <p className="text-sm text-gray-600">{risk.teacherNotes}</p>
                    </div>
                  )}

                  {/* 操作按鈕 */}
                  <div className="flex gap-2 pt-2">
                    {!risk.teacherConfirmed && (
                      <button
                        onClick={() => handleUpdateRisk(risk.id, { teacherConfirmed: true })}
                        disabled={updateLoading === risk.id}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                      >
                        {updateLoading === risk.id ? '處理中...' : <><FaCheck /> 已確認</>}
                      </button>
                    )}
                    
                    {!risk.resolved && (
                      <button
                        onClick={() => handleUpdateRisk(risk.id, { resolved: true, resolvedAt: new Date() })}
                        disabled={updateLoading === risk.id}
                        className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                      >
                        {updateLoading === risk.id ? '處理中...' : <><FaCheck /> 標記為已解決</>}
                      </button>
                    )}

                    {risk.resolved && (
                      <span className="px-4 py-2 bg-gray-200 text-gray-600 text-sm rounded-lg flex items-center gap-1">
                        <FaCheck /> 已解決
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 統計摘要 */}
      <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between text-sm">
        <div className="flex gap-4">
          <span className="text-gray-600">
            總計 <strong className="text-gray-800">{risks.length}</strong> 個預警
          </span>
          <span className="text-red-600">
            高風險 <strong>{risks.filter(r => r.riskLevel === 'high').length}</strong>
          </span>
          <span className="text-yellow-600">
            中風險 <strong>{risks.filter(r => r.riskLevel === 'medium').length}</strong>
          </span>
          <span className="text-green-600">
            低風險 <strong>{risks.filter(r => r.riskLevel === 'low').length}</strong>
          </span>
        </div>
        
        <span className="text-gray-500">
          已確認 {risks.filter(r => r.teacherConfirmed).length} / 已解決 {risks.filter(r => r.resolved).length}
        </span>
      </div>
    </div>
  );
};

export default AvoidanceRiskAlert;
