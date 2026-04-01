import { io } from "socket.io-client";
import { authStorage } from '../services/storageService';
import axios from 'axios';

// Fix: Use empty string for relative path in development to respect proxy
// or use window.location.origin if needed.
// 'localhost/' is invalid URL for socket.io client constructor in some versions
const URL = process.env.NODE_ENV === 'production' ? undefined : '';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

export const socket = io(URL, {
    autoConnect: false,
    path: '/socket.io'
});

/**
 * 檢查 JWT token 是否已過期或即將過期（5 分鐘內）
 */
function isTokenExpiredOrExpiring(token) {
    if (!token) return true;
    try {
        // JWT 使用 Base64URL 編碼，需轉換為標準 Base64
        const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64));
        const now = Math.floor(Date.now() / 1000);
        return payload.exp - now < 300; // 小於 5 分鐘視為即將過期
    } catch {
        return true;
    }
}

/**
 * 嘗試用 refresh token 取得新的 access token
 * 使用原生 axios 避免 apiClient interceptor 遞迴
 */
async function refreshAccessToken() {
    const refreshToken = authStorage.get('refreshToken');
    if (!refreshToken) return null;

    try {
        const response = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
        const newToken = response.data.accessToken;
        authStorage.set('accessToken', newToken);
        return newToken;
    } catch {
        return null;
    }
}

// Refresh mutex — 防止多次 connect() 同時觸發多次 refresh
let refreshPromise = null;

// 在連接前更新認證資訊，必要時先 refresh token
const originalConnect = socket.connect;
socket.connect = function() {
    const currentToken = authStorage.get('accessToken');

    if (isTokenExpiredOrExpiring(currentToken)) {
        // token 過期或即將過期，先 refresh 再連線
        if (!refreshPromise) {
            refreshPromise = refreshAccessToken().finally(() => {
                refreshPromise = null;
            });
        }

        refreshPromise
            .then((refreshedToken) => {
                const finalToken = refreshedToken || currentToken;
                this.auth = { token: finalToken };
                this.io.opts.extraHeaders = { 'accesstoken': finalToken };
                originalConnect.call(this);
            })
            .catch(() => {
                // Refresh 失敗，用現有 token 嘗試連線
                this.auth = { token: currentToken };
                this.io.opts.extraHeaders = { 'accesstoken': currentToken };
                originalConnect.call(this);
            });

        return this; // 維持鏈式呼叫
    }

    // token 有效，直接連線
    this.auth = { token: currentToken };
    this.io.opts.extraHeaders = { 'accesstoken': currentToken };
    return originalConnect.call(this);
};
