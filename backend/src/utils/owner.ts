import { prisma } from '../prisma';

export async function resolveOwnerId(userId?: string | null): Promise<string | null> {
  if (!userId) return null;

  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, is_admin: true, owner_user_id: true }
  });

  if (!current) return null;
  if (current.is_admin || !current.owner_user_id) return current.id;

  return current.owner_user_id;
}

export async function canManageUsers(userId?: string | null): Promise<boolean> {
  if (!userId) return false;

  const ownerId = await resolveOwnerId(userId);
  return ownerId === userId;
}
