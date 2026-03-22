'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { Eye, EyeOff, KeyRound, Mail } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'react-toastify';

export default function LoginPage() {
  const { signIn, signInWithGoogle, user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);

  useEffect(() => {
    const external = searchParams.get('external');
    if (!loading && user && !external) {
      router.push('/dashboard');
    }
  }, [user, loading, router, searchParams]);

  const handleGoogleResponse = async (response: any) => {
    if (response.credential) {
      try {
        setLoginLoading(true);
        await signInWithGoogle(response.credential);
      } catch (error) {
        console.error('Erro no callback do Google:', error);
      } finally {
        setLoginLoading(false);
      }
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).google) {
      // Hardcoded Client ID para garantir 100% de estabilidade em produção
      const clientId = '136105438202-hcn3vukt3phsjvt07q1pvc7bc35hdotr.apps.googleusercontent.com';

      (window as any).google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleResponse,
        use_fedcm_for_prompt: false,
      });

      (window as any).google.accounts.id.renderButton(
        document.getElementById('google-button-login'),
        { theme: 'filled_blue', size: 'large', width: '340', text: 'signin_with', locale: 'pt_BR' }
      );
    }
  }, [signInWithGoogle]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    try {
      await signIn({ email, senha });
    } catch (error) {
    } finally {
      setLoginLoading(false);
    }
  }

  async function handlePasswordReset(e: React.FormEvent) {
    e.preventDefault();
    if (!resetEmail) {
      toast.error('Informe seu e-mail');
      return;
    }
    setResetLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', { email: resetEmail });
      const link = response?.data?.resetLink ?? null;
      setResetLink(link);
      toast.success('Se o e-mail existir, enviaremos as instruções.');
    } catch (error) {
      toast.error('Erro ao solicitar recuperação de senha');
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
      <div className="absolute inset-0 z-0 bg-[url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=2075&q=80')] bg-cover bg-center opacity-20 filter blur-sm"></div>
      
      <div className="glass relative z-10 w-full max-w-md rounded-2xl p-8 shadow-2xl overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>

        <div className="relative z-20">
          <div className="mb-8 flex flex-col items-center">
            <div className="mb-4">
              <Logo href="/landing?external=1" size="large" withText={false} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-800">Bem-vindo</h1>
            <p className="text-sm text-slate-500 mt-1">Aluga Fácil Premium</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="flex justify-center">
              <div id="google-button-login"></div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-400 font-medium">ou</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border border-slate-300 bg-white/50 pl-10 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  placeholder="Seu e-mail"
                  required
                />
              </div>

              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <KeyRound className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="block w-full rounded-xl border border-slate-300 bg-white/50 pl-10 pr-12 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  placeholder="Sua senha"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 transition"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => {
                    setResetOpen(true);
                    setResetEmail(email);
                    setResetLink(null);
                  }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-500 hover:underline transition-all"
                >
                  Esqueci minha senha
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="group relative flex w-full justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-md hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loginLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Entrando...
                </span>
              ) : 'Entrar'}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-600">
            Ainda não tem conta?{' '}
            <Link href="/register?external=1" className="font-semibold text-blue-600 hover:text-blue-500 hover:underline transition-all">
              Criar agora
            </Link>
          </p>

          <p className="mt-4 text-center text-xs text-slate-500">
            <Link href="/landing?external=1" className="hover:text-slate-700 transition">
              ← Voltar para página inicial
            </Link>
          </p>
        </div>
      </div>

      {resetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setResetOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recuperar senha</p>
                <p className="text-lg font-semibold text-slate-800">Receber link de redefinição</p>
              </div>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600"
                onClick={() => setResetOpen(false)}
              >
                Fechar
              </button>
            </div>

            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">E-mail</label>
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(event) => setResetEmail(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  placeholder="Digite seu e-mail"
                />
              </div>



              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetOpen(false)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-xl font-semibold shadow-sm transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold shadow-sm transition-all disabled:opacity-70"
                >
                  {resetLoading ? 'Enviando...' : 'Enviar link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
