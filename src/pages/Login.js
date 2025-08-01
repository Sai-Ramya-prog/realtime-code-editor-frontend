import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/auth.css';
function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('https://realtime-code-editor-backend-l2ok.onrender.com/api/auth/login', form);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('username', res.data.username);
      navigate('/room'); // or /home
    } catch (err) {
      alert(err.response?.data?.error || 'Login failed');
    }
  };

  return (
  <div className="auth-container">
    <form onSubmit={handleSubmit} className="auth-form">
      <h2>Login</h2>
      <input name="email" type="email" placeholder="Email" onChange={handleChange} required />
      <input name="password" type="password" placeholder="Password" onChange={handleChange} required />
      <button type="submit">Login</button>
      <p className="auth-link">
  Don’t have an account? <a href="/register">Register</a>
</p>

    </form>
  </div>
);
}

export default Login;
