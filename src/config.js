const DEFAULT_BACKEND_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://chat-app-backend-rd95.onrender.com'
    : 'http://localhost:5000';

export const API_URL = `${process.env.REACT_APP_API_URL || DEFAULT_BACKEND_URL}/api`;
export const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || DEFAULT_BACKEND_URL;
