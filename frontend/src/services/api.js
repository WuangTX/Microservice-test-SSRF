import axios from 'axios';

// Use empty string to call via nginx proxy (same origin)
const API_BASE_URL = process.env.REACT_APP_API_URL || '';

// User Service API - call via nginx proxy
const userAPI = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
userAPI.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Product Service API - call via nginx proxy
const productAPI = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
productAPI.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Inventory Service API - call via nginx proxy
const inventoryAPI = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
inventoryAPI.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth API
export const authAPI = {
  login: (credentials) => userAPI.post('/auth/login', credentials),
  register: (userData) => userAPI.post('/auth/register', userData),
};

// User API
export const userServiceAPI = {
  getAllUsers: () => userAPI.get('/users'),
  getCurrentUser: () => userAPI.get('/users/me'),
  getUserById: (id) => userAPI.get(`/users/${id}`),
  updateUser: (id, userData) => userAPI.put(`/users/${id}`, userData),
  updateProfile: (userData) => userAPI.put('/users/me', userData),
  deleteUser: (id) => userAPI.delete(`/users/delete/${id}`),
  uploadAvatar: (id, data) => userAPI.post(`/users/${id}/avatar`, data),
  uploadAvatarFile: (formData) => userAPI.post(`/users/me/avatar/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

// Product API
export const productServiceAPI = {
  getProducts: () => productAPI.get('/products/'),
  getProductDetail: (id) => productAPI.get(`/products/${id}/`),
  getAllProducts: () => productAPI.get('/products/'),
  getProductById: (id) => productAPI.get(`/products/${id}/`),
  createProduct: (productData) => productAPI.post('/products/', productData),
  updateProduct: (id, productData) => productAPI.put(`/products/${id}/`, productData),
  deleteProduct: (id) => productAPI.delete(`/products/${id}/`),
  
  // REALISTIC SSRF ENDPOINTS
  checkPrice: (productId, compareUrl) => 
    productAPI.post(`/products/${productId}/check_price/`, { compare_url: compareUrl }),
  fetchReview: (productId, reviewUrl) => 
    productAPI.post(`/products/${productId}/fetch_review/`, { review_url: reviewUrl }),
  
  // NEW E-COMMERCE SSRF ENDPOINTS
  trackShipment: (trackingUrl) => 
    productAPI.post('/shipping/track/', { tracking_url: trackingUrl }),
  verifySupplier: (productId, supplierUrl) => 
    productAPI.post('/products/verify-supplier/', { product_id: productId, supplier_url: supplierUrl }),
  checkWarranty: (productId, warrantyUrl) => 
    productAPI.post('/warranty/check/', { product_id: productId, warranty_url: warrantyUrl }),
  loadProductImage: (productId, imageUrl) => 
    productAPI.post('/products/load-image/', { product_id: productId, image_url: imageUrl }),
  notifyRestock: (productId, notificationEndpoint) => 
    productAPI.post('/products/notify-restock/', { product_id: productId, notification_endpoint: notificationEndpoint }),
};

// Inventory API (VULNERABLE TO SSRF)
export const inventoryServiceAPI = {
  getInventory: (productId, size) => {
    return inventoryAPI.get(`/inventory/${productId}/${size}`);
  },
  getAllInventory: (productId) => inventoryAPI.get(`/inventory/${productId}`),
  updateInventory: (productId, size, quantity) => 
    inventoryAPI.put(`/inventory/${productId}/${size}`, { quantity }),
  // SSRF vulnerable purchase endpoint
  purchase: (purchaseData) => inventoryAPI.post('/inventory/purchase', purchaseData),
};

// Order Service API - call via nginx proxy
const orderAPI = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
orderAPI.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Order API
export const orderServiceAPI = {
  createOrder: (orderData) => orderAPI.post('/orders', orderData),
  getOrders: (userId) => orderAPI.get('/orders', { params: { user_id: userId } }),
  getOrderById: (orderId) => orderAPI.get(`/orders/${orderId}`),
  updateOrderStatus: (orderId, status) => orderAPI.patch(`/orders/${orderId}`, { status }),
  cancelOrder: (orderId) => orderAPI.delete(`/orders/${orderId}`),
};

export default {
  authAPI,
  userServiceAPI,
  productServiceAPI,
  inventoryServiceAPI,
  orderServiceAPI,
};
