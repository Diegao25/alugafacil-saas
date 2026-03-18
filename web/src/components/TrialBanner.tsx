'use client';

import { useAuth } from '@/contexts/AuthContext';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { AlertCircle, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function TrialBanner() {
  const { user } = useAuth();

  const pathname = usePathname();

  if (!user || user.plan_type !== 'trial' || user.subscription_status === 'trial_expired' || !user.trial_end_date || pathname === '/dashboard/plans') {
    return null;
  }

  const daysRemaining = (() => {
    if (!user?.trial_end_date) return 100;
    try {
      const end = typeof user.trial_end_date === 'string' ? parseISO(user.trial_end_date) : user.trial_end_date;
      return differenceInCalendarDays(end, new Date());
    } catch (e) {
      return 100;
    }
  })();

  const getUrgencyConfig = () => {
    if (daysRemaining > 7) {
      return {
        colors: 'from-blue-600 to-indigo-700 shadow-blue-500/20',
        message: `Você está no período de teste gratuito. Aproveite todos os recursos! (${daysRemaining} ${daysRemaining === 1 ? 'dia' : 'dias'} restantes)`,
        pulse: false
      };
    }
    if (daysRemaining > 3) {
      return {
        colors: 'from-amber-500 to-orange-600 shadow-amber-500/20',
        message: `Atenção: Seu período de teste termina em ${daysRemaining} dias.`,
        pulse: true
      };
    }
    return {
      colors: 'from-red-600 to-rose-700 shadow-red-500/20',
      message: daysRemaining <= 0 
        ? 'Seu período gratuito termina hoje! Escolha um plano agora para não perder o acesso.' 
        : `URGENTE: Seu período gratuito termina em ${daysRemaining} ${daysRemaining === 1 ? 'dia' : 'dias'}.`,
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
        className="bg-white text-slate-900 px-4 py-1 rounded-full text-xs font-black hover:bg-slate-100 transition-all flex items-center gap-1 shrink-0 shadow-sm hover:scale-105 active:scale-95"
      >
        ESCOLHER PLANO
        <ChevronRight size={14} />
      </Link>
    </div>
  );
}
