import React, { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config';

function CreateGroup({ username, onGroupCreated, onClose }) {
    const [groupName, setGroupName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [createdRoom, setCreatedRoom] = useState(null);

    const handleCreate = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await axios.post(`${API_URL}/rooms/create`, {
                name: groupName,
                creator: username
            });

            setCreatedRoom(response.data.room);
            onGroupCreated(response.data.room);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create group');
        } finally {
            setLoading(false);
        }
    };

    const copyInviteLink = () => {
        const inviteLink = `${window.location.origin}/join/${createdRoom.inviteCode}`;
        navigator.clipboard.writeText(inviteLink);
        alert('Invite link copied to clipboard!');
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h3>Create Group Chat</h3>

                {!createdRoom ? (
                    <>
                        {error && <div className="error-message">{error}</div>}

                        <form onSubmit={handleCreate} className="create-group-form">
                            <div className="form-group">
                                <label>Group Name</label>
                                <input
                                    type="text"
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                    placeholder="Enter group name"
                                    required
                                />
                            </div>

                            <div className="modal-buttons">
                                <button type="submit" className="btn btn-primary" disabled={loading}>
                                    {loading ? 'Creating...' : 'Create Group'}
                                </button>
                                <button type="button" className="btn btn-secondary" onClick={onClose}>
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="invite-link-container">
                        <p className="success-message">Group "{createdRoom.name}" created successfully!</p>

                        <div className="invite-link-box">
                            <label>Share this invite link:</label>
                            <div className="invite-link-display">
                                <input
                                    type="text"
                                    value={`${window.location.origin}/join/${createdRoom.inviteCode}`}
                                    readOnly
                                />
                                <button className="btn btn-primary" onClick={copyInviteLink}>
                                    Copy
                                </button>
                            </div>
                            <p className="invite-code-text">
                                Or share invite code: <strong>{createdRoom.inviteCode}</strong>
                            </p>
                        </div>

                        <button className="btn btn-primary" onClick={onClose}>
                            Done
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default CreateGroup;
