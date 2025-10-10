import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { productServiceAPI } from '../services/api';

function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await productServiceAPI.getAllProducts();
      setProducts(response.data);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading products...</div>;
  }

  return (
    <div>
      <h2>Products</h2>
      <div className="product-grid">
        {products.map((product) => (
          <div 
            key={product.id} 
            className="product-card"
            onClick={() => navigate(`/product/${product.id}`)}
          >
            <img 
              src={product.image_url || 'https://via.placeholder.com/300x200?text=No+Image'} 
              alt={product.name} 
            />
            <h3>{product.name}</h3>
            <p>{product.description.substring(0, 100)}...</p>
            <p className="price">${product.price}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProductList;
