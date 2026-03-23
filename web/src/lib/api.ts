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
    
    // Ambiente Local
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `http://localhost:3333/api`;
    }

    // Último recurso: Se estivermos no Railway, usamos o endpoint que sabemos que está ativo
    if (hostname.includes('railway.app')) {
      return 'https://easygoing-backend-production.up.railway.app/api';
    }

    // Em produção fora do railway ou se o hostname for desconhecido
    // Nunca usamos a porta 3333 fora do localhost 
    return `${window.location.protocol}//${hostname}/api`;
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
