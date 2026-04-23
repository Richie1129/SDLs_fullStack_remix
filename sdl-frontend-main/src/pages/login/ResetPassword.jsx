import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from 'react-query';
import axios from 'axios';
import { useTracking } from '../../providers/TrackingProvider';
import { MdArrowForward } from 'react-icons/md';
import { FiLock, FiEye, FiEyeOff, FiCheckCircle, FiAlertCircle, FiShield } from 'react-icons/fi';

const validateTokenAPI = async (token) => {
  const response = await axios.get(`/api/auth/reset-password/${token}`);
  return response.data;
};

const resetPasswordAPI = async ({ token, newPassword }) => {
  const response = await axios.post('/api/auth/reset-password', {
    token,
    newPassword
  });
  return response.data;
};

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { track } = useTracking();

  const [passwords, setPasswords] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [isValidToken, setIsValidToken] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [userAccount, setUserAccount] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 驗證 token
  const tokenValidationMutation = useMutation(validateTokenAPI, {
    onSuccess: (data) => {
      setIsValidToken(true);
      setUserEmail(data.email);
      setUserName(data.username || '');
      setUserAccount(data.account || '');
      setIsLoading(false);
    },
    onError: (error) => {
      setError(error.response?.data?.message || 'Token 無效或已過期');
      setIsValidToken(false);
      setIsLoading(false);
    }
  });

  // 重設密碼
  const resetPasswordMutation = useMutation(resetPasswordAPI, {
    onSuccess: () => {
      setIsSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 3000);
    },
    onError: (error) => {
      setError(error.response?.data?.message || '密碼重設失敗，請重試');
    }
  });

  useEffect(() => {
    if (!token) {
      setError('缺少重設 token');
      setIsLoading(false);
      return;
    }
    tokenValidationMutation.mutate(token);
  }, [token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPasswords(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!passwords.newPassword || !passwords.confirmPassword) {
      setError('請填寫所有欄位');
      return;
    }

    if (passwords.newPassword.length < 8 || !/[A-Za-z]/.test(passwords.newPassword) || !/\d/.test(passwords.newPassword)) {
      setError('密碼至少需要 8 個字元，並包含英文字母與數字');
      return;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      setError('密碼不一致');
      return;
    }

    track('PASSWORD_RESET_SUBMIT', 'user', null, {
      email: userEmail,
      timestamp: new Date().toISOString()
    });

    resetPasswordMutation.mutate({
      token,
      newPassword: passwords.newPassword
    });
  };

  const inputClass = 'w-full pl-10 pr-10 py-3 rounded-xl bg-paper-soft border border-line text-body focus:outline-none focus:border-customgreen focus:ring-2 focus:ring-customgreen/20 transition-all duration-fast';

  // ── 載入中 ──
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-customgreen/30 border-t-customgreen rounded-full animate-spin mx-auto mb-4" />
          <p className="text-body-sm text-ink-muted">驗證連結中...</p>
        </div>
      </div>
    );
  }

  // ── Token 無效 ──
  if (!isValidToken) {
    return (
      <div className="flex min-h-screen">
        {/* 左側品牌面板 */}
        <div className="hidden md:flex flex-col justify-between w-1/2 relative overflow-hidden px-12 lg:px-16 py-10 bg-customgreen">
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-paper-soft/10 pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-paper-soft/[0.07] pointer-events-none" />

          <div className="relative z-10 flex items-baseline gap-3">
            <span className="text-white font-bold text-h2 tracking-tight">SDLS</span>
            <span className="text-white/50 text-body-sm">Self-Directed Learning</span>
          </div>

          <div className="relative z-10">
            <h1 className="text-white font-bold leading-snug" style={{ fontSize: '2.75rem' }}>
              連結已失效
            </h1>
            <p className="text-white/70 text-body mt-4 max-w-xs leading-relaxed">
              密碼重設連結可能已過期或無效，請重新申請。
            </p>
          </div>

          <div className="relative z-10">
            <p className="text-white/50 text-body-sm">
              需要協助？
              <Link to="/forgot-password" className="text-white font-semibold ml-1 hover:underline">重新取得連結</Link>
            </p>
          </div>
        </div>

        {/* 右側內容 */}
        <div className="flex flex-col justify-center w-full md:w-1/2 min-h-screen bg-paper px-8 sm:px-14 lg:px-20 xl:px-28">
          <div className="md:hidden mb-10">
            <span className="font-bold text-h2 tracking-tight text-customgreen">SDLS</span>
          </div>

          <div className="w-full max-w-sm mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 text-3xl mb-6">
              <FiAlertCircle />
            </div>
            <h2 className="text-h1 font-bold text-ink mb-2">連結無效</h2>
            <p className="text-body-sm text-ink-muted mb-6">{error}</p>

            <Link
              to="/forgot-password"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-customgreen text-white font-semibold text-body hover:bg-customgreen/90 transition-colors duration-fast mb-4"
            >
              重新請求密碼重設
              <MdArrowForward className="text-lg" />
            </Link>

            <Link
              to="/"
              className="flex items-center justify-center w-full py-3 rounded-xl bg-paper-soft border border-line text-ink-muted font-medium text-body hover:bg-paper transition-colors duration-fast"
            >
              返回登入
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── 重設成功 ──
  if (isSuccess) {
    return (
      <div className="flex min-h-screen">
        {/* 左側品牌面板 */}
        <div className="hidden md:flex flex-col justify-between w-1/2 relative overflow-hidden px-12 lg:px-16 py-10 bg-customgreen">
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-paper-soft/10 pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-paper-soft/[0.07] pointer-events-none" />

          <div className="relative z-10 flex items-baseline gap-3">
            <span className="text-white font-bold text-h2 tracking-tight">SDLS</span>
            <span className="text-white/50 text-body-sm">Self-Directed Learning</span>
          </div>

          <div className="relative z-10">
            <h1 className="text-white font-bold leading-snug" style={{ fontSize: '2.75rem' }}>
              密碼已更新，<br />歡迎回來。
            </h1>
            <p className="text-white/70 text-body mt-4 max-w-xs leading-relaxed">
              你的密碼已成功重設，現在可以使用新密碼登入。
            </p>
          </div>

          <div className="relative z-10" />
        </div>

        {/* 右側內容 */}
        <div className="flex flex-col justify-center w-full md:w-1/2 min-h-screen bg-paper px-8 sm:px-14 lg:px-20 xl:px-28">
          <div className="md:hidden mb-10">
            <span className="font-bold text-h2 tracking-tight text-customgreen">SDLS</span>
          </div>

          <div className="w-full max-w-sm mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-customgreen/10 flex items-center justify-center text-customgreen text-3xl mb-6">
              <FiCheckCircle />
            </div>
            <h2 className="text-h1 font-bold text-ink mb-2">密碼重設成功！</h2>
            <p className="text-body-sm text-ink-muted mb-2">你的密碼已成功更新。</p>

            <div className="p-5 bg-customgreen/5 border border-customgreen/20 rounded-2xl mb-6">
              <p className="text-body-sm text-ink-muted leading-relaxed">
                3 秒後將自動跳轉到登入頁面，你也可以直接點選下方按鈕。
              </p>
            </div>

            <Link
              to="/"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-customgreen text-white font-semibold text-body hover:bg-customgreen/90 transition-colors duration-fast"
            >
              立即登入
              <MdArrowForward className="text-lg" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── 重設密碼表單（主畫面） ──
  return (
    <div className="flex min-h-screen">

      {/* ── 左側：品牌面板 ── */}
      <div className="hidden md:flex flex-col justify-between w-1/2 relative overflow-hidden px-12 lg:px-16 py-10 bg-customgreen">
        {/* 裝飾圓 */}
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-paper-soft/10 pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-paper-soft/[0.07] pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10 flex items-baseline gap-3">
          <span className="text-white font-bold text-h2 tracking-tight">SDLS</span>
          <span className="text-white/50 text-body-sm">Self-Directed Learning</span>
        </div>

        {/* 主文案 */}
        <div className="relative z-10">
          <h1 className="text-white font-bold leading-snug" style={{ fontSize: '2.75rem' }}>
            重設你的<br />密碼。
          </h1>
          <p className="text-white/70 text-body mt-4 max-w-xs leading-relaxed">
            設定一組新密碼，即可重新登入並繼續你的探究旅程。
          </p>
          <div className="mt-8 flex flex-col gap-3">
            {[
              { icon: <FiShield />, text: '密碼至少 8 個字元' },
              { icon: <FiLock />, text: '建議包含英文與數字' },
            ].map((b, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-lg flex-shrink-0 bg-paper-soft/20">
                  {b.icon}
                </div>
                <span className="text-white/80 text-body-sm">{b.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 底部導覽 */}
        <div className="relative z-10">
          <p className="text-white/50 text-body-sm">
            記起密碼了？
            <Link to="/" className="text-white font-semibold ml-1 hover:underline">返回登入</Link>
          </p>
        </div>
      </div>

      {/* ── 右側：表單 ── */}
      <div className="flex flex-col justify-center w-full md:w-1/2 min-h-screen bg-paper px-8 sm:px-14 lg:px-20 xl:px-28">

        {/* 行動版 Logo */}
        <div className="md:hidden mb-10">
          <span className="font-bold text-h2 tracking-tight text-customgreen">SDLS</span>
        </div>

        <div className="w-full max-w-sm mx-auto">
          <div className="mb-8">
            <h2 className="text-h1 font-bold text-ink">重設密碼</h2>
            <p className="text-body-sm text-ink-muted mt-1">
              {userName && userAccount
                ? <>為 <span className="font-semibold text-ink">{userName}</span>（帳號：<span className="font-semibold text-ink">{userAccount}</span>）設定新密碼</>
                : <>為 <span className="font-semibold text-ink">{userEmail}</span> 設定新密碼</>
              }
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* 新密碼 */}
            <div>
              <label className="block text-body-sm font-medium text-ink mb-1.5">新密碼</label>
              <div className="relative">
                <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle text-lg pointer-events-none" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  name="newPassword"
                  placeholder="請輸入新密碼（至少 8 個字元）"
                  value={passwords.newPassword}
                  onChange={handleChange}
                  className={inputClass}
                  minLength="8"
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(prev => !prev)}
                  aria-label={showNewPassword ? '隱藏密碼' : '顯示密碼'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink-muted transition-colors duration-fast"
                >
                  {showNewPassword ? <FiEyeOff className="text-lg" /> : <FiEye className="text-lg" />}
                </button>
              </div>
            </div>

            {/* 確認新密碼 */}
            <div>
              <label className="block text-body-sm font-medium text-ink mb-1.5">確認新密碼</label>
              <div className="relative">
                <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle text-lg pointer-events-none" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  placeholder="請再次輸入新密碼"
                  value={passwords.confirmPassword}
                  onChange={handleChange}
                  className={inputClass}
                  minLength="8"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(prev => !prev)}
                  aria-label={showConfirmPassword ? '隱藏密碼' : '顯示密碼'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink-muted transition-colors duration-fast"
                >
                  {showConfirmPassword ? <FiEyeOff className="text-lg" /> : <FiEye className="text-lg" />}
                </button>
              </div>
            </div>

            {/* 密碼要求提示 */}
            <div className="p-4 bg-customgreen/5 border border-customgreen/15 rounded-xl">
              <p className="text-body-sm text-ink-muted font-medium mb-1.5">密碼要求：</p>
              <ul className="text-body-sm text-ink-muted space-y-0.5 list-disc list-inside">
                <li>至少 8 個字元</li>
                <li>建議包含英文大小寫、數字和特殊字元</li>
              </ul>
            </div>

            {/* 錯誤訊息 */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-body-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={resetPasswordMutation.isLoading}
              className="w-full flex items-center justify-center gap-2 text-white font-semibold rounded-xl py-3 text-body bg-customgreen hover:bg-customgreen/90 transition-colors duration-fast disabled:opacity-60"
            >
              {resetPasswordMutation.isLoading ? '更新中...' : '更新密碼'}
              {!resetPasswordMutation.isLoading && <MdArrowForward className="text-lg" />}
            </button>
          </form>

          <div className="mt-6">
            <Link to="/" className="text-body-sm font-medium text-customgreen hover:underline">
              返回登入
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}