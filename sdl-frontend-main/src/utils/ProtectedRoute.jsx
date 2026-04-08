import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { authStorage } from '../services/storageService';

export const ProtectedLogin = () => {
    const auth = authStorage.get("accessToken");
    // H12: 修正三元邏輯 — 有 token 則跳轉首頁，否則顯示登入頁
    return auth ? <Navigate to='/homepage'/> : <Outlet />;
}

export const ProtectedRoute = () => {
    const auth = authStorage.get("accessToken");
    // H12: 修正三元邏輯 — 有 token 則顯示子路由，否則跳轉登入
    return auth ? <Outlet /> : <Navigate to='/'/>;
}