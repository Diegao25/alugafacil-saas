import { Response } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { startOfMonth, endOfMonth, startOfToday, endOfToday } from 'date-fns';
import { resolveOwnerId } from '../utils/owner';

export const getStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = await resolveOwnerId(req.user?.id);

    if (!userId) {
      res.status(401).json({ error: 'Não autorizado' });
      return;
    }

    // Ajuste para lidar com fuso horário (GMT-3) e SQLite
    // Se no banco está 2026-03-08T00:00:00Z, no GMT-3 isso é 21h do dia 07/03.
    // Para "Hoje" (08/03), queremos pegar o que for meia-noite UTC do dia 08/03.
    // Ajuste agressivo para lidar com fuso horário (GMT-3) e SQLite
    // Garante que pegamos qualquer transição meia-noite UTC/Local
    const todayStart = startOfToday();
    todayStart.setHours(todayStart.getHours() - 12); 
    
    const todayEnd = endOfToday();
    todayEnd.setHours(todayEnd.getHours() + 12); 
    
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());

    // 1. Total de Imóveis
    const totalProperties = await prisma.property.count({
      where: { usuario_id: userId }
    });

    // 1.1 Total de Locatários
    const totalTenants = await prisma.tenant.count({
      where: { usuario_id: userId }
    });

    // 2. Reservas começando hoje
    const reservationsToday = await prisma.reservation.count({
      where: {
        imovel: { usuario_id: userId },
        data_checkin: {
          gte: todayStart,
          lte: todayEnd
        },
        status: { not: 'Cancelada' },
        locatario_id: { not: null }
      }
    });

    // 2.1. Check-outs hoje
    const checkoutsToday = await prisma.reservation.count({
      where: {
        imovel: { usuario_id: userId },
        data_checkout: {
          gte: todayStart,
          lte: todayEnd
        },
        status: { not: 'Cancelada' },
        locatario_id: { not: null }
      }
    });

    // 3. Próximos Check-ins (apenas datas futuras, excluindo hoje)
    const pendingCheckinsCount = await prisma.reservation.count({
      where: {
        imovel: { usuario_id: userId },
        data_checkin: { gt: todayEnd },
        status: { not: 'Cancelada' },
        locatario_id: { not: null }
      }
    });

    // 4. Faturamento do Mês (Soma de pagamentos pagos no mês atual)
    const monthlyPayments = await prisma.payment.aggregate({
      where: {
        reserva: { imovel: { usuario_id: userId } },
        status: 'Pago',
        data_pagamento: {
          gte: monthStart,
          lte: monthEnd
        }
      },
      _sum: {
        valor: true
      }
    });

    // 5. Próximos Check-ins (Top 5, excluindo hoje)
    const upcomingCheckins = await prisma.reservation.findMany({
      where: {
        imovel: { usuario_id: userId },
        data_checkin: { gt: todayEnd },
        status: { not: 'Cancelada' },
        locatario_id: { not: null }
      },
      take: 5,
      orderBy: { data_checkin: 'asc' },
      include: {
        imovel: { select: { nome: true } },
        locatario: { select: { nome: true } }
      }
    });

    // 5.1 Próximos Check-outs (Top 5, excluindo hoje)
    const upcomingCheckouts = await prisma.reservation.findMany({
      where: {
        imovel: { usuario_id: userId },
        data_checkout: { gt: todayEnd },
        status: { not: 'Cancelada' },
        locatario_id: { not: null }
      },
      take: 5,
      orderBy: { data_checkout: 'asc' },
      include: {
        imovel: { select: { nome: true } },
        locatario: { select: { nome: true } }
      }
    });

    // 5.2 Listas específicas de HOJE
    const checkinsTodayList = await prisma.reservation.findMany({
      where: {
        imovel: { usuario_id: userId },
        data_checkin: { gte: todayStart, lte: todayEnd },
        status: { not: 'Cancelada' },
        locatario_id: { not: null }
      },
      include: {
        imovel: { select: { nome: true } },
        locatario: { select: { nome: true } }
      }
    });

    const checkoutsTodayList = await prisma.reservation.findMany({
      where: {
        imovel: { usuario_id: userId },
        data_checkout: { gte: todayStart, lte: todayEnd },
        status: { not: 'Cancelada' },
        locatario_id: { not: null }
      },
      include: {
        imovel: { select: { nome: true } },
        locatario: { select: { nome: true } }
      }
    });

    // 6. Pagamentos Pendentes (Top 5)
    const pendingPayments = await prisma.payment.findMany({
      where: {
        reserva: { imovel: { usuario_id: userId } },
        status: 'Pendente'
      },
      take: 5,
      include: {
        reserva: {
          include: {
            locatario: { select: { nome: true } },
            imovel: { select: { nome: true } }
          }
        }
      }
    });
    
    let profileCompleted = false;
    if (userId) {
      const profileInfo = await prisma.user.findUnique({
        where: { id: userId },
        select: { nome: true, cpf_cnpj: true, telefone: true, endereco: true }
      });

      profileCompleted = Boolean(
        profileInfo?.cpf_cnpj?.trim() && 
        profileInfo?.telefone?.trim() && 
        profileInfo?.endereco?.trim()
      );
    }

    // 7. Última Sincronização
    const lastSyncRecord = await (prisma as any).calendarSync.findFirst({
      where: { imovel: { usuario_id: userId } },
      orderBy: { last_sync: 'desc' },
      select: { last_sync: true }
    });
    const lastSync = lastSyncRecord?.last_sync || null;

    res.status(200).json({
      totalProperties,
      totalTenants,
      reservationsToday,
      checkoutsToday,
      pendingCheckinsCount,
      monthlyRevenue: (monthlyPayments._sum.valor || 0),
      upcomingCheckins,
      upcomingCheckouts,
      checkinsTodayList,
      checkoutsTodayList,
      pendingPayments,
      profileCompleted,
      lastSync
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas do dashboard' });
  }
};
