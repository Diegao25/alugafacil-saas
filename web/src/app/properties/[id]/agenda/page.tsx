export const dynamic = 'force-dynamic';
export const revalidate = 0;

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  startOfDay,
  startOfMonth
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { notFound } from 'next/navigation';
import CopyLinkButton from '@/components/CopyLinkButton';
import { Building2, Users, Receipt, CalendarDays, CheckCircle2, MessageCircle, MapPin, Sparkles } from 'lucide-react';

type BookingResponse = {
  id: string;
  checkin: string;
  checkout: string;
  status: string;
  locatario: string | null;
};

type PropertyAvailabilityResponse = {
  property: {
    id: string;
    nome: string;
    endereco: string | null;
    descricao: string | null;
    valor_diaria: number;
    capacidade_maxima: number;
    foto_principal?: string;
    comodidades?: string;
    redes_sociais_url?: string;
    proprietario: {
      nome: string;
      telefone: string | null;
    };
  };
  bookings: BookingResponse[];
};

function getApiOrigin() {
  const configuredBaseUrl =
    process.env.NEXT_PUBLIC_API_URL ?? process.env.API_BASE_URL;

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/api\/?$/, '');
  }

  if (process.env.NODE_ENV === 'production') {
    return 'https://easygoing-backend-production.up.railway.app';
  }

  return 'http://localhost:3333';
}

async function fetchAvailability(id: string): Promise<PropertyAvailabilityResponse> {
  const apiOrigin = getApiOrigin();

  const response = await fetch(
    `${apiOrigin}/api/public/properties/${id}/availability`,
    {
      cache: 'no-store'
    }
  );

  if (response.status === 404) {
    notFound();
  }

  if (!response.ok) {
    throw new Error('Não foi possível carregar a agenda.');
  }

  return response.json();
}

export default async function PropertyAgendaPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const availability = await fetchAvailability(id);

  const bookings = availability.bookings
    .map((booking) => {
      // Extrair componentes de data diretamente da string para evitar problemas de fuso horário
      const [sy, sm, sd] = booking.checkin.split('T')[0].split('-').map(Number);
      const [ey, em, ed] = booking.checkout.split('T')[0].split('-').map(Number);
      
      return {
        ...booking,
        start: new Date(sy, sm - 1, sd, 0, 0, 0, 0),
        end: new Date(ey, em - 1, ed, 0, 0, 0, 0)
      };
    })
    .filter((booking) => booking.start < booking.end);

  const today = startOfDay(new Date());
  const calendarStart = today;
  const calendarStartMonth = startOfMonth(today);
  const calendarEnd = endOfMonth(addMonths(calendarStartMonth, 11));

  const monthStarts = Array.from({ length: 12 }, (_, index) =>
    startOfMonth(addMonths(calendarStartMonth, index))
  );

  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd
  });

  const isDayBooked = (day: Date) =>
    bookings.some(
      (booking) =>
        day.getTime() >= booking.start.getTime() &&
        day.getTime() <= booking.end.getTime()
    );

  const availableDays = calendarDays.filter((day) => !isDayBooked(day)).length;

  const priceFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

  const weekdayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const capitalizeMonthLabel = (label: string) =>
    label ? label[0].toLocaleUpperCase('pt-BR') + label.slice(1) : label;

  const comodidadesList = availability.property.comodidades 
    ? availability.property.comodidades.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const whatsappLink = availability.property.proprietario.telefone 
    ? `https://api.whatsapp.com/send?phone=55${availability.property.proprietario.telefone.replace(/\D/g, '')}&text=${encodeURIComponent(`Olá, vi seu imóvel "${availability.property.nome}" no Aluga Fácil e gostaria de mais informações!`)}`
    : null;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header / Hero */}
      <div className="relative h-[400px] w-full bg-slate-900 overflow-hidden">
        {availability.property.foto_principal ? (
          <div 
            className="w-full h-full bg-cover bg-center transition-opacity duration-700" 
            style={{ 
              backgroundImage: `url(${availability.property.foto_principal})`,
              backgroundColor: '#1e293b' // Fallback slate-800
            }}
          >
            {/* Overlay para legibilidade quando a imagem carrega */}
            <div className="absolute inset-0 bg-black/40" />
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center">
            <Building2 className="w-24 h-24 text-white/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 bg-gradient-to-t from-black/80 to-transparent">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                {availability.property.nome}
              </h1>
              <div className="flex items-center gap-2 text-white/90">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-medium">{availability.property.endereco}</span>
              </div>
            </div>
            {whatsappLink && (
              <a 
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95"
              >
                <MessageCircle className="w-6 h-6" />
                Reservar agora
              </a>
            )}
          </div>
        </div>
      </div>

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
                  <p className="font-bold text-slate-700">{availability.property.capacidade_maxima} Pessoas</p>
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 flex items-center gap-3">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Preço Base</p>
                  <p className="font-bold text-slate-700 text-lg">{priceFormatter.format(availability.property.valor_diaria)} / diária</p>
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
                  {availability.property.descricao || "Este belo imóvel aguarda por você. Entre em contato para saber todas as informações detalhadas."}
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

          {/* Calendário */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <CalendarDays className="w-6 h-6 text-indigo-600" />
                Datas Disponíveis
              </h2>
              <div className="flex gap-2 text-xs">
                <span className="flex items-center gap-1.5 font-semibold text-emerald-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  Livre
                </span>
                <span className="flex items-center gap-1.5 font-semibold text-red-500">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  Reservado
                </span>
              </div>
            </div>

            <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-2">
              {monthStarts.slice(0, 4).map((monthStart) => {
                const monthEnd = endOfMonth(monthStart);
                const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
                const leadingBlanks = getDay(monthStart);
                const cells = [
                  ...Array.from({ length: leadingBlanks }, () => null),
                  ...days,
                ];

                return (
                  <div key={monthStart.toISOString()} className="space-y-4">
                    <p className="text-center font-bold text-slate-700 bg-slate-50 py-2 rounded-xl border border-slate-100">
                      {capitalizeMonthLabel(format(monthStart, 'MMMM', { locale: ptBR }))} {format(monthStart, 'yyyy')}
                    </p>
                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400">
                      {weekdayLabels.map((l) => <div key={l}>{l}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-1.5">
                      {cells.map((day, i) => {
                        if (!day) return <div key={`e-${i}`} />;
                        const booked = isDayBooked(day);
                        const isPast = day < calendarStart;
                        return (
                          <div
                            key={day.toISOString()}
                            className={`aspect-square flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
                              isPast ? 'text-slate-200 bg-slate-50' : 
                              booked ? 'bg-red-50 text-red-500 border border-red-100' : 
                              'bg-emerald-50 text-emerald-700 border border-emerald-100 cursor-default'
                            }`}
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
            
            <p className="mt-8 text-center text-sm text-slate-500 italic">
              Calendário simplificado mostrando os próximos meses. Consulte para outras datas no botão abaixo.
            </p>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="sticky top-10 space-y-6">
            <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 text-center">
              <p className="text-slate-500 text-sm mb-2">A partir de</p>
              <p className="text-4xl font-black text-slate-900 mb-6">
                {priceFormatter.format(availability.property.valor_diaria)}
                <span className="text-sm font-normal text-slate-500">/noite</span>
              </p>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm py-2 border-b border-slate-50">
                  <span className="text-slate-500">Dias disponíveis</span>
                  <span className="font-bold text-emerald-600">{availableDays} dias</span>
                </div>
                <div className="flex justify-between text-sm py-2 border-b border-slate-50">
                  <span className="text-slate-500">Anfitrião</span>
                  <span className="font-bold text-slate-800">{availability.property.proprietario.nome}</span>
                </div>
              </div>

              {whatsappLink && (
                <a 
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white p-4 rounded-2xl font-bold shadow-lg shadow-emerald-500/20 transition-all active:scale-95 mb-4"
                >
                  <MessageCircle className="w-5 h-5" />
                  Falar no WhatsApp
                </a>
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
    </div>
  );
}
