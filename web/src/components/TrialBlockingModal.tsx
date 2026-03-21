'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Lock, Rocket, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { plansAccessEnabled, trialEnforcementEnabled } from '@/lib/features';

export default function TrialBlockingModal() {
  const { user } = useAuth();

  const pathname = usePathname();

  if (!plansAccessEnabled || !trialEnforcementEnabled) {
    return null;
  }

  if (!user || user.subscription_status !== 'trial_expired' || pathname === '/dashboard/plans') {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4 animate-in fade-in duration-500">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-indigo-600" />
        
        <div className="mx-auto w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-6">
          <Lock size={40} className="text-slate-400" />
        </div>

        <h2 className="text-2xl font-black text-slate-900 mb-2">Seu período de teste terminou</h2>
        <p className="text-slate-500 mb-8">
          Para continuar utilizando o sistema e acessar suas reservas, imóveis e clientes, escolha um plano agora.
        </p>

        <div className="space-y-4 mb-8 text-left bg-slate-50 p-6 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
            <CheckCircle2 size={18} className="text-emerald-500" />
            Acesso a todas as ferramentas
          </div>
          <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
            <CheckCircle2 size={18} className="text-emerald-500" />
            Suporte prioritário
          </div>
          <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
            <CheckCircle2 size={18} className="text-emerald-500" />
            Garantia de segurança de dados
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <Link 
            href="/dashboard/plans" 
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 group"
          >
            Assinar Agora
            <Rocket size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </Link>
          <Link 
            href="/dashboard/plans" 
            className="text-slate-500 hover:text-slate-800 text-sm font-bold py-2 transition-colors"
          >
            Ver todos os planos
          </Link>
        </div>
      </div>
    </div>
  );
}
