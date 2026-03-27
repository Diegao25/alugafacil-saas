'use client';

// Logic for deletion if added later to the list view or calendar actions.
// I'll check if there's a list view in reservations.


import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'react-toastify';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ReservationSourceIcon from '@/components/ReservationSourceIcon';
import { Calendar as BigCalendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { Plus, User, Clock, CreditCard, ChevronRight, Home, DollarSign, CheckCircle2, AlertCircle, RefreshCcw } from 'lucide-react';
import { formatCurrencyBR } from '@/lib/utils';

const locales = {
  'pt-BR': ptBR,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: any) => startOfWeek(date, { locale: ptBR }),
  getDay,
  locales,
});

// Função para gerar cores consistentes baseadas em uma string
const getEventColor = (str: string, provider?: string) => {
  if (provider) {
    const p = provider.toLowerCase();
    if (p.includes('airbnb')) return '#ff385c'; // Airbnb Red
    if (p.includes('booking')) return '#003580'; // Booking Blue
    return '#64748b'; // Outros
  }

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
    '#ec4899', '#06b6d4', '#475569', '#14b8a6', '#f97316'
  ];
  return colors[Math.abs(hash) % colors.length];
};
const YearView: any = ({ date, events }: any) => {
  const year = date.getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-4 overflow-y-auto max-h-[800px] bg-slate-50/50 rounded-2xl">
      {months.map((monthDate) => {
        const monthStart = monthDate;
        const monthEnd = new Date(year, monthDate.getMonth() + 1, 0);
        const startDay = monthStart.getDay();
        const daysInMonth = monthEnd.getDate();
        
        const days = [];
        for (let i = 0; i < startDay; i++) days.push(null);
        for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, monthDate.getMonth(), i));

        return (
          <div key={monthDate.getMonth()} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all hover:border-emerald-200 group">
            <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-widest border-b border-slate-50 pb-3 text-center group-hover:text-emerald-600 transition-colors">
              {format(monthDate, 'MMMM', { locale: ptBR })}
            </h3>
            <div className="grid grid-cols-7 gap-1.5">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                <div key={`${d}-${i}`} className="text-[10px] text-center font-bold text-slate-300 py-1">{d}</div>
              ))}
              {days.map((dayDate, idx) => {
                if (!dayDate) return <div key={`empty-${monthDate.getMonth()}-${idx}`} />;
                
                const hasEvent = events.some((event: any) => {
                  const eventStart = new Date(event.start);
                  eventStart.setHours(0,0,0,0);
                  const eventEnd = new Date(event.end);
                  eventEnd.setHours(23,59,59,999);
                  return dayDate >= eventStart && dayDate <= eventEnd;
                });

                return (
                  <div 
                    key={dayDate.toISOString()}
                    className={`aspect-square flex items-center justify-center text-[10px] rounded-xl transition-all
                      ${hasEvent ? 'bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/20 scale-110 z-10' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}
                    `}
                  >
                    {dayDate.getDate()}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

YearView.range = (date: Date) => {
  return [new Date(date.getFullYear(), 0, 1), new Date(date.getFullYear(), 11, 31)];
};

YearView.navigate = (date: Date, action: string) => {
  switch (action) {
    case 'PREV': return new Date(date.getFullYear() - 1, 0, 1);
    case 'NEXT': return new Date(date.getFullYear() + 1, 0, 1);
    case 'TODAY': return new Date();
    default: return date;
  }
};

YearView.title = (date: Date) => format(date, 'yyyy');

export default function ReservationsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<any>(Views.MONTH);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    fetchReservations();
    fetchLastSync();
  }, [currentDate]);

  async function fetchLastSync() {
    try {
      const response = await api.get('/dashboard/stats');
      setLastSync(response.data.lastSync);
    } catch (error) {
      console.error('Erro ao buscar última sincronização:', error);
    }
  }

  const EventComponent = ({ event }: any) => {
    const reserva = event.resource;
    const isAgenda = currentView === 'agenda';
    const pagamentos = reserva.pagamentos || [];
    const totalPago = pagamentos
      .filter((p: any) => p.status === 'Pago')
      .reduce((acc: number, p: any) => acc + p.valor, 0);
    
    const isTotalPago = totalPago >= reserva.valor_total;
    const temSinalPago = pagamentos.some((p: any) => p.tipo === 'Sinal' && p.status === 'Pago');
  
    // Status colors and labels
    const statusConfig: any = {
      'Confirmada': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: <CheckCircle2 className="h-3 w-3" /> },
      'Pendente': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: <AlertCircle className="h-3 w-3" /> },
      'Cancelada': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', icon: <AlertCircle className="h-3 w-3" /> },
      'Em Análise': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: <Clock className="h-3 w-3" /> }
    };
  
    const status = statusConfig[reserva.status] || statusConfig['Pendente'];
  
    if (isAgenda) {
      return (
        <div className="relative flex flex-col p-4 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden">
          <div 
            className="absolute left-0 top-0 bottom-0 w-1.5" 
            style={{ backgroundColor: event.color }}
          />
  
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-slate-50 rounded-lg text-slate-400">
                  <Home className="h-4 w-4" />
                </span>
                <ReservationSourceIcon provider={reserva.provider} size={14} />
                <h4 className="font-bold text-slate-800 text-base">{reserva.imovel.nome}</h4>
                <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${status.bg} ${status.text} border ${status.border}`}>
                  {status.icon}
                  {reserva.status}
                </div>
              </div>
  
              <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-400" />
                  <span className="font-medium text-slate-700">{reserva.locatario?.nome || (reserva.provider ? `Bloqueio ${reserva.provider}` : 'Bloqueio')}</span>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Entrada</span>
                    <span className="font-semibold text-slate-700">{reserva.hora_checkin || '12:00'}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                  <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Saída</span>
                    <span className="font-semibold text-slate-700">{reserva.hora_checkout || '12:00'}</span>
                  </div>
                </div>
              </div>
            </div>
  
            <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center p-3 md:p-0 bg-slate-50 md:bg-transparent rounded-xl border border-slate-100 md:border-none">
              <div className="flex items-center gap-1.5 mb-1">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                <span className="text-xl font-black text-slate-900 leading-none">
                  {formatCurrencyBR(reserva.valor_total)}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {isTotalPago ? (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold border border-emerald-200">
                    <CheckCircle2 className="h-3 w-3" /> PAGO TOTAL
                  </span>
                ) : temSinalPago ? (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold border border-amber-200">
                    SINAL PAGO
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-bold border border-slate-200">
                    PENDENTE
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }
  
    return (
      <div className="flex flex-col h-full py-0.5 px-1.5 leading-tight overflow-hidden relative">
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }} />
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <div className="flex items-center gap-1 truncate">
            <ReservationSourceIcon provider={reserva.provider} size={10} className="text-white/80 shrink-0" />
            <span className="font-bold truncate text-[10px] text-white/95 uppercase tracking-tight">
              {reserva.imovel.nome}
            </span>
          </div>
          {isTotalPago && <CheckCircle2 className="h-2.5 w-2.5 text-white/90 shrink-0" />}
        </div>
        <div className="text-[10px] font-medium truncate text-white leading-none mb-1">
          {reserva.locatario?.nome || (reserva.provider ? `Bloqueio ${reserva.provider}` : 'Bloqueio')}
        </div>
        <div className="text-[8px] font-bold text-white/80 mt-auto flex items-center justify-between">
          <span>In: {reserva.hora_checkin || '18:00'} &bull; Out: {reserva.hora_checkout || '18:00'}</span>
          <span>R$ {formatCurrencyBR(reserva.valor_total)}</span>
        </div>
      </div>
    );
  };

  async function fetchReservations() {
    try {
      const response = await api.get('/reservations');
      const formattedEvents = response.data.map((reserva: any) => {
        // Extrair apenas o YYYY-MM-DD para garantir que o navegador interprete como dia local
        const [inYear, inMonth, inDay] = reserva.data_checkin.split('T')[0].split('-').map(Number);
        const [outYear, outMonth, outDay] = reserva.data_checkout.split('T')[0].split('-').map(Number);
        
        const start = new Date(inYear, inMonth - 1, inDay, 0, 0, 0);
        const end = new Date(outYear, outMonth - 1, outDay, 23, 59, 59);
        
        return {
          id: reserva.id,
          title: `${reserva.imovel.nome} - ${reserva.locatario?.nome || (reserva.provider ? `Bloqueio ${reserva.provider}` : 'Bloqueio')}`,
          start,
          end,
          resource: reserva,
          color: getEventColor(reserva.imovel_id, reserva.provider)
        };
      });
      setEvents(formattedEvents);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      await api.post('/properties/sync/all');
      toast.success('Calendário sincronizado com sucesso!');
      await fetchReservations();
    } catch (error) {
      console.error('Erro ao sincronizar:', error);
      toast.error('Não foi possível sincronizar no momento.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleNavigate = (newDate: Date) => {
    setCurrentDate(newDate);
  };

  const handleViewChange = (newView: any) => {
    setCurrentView(newView);
  };

  const eventPropGetter = (event: any) => {
    const isAgenda = currentView === 'agenda';
    if (isAgenda) {
      return {
        style: {
          backgroundColor: 'transparent',
          color: 'inherit',
          border: 'none',
          padding: 0
        }
      };
    }
    return {
      style: {
        backgroundColor: event.color,
        borderRadius: '6px',
        border: 'none',
        display: 'block',
        color: 'white',
        fontWeight: '500',
        padding: '2px 4px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }
    };
  };

  const handleSelectEvent = (event: any) => {
    router.push(`/dashboard/reservations/${event.id}/edit`);
  };


  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent"></div>
    </div>
  );

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Calendário de Reservas</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSyncAll}
            disabled={isSyncing}
            title={lastSync ? `Sincronizado ${formatDistanceToNow(new Date(lastSync), { addSuffix: true, locale: ptBR })}` : 'Sincronizar reservas externas'}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all active:scale-95 border ${
              isSyncing 
              ? 'bg-slate-100 text-slate-400 border-slate-100 cursor-not-allowed' 
              : 'bg-white text-emerald-600 border-emerald-100 hover:bg-emerald-50 shadow-sm'
            }`}
          >
            <RefreshCcw size={16} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'SINCRONIZANDO...' : 'SINCRONIZAR'}
          </button>

          <Link 
            href="/dashboard/reservations/new" 
            className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Reserva</span>
          </Link>
        </div>
      </div>

      <div className="flex-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 min-h-[800px]">
        <style jsx global>{`
          .rbc-calendar { font-family: inherit; font-size: 14px; color: #1e293b; }
          .rbc-today { background-color: #f0fdf4; }
          .rbc-header { padding: 15px 0; font-weight: 700; color: #64748b; text-transform: uppercase; font-size: 11px; letter-spacing: 0.1em; border-bottom: 2px solid #f1f5f9; }
          .rbc-toolbar { margin-bottom: 24px; }
          .rbc-toolbar button { border-radius: 10px; border: 1px solid #e2e8f0; color: #475569; font-weight: 600; padding: 8px 16px; transition: all 0.2s; background: white; }
          .rbc-toolbar button:hover { background-color: #f8fafc; color: #0f172a; border-color: #cbd5e1; }
          .rbc-toolbar button:active, .rbc-toolbar button.rbc-active { background-color: #0f172a !important; color: white !important; border-color: #0f172a !important; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
          .rbc-off-range-bg { background-color: #f8fafc; }
          .rbc-month-view { border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; background: white; }
          .rbc-month-row { min-height: 120px; }
          .rbc-event { border: none !important; margin-bottom: 2px !important; }
          .rbc-row-segment { padding: 0 4px !important; }
          
          /* Show more link styling */
          .rbc-show-more { color: #020617; font-weight: 800; font-size: 11px; padding: 4px; background: #f1f5f9; border-radius: 4px; margin: 2px; }
          
          /* Agenda View Redesign */
          .rbc-agenda-view { border: none !important; }
          .rbc-agenda-view table.rbc-agenda-table { border: none; }
          .rbc-agenda-view table.rbc-agenda-table thead > tr > th { display: none; }
          .rbc-agenda-view .rbc-agenda-content { border: none; }
          
          .rbc-agenda-view tr { display: flex; flex-direction: column; margin-bottom: 32px; background: transparent !important; }
          .rbc-agenda-view tr:hover { transform: none; }
          
          .rbc-agenda-date-cell { 
            position: sticky; top: 0; z-index: 10;
            background: #f8fafc !important; 
            padding: 10px 16px !important; 
            font-weight: 800; color: #475569; 
            font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em;
            border: none !important; border-bottom: 1px solid #e2e8f0 !important;
            margin-bottom: 12px;
          }
          
          .rbc-agenda-time-cell { display: none; }
          
          .rbc-agenda-event-cell { padding: 0 !important; border: none !important; }
          .rbc-agenda-event-cell .rbc-event { background: none !important; padding: 0 !important; box-shadow: none !important; }
          
          /* Month navigation arrows title */
          .rbc-toolbar-label { font-size: 1.25rem; font-weight: 800; color: #1e293b; }

          @media (max-width: 768px) {
            .rbc-toolbar { flex-direction: column; gap: 16px; }
            .rbc-toolbar-label { order: -1; margin-bottom: 8px; }
            .rbc-toolbar button { flex: 1; font-size: 12px; padding: 6px 10px; }
          }
        `}</style>
        <BigCalendar
          localizer={localizer}
          events={events}
          date={currentDate}
          onNavigate={handleNavigate}
          view={currentView}
          onView={handleViewChange}
          onSelectEvent={handleSelectEvent}
          startAccessor="start"
          endAccessor="end"
          culture="pt-BR"
          eventPropGetter={eventPropGetter}
          views={{
            month: true,
            week: true,
            day: true,
            agenda: true,
            year: YearView
          }}
          components={{
            event: EventComponent
          }}
          messages={{
            next: "Próximo",
            previous: "Anterior",
            today: "Hoje",
            month: "Mês",
            week: "Semana",
            day: "Dia",
            agenda: "Agenda",
            year: "Ano",
            date: "Data",
            time: "Hora",
            event: "Evento",
            allDay: "Dia Inteiro",
            noEventsInRange: "Nenhuma reserva neste período."
          }}
          style={{ height: currentView === 'year' ? 'auto' : '840px', minHeight: '600px' }}
        />
      </div>
    </div>
  );
}
