import axios from 'axios';

const AUTH_STORAGE_KEY = 'gestaolocacoes.auth_token';

// Tenta obter a URL da API de forma estática para o build do Next.js
const API_URL = process.env.NEXT_PUBLIC_API_URL;

const getBaseUrl = () => {
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
    const isLocal = hostname === 'localhost' || 
                    hostname === '127.0.0.1' || 
                    hostname.startsWith('192.168.') || 
                    hostname.startsWith('10.') || 
                    hostname.startsWith('172.');

    if (isLocal) {
      return `http://${hostname}:3333/api`;
    }

    // Ambiente de Produção (Railway ou Domínios Customizados)
    // Se não for localhost, tentamos usar o backend de produção conhecido.
    // Baseado no histórico, o backend costuma ser 'alugafacil-backend-production'.
    if (hostname.includes('alugafacil-saas')) {
       return 'https://alugafacil-backend-production.up.railway.app/api';
    }

    return 'https://alugafacil-backend-production.up.railway.app/api';
  }

  // Fallback para SSR
  return 'http://localhost:3333/api';
};

export const api = axios.create({
  baseURL: getBaseUrl(),
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

export { AUTH_STORAGE_KEY };
