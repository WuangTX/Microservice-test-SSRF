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
  getUserById: (id) => userAPI.get(`/users/${id}`),
  updateUser: (id, userData) => userAPI.put(`/users/${id}`, userData),
  deleteUser: (id) => userAPI.delete(`/users/delete/${id}`),
};

// Product API
export const productServiceAPI = {
  getAllProducts: () => productAPI.get('/products/'),
  getProductById: (id) => productAPI.get(`/products/${id}/`),
  createProduct: (productData) => productAPI.post('/products/', productData),
  updateProduct: (id, productData) => productAPI.put(`/products/${id}/`, productData),
  deleteProduct: (id) => productAPI.delete(`/products/${id}/`),
};

// Inventory API (VULNERABLE TO SSRF)
export const inventoryServiceAPI = {
  getInventory: (productId, size, callbackUrl = null) => {
    const params = callbackUrl ? { callback_url: callbackUrl } : {};
    return inventoryAPI.get(`/inventory/${productId}/${size}`, { params });
  },
  getAllInventory: (productId) => inventoryAPI.get(`/inventory/${productId}`),
  updateInventory: (productId, size, quantity) => 
    inventoryAPI.put(`/inventory/${productId}/${size}`, { quantity }),
};

export default {
  authAPI,
  userServiceAPI,
  productServiceAPI,
  inventoryServiceAPI,
};
