import axios from 'axios';

const AUTH_STORAGE_KEY = 'gestaolocacoes.auth_token';

// Tenta obter a URL da API de forma estática para o build do Next.js
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const getApiBaseUrl = () => {
  // Debug para saber se a variável está chegando ao cliente
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
     console.log('--- API Config ---');
     console.log('NEXT_PUBLIC_API_URL (baked):', API_URL);
  }

  // PRIORIDADE 1: Variável de ambiente (Ideal para produção)
  // Se a variável estiver definida e NÃO for o próprio domínio do site (evita loop/404)
  if (API_URL && typeof window !== 'undefined' && !API_URL.includes(window.location.hostname)) {
    return API_URL.replace(/\/+$/, '');
  }

  // FALLBACK SEGURO PARA CLIENT-SIDE
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Ambiente Local (IPs Privados e Localhost)
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
      return `http://localhost:3333/api`;
    }

    // Ambiente de Produção (Railway Oficial)
    return 'https://easygoing-backend-production.up.railway.app/api';
  }

  // Fallback para SSR
  return 'http://localhost:3333/api';
};

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = window.localStorage.getItem(AUTH_STORAGE_KEY);

    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

// Interceptor para capturar erros globais (Trial expirado, Manutenção, etc)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 1. Capturar Trial Expirado
    if (error.response?.status === 403 && error.response?.data?.code === 'TRIAL_EXPIRED') {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('trial-expired'));
      }
    }

    // 2. Capturar Modo de Manutenção (503)
    if (error.response?.status === 503 && error.response?.data?.error === 'maintenance') {
      if (typeof window !== 'undefined' && window.location.pathname !== '/maintenance') {
        window.location.href = '/maintenance';
      }
    }

    return Promise.reject(error);
  }
);

export { AUTH_STORAGE_KEY };
