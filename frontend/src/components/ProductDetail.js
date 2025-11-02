import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { productServiceAPI, inventoryServiceAPI } from '../services/api';

function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ssrfUrl, setSsrfUrl] = useState('');
  const [purchaseCallback, setPurchaseCallback] = useState('');

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    try {
      const response = await productServiceAPI.getProductById(id);
      setProduct(response.data);
      if (response.data.sizes && response.data.sizes.length > 0) {
        setSelectedSize(response.data.sizes[0].size);
      }
    } catch (error) {
      console.error('Error loading product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSizeChange = async (size) => {
    setSelectedSize(size);
    setQuantity(null);
    
    // Call inventory service to get quantity
    try {
      const response = await inventoryServiceAPI.getInventory(id, size);
      setQuantity(response.data.quantity);
    } catch (error) {
      console.error('Error getting inventory:', error);
      setQuantity(0);
    }
  };

  // Purchase with webhook callback
  const handlePurchase = async () => {
    if (!selectedSize) {
      alert('Please select a size');
      return;
    }

    try {
      const purchaseData = {
        product_id: parseInt(id),
        size: selectedSize,
        quantity: 1
      };

      // Add webhook callback URL if provided
      if (purchaseCallback) {
        purchaseData.callback_url = purchaseCallback;
      }

      console.log('Purchase request:', purchaseData);
      const response = await inventoryServiceAPI.purchase(purchaseData);
      console.log('Purchase response:', response.data);
      alert(`Purchase successful! New quantity: ${response.data.new_quantity}`);
      setQuantity(response.data.new_quantity);
    } catch (error) {
      console.error('Purchase error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      alert(`Purchase failed: ${error.response?.data?.error || error.message}`);
    }
  };

  if (loading) {
    return <div>Loading product...</div>;
  }

  if (!product) {
    return <div>Product not found</div>;
  }

  return (
    <div className="product-detail">
      <img 
        src={product.image_url || 'https://via.placeholder.com/800x400?text=No+Image'} 
        alt={product.name} 
      />
      <h2>{product.name}</h2>
      <p>{product.description}</p>
      <p className="price">${product.price}</p>

      {product.sizes && product.sizes.length > 0 && (
        <div className="size-selector">
          <h3>Select Size:</h3>
          <div className="size-buttons">
            {product.sizes.map((sizeObj) => (
              <button
                key={sizeObj.size}
                className={`size-btn ${selectedSize === sizeObj.size ? 'active' : ''}`}
                onClick={() => handleSizeChange(sizeObj.size)}
              >
                {sizeObj.size}
              </button>
            ))}
          </div>
          
          {quantity !== null && (
            <div className="quantity-info">
              <strong>Available Quantity:</strong> {quantity} items
              {quantity === 0 && <p style={{ color: 'red' }}>Out of stock</p>}
            </div>
          )}
        </div>
      )}

      {/* Webhook Notification Feature */}
      <div className="webhook-feature">
        <h4>� Webhook Notification</h4>
        <p>
          Nhập URL webhook của bạn để nhận thông báo về thay đổi tồn kho.
          Sau khi mua hàng, hệ thống sẽ tự động gửi thông tin cập nhật đến URL bạn cung cấp.
        </p>

        <div className="form-group">
          <label>Webhook URL (Optional):</label>
          <input
            type="text"
            value={purchaseCallback}
            onChange={(e) => setPurchaseCallback(e.target.value)}
            placeholder="https://your-domain.com/api/webhook/inventory-update"
          />
          <small style={{ display: 'block', marginTop: '0.3rem', color: '#666' }}>
            💡 Ví dụ: <code>https://webhook.site/your-unique-id</code>
          </small>
          <small style={{ display: 'block', marginTop: '0.2rem', color: '#666' }}>
            Server sẽ gửi GET request đến URL này với thông tin cập nhật tồn kho
          </small>
        </div>

        <button 
          onClick={handlePurchase} 
          className="btn btn-primary"
          disabled={quantity === 0}
        >
          {purchaseCallback ? '🔔 Purchase with Notification' : '🛒 Purchase'}
        </button>
        
        <div style={{ marginTop: '1rem', fontSize: '0.85rem', background: '#e7f3ff', padding: '0.8rem', borderRadius: '4px', border: '1px solid #b3d9ff' }}>
          <p style={{ margin: '0 0 0.5rem 0', fontWeight: '500' }}>
            ℹ️ <strong>Cách sử dụng Webhook:</strong>
          </p>
          <ol style={{ margin: '0.3rem 0', paddingLeft: '1.5rem' }}>
            <li>Tạo endpoint webhook trên server của bạn</li>
            <li>Nhập URL webhook vào ô bên trên</li>
            <li>Khi mua hàng, bạn sẽ nhận POST request với thông tin tồn kho</li>
          </ol>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#0066cc' }}>
            🧪 Test webhook: Sử dụng <a href="https://webhook.site" target="_blank" rel="noopener noreferrer">webhook.site</a> để xem request
          </p>
        </div>
      </div>
    </div>
  );
}

export default ProductDetail;
