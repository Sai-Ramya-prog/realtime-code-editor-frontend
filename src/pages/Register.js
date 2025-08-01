// src/pages/Register.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import '../styles/auth.css';

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState(''); // ✅ added
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('https://realtime-code-editor-backend-l2ok.onrender.com/api/auth/register', {
        username,
        email, // ✅ added
        password,
      });
      const { token } = res.data;
      login(token, username);
      navigate('/');
    } catch (err) {
      alert('Registration failed: ' + (err.response?.data?.error || err.message));
    }
  };

 return (
  <div className="auth-container">
    <form onSubmit={handleRegister} className="auth-form">
      <h2>Register</h2>
      <input
        type="text"
        placeholder="Username"
        value={username}
        required
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        required
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        required
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit">Register</button>
      <p className="auth-link">
  Already have an account? <a href="/login">Login</a>
</p>

    </form>
  </div>
);
};

export default Register;
