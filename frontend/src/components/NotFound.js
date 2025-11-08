import React from 'react';
import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <div style={{ 
      textAlign: 'center', 
      padding: '4rem 2rem',
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <div style={{ maxWidth: '600px' }}>
        <h1 style={{ 
          fontSize: '6rem', 
          color: '#dc3545', 
          marginBottom: '1rem',
          fontWeight: 'bold'
        }}>
          404
        </h1>
        
        <h2 style={{ 
          fontSize: '2rem', 
          color: '#343a40', 
          marginBottom: '1rem' 
        }}>
          Trang không tìm thấy
        </h2>
        
        <p style={{ 
          fontSize: '1.2rem', 
          color: '#6c757d', 
          marginBottom: '2rem',
          lineHeight: '1.6'
        }}>
          Xin lỗi, trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
        </p>
        
        <div style={{ marginBottom: '2rem' }}>
          <Link 
            to="/" 
            style={{
              backgroundColor: '#007bff',
              color: 'white',
              padding: '12px 24px',
              textDecoration: 'none',
              borderRadius: '5px',
              fontSize: '1.1rem',
              marginRight: '1rem',
              display: 'inline-block'
            }}
          >
            🏠 Về trang chủ
          </Link>
          
          <button 
            onClick={() => window.history.back()}
            style={{
              backgroundColor: '#6c757d',
              color: 'white',
              padding: '12px 24px',
              border: 'none',
              borderRadius: '5px',
              fontSize: '1.1rem',
              cursor: 'pointer'
            }}
          >
            ↩️ Quay lại
          </button>
        </div>
        
        <div style={{ 
          background: '#f8f9fa', 
          padding: '1.5rem', 
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <h4 style={{ marginBottom: '1rem', color: '#495057' }}>
            🔍 Gợi ý:
          </h4>
          <ul style={{ 
            textAlign: 'left', 
            color: '#6c757d',
            lineHeight: '1.8',
            marginBottom: '0'
          }}>
            <li>Kiểm tra lại URL bạn đã nhập</li>
            <li>Thử tìm kiếm sản phẩm từ trang chủ</li>
            <li>Liên hệ hỗ trợ nếu bạn cho rằng đây là lỗi</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default NotFound;