import React from 'react';
import { FiAlertCircle, FiCheckCircle, FiArrowLeft } from 'react-icons/fi';
import { useNavigate, useParams } from 'react-router-dom';

export default function PreExportReminder({ completeness, onConfirm, onCancel }) {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { hasAnyReflection, missingSubmits, missingSubmitCount } = completeness;

  const issues = [];
  if (!hasAnyReflection) {
    issues.push({ type: 'warning', text: '尚未撰寫任何個人反思，學習歷程將以任務記錄為主' });
  }
  if (missingSubmitCount > 0) {
    issues.push({ type: 'info', text: `有 ${missingSubmitCount} 個子階段的正式提交尚未完成` });
  }

  if (issues.length === 0) {
    onConfirm();
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">

        {/* 標頭 */}
        <div className="bg-amber-50 border-b border-amber-100 px-6 py-4 flex items-center gap-3">
          <FiAlertCircle className="text-amber-500 w-5 h-5 flex-shrink-0" />
          <div>
            <div className="text-body font-semibold text-gray-800">匯出前確認</div>
            <div className="text-body-sm text-gray-500">你的學習歷程有些地方可以更完整</div>
          </div>
        </div>

        {/* 問題清單 */}
        <div className="px-6 py-4 space-y-3">
          {issues.map((issue, i) => (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${
              issue.type === 'warning' ? 'bg-amber-50 text-amber-800' : 'bg-blue-50 text-blue-800'
            }`}>
              <FiAlertCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                issue.type === 'warning' ? 'text-amber-500' : 'text-blue-500'
              }`} />
              <span className="text-body-sm">{issue.text}</span>
            </div>
          ))}

          <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 text-green-800">
            <FiCheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-500" />
            <span className="text-body-sm">即使有缺少的部分，仍可匯出現有的學習記錄</span>
          </div>
        </div>

        {/* 操作按鈕 */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={() => navigate(`/project/${projectId}/reflection`)}
            className="flex items-center gap-2 px-btn-x py-btn-y rounded-lg border border-gray-200 text-gray-600 text-body-sm hover:bg-gray-50 transition-shadow duration-fast flex-1 justify-center"
          >
            <FiArrowLeft className="w-4 h-4" />
            前往補充
          </button>
          <button
            onClick={onConfirm}
            className="px-btn-x py-btn-y rounded-lg bg-customgreen text-white text-body-sm font-semibold hover:bg-customgreen/90 transition-shadow duration-fast flex-1"
          >
            仍要匯出
          </button>
        </div>
      </div>
    </div>
  );
}
