import { prisma } from '../prisma';
import ical from 'node-ical';
import axios from 'axios';

class CalendarService {
  /**
   * Reseta sincronizações que ficaram presas no estado 'syncing'
   * útil para rodar no bootstrap do servidor após uma queda/crash.
   */
  async resetStuckSyncs() {
    try {
      const res = await (prisma as any).calendarSync.updateMany({
        where: { status: 'syncing' },
        data: { 
          status: 'error', 
          last_error: 'Sincronização interrompida por reinicialização do servidor.' 
        }
      });
      if (res.count > 0) {
        console.log(`[CalendarSync] 🧹 Limpeza de boot: ${res.count} sincronizações destravadas.`);
      }
    } catch (error) {
      console.error('[CalendarSync] Erro ao resetar syncs travadas no boot:', error);
    }
  }
}

export const calendarService = new CalendarService();

export const syncExternalCalendars = async (propertyId: string) => {
  console.log(`[CalendarSync] Iniciando sincronização para o imóvel: ${propertyId}`);
  
  const syncConfigs = await (prisma as any).calendarSync.findMany({
    where: { imovel_id: propertyId }
  });

  if (syncConfigs.length === 0) {
    console.log(`[CalendarSync] Nenhuma configuração de sincronização encontrada para ${propertyId}`);
    return { success: true, imported: 0, removed: 0, updated: 0, hasConfigs: false };
  }

  let totalImported = 0;
  let totalRemoved = 0;
  let totalUpdated = 0;

  // Executar sincronizações dos provedores em PARALELO
  const syncPromises = syncConfigs.map(async (config: any) => {
    // 0. Trava de concorrência com Auto-Cura (2 minutos)
    const isSyncing = (config as any).status === 'syncing';
    const lastUpdate = new Date((config as any).updated_at).getTime();
    const isStale = Date.now() - lastUpdate > 2 * 60 * 1000; // 2 minutos

    if (isSyncing && !isStale) {
      console.log(`[CalendarSync] Ignorando ${config.provider} - já em sincronização recente.`);
      return;
    }

    if (isSyncing && isStale) {
      console.log(`[CalendarSync] Sincronização de ${config.provider} estava travada (mais de 2min). Forçando reinício.`);
    }

    try {
      // Marcar como sincronizando e forçar atualização do timestamp para a auto-cura
      await (prisma as any).calendarSync.update({
        where: { id: config.id },
        data: { 
          status: 'syncing',
          updated_at: new Date()
        }
      });

      console.log(`[CalendarSync] Buscando calendário de: ${config.provider} (${config.external_url})`);
      
      const response = await axios.get(config.external_url, { 
        timeout: 10000, // Reduzido de 15s para 10s por provedor
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/calendar, text/plain, */*'
        }
      });
      
      // Validação de Conteúdo (Evita Falso Positivo)
      const content = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
      if (!content.includes('BEGIN:VCALENDAR')) {
        throw new Error('O link não contém um calendário iCal válido (Tag BEGIN:VCALENDAR não encontrada).');
      }

      const data = ical.parseICS(content);
      const externalIdsInFeed: string[] = [];
      let eventCount = 0;

      for (const k in data) {
        if (Object.prototype.hasOwnProperty.call(data, k)) {
          const ev = data[k] as any;
          if (ev.type === 'VEVENT') {
            eventCount++;
            const externalId = ev.uid 
              ? `${config.provider}-${ev.uid}-${propertyId}` 
              : `${config.provider}-${ev.start?.toISOString() || Date.now()}-${propertyId}`;
              
            externalIdsInFeed.push(externalId);

            // Verificar se já existe para não duplicar
            const existing = await (prisma as any).reservation.findUnique({
              where: { external_id: externalId }
            });

            const property = await prisma.property.findUnique({
              where: { id: propertyId },
              select: { valor_diaria: true }
            });

            const checkoutDate = new Date(ev.end);
            const checkinDate = new Date(ev.start);
            const diffTime = Math.abs(checkoutDate.getTime() - checkinDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
            const estimatedValue = (property?.valor_diaria || 0) * diffDays;

            if (!existing) {
              await (prisma as any).reservation.create({
                data: {
                  imovel_id: propertyId,
                  data_checkin: checkinDate,
                  data_checkout: checkoutDate,
                  valor_total: estimatedValue,
                  status: `Bloqueado (${config.provider})`,
                  external_id: externalId,
                  provider: config.provider
                }
              });
              totalImported++;
            } else {
              const existingCheckin = new Date(existing.data_checkin).toISOString().split('T')[0];
              const existingCheckout = new Date(existing.data_checkout).toISOString().split('T')[0];
              const newCheckin = checkinDate.toISOString().split('T')[0];
              const newCheckout = checkoutDate.toISOString().split('T')[0];

              if (existingCheckin !== newCheckin || existingCheckout !== newCheckout || (existing.valor_total === 0)) {
                await (prisma as any).reservation.update({
                  where: { id: existing.id },
                  data: {
                    data_checkin: checkinDate,
                    data_checkout: checkoutDate,
                    valor_total: existing.valor_total === 0 ? estimatedValue : existing.valor_total
                  }
                });
                totalUpdated++;
              }
            }
          }
        }
      }

      // 2. Remover reservas que não estão mais no feed
      const existingExternalReservations = await (prisma as any).reservation.findMany({
        where: {
          imovel_id: propertyId,
          provider: config.provider,
          NOT: { external_id: null }
        },
        select: { id: true, external_id: true }
      });

      for (const reservation of existingExternalReservations) {
        if (!externalIdsInFeed.includes(reservation.external_id)) {
          await (prisma as any).reservation.delete({
            where: { id: reservation.id }
          });
          totalRemoved++;
        }
      }

      // Finalizar com Sucesso
      await (prisma as any).calendarSync.update({
        where: { id: config.id },
        data: { 
          last_sync: new Date(),
          status: 'success',
          last_error: null
        }
      });

    } catch (error: any) {
      console.error(`[CalendarSync] Erro ao sincronizar ${config.provider}:`, error.message);
      await (prisma as any).calendarSync.update({
        where: { id: config.id },
        data: { 
          status: 'error',
          last_error: error.message || 'Erro desconhecido'
        }
      });
    }
  });

  await Promise.all(syncPromises);

  return { success: true, imported: totalImported, removed: totalRemoved, updated: totalUpdated, hasConfigs: true };
};

export const syncUserProperties = async (userId: string) => {
  console.log(`[CalendarSync] Iniciando sincronização para o usuário: ${userId}`);
  
  const properties = await (prisma as any).property.findMany({
    where: { usuario_id: userId },
    select: { id: true }
  });

  console.log(`[CalendarSync] Encontrados ${properties.length} imóveis para sincronizar.`);

  const results = await Promise.all(
    properties.map(async (p: any) => {
      try {
        return await syncExternalCalendars(p.id);
      } catch (error: any) {
        console.error(`[CalendarSync] Erro ao sincronizar imóvel ${p.id}:`, error);
        return { success: false, error };
      }
    })
  );

  return results;
};

export const syncAllProperties = async () => {
  console.log('[CalendarSync] Iniciando sincronização global...');
  
  // Pegar configurações de sincronização APENAS de usuários no Plano Completo ou em Trial
  const syncConfigs = await (prisma as any).calendarSync.findMany({
    where: {
      imovel: {
        user: {
          OR: [
            { plan_name: 'Plano Completo' },
            { subscription_status: 'trial_active' }
          ]
        }
      }
    },
    select: { imovel_id: true }
  });

  // Unique property IDs
  const propertyIds = Array.from(new Set(syncConfigs.map((c: any) => c.imovel_id)));

  console.log(`[CalendarSync] Encontrados ${propertyIds.length} imóveis elegíveis para sincronização automática.`);

  for (const propertyId of propertyIds as string[]) {
    try {
      await syncExternalCalendars(propertyId);
    } catch (error) {
      console.error(`[CalendarSync] Erro crítico ao sincronizar imóvel ${propertyId}:`, error);
    }
  }

  console.log('[CalendarSync] Sincronização global concluída.');
};
