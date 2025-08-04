import { io } from "socket.io-client";

const URL = process.env.NODE_ENV === 'production' ? undefined : 'http://localhost/';

export const socket = io({
    autoConnect: false 
});