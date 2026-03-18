'use client';

import { useState, useMemo } from 'react';
import { XCircle, ArrowLeft, Shield, Zap, Check, Pause, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type Step = 1 | 2 | 3 | 4;

const MOTIVOS = [
  'Não estou usando o sistema',
  'O preço está alto',
  'Encontrei outra solução melhor',
  'Tive problemas técnicos',
  'Outro motivo'
];

export default function CancelPage() {
  const { user, syncUser } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [motivo, setMotivo] = useState('');
  const [detalhe, setDetalhe] = useState('');
  const [acceptedDiscount, setAcceptedDiscount] = useState(false);
  const [acceptedDowngrade, setAcceptedDowngrade] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverAccessUntil, setServerAccessUntil] = useState<string | null>(null);

  const accessPreview = useMemo(() => {
    const base = new Date();
    base.setMonth(base.getMonth() + 1);
    return base.toLocaleDateString('pt-BR');
  }, []);

  const handleConfirmCancel = async () => {
    setLoading(true);
    try {
      const response = await api.post('/subscriptions/cancel', {
        motivo,
        detalhe,
        accepted_discount: acceptedDiscount,
        accepted_downgrade: acceptedDowngrade
      });
      if (response.data?.access_until) {
        setServerAccessUntil(response.data.access_until);
      }
      await syncUser();
      toast.success('Assinatura cancelada com sucesso.');
      setStep(4);
    } catch (error: any) {
      console.error('Erro ao cancelar assinatura:', error);
      const message = error.response?.data?.error || 'Erro ao cancelar assinatura. Tente novamente.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const finalAccessDate = useMemo(() => {
    if (!serverAccessUntil) return accessPreview;
    const d = new Date(serverAccessUntil);
    if (isNaN(d.getTime())) return accessPreview;
    return d.toLocaleDateString('pt-BR');
  }, [serverAccessUntil, accessPreview]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-10 animate-in fade-in duration-700">
      <div className="w-full max-w-3xl bg-white rounded-3xl border border-slate-200 shadow-lg shadow-slate-100 p-8 space-y-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => (step === 1 ? window.history.back() : setStep((prev) => (prev > 1 ? ((prev - 1) as Step) : prev)))}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm font-bold transition-colors group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Voltar
          </button>
          <span className="ml-auto text-[11px] font-bold text-slate-400 uppercase tracking-[0.25em]">
            Cancelamento de Assinatura
          </span>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600">
                <XCircle size={30} />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900">
                  Pensando em cancelar sua assinatura?
                </h1>
                <p className="text-slate-500 text-sm font-medium">
                  Antes de prosseguir, veja algumas alternativas que podem manter seu fluxo sem perder seus dados e histórico.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-slate-800">
                  <Shield size={18} className="text-blue-600" />
                  <span className="text-sm font-black">Trocar de plano</span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Se o problema for preço ou momento do negócio, você pode mudar para um plano mais enxuto sem perder seus cadastros.
                </p>
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/plans?mode=plans')}
                  className="mt-auto inline-flex items-center justify-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700"
                >
                  Ver outros planos
                  <ArrowRight size={14} />
                </button>
              </div>

              <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-slate-800">
                  <Pause size={18} className="text-amber-500" />
                  <span className="text-sm font-black">Pausar o uso</span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Você pode cancelar agora e ainda manter acesso até {accessPreview}. Nenhuma nova cobrança será feita após essa data.
                </p>
                <span className="mt-auto text-[11px] text-amber-600 font-bold uppercase tracking-[0.2em]">
                  Período de acesso garantido
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <div className="text-xs text-slate-500 font-medium">
                Seu plano atual:{' '}
                <span className="font-bold text-slate-800">
                  {user?.plan_name || 'Profissional'}
                </span>
              </div>
              <button
                onClick={() => setStep(2)}
                className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white font-black px-8 py-3 rounded-2xl transition-all shadow-md shadow-rose-200 flex items-center justify-center gap-2 text-sm"
              >
                Continuar com cancelamento
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black">
                1
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  Nos conte o motivo do cancelamento
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Isso nos ajuda a melhorar o produto e, quem sabe, criar uma oferta que faça mais sentido para você no futuro.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {MOTIVOS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMotivo(m)}
                  className={`text-left border rounded-2xl px-4 py-3 text-xs font-bold flex items-start gap-3 transition-all ${
                    motivo === m
                      ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <span
                    className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                      motivo === m ? 'border-white bg-slate-900' : 'border-slate-300 bg-white'
                    }`}
                  >
                    {motivo === m && <Check size={10} />}
                  </span>
                  <span>{m}</span>
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">
                Quer deixar algum detalhe adicional? <span className="text-slate-400 font-medium">(opcional)</span>
              </label>
              <textarea
                value={detalhe}
                onChange={(e) => setDetalhe(e.target.value)}
                rows={3}
                className="w-full border border-slate-200 rounded-2xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 resize-none"
                placeholder="Ex: Não tive tempo de configurar, tive dificuldade em alguma funcionalidade específica, etc."
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-700">
                Antes de sair de vez, o que você consideraria?
              </p>
              <div className="flex flex-col gap-2">
                <label className="inline-flex items-center gap-2 text-xs text-slate-600 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptedDiscount}
                    onChange={(e) => setAcceptedDiscount(e.target.checked)}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-900/30"
                  />
                  <span>Eu consideraria ficar com um desconto temporário.</span>
                </label>
                <label className="inline-flex items-center gap-2 text-xs text-slate-600 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptedDowngrade}
                    onChange={(e) => setAcceptedDowngrade(e.target.checked)}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-900/30"
                  />
                  <span>Eu consideraria um plano mais simples/barato.</span>
                </label>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={!motivo}
                onClick={() => setStep(3)}
                className="w-full sm:w-auto bg-slate-900 disabled:bg-slate-300 disabled:cursor-not-allowed hover:bg-slate-800 text-white text-xs font-black px-6 py-2.5 rounded-2xl transition-colors flex items-center justify-center gap-2"
              >
                Continuar para confirmação
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black">
                2
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  Confirme os detalhes do cancelamento
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Após confirmar, sua assinatura será marcada como cancelada e você terá acesso somente até a data abaixo.
                </p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-700">
                  <Zap size={16} className="text-amber-500" />
                  <span className="text-xs font-bold">Plano atual</span>
                </div>
                <span className="text-xs font-black text-slate-900">
                  {user?.plan_name || 'Profissional'}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                <div className="flex items-center gap-2 text-slate-700">
                  <Shield size={16} className="text-emerald-500" />
                  <span className="text-xs font-bold">Acesso garantido até</span>
                </div>
                <span className="text-xs font-black text-emerald-700">
                  {accessPreview}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-700">
                Confirmações finais
              </p>
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                Ao confirmar, sua assinatura será marcada como{' '}
                <span className="font-bold text-slate-800">cancelada</span>, nenhuma nova cobrança será gerada
                e o acesso à plataforma será encerrado após o período informado.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={loading}
                className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 disabled:cursor-not-allowed text-white text-xs font-black px-6 py-2.5 rounded-2xl transition-colors flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                Confirmar cancelamento
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 text-center">
            <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mb-2 text-rose-600 shadow-lg shadow-rose-100 mx-auto">
              <XCircle size={40} />
            </div>
            <h1 className="text-2xl font-black text-slate-900">
              Assinatura cancelada com sucesso
            </h1>
            <p className="text-sm text-slate-500 font-medium max-w-md mx-auto">
              Sua assinatura foi marcada como cancelada. Você ainda terá acesso à plataforma até{' '}
              <span className="font-bold text-slate-800"> {finalAccessDate}</span>. Após essa data, não haverá
              novas cobranças e seu acesso será encerrado.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/dashboard/plans"
                className="px-8 py-3 rounded-2xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50"
              >
                Ver opções de planos
              </Link>
              <Link
                href="/dashboard"
                className="px-8 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black"
              >
                Voltar para o Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
