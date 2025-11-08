import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { productServiceAPI, inventoryServiceAPI } from '../services/api';

function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkPriceUrl, setCheckPriceUrl] = useState('');
  const [reviewUrl, setReviewUrl] = useState('');
  const [purchaseCallback, setPurchaseCallback] = useState('');

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    try {
      const response = await productServiceAPI.getProductById(id);
      setProduct(response.data);
      if (response.data.sizes && response.data.sizes.length > 0) {
        const firstSize = response.data.sizes[0];
        setSelectedSize(firstSize.size);
        setQuantity(firstSize.quantity);
        console.log('Initial size and quantity:', firstSize);
      }

      // TỰ ĐỘNG gọi check_price và fetch_review khi load product
      // Để security scanner có thể thấy SSRF parameters trong network traffic
      if (response.data.price_comparison_url) {
        console.log('Auto-checking price from:', response.data.price_comparison_url);
        autoCheckPrice(response.data.price_comparison_url);
      }
      
      if (response.data.external_review_url) {
        console.log('Auto-fetching review from:', response.data.external_review_url);
        autoFetchReview(response.data.external_review_url);
      }
    } catch (error) {
      console.error('Error loading product:', error);
    } finally {
      setLoading(false);
    }
  };

  // TỰ ĐỘNG check price khi load product (không cần user click)
  const autoCheckPrice = async (url) => {
    try {
      await productServiceAPI.checkPrice(id, url);
      console.log('Auto price check completed');
    } catch (error) {
      console.error('Auto price check failed:', error);
    }
  };

  // TỰ ĐỘNG fetch review khi load product (không cần user click)
  const autoFetchReview = async (url) => {
    try {
      await productServiceAPI.fetchReview(id, url);
      console.log('Auto review fetch completed');
    } catch (error) {
      console.error('Auto review fetch failed:', error);
    }
  };

  const handleSizeChange = async (size) => {
    setSelectedSize(size);
    
    // Get quantity from product sizes (from Product Service database)
    const sizeObj = product.sizes.find(s => s.size === size);
    if (sizeObj) {
      setQuantity(sizeObj.quantity);
      console.log(`Size ${size} quantity from product:`, sizeObj.quantity);
    } else {
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

  // REALISTIC SSRF: So sánh giá từ website khác
  const checkPrice = async () => {
    if (!checkPriceUrl) {
      alert('Vui lòng nhập URL website để so sánh giá');
      return;
    }

    try {
      const response = await productServiceAPI.checkPrice(id, checkPriceUrl);
      alert(`Giá từ website khác: ${response.data.message}`);
    } catch (error) {
      console.error('Error checking price:', error);
      alert('Không thể kiểm tra giá từ website này');
    }
  };

  // REALISTIC SSRF: Tự động lấy review từ URL
  const fetchReview = async () => {
    if (!reviewUrl) {
      alert('Vui lòng nhập URL review sản phẩm');
      return;
    }

    try {
      const response = await productServiceAPI.fetchReview(id, reviewUrl);
      alert(`Review đã được lấy thành công: ${response.data.summary}`);
    } catch (error) {
      console.error('Error fetching review:', error);
      alert('Không thể lấy review từ URL này');
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

        {/* REALISTIC SSRF FEATURES */}
        <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
          <h4>🛍️ Tính năng mua sắm thông minh</h4>
          
          {/* So sánh giá */}
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label>🔍 So sánh giá từ website khác:</label>
            <input
              type="text"
              value={checkPriceUrl}
              onChange={(e) => setCheckPriceUrl(e.target.value)}
              placeholder="https://shopee.vn/product/123 hoặc https://tiki.vn/product/456"
              style={{ width: '100%', marginRight: '10px', marginBottom: '5px' }}
            />
            <button onClick={checkPrice} className="btn btn-secondary" style={{ fontSize: '0.9rem' }}>
              So sánh giá
            </button>
            <small style={{ display: 'block', color: '#666' }}>
              Nhập URL sản phẩm tương tự từ các website khác để so sánh giá
            </small>
          </div>

          {/* Lấy review */}
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label>⭐ Lấy review từ blog/website:</label>
            <input
              type="text"
              value={reviewUrl}
              onChange={(e) => setReviewUrl(e.target.value)}
              placeholder="https://reviewsachhay.com/product-review hoặc https://blog.com/review"
              style={{ width: '100%', marginRight: '10px', marginBottom: '5px' }}
            />
            <button onClick={fetchReview} className="btn btn-secondary" style={{ fontSize: '0.9rem' }}>
              Lấy Review
            </button>
            <small style={{ display: 'block', color: '#666' }}>
              Tự động tóm tắt review từ blog/website về sản phẩm này
            </small>
          </div>
        </div>

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
