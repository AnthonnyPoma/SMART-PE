import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
});

// Interceptor de REQUEST: Inyectar token en cada petición
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de RESPONSE: Auto-logout si el backend rechaza el token (401)
api.interceptors.response.use(
  (response) => response, // Si todo OK, devolver la respuesta normal
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token expirado o inválido → limpiar sesión y redirigir al login
      const currentPath = window.location.pathname;
      if (currentPath !== '/') {
        // Solo redirigir si NO estamos ya en el login (evitar loop)
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('role');
        localStorage.removeItem('store_id');
        localStorage.removeItem('store_name');
        localStorage.removeItem('full_name');
        window.location.href = '/'; // Redirigir al login
      }
    }
    return Promise.reject(error);
  }
);

export default api;