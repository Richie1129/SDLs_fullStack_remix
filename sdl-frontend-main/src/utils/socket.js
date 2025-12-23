import { io } from "socket.io-client";

// Fix: Use empty string for relative path in development to respect proxy
// or use window.location.origin if needed.
// 'localhost/' is invalid URL for socket.io client constructor in some versions
const URL = process.env.NODE_ENV === 'production' ? undefined : '';

export const socket = io(URL, {
    autoConnect: false,
    path: '/socket.io'
});

// 在連接前更新認證資訊
const originalConnect = socket.connect;
socket.connect = function() {
    const token = localStorage.getItem('accessToken');
    if (token) {
        this.auth = { token };
        this.io.opts.extraHeaders = { 'accesstoken': token };
    }
    return originalConnect.call(this);
};