'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { Eye, EyeOff, KeyRound, Mail, User } from 'lucide-react';
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from '@/lib/utils';
import { toast } from 'react-toastify';

export default function RegisterPage() {
  const { signUp, signInWithGoogle, user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);

  useEffect(() => {
    const external = searchParams.get('external');
    if (!loading && user && !external) {
      router.push('/dashboard');
    }

    // Inicializar Google Identity Services
    if (typeof window !== 'undefined' && (window as any).google) {
      (window as any).google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
        auto_select: false,
        use_fedcm_for_prompt: false, 
        cancel_on_tap_outside: true,
      });

      // Opcional: Mostrar One-tap automaticamente
      (window as any).google.accounts.id.prompt();
    }
  }, [user, loading, router, searchParams]);

  async function handleGoogleResponse(response: any) {
    if (response.credential) {
      try {
        setRegisterLoading(true);
        await signInWithGoogle(response.credential);
      } catch (error) {
        console.error('Erro no callback do Google:', error);
      } finally {
        setRegisterLoading(false);
      }
    }
  }

  const handleGoogleClick = () => {
    if (typeof window !== 'undefined' && (window as any).google) {
      (window as any).google.accounts.id.prompt();
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();

    if (!isStrongPassword(senha)) {
      toast.error(PASSWORD_POLICY_MESSAGE);
      return;
    }

    setRegisterLoading(true);
    try {
      await signUp({ nome, email, senha });
    } catch (error) {
    } finally {
      setRegisterLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
      <div className="absolute inset-0 z-0 bg-[url('https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')] bg-cover bg-center opacity-20 filter blur-sm"></div>
      
      <div className="glass relative z-10 w-full max-w-md rounded-2xl p-8 shadow-2xl overflow-hidden mt-10 mb-10">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-2000"></div>

        <div className="relative z-20">
          <div className="mb-6 flex flex-col items-center">
            <div className="mb-4 cursor-pointer hover:scale-105 transition-transform" onClick={() => window.location.href='/landing?external=1'}>
              <Logo href="/landing?external=1" size="large" withText={false} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-800">Cadastro</h1>
            <p className="text-sm text-slate-500 mt-1">Crie sua conta de proprietário</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleGoogleClick}
              disabled={registerLoading}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-70"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continuar com Google
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-400 font-medium">ou</span>
              </div>
            </div>

            <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="block w-full rounded-xl border border-slate-300 bg-white/50 pl-10 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  placeholder="Seu nome completo"
                  required
                />
              </div>

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
                  className="block w-full rounded-xl border border-slate-300 bg-white/50 pl-10 pr-11 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  placeholder="Sua senha"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-500">{PASSWORD_POLICY_MESSAGE}</p>
            </div>

            <button
              type="submit"
              disabled={registerLoading}
              className="group relative flex w-full justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-md hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {registerLoading ? 'Cadastrando...' : 'Criar Conta'}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-600">
            Já tem uma conta?{' '}
            <Link href="/login?external=1" className="font-semibold text-blue-600 hover:text-blue-500 hover:underline transition-all">
              Fazer login
            </Link>
          </p>

          <p className="mt-4 text-center text-xs text-slate-500">
            <Link href="/landing?external=1" className="hover:text-slate-700 transition">
              ← Voltar para página inicial
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
