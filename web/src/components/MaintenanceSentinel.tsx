'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

/**
 * MaintenanceSentinel - Proteção de Risco Zero
 * Monitora proativamente o estado de manutenção na Landing Page e Vitrine
 */
export default function MaintenanceSentinel() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // O monitoramento deve ocorrer em todas as páginas, inclusive na /maintenance para permitir o retorno.

    async function checkSystemStatus() {
      try {
        // Adicionamos um timestamp para 'quebrar' o cache do navegador
        const response = await api.get(`/public/config?t=${Date.now()}`, {
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
        });
        const isMaintenance = response.data?.isMaintenanceMode === true;
        console.log('[Maintenance] Status detectado:', isMaintenance);

        if (isMaintenance && pathname !== '/maintenance') {
          console.warn('[Maintenance] Ativando redirecionamento para manutenção...');
          window.location.href = '/maintenance';
        } else if (!isMaintenance && pathname === '/maintenance') {
          console.log('[Maintenance] Sistema online! Forçando retorno à tela de Login...');
          window.location.href = '/login';
        }
      } catch (error) {
        // Silêncio em erros de config para não quebrar a navegação normal
      }
    }

    checkSystemStatus();
  }, [pathname, router]);

  return null; // Componente invisível
}
