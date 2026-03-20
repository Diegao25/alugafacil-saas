import axios from 'axios';
import Cookies from 'js-cookie';

const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== 'undefined') {
    return `http://${window.location.hostname}:3333/api`;
  }
  return 'http://localhost:3333/api';
};

export const api = axios.create({
  baseURL: getBaseUrl(),
});

api.interceptors.request.use((config) => {
  const token = Cookies.get('gestaolocacoes.token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para capturar trial expirado
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403 && error.response?.data?.code === 'TRIAL_EXPIRED') {
      // Notificar o sistema que o trial expirou para atualizar o estado global
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('trial-expired'));
      }
    }
    return Promise.reject(error);
  }
);
