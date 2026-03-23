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

      // Renderizar o botão oficial da Google
      (window as any).google.accounts.id.renderButton(
        document.getElementById('google-register-button'),
        { 
          theme: 'filled_blue', 
          size: 'large', 
          width: '100%',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left'
        }
      );

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
            <div id="google-register-button" className="w-full h-[44px] mb-4"></div>

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
