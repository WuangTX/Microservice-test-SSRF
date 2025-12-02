import React, { useState, useEffect } from 'react';
import { productServiceAPI } from '../services/api';

function RestockNotification() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [notificationEndpoint, setNotificationEndpoint] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await productServiceAPI.getAllProducts();
      setProducts(response.data);
    } catch (err) {
      console.error('Failed to load products', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await productServiceAPI.notifyRestock(selectedProduct, notificationEndpoint);
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send notification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="restock-notification" style={{ maxWidth: '800px', margin: '2rem auto', padding: '2rem' }}>
      <h2>🔔 Thông báo nhập hàng</h2>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Nhận thông báo ngay lập tức khi sản phẩm hết hàng có sẵn trở lại.
        Kết nối dịch vụ thông báo của bạn để nhận cảnh báo nhập hàng theo thời gian thực.
      </p>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Chọn sản phẩm theo dõi:</label>
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            required
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}
          >
            <option value="">-- Chọn sản phẩm --</option>
            {products.map(product => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ marginTop: '1.5rem' }}>
          <label>Webhook dịch vụ thông báo:</label>
          <input
            type="text"
            value={notificationEndpoint}
            onChange={(e) => setNotificationEndpoint(e.target.value)}
            placeholder="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
            required
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}
          />
          <small style={{ color: '#888', display: 'block', marginTop: '0.5rem' }}>
            Hỗ trợ Slack, Discord, Microsoft Teams hoặc webhook tùy chỉnh
          </small>
        </div>
        
        <button type="submit" disabled={loading || !selectedProduct} style={{ marginTop: '1rem' }}>
          {loading ? 'Đang đăng ký...' : 'Đăng ký nhận thông báo'}
        </button>
      </form>

      {error && (
        <div className="error" style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#fee', color: '#c33', borderRadius: '4px' }}>
          {error}
        </div>
      )}
      
      {result && (
        <div className="result" style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
          <h3 style={{ marginBottom: '1rem', color: '#28a745' }}>✓ Đã kích hoạt đăng ký thông báo</h3>
          {result.subscription_id && <p><strong>Mã đăng ký:</strong> {result.subscription_id}</p>}
          {result.product_name && <p><strong>Đang theo dõi:</strong> {result.product_name}</p>}
          {result.webhook && <p><strong>Webhook:</strong> {result.webhook}</p>}
          <p style={{ marginTop: '1rem', color: '#666' }}>
            Bạn sẽ nhận được thông báo khi sản phẩm này có hàng trở lại.
          </p>
          <details style={{ marginTop: '1rem' }}>
            <summary style={{ cursor: 'pointer', color: '#007bff' }}>Xem chi tiết đăng ký</summary>
            <pre style={{ marginTop: '0.5rem', fontSize: '0.85rem', overflow: 'auto' }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}

export default RestockNotification;
