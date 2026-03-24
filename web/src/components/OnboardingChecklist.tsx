'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, PartyPopper, ArrowRight, Building, Calendar, FileText, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  icon: any;
  link: string;
  completed: boolean;
}

export default function OnboardingChecklist({ stats }: { stats: any }) {
  const { user } = useAuth();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!user || user.plan_type !== 'trial') {
      setIsVisible(false);
      return;
    }

    const checklist: ChecklistItem[] = [
      {
        id: 'profile',
        title: 'Atualize seu perfil',
        description: 'Atualize os dados do seu perfil para que reflita corretamente em seu contrato de locação.',
        icon: User,
        link: '/dashboard/profile',
        completed: Boolean(stats?.profileCompleted)
      },
      {
        id: 'property',
        title: 'Cadastre seu primeiro imóvel',
        description: 'Adicione as informações básicas de uma de suas propriedades.',
        icon: Building,
        link: '/dashboard/properties/new',
        completed: (stats?.totalProperties ?? 0) > 0
      },
      {
        id: 'tenant',
        title: 'Cadastre seu primeiro cliente',
        description: 'Tenha todos os contatos dos seus locatários em um só lugar.',
        icon: FileText,
        link: '/dashboard/tenants/new',
        completed: (stats?.totalTenants ?? 0) > 0
      },
      {
        id: 'reservation',
        title: 'Registre sua primeira reserva',
        description: 'Comece a organizar sua agenda de locações.',
        icon: Calendar,
        link: '/dashboard/reservations/new',
        completed: (stats?.totalReservations ?? 0) > 0 || (stats?.reservationsToday ?? 0) > 0 || (stats?.upcomingCheckins?.length ?? 0) > 0
      }
    ];

    setItems(checklist);

    // Se tudo estiver completo, podemos esconder depois de um tempo ou manter como "Sucesso"
    if (checklist.every(item => item.completed)) {
      // Opcionalmente esconder após conclusão total
    }
  }, [user, stats]);

  if (!isVisible || items.length === 0) return null;

  const completedCount = items.filter(i => i.completed).length;
  const progressPercent = Math.round((completedCount / items.length) * 100);

  if (completedCount === items.length) {
    return (
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-3xl p-6 text-white shadow-lg shadow-emerald-200 animate-in zoom-in duration-500 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-20 rotate-12">
          <PartyPopper size={120} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-2xl">
              <PartyPopper size={32} />
            </div>
            <div>
              <h2 className="text-xl font-black">Tudo pronto para começar!</h2>
              <p className="text-emerald-50 opacity-90">Você completou os passos iniciais. Agora é só gerenciar e escalar seu negócio.</p>
            </div>
          </div>
          <button 
            onClick={() => setIsVisible(false)}
            className="bg-white text-emerald-600 px-6 py-3 rounded-xl font-bold hover:bg-emerald-50 transition-all text-sm whitespace-nowrap"
          >
            Começar a Usar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-8 border-none shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-2px_rgba(0,0,0,0.05)] animate-in slide-in-from-top-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            🚀 Vamos configurar sua conta?
          </h2>
          <p className="text-slate-500 mt-1 font-medium">Siga este guia prático para começar a lucrar com o sistema.</p>
        </div>
        
        <div className="flex flex-col items-center md:items-end gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-400">{completedCount} de {items.length} completos</span>
            <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-600 transition-all duration-1000 ease-out" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <span className="text-xs font-black text-blue-600 uppercase tracking-widest">{progressPercent}% Concluído</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map((item) => (
          <Link 
            key={item.id}
            href={item.completed ? '#' : item.link}
            className={`
              p-5 rounded-2xl transition-all flex flex-col gap-4 relative group
              ${item.completed 
                ? 'bg-slate-50 opacity-60 grayscale-[0.5]' 
                : 'bg-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-2px_rgba(0,0,0,0.05)] hover:shadow-md hover:translate-y-[-2px] cursor-pointer border border-transparent'
              }
            `}
            onClick={(e) => item.completed && e.preventDefault()}
          >
            <div className="flex items-center justify-between">
              <div className={`
                p-2 rounded-xl 
                ${item.completed ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors'}
              `}>
                <item.icon size={20} />
              </div>
              {item.completed ? (
                <CheckCircle2 size={24} className="text-emerald-500" />
              ) : (
                <div className="text-slate-300 group-hover:text-blue-500 transition-colors">
                  <ArrowRight size={20} />
                </div>
              )}
            </div>
            
            <div>
              <h3 className={`font-bold text-sm ${item.completed ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                {item.title}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-tight font-medium">
                {item.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
