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
  };
  bookings: BookingResponse[];
};

async function fetchAvailability(id: string): Promise<PropertyAvailabilityResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';

  const response = await fetch(
    `${baseUrl}/api/public/properties/${id}/availability`,
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
  params: { id: string };
}) {
  const { id } = params;

  const availability = await fetchAvailability(id);

  const bookings = availability.bookings
    .map((booking) => ({
      ...booking,
      start: startOfDay(new Date(booking.checkin)),
      end: startOfDay(new Date(booking.checkout))
    }))
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
        day.getTime() < booking.end.getTime()
    );

  const availableDays = calendarDays.filter((day) => !isDayBooked(day)).length;

  const bookingsInRange = bookings.filter(
    (booking) =>
      booking.end > calendarStart &&
      booking.start <= calendarEnd
  );

  const priceFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

  const weekdayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const capitalizeMonthLabel = (label: string) =>
    label ? label[0].toLocaleUpperCase('pt-BR') + label.slice(1) : label;

  const formatMonthLabel = (date: Date) =>
    format(date, 'MMM', { locale: ptBR })
      .replace('.', '')
      .slice(0, 2)
      .toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4">
        <div className="rounded-3xl bg-white p-6 shadow-sm shadow-slate-900/5">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-wide text-slate-500">
                Agenda Compartilhável
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">
                {availability.property.nome}
              </h1>
              <p className="text-sm text-slate-500">
                {availability.property.endereco ?? 'Endereço não informado'}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
                  Capacidade: {availability.property.capacidade_maxima} hóspedes
                </span>
                <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
                  Diária {priceFormatter.format(availability.property.valor_diaria)}
                </span>
              </div>
            </div>
            <CopyLinkButton />
          </div>

          <p className="mt-6 text-sm text-slate-500">
            Esta agenda mostra os próximos 12 meses disponíveis e bloqueados.
            Envie o link para o possível locatário e ele verá automaticamente as datas ocupadas.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.5fr_0.5fr]">
          <div className="rounded-3xl bg-white p-6 shadow-sm shadow-slate-900/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Calendário anual
                </p>
                <p className="text-lg font-bold text-slate-900">
                  {availableDays} dias livres
                </p>
              </div>

              <div className="flex gap-2 text-xs">
                <span className="flex items-center gap-1 rounded-full border border-emerald-200 px-3 py-1 text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Disponível
                </span>
                <span className="flex items-center gap-1 rounded-full border border-red-200 px-3 py-1 text-red-700">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  Reservado
                </span>
              </div>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {monthStarts.map((monthStart) => {
                const monthEnd = endOfMonth(monthStart);
                const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
                const leadingBlanks = getDay(monthStart);
                const totalCells = leadingBlanks + days.length;
                const trailingBlanks = (7 - (totalCells % 7)) % 7;

                const cells = [
                  ...Array.from({ length: leadingBlanks }, () => null),
                  ...days,
                  ...Array.from({ length: trailingBlanks }, () => null)
                ];

                const availableInMonth = days.filter(
                  (day) => day >= calendarStart && !isDayBooked(day)
                ).length;

                return (
                  <div
                    key={monthStart.toISOString()}
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900">
                        {capitalizeMonthLabel(
                          format(monthStart, 'MMMM', { locale: ptBR })
                        )}{' '}
                        {format(monthStart, 'yyyy')}
                      </p>
                      <p className="text-xs text-slate-500">
                        {availableInMonth} livres
                      </p>
                    </div>

                    <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[9px] font-semibold uppercase text-slate-500">
                      {weekdayLabels.map((label) => (
                        <span key={label}>{label}</span>
                      ))}
                    </div>

                    <div className="mt-2 grid grid-cols-7 gap-2">
                      {cells.map((day, index) => {
                        if (!day) {
                          return <div key={`empty-${index}`} className="aspect-square" />;
                        }

                        const booked = isDayBooked(day);
                        const isPast = day < calendarStart;

                        return (
                          <div
                            key={day.toISOString()}
                            className={`aspect-square rounded-xl border p-1 text-[10px] font-semibold ${
                              isPast
                                ? 'border-slate-200 bg-slate-100 text-slate-400'
                                : booked
                                ? 'border-red-200 bg-red-50 text-red-700'
                                : 'border-emerald-100 bg-emerald-50 text-emerald-800'
                            }`}
                          >
                            <div className="text-sm">{format(day, 'd')}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm shadow-slate-900/5 lg:max-w-sm lg:justify-self-end">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Reservas confirmadas
              </p>
              <span className="text-xs text-slate-400">
                {bookingsInRange.length} entradas
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {bookingsInRange.length === 0 && (
                <p className="text-sm text-slate-500">
                  Nenhuma reserva registrada nos próximos 12 meses.
                </p>
              )}

              {bookingsInRange.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-900">
                      {format(booking.start, 'dd/MM/yyyy', { locale: ptBR })} -{' '}
                      {format(booking.end, 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                    <p className="text-xs text-slate-500">
                      {booking.locatario ?? 'Reserva sem nome'} • {booking.status}
                    </p>
                  </div>

                  <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
                    {booking.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}