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

  if (API_URL) {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      console.log('Using configured API_URL:', API_URL);
    }
    return API_URL;
  }

  // No Railway em produção, se a variável sumir, tentamos derivar a URL correta do backend
  if (typeof window !== 'undefined' && window.location.hostname.includes('railway.app')) {
    const hostname = window.location.hostname;
    // Se for o domínio do Aluga Fácil, tentamos o padrão conhecido
    if (hostname.includes('alugafacil-saas')) {
      const backendUrl = `https://alugafacil-saas-backend-production.up.railway.app/api`;
      console.warn('Production fallback (AlugaFacil):', backendUrl);
      return backendUrl;
    }
    
    // Fallback genérico tentando transformar -production em -backend-production
    const guessedUrl = `https://${hostname.replace('-production', '')}-backend-production.up.railway.app/api`;
    console.warn('Production fallback (Guessed):', guessedUrl);
    return guessedUrl;
  }

  // Se não houver variável, avisamos no console
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    console.error('ERROR: NEXT_PUBLIC_API_URL is NOT defined! API calls will fail.');
  }

  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol;
    return `${protocol}//${window.location.hostname}:3333/api`;
  }
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
