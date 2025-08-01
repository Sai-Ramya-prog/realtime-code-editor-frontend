// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import EditorPage from './pages/EditorPage';
import Welcome from './pages/Welcome';
import RoomPage from './pages/RoomPage'; // ✅ This was missing

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/room" element={<RoomPage />} />
          <Route path="/editor/:roomId" element={<EditorPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
