'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { Eye, EyeOff, KeyRound, Mail, User } from 'lucide-react';
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from '@/lib/utils';
import { toast } from 'react-toastify';

export default function RegisterContent() {
  const { signUp, signInWithGoogle, user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);

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

      // 1. Inicializar apenas uma vez globalmente
      if (!googleInitStarted.current) {
        console.log('Google Auth (Register) - Initializing Global GIS...');
        google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleResponse,
          auto_select: false,
          use_fedcm_for_prompt: false, 
          cancel_on_tap_outside: true,
        });
        googleInitStarted.current = true;
      }

      // 2. Renderizar o botão sempre que o componente montar/re-renderizar o efeito
      const buttonDiv = document.getElementById('google-register-button');
      if (buttonDiv) {
        console.log('Google Auth (Register) - Rendering button...');
        google.accounts.id.renderButton(buttonDiv, { 
          theme: 'filled_blue', 
          size: 'large', 
          width: buttonDiv.offsetWidth || 350,
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left'
        });
      }
      
      // 3. Prompt (One Tap) - Desativado para evitar conflitos no mobile
      /*
      if (!user) {
        try {
          google.accounts.id.prompt();
        } catch (e) {
          console.warn('Google One Tap prompt failed (Register):', e);
        }
      }
      */
      return true;
    };

    // Tentar inicializar/renderizar
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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 overflow-hidden">
      {/* Dynamic Background with improved depth */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')] bg-cover bg-center brightness-[0.9] grayscale-[0.2]"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 via-transparent to-blue-900/40 backdrop-blur-[2px]"></div>
      </div>
      
      <div className="glass relative z-10 w-full max-w-md rounded-2xl p-5 shadow-2xl overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
        
        <div className="relative z-20">
          <div className="mb-4 flex flex-col items-center">
            <div className="mb-2 transform hover:scale-105 transition-transform duration-300">
              <Logo href="/landing?external=1" size="medium" withText={false} />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 text-center">Criar Conta</h1>
            <p className="text-[11px] font-bold text-slate-600 mt-1 bg-slate-100/80 px-2 py-0.5 rounded-full uppercase">SaaS Completo</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-3">
            <div className="flex flex-col gap-1.5">
              <div id="google-register-button" className="w-full h-[44px] flex justify-center"></div>
              <p className="text-[9px] text-center text-slate-600 uppercase tracking-widest font-black">ou use e-mail</p>
            </div>

            <div className="space-y-2">
              <div className="group relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <User className="h-4 w-4 text-slate-500 group-focus-within:text-blue-600 transition-colors" />
                </div>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-white/70 pl-10 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-500 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                  placeholder="Nome completo"
                  required
                />
              </div>

              <div className="group relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-4 w-4 text-slate-500 group-focus-within:text-blue-600 transition-colors" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-white/70 pl-10 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-500 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                  placeholder="Seu e-mail profissional"
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
                  placeholder="Sua senha secreta"
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
              <p className="text-[11px] text-slate-600 pl-1 font-bold">{PASSWORD_POLICY_MESSAGE}</p>
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={registerLoading}
                className="group relative flex w-full justify-center rounded-xl bg-gradient-to-tr from-slate-900 via-indigo-900 to-blue-900 px-4 py-3 text-sm font-bold text-white shadow-xl hover:shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-700 to-blue-700 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                {registerLoading ? (
                  <span className="relative z-10 flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processando...
                  </span>
                ) : <span className="relative z-10">Criar minha conta</span>}
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
              <span>Já tem uma conta?</span>
              <Link href="/login?external=1" className="font-bold text-blue-700 hover:text-blue-800 transition-all underline decoration-blue-200 underline-offset-2">
                Fazer Login
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
    </div>
  );
}
