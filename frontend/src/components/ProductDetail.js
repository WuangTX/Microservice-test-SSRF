import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { productServiceAPI, inventoryServiceAPI } from '../services/api';

function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewUrl, setReviewUrl] = useState('');

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    try {
      const response = await productServiceAPI.getProductById(id);
      setProduct(response.data);
      
      // Dùng inventory từ inventory-service (đã được merge vào response.data)
      if (response.data.inventory && Object.keys(response.data.inventory).length > 0) {
        const firstSize = Object.keys(response.data.inventory)[0];
        setSelectedSize(firstSize);
        setQuantity(response.data.inventory[firstSize]);
        console.log('Initial size and quantity from inventory:', firstSize, response.data.inventory[firstSize]);
      }

      // TỰ ĐỘNG gọi fetch_review khi load product
      // Để security scanner có thể thấy SSRF parameters trong network traffic
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
    
    // Get quantity from inventory (from Inventory Service - real-time data)
    if (product.inventory && product.inventory[size] !== undefined) {
      setQuantity(product.inventory[size]);
      console.log(`Size ${size} quantity from inventory:`, product.inventory[size]);
    } else {
      setQuantity(0);
      console.log(`Size ${size} not found in inventory`);
    }
  };

  // Purchase product
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

      {product.inventory && Object.keys(product.inventory).length > 0 && (
        <div className="size-selector">
          <h3>Select Size:</h3>
          <div className="size-buttons">
            {Object.entries(product.inventory).map(([size, stock]) => (
              <button
                key={size}
                className={`size-btn ${selectedSize === size ? 'active' : ''} ${stock === 0 ? 'out-of-stock' : ''}`}
                onClick={() => handleSizeChange(size)}
                disabled={stock === 0}
              >
                {size} ({stock})
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

      {/* REALISTIC SSRF FEATURES */}
      <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
        <h4>🛍️ Tính năng mua sắm thông minh</h4>

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

        <button 
          onClick={handlePurchase} 
          className="btn btn-primary"
          disabled={quantity === 0}
        >
           Purchase
        </button>
    </div>
  );
}

export default ProductDetail;
