import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import ProductList from './components/ProductList';
import ProductDetail from './components/ProductDetail';
import AdminProducts from './components/AdminProducts';
import AdminUsers from './components/AdminUsers';
import UserProfile from './components/UserProfile';
import NotFound from './components/NotFound';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    const role = localStorage.getItem('role');
    if (token && username && role) {
      setUser({ token, username, role });
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    setUser(null);
  };

  return (
    <Router>
      <div className="App">
        <nav className="navbar">
          <h1>🛍️ Microservice Shop</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {user && <span>Welcome, {user.username}!</span>}
            <Link to="/">Products</Link>
            {user && (
              <Link to="/profile">My Profile</Link>
            )}
            {user && user.role === 'ADMIN' && (
              <>
                <Link to="/admin/products">Manage Products</Link>
                <Link to="/admin/users">Manage Users</Link>
              </>
            )}
            {!user ? (
              <>
                <Link to="/login">Login</Link>
                <Link to="/register">Register</Link>
              </>
            ) : (
              <button onClick={handleLogout}>Logout</button>
            )}
          </div>
        </nav>

        <div className="container">
          <Routes>
            <Route path="/" element={<ProductList />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/login" element={<Login setUser={setUser} />} />
            <Route path="/register" element={<Register setUser={setUser} />} />
            <Route 
              path="/profile" 
              element={user ? <UserProfile /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/admin/products" 
              element={user && user.role === 'ADMIN' ? <AdminProducts /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/admin/users" 
              element={user && user.role === 'ADMIN' ? <AdminUsers /> : <Navigate to="/login" />} 
            />
            {/* Catch-all route for 404 pages */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
