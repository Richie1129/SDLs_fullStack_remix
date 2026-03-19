import { differenceInDays, parseISO } from 'date-fns';

/**
 * 未活躍學生警示列表
 * - >7 天：琥珀色 dot
 * - >14 天：紅色 dot
 * 按最久未活躍排序
 */
const DOT_AMBER = '#EF9F27';
const DOT_RED   = '#E24B4A';

const InactiveStudentsList = ({ students = [] }) => {
  const now = new Date();

  const inactive = students
    .map((s) => {
      const daysSince = s.lastActivity
        ? differenceInDays(now, parseISO(s.lastActivity))
        : Infinity;
      return { ...s, daysSince };
    })
    .filter((s) => s.daysSince >= 7)
    .sort((a, b) => b.daysSince - a.daysSince);

  return (
    <div className="bg-white border border-gray-200 hover:border-gray-400 transition-colors duration-fast rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div>
          <h3 className="text-body-sm font-semibold text-gray-700">未活躍學生警示</h3>
          <p className="text-caption text-[#888780]">超過 7 天未有任何學習活動</p>
        </div>
        {inactive.length > 0 && (
          <span className="text-caption font-medium text-[#EF9F27] bg-[#FAEEDA] px-2 py-0.5 rounded-full">
            {inactive.length} 人
          </span>
        )}
      </div>

      {/* List */}
      {inactive.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <p className="text-body-sm text-gray-400">所有學生近期均有活動</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {inactive.map((student, index) => {
            const isRed = student.daysSince >= 14;
            const dotColor = isRed ? DOT_RED : DOT_AMBER;
            const label = student.daysSince === Infinity
              ? '從未活動'
              : `${student.daysSince} 天前`;

            return (
              <div
                key={student.id || index}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors duration-fast"
              >
                {/* Status dot */}
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: dotColor }}
                />

                {/* Name + last active */}
                <div className="flex-1 min-w-0">
                  <p className="text-body-sm font-medium text-gray-800 truncate">
                    {student.username || student.name || '未知'}
                  </p>
                  <p className="text-caption text-[#888780]">{label}</p>
                </div>

                {/* Progress */}
                <span className="metric-value text-body-sm font-medium text-[#2C2C2A] flex-shrink-0">
                  {Math.round(student.progressPercentage || 0)}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default InactiveStudentsList;
