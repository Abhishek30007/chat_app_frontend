import React from 'react';

function RoomList({ rooms, currentRoom, onRoomSelect }) {
    return (
        <div className="room-list">
            <h4>Your Groups</h4>
            {rooms.length === 0 ? (
                <p className="no-rooms">No groups yet. Create or join one!</p>
            ) : (
                rooms.map((room) => (
                    <div
                        key={room.id || room._id}
                        className={`room-item ${currentRoom?.id === room.id || currentRoom?._id === room._id ? 'active' : ''}`}
                        onClick={() => onRoomSelect(room)}
                    >
                        <div className="room-name">{room.name}</div>
                        <div className="room-participants-count">
                            {room.participants?.length || 0} members
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}

export default RoomList;
