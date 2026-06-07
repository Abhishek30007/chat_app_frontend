import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Login from './components/Login';
import Chat from './components/Chat';
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
        setSocket(null);
    };

    return (
        <div className="app">
            {!isAuthenticated ? (
                <Login onLogin={handleLogin} />
            ) : (
                socket && <Chat socket={socket} username={username} onLogout={handleLogout} />
            )}
        </div>
    );
}

export default App;
