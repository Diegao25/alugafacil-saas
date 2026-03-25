export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { notFound } from 'next/navigation';
import { Building2, MessageCircle, MapPin } from 'lucide-react';
import InteractiveAgenda from '@/components/InteractiveAgenda';

type BookingResponse = {
  id: string;
  checkin: string;
  checkout: string;
  hora_checkin: string | null;
  hora_checkout: string | null;
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

  const bookingsJson = availability.bookings
    .map((booking) => {
      const startStr = booking.checkin.split('T')[0];
      const endStr = booking.checkout.split('T')[0];
      
      return {
        startDateStr: startStr,
        endDateStr: endStr,
        hora_checkin: booking.hora_checkin || '18:00',
        hora_checkout: booking.hora_checkout || '18:00'
      };
    })
    .filter((booking) => booking.startDateStr <= booking.endDateStr);

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
            suppressHydrationWarning
            style={{ 
              backgroundImage: `url(${availability.property.foto_principal})`,
              backgroundColor: '#1e293b'
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

      <InteractiveAgenda property={availability.property} bookings={bookingsJson} />
    </div>
  );
}
