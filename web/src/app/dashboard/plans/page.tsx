'use client';

import { useAuth } from '@/contexts/AuthContext';
import { 
  Check, Rocket, Shield, Zap, ArrowLeft, Loader2, Clock, XCircle,
  ArrowRightLeft, CreditCard, Package, DollarSign, Calendar, RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { toast } from 'react-toastify';
import { useRouter, useSearchParams } from 'next/navigation';
import { plansAccessEnabled } from '@/lib/features';

const PLANS = [
  {
    name: 'Plano Completo',
    price: 'R$ 49,90',
    description: 'Gestão total do seu negócio de locações sem limites.',
    features: [
      'Imóveis ilimitados',
      'Agenda de reservas inteligente',
      'Mala Direta via WhatsApp',
      'Gestão Financeira completa',
      'Contratos digitais ilimitados',
      'Suporte prioritário',
      'Relatórios de ocupação e lucratividade'
    ],
    buttonText: 'Começar Agora',
    highlight: true
  }
];

export default function PlansPage() {
  const { user, syncUser } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = searchParams.get('mode');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [showPlans, setShowPlans] = useState(mode === 'plans');
  const [history, setHistory] = useState<any[]>([]);

  const isActive = user?.subscription_status === 'active_subscription';
  const isCancelled = user?.subscription_status === 'cancelled';
  const hasSubscriptionDetails = isActive || isCancelled;
  const currentPlan = PLANS.find(p => p.name.toLowerCase() === user?.plan_name?.toLowerCase()) || PLANS[0];

  useEffect(() => {
    if (!plansAccessEnabled) {
      router.replace('/dashboard');
    }
  }, [router]);

  useEffect(() => {
    syncUser();
  }, []);

  if (!plansAccessEnabled) {
    return null;
  }

  useEffect(() => {
    setShowPlans(mode === 'plans');
  }, [mode]);

  useEffect(() => {
    async function loadHistory() {
      if (!user?.id) return;
      try {
        const response = await api.get('/subscriptions/history');
        setHistory(response.data);
      } catch (error) {
        console.error('Erro ao buscar histórico:', error);
      }
    }
    loadHistory();
  }, [user?.id]);

  const normalizedHistory = useMemo(() => {
    const items = (history || []).map((h: any) => ({
      ...h,
      date: h.date,
      plan_name: h.plan_name,
      amount: h.amount ?? 0,
    }));

    // already sorted desc by backend; ensure consistent
    items.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const special = new Set(['Cancelamento', 'Reativação']);
    const isPlanEntry = (name: string) => !special.has(name);

    return items.map((item: any, index: number) => {
      const prev = items[index + 1]; // older
      let label = item.plan_name;
      let badge: 'CANCELAMENTO' | 'REATIVAÇÃO' | 'CONTRATAÇÃO' | 'UPGRADE' | 'DOWNGRADE' | 'MUDANÇA' | null = null;

      if (item.plan_name === 'Cancelamento') badge = 'CANCELAMENTO';
      else if (item.plan_name === 'Reativação') badge = 'REATIVAÇÃO';
      else if (!prev || !isPlanEntry(prev.plan_name)) badge = 'CONTRATAÇÃO';
      else if (isPlanEntry(prev.plan_name)) {
        if ((item.amount ?? 0) > (prev.amount ?? 0)) badge = 'UPGRADE';
        else if ((item.amount ?? 0) < (prev.amount ?? 0)) badge = 'DOWNGRADE';
        else badge = 'MUDANÇA';
      }

      return { ...item, _badge: badge, _label: label };
    });
  }, [history]);

  const handleSubscription = async (planName: string) => {
    if (planName === 'Enterprise') {
      window.open('https://wa.me/55XXXXXXXXXXX', '_blank'); // Redirecionar para WhatsApp
      return;
    }

    setLoadingPlan(planName);
    try {
      const response = await api.post('/subscriptions/checkout', { planName });
      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error: any) {
      console.error('Erro ao iniciar checkout:', error);
      toast.error('Erro ao processar pagamento. Tente novamente.');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex flex-col gap-2">
        <Link 
          href="/dashboard" 
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm font-bold transition-colors mb-4 group w-fit"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Voltar para Dashboard
        </Link>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">
          {hasSubscriptionDetails ? 'Detalhes da Assinatura' : 'Escolha seu Plano'}
        </h1>
        <p className="text-slate-500 italic font-medium">
          {hasSubscriptionDetails
            ? 'Gerencie os detalhes do seu plano e mantenha seu acesso sempre ativo.'
            : 'Desbloqueie todo o potencial da plataforma e profissionalize sua gestão de locatários.'}
        </p>
      </div>

      {isCancelled && (
        <div className="max-w-6xl">
          <div className="rounded-3xl bg-blue-50 border border-blue-100 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="h-14 w-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-blue-600 shrink-0">
              <Shield size={28} />
            </div>
            <div className="flex-1">
              <h4 className="text-xl font-black text-blue-900">Assinatura cancelada</h4>
              <p className="text-blue-800/80 text-sm mt-1 font-medium">
                Você ainda pode usar a plataforma até{' '}
                <span className="font-black">
                  {user?.access_until ? new Date(user.access_until).toLocaleDateString('pt-BR') : 'a data limite do seu acesso'}
                </span>
                . Após essa data, seu acesso será encerrado.
              </p>
            </div>
            {showPlans ? (
              <button
                onClick={() => setShowPlans(false)}
                className="w-full md:w-auto px-8 py-4 rounded-3xl border border-blue-200 text-blue-800 font-black bg-white hover:bg-blue-100 transition-colors"
              >
                Ver detalhes da assinatura
              </button>
            ) : (
              <button
                onClick={() => setShowPlans(true)}
                className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-black px-8 py-4 rounded-3xl transition-all shadow-xl shadow-blue-200 flex items-center justify-center gap-2"
              >
                Reativar assinatura
              </button>
            )}
          </div>
        </div>
      )}

      {hasSubscriptionDetails && !showPlans ? (
        <div className="max-w-6xl space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Subscription Details Card (Matches Screenshot) */}
            <div className="w-full bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-6">
              <h3 className="text-lg font-black text-slate-800 mb-2 flex items-center gap-2">
                <Shield size={20} className="text-blue-600" />
                Dados do Plano Atual
              </h3>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3 text-slate-600">
                <Package size={20} className="text-blue-500" />
                <span className="text-sm font-bold">Plano</span>
              </div>
              <span className="font-black text-slate-900">{user?.plan_name || 'Profissional'}</span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3 text-slate-600">
                <Zap size={20} className={isCancelled ? 'text-rose-500' : 'text-emerald-500'} />
                <span className="text-sm font-bold">Status</span>
              </div>
              <span className={`font-black ${isCancelled ? 'text-rose-600' : 'text-emerald-600'}`}>
                {isCancelled ? 'Cancelado' : 'Ativo'}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3 text-slate-600">
                <Calendar size={20} className="text-blue-500" />
                <span className="text-sm font-bold">Data da Contratação</span>
              </div>
              <span className="font-medium text-slate-800">
                {user?.subscription_date 
                  ? new Date(user.subscription_date).toLocaleDateString('pt-BR') 
                  : '15/03/2026'}
              </span>
            </div>

            {isCancelled && (
              <>
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3 text-slate-600">
                    <XCircle size={20} className="text-rose-500" />
                    <span className="text-sm font-bold">Data do Cancelamento</span>
                  </div>
                  <span className="font-medium text-slate-800">
                    {user?.cancellation_date ? new Date(user.cancellation_date).toLocaleDateString('pt-BR') : '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3 text-slate-600">
                    <Clock size={20} className="text-blue-500" />
                    <span className="text-sm font-bold">Acesso até</span>
                  </div>
                  <span className="font-black text-blue-700">
                    {user?.access_until ? new Date(user.access_until).toLocaleDateString('pt-BR') : '-'}
                  </span>
                </div>
              </>
            )}

            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3 text-slate-600">
                <CreditCard size={20} className="text-blue-500" />
                <span className="text-sm font-bold">Forma de Pagamento</span>
              </div>
              <span className="font-medium text-slate-800">{user?.payment_method || 'Cartão de Crédito'}</span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3 text-slate-600">
                <DollarSign size={20} className="text-blue-500" />
                <span className="text-sm font-bold">Valor Mensal</span>
              </div>
              <span className="font-black text-blue-600">
                {user?.subscription_amount 
                  ? `R$ ${user.subscription_amount.toFixed(2).replace('.', ',')}` 
                  : 'R$ 49,90'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-slate-600">
                <RefreshCw size={20} className="text-blue-500" />
                <span className="text-sm font-bold">Periodicidade</span>
              </div>
              <span className="font-bold text-slate-800">Mensal</span>
            </div>
          </div>

          {/* History Card */}
          <div className="w-full bg-white rounded-3xl border border-slate-200 shadow-sm p-8 flex flex-col h-full">
            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
              <Clock size={20} className="text-blue-600" />
              Histórico de Mudanças
            </h3>
            
            <div className="space-y-4 flex-1 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
              {normalizedHistory.length > 0 ? (
                normalizedHistory.map((item: any, index: number) => (
                  <div key={item.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 relative group hover:bg-slate-100 transition-colors">
                    {index === 0 && (
                      <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-full" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-900">{item._label}</p>
                        {item._badge && (
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide ${
                            item._badge === 'CANCELAMENTO'
                              ? 'bg-rose-100 text-rose-700'
                              : item._badge === 'REATIVAÇÃO'
                                ? 'bg-emerald-100 text-emerald-700'
                                : item._badge === 'UPGRADE'
                                  ? 'bg-indigo-100 text-indigo-700'
                                  : item._badge === 'DOWNGRADE'
                                    ? 'bg-amber-100 text-amber-800'
                                    : item._badge === 'CONTRATAÇÃO'
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-slate-200 text-slate-700'
                          }`}>
                            {item._badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        {new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-blue-600">
                        {item.plan_name === 'Cancelamento' ? '—' : `R$ ${Number(item.amount || 0).toFixed(2).replace('.', ',')}`}
                      </p>
                      {index === 0 ? (
                        <span className="text-[9px] font-black bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full uppercase">Atual</span>
                      ) : (
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Anterior</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400 text-center">
                  <Clock size={40} className="opacity-10 mb-2" />
                  <p className="text-sm font-medium">Nenhuma mudança registrada ainda.</p>
                </div>
              )}
            </div>
          </div>
        </div>

          {/* Current Plan Benefits */}
          <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200">
            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
              <Zap size={20} className="text-amber-500" />
              Benefícios Incluídos no seu Plano {currentPlan.name}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {currentPlan.features.map((feature) => (
                <div key={feature} className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="bg-emerald-100 text-emerald-600 rounded-full p-1 shrink-0">
                    <Check size={14} />
                  </div>
                  <span className="text-sm font-bold text-slate-700">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button 
              onClick={() => setShowPlans(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-black px-10 py-5 rounded-3xl transition-all shadow-xl shadow-blue-200 flex items-center justify-center gap-2 group"
            >
              <ArrowRightLeft size={20} className="group-hover:rotate-180 transition-transform duration-500" />
              Alterar Plano (Upgrade/Downgrade)
            </button>
            
            {isCancelled ? (
              <button
                type="button"
                disabled
                className="px-10 py-5 rounded-3xl border border-slate-200 text-slate-400 font-bold bg-slate-50 cursor-not-allowed text-center"
              >
                Assinatura já cancelada
              </button>
            ) : (
              <Link 
                href="/dashboard/plans/cancel"
                className="px-10 py-5 rounded-3xl border border-slate-200 text-slate-500 font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all text-center"
              >
                Cancelar Assinatura
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-12">
          {hasSubscriptionDetails && (
            <button 
              onClick={() => setShowPlans(false)}
              className="text-blue-600 font-black flex items-center gap-2 hover:underline"
            >
              <ArrowLeft size={16} />
              Voltar para Detalhes da Assinatura
            </button>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {PLANS.map((plan) => {
              const matchesCurrent = plan.name.toLowerCase() === user?.plan_name?.toLowerCase();
              return (
                <div 
                  key={plan.name}
                  className={`
                    relative rounded-3xl p-8 transition-all hover:scale-[1.02] duration-300 flex flex-col
                    ${plan.highlight 
                      ? 'bg-slate-900 text-white shadow-2xl shadow-blue-200 border-2 border-blue-600' 
                      : 'bg-white text-slate-900 shadow-sm border border-slate-200'
                    }
                    ${matchesCurrent ? 'opacity-75 ring-4 ring-offset-4 ring-blue-500' : ''}
                  `}
                >
                  {plan.highlight && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-xs font-black tracking-widest uppercase">
                      Mais Popular
                    </div>
                  )}

                  <div className="mb-8">
                    <h3 className="text-xl font-black mb-2 flex items-center justify-between">
                      {plan.name}
                      {matchesCurrent && <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full">Atual</span>}
                    </h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black">{plan.price}</span>
                      {plan.price !== 'Custom' && <span className="opacity-60 font-bold text-sm">/mês</span>}
                    </div>
                    <p className={`text-sm mt-4 leading-relaxed ${plan.highlight ? 'text-slate-400' : 'text-slate-500'}`}>
                      {plan.description}
                    </p>
                  </div>

                  <div className="space-y-4 mb-12 flex-1">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-3">
                        <div className={`mt-0.5 rounded-full p-0.5 ${plan.highlight ? 'bg-blue-600/20 text-blue-400' : 'bg-emerald-100 text-emerald-600'}`}>
                          <Check size={14} />
                        </div>
                        <span className="text-sm font-medium">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <button 
                    className={`
                      w-full py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2
                      ${matchesCurrent 
                        ? 'bg-slate-400/20 text-slate-400 cursor-not-allowed' 
                        : plan.highlight 
                          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/50' 
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                      }
                      ${loadingPlan === plan.name ? 'opacity-70 cursor-not-allowed' : ''}
                    `}
                    onClick={() => !matchesCurrent && handleSubscription(plan.name)}
                    disabled={loadingPlan !== null || matchesCurrent}
                  >
                    {loadingPlan === plan.name ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : matchesCurrent ? (
                      'Plano Atual'
                    ) : (
                      plan.buttonText
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {!isActive && (
            <div className="rounded-3xl bg-blue-50 border border-blue-100 p-8 flex flex-col md:flex-row items-center gap-8">
              <div className="h-16 w-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-blue-600 shrink-0">
                <Shield size={32} />
              </div>
              <div>
                <h4 className="text-xl font-bold text-blue-900">Pagamento 100% Seguro</h4>
                <p className="text-blue-700/70 text-sm mt-1">
                  Utilizamos criptografia de ponta a ponta para garantir a segurança dos seus dados financeiros. 
                  Sem carência ou taxas de cancelamento.
                </p>
              </div>
              <div className="flex gap-4 md:ml-auto">
                <div className="h-10 w-16 bg-white rounded-lg border border-blue-100 shadow-sm flex items-center justify-center grayscale opacity-50 font-bold text-xs">VISA</div>
                <div className="h-10 w-16 bg-white rounded-lg border border-blue-100 shadow-sm flex items-center justify-center grayscale opacity-50 font-bold text-xs">MC</div>
                <div className="h-10 w-16 bg-white rounded-lg border border-blue-100 shadow-sm flex items-center justify-center grayscale opacity-50 font-bold text-xs">PIX</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
