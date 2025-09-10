import { io } from "socket.io-client";

const URL = process.env.NODE_ENV === 'production' ? undefined : 'localhost/';

export const socket = io(URL, {
    autoConnect: false 
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