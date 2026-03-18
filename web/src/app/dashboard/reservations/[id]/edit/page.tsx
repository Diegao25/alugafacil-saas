'use client';

import { useMemo, useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'react-toastify';
import Link from 'next/link';
import { addDays, format, parseISO } from 'date-fns';
import { LogOut, Save } from 'lucide-react';
import { formatCurrencyBR, formatCurrencyInput, parseCurrencyBR } from '@/lib/utils';

export default function EditReservationPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [installments, setInstallments] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    imovel_id: '',
    locatario_id: '',
    data_checkin: '',
    hora_checkin: '12:00',
    data_checkout: '',
    hora_checkout: '12:00',
    valor_total: '',
    status: 'Pendente'
  });

  const [paymentOptions, setPaymentOptions] = useState({
    metodo_pagamento: 'SINAL',
    valor_sinal: '',
    num_parcelas: 1,
    forma_pagamento: '',
    data_sinal: new Date().toISOString().split('T')[0]
  });
  const paymentMethodOptions = ['PIX', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito'] as const;

  const [hasPaidPayments, setHasPaidPayments] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [resProp, resTen, resRes] = await Promise.all([
          api.get('/properties'),
          api.get('/tenants'),
          api.get(`/reservations/${id}`)
        ]);

        const reservation = resRes.data;
        
        if (reservation) {
          setFormData({
            imovel_id: reservation.imovel_id,
            locatario_id: reservation.locatario_id,
            data_checkin: new Date(reservation.data_checkin).toISOString().split('T')[0],
            hora_checkin: reservation.hora_checkin || '12:00',
            data_checkout: new Date(reservation.data_checkout).toISOString().split('T')[0],
            hora_checkout: reservation.hora_checkout || '12:00',
            valor_total: formatCurrencyBR(reservation.valor_total),
            status: reservation.status
          });

          // Check if any payment is already paid
          const paid = reservation.pagamentos?.some((p: any) => p.status === 'Pago');
          setHasPaidPayments(paid);

          // Detect payment method and prefill values
          const types = reservation.pagamentos?.map((p: any) => p.tipo) || [];
          const paidMethod =
            reservation.pagamentos?.find((p: any) => p.status === 'Pago' && p.meio_pagamento)
              ?.meio_pagamento || '';
          const sinalPayment = reservation.pagamentos?.find((p: any) => /sinal/i.test(p.tipo));
          const parcelPayments =
            reservation.pagamentos?.filter((p: any) => /parcela/i.test(p.tipo)) || [];
          const hasTotal = types.length === 1 && types[0] === 'Total';
          const sinalDateRaw = sinalPayment?.data_pagamento || reservation.data_checkin;
          const sinalDate =
            typeof sinalDateRaw === 'string'
              ? parseISO(sinalDateRaw)
              : sinalDateRaw instanceof Date
                ? sinalDateRaw
                : new Date();
          setPaymentOptions(prev => ({
            ...prev,
            metodo_pagamento: hasTotal ? 'TOTAL' : 'SINAL',
            forma_pagamento: paidMethod,
            valor_sinal: sinalPayment?.valor ? formatCurrencyBR(sinalPayment.valor) : prev.valor_sinal,
            num_parcelas: parcelPayments.length > 0 ? parcelPayments.length : prev.num_parcelas,
            data_sinal: sinalDate.toISOString().split('T')[0]
          }));

          // Load actual installment dates if they exist
          if (parcelPayments.length > 0) {
            setInstallments(parcelPayments.map((p: any, idx: number) => ({
              number: idx + 1,
              amount: p.valor,
              due: p.data_vencimento ? p.data_vencimento.split('T')[0] : p.vencimento.split('T')[0]
            })));
          }
        }

        setProperties(resProp.data);
        setTenants(resTen.data);
      } catch (error) {
        toast.error('Erro ao carregar dados da reserva');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  // Calculate installment schedule only if installments haven't been loaded or are being reset
  useEffect(() => {
    // Only auto-recalculate if installments are empty or payment options changed drastically
    // and if we don't have paid payments that block edits
    if (loading || hasPaidPayments) return;
    
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

    // Only recalculate if the number of installments changed
    if (installments.length === paymentOptions.num_parcelas) return;

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
  }, [paymentOptions, formData, loading, hasPaidPayments]);

  function handleUpdateInstallmentDate(index: number, newDate: string) {
    const updated = [...installments];
    updated[index].due = newDate;
    setInstallments(updated);
  }

  function generateWhatsAppMessage() {
    const tenant = tenants.find(t => t.id === formData.locatario_id);
    const property = properties.find(p => p.id === formData.imovel_id);
    
    if (!tenant) return '';

    const inDate = formData.data_checkin ? format(parseISO(formData.data_checkin), 'dd/MM/yyyy') : '';
    const outDate = formData.data_checkout ? format(parseISO(formData.data_checkout), 'dd/MM/yyyy') : '';
    
    let message = `*Resumo da Reserva (Atualizada) - ${property?.nome || 'Imóvel'}*\n\n`;
    message += `Olá, ${tenant.nome}!\n`;
    message += `Sua reserva foi atualizada. Período: *${inDate}* a *${outDate}*.\n\n`;
    message += `*Valor Total:* R$ ${formData.valor_total}\n`;
    
    if (paymentOptions.metodo_pagamento === 'SINAL') {
        message += `*Pagamento:* Sinal + Parcelas\n`;
        message += `*Sinal:* R$ ${paymentOptions.valor_sinal} (Data: ${paymentOptions.data_sinal ? format(parseISO(paymentOptions.data_sinal), 'dd/MM/yyyy') : 'hoje'})\n\n`;
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
    setSubmitting(true);

    if (!hasPaidPayments && !paymentOptions.forma_pagamento) {
      toast.error('Selecione a forma de pagamento');
      setSubmitting(false);
      return;
    }

    try {
      await api.put(`/reservations/${id}`, {
        ...formData,
        ...paymentOptions,
        valor_total: parseCurrencyBR(formData.valor_total),
        valor_sinal: parseCurrencyBR(paymentOptions.valor_sinal),
        data_checkin: formData.data_checkin,
        data_checkout: formData.data_checkout,
        datas_parcelas: installments.map(i => i.due)
      });
      
      toast.success('Reserva atualizada com sucesso!');

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
      toast.error(error.response?.data?.error || 'Erro ao atualizar reserva');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent"></div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Editar Reserva</h1>
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
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2 col-span-1">
              <label className="text-sm font-medium text-slate-700">Locatário</label>
              <select
                disabled
                value={formData.locatario_id}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-500 outline-none cursor-not-allowed"
              >
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400">O locatário não pode ser alterado após a criação.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 col-span-full">
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
            </div>

            <div className="space-y-2 col-span-full">
              <label className="text-sm font-bold text-slate-700">Valor Total (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                required
                value={formData.valor_total}
                onChange={(e) =>
                  setFormData({ ...formData, valor_total: formatCurrencyInput(e.target.value) })
                }
                className="w-full rounded-xl border-2 border-emerald-200 bg-emerald-50/10 px-4 py-3 text-slate-900 font-bold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
              />
            </div>

            <>
              <div className="space-y-2 col-span-full">
                <label className="text-sm font-medium text-slate-700">Método de Pagamento</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    disabled={hasPaidPayments}
                    onClick={() => setPaymentOptions({ ...paymentOptions, metodo_pagamento: 'SINAL' })}
                    className={`flex items-center justify-center px-4 py-3 rounded-xl border-2 transition-all font-medium disabled:cursor-not-allowed disabled:opacity-60 ${
                      paymentOptions.metodo_pagamento === 'SINAL'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    Sinal + Parcelas
                  </button>
                  <button
                    type="button"
                    disabled={hasPaidPayments}
                    onClick={() => setPaymentOptions({ ...paymentOptions, metodo_pagamento: 'TOTAL' })}
                    className={`flex items-center justify-center px-4 py-3 rounded-xl border-2 transition-all font-medium disabled:cursor-not-allowed disabled:opacity-60 ${
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
                  disabled={hasPaidPayments}
                  value={paymentOptions.forma_pagamento}
                  onChange={(e) => setPaymentOptions({ ...paymentOptions, forma_pagamento: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all bg-white disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
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
                      disabled={hasPaidPayments}
                      value={paymentOptions.valor_sinal}
                      onChange={(e) =>
                        setPaymentOptions({
                          ...paymentOptions,
                          valor_sinal: formatCurrencyInput(e.target.value)
                        })
                      }
                      className="w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Data do Sinal</label>
                    <input
                      type="date"
                      disabled={hasPaidPayments}
                      value={paymentOptions.data_sinal}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setPaymentOptions({ ...paymentOptions, data_sinal: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Parcelas (Saldo Restante)</label>
                    <select
                      disabled={hasPaidPayments}
                      value={paymentOptions.num_parcelas}
                      onChange={(e) => setPaymentOptions({ ...paymentOptions, num_parcelas: Number(e.target.value) })}
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all bg-white disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                    >
                      {[1, 2, 3, 4, 5, 6, 12].map(n => (
                        <option key={n} value={n}>{n}x</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <div className="col-span-full p-4 rounded-2xl bg-emerald-50 border border-emerald-100 italic text-sm text-emerald-700">
                  ✅ O valor total será registrado como pago integral ao salvar.
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
                              disabled={hasPaidPayments}
                              value={installment.due}
                              onChange={(e) => handleUpdateInstallmentDate(idx, e.target.value)}
                              className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all bg-slate-50 font-medium cursor-pointer disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {hasPaidPayments && (
                <div className="col-span-full p-4 rounded-2xl bg-amber-50 border border-amber-100 italic text-sm text-amber-700">
                  ⚠️ Existem pagamentos já realizados para esta reserva. O cronograma financeiro não será recalculado automaticamente para preservar o histórico. Ajustes manuais podem ser necessários.
                </div>
              )}
            </>

          </div>

          <div className="pt-6 flex justify-end items-center border-t border-slate-100">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (window.confirm('Deseja realmente excluir esta reserva? Todos os pagamentos e o contrato também serão removidos.')) {
                    try {
                      await api.delete(`/reservations/${id}`);
                      toast.success('Reserva excluída!');
                      router.push('/dashboard/reservations');
                    } catch (error) {
                      toast.error('Erro ao excluir reserva');
                    }
                  }
                }}
                className="bg-rose-50 hover:bg-rose-100 text-rose-700 px-6 py-3 rounded-xl font-bold shadow-sm border border-rose-200 flex items-center gap-2 transition-all active:scale-95"
              >
                Excluir Reserva
              </button>
              <Link
                href="/dashboard/reservations"
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-3 rounded-xl font-bold shadow-sm flex items-center gap-2 transition-all active:scale-95"
              >
                <LogOut className="h-5 w-5" />
                Sair
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-70"
              >
                <Save className="h-5 w-5" />
                {submitting ? 'Salvando...' : 'Salvar e Sair'}
              </button>
            </div>
          </div>

          <div className="mt-4 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-slate-100">
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
                Enviar resumo atualizado para o WhatsApp do locatário
              </span>
            </label>
          </div>
        </form>
      </div>
    </div>
  );
}
