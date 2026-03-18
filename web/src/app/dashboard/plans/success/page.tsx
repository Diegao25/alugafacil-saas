'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, ArrowRight, Loader2, Calendar, CreditCard, Package, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import confetti from 'canvas-confetti';

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<any>(null);
  const { syncUser } = useAuth();
  const router = useRouter();

  const hasTriggeredCeleb = useRef(false);

  useEffect(() => {
    async function verify() {
      if (!sessionId) return;
      
      try {
        const response = await api.get(`/subscriptions/verify/${sessionId}`);
        setDetails(response.data);
        await syncUser(); // Atualiza o estado local do usuário
        
        // Trigger celebration only once
        if (!hasTriggeredCeleb.current) {
          hasTriggeredCeleb.current = true;
          setTimeout(() => {
            confetti({
              particleCount: 80,
              spread: 60,
              origin: { y: 0.7 },
              colors: ['#2563eb', '#4f46e5', '#10b981'],
              disableForReducedMotion: true
            });
          }, 500);
        }
      } catch (error) {
        console.error('Erro ao verificar sessão:', error);
      } finally {
        setLoading(false);
      }
    }

    verify();
  }, [sessionId, syncUser]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-4">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
        <h2 className="text-xl font-bold text-slate-700">Processando sua assinatura...</h2>
        <p className="text-slate-500 mt-2">Estamos confirmando os detalhes do seu pagamento.</p>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 animate-in fade-in duration-700">
      <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6 text-emerald-600 shadow-lg shadow-emerald-100">
        <CheckCircle2 size={40} />
      </div>
      
      <h1 className="text-3xl font-black text-slate-900 mb-2">🎉 Assinatura Ativada!</h1>
      <p className="text-slate-500 text-center max-w-md mb-8 font-medium">
        Parabéns! Seu negócio acaba de subir de nível. Todas as funcionalidades premium já estão liberadas para você.
      </p>

      {details && (
        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-sm p-6 mb-10 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3 text-slate-600">
              <Package size={20} className="text-blue-500" />
              <span className="text-sm font-bold">Plano</span>
            </div>
            <span className="font-black text-slate-900">{details.planName}</span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3 text-slate-600">
              <Calendar size={20} className="text-blue-500" />
              <span className="text-sm font-bold">Data da Contratação</span>
            </div>
            <span className="font-medium text-slate-800">{details.date}</span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3 text-slate-600">
              <CreditCard size={20} className="text-blue-500" />
              <span className="text-sm font-bold">Forma de Pagamento</span>
            </div>
            <span className="font-medium text-slate-800">{details.paymentMethod}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-slate-600">
              <DollarSign size={20} className="text-blue-500" />
              <span className="text-sm font-bold">Valor Mensal</span>
            </div>
            <span className="font-black text-blue-600">{details.amount}</span>
          </div>
        </div>
      )}

      <Link 
        href="/dashboard" 
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-10 py-4 rounded-2xl transition-all shadow-lg shadow-blue-200 flex items-center gap-2 group"
      >
        Acessar Painel de Gestão
        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
      </Link>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
