'use client';
 
import { useAuth } from '@/contexts/AuthContext';
import { differenceInCalendarDays, parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertCircle, ChevronRight, ShieldCheck, XCircle } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { trialEnforcementEnabled } from '@/lib/features';
 
export default function PlanBanner() {
  const { user, plansEnabled } = useAuth();
  const pathname = usePathname();
 
  if (!plansEnabled && !(user?.subscription_status === 'trial_expired' && !trialEnforcementEnabled)) {
    return null;
  }
 
  if (!user || pathname === '/dashboard/plans') {
    return null;
  }
 
  if (user.subscription_status === 'trial_expired' && !trialEnforcementEnabled) {
    return (
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-4 py-2 text-sm font-semibold flex items-center justify-center gap-4 animate-in slide-in-from-top duration-500 shadow-lg relative z-50">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} />
          <span>
            Seu teste terminou, mas seu acesso segue liberado enquanto a conta estiver em validação com os usuários piloto.
          </span>
        </div>
      </div>
    );
  }
 
  if (user.subscription_status === 'cancelled') {
    const accessUntilLabel = user.access_until
      ? (() => {
          try {
            return format(new Date(user.access_until), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
          } catch {
            return null;
          }
        })()
      : null;
 
    return (
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-4 py-2 text-sm font-semibold flex items-center justify-between gap-4 animate-in slide-in-from-top duration-500 shadow-lg relative z-50 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-full bg-white/5 skew-x-12 transform translate-x-32 pointer-events-none" />
 
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-1 rounded-lg">
            <XCircle size={18} className="text-blue-100" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
            <span className="font-black tracking-tight uppercase text-xs bg-white/20 px-2 py-0.5 rounded text-blue-50">
              Assinatura cancelada
            </span>
            <span className="text-blue-50 opacity-90 hidden sm:inline">|</span>
            <span className="text-xs sm:text-sm">
              {accessUntilLabel
                ? `Acesso ativo até ${accessUntilLabel}.`
                : 'Acesso ativo até a data limite.'}
            </span>
          </div>
        </div>
 
        <Link
          href="/dashboard/plans?mode=plans"
          className="bg-white text-blue-700 px-4 py-1.5 rounded-xl text-xs font-black hover:bg-blue-50 transition-all flex items-center gap-1 shrink-0 shadow-sm hover:scale-105 active:scale-95 group relative z-10"
        >
          REATIVAR
          <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    );
  }
 
  // Se o usuário tem assinatura ativa
  if (user.subscription_status === 'active_subscription') {
    return (
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-4 py-2 text-sm font-semibold flex items-center justify-between gap-4 animate-in slide-in-from-top duration-500 shadow-lg relative z-50 overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute top-0 right-0 w-64 h-full bg-white/5 skew-x-12 transform translate-x-32 pointer-events-none" />
        
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-1 rounded-lg">
            <ShieldCheck size={18} className="text-blue-100" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
            <span className="font-black tracking-tight uppercase text-xs bg-white/20 px-2 py-0.5 rounded text-blue-50">
              {user.plan_name || 'Plano Completo'}
            </span>
            <span className="text-blue-50 opacity-90 hidden sm:inline">|</span>
            <span className="text-xs sm:text-sm">
              Sua assinatura está ativa. Aproveite os recursos premium!
            </span>
          </div>
        </div>
        
        <Link 
          href="/dashboard/plans" 
          className="bg-white text-blue-700 px-4 py-1.5 rounded-xl text-xs font-black hover:bg-blue-50 transition-all flex items-center gap-1 shrink-0 shadow-sm hover:scale-105 active:scale-95 group relative z-10"
        >
          GERENCIAR PLANO
          <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    );
  }
 
  // Lógica de Trial (mantida e aprimorada - Agora usando 'basico')
  if (user.plan_type === 'basico' && user.subscription_status !== 'trial_expired' && user.trial_end_date) {
    const daysRemaining = (() => {
      try {
        const end = typeof user.trial_end_date === 'string' ? parseISO(user.trial_end_date) : user.trial_end_date;
        return differenceInCalendarDays(end, new Date());
      } catch (e) {
        return 14;
      }
    })();
 
    const getUrgencyConfig = () => {
      if (daysRemaining > 10) {
        return {
          colors: 'from-blue-600 to-indigo-700 shadow-blue-500/20',
          message: `👋 Bem-vindo! Explore todas as ferramentas por mais ${daysRemaining} dias.`,
          pulse: false
        };
      }
      if (daysRemaining > 7) {
        return {
          colors: 'from-blue-600 to-indigo-700 shadow-blue-500/20',
          message: `Dica: Já cadastrou seu primeiro imóvel? Aproveite sua conta gratuita (${daysRemaining} dias restantes).`,
          pulse: false
        };
      }
      if (daysRemaining > 4) {
        return {
          colors: 'from-indigo-500 to-blue-600 shadow-indigo-500/20',
          message: `Sua produtividade está aumentando! Garanta seu acesso contínuo. Faltam ${daysRemaining} dias de teste.`,
          pulse: false
        };
      }
      if (daysRemaining > 1) {
        return {
          colors: 'from-amber-500 to-orange-600 shadow-amber-500/20',
          message: `Atenção: Seu período de teste termina em ${daysRemaining} dias. Não perca seus dados cadastrados!`,
          pulse: true
        };
      }
      return {
        colors: 'from-red-600 to-rose-700 shadow-red-500/20',
        message: daysRemaining <= 0 
          ? '🚨 Final de ciclo! Seu teste termina hoje. Assine agora para evitar o bloqueio da conta!' 
          : `⚠️ ÚLTIMAS 24 HORAS! Seu teste gratuito expira amanhã. Assine agora com segurança.`,
        pulse: true
      };
    };
 
    const config = getUrgencyConfig();
 
    return (
      <div className={`bg-gradient-to-r ${config.colors} text-white px-4 py-2 text-sm font-semibold flex items-center justify-center gap-4 animate-in slide-in-from-top duration-500 shadow-lg relative z-50`}>
        <div className="flex items-center gap-2">
          <AlertCircle size={16} className={config.pulse ? 'animate-pulse' : ''} />
          <span>{config.message}</span>
        </div>
        <Link 
          href="/dashboard/plans" 
          className="bg-white text-slate-900 px-4 py-1.5 rounded-xl text-xs font-black hover:bg-slate-100 transition-all flex items-center gap-1 shrink-0 shadow-sm hover:scale-105 active:scale-95"
        >
          ESCOLHER PLANO
          <ChevronRight size={14} />
        </Link>
      </div>
    );
  }
 
  return null;
}
