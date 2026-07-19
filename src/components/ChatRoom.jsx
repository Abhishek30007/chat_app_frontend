import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import CreateGroup from './CreateGroup';
import JoinGroup from './JoinGroup';
import RoomList from './RoomList';
import { API_URL } from '../config';

function ParticipantItem({ participant }) {
    const [city, setCity] = useState('');
    const { username, location } = participant;

    useEffect(() => {
        if (location && location.latitude && location.longitude) {
            const fetchCity = async () => {
                try {
                    const response = await axios.get(
                        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${location.latitude}&longitude=${location.longitude}&localityLanguage=en`
                    );
                    const cityName = response.data.city || response.data.locality || response.data.principalSubdivision;
                    if (cityName) {
                        setCity(cityName);
                    } else {
                        setCity(`${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}`);
                    }
                } catch (error) {
                    console.error('Error reverse geocoding location:', error);
                    setCity(`${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}`);
                }
            };
            fetchCity();
        }
    }, [location]);

    return (
        <div className="user-item">
            <div className="online-indicator"></div>
            <span>{username}</span>
            {location && (
                <span className="user-location" style={{ fontSize: '0.8rem', color: '#888', marginLeft: '5px' }}>
                    📍 {city || 'Locating...'}
                </span>
            )}
        </div>
    );
}

function ChatRoom({ socket, username, onLogout }) {
    const { inviteCode } = useParams();
    const navigate = useNavigate();

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

    // Fetch user's rooms and handle URL direct joining
    useEffect(() => {
        const fetchRooms = async () => {
            try {
                const response = await axios.get(`${API_URL}/rooms/user/${username}`);
                setRooms(response.data);

                // Auto-select room based on URL inviteCode, or default to first room
                if (inviteCode) {
                    const existingRoom = response.data.find(r => r.inviteCode === inviteCode);
                    if (existingRoom) {
                        setCurrentRoom(existingRoom);
                    } else {
                        // Join the room if not already a participant
                        try {
                            const joinResponse = await axios.post(`${API_URL}/rooms/join`, {
                                inviteCode: inviteCode.trim(),
                                username
                            });
                            const joinedRoom = joinResponse.data.room;
                            // Re-fetch all rooms to make sure we have the correct, single list from database
                            const roomsRes = await axios.get(`${API_URL}/rooms/user/${username}`);
                            setRooms(roomsRes.data);
                            setCurrentRoom(joinedRoom);
                        } catch (err) {
                            console.error('Failed to join room from URL', err);
                            // Fallback to first room if joining failed
                            if (response.data.length > 0) {
                                const fallbackRoom = response.data[0];
                                setCurrentRoom(fallbackRoom);
                                navigate(`/room/${fallbackRoom.inviteCode}`, { replace: true });
                            }
                        }
                    }
                } else if (response.data.length > 0 && !currentRoom) {
                    // No invite code in URL, auto-select first room
                    const firstRoom = response.data[0];
                    setCurrentRoom(firstRoom);
                    navigate(`/room/${firstRoom.inviteCode}`, { replace: true });
                }
            } catch (error) {
                console.error('Error fetching rooms:', error);
            }
        };

        fetchRooms();
    }, [username, inviteCode, navigate]);

    // Join room and fetch messages when room changes
    useEffect(() => {
        if (!currentRoom || !socket) return;

        const roomId = currentRoom.id || currentRoom._id;
        const roomInviteCode = currentRoom.inviteCode;

        // Helper to perform the socket room joining
        const joinSocketRoom = (location) => {
            socket.emit('join_room', { 
                username, 
                inviteCode: roomInviteCode, 
                location 
            });

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
        };

        // Geolocation setup before emitting join_room
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const location = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    };
                    joinSocketRoom(location);
                },
                (error) => {
                    console.error('Geolocation access error or denied:', error);
                    joinSocketRoom(null);
                },
                { timeout: 5000 }
            );
        } else {
            console.error('Geolocation is not supported by this browser.');
            joinSocketRoom(null);
        }

        // Listen for new messages in this room
        const handleReceiveMessage = (message) => {
            if (message.inviteCode === roomInviteCode || message.roomId === roomId) {
                setMessages((prev) => [...prev, message]);
            }
        };

        // Listen for participant updates
        const handleParticipantsUpdate = (data) => {
            if (data.roomId === roomInviteCode) {
                setRoomParticipants(data.participants);
            }
        };

        // Listen for typing indicators
        const handleUserTyping = (data) => {
            if (data.roomId === roomInviteCode && data.username !== username) {
                setTypingUser(data.username);
                setIsTyping(true);
            }
        };

        const handleStopTyping = (data) => {
            if (data.roomId === roomInviteCode) {
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
            socket.emit('leave_room', { username, inviteCode: roomInviteCode });
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
            const roomInviteCode = currentRoom.inviteCode;

            socket.emit('send_message', {
                sender: username,
                content: newMessage,
                roomId,
                inviteCode: roomInviteCode
            });

            setNewMessage('');
            socket.emit('stop_typing', { inviteCode: roomInviteCode });
        }
    };

    const handleTyping = (e) => {
        setNewMessage(e.target.value);

        if (!currentRoom) return;

        const roomInviteCode = currentRoom.inviteCode;

        // Emit typing event
        socket.emit('typing', { username, inviteCode: roomInviteCode });

        // Clear previous timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Stop typing after 1 second of inactivity
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('stop_typing', { inviteCode: roomInviteCode });
        }, 1000);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        if (currentRoom) {
            const roomInviteCode = currentRoom.inviteCode;
            socket.emit('leave_room', { username, inviteCode: roomInviteCode });
        }
        socket.disconnect();
        onLogout();
        navigate('/');
    };

    const handleGroupCreated = async (room) => {
        setCurrentRoom(room);
        setShowCreateModal(false);
        navigate(`/room/${room.inviteCode}`);
    };

    const handleGroupJoined = async (room) => {
        setCurrentRoom(room);
        setShowJoinModal(false);
        navigate(`/room/${room.inviteCode}`);
    };

    const handleRoomSelect = (room) => {
        setCurrentRoom(room);
        setMessages([]);
        navigate(`/room/${room.inviteCode}`);
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
            const inviteLink = `${window.location.origin}/room/${currentRoom.inviteCode}`;
            navigator.clipboard.writeText(inviteLink);
            alert('Invite link copied to clipboard!');
        }
    };

    return (
        <div className="chat-container">
            {/* Sidebar */}
            <div className="sidebar">
                <div className="sidebar-header">
                    <h3>Chatting karoo ...</h3>
                    <h4>BAAT kro kya hee kaam hai zindagi me </h4>
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
                        <ParticipantItem 
                            key={participant.username || index} 
                            participant={participant} 
                        />
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

export default ChatRoom;
