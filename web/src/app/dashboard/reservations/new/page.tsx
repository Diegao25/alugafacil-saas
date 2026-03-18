'use client';

import { useMemo, useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import Link from 'next/link';
import { addDays, parseISO, format } from 'date-fns';
import { LogOut, Save } from 'lucide-react';
import { formatCurrencyBR, formatCurrencyInput, parseCurrencyBR } from '@/lib/utils';

export default function NewReservationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  
  const [formData, setFormData] = useState({
    imovel_id: '',
    locatario_id: '',
    data_checkin: '',
    hora_checkin: '12:00',
    data_checkout: '',
    hora_checkout: '12:00',
    valor_total: ''
  });

  const [paymentOptions, setPaymentOptions] = useState({
    metodo_pagamento: 'SINAL', // 'SINAL' ou 'TOTAL'
    valor_sinal: '',
    num_parcelas: 1,
    data_sinal: new Date().toISOString().split('T')[0],
    forma_pagamento: ''
  });
  const paymentMethodOptions = ['PIX', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito'] as const;

  const [installments, setInstallments] = useState<any[]>([]);

  // Calculate installment schedule
  useEffect(() => {
    if (paymentOptions.metodo_pagamento !== 'SINAL' || paymentOptions.num_parcelas <= 0) {
      setInstallments([]);
      return;
    }
    const sinalValue = parseCurrencyBR(paymentOptions.valor_sinal);
    const totalValue = parseCurrencyBR(formData.valor_total);
    const balance = totalValue - sinalValue;
    if (balance <= 0) {
      setInstallments([]);
      return;
    }

    const signalSource = paymentOptions.data_sinal
      ? parseISO(paymentOptions.data_sinal)
      : formData.data_checkin
      ? parseISO(formData.data_checkin)
      : new Date();
    
    const perInstallment = balance / paymentOptions.num_parcelas;

    const newInstallments = Array.from({ length: paymentOptions.num_parcelas }, (_, index) => ({
      number: index + 1,
      amount: perInstallment,
      due: format(addDays(signalSource, 30 * (index + 1)), 'yyyy-MM-dd')
    }));

    setInstallments(newInstallments);
  }, [paymentOptions.metodo_pagamento, paymentOptions.num_parcelas, paymentOptions.valor_sinal, paymentOptions.data_sinal, formData.data_checkin, formData.valor_total]);

  function handleUpdateInstallmentDate(index: number, newDate: string) {
    const updated = [...installments];
    updated[index].due = newDate;
    setInstallments(updated);
  }

  useEffect(() => {
    Promise.all([
      api.get('/properties'),
      api.get('/tenants')
    ]).then(([resProp, resTen]) => {
      setProperties(resProp.data);
      setTenants(resTen.data);
    });
  }, []);

  // auto calculate total value
  useEffect(() => {
    if (formData.imovel_id && formData.data_checkin && formData.data_checkout) {
      const prop = properties.find(p => p.id === formData.imovel_id);
      if (prop) {
        const inDate = new Date(formData.data_checkin);
        const outDate = new Date(formData.data_checkout);
        if (outDate > inDate) {
          const diffTime = Math.abs(outDate.getTime() - inDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          setFormData(prev => ({
            ...prev,
            valor_total: formatCurrencyBR(diffDays * prop.valor_diaria)
          }));
        }
      }
    }
  }, [formData.imovel_id, formData.data_checkin, formData.data_checkout, properties]);

  function generateWhatsAppMessage() {
    const tenant = tenants.find(t => t.id === formData.locatario_id);
    const property = properties.find(p => p.id === formData.imovel_id);
    
    if (!tenant) return '';

    const inDate = formData.data_checkin ? format(parseISO(formData.data_checkin), 'dd/MM/yyyy') : '';
    const outDate = formData.data_checkout ? format(parseISO(formData.data_checkout), 'dd/MM/yyyy') : '';
    
    let message = `*Resumo da Reserva - ${property?.nome || 'Imóvel'}*\n\n`;
    message += `Olá, ${tenant.nome}!\n`;
    message += `Sua reserva foi confirmada para o período de *${inDate}* a *${outDate}*.\n\n`;
    message += `*Valor Total:* R$ ${formData.valor_total}\n`;
    
    if (paymentOptions.metodo_pagamento === 'SINAL') {
        message += `*Pagamento:* Sinal + Parcelas\n`;
        message += `*Sinal:* R$ ${paymentOptions.valor_sinal} (Pago em ${paymentOptions.data_sinal ? format(parseISO(paymentOptions.data_sinal), 'dd/MM/yyyy') : 'hoje'})\n\n`;
        message += `*Cronograma de Parcelas:*\n`;
        installments.forEach(inst => {
            message += `• Parcela ${inst.number}: R$ ${formatCurrencyBR(inst.amount)} - Vencimento: ${format(parseISO(inst.due), 'dd/MM/yyyy')}\n`;
        });
    } else {
        message += `*Pagamento:* Integral (R$ ${formData.valor_total})\n`;
    }
    
    message += `\n*Nota:* Em breve enviaremos o contrato para conferência e assinatura eletrônica.\n`;
    message += `\nQualquer dúvida, estamos à disposição!`;
    return encodeURIComponent(message);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    if (!paymentOptions.forma_pagamento) {
      toast.error('Selecione a forma de pagamento');
      setLoading(false);
      return;
    }

    try {
      await api.post('/reservations', {
        ...formData,
        ...paymentOptions,
        valor_total: parseCurrencyBR(formData.valor_total),
        valor_sinal: parseCurrencyBR(paymentOptions.valor_sinal),
        datas_parcelas: installments.map(i => i.due)
      });
      
      toast.success('Reserva criada com sucesso!');

      if (sendWhatsApp) {
        const tenant = tenants.find(t => t.id === formData.locatario_id);
        if (tenant?.telefone) {
            const phone = tenant.telefone.replace(/\D/g, '');
            const finalPhone = phone.startsWith('55') ? phone : `55${phone}`;
            const message = generateWhatsAppMessage();
            const url = `https://api.whatsapp.com/send?phone=${finalPhone}&text=${message}`;
            window.open(url, '_blank');
        }
      }

      router.push('/dashboard/reservations');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao criar reserva');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Nova Reserva</h1>
      </div>

      <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-2 col-span-1">
              <label className="text-sm font-medium text-slate-700">Imóvel</label>
              <select
                required
                value={formData.imovel_id}
                onChange={(e) => setFormData({ ...formData, imovel_id: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all bg-white"
              >
                <option value="">Selecione o imóvel...</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2 col-span-1">
              <label className="text-sm font-medium text-slate-700">Locatário</label>
              <select
                required
                value={formData.locatario_id}
                onChange={(e) => setFormData({ ...formData, locatario_id: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all bg-white"
              >
                <option value="">Selecione o cliente...</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Data de Check-in</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  required
                  value={formData.data_checkin}
                  onChange={(e) => setFormData({ ...formData, data_checkin: e.target.value })}
                  className="flex-1 rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                />
                <input
                  type="time"
                  required
                  value={formData.hora_checkin}
                  onChange={(e) => setFormData({ ...formData, hora_checkin: e.target.value })}
                  className="w-32 rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Data de Check-out</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  required
                  value={formData.data_checkout}
                  onChange={(e) => setFormData({ ...formData, data_checkout: e.target.value })}
                  className="flex-1 rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                />
                <input
                  type="time"
                  required
                  value={formData.hora_checkout}
                  onChange={(e) => setFormData({ ...formData, hora_checkout: e.target.value })}
                  className="w-32 rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2 col-span-full">
              <label className="text-sm font-bold text-slate-700">Valor Total Estimado (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                required
                value={formData.valor_total}
                onChange={(e) =>
                  setFormData({ ...formData, valor_total: formatCurrencyInput(e.target.value) })
                }
                className="w-full rounded-xl border-2 border-emerald-200 bg-emerald-50/10 px-4 py-3 text-slate-900 font-bold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                placeholder="Existem dias múltiplos da diária?"
              />
            </div>

            <div className="space-y-2 col-span-full">
              <label className="text-sm font-medium text-slate-700">Método de Pagamento</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setPaymentOptions({ ...paymentOptions, metodo_pagamento: 'SINAL' })}
                  className={`flex items-center justify-center px-4 py-3 rounded-xl border-2 transition-all font-medium ${
                    paymentOptions.metodo_pagamento === 'SINAL'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                  }`}
                >
                  Sinal + Parcelas
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentOptions({ ...paymentOptions, metodo_pagamento: 'TOTAL' })}
                  className={`flex items-center justify-center px-4 py-3 rounded-xl border-2 transition-all font-medium ${
                    paymentOptions.metodo_pagamento === 'TOTAL'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                  }`}
                >
                  Pagamento Total
                </button>
              </div>
            </div>

            <div className="space-y-2 col-span-full">
              <label className="text-sm font-medium text-slate-700">
                {paymentOptions.metodo_pagamento === 'SINAL'
                  ? 'Forma de pagamento do sinal'
                  : 'Forma de pagamento'}
              </label>
              <select
                required
                value={paymentOptions.forma_pagamento}
                onChange={(e) => setPaymentOptions({ ...paymentOptions, forma_pagamento: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all bg-white"
              >
                <option value="">Selecione a forma...</option>
                {paymentMethodOptions.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>

            {paymentOptions.metodo_pagamento === 'SINAL' ? (
              <>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Valor do Sinal (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                required
                value={paymentOptions.valor_sinal}
                onChange={(e) =>
                  setPaymentOptions({
                    ...paymentOptions,
                    valor_sinal: formatCurrencyInput(e.target.value)
                  })
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Data do Sinal</label>
              <input
                type="date"
                value={paymentOptions.data_sinal}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setPaymentOptions({ ...paymentOptions, data_sinal: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
              />
            </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Parcelas (Saldo Restante)</label>
                  <select
                    value={paymentOptions.num_parcelas}
                    onChange={(e) => setPaymentOptions({ ...paymentOptions, num_parcelas: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all bg-white"
                  >
                    {[1, 2, 3, 4, 5, 6, 12].map(n => (
                      <option key={n} value={n}>{n}x</option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <div className="col-span-full p-4 rounded-2xl bg-emerald-50 border border-emerald-100 italic text-sm text-emerald-700 flex items-center space-x-2">
                <span>✅ O valor total de **R$ {formatCurrencyBR(parseCurrencyBR(formData.valor_total))}** será registrado como pago integral hoje.</span>
              </div>
            )}

            {paymentOptions.metodo_pagamento === 'SINAL' && (parseCurrencyBR(paymentOptions.valor_sinal) > 0 || paymentOptions.num_parcelas > 1) && (
              <div className="col-span-full p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 animate-in slide-in-from-top-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Resumo do Cronograma</p>
                <div className="flex flex-col gap-1">
                  {parseCurrencyBR(paymentOptions.valor_sinal) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Sinal:</span>
                      <span className="font-bold text-slate-800">R$ {formatCurrencyBR(parseCurrencyBR(paymentOptions.valor_sinal))}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">
                      {paymentOptions.num_parcelas > 1 ? `Saldo em ${paymentOptions.num_parcelas} parcelas:` : 'Saldo restante:'}
                    </span>
                    <span className="font-bold text-slate-800">
                      {paymentOptions.num_parcelas > 1 
                        ? `${paymentOptions.num_parcelas}x de R$ ${formatCurrencyBR(
                            (parseCurrencyBR(formData.valor_total) - parseCurrencyBR(paymentOptions.valor_sinal)) /
                              paymentOptions.num_parcelas
                          )}`
                        : `R$ ${formatCurrencyBR(
                            parseCurrencyBR(formData.valor_total) - parseCurrencyBR(paymentOptions.valor_sinal)
                          )}`
                      }
                    </span>
                  </div>
                </div>
                {installments.length > 0 && (
                  <div className="pt-3 border-t border-slate-200">
                    <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase tracking-wide mb-3">
                      <span>Cronograma (Datas editáveis)</span>
                    </div>
                    <div className="space-y-3 text-sm">
                      {installments.map((installment, idx) => (
                        <div key={installment.number} className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                          <span className="font-medium text-slate-700">Parcela {installment.number}</span>
                          <input
                            type="date"
                            value={installment.due}
                            onChange={(e) => handleUpdateInstallmentDate(idx, e.target.value)}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all bg-slate-50 font-medium cursor-pointer"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

          <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-slate-100">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={sendWhatsApp}
                  onChange={(e) => setSendWhatsApp(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-12 h-6 rounded-full transition-colors ${sendWhatsApp ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                <div className={`absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition-transform ${sendWhatsApp ? 'translate-x-6' : 'translate-x-0'}`}></div>
              </div>
              <span className="text-sm font-medium text-slate-600 group-hover:text-slate-800 transition-colors">
                Enviar resumo para o WhatsApp do locatário
              </span>
            </label>

            <div className="flex gap-2 w-full md:w-auto">
              <Link
                href="/dashboard/reservations"
                className="flex-1 md:flex-none text-center bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-3 rounded-xl font-bold shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <LogOut className="h-5 w-5" />
                Sair
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70"
              >
                <Save className="h-5 w-5" />
                {loading ? 'Salvando...' : 'Salvar e Sair'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
