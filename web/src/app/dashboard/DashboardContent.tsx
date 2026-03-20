'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Building, Calendar, CheckCircle, DollarSign, Clock, LogOut, Rocket, Info, ChevronRight, X } from 'lucide-react';
import { format, differenceInCalendarDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrencyBR } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import OnboardingChecklist from '@/components/OnboardingChecklist';
import { Plus } from 'lucide-react';
import { toast } from 'react-toastify';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showNpsModal, setShowNpsModal] = useState(false);
  const [npsScore, setNpsScore] = useState(10);
  const [npsComment, setNpsComment] = useState('');
  const [npsSubmitting, setNpsSubmitting] = useState(false);

  const daysRemaining = (() => {
    if (user?.plan_type !== 'trial' || !user?.trial_end_date) return 0;
    try {
      const end = typeof user.trial_end_date === 'string' ? parseISO(user.trial_end_date) : user.trial_end_date;
      const diff = differenceInCalendarDays(end, new Date());
      return Math.max(0, diff);
    } catch (e) {
      return 0;
    }
  })();

  useEffect(() => {
    async function loadStats() {
      // NÃ£o tentar carregar se o trial jÃ¡ estiver expirado localmente
      if (user?.subscription_status === 'trial_expired') {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/dashboard/stats');
        setStats(response.data);
      } catch (error: any) {
        // Silenciar erro 403 de trial expirado, pois o modal jÃ¡ cuida disso
        if (error.response?.status !== 403) {
          console.error('Erro ao buscar estatísticas:', error);
        }
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [user?.subscription_status]);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    async function checkNps() {
      try {
        const response = await api.get('/nps/check');
        if (isMounted && response.data?.eligible) {
          setShowNpsModal(true);
        }
      } catch (error) {
        console.error('Erro ao consultar o NPS:', error);
      }
    }

    checkNps();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleNpsSubmit = async () => {
    setNpsSubmitting(true);
    try {
      await api.post('/nps', {
        score: npsScore,
        comment: npsComment ? npsComment.trim() : undefined
      });
      toast.success('Obrigado pela sua nota!');
      setShowNpsModal(false);
    } catch (error: any) {
      console.error('Erro ao enviar NPS:', error);
      toast.error(error?.response?.data?.error || 'Não foi possível registrar seu feedback.');
    } finally {
      setNpsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Visão Geral</h1>
          <p className="text-slate-500 font-medium">Bem-vindo de volta! Aqui está um resumo do seu negócio.</p>
        </div>

        <Link 
          href="/dashboard/reservations/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-lg shadow-blue-200 flex items-center gap-2 transition-all active:scale-95 shrink-0"
        >
          <Plus size={18} />
          NOVA RESERVA
        </Link>
      </div>

      <OnboardingChecklist stats={stats} />
      
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 flex flex-col relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute right-[-10px] top-[-10px] opacity-[0.03] group-hover:scale-110 transition-transform">
            <Building size={100} />
          </div>
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Imóveis Ativos</p>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-4xl font-black text-slate-900">{stats?.totalProperties}</span>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 flex flex-col relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute right-[-10px] top-[-10px] opacity-[0.03] group-hover:scale-110 transition-transform">
            <Calendar size={100} />
          </div>
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Check-ins Hoje</p>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-4xl font-black text-slate-900">{stats?.reservationsToday}</span>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 flex flex-col relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute right-[-10px] top-[-10px] opacity-[0.03] group-hover:scale-110 transition-transform">
            <LogOut size={100} />
          </div>
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Check-outs Hoje</p>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-4xl font-black text-slate-900">{stats?.checkoutsToday}</span>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 flex flex-col relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute right-[-10px] top-[-10px] opacity-[0.03] group-hover:scale-110 transition-transform">
            <CheckCircle size={100} />
          </div>
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Próximos Check-ins</p>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-4xl font-black text-slate-900">{stats?.pendingCheckinsCount}</span>
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 p-6 shadow-lg shadow-blue-200 flex flex-col text-white relative overflow-hidden group hover:scale-[1.02] transition-all lg:col-span-1">
          <div className="absolute right-[-10px] top-[-10px] opacity-10 group-hover:scale-110 transition-transform">
            <DollarSign size={100} />
          </div>
          <p className="text-sm font-bold text-blue-100 uppercase tracking-wider">Faturamento (Mês)</p>
          <div className="mt-4 flex items-baseline gap-1 min-w-0">
            <span className="text-base font-bold text-blue-200 shrink-0">R$</span>
            <span className="text-xl font-black truncate">{formatCurrencyBR(stats?.monthlyRevenue ?? 0)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="rounded-3xl bg-blue-50/50 p-8 border border-blue-100 shadow-sm relative overflow-hidden">
          <div className="absolute right-[-20px] top-[-20px] opacity-[0.05] rotate-12">
            <Clock size={150} />
          </div>
          <h3 className="text-xl font-bold text-blue-900 mb-6 flex items-center gap-2">
            <Clock className="text-blue-600" size={24} />
            Chegando Hoje
          </h3>
          <div className="space-y-3">
            {stats?.checkinsTodayList.length > 0 ? (
              stats.checkinsTodayList.map((res: any) => (
                <div key={res.id} className="flex items-center justify-between p-4 rounded-xl bg-white border border-blue-100 shadow-sm hover:border-blue-300 transition-colors">
                  <div>
                    <p className="font-bold text-slate-900">{res.imovel.nome}</p>
                    <p className="text-sm text-slate-500">{res.locatario.nome}</p>
                    {res.hora_checkin && (
                      <p className="text-[10px] font-bold text-blue-600 mt-1 flex items-center gap-1">
                        <Clock size={10} />
                        Entrada: {res.hora_checkin}
                      </p>
                    )}
                  </div>
                  <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-3 py-1 rounded-full uppercase">
                    CHECK-IN
                  </span>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-slate-400 group">
                <Calendar size={32} className="mb-2 opacity-20 group-hover:opacity-40 transition-opacity" />
                <p className="text-xs font-bold text-center">Nenhuma chegada hoje.</p>
                <Link href="/dashboard/reservations/new" className="text-[10px] text-blue-600 font-bold mt-2 hover:underline">
                  Registrar reserva →
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-orange-50/50 p-8 border border-orange-100 shadow-sm relative overflow-hidden">
          <div className="absolute right-[-20px] top-[-20px] opacity-[0.05] -rotate-12">
            <LogOut size={150} />
          </div>
          <h3 className="text-xl font-bold text-orange-900 mb-6 flex items-center gap-2">
            <LogOut className="text-orange-600" size={24} />
            Saindo Hoje
          </h3>
          <div className="space-y-3">
            {stats?.checkoutsTodayList.length > 0 ? (
              stats.checkoutsTodayList.map((res: any) => (
                <div key={res.id} className="flex items-center justify-between p-4 rounded-xl bg-white border border-orange-100 shadow-sm hover:border-orange-300 transition-colors">
                  <div>
                    <p className="font-bold text-slate-900">{res.imovel.nome}</p>
                    <p className="text-sm text-slate-500">{res.locatario.nome}</p>
                    {res.hora_checkout && (
                      <p className="text-[10px] font-bold text-orange-600 mt-1 flex items-center gap-1">
                        <Clock size={10} />
                        Saída: {res.hora_checkout}
                      </p>
                    )}
                  </div>
                  <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-3 py-1 rounded-full uppercase">
                    CHECK-OUT
                  </span>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-slate-400 group">
                <LogOut size={32} className="mb-2 opacity-20 group-hover:opacity-40 transition-opacity" />
                <p className="text-xs font-bold text-center">Nenhuma saída hoje.</p>
                <Link href="/dashboard/reservations" className="text-[10px] text-orange-600 font-bold mt-2 hover:underline">
                  Ver agenda →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mt-4">
        <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Clock className="text-blue-600" size={24} />
              Próximos Check-ins
            </h3>
          </div>
          <div className="space-y-4">
            {stats?.upcomingCheckins.length > 0 ? (
              stats.upcomingCheckins.map((res: any) => (
                <div key={res.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors">
                  <div>
                    <p className="font-bold text-slate-900">{res.imovel.nome}</p>
                    <p className="text-sm text-slate-500">{res.locatario.nome}</p>
                    {res.hora_checkin && (
                      <p className="text-[10px] font-bold text-blue-600 mt-1 flex items-center gap-1">
                        <Clock size={10} />
                        Entrada: {res.hora_checkin}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-blue-600">
                      {format(new Date(res.data_checkin), "dd 'de' MMMM", { locale: ptBR })}
                    </p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${res.status === 'Confirmada' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {res.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 group">
                <Calendar size={48} className="mb-4 opacity-20 group-hover:opacity-40 transition-opacity" />
                <p className="font-bold">Nenhum check-in programado.</p>
                <p className="text-xs mt-1">Registre sua primeira reserva para começar.</p>
                <Link href="/dashboard/reservations/new" className="mt-4 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-xs font-black hover:bg-blue-100 transition-all">
                  CRIAR RESERVA
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <LogOut className="text-orange-600" size={24} />
              Próximos Check-outs
            </h3>
          </div>
          <div className="space-y-4">
            {stats?.upcomingCheckouts.length > 0 ? (
              stats.upcomingCheckouts.map((res: any) => (
                <div key={res.id} className="flex items-center justify-between p-4 rounded-2xl bg-orange-50/50 border border-orange-100 hover:bg-orange-50 transition-colors">
                  <div>
                    <p className="font-bold text-slate-900">{res.imovel.nome}</p>
                    <p className="text-sm text-slate-500">{res.locatario.nome}</p>
                    {res.hora_checkout && (
                      <p className="text-[10px] font-bold text-orange-600 mt-1 flex items-center gap-1">
                        <Clock size={10} />
                        Saída: {res.hora_checkout}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-orange-600">
                      {format(new Date(res.data_checkout), "dd 'de' MMMM", { locale: ptBR })}
                    </p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-orange-100 text-orange-700">
                      SAÍDA
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <LogOut size={48} className="mb-4 opacity-20" />
                <p>Nenhum check-out programado.</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <DollarSign className="text-emerald-600" size={24} />
              Pagamentos Pendentes
            </h3>
          </div>
          <div className="space-y-4">
            {stats?.pendingPayments.length > 0 ? (
              stats.pendingPayments.map((pay: any) => (
                <div key={pay.id} className="flex items-center justify-between p-4 rounded-2xl bg-amber-50 border border-amber-100">
                  <div>
                    <p className="font-bold text-slate-900">{pay.reserva.imovel.nome}</p>
                    <p className="text-sm text-slate-500">{pay.reserva.locatario.nome}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-amber-700">R$ {formatCurrencyBR(pay.valor)}</p>
                    <p className="text-[10px] font-bold text-amber-600 uppercase">{pay.tipo}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <DollarSign size={48} className="mb-4 opacity-20" />
                <p>Nenhum pagamento pendente.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      {showNpsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
          <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between px-6 pt-6">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Aluga Fácil</p>
                <h3 className="text-2xl font-bold text-slate-900">Avaliação NPS</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNpsModal(false)}
                className="rounded-full p-2 text-slate-500 hover:text-slate-900 transition"
                aria-label="Fechar avaliação"
              >
                <X size={20} />
              </button>
            </div>
            <div className="px-6 pb-10 space-y-6 text-slate-600 text-sm">
              <p>
                Você já está com a conta ativa há alguns dias. Nos dê uma nota de 0 a 10 sobre o quanto recomendaria o
                Aluga Fácil para um colega.
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-500 uppercase tracking-[0.3em] font-semibold">
                  <span>0 - Nada provável</span>
                  <span>10 - Extremamente provável</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={npsScore}
                  onChange={(event) => setNpsScore(Number(event.target.value))}
                  className="w-full"
                />
                <div className="text-3xl font-black text-slate-900 text-center">{npsScore}</div>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Comentário (opcional)</label>
                <textarea
                  value={npsComment}
                  onChange={(event) => setNpsComment(event.target.value)}
                  rows={3}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition"
                  placeholder="Conte o que você mais gosta ou o que podemos melhorar."
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleNpsSubmit}
                  disabled={npsSubmitting}
                  className="px-6 py-3 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {npsSubmitting ? 'Enviando...' : 'Enviar avaliação'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
