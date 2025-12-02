import React, { useState, useEffect } from 'react';
import { productServiceAPI, orderServiceAPI } from '../services/api';

function Checkout() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [productDetail, setProductDetail] = useState(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      fetchProductDetail(selectedProduct);
    }
  }, [selectedProduct]);

  const fetchProducts = async () => {
    try {
      const response = await productServiceAPI.getProducts();
      setProducts(response.data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const fetchProductDetail = async (productId) => {
    try {
      const response = await productServiceAPI.getProductDetail(productId);
      setProductDetail(response.data);
      setSelectedSize(''); // Reset size selection
    } catch (err) {
      console.error('Error fetching product detail:', err);
    }
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    
    const userId = localStorage.getItem('userId');
    if (!userId) {
      setError('Vui lòng đăng nhập để đặt hàng');
      return;
    }

    if (!selectedProduct || !selectedSize || quantity < 1) {
      setError('Vui lòng chọn đầy đủ thông tin');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await orderServiceAPI.createOrder({
        user_id: parseInt(userId),
        product_id: parseInt(selectedProduct),
        size: selectedSize,
        quantity: parseInt(quantity)
      });

      setResult(response.data);
      
      // Reset form
      setSelectedProduct('');
      setProductDetail(null);
      setSelectedSize('');
      setQuantity(1);
      
      alert('Đặt hàng thành công! 🎉');
    } catch (err) {
      setError(err.response?.data?.error || 'Không thể đặt hàng: ' + err.message);
      console.error('Checkout error:', err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const getAvailableStock = () => {
    if (!productDetail?.inventory || !selectedSize) return null;
    return productDetail.inventory[selectedSize];
  };

  const availableStock = getAvailableStock();

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ color: '#333', marginBottom: '30px' }}>🛒 Đặt hàng</h1>

      <form onSubmit={handleCheckout} style={{
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        {/* Product Selection */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
            Chọn sản phẩm:
          </label>
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              border: '1px solid #ddd',
              borderRadius: '5px'
            }}
            required
          >
            <option value="">-- Chọn sản phẩm --</option>
            {products.map(product => (
              <option key={product.id} value={product.id}>
                {product.name} - {product.price?.toLocaleString('vi-VN')} VND
              </option>
            ))}
          </select>
        </div>

        {/* Product Detail Display */}
        {productDetail && (
          <div style={{
            padding: '20px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>{productDetail.name}</h3>
            <p style={{ margin: '5px 0', color: '#666' }}>{productDetail.description}</p>
            <p style={{ margin: '10px 0', fontSize: '20px', color: '#28a745', fontWeight: 'bold' }}>
              Giá: {productDetail.price?.toLocaleString('vi-VN')} VND
            </p>
            
            {productDetail.inventory && Object.keys(productDetail.inventory).length > 0 && (
              <div style={{ marginTop: '15px' }}>
                <strong>Tồn kho hiện tại:</strong>
                <div style={{ marginTop: '8px' }}>
                  {Object.entries(productDetail.inventory).map(([size, stock]) => (
                    <span key={size} style={{
                      display: 'inline-block',
                      margin: '5px 10px 5px 0',
                      padding: '5px 10px',
                      backgroundColor: stock > 0 ? '#d4edda' : '#f8d7da',
                      color: stock > 0 ? '#155724' : '#721c24',
                      borderRadius: '5px',
                      fontSize: '14px'
                    }}>
                      {size}: {stock}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Size Selection */}
        {productDetail && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
              Chọn size:
            </label>
            <select
              value={selectedSize}
              onChange={(e) => setSelectedSize(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                border: '1px solid #ddd',
                borderRadius: '5px'
              }}
              required
            >
              <option value="">-- Chọn size --</option>
              {productDetail.inventory && Object.entries(productDetail.inventory).map(([size, stock]) => (
                <option key={size} value={size} disabled={stock === 0}>
                  {size} {stock > 0 ? `(Còn ${stock})` : '(Hết hàng)'}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Quantity */}
        {selectedSize && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
              Số lượng:
            </label>
            <input
              type="number"
              min="1"
              max={availableStock || 999}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                border: '1px solid #ddd',
                borderRadius: '5px'
              }}
              required
            />
            {availableStock !== null && (
              <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                Số lượng có sẵn: {availableStock}
              </p>
            )}
          </div>
        )}

        {/* Total Price */}
        {productDetail && quantity > 0 && (
          <div style={{
            padding: '15px',
            backgroundColor: '#e7f3ff',
            borderRadius: '5px',
            marginBottom: '20px'
          }}>
            <h3 style={{ margin: '0', color: '#0056b3' }}>
              Tổng tiền: {(productDetail.price * quantity).toLocaleString('vi-VN')} VND
            </h3>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !selectedProduct || !selectedSize}
          style={{
            width: '100%',
            padding: '15px',
            fontSize: '18px',
            fontWeight: 'bold',
            backgroundColor: loading ? '#6c757d' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Đang xử lý...' : '🛒 Đặt hàng ngay'}
        </button>
      </form>

      {/* Error Message */}
      {error && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          borderRadius: '5px',
          border: '1px solid #f5c6cb'
        }}>
          <strong>Lỗi:</strong> {error}
        </div>
      )}

      {/* Success Result */}
      {result && result.success && (
        <div style={{
          marginTop: '20px',
          padding: '20px',
          backgroundColor: '#d4edda',
          color: '#155724',
          borderRadius: '5px',
          border: '1px solid #c3e6cb'
        }}>
          <h3 style={{ margin: '0 0 10px 0' }}>✅ {result.message}</h3>
          <details>
            <summary style={{ cursor: 'pointer', marginTop: '10px' }}>Xem chi tiết đơn hàng</summary>
            <pre style={{
              marginTop: '10px',
              padding: '10px',
              backgroundColor: 'white',
              borderRadius: '5px',
              overflow: 'auto',
              fontSize: '14px'
            }}>
              {JSON.stringify(result.order, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}

export default Checkout;
