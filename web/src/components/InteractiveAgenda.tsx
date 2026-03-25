'use client';

import { useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  startOfDay,
  startOfMonth,
  isSameDay,
  isBefore,
  isAfter
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Building2, Users, Receipt, CalendarDays, CheckCircle2, MessageCircle, Sparkles } from 'lucide-react';
import CopyLinkButton from './CopyLinkButton';

type Booking = {
  startDateStr: string;
  endDateStr: string;
};

type InteractiveAgendaProps = {
  property: {
    nome: string;
    descricao: string | null;
    valor_diaria: number;
    capacidade_maxima: number;
    comodidades?: string;
    proprietario: {
      nome: string;
      telefone: string | null;
    };
  };
  bookings: Booking[];
};

export default function InteractiveAgenda({ property, bookings }: InteractiveAgendaProps) {
  const [checkin, setCheckin] = useState<Date | null>(null);
  const [checkout, setCheckout] = useState<Date | null>(null);

  const today = startOfDay(new Date());
  const calendarStart = today;
  const calendarStartMonth = startOfMonth(today);
  const calendarEnd = endOfMonth(addMonths(calendarStartMonth, 11)); // Mostra 12 meses (0 a 11)

  const monthStarts = Array.from({ length: 12 }, (_, index) =>
    startOfMonth(addMonths(calendarStartMonth, index))
  );

  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd
  });

  const formatDay = (d: Date) => format(d, 'yyyy-MM-dd');

  const isDayBooked = (day: Date) => {
    const dayStr = formatDay(day);
    return bookings.some(
      (booking) =>
        dayStr >= booking.startDateStr && dayStr <= booking.endDateStr
    );
  };

  const availableDays = calendarDays.filter((day) => !isDayBooked(day)).length;

  const comodidadesList = property.comodidades 
    ? property.comodidades.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const handleDayClick = (day: Date) => {
    if (day < calendarStart || isDayBooked(day)) return; // Ignora passado e dias reservados

    if (!checkin) {
      setCheckin(day);
      setCheckout(null);
      return;
    }

    if (checkin && !checkout) {
      if (isBefore(day, checkin)) {
        // Clicou antes do check-in: redefine check-in
        setCheckin(day);
        return;
      }
      
      // Verifica se há alguma reserva no meio do intervalo escolhido
      const rangeDays = eachDayOfInterval({ start: checkin, end: day });
      const hasBookingInBetween = rangeDays.some(d => isDayBooked(d));

      if (hasBookingInBetween) {
        // Se tem reserva no meio, reseta e começa de novo a partir do clique atual
        setCheckin(day);
        setCheckout(null);
      } else {
        setCheckout(day);
      }
      return;
    }

    if (checkin && checkout) {
      // Já tem os dois, recomeça a seleção
      setCheckin(day);
      setCheckout(null);
    }
  };

  const getDayClasses = (day: Date) => {
    const isPast = day < calendarStart;
    const booked = isDayBooked(day);
    const isSelectedCheckin = checkin && isSameDay(day, checkin);
    const isSelectedCheckout = checkout && isSameDay(day, checkout);
    const isBetween = checkin && checkout && isAfter(day, checkin) && isBefore(day, checkout);

    if (isPast) return 'text-slate-200 bg-slate-50 cursor-not-allowed';
    if (booked) return 'bg-red-50 text-red-500 border border-red-100 cursor-not-allowed';
    if (isSelectedCheckin || isSelectedCheckout) return 'bg-indigo-600 text-white shadow-md cursor-pointer hover:bg-indigo-700 font-black';
    if (isBetween) return 'bg-indigo-100 text-indigo-700 cursor-pointer';

    // Hover effect para dias normais clicáveis
    return 'bg-emerald-50 text-emerald-700 border border-emerald-100 cursor-pointer hover:bg-emerald-100 transition-colors';
  };

  const priceFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

  const generateWhatsappMessage = () => {
    let baseMsg = `Olá, vi seu imóvel "${property.nome}" no Aluga Fácil e gostaria de mais informações!`;
    
    if (checkin && checkout) {
      const startFmt = format(checkin, 'dd/MM/yyyy');
      const endFmt = format(checkout, 'dd/MM/yyyy');
      baseMsg = `Olá, vi seu imóvel "${property.nome}" no Aluga Fácil e gostaria de consultar a disponibilidade para o período de *${startFmt}* até *${endFmt}*!`;
    } else if (checkin) {
      const startFmt = format(checkin, 'dd/MM/yyyy');
      baseMsg = `Olá, vi seu imóvel "${property.nome}" no Aluga Fácil e tenho interesse a partir de *${startFmt}*!`;
    }

    return encodeURIComponent(baseMsg);
  };

  const telefoneLimpo = property.proprietario.telefone ? property.proprietario.telefone.replace(/\D/g, '') : null;
  const whatsappLink = telefoneLimpo 
    ? `https://api.whatsapp.com/send?phone=55${telefoneLimpo}&text=${generateWhatsappMessage()}`
    : null;

  return (
    <div className="max-w-5xl mx-auto px-4 mt-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-8">
        
        {/* Overview */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
          <div className="flex flex-wrap gap-4 mb-8">
            <div className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 flex items-center gap-3">
              <Users className="w-5 h-5 text-indigo-600" />
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Capacidade</p>
                <p className="font-bold text-slate-700">{property.capacidade_maxima} Pessoas</p>
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 flex items-center gap-3">
              <Receipt className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Preço Base</p>
                <p className="font-bold text-slate-700 text-lg">{priceFormatter.format(property.valor_diaria)} / diária</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-amber-500" />
                Sobre este lugar
              </h2>
              <p className="text-slate-600 leading-relaxed whitespace-pre-line text-lg">
                {property.descricao || "Este belo imóvel aguarda por você. Entre em contato para saber todas as informações detalhadas."}
              </p>
            </div>

            {comodidadesList.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4">O que este lugar oferece</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {comodidadesList.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-slate-600 bg-slate-50/50 p-2 rounded-lg">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="font-medium">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Calendar */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-indigo-600" />
              Datas Disponíveis
            </h2>
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-emerald-600">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Livre
              </span>
              <span className="flex items-center gap-1.5 font-semibold text-red-500">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                Reservado
              </span>
              <span className="flex items-center gap-1.5 font-semibold text-indigo-600">
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                Selecionado
              </span>
            </div>
          </div>

          {!checkin && (
            <div className="mb-6 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 text-center">
              <p className="text-sm text-indigo-800 font-medium">✨ Selecione os dias aqui no calendário para configurar seu pacote de locação.</p>
            </div>
          )}

          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-2">
            {monthStarts.map((monthStart) => { // Renderiza os 12 meses
              const monthEnd = endOfMonth(monthStart);
              const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
              const leadingBlanks = getDay(monthStart);
              const cells: (Date | null)[] = [
                ...Array.from({ length: leadingBlanks }, () => null),
                ...days,
              ];

              return (
                <div key={monthStart.toISOString()} className="space-y-4">
                  <p className="text-center font-bold text-slate-700 bg-slate-50 py-2 rounded-xl border border-slate-100">
                    {monthStart.toLocaleDateString('pt-BR', { month: 'long' }).replace(/^./, (c) => c.toUpperCase())} {format(monthStart, 'yyyy')}
                  </p>
                  <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(l => <div key={l}>{l}</div>)}
                  </div>
                  <div className="grid grid-cols-7 gap-1.5">
                    {cells.map((day, i) => {
                      if (!day) return <div key={`e-${i}`} />;
                      return (
                        <div
                          key={day.toISOString()}
                          onClick={() => handleDayClick(day)}
                          className={`aspect-square flex items-center justify-center rounded-lg text-xs font-bold select-none ${getDayClasses(day)}`}
                        >
                          {format(day, 'd')}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>


        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        <div className="sticky top-10 space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 text-center">
            <p className="text-slate-500 text-sm mb-2">A partir de</p>
            <p className="text-4xl font-black text-slate-900 mb-6">
              {priceFormatter.format(property.valor_diaria)}
              <span className="text-sm font-normal text-slate-500">/noite</span>
            </p>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm py-2 border-b border-slate-50">
                <span className="text-slate-500">Dias disponíveis</span>
                <span className="font-bold text-emerald-600">{availableDays} dias</span>
              </div>
              <div className="flex justify-between text-sm py-2 border-b border-slate-50">
                <span className="text-slate-500">Anfitrião</span>
                <span className="font-bold text-slate-800">{property.proprietario.nome}</span>
              </div>
            </div>

            {/* Painel de Datas Selecionadas na Sidebar */}
            <div className="mb-6 bg-slate-50 border border-slate-100 rounded-2xl p-4">
              {!checkin && !checkout && (
                <p className="text-[12px] text-slate-500 italic text-center leading-tight">
                   Faça sua simulação selecionando o <br/> Check-in e Check-out nas tabelas ao lado.
                </p>
              )}
              {checkin && !checkout && (
                <div className="text-center animate-pulse">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Próximo Passo</p>
                  <p className="text-sm font-black text-indigo-600">
                    Selecione a data de saída...
                  </p>
                </div>
              )}
              {checkin && checkout && (
                <div className="text-center">
                  <p className="text-[10px] uppercase font-bold text-emerald-600 mb-1">Período Selecionado</p>
                  <p className="text-sm font-black text-slate-800 bg-white border border-slate-200 py-2 rounded-xl mb-2 shadow-sm">
                    {format(checkin, 'dd/MM/yy')} <span className="text-slate-400 mx-1">até</span> {format(checkout, 'dd/MM/yy')}
                  </p>
                  <button 
                    onClick={() => { setCheckin(null); setCheckout(null); }}
                    className="text-[11px] font-bold text-slate-400 hover:text-red-500 transition-colors"
                  >
                    Desfazer seleção
                  </button>
                </div>
              )}
            </div>

            {whatsappLink ? (
              <a 
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white p-4 rounded-2xl font-bold shadow-lg shadow-emerald-500/20 transition-all active:scale-95 mb-4 group"
              >
                <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                {checkin && checkout ? 'Consultar Orçamento' : 'Falar no WhatsApp'}
              </a>
            ) : (
               <div className="p-4 bg-slate-50 text-slate-500 text-sm italic rounded-2xl mb-4 text-center">
                 Contato não disponível.
               </div>
            )}

            <CopyLinkButton label="Compartilhar" />
          </div>

          <div className="bg-indigo-600 rounded-3xl p-6 text-white text-center">
            <Building2 className="w-10 h-10 mx-auto mb-4 text-white/40" />
            <h4 className="font-bold mb-2">Anuncie também!</h4>
            <p className="text-indigo-100 text-xs mb-4">Gerencie suas locações e gere sua própria vitrine em minutos.</p>
            <a href="/register" className="inline-block bg-white text-indigo-600 px-6 py-2 rounded-xl text-xs font-bold hover:bg-indigo-50 transition-colors">
              Criar minha conta
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
