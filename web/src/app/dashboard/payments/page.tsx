'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';
import { Plus, CheckCircle, Clock, ExternalLink, Trash } from 'lucide-react';
import { toast } from 'react-toastify';
import { addDays, differenceInCalendarDays, format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { formatCurrencyBR } from '@/lib/utils';

type Payment = {
  id: string;
  tipo: string;
  valor: number;
  status: string;
  data_vencimento?: string | null;
  data_pagamento?: string | null;
  meio_pagamento?: string | null;
  reserva: {
    id: string;
    data_checkin: string;
    imovel: { nome: string };
    locatario: { nome: string };
  };
};

const statusOptions = ['Todos', 'Pendente', 'Pago'] as const;
const tipoOptions = ['Todos', 'Sinal', 'Restante', 'Parcela 1', 'Parcela 2', 'Total'];
const methodOptions = ['PIX', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito'] as const;

type FilterState = {
  status: typeof statusOptions[number];
  tipo: typeof tipoOptions[number];
  search: string;
};

const initialFilters: FilterState = {
  status: 'Todos',
  tipo: 'Todos',
  search: ''
};

function resolvePaymentDue(payment: Payment): string | undefined {
  if (payment.data_vencimento) return payment.data_vencimento;

  const checkin = payment.reserva?.data_checkin ? new Date(payment.reserva.data_checkin) : null;
  if (!checkin || Number.isNaN(checkin.getTime())) return undefined;

  const installmentMatch = payment.tipo.match(/Parcela\s*(\d+)\s*\/\s*\d+/i);
  if (installmentMatch) {
    const installmentNumber = Number(installmentMatch[1]);
    return addDays(checkin, 30 * installmentNumber).toISOString();
  }

  if (/restante/i.test(payment.tipo)) {
    return addDays(checkin, 30).toISOString();
  }

  if (/total/i.test(payment.tipo)) {
    return checkin.toISOString();
  }

  if (/sinal/i.test(payment.tipo)) {
    return payment.data_pagamento || checkin.toISOString();
  }

  return checkin.toISOString();
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(initialFilters.status);
  const [tipoFilter, setTipoFilter] = useState(initialFilters.tipo);
  const [search, setSearch] = useState(initialFilters.search);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [filtersDirty, setFiltersDirty] = useState(false);
  const filterDebounce = useRef<NodeJS.Timeout | null>(null);
  const [methodDialog, setMethodDialog] = useState<{ paymentId: string } | null>(null);
  const [methodMap, setMethodMap] = useState<Record<string, string>>({});

  const applyFilters = useCallback(() => {
    setAppliedFilters({
      status: statusFilter,
      tipo: tipoFilter,
      search
    });
    setFiltersDirty(false);
  }, [statusFilter, tipoFilter, search]);

  const clearFilters = useCallback(() => {
    setStatusFilter(initialFilters.status);
    setTipoFilter(initialFilters.tipo);
    setSearch(initialFilters.search);
    setAppliedFilters(initialFilters);
    setFiltersDirty(false);
  }, []);

  useEffect(() => {
    fetchPayments();
  }, []);

  async function fetchPayments() {
    try {
      const response = await api.get('/payments');
      setPayments(response.data);
    } catch (error) {
      toast.error('Erro ao carregar pagamentos');
    } finally {
      setLoading(false);
    }
  }

  const router = useRouter();

  async function markAsPaid(id: string, method: string) {
    try {
      const response = await api.patch(`/payments/${id}/status`, {
        status: 'Pago',
        meio_pagamento: method
      });
      const updatedPayment = response.data;
      toast.success('Pagamento confirmado!');
      setPayments((current) =>
        current.map((payment) =>
          payment.id === id
            ? {
                ...payment,
                status: 'Pago',
                meio_pagamento: updatedPayment?.meio_pagamento ?? method,
                data_pagamento: updatedPayment?.data_pagamento ?? payment.data_pagamento ?? null
              }
            : payment
        )
      );
      setMethodMap((current) => ({ ...current, [id]: method }));
      setMethodDialog(null);
    } catch (error) {
      toast.error('Erro ao confirmar pagamento');
    }
  }

  function openMethodDialog(id: string) {
    setMethodDialog({ paymentId: id });
  }

  async function handleDeletePayment(payment: Payment) {
    const confirmed = window.confirm(
      'Deseja cancelar a baixa deste pagamento? A parcela ficará pendente.'
    );
    if (!confirmed) return;

    try {
      await api.patch(`/payments/${payment.id}/status`, { status: 'Pendente', meio_pagamento: null });
      setPayments((current) =>
        current.map((item) =>
          item.id === payment.id
            ? { ...item, status: 'Pendente', data_pagamento: null, meio_pagamento: null }
            : item
        )
      );
      setMethodMap((current) => {
        const next = { ...current };
        delete next[payment.id];
        return next;
      });
      toast.success('Baixa cancelada');
    } catch (error) {
      toast.error('Erro ao excluir pagamento');
    }
  }

  async function handleMethodSelect(method: typeof methodOptions[number]) {
    if (!methodDialog) return;
    await markAsPaid(methodDialog.paymentId, method);
  }

  function handleViewReservation(reserva: Payment['reserva']) {
    router.push(`/dashboard/reservations/${reserva.id}/edit`);
  }

  useEffect(() => {
    if (
      statusFilter === appliedFilters.status &&
      tipoFilter === appliedFilters.tipo &&
      search === appliedFilters.search
    ) {
      setFiltersDirty(false);
      return;
    }

    setFiltersDirty(true);

    if (filterDebounce.current) {
      clearTimeout(filterDebounce.current);
    }

    filterDebounce.current = setTimeout(() => {
      applyFilters();
    }, 600);

    return () => {
      if (filterDebounce.current) {
        clearTimeout(filterDebounce.current);
      }
    };
  }, [statusFilter, tipoFilter, search, appliedFilters, applyFilters]);

  const normalizedPayments = useMemo(() => {
    return payments.map((payment) => {
      const dueDate = payment.data_vencimento || resolvePaymentDue(payment);
      return {
        ...payment,
        vencimento: dueDate,
        meio_pagamento: payment.meio_pagamento || '—'
      };
    });
  }, [payments]);

  const paymentsWithMethods = useMemo(() => {
    return normalizedPayments.map((payment) => ({
      ...payment,
      meio_pagamento: payment.meio_pagamento || methodMap[payment.id] || '—'
    }));
  }, [normalizedPayments, methodMap]);

  const filteredPayments = useMemo(() => {
    return paymentsWithMethods.filter((payment) => {
      const matchesStatus =
        appliedFilters.status === 'Todos' || payment.status === appliedFilters.status;
      const matchesTipo =
        appliedFilters.tipo === 'Todos' ||
        payment.tipo.toLowerCase().includes(appliedFilters.tipo.toLowerCase());
      const matchesSearch = [payment.reserva.imovel.nome, payment.reserva.locatario.nome].some((field) =>
        field.toLowerCase().includes(appliedFilters.search.toLowerCase())
      );
      return matchesStatus && matchesTipo && matchesSearch;
    });
  }, [paymentsWithMethods, appliedFilters]);

  const totals = useMemo(() => {
    const pending = paymentsWithMethods.filter((p) => p.status !== 'Pago');
    const paid = paymentsWithMethods.filter((p) => p.status === 'Pago');
    return {
      pendingCount: pending.length,
      pendingValue: pending.reduce((acc, payment) => acc + payment.valor, 0),
      paidCount: paid.length,
      paidValue: paid.reduce((acc, payment) => acc + payment.valor, 0)
    };
  }, [paymentsWithMethods]);

  const upcomingPayments = useMemo(() => {
    const today = new Date();
    return paymentsWithMethods
      .filter((payment) => payment.status !== 'Pago' && payment.vencimento)
      .filter((payment) => differenceInCalendarDays(new Date(payment.vencimento!), today) >= 0)
      .sort(
        (a, b) =>
          new Date(a.vencimento ?? today).getTime() - new Date(b.vencimento ?? today).getTime()
      )
      .slice(0, 3);
  }, [paymentsWithMethods]);

  const latestConfirmations = useMemo(() => {
    return paymentsWithMethods
      .filter((payment) => payment.status === 'Pago' && payment.data_pagamento)
      .sort(
        (a, b) =>
          new Date(b.data_pagamento ?? 0).getTime() - new Date(a.data_pagamento ?? 0).getTime()
      )
    .slice(0, 3);
  }, [paymentsWithMethods]);

  const selectedPayment = methodDialog
    ? payments.find((payment) => payment.id === methodDialog.paymentId) ?? null
    : null;

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Pagamentos</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pendentes</p>
          <p className="mt-2 text-2xl font-bold text-rose-600">R$ {formatCurrencyBR(totals.pendingValue)}</p>
          <p className="text-xs text-slate-500">{totals.pendingCount} cobranças</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Confirmados</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">R$ {formatCurrencyBR(totals.paidValue)}</p>
          <p className="text-xs text-slate-500">{totals.paidCount} pagamentos</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Aplicar filtros</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as typeof statusOptions[number])}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              >
                {statusOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <select
                value={tipoFilter}
                onChange={(event) => setTipoFilter(event.target.value as typeof tipoOptions[number])}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              >
                {tipoOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <input
                placeholder="Buscar imóvel ou locatário"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={applyFilters}
                disabled={!filtersDirty}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-all ${
                  filtersDirty
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                Aplicar filtros
                </button>
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-500 hover:border-slate-300 hover:text-slate-700 transition-colors"
              >
                Limpar filtros
              </button>
            </div>
          </div>
        </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Imóvel & Locatário</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Tipo</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Vencimento</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Valor</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Forma</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Status</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    Nenhum pagamento registrado.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{payment.reserva.imovel.nome}</div>
                      <div className="text-xs text-slate-500">{payment.reserva.locatario.nome}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                        {payment.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {payment.vencimento
                        ? format(new Date(payment.vencimento), 'dd/MM/yyyy')
                        : '—'}
                      {payment.vencimento && differenceInCalendarDays(new Date(payment.vencimento), new Date()) < 0 && payment.status !== 'Pago' && (
                        <span className="ml-2 text-[10px] font-semibold text-rose-500">Atrasado</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      R$ {formatCurrencyBR(payment.valor)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {payment.meio_pagamento || methodMap[payment.id] || '—'}
                    </td>
                    <td className="px-6 py-4">
                      {payment.status === 'Pago' ? (
                        <div className="flex items-center text-emerald-600 text-sm font-medium">
                          <CheckCircle className="h-4 w-4 mr-1.5" /> Pago
                          {payment.data_pagamento && <span className="text-xs text-slate-400 ml-2 font-normal">({format(new Date(payment.data_pagamento), 'dd/MM/yyyy')})</span>}
                        </div>
                      ) : (
                        <div className="flex items-center text-amber-500 text-sm font-medium">
                          <Clock className="h-4 w-4 mr-1.5" /> Pendente
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {payment.status === 'Pendente' && (
                          <button
                            onClick={() => openMethodDialog(payment.id)}
                            className="inline-flex h-9 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                          >
                            Baixar
                          </button>
                        )}
                        <button
                          onClick={() => handleViewReservation(payment.reserva)}
                          className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                          title="Ir para reserva"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Ver reserva
                        </button>
                        {payment.status === 'Pago' && (
                          <button
                            type="button"
                            onClick={() => handleDeletePayment(payment)}
                            className="inline-flex h-9 items-center gap-1 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash className="h-4 w-4" />
                            Cancelar baixa
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Próximos vencimentos</h2>
            <span className="text-xs text-slate-400">
              {upcomingPayments.length} registrados
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {upcomingPayments.length === 0 && (
              <p className="text-sm text-slate-500">Nenhum vencimento agendado nos próximos dias.</p>
            )}
            {upcomingPayments.map((payment) => (
              <div key={payment.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm">
                <div className="font-semibold text-slate-800">{payment.reserva.imovel.nome}</div>
                <div className="text-xs text-slate-500">
                  {payment.reserva.locatario.nome} • {payment.tipo}
                </div>
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span>Vencimento: {payment.vencimento ? format(new Date(payment.vencimento), 'dd/MM/yyyy') : '—'}</span>
                  <span className="font-semibold text-slate-900">R$ {formatCurrencyBR(payment.valor)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Últimas confirmações</h2>
            <span className="text-xs text-slate-400">{latestConfirmations.length} nos últimos dias</span>
          </div>
          <div className="mt-4 space-y-3">
            {latestConfirmations.length === 0 && (
              <p className="text-sm text-slate-500">Nenhum pagamento confirmado recentemente.</p>
            )}
            {latestConfirmations.map((payment) => (
              <div key={payment.id} className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm">
                <div className="font-semibold text-slate-900">{payment.reserva.imovel.nome}</div>
                <div className="text-xs text-slate-600">
                  {payment.reserva.locatario.nome} • {payment.tipo}
                </div>
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span>
                    Confirmado em {payment.data_pagamento ? format(new Date(payment.data_pagamento), 'dd/MM/yyyy') : '—'}
                  </span>
                  <span className="font-semibold text-slate-900">R$ {formatCurrencyBR(payment.valor)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {methodDialog && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setMethodDialog(null)}
          />
          <div className="relative rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 w-full max-w-md space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Confirmação</p>
                <p className="text-lg font-semibold text-slate-800">
                  {selectedPayment.reserva.imovel.nome}
                </p>
                <p className="text-xs text-slate-500">
                  {selectedPayment.reserva.locatario.nome} • {selectedPayment.tipo}
                </p>
              </div>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600"
                onClick={() => setMethodDialog(null)}
              >
                Fechar
              </button>
            </div>
            <p className="text-sm text-slate-600">
              Escolha a forma de pagamento utilizada antes de confirmar:
            </p>
            <div className="grid grid-cols-2 gap-2">
              {methodOptions.map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => handleMethodSelect(method)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-emerald-500 hover:text-emerald-700 transition-colors"
                >
                  {method}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
