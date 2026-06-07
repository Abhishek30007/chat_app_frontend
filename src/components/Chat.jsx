import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import CreateGroup from './CreateGroup';
import JoinGroup from './JoinGroup';
import RoomList from './RoomList';

const API_URL = 'http://localhost:5000/api';

function Chat({ socket, username, onLogout }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [rooms, setRooms] = useState([]);
    const [currentRoom, setCurrentRoom] = useState(null);
    const [roomParticipants, setRoomParticipants] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const [typingUser, setTypingUser] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    // Fetch user's rooms
    useEffect(() => {
        const fetchRooms = async () => {
            try {
                const response = await axios.get(`${API_URL}/rooms/user/${username}`);
                setRooms(response.data);

                // Auto-select first room if available
                if (response.data.length > 0 && !currentRoom) {
                    setCurrentRoom(response.data[0]);
                }
            } catch (error) {
                console.error('Error fetching rooms:', error);
            }
        };

        fetchRooms();
    }, [username]);

    // Join room and fetch messages when room changes
    useEffect(() => {
        if (!currentRoom || !socket) return;

        const roomId = currentRoom.id || currentRoom._id;

        // Join the room via Socket.IO
        socket.emit('join_room', { username, roomId });

        // Fetch message history for this room
        const fetchMessages = async () => {
            try {
                const response = await axios.get(`${API_URL}/messages?roomId=${roomId}`);
                setMessages(response.data);
            } catch (error) {
                console.error('Error fetching messages:', error);
            }
        };

        fetchMessages();

        // Listen for new messages in this room
        const handleReceiveMessage = (message) => {
            if (message.roomId === roomId) {
                setMessages((prev) => [...prev, message]);
            }
        };

        // Listen for participant updates
        const handleParticipantsUpdate = (data) => {
            if (data.roomId === roomId) {
                setRoomParticipants(data.participants);
            }
        };

        // Listen for typing indicators
        const handleUserTyping = (data) => {
            if (data.roomId === roomId && data.username !== username) {
                setTypingUser(data.username);
                setIsTyping(true);
            }
        };

        const handleStopTyping = (data) => {
            if (data.roomId === roomId) {
                setIsTyping(false);
                setTypingUser('');
            }
        };

        socket.on('receive_message', handleReceiveMessage);
        socket.on('room_participants_update', handleParticipantsUpdate);
        socket.on('user_typing', handleUserTyping);
        socket.on('user_stop_typing', handleStopTyping);

        return () => {
            // Leave the room when switching
            socket.emit('leave_room', { username, roomId });
            socket.off('receive_message', handleReceiveMessage);
            socket.off('room_participants_update', handleParticipantsUpdate);
            socket.off('user_typing', handleUserTyping);
            socket.off('user_stop_typing', handleStopTyping);
        };
    }, [currentRoom, socket, username]);

    useEffect(() => {
        // Scroll to bottom when new messages arrive
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = (e) => {
        e.preventDefault();

        if (newMessage.trim() && currentRoom) {
            const roomId = currentRoom.id || currentRoom._id;

            socket.emit('send_message', {
                sender: username,
                content: newMessage,
                roomId
            });

            setNewMessage('');
            socket.emit('stop_typing', { roomId });
        }
    };

    const handleTyping = (e) => {
        setNewMessage(e.target.value);

        if (!currentRoom) return;

        const roomId = currentRoom.id || currentRoom._id;

        // Emit typing event
        socket.emit('typing', { username, roomId });

        // Clear previous timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Stop typing after 1 second of inactivity
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('stop_typing', { roomId });
        }, 1000);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        if (currentRoom) {
            const roomId = currentRoom.id || currentRoom._id;
            socket.emit('leave_room', { username, roomId });
        }
        socket.disconnect();
        onLogout();
    };

    const handleGroupCreated = async (room) => {
        setRooms([room, ...rooms]);
        setCurrentRoom(room);
        setShowCreateModal(false);
    };

    const handleGroupJoined = async (room) => {
        // Refresh rooms list
        const response = await axios.get(`${API_URL}/rooms/user/${username}`);
        setRooms(response.data);
        setCurrentRoom(room);
    };

    const handleRoomSelect = (room) => {
        setCurrentRoom(room);
        setMessages([]);
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const copyInviteLink = () => {
        if (currentRoom) {
            const inviteLink = `${window.location.origin}/join/${currentRoom.inviteCode}`;
            navigator.clipboard.writeText(inviteLink);
            alert('Invite link copied to clipboard!');
        }
    };

    return (
        <div className="chat-container">
            {/* Sidebar */}
            <div className="sidebar">
                <div className="sidebar-header">
                    <h3>Chat App</h3>
                    <p>Welcome, {username}!</p>
                </div>

                <div className="group-actions">
                    <button className="btn btn-primary btn-small" onClick={() => setShowCreateModal(true)}>
                        + Create Group
                    </button>
                    <button className="btn btn-secondary btn-small" onClick={() => setShowJoinModal(true)}>
                        Join Group
                    </button>
                </div>

                <RoomList
                    rooms={rooms}
                    currentRoom={currentRoom}
                    onRoomSelect={handleRoomSelect}
                />

                <div className="online-users">
                    <h4>Participants ({roomParticipants.length})</h4>
                    {roomParticipants.map((participant, index) => (
                        <div key={index} className="user-item">
                            <div className="online-indicator"></div>
                            <span>{participant}</span>
                        </div>
                    ))}
                </div>

                <button className="logout-btn" onClick={handleLogout}>
                    Logout
                </button>
            </div>

            {/* Main Chat Area */}
            <div className="chat-main">
                {currentRoom ? (
                    <>
                        <div className="chat-header">
                            <div>
                                <h2>{currentRoom.name}</h2>
                                <p className="room-info">
                                    Invite Code: <strong>{currentRoom.inviteCode}</strong>
                                    <button className="copy-link-btn" onClick={copyInviteLink}>
                                        📋 Copy Link
                                    </button>
                                </p>
                            </div>
                        </div>

                        <div className="messages-container">
                            {messages.map((message, index) => (
                                <div
                                    key={message.id || index}
                                    className={`message ${message.sender === username ? 'own' : ''}`}
                                >
                                    <div className="message-sender">{message.sender}</div>
                                    <div className="message-content">{message.content}</div>
                                    <div className="message-time">{formatTime(message.timestamp)}</div>
                                </div>
                            ))}

                            {isTyping && typingUser !== username && (
                                <div className="typing-indicator">
                                    {typingUser} is typing...
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        <div className="message-input-container">
                            <form onSubmit={handleSendMessage} className="message-input-form">
                                <input
                                    type="text"
                                    className="message-input"
                                    value={newMessage}
                                    onChange={handleTyping}
                                    placeholder="Type a message..."
                                />
                                <button
                                    type="submit"
                                    className="send-btn"
                                    disabled={!newMessage.trim()}
                                >
                                    Send
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="no-room-selected">
                        <h2>Welcome to Chat App!</h2>
                        <p>Create a new group or join an existing one to start chatting.</p>
                    </div>
                )}
            </div>

            {/* Modals */}
            {showCreateModal && (
                <CreateGroup
                    username={username}
                    onGroupCreated={handleGroupCreated}
                    onClose={() => setShowCreateModal(false)}
                />
            )}

            {showJoinModal && (
                <JoinGroup
                    username={username}
                    onGroupJoined={handleGroupJoined}
                    onClose={() => setShowJoinModal(false)}
                />
            )}
        </div>
    );
}

export default Chat;
