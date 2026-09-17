import React from 'react';
import { Link } from 'react-router-dom';
export default function NotFound() {
  return (
    <div className="w-screen h-[100dvh] flex flex-col justify-center items-center gap-stack-sm px-component-base text-center">
      <h1 className="text-display text-amber-500">404</h1>
      <h2 className="text-h2 text-gray-900">找不到這個頁面</h2>
      <p className="text-body text-gray-600">網址可能打錯了，或這個頁面已經不存在。</p>
      <Link to="/" className="mt-2 inline-flex items-center px-btn-x py-btn-y rounded-lg bg-customgreen text-white font-semibold hover:bg-customgreen/90 hover:shadow-lg transition-all duration-fast">回到首頁</Link>
    </div>
  );
}
