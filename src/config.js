const PRODUCTION_BACKEND_URL = 'https://chat-app-backend-rd95.onrender.com';
const DEVELOPMENT_BACKEND_URL = 'http://localhost:5000';

const isBrowser = typeof window !== 'undefined';
const isHostedPage = isBrowser && !/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
const configuredBackendUrl = process.env.REACT_APP_API_URL || process.env.REACT_APP_SOCKET_URL;

const DEFAULT_BACKEND_URL =
  isHostedPage || process.env.NODE_ENV === 'production'
    ? PRODUCTION_BACKEND_URL
    : configuredBackendUrl || DEVELOPMENT_BACKEND_URL;

export const API_URL = `${DEFAULT_BACKEND_URL}/api`;
export const SOCKET_URL = DEFAULT_BACKEND_URL;
