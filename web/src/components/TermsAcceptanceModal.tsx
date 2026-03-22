'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-toastify';
import { FileText, ShieldCheck } from 'lucide-react';

type CurrentTermsPayload = {
  id: string;
  version: string;
  title: string;
  content: string;
  published_at: string;
  accepted_at: string | null;
  terms_pending: boolean;
};

export default function TermsAcceptanceModal() {
  const { user, syncUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [checked, setChecked] = useState(false);
  const [terms, setTerms] = useState<CurrentTermsPayload | null>(null);

  useEffect(() => {
    if (!user?.terms_pending) {
      setTerms(null);
      setChecked(false);
      return;
    }

    let mounted = true;

    async function loadTerms() {
      try {
        setFetching(true);
        const response = await api.get('/auth/terms/current');
        if (mounted) {
          setTerms(response.data);
        }
      } catch (error) {
        toast.error('Não foi possível carregar os termos de uso.');
      } finally {
        if (mounted) {
          setFetching(false);
        }
      }
    }

    void loadTerms();

    return () => {
      mounted = false;
    };
  }, [user?.terms_pending]);

  if (!user?.terms_pending) {
    return null;
  }

  async function handleAccept() {
    if (!checked) {
      toast.error('Confirme que você leu e concorda com os termos para continuar.');
      return;
    }

    try {
      setLoading(true);
      await api.post('/auth/terms/accept');
      await syncUser();
      toast.success('Termos aceitos com sucesso.');
    } catch (error) {
      toast.error('Não foi possível registrar o aceite dos termos.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 px-3 py-3 backdrop-blur-sm sm:px-4 sm:py-6">
      <div className="relative flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
              <FileText className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                Aceite obrigatório
              </p>
              <h3 className="text-xl font-bold text-slate-900 sm:text-2xl">
                {terms?.title || 'Termos de Uso'}
              </h3>
              <p className="text-sm text-slate-500">
                Para continuar usando o sistema, revise e aceite a versão atual dos termos.
              </p>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          {fetching ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <span className="font-semibold text-slate-800">Versão:</span>{' '}
                {terms?.version || user.current_terms_version || 'pendente'}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-slate-700">
                  {terms?.content || 'Os termos de uso não puderam ser carregados.'}
                </pre>
              </div>

              <label className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => setChecked(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700">
                  Li e concordo com os Termos de Uso vigentes, e entendo que novos aceites poderão ser
                  solicitados quando houver atualização da versão publicada.
                </span>
              </label>
            </div>
          )}
        </div>

        <div
          className="sticky bottom-0 flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Seu aceite ficará registrado para auditoria.
          </div>
          <button
            type="button"
            onClick={handleAccept}
            disabled={loading || fetching || !terms}
            className="w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {loading ? 'Registrando aceite...' : 'Aceitar e continuar'}
          </button>
        </div>
      </div>
    </div>
  );
}
