import React, { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config';

function JoinGroup({ username, onGroupJoined, onClose }) {
    const [inviteCode, setInviteCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleJoin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await axios.post(`${API_URL}/rooms/join`, {
                inviteCode: inviteCode.trim(),
                username
            });

            onGroupJoined(response.data.room);
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to join group');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h3>Join Group Chat</h3>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleJoin} className="join-group-form">
                    <div className="form-group">
                        <label>Invite Code</label>
                        <input
                            type="text"
                            value={inviteCode}
                            onChange={(e) => setInviteCode(e.target.value)}
                            placeholder="Enter invite code"
                            required
                        />
                    </div>

                    <div className="modal-buttons">
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Joining...' : 'Join Group'}
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default JoinGroup;
