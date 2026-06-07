const PRODUCTION_BACKEND_URL = 'https://chat-app-backend-rd95.onrender.com';
const DEVELOPMENT_BACKEND_URL = 'http://localhost:5000';

const DEFAULT_BACKEND_URL =
  process.env.NODE_ENV === 'production'
    ? PRODUCTION_BACKEND_URL
    : process.env.REACT_APP_API_URL || DEVELOPMENT_BACKEND_URL;

export const API_URL = `${DEFAULT_BACKEND_URL}/api`;
export const SOCKET_URL = DEFAULT_BACKEND_URL;
