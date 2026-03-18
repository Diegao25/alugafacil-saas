'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import Link from 'next/link';
import { LogOut, Save } from 'lucide-react';
import { formatCurrencyBR, formatCurrencyInput, parseCurrencyBR } from '@/lib/utils';

export default function NewPaymentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [reservations, setReservations] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    reserva_id: '',
    valor: '',
    tipo: 'Restante'
  });

  useEffect(() => {
    api.get('/reservations').then((res) => setReservations(res.data));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/payments', {
        ...formData,
        valor: parseCurrencyBR(formData.valor)
      });
      toast.success('Pagamento registrado!');
      router.push('/dashboard/payments');
    } catch (error) {
      toast.error('Erro ao registrar pagamento');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Registrar Pagamento</h1>
      </div>

      <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Reserva Vinculada</label>
              <select
                required
                value={formData.reserva_id}
                onChange={(e) => setFormData({ ...formData, reserva_id: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-blue-500 outline-none transition-all bg-white"
              >
                <option value="">Selecione a reserva...</option>
                {reservations.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.imovel.nome} - {r.locatario.nome} (Total: R$ {formatCurrencyBR(r.valor_total)})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Tipo de Pagamento</label>
                <select
                  required
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-blue-500 outline-none transition-all bg-white"
                >
                  <option value="Sinal">Sinal (Adiantamento)</option>
                  <option value="Restante">Pagamento Restante</option>
                  <option value="Total">Pagamento Total</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Valor (R$)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  value={formData.valor}
                  onChange={(e) => setFormData({ ...formData, valor: formatCurrencyInput(e.target.value) })}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-blue-500 outline-none transition-all"
                  placeholder="0,00"
                />
              </div>
            </div>

          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
            <Link
              href="/dashboard/payments"
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-3 rounded-xl font-bold shadow-sm flex items-center gap-2 transition-all active:scale-95"
            >
              <LogOut className="h-5 w-5" />
              Sair
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-70"
            >
              <Save className="h-5 w-5" />
              {loading ? 'Salvando...' : 'Salvar e Sair'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
