import { prisma } from '../prisma';

export async function resolveOwnerId(userId?: string | null): Promise<string | null> {
  if (!userId) return null;

  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, is_admin: true }
  });

  if (!current) return null;
  if (current.is_admin) return current.id;

  const owner = await prisma.user.findFirst({
    where: { is_admin: true },
    select: { id: true },
    orderBy: { data_criacao: 'asc' }
  });

  return owner?.id || current.id;
}
