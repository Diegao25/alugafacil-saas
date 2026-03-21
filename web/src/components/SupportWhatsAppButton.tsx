'use client';

import { useAuth } from '@/contexts/AuthContext';
import { inAppWhatsappSupportEnabled } from '@/lib/features';
import { MessageCircle } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

const buildTimeWhatsappNumber = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_NUMBER || '';

function normalizePhone(value: string) {
  return value.replace(/\D/g, '');
}

export default function SupportWhatsAppButton() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [runtimeWhatsappNumber, setRuntimeWhatsappNumber] = useState(buildTimeWhatsappNumber);
  const [runtimeFeatureEnabled, setRuntimeFeatureEnabled] = useState(inAppWhatsappSupportEnabled);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadRuntimeConfig() {
      try {
        const response = await fetch('/api/public-config', { cache: 'no-store' });

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        if (!mounted) {
          return;
        }

        setRuntimeWhatsappNumber(data.supportWhatsappNumber || '');
        setRuntimeFeatureEnabled(data.enableInAppWhatsappSupport !== false);
      } catch {
        // Keep build-time fallback when runtime config cannot be fetched.
      }
    }

    void loadRuntimeConfig();

    return () => {
      mounted = false;
    };
  }, []);

  const phone = useMemo(
    () => normalizePhone(runtimeWhatsappNumber || buildTimeWhatsappNumber),
    [runtimeWhatsappNumber]
  );

  if (!mounted || !runtimeFeatureEnabled || !phone) {
    return null;
  }

  const message = [
    'Olá! Preciso de ajuda no Aluga Fácil.',
    `Usuário: ${user?.nome || 'Não identificado'}`,
    `E-mail: ${user?.email || 'Não informado'}`,
    `Tela atual: ${pathname}`
  ].join('\n');

  const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  return createPortal(
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-5 right-5 z-[9999] inline-flex items-center gap-3 rounded-2xl bg-[#10b981] px-4 py-3 text-sm font-bold text-white shadow-xl shadow-emerald-700/30 transition-all hover:-translate-y-0.5 hover:bg-[#0ea271] lg:bottom-6 lg:right-6"
      aria-label="Falar com o suporte pelo WhatsApp"
      title="Falar com o suporte pelo WhatsApp"
    >
      <MessageCircle className="h-5 w-5" />
      <span className="hidden sm:inline">WhatsApp</span>
    </a>,
    document.body
  );
}
