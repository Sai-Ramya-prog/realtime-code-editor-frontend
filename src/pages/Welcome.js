import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/auth.css';

const Welcome = () => {
  return (
    <div className="auth-container">
      <div className="auth-form welcome-box">
        <h2>Welcome to Real-Time Code Editor</h2>
        <p className="welcome-subtext">Please choose an option:</p>
        <div className="welcome-buttons">
          <Link to="/login">
            <button className="auth-button">Login</button>
          </Link>
          <Link to="/register">
            <button className="auth-button">Sign Up</button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
