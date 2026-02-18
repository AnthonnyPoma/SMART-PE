import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000', // Asegúrate que este sea el puerto correcto de tu backend
});

// 👇 ESTO ES LO QUE SOLUCIONA EL ERROR 401
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token'); // Recuperamos el token del navegador
    if (token) {
      config.headers.Authorization = `Bearer ${token}`; // Lo pegamos en la cabecera
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;