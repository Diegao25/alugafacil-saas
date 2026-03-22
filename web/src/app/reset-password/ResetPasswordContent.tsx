'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { toast } from 'react-toastify';
import Logo from '@/components/Logo';
import { Eye, EyeOff, KeyRound, CheckCircle2 } from 'lucide-react';
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from '@/lib/utils';

export default function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    
    if (!token) {
      toast.error('Token inválido ou expirado.');
      return;
    }

    if (!isStrongPassword(senha)) {
      toast.error(PASSWORD_POLICY_MESSAGE);
      return;
    }

    if (senha !== confirmarSenha) {
      toast.error('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, senha });
      setSuccess(true);
      toast.success('Senha redefinida com sucesso!');
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao redefinir senha.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
        <div className="glass relative z-10 w-full max-w-md rounded-2xl p-8 shadow-2xl text-center space-y-6">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Senha Alterada!</h2>
          <p className="text-slate-600">Sua senha foi redefinida com sucesso. Você será redirecionado para o login em instantes.</p>
          <button
            onClick={() => router.push('/login')}
            className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white shadow-md hover:bg-blue-700 transition-all"
          >
            Ir para o Login agora
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
      <div className="absolute inset-0 z-0 bg-[url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=2075&q=80')] bg-cover bg-center opacity-20 filter blur-sm"></div>
      
      <div className="glass relative z-10 w-full max-w-md rounded-2xl p-8 shadow-2xl overflow-hidden">
        <div className="relative z-20">
          <div className="mb-8 flex flex-col items-center">
            <div className="mb-4">
              <Logo href="/" size="large" withText={false} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800">Nova Senha</h1>
            <p className="text-sm text-slate-500 mt-1">Crie uma senha segura para sua conta</p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-6">
            <div className="space-y-4">
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <KeyRound className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="block w-full rounded-xl border border-slate-300 bg-white/50 pl-10 pr-12 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  placeholder="Nova senha"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p className="text-xs text-slate-500">{PASSWORD_POLICY_MESSAGE}</p>

              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <KeyRound className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  className="block w-full rounded-xl border border-slate-300 bg-white/50 pl-10 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  placeholder="Confirmar nova senha"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-md hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all active:scale-95 disabled:opacity-70"
            >
              {loading ? 'Salvando...' : 'Redefinir Senha'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
