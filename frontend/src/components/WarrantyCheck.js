import React, { useState, useEffect } from 'react';
import { productServiceAPI } from '../services/api';

function WarrantyCheck() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [warrantyUrl, setWarrantyUrl] = useState('');
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
      const response = await productServiceAPI.checkWarranty(selectedProduct, warrantyUrl);
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to check warranty');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="warranty-check" style={{ maxWidth: '800px', margin: '2rem auto', padding: '2rem' }}>
      <h2>🛡️ Tra cứu bảo hành</h2>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Kiểm tra tình trạng bảo hành và chi tiết bảo hành sản phẩm trực tiếp với nhà sản xuất.
        Nhận thông tin về thời hạn bảo hành, điều khoản bảo hành và các tùy chọn dịch vụ.
      </p>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Chọn sản phẩm của bạn:</label>
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
          <label>Cổng bảo hành nhà sản xuất:</label>
          <input
            type="text"
            value={warrantyUrl}
            onChange={(e) => setWarrantyUrl(e.target.value)}
            placeholder="https://warranty.manufacturer.com/check"
            required
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}
          />
          <small style={{ color: '#888', display: 'block', marginTop: '0.5rem' }}>
            Nhập link tra cứu bảo hành từ nhà sản xuất
          </small>
        </div>
        
        <button type="submit" disabled={loading || !selectedProduct} style={{ marginTop: '1rem' }}>
          {loading ? 'Đang kiểm tra...' : 'Kiểm tra bảo hành'}
        </button>
      </form>

      {error && (
        <div className="error" style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#fee', color: '#c33', borderRadius: '4px' }}>
          {error}
        </div>
      )}
      
      {result && (
        <div className="result" style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
          <h3 style={{ marginBottom: '1rem', color: '#28a745' }}>✓ Thông tin bảo hành</h3>
          {result.status && <p><strong>Tình trạng:</strong> {result.status}</p>}
          {result.expiry_date && <p><strong>Hết hạn:</strong> {result.expiry_date}</p>}
          {result.coverage_type && <p><strong>Loại bảo hành:</strong> {result.coverage_type}</p>}
          {result.support_contact && <p><strong>Liên hệ hỗ trợ:</strong> {result.support_contact}</p>}
          <details style={{ marginTop: '1rem' }}>
            <summary style={{ cursor: 'pointer', color: '#007bff' }}>Xem đầy đủ chi tiết</summary>
            <pre style={{ marginTop: '0.5rem', fontSize: '0.85rem', overflow: 'auto' }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}

export default WarrantyCheck;
