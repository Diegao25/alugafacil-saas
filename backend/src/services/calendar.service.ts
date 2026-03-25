import { prisma } from '../prisma';
import ical from 'node-ical';
import axios from 'axios';

export const syncExternalCalendars = async (propertyId: string) => {
  console.log(`[CalendarSync] Iniciando sincronização para o imóvel: ${propertyId}`);
  
  const syncConfigs = await (prisma as any).calendarSync.findMany({
    where: { imovel_id: propertyId }
  });

  if (syncConfigs.length === 0) {
    console.log(`[CalendarSync] Nenhuma configuração de sincronização encontrada para ${propertyId}`);
    return { success: true, processed: 0 };
  }

  let totalImported = 0;
  let totalRemoved = 0;
  let totalUpdated = 0;

  for (const config of syncConfigs) {
    try {
      console.log(`[CalendarSync] Buscando calendário de: ${config.provider} (${config.external_url})`);
      
      const response = await axios.get(config.external_url, { timeout: 15000 });
      console.log(`[CalendarSync] HTTP Status: ${response.status}, Tamanho: ${response.data?.length || 0} bytes`);
      const data = ical.parseICS(response.data);

      // 1. Coletar todos os IDs externos presentes no iCal atual
      const externalIdsInFeed: string[] = [];
      let eventCount = 0;

      for (const k in data) {
        if (Object.prototype.hasOwnProperty.call(data, k)) {
          const ev = data[k] as any;
          if (ev.type === 'VEVENT') {
            eventCount++;
            const externalId = ev.uid || `${config.provider}-${ev.start.toISOString()}`;
            externalIdsInFeed.push(externalId);
            console.log(`[CalendarSync] Evento #${eventCount}: UID=${externalId}, Start=${ev.start}, End=${ev.end}`);

            // Verificar se já existe para não duplicar
            const existing = await (prisma as any).reservation.findUnique({
              where: { external_id: externalId }
            });

            // iCal usa DTEND exclusivo para eventos de dia inteiro.
            const checkoutDate = new Date(ev.end);
            checkoutDate.setDate(checkoutDate.getDate() - 1);
            const checkinDate = new Date(ev.start);

            if (!existing) {
              await (prisma as any).reservation.create({
                data: {
                  imovel_id: propertyId,
                  data_checkin: checkinDate,
                  data_checkout: checkoutDate,
                  valor_total: 0,
                  status: `Bloqueado (${config.provider})`,
                  external_id: externalId,
                  provider: config.provider
                }
              });
              totalImported++;
              console.log(`[CalendarSync] ✅ Importado: ${externalId}`);
            } else {
              // Verifica se as datas mudaram no Airbnb (ex: reduziu dias do bloqueio)
              const existingCheckin = new Date(existing.data_checkin).toISOString().split('T')[0];
              const existingCheckout = new Date(existing.data_checkout).toISOString().split('T')[0];
              const newCheckin = checkinDate.toISOString().split('T')[0];
              const newCheckout = checkoutDate.toISOString().split('T')[0];

              if (existingCheckin !== newCheckin || existingCheckout !== newCheckout) {
                await (prisma as any).reservation.update({
                  where: { id: existing.id },
                  data: {
                    data_checkin: checkinDate,
                    data_checkout: checkoutDate
                  }
                });
                totalUpdated++;
                console.log(`[CalendarSync] 🔄 Atualizado: ${externalId} (${newCheckin} a ${newCheckout})`);
              } else {
                console.log(`[CalendarSync] ⏭️ Já existe e sem mudanças: ${externalId}`);
              }
            }
          }
        }
      }

      console.log(`[CalendarSync] Total de eventos no feed: ${eventCount}, No banco: ${externalIdsInFeed.length}`);

      // 2. Remover reservas que existem no banco MAS não estão mais no feed iCal
      //    (significa que foram canceladas/deletadas no Airbnb)
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
          console.log(`[CalendarSync] Removido (não está mais no feed): ${reservation.external_id}`);
        }
      }

      // Atualizar last_sync
      await (prisma as any).calendarSync.update({
        where: { id: config.id },
        data: { last_sync: new Date() }
      });

    } catch (error) {
      console.error(`[CalendarSync] Erro ao sincronizar ${config.provider}:`, error);
    }
  }

  return { success: true, imported: totalImported, removed: totalRemoved, updated: totalUpdated };
};
