import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiKey, FiUsers, FiUser, FiZap, FiZapOff, FiLogOut } from 'react-icons/fi';
import Swal from 'sweetalert2';
import { listUsers, resetUserPassword, toggleAiAccess } from '../../api/admin';
import { userStorage, authStorage } from '../../services/storageService';

const PAGE_SIZE_OPTIONS = [1, 10, 20, 50, 100];
const ROLE_OPTIONS = [
    { value: 'all', label: '全部角色' },
    { value: 'student', label: '學生' },
    { value: 'teacher', label: '教師' },
    { value: 'admin', label: '管理員' },
];

function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('zh-TW', {
        timeZone: 'Asia/Taipei',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false,
    });
}

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [keywordInput, setKeywordInput] = useState('');
    const [keyword, setKeyword] = useState('');
    const [role, setRole] = useState('all');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const data = await listUsers({ keyword, role, page, pageSize });
            setUsers(data.users || []);
            setTotal(data.total || 0);
        } catch (err) {
            const code = err?.response?.data?.code;
            if (code === 'ADMIN_REQUIRED') {
                Swal.fire({ icon: 'error', title: '權限不足', text: '此頁面僅限管理員存取', confirmButtonColor: '#5BA491' });
                navigate('/homepage');
                return;
            }
            Swal.fire({ icon: 'error', title: '載入失敗', text: err?.response?.data?.message || '無法取得用戶列表', confirmButtonColor: '#5BA491' });
        } finally {
            setLoading(false);
        }
    }, [keyword, role, page, pageSize, navigate]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleSearch = (e) => {
        e.preventDefault();
        setKeyword(keywordInput.trim());
        setPage(1);
    };

    const handleLogout = () => {
        authStorage.clear();
        userStorage.clear();
        navigate('/login');
    };

    const handleReset = async (user) => {
        const confirm = await Swal.fire({
            icon: 'warning',
            title: '重設密碼',
            text: `確定要重設「${user.username}」（${user.account}）的密碼？`,
            showCancelButton: true,
            confirmButtonText: '確定重設',
            cancelButtonText: '取消',
            confirmButtonColor: '#5BA491',
        });
        if (!confirm.isConfirmed) return;

        try {
            const data = await resetUserPassword(user.id);
            await Swal.fire({
                icon: 'success',
                title: '重設成功',
                html: `
                    <p class="text-sm text-gray-600 mb-3">
                        ${data.username} 的臨時密碼如下，請告知用戶盡快自行修改。
                    </p>
                    <div class="flex items-center justify-center gap-2 bg-gray-100 rounded-lg px-4 py-3">
                        <span class="font-mono text-lg font-bold tracking-widest text-gray-800">${data.tempPassword}</span>
                        <button
                            onclick="navigator.clipboard.writeText('${data.tempPassword}').then(() => { this.textContent='已複製'; setTimeout(() => this.textContent='複製', 1500); })"
                            class="ml-2 px-3 py-1 text-sm bg-teal-500 text-white rounded hover:bg-teal-600 transition-colors"
                        >複製</button>
                    </div>
                `,
                confirmButtonText: '關閉',
                confirmButtonColor: '#5BA491',
            });
            fetchUsers();
        } catch (err) {
            Swal.fire({ icon: 'error', title: '重設失敗', text: err?.response?.data?.message || '請稍後再試', confirmButtonColor: '#5BA491' });
        }
    };

    const handleToggleAi = async (user) => {
        const next = !user.aiEnabled;
        const confirm = await Swal.fire({
            icon: 'question',
            title: next ? '開啟 AI 功能' : '關閉 AI 功能',
            text: `確定要${next ? '開啟' : '關閉'}「${user.username}」的 AI 功能？`,
            showCancelButton: true,
            confirmButtonText: '確定',
            cancelButtonText: '取消',
            confirmButtonColor: '#5BA491',
        });
        if (!confirm.isConfirmed) return;

        try {
            await toggleAiAccess(user.id, next);
            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, aiEnabled: next } : u));
        } catch (err) {
            Swal.fire({ icon: 'error', title: '更新失敗', text: err?.response?.data?.message || '請稍後再試', confirmButtonColor: '#5BA491' });
        }
    };

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-white shadow-sm border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
                    <div className="flex items-center gap-2 flex-1">
                        <div className="p-2 bg-customgreen/10 rounded-lg">
                            <FiUsers className="text-customgreen text-lg" />
                        </div>
                        <div>
                            <h1 className="text-h3 font-bold text-gray-800">Admin Dashboard</h1>
                            <p className="text-caption text-gray-500">用戶管理與 AI 功能權限</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-1 px-3 py-2 text-body-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-normal"
                    >
                        <FiLogOut /> 登出
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3 mb-5">
                    <div className="relative flex-1">
                        <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="搜尋帳號或姓名..."
                            value={keywordInput}
                            onChange={e => setKeywordInput(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-customgreen/30 focus:border-customgreen text-body-sm transition-all duration-normal"
                        />
                    </div>
                    <select
                        value={role}
                        onChange={e => { setRole(e.target.value); setPage(1); }}
                        className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-customgreen/30 focus:border-customgreen text-body-sm transition-all duration-normal"
                    >
                        {ROLE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <button
                        type="submit"
                        className="px-5 py-2.5 bg-customgreen text-white rounded-xl hover:bg-customgreen/90 hover:shadow-lg transition-all duration-normal text-body-sm font-medium whitespace-nowrap"
                    >
                        搜尋
                    </button>
                </form>

                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-customgreen" />
                    </div>
                ) : users.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <FiUsers className="mx-auto text-4xl mb-3" />
                        <p className="text-body-sm">查無符合的用戶</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="text-left px-4 py-3 text-body-sm font-semibold text-gray-600">ID</th>
                                        <th className="text-left px-4 py-3 text-body-sm font-semibold text-gray-600">帳號</th>
                                        <th className="text-left px-4 py-3 text-body-sm font-semibold text-gray-600">姓名</th>
                                        <th className="text-left px-4 py-3 text-body-sm font-semibold text-gray-600">角色</th>
                                        <th className="text-left px-4 py-3 text-body-sm font-semibold text-gray-600">班級/座號</th>
                                        <th className="text-center px-4 py-3 text-body-sm font-semibold text-gray-600">AI</th>
                                        <th className="text-left px-4 py-3 text-body-sm font-semibold text-gray-600">上次重設</th>
                                        <th className="text-center px-4 py-3 text-body-sm font-semibold text-gray-600">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {users.map(u => (
                                        <tr key={u.id} className="hover:bg-gray-50 transition-colors duration-normal">
                                            <td className="px-4 py-3 text-body-sm text-gray-500">{u.id}</td>
                                            <td className="px-4 py-3 text-body-sm text-gray-700 font-mono">{u.account}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-customgreen/10 flex items-center justify-center">
                                                        <FiUser className="text-customgreen text-caption" />
                                                    </div>
                                                    <span className="text-body-sm text-gray-800">{u.username}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-body-sm">
                                                <span className={
                                                    u.role === 'admin' ? 'px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-caption'
                                                    : u.role === 'teacher' ? 'px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-caption'
                                                    : 'px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-caption'
                                                }>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-body-sm text-gray-600">
                                                {u.class || '—'}{u.seatNumber ? ` / ${u.seatNumber}` : ''}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {u.aiEnabled ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-caption">
                                                        <FiZap /> 已開
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full text-caption">
                                                        <FiZapOff /> 已關
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-caption text-gray-500">
                                                {formatDate(u.passwordResetAt)}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={() => handleReset(u)}
                                                        className="px-3 py-1.5 bg-amber-500 text-white text-caption rounded-lg hover:bg-amber-500/90 hover:shadow-lg transition-all duration-normal"
                                                    >
                                                        <span className="inline-flex items-center gap-1"><FiKey /> 重設</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleAi(u)}
                                                        className={
                                                            u.aiEnabled
                                                                ? 'px-3 py-1.5 bg-gray-500 text-white text-caption rounded-lg hover:bg-gray-500/90 hover:shadow-lg transition-all duration-normal'
                                                                : 'px-3 py-1.5 bg-customgreen text-white text-caption rounded-lg hover:bg-customgreen/90 hover:shadow-lg transition-all duration-normal'
                                                        }
                                                    >
                                                        {u.aiEnabled ? '關 AI' : '開 AI'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* 行動版卡片 */}
                        <div className="md:hidden divide-y divide-gray-100">
                            {users.map(u => (
                                <div key={u.id} className="p-4">
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold text-body-sm text-gray-800">{u.username}</p>
                                            <p className="text-caption text-gray-500 font-mono">{u.account}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={
                                                    u.role === 'admin' ? 'px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-caption'
                                                    : u.role === 'teacher' ? 'px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-caption'
                                                    : 'px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-caption'
                                                }>{u.role}</span>
                                                {u.aiEnabled ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-caption">
                                                        <FiZap /> AI 開
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full text-caption">
                                                        <FiZapOff /> AI 關
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-3">
                                        <button
                                            onClick={() => handleReset(u)}
                                            className="flex-1 px-3 py-1.5 bg-amber-500 text-white text-caption rounded-lg hover:bg-amber-500/90 transition-all duration-normal"
                                        >
                                            <span className="inline-flex items-center justify-center gap-1"><FiKey /> 重設密碼</span>
                                        </button>
                                        <button
                                            onClick={() => handleToggleAi(u)}
                                            className={
                                                u.aiEnabled
                                                    ? 'flex-1 px-3 py-1.5 bg-gray-500 text-white text-caption rounded-lg hover:bg-gray-500/90 transition-all duration-normal'
                                                    : 'flex-1 px-3 py-1.5 bg-customgreen text-white text-caption rounded-lg hover:bg-customgreen/90 transition-all duration-normal'
                                            }
                                        >
                                            {u.aiEnabled ? '關 AI' : '開 AI'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex flex-col md:flex-row justify-between items-center gap-3 mt-5">
                    <div className="flex items-center gap-2 text-body-sm text-gray-600">
                        <span>共 {total} 筆，每頁顯示</span>
                        <select
                            value={pageSize}
                            onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                            className="px-2 py-1 rounded border border-gray-200 bg-white text-body-sm"
                        >
                            {PAGE_SIZE_OPTIONS.map(n => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                        <span>筆</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-3 py-1.5 text-body-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-normal"
                        >
                            上一頁
                        </button>
                        <span className="text-body-sm text-gray-600">第 {page} / {totalPages} 頁</span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="px-3 py-1.5 text-body-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-normal"
                        >
                            下一頁
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
