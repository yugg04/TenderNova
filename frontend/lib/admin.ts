import { prisma } from '@/lib/prisma';

export const SUPER_ADMIN_EMAIL = 'savanmpatel1407@gmail.com';

export async function resolveAdminUser(email: string) {
  const normalized = email.toLowerCase();
  if (normalized !== SUPER_ADMIN_EMAIL) return null;

  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user) return null;
  if (user.disabled) return null;

  if (user.role !== 'super_admin') {
    return prisma.user.update({
      where: { id: user.id },
      data: { role: 'super_admin', verified: true, disabled: false }
    });
  }

  return user;
}

export function isSuperAdmin(user: { email: string; role: string }) {
  return user.email.toLowerCase() === SUPER_ADMIN_EMAIL && user.role === 'super_admin';
}
