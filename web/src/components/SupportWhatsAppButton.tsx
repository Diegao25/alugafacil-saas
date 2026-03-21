'use client';

import { useAuth } from '@/contexts/AuthContext';
import { inAppWhatsappSupportEnabled } from '@/lib/features';
import { MessageCircle } from 'lucide-react';
import { usePathname } from 'next/navigation';

const whatsappNumber = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_NUMBER;

function normalizePhone(value: string) {
  return value.replace(/\D/g, '');
}

export default function SupportWhatsAppButton() {
  const { user } = useAuth();
  const pathname = usePathname();

  if (!inAppWhatsappSupportEnabled || !whatsappNumber || !user) {
    return null;
  }

  const phone = normalizePhone(whatsappNumber);

  if (!phone) {
    return null;
  }

  const message = [
    'Olá! Preciso de ajuda no Aluga Fácil.',
    `Usuário: ${user.nome}`,
    `E-mail: ${user.email}`,
    `Tela atual: ${pathname}`
  ].join('\n');

  const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-5 right-5 z-[65] inline-flex items-center gap-3 rounded-2xl bg-[#10b981] px-4 py-3 text-sm font-bold text-white shadow-xl shadow-emerald-700/30 transition-all hover:-translate-y-0.5 hover:bg-[#0ea271] lg:bottom-6 lg:right-6"
      aria-label="Falar com o suporte pelo WhatsApp"
      title="Falar com o suporte pelo WhatsApp"
    >
      <MessageCircle className="h-5 w-5" />
      <span className="hidden sm:inline">WhatsApp</span>
    </a>
  );
}
