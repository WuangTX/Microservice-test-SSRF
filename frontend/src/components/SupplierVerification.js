import React, { useState, useEffect } from 'react';
import { productServiceAPI } from '../services/api';

function SupplierVerification() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [supplierUrl, setSupplierUrl] = useState('');
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
      const response = await productServiceAPI.verifySupplier(selectedProduct, supplierUrl);
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to verify supplier');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="supplier-verification" style={{ maxWidth: '800px', margin: '2rem auto', padding: '2rem' }}>
      <h2>🏭 Kiểm tra sản phẩm chính hãng</h2>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Xác minh sản phẩm của bạn là hàng chính hãng bằng cách kiểm tra với mạng lưới nhà cung cấp ủy quyền.
        Đảm bảo bạn nhận được hàng hóa xác thực từ nguồn đã được xác minh.
      </p>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Chọn sản phẩm cần xác minh:</label>
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
          <label>Cổng xác minh nhà cung cấp:</label>
          <input
            type="text"
            value={supplierUrl}
            onChange={(e) => setSupplierUrl(e.target.value)}
            placeholder="https://verify.authorized-supplier.com/api/check"
            required
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}
          />
          <small style={{ color: '#888', display: 'block', marginTop: '0.5rem' }}>
            Nhập link xác minh do nhà cung cấp cung cấp
          </small>
        </div>
        
        <button type="submit" disabled={loading || !selectedProduct} style={{ marginTop: '1rem' }}>
          {loading ? 'Đang xác minh...' : 'Xác minh sản phẩm'}
        </button>
      </form>

      {error && (
        <div className="error" style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#fee', color: '#c33', borderRadius: '4px' }}>
          {error}
        </div>
      )}
      
      {result && (
        <div className="result" style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
          <h3 style={{ marginBottom: '1rem', color: '#28a745' }}>✓ Hoàn tất xác minh</h3>
          {result.authentic !== undefined && (
            <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
              <strong>Trạng thái:</strong> {result.authentic ? '✓ Sản phẩm chính hãng' : '⚠ Không thể xác minh'}
            </p>
          )}
          {result.supplier_name && <p><strong>Nhà cung cấp ủy quyền:</strong> {result.supplier_name}</p>}
          {result.verified_date && <p><strong>Ngày xác minh:</strong> {result.verified_date}</p>}
          <details style={{ marginTop: '1rem' }}>
            <summary style={{ cursor: 'pointer', color: '#007bff' }}>Xem chi tiết</summary>
            <pre style={{ marginTop: '0.5rem', fontSize: '0.85rem', overflow: 'auto' }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}

export default SupplierVerification;
