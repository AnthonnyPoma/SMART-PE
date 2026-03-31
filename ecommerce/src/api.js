import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${API_URL}/shop`,
});

export const getCategories = async () => {
  const response = await api.get('/categories');
  return response.data;
};

export const getProducts = async (params = {}) => {
  const response = await api.get('/products', { params });
  return response.data;
};

export const getProductDetail = async (id) => {
  const response = await api.get(`/products/${id}`);
  return response.data;
};

export const submitCheckout = async (checkoutData) => {
  const response = await api.post('/checkout', checkoutData);
  return response.data;
};

export default api;
