'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { Eye, EyeOff, KeyRound, Mail } from 'lucide-react';
import { toast } from 'react-toastify';

export default function LoginContent() {
  const { signIn, signInWithGoogle, user, loading, resetPassword } = useAuth();
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

  const googleInitStarted = useRef(false);

  useEffect(() => {
    const external = searchParams.get('external');
    if (!loading && user && !external) {
      router.push('/dashboard');
      return;
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '136105438202-hcn3vukt3phsjvt07q1pvc7bc35hdotr.apps.googleusercontent.com';
    
    const initAndRender = () => {
      const google = (window as any).google;
      if (!google || !clientId) return false;

      if (!googleInitStarted.current) {
        google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleResponse,
          auto_select: false,
          use_fedcm_for_prompt: false,
          cancel_on_tap_outside: true,
        });
        googleInitStarted.current = true;
      }

      const buttonDiv = document.getElementById('google-signin-button');
      if (buttonDiv) {
        google.accounts.id.renderButton(buttonDiv, { 
          theme: 'filled_blue', 
          size: 'large', 
          width: buttonDiv.offsetWidth || 350,
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left'
        });
      }
      return true;
    };

    let interval: any;
    if (!initAndRender()) {
      interval = setInterval(() => {
        if (initAndRender()) {
          clearInterval(interval);
        }
      }, 500);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (typeof window !== 'undefined' && (window as any).google) {
        (window as any).google.accounts.id.cancel();
      }
    };
  }, [user, loading, router, searchParams]);

  async function handleGoogleResponse(response: any) {
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
  }

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
    setResetLoading(true);
    try {
      const link = await resetPassword(resetEmail);
      if (link) {
        setResetLink(link);
        toast.success('Link de recuperação gerado!');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao solicitar recuperação');
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=2075&q=80')] bg-cover bg-center brightness-[0.9] grayscale-[0.2]"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-indigo-900/40 backdrop-blur-[2px]"></div>
      </div>
      
      <div className="glass relative z-10 w-full max-w-md rounded-2xl p-5 shadow-2xl overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
 
        <div className="relative z-20">
          <div className="mb-4 flex flex-col items-center">
            <div className="mb-2 transform hover:scale-105 transition-transform duration-300">
              <Logo href="/landing?external=1" size="medium" withText={false} />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 text-center">Bem-vindo de volta</h1>
            <p className="text-[11px] font-bold text-slate-600 mt-1 bg-slate-100/80 px-2 py-0.5 rounded-full uppercase">Premium</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-3">
            <div className="flex flex-col gap-1.5">
              <div id="google-signin-button" className="w-full h-[44px] flex justify-center"></div>
              <p className="text-[9px] text-center text-slate-600 uppercase tracking-widest font-black">ou use e-mail</p>
            </div>

            <div className="space-y-2.5">
              <div className="group relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-4 w-4 text-slate-500 group-focus-within:text-blue-600 transition-colors" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-white/70 pl-10 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-500 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                  placeholder="Seu e-mail"
                  required
                />
              </div>

              <div className="group relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <KeyRound className="h-4 w-4 text-slate-500 group-focus-within:text-blue-600 transition-colors" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-white/70 pl-10 pr-10 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-500 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                  placeholder="Sua senha"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-700 transition"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                  className="text-xs font-bold text-blue-700 hover:text-blue-600 transition-all"
                >
                  Esqueci minha senha
                </button>
              </div>
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={loginLoading}
                className="group relative flex w-full justify-center rounded-xl bg-gradient-to-tr from-slate-900 via-blue-900 to-indigo-900 px-4 py-3 text-sm font-bold text-white shadow-xl hover:shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-700 to-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                {loginLoading ? (
                  <span className="relative z-10 flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Autenticando...
                  </span>
                ) : <span className="relative z-10">Entrar agora</span>}
              </button>
            </div>
            
            <div className="flex items-center justify-center gap-2">
              <div className="h-px w-4 bg-slate-300"></div>
              <span className="text-[9px] font-black uppercase tracking-tighter text-slate-500">Conexão Segura SSL</span>
              <div className="h-px w-4 bg-slate-300"></div>
            </div>
          </form>

          <div className="mt-4 pt-3 border-t border-slate-200 flex flex-col items-center">
            <div className="flex items-center gap-1.5 text-xs text-slate-700">
              <span>Não tem conta?</span>
              <Link href="/register?external=1" className="font-bold text-blue-700 hover:text-blue-800 transition-all underline decoration-blue-200 underline-offset-2">
                Começar Grátis
              </Link>
            </div>
            
            <div className="mt-3 flex items-center justify-center w-full px-2">
              <Link href="/landing?external=1" className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-all flex items-center gap-1 group">
                <span className="group-hover:-translate-x-1 transition-transform">←</span> Voltar para Home
              </Link>
            </div>
          </div>
        </div>
      </div>

      {resetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity"
            onClick={() => setResetOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-3xl bg-white/90 backdrop-blur-2xl p-8 shadow-2xl border border-white/50 space-y-6 transform transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mb-1">Segurança</p>
                <h2 className="text-2xl font-extrabold text-slate-800">Recuperar Acesso</h2>
                <p className="text-sm text-slate-500 mt-2">Enviaremos um link seguro para o seu e-mail.</p>
              </div>
              <button
                type="button"
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                onClick={() => setResetOpen(false)}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handlePasswordReset} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 ml-1">E-mail de Cadastro</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Mail className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(event) => setResetEmail(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white/50 pl-10 px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm"
                    placeholder="ex: voce@empresa.com"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-2xl font-bold shadow-lg transition-all active:scale-[0.98] disabled:opacity-70"
                >
                  {resetLoading ? 'Solicitando...' : 'Enviar Link de Redefinição'}
                </button>
                <button
                  type="button"
                  onClick={() => setResetOpen(false)}
                  className="w-full text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors"
                >
                  Voltar ao login
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
