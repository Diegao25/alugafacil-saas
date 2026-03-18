import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';

export const getPropertyAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = idParam ? idParam : undefined;

    if (!id) {
      res.status(400).json({ error: 'Id do imóvel não informado' });
      return;
    }

    type PropertyWithReservations = Prisma.PropertyGetPayload<{
      include: {
        reservas: {
          where: { status: { not: 'Cancelada' } };
          orderBy: { data_checkin: 'asc' };
          include: {
            locatario: {
              select: {
                nome: true;
              };
            };
          };
        };
      };
    }>;

    const property = (await prisma.property.findUnique({
      where: { id },
      include: {
        reservas: {
          where: { status: { not: 'Cancelada' } },
          orderBy: { data_checkin: 'asc' },
          include: {
            locatario: {
              select: {
                nome: true
              }
            }
          }
        }
      }
    })) as PropertyWithReservations | null;

    if (!property) {
      res.status(404).json({ error: 'Imóvel não encontrado' });
      return;
    }

    const bookings = property.reservas.map((reservation) => ({
      id: reservation.id,
      checkin: reservation.data_checkin.toISOString(),
      checkout: reservation.data_checkout.toISOString(),
      status: reservation.status,
      locatario: reservation.locatario?.nome || null
    }));

    res.json({
      property: {
        id: property.id,
        nome: property.nome,
        endereco: property.endereco,
        descricao: property.descricao,
        valor_diaria: property.valor_diaria,
        capacidade_maxima: property.capacidade_maxima
      },
      bookings
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar disponibilidade do imóvel', details: error });
  }
};
