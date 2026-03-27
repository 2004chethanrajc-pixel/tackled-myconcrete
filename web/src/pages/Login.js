import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

const Login = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionConflict, setSessionConflict] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const circles = document.querySelectorAll('.floating-circle');
    circles.forEach((circle, index) => {
      circle.style.animationDelay = `${index * 0.5}s`;
    });
  }, []);

  const doLogin = async (forceLogout = false) => {
    setError('');
    setLoading(true);
    try {
      await login(identifier, password, forceLogout);
      navigate('/');
    } catch (err) {
      const status = err.response?.status;
      const errorMessage = err.response?.data?.message || err.message || 'Login failed';
      const errors = err.response?.data?.errors;

      if (status === 409) {
        setSessionConflict(true);
        setError(errorMessage);
      } else if (errors && errors.length > 0) {
        setSessionConflict(false);
        setError(errors.join(', '));
      } else {
        setSessionConflict(false);
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSessionConflict(false);
    doLogin(false);
  };

  const handleForceLogin = () => {
    doLogin(true);
  };

  return (
    <div className="login-container">
      <div className="floating-circle circle-large circle-blue" style={{ top: '-100px', left: '-80px' }}></div>
      <div className="floating-circle circle-large circle-blue" style={{ bottom: '-120px', right: '-100px' }}></div>
      <div className="floating-circle circle-small circle-red" style={{ bottom: '10px', left: '0' }}></div>
      <div className="floating-circle circle-small circle-red" style={{ top: '20%', right: '-30px' }}></div>

      <div className="login-content">
        <div className="logo-container">
          <img src="/logo.png" alt="MyConcrete Logo" className="logo" />
        </div>

        <div className="login-form-card">
          <form onSubmit={handleSubmit} className="login-form">
            {error && (
              <div className="error-message" style={{ marginBottom: sessionConflict ? '8px' : undefined }}>
                {error}
              </div>
            )}

            {sessionConflict && (
              <button
                type="button"
                className="login-btn"
                onClick={handleForceLogin}
                disabled={loading}
                style={{ marginBottom: '12px', background: 'linear-gradient(135deg, #D97706, #F59E0B)' }}
              >
                {loading ? <span className="spinner"></span> : '⚠️ End Other Sessions & Login'}
              </button>
            )}

            <div className="form-group">
              <input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e) => { setIdentifier(e.target.value); setSessionConflict(false); }}
                placeholder="Email or Phone Number"
                required
                disabled={loading}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setSessionConflict(false); }}
                placeholder="Password"
                required
                disabled={loading}
                className="form-input"
              />
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? <span className="spinner"></span> : 'Login'}
            </button>

            <div className="forgot-password">
              <a href="/forgot-password">Forgot Password?</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
