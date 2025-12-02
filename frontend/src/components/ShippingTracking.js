import React, { useState } from 'react';
import { productServiceAPI } from '../services/api';

function ShippingTracking() {
  const [trackingUrl, setTrackingUrl] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await productServiceAPI.trackShipment(trackingUrl);
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to retrieve tracking information. Please check your tracking link and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="shipping-tracking" style={{ maxWidth: '800px', margin: '2rem auto', padding: '2rem' }}>
      <h2>📦 Tra cứu đơn hàng</h2>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Nhập link theo dõi từ đơn vị vận chuyển để cập nhật trạng thái đơn hàng theo thời gian thực.
        Hỗ trợ theo dõi từ FedEx, UPS, DHL, USPS và các đơn vị vận chuyển lớn khác.
      </p>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Link theo dõi vận chuyển:</label>
          <input
            type="text"
            value={trackingUrl}
            onChange={(e) => setTrackingUrl(e.target.value)}
            placeholder="Ví dụ: https://www.fedex.com/tracking?tracknumber=123456"
            required
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}
          />
          <small style={{ color: '#888', display: 'block', marginTop: '0.5rem' }}>
            Dán đầy đủ URL theo dõi từ website đơn vị vận chuyển
          </small>
        </div>
        
        <button type="submit" disabled={loading} style={{ marginTop: '1rem' }}>
          {loading ? 'Đang kiểm tra...' : 'Tra cứu'}
        </button>
      </form>

      {error && (
        <div className="error" style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#fee', color: '#c33', borderRadius: '4px' }}>
          {error}
        </div>
      )}
      
      {result && (
        <div className="result" style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
          <h3 style={{ marginBottom: '1rem', color: '#28a745' }}>✓ Đã lấy thông tin vận chuyển</h3>
          {result.status && <p><strong>Trạng thái:</strong> {result.status}</p>}
          {result.location && <p><strong>Vị trí hiện tại:</strong> {result.location}</p>}
          {result.estimated_delivery && <p><strong>Dự kiến giao hàng:</strong> {result.estimated_delivery}</p>}
          <details style={{ marginTop: '1rem' }}>
            <summary style={{ cursor: 'pointer', color: '#007bff' }}>Xem dữ liệu chi tiết</summary>
            <pre style={{ marginTop: '0.5rem', fontSize: '0.85rem', overflow: 'auto' }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}

export default ShippingTracking;
