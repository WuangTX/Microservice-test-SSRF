import React, { useState, useEffect } from 'react';
import { userServiceAPI } from '../services/api';

function UserProfile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      console.log('🔍 Loading current user profile...');
      
      const response = await userServiceAPI.getCurrentUser();
      console.log('✅ Current user response:', response.data);
      
      setUser(response.data);
      setAvatarUrl(response.data.avatarUrl || '');
    } catch (error) {
      console.error('❌ Error loading profile:', error);
      console.error('Error details:', error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpdate = async (e) => {
    e.preventDefault();
    setUploading(true);
    
    try {
      let response;
      
      if (selectedFile) {
        // File upload - thực upload file từ máy tính
        console.log('🔄 Uploading file:', selectedFile.name);
        const formData = new FormData();
        formData.append('file', selectedFile);
        
        response = await userServiceAPI.uploadAvatarFile(formData);
        console.log('✅ File upload response:', response);
        
        // Update user profile with the file URL
        await userServiceAPI.updateProfile({ ...user, avatarUrl: response.data.avatarUrl });
        
      } else if (avatarUrl) {
        // URL upload - chỉ update URL vào database
        console.log('🔄 Saving avatar URL:', avatarUrl);
        await userServiceAPI.updateProfile({ ...user, avatarUrl: avatarUrl });
        
      } else {
        alert('Please select a file or enter a URL');
        return;
      }
      
      alert('Profile picture updated successfully!');
      setEditing(false);
      setSelectedFile(null);
      setAvatarUrl('');
      loadUserProfile(); // Reload to show updated avatar
    } catch (error) {
      console.error('❌ Error updating avatar:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      alert(`Failed to update profile picture: ${error.response?.data?.error || error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
    setAvatarUrl(''); // Clear URL when file is selected
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <h3>Loading profile...</h3>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <h3>❌ Profile not found</h3>
        <p>Unable to load your profile. Please try logging in again.</p>
        <button 
          onClick={() => window.location.href = '/login'}
          style={{ 
            background: '#007bff',
            color: 'white',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className="profile-container" style={{ maxWidth: '600px', margin: '2rem auto', padding: '2rem' }}>
      <h2>👤 My Profile</h2>
      
      <div className="profile-info" style={{ 
        background: '#f8f9fa', 
        padding: '2rem', 
        borderRadius: '8px',
        marginBottom: '2rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ marginRight: '2rem' }}>
            <img 
              src={user.avatarUrl || 'https://via.placeholder.com/120x120?text=No+Avatar'} 
              alt="Profile" 
              style={{ 
                width: '120px', 
                height: '120px', 
                borderRadius: '50%', 
                border: '3px solid #dee2e6',
                objectFit: 'cover'
              }}
            />
          </div>
          <div>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>{user.username}</h3>
            <p style={{ margin: '0 0 0.5rem 0', color: '#6c757d' }}>{user.email}</p>
            <span style={{ 
              background: user.role === 'ADMIN' ? '#dc3545' : '#28a745',
              color: 'white',
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              fontSize: '0.85rem'
            }}>
              {user.role}
            </span>
          </div>
        </div>
        
        <button 
          onClick={() => setEditing(!editing)}
          className="btn btn-primary"
        >
          {editing ? 'Cancel' : '✏️ Edit Profile Picture'}
        </button>
      </div>

      {editing && (
        <div className="edit-avatar" style={{ 
          background: 'white', 
          padding: '2rem', 
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <h3>Update Profile Picture</h3>
          <p style={{ color: '#6c757d', marginBottom: '1.5rem' }}>
            Upload a picture from your computer or enter an image URL.
          </p>
          
          <form onSubmit={handleAvatarUpdate}>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                📁 Upload from Computer:
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ 
                  width: '100%', 
                  padding: '0.75rem', 
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
              />
              {selectedFile && (
                <small style={{ color: '#28a745', marginTop: '0.5rem', display: 'block' }}>
                  ✅ Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </small>
              )}
            </div>

            <div style={{ textAlign: 'center', margin: '1rem 0', color: '#6c757d' }}>
              — OR —
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                🔗 Image URL:
              </label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/my-avatar.jpg"
                style={{ 
                  width: '100%', 
                  padding: '0.75rem', 
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
              />
              <small style={{ color: '#6c757d', marginTop: '0.5rem', display: 'block' }}>
                📝 You can use image URLs from social media, cloud storage, or any image hosting service.
              </small>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={uploading || (!selectedFile && !avatarUrl.trim())}
                style={{ 
                  background: uploading ? '#6c757d' : '#007bff',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '4px',
                  color: 'white',
                  cursor: uploading ? 'not-allowed' : 'pointer'
                }}
              >
                {uploading ? '⏳ Updating...' : '✅ Update Picture'}
              </button>
              
              <button 
                type="button" 
                onClick={() => setEditing(false)}
                className="btn btn-secondary"
                style={{ 
                  background: '#6c757d',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '4px',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default UserProfile;