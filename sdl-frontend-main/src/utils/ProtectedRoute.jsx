import React, { useEffect, useContext } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Loader from '../components/Loader';
import { authStorage } from '../services/storageService';

export const ProtectedLogin = () => {
    const auth = authStorage.get("accessToken");
    return (
        !auth ? <Outlet /> : auth ? <Navigate to='/homepage'/> : <Loader />
    )
}

export const ProtectedRoute = () => {
    const auth = authStorage.get("accessToken");
    return (
        auth ? <Outlet /> : !auth ? <Navigate to='/'/> : <Loader />
    )
}