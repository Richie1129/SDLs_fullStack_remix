import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { TypeAnimation } from 'react-type-animation';
import { useMutation } from 'react-query';
import axios from 'axios';
import Login_icon from "../../assets/Animation-login.json";
import Lottie from "lottie-react";
import { useTracking } from '../../providers/TrackingProvider';

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
  const [isSuccess, setIsSuccess] = useState(false);

  // 驗證 token
  const tokenValidationMutation = useMutation(validateTokenAPI, {
    onSuccess: (data) => {
      setIsValidToken(true);
      setUserEmail(data.email);
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
    onSuccess: (data) => {
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
    setError(''); // 清除錯誤訊息
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!passwords.newPassword || !passwords.confirmPassword) {
      setError('請填寫所有欄位');
      return;
    }

    if (passwords.newPassword.length < 8) {
      setError('密碼至少需要 8 個字元');
      return;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      setError('密碼不一致');
      return;
    }

    // 記錄密碼重置執行
    track('PASSWORD_RESET_SUBMIT', 'user', null, {
      email: userEmail,
      timestamp: new Date().toISOString()
    });

    resetPasswordMutation.mutate({
      token,
      newPassword: passwords.newPassword
    });
  };

  if (isLoading) {
    return (
      <section className="flex flex-col md:flex-row h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">驗證中...</p>
        </div>
      </section>
    );
  }

  if (!isValidToken) {
    return (
      <section className="flex flex-col md:flex-row h-screen items-center justify-center">
        <div className="bg-white w-full max-w-md rounded-lg p-component-lg shadow-2xl text-center">
          <div className="mb-6">
            <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <h1 className="text-h2 font-bold text-gray-800 mb-2">連結無效</h1>
            <p className="text-gray-600 mb-6">{error}</p>
          </div>

          <Link
            to="/forgot-password"
            style={{ backgroundColor: "#5BA491" }}
            className="inline-block text-white font-semibold rounded-lg px-6 py-3 text-body"
          >
            重新請求密碼重設
          </Link>
        </div>
      </section>
    );
  }

  if (isSuccess) {
    return (
      <section className="flex flex-col md:flex-row h-screen items-center justify-center">
        <div className="bg-white w-full max-w-md rounded-lg p-component-lg shadow-2xl text-center">
          <div className="mb-6">
            <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <h1 className="text-h2 font-bold text-gray-800 mb-2">密碼重設成功！</h1>
            <p className="text-gray-600 mb-6">您的密碼已成功更新，3秒後將自動跳轉到登入頁面</p>
          </div>

          <Link
            to="/"
            style={{ backgroundColor: "#5BA491" }}
            className="inline-block text-white font-semibold rounded-lg px-6 py-3 text-body"
          >
            立即登入
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col md:flex-row h-screen items-center">
      <div className="hidden bg-white w-full md:w-1/2 xl:w-1/2 h-screen md:flex md:items-center md:justify-center">
        <div className='flex flex-col items-center justify-center h-full'>
          <TypeAnimation
            sequence={[
              "重設密碼 Reset Password",
              3000,
              "設定新密碼 New Password",
              3000,
            ]}
            speed={50}
            wrapper="span"
            cursor={true}
            repeat={Infinity}
            className="mx-auto font-press-start font-semibold text-h2 md:text-h1 lg:text-display mb-10 md:mb-20 text-center px-4"
          />
          <Lottie className="w-64 md:w-80 lg:w-96 max-w-full h-auto" animationData={Login_icon} />
        </div>
      </div>

      <div className="bg-white w-full md:max-w-md lg:max-w-full md:mx-auto md:w-1/2 xl:w-1/2 h-screen lg:px-36 xl:px-40 flex items-center justify-center">
        <div className="bg-white w-full h-100 rounded-lg p-component-lg shadow-2xl">
          <h1 className="text-body-lg font-bold mb-6 flex items-center justify-center">
            歡迎來到 <span style={{ color: "#5BA491" }} className="ml-2">SDLS</span>
          </h1>
          <h1 className="text-display font-bold mb-6 flex items-center justify-center">重設密碼</h1>

          <div className="mb-4">
            <p className="text-gray-600 text-center mb-6">
              為帳號 <span className="font-semibold text-gray-800">{userEmail}</span> 設定新密碼
            </p>
          </div>

          <form className="mt-6" onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 text-body">新密碼</label>
              <input
                type="password"
                name="newPassword"
                placeholder="請輸入新密碼（至少 8 個字元）"
                value={passwords.newPassword}
                onChange={handleChange}
                className="text-body w-full px-4 py-3 rounded-lg bg-white mt-2 border focus:border-green-700 focus:bg-white focus:outline-none"
                minLength="8"
                required
                autoFocus
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-body">確認新密碼</label>
              <input
                type="password"
                name="confirmPassword"
                placeholder="請再次輸入新密碼"
                value={passwords.confirmPassword}
                onChange={handleChange}
                className="text-body w-full px-4 py-3 rounded-lg bg-white mt-2 border focus:border-green-700 focus:bg-white focus:outline-none"
                minLength="8"
                required
              />
            </div>

            {error && (
              <div className="mb-4 p-component-sm bg-red-50 border border-red-200 rounded-lg">
                <span className="text-body-sm text-red-600">{error}</span>
              </div>
            )}

            <div className="mb-6 p-component-sm bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-body-sm text-blue-700">
                <p className="font-semibold mb-1">密碼要求：</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>至少 8 個字元</li>
                  <li>建議包含英文大小寫、數字和特殊字元</li>
                </ul>
              </div>
            </div>

            <button
              type="submit"
              disabled={resetPasswordMutation.isLoading}
              style={{ backgroundColor: "#5BA491" }}
              className="w-full block text-white font-semibold rounded-lg px-4 py-3 text-body disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resetPasswordMutation.isLoading ? '更新中...' : '更新密碼'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-gray-400">
              記起密碼了?
              <span style={{ color: "#5BA491" }} className="text-blue-500 hover:text-blue-700 font-semibold ml-2">
                <Link to="/">返回登入</Link>
              </span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}