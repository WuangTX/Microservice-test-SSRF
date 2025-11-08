import React, { useState, useEffect } from 'react';
import { userServiceAPI } from '../services/api';

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showAvatarForm, setShowAvatarForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'USER'
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await userServiceAPI.getAllUsers();
      setUsers(response.data);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      role: user.role
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await userServiceAPI.updateUser(editingUser.id, formData);
      }
      setShowForm(false);
      setEditingUser(null);
      resetForm();
      loadUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Error saving user');
    }
  };

  const handleAvatarUpload = async (e) => {
    e.preventDefault();
    try {
      const response = await userServiceAPI.uploadAvatar(selectedUser.id, { image_url: avatarUrl });
      console.log('Avatar upload response:', response.data);
      alert('Avatar uploaded successfully!');
      setShowAvatarForm(false);
      setAvatarUrl('');
      loadUsers();
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Error uploading avatar: ' + (error.response?.data?.error || error.message));
    }
  };

  const showAvatarUpload = (user) => {
    setSelectedUser(user);
    setAvatarUrl('');
    setShowAvatarForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await userServiceAPI.deleteUser(id);
        loadUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      role: 'USER'
    });
  };

  return (
    <div>
      <h2>Manage Users</h2>

      {showForm && (
        <div className="form-container">
          <h3>Edit User</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username:</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Email:</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Password (leave empty to keep current):</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Role:</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary">Update</button>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => {
                setShowForm(false);
                setEditingUser(null);
                resetForm();
              }}
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* Avatar Upload Form */}
      {showAvatarForm && (
        <div className="form-container">
          <h3>Upload Avatar for {selectedUser?.username}</h3>
          
          <form onSubmit={handleAvatarUpload}>
            <div className="form-group">
              <label>Image URL:</label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                required
              />
              <small style={{ display: 'block', marginTop: '0.5rem', color: '#666' }}>
                💀 Try: http://localhost:8080/admin, http://192.168.1.1:8080, http://169.254.169.254/latest/meta-data/
              </small>
            </div>

            <button type="submit" className="btn btn-primary">Upload Avatar</button>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => {
                setShowAvatarForm(false);
                setAvatarUrl('');
                setSelectedUser(null);
              }}
              style={{ marginLeft: '0.5rem' }}
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      <div className="admin-table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.username}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => handleEdit(user)}
                    style={{ marginRight: '0.5rem' }}
                  >
                    Edit
                  </button>
                  <button 
                    className="btn btn-warning" 
                    onClick={() => showAvatarUpload(user)}
                    style={{ marginRight: '0.5rem' }}
                  >
                    📷 Avatar
                  </button>
                  <button 
                    className="btn btn-danger" 
                    onClick={() => handleDelete(user.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ssrf-demo" style={{ marginTop: '2rem' }}>
        <h4>⚠️ SSRF Vulnerability Info</h4>
        <p>
          The delete user endpoint is vulnerable to SSRF attacks. You can exploit this from the 
          product detail page by using a callback URL like:
        </p>
        <code>http://user-service:8081/api/users/delete/{'{user_id}'}</code>
        <p style={{ marginTop: '0.5rem' }}>
          When checking inventory on the product detail page, the inventory service will make 
          a request to this URL, effectively deleting the user without proper authentication!
        </p>
      </div>
    </div>
  );
}

export default AdminUsers;
