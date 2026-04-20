import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { authStorage, userStorage } from '../services/storageService';

export const ProtectedLogin = () => {
    const auth = authStorage.get("accessToken");
    if (!auth) return <Outlet />;
    // admin 登入後固定導向 /admin；其他角色導向 /homepage
    const role = userStorage.get('role');
    return <Navigate to={role === 'admin' ? '/admin' : '/homepage'} />;
}

export const ProtectedRoute = () => {
    const auth = authStorage.get("accessToken");
    // H12: 修正三元邏輯 — 有 token 則顯示子路由，否則跳轉登入
    return auth ? <Outlet /> : <Navigate to='/'/>;
}