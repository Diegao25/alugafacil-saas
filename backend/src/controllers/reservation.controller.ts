import { Response } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { resolveOwnerId } from '../utils/owner';
import { Prisma } from '@prisma/client';

export const createReservation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { imovel_id, locatario_id, data_checkin, data_checkout, hora_checkin, hora_checkout, valor_total, valor_sinal, num_parcelas, metodo_pagamento, forma_pagamento } = req.body;

    if (!imovel_id || !locatario_id || !data_checkin || !data_checkout || !valor_total) {
      res.status(400).json({ error: 'Campos obrigatórios ausentes' });
      return;
    }
    if (!forma_pagamento) {
      res.status(400).json({ error: 'Forma de pagamento obrigatÃ³ria' });
      return;
    }

    const ownerId = await resolveOwnerId(req.user?.id);
    if (!ownerId) {
      res.status(401).json({ error: 'NÃ£o autorizado' });
      return;
    }

    const property = await prisma.property.findFirst({
      where: { id: imovel_id, usuario_id: ownerId }
    });

    if (!property) {
      res.status(404).json({ error: 'ImÃ³vel nÃ£o encontrado' });
      return;
    }

    const tenant = await prisma.tenant.findFirst({
      where: { id: locatario_id, usuario_id: ownerId }
    });

    if (!tenant) {
      res.status(404).json({ error: 'Locatário não encontrado para esta conta' });
      return;
    }

    const checkinDate = new Date(data_checkin);
    if (hora_checkin) {
      const [hours, minutes] = hora_checkin.split(':').map(Number);
      checkinDate.setUTCHours(hours, minutes, 0, 0);
    } else {
      checkinDate.setUTCHours(12, 0, 0, 0); // Normalizar em UTC para evitar problemas de fuso horário
    }
    
    const checkoutDate = new Date(data_checkout);
    if (hora_checkout) {
      const [hours, minutes] = hora_checkout.split(':').map(Number);
      checkoutDate.setUTCHours(hours, minutes, 0, 0);
    } else {
      checkoutDate.setUTCHours(12, 0, 0, 0);
    }

    if (checkinDate >= checkoutDate) {
      res.status(400).json({ error: 'Data de check-out deve ser posterior ao check-in' });
      return;
    }

    // Verificar choque de datas
    const overlapping = await prisma.reservation.findFirst({
      where: {
        imovel_id,
        status: { not: 'Cancelada' },
        AND: [
          { data_checkin: { lt: checkoutDate } },
          { data_checkout: { gt: checkinDate } }
        ]
      }
    });

    if (overlapping) {
      res.status(400).json({ error: 'O imóvel já possui reserva neste período' });
      return;
    }

    const reservation = await prisma.$transaction(async (tx) => {
      const res = await tx.reservation.create({
        data: {
          imovel_id,
          locatario_id,
          data_checkin: checkinDate,
          hora_checkin: hora_checkin || '12:00',
          data_checkout: checkoutDate,
          hora_checkout: hora_checkout || '12:00',
          valor_total: Number(valor_total)
        },
        include: {
          imovel: true,
          locatario: true
        }
      });

      const total = Number(valor_total);
      const sinal = Number(valor_sinal || 0);
      const parcelas = Number(num_parcelas || 1);
      const metodo = metodo_pagamento || 'SINAL';
      const meioPagamento = forma_pagamento || null;
      const customDates = req.body.datas_parcelas || [];

      if (metodo === 'TOTAL') {
        await tx.payment.create({
          data: {
            reserva_id: res.id,
            valor: total,
            tipo: 'Total',
            status: 'Pago',
            data_pagamento: new Date(),
            meio_pagamento: meioPagamento
          }
        });
      } else {
        const saldoRestante = total - sinal;

        const sinalDate = req.body.data_sinal ? new Date(req.body.data_sinal) : new Date();
        if (sinal > 0) {
          await tx.payment.create({
            data: {
              reserva_id: res.id,
              valor: sinal,
              tipo: 'Sinal',
              status: 'Pago',
              data_vencimento: sinalDate,
              data_pagamento: sinalDate,
              meio_pagamento: meioPagamento
            }
          });
        }

        if (saldoRestante > 0) {
          const valorParcela = saldoRestante / parcelas;
          for (let i = 1; i <= parcelas; i++) {
            let dueDate = new Date();
            if (customDates[i - 1]) {
              dueDate = new Date(customDates[i - 1]);
            } else {
              dueDate.setDate(dueDate.getDate() + (30 * i));
            }

            await tx.payment.create({
              data: {
                reserva_id: res.id,
                valor: valorParcela,
                tipo: parcelas > 1 ? `Parcela ${i}/${parcelas}` : 'Restante',
                status: 'Pendente',
                data_vencimento: dueDate,
                data_pagamento: null
              }
            });
          }
        } else if (sinal === 0) {
          await tx.payment.create({
            data: {
              reserva_id: res.id,
              valor: total,
              tipo: 'Total',
              status: 'Pendente',
              data_vencimento: new Date()
            }
          });
        }
      }

      return res;
    });

    res.status(201).json(reservation);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar reserva', details: error });
  }
};

export const getReservations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const usuario_id = req.user?.id;
    const ownerId = await resolveOwnerId(usuario_id);
    if (!ownerId) {
      res.status(401).json({ error: 'NÃ£o autorizado' });
      return;
    }

    const reservations = await prisma.reservation.findMany({
      where: {
        imovel: {
          usuario_id: ownerId
        }
      },
      include: {
        imovel: true,
        locatario: true,
        pagamentos: true
      },
      orderBy: { data_checkin: 'asc' }
    });

    res.json(reservations);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar reservas' });
  }
};

export const getReservationById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const usuario_id = req.user?.id;
    const ownerId = await resolveOwnerId(usuario_id);
    if (!ownerId) {
      res.status(401).json({ error: 'NÃ£o autorizado' });
      return;
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        imovel: {
          include: {
            user: true
          }
        },
        locatario: true,
        pagamentos: true
      }
    });

    if (!reservation) {
      res.status(404).json({ error: 'Reserva não encontrada' });
      return;
    }

    const resWithRelations = reservation as any;

    if (resWithRelations.imovel.usuario_id !== ownerId) {
      res.status(403).json({ error: 'Sem permissão' });
      return;
    }

    res.json(reservation);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar reserva' });
  }
};

export const updateReservation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { data_checkin, data_checkout, hora_checkin, hora_checkout, valor_total, valor_sinal, num_parcelas, status, metodo_pagamento, forma_pagamento } = req.body;
    const usuario_id = req.user?.id;
    const ownerId = await resolveOwnerId(usuario_id);
    if (!ownerId) {
      res.status(401).json({ error: 'NÃ£o autorizado' });
      return;
    }

    // 1. Buscar reserva e verificar permissão
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: { 
        imovel: true, 
        pagamentos: true 
      }
    });

    if (!reservation) {
      res.status(404).json({ error: 'Reserva não encontrada' });
      return;
    }

    const resWithRelations = reservation as any;

    if (resWithRelations.imovel.usuario_id !== ownerId) {
      res.status(403).json({ error: 'Você não tem permissão para editar esta reserva' });
      return;
    }

    const checkinDate = new Date(data_checkin);
    if (hora_checkin) {
      const [hours, minutes] = hora_checkin.split(':').map(Number);
      checkinDate.setUTCHours(hours, minutes, 0, 0);
    } else {
      checkinDate.setUTCHours(12, 0, 0, 0);
    }

    const checkoutDate = new Date(data_checkout);
    if (hora_checkout) {
      const [hours, minutes] = hora_checkout.split(':').map(Number);
      checkoutDate.setUTCHours(hours, minutes, 0, 0);
    } else {
      checkoutDate.setUTCHours(12, 0, 0, 0);
    }

    if (checkinDate >= checkoutDate) {
      res.status(400).json({ error: 'Data de check-out deve ser posterior ao check-in' });
      return;
    }

    // 2. Verificar choque de datas (excluindo a própria reserva)
    const overlapping = await prisma.reservation.findFirst({
      where: {
        id: { not: id },
        imovel_id: resWithRelations.imovel_id as string,
        status: { not: 'Cancelada' },
        AND: [
          { data_checkin: { lt: checkoutDate } },
          { data_checkout: { gt: checkinDate } }
        ]
      }
    });

    if (overlapping) {
      res.status(400).json({ error: 'O imóvel já possui reserva neste período' });
      return;
    }

    const hasPaid = resWithRelations.pagamentos.some((p: any) => p.status === 'Pago');
    if (!hasPaid && !forma_pagamento) {
      res.status(400).json({ error: 'Forma de pagamento obrigatÃ³ria' });
      return;
    }

    // 3. Atualizar e ajustar financeiro
    const updated = await prisma.$transaction(async (tx) => {
      const resUp = await tx.reservation.update({
        where: { id },
        data: {
          data_checkin: checkinDate,
          hora_checkin: hora_checkin || '12:00', // Default if not provided
          data_checkout: checkoutDate,
          hora_checkout: hora_checkout || '12:00', // Default if not provided
          valor_total: Number(valor_total),
          status: status || resWithRelations.status // Allow status update if provided, otherwise keep current
        }
      });

      // Só recalcula o financeiro se NENHUM pagamento foi realizado ainda
      if (!hasPaid) {
        await tx.payment.deleteMany({ where: { reserva_id: id } });
        
        const total = Number(valor_total);
        const sinal = Number(valor_sinal || 0);
        const parcelas = Number(num_parcelas || 1);
        const metodo = req.body.metodo_pagamento || 'SINAL';
        const meioPagamento = forma_pagamento || null;

        if (metodo === 'TOTAL') {
          await tx.payment.create({
            data: {
              reserva_id: id,
              valor: total,
              tipo: 'Total',
              status: 'Pago',
              data_pagamento: new Date(),
              meio_pagamento: meioPagamento
            }
          });
        } else {
          const saldoRestante = total - sinal;

          if (sinal > 0) {
            await tx.payment.create({
              data: {
                reserva_id: id,
                valor: sinal,
                tipo: 'Sinal',
                status: 'Pago',
                data_pagamento: new Date(),
                meio_pagamento: meioPagamento
              }
            });
          }

          if (saldoRestante > 0) {
            const valorParcela = saldoRestante / parcelas;
            for (let i = 1; i <= parcelas; i++) {
              await tx.payment.create({
                data: {
                  reserva_id: id,
                  valor: valorParcela,
                  tipo: parcelas > 1 ? `Parcela ${i}/${parcelas}` : 'Restante',
                  status: 'Pendente'
                }
              });
            }
          } else if (sinal === 0) {
            await tx.payment.create({
              data: { reserva_id: id, valor: total, tipo: 'Total', status: 'Pendente' }
            });
          }
        }
      }

      return resUp;
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao editar reserva' });
  }
};

export const updateReservationStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;
    const ownerId = await resolveOwnerId(req.user?.id);

    if (!ownerId) {
      res.status(401).json({ error: 'Não autorizado' });
      return;
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: { imovel: true }
    });

    if (!reservation) {
      res.status(404).json({ error: 'Reserva não encontrada' });
      return;
    }

    if (reservation.imovel.usuario_id !== ownerId) {
      res.status(403).json({ error: 'Sem permissão' });
      return;
    }

    const updated = await prisma.reservation.update({
      where: { id },
      data: { status }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar reserva' });
  }
};

export const deleteReservation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const ownerId = await resolveOwnerId(req.user?.id);
    if (!ownerId) {
      res.status(401).json({ error: 'NÃ£o autorizado' });
      return;
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: { imovel: true }
    });

    if (!reservation) {
      res.status(404).json({ error: 'Reserva nÃ£o encontrada' });
      return;
    }

    if (reservation.imovel.usuario_id !== ownerId) {
      res.status(403).json({ error: 'Sem permissÃ£o' });
      return;
    }

    await prisma.reservation.delete({ where: { id } });
    res.status(204).send();
  } catch (error: any) {
    if (error.code === 'P2003' || (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003')) {
      res.status(400).json({ 
        error: 'Não é possível excluir esta reserva pois existem pagamentos ou contratos vinculados a ela.' 
      });
      return;
    }
    console.error('DEBUG - Erro ao excluir reserva:', error);
    res.status(500).json({ error: 'Erro interno ao excluir reserva' });
  }
};
