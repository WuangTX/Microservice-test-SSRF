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
import Checkout from './components/Checkout';
import OrderHistory from './components/OrderHistory';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    const role = localStorage.getItem('role');
    if (token && username && role) {
      setUser({ token, username, role });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserMenu && !event.target.closest('.user-menu')) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    setUser(null);
    setShowUserMenu(false);
  };

  // Show loading while checking authentication
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <h2>Loading...</h2>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        <nav className="navbar">
          <h1>🛍️ Microservice Shop</h1>
          <div>
            <Link to="/">Sản phẩm</Link>
            <Link to="/checkout">Đặt hàng</Link>
            <Link to="/orders">Đơn hàng của tôi</Link>
            {user && user.role === 'ADMIN' && (
              <>
                <Link to="/admin/products">Quản lý sản phẩm</Link>
                <Link to="/admin/users">Quản lý người dùng</Link>
              </>
            )}
            {!user ? (
              <>
                <Link to="/login">Đăng nhập</Link>
                <Link to="/register">Đăng ký</Link>
              </>
            ) : (
              <div className="user-menu">
                <button 
                  className="user-menu-trigger"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                >
                  👤 {user.username} ▼
                </button>
                <div className={`user-menu-dropdown ${showUserMenu ? 'show' : ''}`}>
                  <Link to="/profile" onClick={() => setShowUserMenu(false)}>
                    👤 Thông tin cá nhân
                  </Link>
                  <button onClick={handleLogout}>
                    🚪 Đăng xuất
                  </button>
                </div>
              </div>
            )}
          </div>
        </nav>

        <div className="container">
          <Routes>
            <Route path="/" element={<ProductList />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/checkout" element={user ? <Checkout /> : <Navigate to="/login" />} />
            <Route path="/orders" element={user ? <OrderHistory /> : <Navigate to="/login" />} />
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
