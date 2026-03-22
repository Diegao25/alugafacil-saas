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
  is_admin?: boolean;
  can_manage_users?: boolean;
  owner_user_id?: string | null;
  plan_type: string;
  trial_end_date?: string;
  subscription_status: string;
  terms_pending?: boolean;
  current_terms_version?: string | null;
  accepted_terms_version?: string | null;
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
  signIn: (data: any) => Promise<void>;
  signOut: (redirectTo?: string) => void; // redirectTo defaults to /dashboard
  signUp: (data: any) => Promise<void>;
  syncUser: () => Promise<void>;
}

const AuthContext = createContext({} as AuthContextType);

// @ts-ignore
export function AuthProvider({ children }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const userStr = Cookies.get('gestaolocacoes.user');

    if (userStr) {
      setUser(JSON.parse(userStr));
    }
    void syncUser().finally(() => setLoading(false));

    // Listener para o evento de trial expirado
    const handleTrialExpired = () => {
      const currentUserStr = Cookies.get('gestaolocacoes.user');
      if (currentUserStr) {
        const currentUser = JSON.parse(currentUserStr);
        const updatedUser = { ...currentUser, subscription_status: 'trial_expired' };
        setUser(updatedUser);
        Cookies.set('gestaolocacoes.user', JSON.stringify(updatedUser), { expires: 7 });
      }
    };

    window.addEventListener('trial-expired', handleTrialExpired);
    return () => window.removeEventListener('trial-expired', handleTrialExpired);
  }, []);

  async function signIn({ email, senha }: any) {
    try {
      const response = await api.post('/auth/login', { email, senha });
      const { user: userData, token } = response.data;

      if (typeof window !== 'undefined') {
        if (token) {
          // Fallback for mobile/Safari when cross-site cookies are restricted.
          window.localStorage.setItem(AUTH_STORAGE_KEY, token);
        } else {
          window.localStorage.removeItem(AUTH_STORAGE_KEY);
        }
      }

      Cookies.set('gestaolocacoes.user', JSON.stringify(userData), { expires: 7 });

      setUser(userData);
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

  function signOut(redirectTo = '/dashboard') {
    void api.post('/auth/logout').catch(() => {
      // The UI should still log out locally even if the network request fails.
    });
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
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
    } catch (error) {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
      }
      Cookies.remove('gestaolocacoes.user');
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, signUp, syncUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
