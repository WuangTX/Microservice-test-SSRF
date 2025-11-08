import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

function Register({ setUser }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const registerData = { 
        username, 
        password, 
        email, 
        role: 'USER'
      };
      
      const response = await authAPI.register(registerData);
      const { token, username: user, role } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('username', user);
      localStorage.setItem('role', role);
      
      setUser({ token, username: user, role });
      navigate('/');
    } catch (err) {
      setError('Registration failed. Username or email may already exist.');
    }
  };

  return (
    <div className="form-container">
      <h2>Register</h2>
      {error && <div className="alert alert-error">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Username:</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="example@company.com"
          />
          <small style={{ color: '#666', fontSize: '0.85rem' }}>
            💡 Tip: Server sẽ tự động validate email domain
          </small>
        </div>
        <div className="form-group">
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        
        <button type="submit" className="btn btn-primary">Register</button>
      </form>
      
      {/* Hidden hint for pentesters */}
      <div style={{ marginTop: '2rem', background: '#f8f9fa', padding: '1rem', borderRadius: '5px', fontSize: '0.85rem' }}>
        <h4>🔍 Security Testing Hint:</h4>
        <p>Server automatically validates email domains by making HTTP requests to:</p>
        <code>http://[email-domain]/api/email/validate</code>
        <p>Try registering with emails like:</p>
        <ul>
          <li><code>admin@192.168.1.1</code> - Internal network scan</li>
          <li><code>admin@localhost:8080</code> - Local service access</li>
          <li><code>admin@169.254.169.254</code> - Cloud metadata</li>
        </ul>
      </div>
    </div>
  );
}

export default Register;
