'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { api, AUTH_STORAGE_KEY } from '@/lib/api';
import { toast } from 'react-toastify';

interface User {
  id: string;
  nome: string;
  email: string;
  cpf_cnpj?: string;
  telefone?: string;
  endereco?: string;
  is_admin?: boolean;
  can_manage_users?: boolean;
  owner_user_id?: string | null;
  plan_type: string;
  trial_end_date?: string;
  subscription_status: string;
  terms_pending?: boolean;
  current_terms_version?: string | null;
  accepted_terms_version?: string | null;
  has_seen_tour: boolean;
  plan_name?: string;
  subscription_date?: string;
  subscription_amount?: number;
  payment_method?: string;
  cancellation_date?: string | null;
  access_until?: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  plansEnabled: boolean;
  signIn: (data: any) => Promise<void>;
  signInWithGoogle: (credential: string) => Promise<void>;
  signOut: (redirectTo?: string) => void; // redirectTo defaults to /dashboard
  signUp: (data: any) => Promise<void>;
  syncUser: () => Promise<void>;
  resetPassword: (email: string) => Promise<any>;
}

const AuthContext = createContext({} as AuthContextType);

// @ts-ignore
export function AuthProvider({ children }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [plansEnabled, setPlansEnabled] = useState(true); // Default as true to follow dev behavior
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userStr = window.localStorage.getItem('gestaolocacoes.user') || Cookies.get('gestaolocacoes.user');
      if (userStr) {
        try {
          setUser(JSON.parse(userStr));
        } catch (e) {
          console.warn('Erro ao decodificar usuÃ¡rio local:', e);
        }
      }
    }
    void syncUser().finally(() => setLoading(false));
    void checkPlansEnabled();

    // Listener para o evento de trial expirado
    const handleTrialExpired = () => {
      if (typeof window !== 'undefined') {
        const currentUserStr = window.localStorage.getItem('gestaolocacoes.user') || Cookies.get('gestaolocacoes.user');
        if (currentUserStr) {
          try {
            const currentUser = JSON.parse(currentUserStr);
            const updatedUser = { ...currentUser, subscription_status: 'trial_expired' };
            setUser(updatedUser);
            Cookies.set('gestaolocacoes.user', JSON.stringify(updatedUser), { expires: 7 });
            window.localStorage.setItem('gestaolocacoes.user', JSON.stringify(updatedUser));
          } catch (e) {
            console.warn('Erro ao atualizar trial no local:', e);
          }
        }
      }
    };

    window.addEventListener('trial-expired', handleTrialExpired);
    return () => window.removeEventListener('trial-expired', handleTrialExpired);
  }, []);

  async function signIn({ email, senha }: any) {
    try {
      const response = await api.post('/auth/login', { email, senha });
      const { user: userData, token } = response.data;

      handleAuthSuccess(userData, token);
      router.push('/dashboard');
      toast.success('Login realizado com sucesso!');
    } catch (error: any) {
      const message =
        error?.response?.data?.error ||
        (error?.message?.includes('Network') ? 'Servidor indisponível.' : null) ||
        'Erro ao realizar login';
      toast.error(message);
      console.error('Erro ao realizar login', error);
      throw error;
    }
  }

  async function signInWithGoogle(credential: string) {
    try {
      setLoading(true); // Garante que o estado de loading apareça
      const response = await api.post('/auth/google', { credential });
      const { user: userData, token } = response.data;

      handleAuthSuccess(userData, token);
      router.push('/dashboard');
      toast.success('Login com Google realizado com sucesso!');
    } catch (error: any) {
      const message = error?.response?.data?.error || 
                      (error?.message?.includes('Network Error') ? 'O servidor não confiou na conexão. Tente novamente em instantes.' : 'Erro na autenticação com Google');
      
      toast.error(message);
      console.error('Erro no Google Login (Detalhamento):', {
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message,
        url: error?.config?.url
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }

  function handleAuthSuccess(userData: User, token?: string) {
    if (typeof window !== 'undefined') {
      if (token) {
        window.localStorage.setItem(AUTH_STORAGE_KEY, token);
      } else {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }

    Cookies.set('gestaolocacoes.user', JSON.stringify(userData), { expires: 7 });
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('gestaolocacoes.user', JSON.stringify(userData));
    }
    setUser(userData);
  }

  async function signUp({ nome, email, senha }: any) {
    try {
      await api.post('/auth/register', { nome, email, senha });
      toast.success('Conta criada com sucesso! Verifique seu e-mail e depois faça login.');
      router.push('/login?external=1');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao criar conta');
      throw error;
    }
  }

  function signOut(redirectTo = '/login?external=1') {
    void api.post('/auth/logout').catch((e) => {
      console.warn('Auth - logout request failed (can be ignored):', e.message);
    });
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      window.localStorage.removeItem('gestaolocacoes.user');
    }
    Cookies.remove('gestaolocacoes.user');
    setUser(null);
    router.push(redirectTo);
  }

  async function syncUser() {
    try {
      const response = await api.get('/auth/me');
      const userData = response.data;
      
      setUser(userData);
      Cookies.set('gestaolocacoes.user', JSON.stringify(userData), { expires: 7 });
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('gestaolocacoes.user', JSON.stringify(userData));
      }
    } catch (error: any) {
      console.warn('Auth - syncUser failed:', error.message);
      
      // Apenas desloga se for um erro de autenticaÃ§Ã£o explÃ­cito (401)
      if (error?.response?.status === 401) {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(AUTH_STORAGE_KEY);
          window.localStorage.removeItem('gestaolocacoes.user');
        }
        Cookies.remove('gestaolocacoes.user');
        setUser(null);
      }
      // Se for erro de rede (CORS ou offline), mantemos o estado atual do usuÃ¡rio
      // para evitar que o usuÃ¡rio seja deslogado enquanto a conexÃ£o oscila.
    }
  }

  async function resetPassword(email: string) {
    try {
      const response = await api.post('/auth/forgot-password', { email });
      return response.data.link || response.data.message;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Erro ao solicitar recuperação');
    }
  }

  async function checkPlansEnabled() {
    try {
      const response = await api.get('/public/config');
      if (response.data && typeof response.data.isPlansEnabled === 'boolean') {
        setPlansEnabled(response.data.isPlansEnabled);
      }
    } catch (e) {
      console.warn('Auth - checkPlansEnabled failed:', (e as Error).message);
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, plansEnabled, signIn, signInWithGoogle, signOut, signUp, syncUser, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
