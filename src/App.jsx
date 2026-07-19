import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import Login from './components/Login';
import ChatRoom from './components/ChatRoom';
import { SOCKET_URL } from './config';

function App() {
    const [socket, setSocket] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [username, setUsername] = useState('');

    useEffect(() => {
        // Check if user is already logged in
        const storedUsername = localStorage.getItem('username');
        const token = localStorage.getItem('token');

        if (storedUsername && token) {
            setUsername(storedUsername);
            setIsAuthenticated(true);

            // Initialize socket connection
            const newSocket = io(SOCKET_URL);
            setSocket(newSocket);

            return () => {
                newSocket.disconnect();
            };
        }
    }, []);

    const handleLogin = (user) => {
        setUsername(user);
        setIsAuthenticated(true);

        // Initialize socket connection
        const newSocket = io(SOCKET_URL);
        setSocket(newSocket);
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        setUsername('');
        if (socket) {
            socket.disconnect();
        }
        setSocket(null);
    };

    return (
        <Router>
            <div className="app">
                <Routes>
                    <Route 
                        path="/" 
                        element={
                            !isAuthenticated ? (
                                <Login onLogin={handleLogin} />
                            ) : (
                                socket && <ChatRoom socket={socket} username={username} onLogout={handleLogout} />
                            )
                        } 
                    />
                    <Route 
                        path="/room/:inviteCode" 
                        element={
                            !isAuthenticated ? (
                                <Login onLogin={handleLogin} />
                            ) : (
                                socket && <ChatRoom socket={socket} username={username} onLogout={handleLogout} />
                            )
                        } 
                    />
                    {/* Fallback route */}
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
