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
      // Use ssrfUrl if provided (SSRF vulnerability demonstration)
      const callbackUrl = ssrfUrl || null;
      const response = await inventoryServiceAPI.getInventory(id, size, callbackUrl);
      setQuantity(response.data.quantity);
    } catch (error) {
      console.error('Error getting inventory:', error);
      setQuantity(0);
    }
  };

  const exploitSSRF = async () => {
    if (!ssrfUrl) {
      alert('Please enter a callback URL');
      return;
    }
    
    try {
      await inventoryServiceAPI.getInventory(id, selectedSize, ssrfUrl);
      alert('SSRF request sent! Check inventory service logs.');
    } catch (error) {
      console.error('SSRF exploit error:', error);
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

      {/* SSRF Vulnerability Demo Section */}
      <div className="ssrf-demo">
        <h4>⚠️ SSRF Vulnerability Demo</h4>
        <p>
          This section demonstrates an SSRF vulnerability. You can provide a callback URL 
          that will be fetched by the inventory service when checking stock.
        </p>
        <div className="form-group">
          <label>Callback URL (for SSRF exploit):</label>
          <input
            type="text"
            value={ssrfUrl}
            onChange={(e) => setSsrfUrl(e.target.value)}
            placeholder="e.g., http://user-service:8081/api/users/delete/1"
          />
        </div>
        <button onClick={exploitSSRF} className="btn btn-danger">
          Trigger SSRF Attack
        </button>
        
        <div style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
          <p><strong>Example exploit URLs:</strong></p>
          <code>http://user-service:8081/api/users/delete/1</code>
          <code>http://user-service:8081/api/users/delete/2</code>
          <p style={{ marginTop: '0.5rem', color: '#856404' }}>
            This will make the inventory service send a DELETE request to the user service, 
            potentially deleting a user without proper authentication!
          </p>
        </div>
      </div>
    </div>
  );
}

export default ProductDetail;
