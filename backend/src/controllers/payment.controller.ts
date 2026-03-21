import { Response } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { resolveOwnerId } from '../utils/owner';

export const createPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { reserva_id, valor, tipo } = req.body;
    const ownerId = await resolveOwnerId(req.user?.id);

    if (!reserva_id || !valor || !tipo) {
      res.status(400).json({ error: 'Campos obrigatórios ausentes' });
      return;
    }

    if (!ownerId) {
      res.status(401).json({ error: 'Não autorizado' });
      return;
    }

    // Checking if reservation exists
    const reservation = await prisma.reservation.findUnique({
      where: { id: reserva_id },
      include: {
        imovel: true
      }
    });

    if (!reservation) {
      res.status(404).json({ error: 'Reserva não encontrada' });
      return;
    }

    if (reservation.imovel.usuario_id !== ownerId) {
      res.status(403).json({ error: 'Sem permissão' });
      return;
    }

    const payment = await prisma.payment.create({
      data: {
        reserva_id,
        valor: Number(valor),
        tipo
      }
    });

    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar pagamento', details: error });
  }
};

export const getPayments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const usuario_id = req.user?.id;
    const ownerId = await resolveOwnerId(usuario_id);

    if (!ownerId) {
      res.status(401).json({ error: 'Não autorizado' });
      return;
    }

    const payments = await prisma.payment.findMany({
      where: {
        reserva: {
          imovel: {
            usuario_id: ownerId
          }
        }
      },
      include: {
        reserva: {
          include: {
            imovel: true,
            locatario: true
          }
        }
      },
      orderBy: { data_pagamento: 'desc' }
    });

    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar pagamentos' });
  }
};

export const updatePaymentStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { status, meio_pagamento } = req.body;
    const ownerId = await resolveOwnerId(req.user?.id);

    if (!ownerId) {
      res.status(401).json({ error: 'NÃ£o autorizado' });
      return;
    }

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { reserva: { include: { imovel: true } } }
    });

    if (!payment) {
      res.status(404).json({ error: 'Pagamento não encontrado' });
      return;
    }

    if (payment.reserva.imovel.usuario_id !== ownerId) {
      res.status(403).json({ error: 'Sem permissÃ£o' });
      return;
    }

    const data_pagamento = status === 'Pago' ? new Date() : null;
    const nextMeioPagamento =
      status === 'Pago' ? (meio_pagamento ?? payment.meio_pagamento ?? null) : null;

    const updated = await prisma.payment.update({
      where: { id },
      data: { status, data_pagamento, meio_pagamento: nextMeioPagamento }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar pagamento' });
  }
};

export const deletePayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const ownerId = await resolveOwnerId(req.user?.id);

    if (!ownerId) {
      res.status(401).json({ error: 'NÃ£o autorizado' });
      return;
    }

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { reserva: { include: { imovel: true } } }
    });

    if (!payment) {
      res.status(404).json({ error: 'Pagamento nÃ£o encontrado' });
      return;
    }

    if (payment.reserva.imovel.usuario_id !== ownerId) {
      res.status(403).json({ error: 'Sem permissÃ£o' });
      return;
    }

    await prisma.payment.delete({ where: { id } });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir pagamento' });
  }
};
