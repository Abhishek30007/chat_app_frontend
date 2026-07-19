import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import './index.css';
import App from './App';
import { API_URL } from './config';

// Add a request interceptor to automatically add authorization header if token exists
axios.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token && config.url && config.url.startsWith(API_URL)) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
