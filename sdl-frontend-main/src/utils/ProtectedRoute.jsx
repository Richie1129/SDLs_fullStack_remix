import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
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
    const location = useLocation();
    if (!auth) return <Navigate to='/' />;

    // Admin 只能訪問 /admin 一個頁面，其他 protected 路由全部導向 /admin
    const role = userStorage.get('role');
    if (role === 'admin' && location.pathname !== '/admin') {
        return <Navigate to='/admin' replace />;
    }

    return <Outlet />;
}