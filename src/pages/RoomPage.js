// client/src/pages/RoomPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { nanoid } from 'nanoid';
import '../styles/Home.css'; // Make sure this is your global CSS file

const RoomPage = () => {
  const navigate = useNavigate();
  const username = localStorage.getItem('username');
  const [showJoin, setShowJoin] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState('');
  const [createdRoomId, setCreatedRoomId] = useState('');

  const handleCreateRoom = async () => {
  const id = nanoid(6);

  try {
    const res = await fetch('https://realtime-code-editor-backend-l2ok.onrender.com/api/rooms/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: id })
    });

    if (!res.ok) throw new Error('Room creation failed');

    setCreatedRoomId(id);
    setShowCreate(true);
  } catch (err) {
    alert('Failed to create room. Try again.');
    console.error(err);
  }
};


  const handleJoinRoom = () => {
    if (joinRoomId.trim() !== '') {
      navigate(`/editor/${joinRoomId}`, { state: { username } });
    }
  };

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(createdRoomId);
    alert('Room ID copied to clipboard!');
  };

  return (
    <div className="home-wrapper">
      <div className="card">
        <h2>Real-time Collaborative Coding</h2>
        <button className="home-button" onClick={() => { setShowJoin(true); setShowCreate(false); }}>Join Room</button>
        <button className="home-button" onClick={() => { handleCreateRoom(); setShowJoin(false); }}>Create Room</button>
      </div>

      {showJoin && (
        <div className="card">
          <h3>Join a Room</h3>
          <input
            type="text"
            className="home-input"
            placeholder="Room ID"
            value={joinRoomId}
            onChange={(e) => setJoinRoomId(e.target.value)}
          />
          <button className="home-button" onClick={handleJoinRoom}>Join</button>
        </div>
      )}

      {showCreate && (
        <div className="card">
          <h3>Create a Room</h3>
          <div style={{ marginBottom: '10px' }}>
            <strong>{createdRoomId}</strong>
            <button className="home-button" onClick={handleCopyRoomId} style={{ marginTop: '10px' }}>Copy</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomPage;
