import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { TenderManager } from '@/components/tender/TenderManager';

export default async function TendersPage() {
  const session = await getServerSession(authOptions);
  const user = await prisma.user.findUnique({ where: { email: session?.user?.email ?? '' }, include: { tenders: { orderBy: { createdAt: 'desc' } } } });
  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Manage My Tenders</h1><p className="mt-1 text-slate-400">Search, filter, archive, delete, and track tenders across your bid workflow.</p></div>
      <TenderManager initialTenders={user?.tenders ?? []} />
    </div>
  );
}
