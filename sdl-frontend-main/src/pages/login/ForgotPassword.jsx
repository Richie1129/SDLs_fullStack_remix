import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from 'react-query';
import axios from 'axios';
import { useTracking } from '../../providers/TrackingProvider';
import { MdArrowForward } from 'react-icons/md';
import { FiMail, FiCheckCircle } from 'react-icons/fi';

const forgotPasswordAPI = async (email) => {
  const response = await axios.post('/api/auth/forgot-password', { email });
  return response.data;
};

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const { track } = useTracking();

  const forgotPasswordMutation = useMutation(forgotPasswordAPI, {
    onSuccess: (data) => { setMessage(data.message); setIsSuccess(true); },
    onError: (error) => { setMessage(error.response?.data?.message || '發送失敗，請稍後再試'); setIsSuccess(false); }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) { setMessage('請輸入電子郵件地址'); setIsSuccess(false); return; }
    track('PASSWORD_RESET_REQUEST_SUBMIT', 'user', null, { email, timestamp: new Date().toISOString() });
    forgotPasswordMutation.mutate(email);
  };

  return (
    <div className="flex min-h-screen">

      {/* ── 左側：品牌面板 ── */}
      <div className="hidden md:flex flex-col justify-between w-1/2 relative overflow-hidden px-12 lg:px-16 py-10 bg-customgreen">
        {/* 裝飾圓 */}
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-paper-soft/10 pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-paper-soft/[0.07] pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10 flex items-baseline gap-3 motion-safe:animate-rise">
          <span className="text-white font-bold text-h2 tracking-tight">SDLS</span>
          <span className="text-white/50 text-body-sm">Self-Directed Learning</span>
        </div>

        {/* 主文案 */}
        <div className="relative z-10">
          <h1 className="text-white font-bold leading-snug motion-safe:animate-rise" style={{ fontSize: '2.75rem', animationDelay: '150ms' }}>
            重設你的<br />密碼。
          </h1>
          <p className="text-white/70 text-body mt-4 max-w-xs leading-relaxed motion-safe:animate-rise" style={{ animationDelay: '300ms' }}>
            輸入你的電子郵件，我們會寄送重設連結，幫你快速找回帳號。
          </p>
        </div>

        {/* 底部導覽 */}
        <div className="relative z-10 motion-safe:animate-rise" style={{ animationDelay: '450ms' }}>
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

        <div className="w-full max-w-sm mx-auto motion-safe:animate-rise" style={{ animationDelay: '200ms' }}>

          {!isSuccess ? (
            <>
              <div className="mb-8">
                <h2 className="text-h1 font-bold text-ink">忘記密碼</h2>
                <p className="text-body-sm text-ink-muted mt-1">
                  輸入你的電子郵件，我們將發送重設連結
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div>
                  <label className="block text-body-sm font-medium text-ink mb-1.5">電子郵件</label>
                  <div className="relative">
                    <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle text-lg pointer-events-none" />
                    <input
                      type="email" name="email" placeholder="請輸入電子郵件地址"
                      value={email} onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-paper-soft border border-line text-body focus:outline-none focus:border-customgreen focus:ring-2 focus:ring-customgreen/20 transition-all duration-fast"
                      required autoFocus
                    />
                  </div>
                </div>

                {message && !isSuccess && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-body-sm text-red-600">{message}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={forgotPasswordMutation.isLoading}
                  className="w-full flex items-center justify-center gap-2 text-white font-semibold rounded-xl py-3 text-body bg-customgreen hover:bg-customgreen/90 transition-colors duration-fast disabled:opacity-60"
                >
                  {forgotPasswordMutation.isLoading ? '發送中...' : '發送重設郵件'}
                  {!forgotPasswordMutation.isLoading && <MdArrowForward className="text-lg" />}
                </button>
              </form>

              <div className="mt-6 flex flex-row justify-between">
                <Link to="/" className="text-body-sm font-medium text-customgreen hover:underline">
                  返回登入
                </Link>
                <Link to="/register" className="text-body-sm font-medium text-customgreen hover:underline">
                  註冊帳號
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="mb-8">
                <div className="w-14 h-14 rounded-2xl bg-customgreen/10 flex items-center justify-center text-customgreen text-3xl mb-6">
                  <FiCheckCircle />
                </div>
                <h2 className="text-h1 font-bold text-ink">郵件已送出</h2>
                <p className="text-body-sm text-ink-muted mt-1">請查收你的電子郵件收件匣</p>
              </div>

              <div className="p-5 bg-customgreen/5 border border-customgreen/20 rounded-2xl mb-6">
                <p className="text-body-sm text-ink-muted leading-relaxed">{message}</p>
                <p className="text-body-sm text-ink-muted mt-2">
                  若未收到，請確認垃圾郵件資料夾。
                </p>
              </div>

              <button
                onClick={() => { setIsSuccess(false); setEmail(''); setMessage(''); }}
                className="w-full py-3 rounded-xl bg-paper-soft border border-line text-ink-muted font-medium text-body hover:bg-paper transition-colors duration-fast mb-4"
              >
                重新發送
              </button>

              <Link
                to="/"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-customgreen text-white font-semibold text-body hover:bg-customgreen/90 transition-colors duration-fast"
              >
                返回登入
                <MdArrowForward className="text-lg" />
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
