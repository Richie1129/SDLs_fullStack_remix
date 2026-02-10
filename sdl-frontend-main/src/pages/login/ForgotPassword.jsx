import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { TypeAnimation } from 'react-type-animation';
import { useMutation } from 'react-query';
import axios from 'axios';
import Login_icon from "../../assets/Animation-login.json";
import Lottie from "lottie-react";
import { useTracking } from '../../providers/TrackingProvider';

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
    onSuccess: (data) => {
      setMessage(data.message);
      setIsSuccess(true);
    },
    onError: (error) => {
      setMessage(error.response?.data?.message || '發送失敗，請稍後再試');
      setIsSuccess(false);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) {
      setMessage('請輸入電子郵件地址');
      setIsSuccess(false);
      return;
    }
    
    // 記錄密碼重置請求
    track('PASSWORD_RESET_REQUEST_SUBMIT', 'user', null, {
      email,
      timestamp: new Date().toISOString()
    });
    
    forgotPasswordMutation.mutate(email);
  };

  return (
    <section className="flex flex-col md:flex-row h-screen items-center">
      <div className="hidden bg-white w-full md:w-1/2 xl:w-1/2 h-screen md:flex md:items-center md:justify-center">
        <div className='flex flex-col items-center justify-center h-full'>
          <TypeAnimation
            sequence={[
              "忘記密碼 Password Reset",
              3000,
              "重設密碼 Reset Password",
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
          <h1 className="text-display font-bold mb-6 flex items-center justify-center">忘記密碼</h1>

          {!isSuccess ? (
            <form className="mt-6" onSubmit={handleSubmit}>
              <div className="mb-4">
                <p className="text-gray-600 text-center mb-6">
                  請輸入您的電子郵件地址，我們將發送重設密碼的連結給您。
                </p>
              </div>

              <div>
                <label className="block text-gray-700 text-body">電子郵件</label>
                <input
                  type="email"
                  name="email"
                  placeholder="請輸入電子郵件地址"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="text-body w-full px-4 py-3 rounded-lg bg-white mt-2 border focus:border-green-700 focus:bg-white focus:outline-none"
                  required
                  autoFocus
                />
              </div>

              {message && !isSuccess && (
                <div className="mt-4 p-component-sm bg-red-50 border border-red-200 rounded-lg">
                  <span className="text-body-sm text-red-600">{message}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={forgotPasswordMutation.isLoading}
                style={{ backgroundColor: "#5BA491" }}
                className="w-full block text-white font-semibold rounded-lg px-4 py-3 mt-6 text-body disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {forgotPasswordMutation.isLoading ? '發送中...' : '發送重設郵件'}
              </button>
            </form>
          ) : (
            <div className="mt-6">
              <div className="mb-6 p-component-base bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-body-sm text-green-700 font-medium">郵件發送成功！</span>
                </div>
              </div>

              <div className="text-center mb-6">
                <p className="text-gray-600 mb-4">{message}</p>
                <p className="text-gray-500 text-body-sm">
                  請檢查您的電子郵件收件匣（包含垃圾郵件資料夾），
                  並點擊郵件中的連結來重設密碼。
                </p>
              </div>

              <button
                onClick={() => {
                  setIsSuccess(false);
                  setEmail('');
                  setMessage('');
                }}
                className="w-full block bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg px-4 py-3 mt-4 text-body"
              >
                重新發送
              </button>
            </div>
          )}

          <div className="mt-8 flex flex-row justify-between items-center">
            <p className="text-gray-400">
              記起密碼了?
              <span style={{ color: "#5BA491" }} className="text-blue-500 hover:text-blue-700 font-semibold ml-2">
                <Link to="/">返回登入</Link>
              </span>
            </p>
            <p className="text-gray-400">
              還沒有帳號?
              <span style={{ color: "#5BA491" }} className="text-blue-500 hover:text-blue-700 font-semibold ml-2">
                <Link to="/register">註冊帳號</Link>
              </span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}