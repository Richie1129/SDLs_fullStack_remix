import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiSearch, FiKey, FiUser, FiUsers } from 'react-icons/fi';
import Swal from 'sweetalert2';
import { getTeacherStudents, adminResetPassword } from '../../api/users';
import { showTempPasswordDialog } from '../../utils/tempPasswordDialog';

function formatTaiwanTime(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export default function TeacherPasswordReset() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getTeacherStudents()
      .then(setStudents)
      .catch(() => Swal.fire({ icon: 'error', title: '載入失敗', text: '無法取得學生列表', confirmButtonColor: '#5BA491' }))
      .finally(() => setLoading(false));
  }, []);

  const filtered = students.filter(s =>
    s.username?.includes(search) ||
    s.account?.includes(search) ||
    s.class?.includes(search)
  );

  const handleReset = async (student) => {
    const confirm = await Swal.fire({
      icon: 'warning',
      title: '重設密碼',
      text: `確定要重設「${student.username}」的密碼？`,
      showCancelButton: true,
      confirmButtonText: '確定重設',
      cancelButtonText: '取消',
      confirmButtonColor: '#5BA491',
    });
    if (!confirm.isConfirmed) return;

    try {
      const data = await adminResetPassword(student.id);
      setStudents(prev => prev.map(s =>
        s.id === student.id ? { ...s, passwordResetAt: new Date().toISOString() } : s
      ));
      await showTempPasswordDialog({
        username: data.username,
        tempPassword: data.tempPassword,
        hint: '請告知學生盡快至個人頁面修改密碼。',
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: '重設失敗',
        text: err?.response?.data?.message || '請稍後再試',
        confirmButtonColor: '#5BA491',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate('/homepage')}
            className="p-2 text-gray-500 hover:text-customgreen hover:bg-customgreen/10 rounded-lg transition-colors duration-fast"
          >
            <FiArrowLeft className="text-lg" />
          </button>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-customgreen/10 rounded-lg">
              <FiKey className="text-customgreen text-lg" />
            </div>
            <div>
              <h1 className="text-h3 font-bold text-gray-800">學生密碼重設</h1>
              <p className="text-caption text-gray-500">僅顯示你指導的專案學生</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* 搜尋列 */}
        <div className="relative mb-5">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜尋姓名、帳號或班級..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-customgreen/30 focus:border-customgreen text-body-sm transition-all duration-fast"
          />
        </div>

        {/* 學生列表 */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-customgreen" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FiUsers className="mx-auto text-4xl mb-3" />
            <p className="text-body-sm">{search ? '查無符合的學生' : '目前沒有指導中的學生'}</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* 桌面版表格 */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-body-sm font-semibold text-gray-600 whitespace-nowrap">姓名</th>
                    <th className="text-left px-4 py-3 text-body-sm font-semibold text-gray-600 whitespace-nowrap">帳號</th>
                    <th className="text-left px-4 py-3 text-body-sm font-semibold text-gray-600 whitespace-nowrap">班級 / 座號</th>
                    <th className="text-left px-4 py-3 text-body-sm font-semibold text-gray-600 whitespace-nowrap">所屬專案</th>
                    <th className="text-left px-4 py-3 text-body-sm font-semibold text-gray-600 whitespace-nowrap">重設時間</th>
                    <th className="text-center px-4 py-3 text-body-sm font-semibold text-gray-600 whitespace-nowrap">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(student => (
                    <tr key={student.id} className="hover:bg-gray-50 transition-colors duration-fast">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-customgreen/10 flex items-center justify-center flex-shrink-0">
                            <FiUser className="text-customgreen text-caption" />
                          </div>
                          <span className="font-medium text-body-sm text-gray-800">{student.username}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-body-sm text-gray-600 whitespace-nowrap">{student.account}</td>
                      <td className="px-4 py-3 text-body-sm text-gray-600 whitespace-nowrap">
                        {student.class || '—'} {student.seatNumber ? `/ ${student.seatNumber}` : ''}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {student.projects?.map(p => (
                            <span key={p.id} className="px-2 py-0.5 bg-teal-50 text-teal-700 rounded-full text-caption whitespace-nowrap">
                              {p.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-body-sm text-gray-500 whitespace-nowrap">
                        {formatTaiwanTime(student.passwordResetAt)}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleReset(student)}
                          className="px-3 py-1.5 bg-amber-500 text-white text-body-sm rounded-lg hover:bg-amber-600 transition-colors duration-fast whitespace-nowrap"
                        >
                          重設密碼
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 行動版卡片 */}
            <div className="sm:hidden divide-y divide-gray-100">
              {filtered.map(student => (
                <div key={student.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-body-sm text-gray-800">{student.username}</p>
                    <p className="text-caption text-gray-500">{student.account}</p>
                    {student.class && (
                      <p className="text-caption text-gray-400">{student.class}{student.seatNumber ? ` / ${student.seatNumber}號` : ''}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {student.projects?.map(p => (
                        <span key={p.id} className="px-1.5 py-0.5 bg-teal-50 text-teal-700 rounded text-caption">
                          {p.name}
                        </span>
                      ))}
                    </div>
                    <p className="text-caption text-gray-400 mt-1">
                      重設時間：{formatTaiwanTime(student.passwordResetAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleReset(student)}
                    className="flex-shrink-0 px-3 py-1.5 bg-amber-500 text-white text-body-sm rounded-lg hover:bg-amber-600 transition-colors duration-fast"
                  >
                    重設密碼
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-caption text-gray-400 mt-4 text-center">
          共 {filtered.length} 位學生
        </p>
      </div>
    </div>
  );
}
