import { Request, Response } from 'express';
import { resolveOwnerId } from '../utils/owner';
import { prisma } from '../prisma';
import ical, { ICalCalendarMethod } from 'ical-generator';
import { syncExternalCalendars, syncUserProperties } from '../services/calendar.service';

export const dangerZoneResetAll = async (req: Request, res: Response) => {
  // Verificação de segurança simples por query param
  const secret = req.query.secret;
  if (secret !== 'reset2026') {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  try {
    console.log('[DANGER ZONE] Iniciando reset total de reservas na produção...');
    
    // 1. Deletar Pagamentos (Dependem de Reservas)
    const pCount = await (prisma as any).payment.deleteMany({});
    // 2. Deletar Contratos (Dependem de Reservas)
    const cCount = await (prisma as any).contractDraft.deleteMany({});
    // 3. Deletar Reservas
    const rCount = await (prisma as any).reservation.deleteMany({});
    // 4. Deletar Configurações de Sincronização
    const sCount = await (prisma as any).calendarSync.deleteMany({});
    
    console.log(`[DANGER ZONE] Reset concluído: ${rCount.count} reservas removidas.`);

    return res.json({
      success: true,
      removed: {
        payments: pCount.count,
        contracts: cCount.count,
        reservas: rCount.count,
        syncs: sCount.count
      }
    });
  } catch (error) {
    console.error('[DANGER ZONE] Erro no reset:', error);
    return res.status(500).json({ error: 'Erro crítico no reset' });
  }
};

export const exportPropertyCalendar = async (req: Request, res: Response) => {
  const id = req.params.id as string;

  try {
    const property = await (prisma as any).property.findUnique({
      where: { id },
      include: {
        reservas: {
          where: {
            status: { not: 'Cancelada' }
          }
        }
      }
    });

    if (!property) {
      return res.status(404).json({ error: 'Imóvel não encontrado' });
    }

    const calendar = ical({ name: `Aluga Fácil - ${property.nome}` });
    calendar.method(ICalCalendarMethod.PUBLISH);

    if (property.reservas.length === 0) {
      calendar.createEvent({
        start: new Date('2020-01-01T00:00:00Z'),
        end: new Date('2020-01-02T00:00:00Z'),
        summary: 'Aluga Fácil Link Validator',
        description: 'Evento passado para validação de estrutura do iCal das plataformas',
        allDay: true,
        id: `dummy-validator-${property.id}`
      });
    }

    console.log(`[iCalExport] Iniciando exportação para imóvel ${id}. Reservas encontradas: ${property.reservas.length}`);

    property.reservas.forEach((reserva: any) => {
      // Definindo o título do evento
      let summary = 'Reserva Aluga Fácil';
      if (reserva.provider === 'airbnb') summary = 'Reserva Airbnb (Sinc)';
      if (reserva.provider === 'booking') summary = 'Reserva Booking (Sinc)';

      const start = new Date(reserva.data_checkin);
      const end = new Date(reserva.data_checkout);

      // Logs para depuração interna
      console.log(`[iCalExport] Processando reserva ${reserva.id}: ${summary} (${start.toISOString().split('T')[0]} a ${end.toISOString().split('T')[0]})`);

      // Padrão iCal exige que o End date de eventos all-day seja no mínimo 1 dia após o start (End é exclusivo)
      // Se start e end forem iguais ou end for anterior, forçamos ao menos 1 dia de duração
      if (start.getTime() >= end.getTime()) {
        end.setDate(end.getDate() + 1);
      }

      const event = calendar.createEvent({
        start: start,
        end: end,
        summary: summary,
        description: `Reserva gerenciada pelo Aluga Fácil. Código: ${reserva.id}`,
        allDay: true
      });

      // Forçar UID estável via método (mais robusto em v10+)
      event.uid(reserva.id);
    });

    const icalString = calendar.toString();

    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', `attachment; filename="agenda-${property.id}.ics"`);

    return res.send(icalString);
  } catch (error) {
    console.error('Erro ao exportar calendário:', error);
    return res.status(500).json({ error: 'Erro interno ao gerar calendário' });
  }
};

export const getPropertySyncConfigs = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  try {
    const configs = await (prisma as any).calendarSync.findMany({
      where: { imovel_id: id }
    });
    return res.json(configs);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar configurações' });
  }
};

export const addPropertySyncConfig = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { provider, url } = req.body;

  if (!provider || !url) {
    return res.status(400).json({ error: 'Provider e URL são obrigatórios' });
  }

  try {
    const config = await (prisma as any).calendarSync.create({
      data: {
        imovel_id: id,
        provider,
        external_url: url
      }
    });

    // Sincronizar automaticamente após adicionar o link
    await syncExternalCalendars(id);

    return res.json(config);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao salvar configuração' });
  }
};

export const deleteSyncConfig = async (req: Request, res: Response) => {
  const syncId = req.params.syncId as string;
  try {
    await (prisma as any).calendarSync.delete({ where: { id: syncId } });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao excluir configuração' });
  }
};

export const triggerSync = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  try {
    const result = await syncExternalCalendars(id);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao sincronizar' });
  }
};

export const triggerSyncAll = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  try {
    const ownerId = await resolveOwnerId(userId);
    if (!ownerId) {
      return res.status(401).json({ error: 'Usuário não autenticado ou não encontrado' });
    }

    const results = await syncUserProperties(ownerId);
    return res.json({ success: true, results });
  } catch (error) {
    console.error('Erro na sincronização global:', error);
    return res.status(500).json({ error: 'Erro ao sincronizar todos os imóveis' });
  }
};
