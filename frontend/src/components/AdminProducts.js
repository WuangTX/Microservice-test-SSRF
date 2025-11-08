import React, { useState, useEffect } from 'react';
import { productServiceAPI } from '../services/api';

function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    image_url: '',
    sizes: [
      { size: 'S', quantity: 0 },
      { size: 'M', quantity: 0 },
      { size: 'L', quantity: 0 },
      { size: 'XL', quantity: 0 }
    ]
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await productServiceAPI.getAllProducts();
      setProducts(response.data);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Debug: Log form data before sending
      console.log('Form data before submit:', JSON.stringify(formData, null, 2));
      
      if (editingProduct) {
        console.log('Updating product:', editingProduct.id);
        const response = await productServiceAPI.updateProduct(editingProduct.id, formData);
        console.log('Update response:', response.data);
      } else {
        console.log('Creating new product');
        const response = await productServiceAPI.createProduct(formData);
        console.log('Create response:', response.data);
      }
      setShowForm(false);
      setEditingProduct(null);
      resetForm();
      loadProducts();
      alert('Product saved successfully!');
    } catch (error) {
      console.error('Error saving product:', error);
      console.error('Error response:', error.response?.data);
      alert('Error saving product: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleEdit = (product) => {
    console.log('Editing product:', product);
    console.log('Product sizes:', product.sizes);
    
    setEditingProduct(product);
    
    // Ensure sizes data is properly formatted
    const sizes = product.sizes && product.sizes.length > 0 
      ? product.sizes.map(s => ({
          size: s.size,
          quantity: parseInt(s.quantity) || 0  // Ensure quantity is a number
        }))
      : [
          { size: 'S', quantity: 0 },
          { size: 'M', quantity: 0 },
          { size: 'L', quantity: 0 },
          { size: 'XL', quantity: 0 }
        ];
    
    console.log('Formatted sizes for editing:', sizes);
    
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price,
      image_url: product.image_url || '',
      sizes: sizes
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        const response = await productServiceAPI.deleteProduct(id);
        console.log('Delete response:', response);
        alert('Product deleted successfully!');
        loadProducts();
      } catch (error) {
        console.error('Error deleting product:', error);
        alert('Error deleting product: ' + (error.response?.data || error.message));
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      image_url: '',
      sizes: [
        { size: 'S', quantity: 0 },
        { size: 'M', quantity: 0 },
        { size: 'L', quantity: 0 },
        { size: 'XL', quantity: 0 }
      ]
    });
  };

  const handleSizeQuantityChange = (index, value) => {
    const newSizes = [...formData.sizes];
    // Ensure quantity is always a number, not string
    const quantity = value === '' ? 0 : parseInt(value, 10);
    newSizes[index].quantity = isNaN(quantity) ? 0 : quantity;
    console.log(`Size ${newSizes[index].size} quantity changed to:`, newSizes[index].quantity);
    setFormData({ ...formData, sizes: newSizes });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Manage Products</h2>
        <button 
          className="btn btn-primary" 
          onClick={() => {
            setShowForm(true);
            setEditingProduct(null);
            resetForm();
          }}
        >
          Add New Product
        </button>
      </div>

      {showForm && (
        <div className="form-container">
          <h3>{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Name:</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Description:</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Price:</label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Image URL:</label>
              <input
                type="url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              />
            </div>
            
            <h4>Sizes & Quantities:</h4>
            {formData.sizes.map((sizeObj, index) => (
              <div key={index} className="form-group">
                <label>Size {sizeObj.size} Quantity:</label>
                <input
                  type="number"
                  value={sizeObj.quantity}
                  onChange={(e) => handleSizeQuantityChange(index, e.target.value)}
                  min="0"
                />
              </div>
            ))}

            <button type="submit" className="btn btn-primary">
              {editingProduct ? 'Update' : 'Create'}
            </button>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => {
                setShowForm(false);
                setEditingProduct(null);
                resetForm();
              }}
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      <div className="admin-table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Price</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>{product.id}</td>
                <td>{product.name}</td>
                <td>${product.price}</td>
                <td>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => handleEdit(product)}
                    style={{ marginRight: '0.5rem' }}
                  >
                    Edit
                  </button>
                  <button 
                    className="btn btn-danger" 
                    onClick={() => handleDelete(product.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminProducts;
