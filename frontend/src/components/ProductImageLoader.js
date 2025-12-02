import React, { useState, useEffect } from 'react';
import { productServiceAPI } from '../services/api';

function ProductImageLoader() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [imageUrl, setImageUrl] = useState('');
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
      const response = await productServiceAPI.loadProductImage(selectedProduct, imageUrl);
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load image');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="product-image-loader" style={{ maxWidth: '800px', margin: '2rem auto', padding: '2rem' }}>
      <h2>🖼️ Thư viện ảnh sản phẩm</h2>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Thêm ảnh sản phẩm chất lượng cao từ CDN hoặc dịch vụ lưu trữ ảnh của bạn.
        Hỗ trợ định dạng JPG, PNG và WebP từ URL bên ngoài.
      </p>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Chọn sản phẩm:</label>
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
          <label>URL CDN hình ảnh:</label>
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://cdn.yoursite.com/products/image.jpg"
            required
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}
          />
          <small style={{ color: '#888', display: 'block', marginTop: '0.5rem' }}>
            Dán link trực tiếp tới hình ảnh sản phẩm
          </small>
        </div>
        
        <button type="submit" disabled={loading || !selectedProduct} style={{ marginTop: '1rem' }}>
          {loading ? 'Đang nhập ảnh...' : 'Nhập ảnh'}
        </button>
      </form>

      {error && (
        <div className="error" style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#fee', color: '#c33', borderRadius: '4px' }}>
          {error}
        </div>
      )}
      
      {result && (
        <div className="result" style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
          <h3 style={{ marginBottom: '1rem', color: '#28a745' }}>✓ Nhập ảnh thành công</h3>
          {result.size && <p><strong>Kích thước:</strong> {result.size}</p>}
          {result.format && <p><strong>Định dạng:</strong> {result.format}</p>}
          {result.image_data && (
            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
              <img 
                src={`data:image/jpeg;base64,${result.image_data}`} 
                alt="Product" 
                style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
              />
            </div>
          )}
          <details style={{ marginTop: '1rem' }}>
            <summary style={{ cursor: 'pointer', color: '#007bff' }}>Chi tiết kỹ thuật</summary>
            <pre style={{ marginTop: '0.5rem', fontSize: '0.85rem', overflow: 'auto' }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}

export default ProductImageLoader;
