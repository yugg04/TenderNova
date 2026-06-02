import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AdminClient } from '@/components/admin/AdminClient';
import { isSuperAdmin, resolveAdminUser } from '@/lib/admin';

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/login');
  const user = await resolveAdminUser(session.user.email);
  if (!user) {
    return (
      <div className="grid min-h-[70vh] place-items-center">
        <div className="glass max-w-lg rounded-lg p-8 text-center">
          <h1 className="text-2xl font-bold">Admin Access Required</h1>
          <p className="mt-3 text-slate-400">Your account is authenticated, but it does not have admin permissions for this workspace.</p>
        </div>
      </div>
    );
  }

  const sinceDay = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const sinceMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const onlineSince = new Date(Date.now() - 15 * 60 * 1000);
  const [users, totalAdmins, activeUsers, onlineUsers, blockedUsers, successfulLogins, failedLogins, tenders, proposals, jobs, failedJobs, apiKeys, contactMessages, dailyUsage, monthlyUsage, logs, recentUsers, recentJobs, keys, loginHistory, contacts] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { email: 'savanmpatel1407@gmail.com', role: 'super_admin', disabled: false } }),
    prisma.user.count({ where: { disabled: false } }),
    prisma.user.count({ where: { disabled: false, lastSeenAt: { gte: onlineSince } } }),
    prisma.user.count({ where: { disabled: true } }),
    prisma.loginEvent.count({ where: { success: true, createdAt: { gte: sinceMonth } } }),
    prisma.loginEvent.count({ where: { success: false, createdAt: { gte: sinceMonth } } }),
    prisma.tender.count(),
    prisma.proposal.count(),
    prisma.processingJob.count(),
    prisma.processingJob.count({ where: { status: 'failed' } }),
    prisma.apiKey.count({ where: { status: 'active' } }),
    prisma.contactMessage.count({ where: { status: 'new' } }),
    prisma.apiUsage.aggregate({ where: { createdAt: { gte: sinceDay } }, _sum: { tokens: true }, _count: true }),
    prisma.apiUsage.aggregate({ where: { createdAt: { gte: sinceMonth } }, _sum: { tokens: true }, _count: true }),
    prisma.adminLog.findMany({ orderBy: { createdAt: 'desc' }, take: 12, include: { user: { select: { email: true, name: true } } } }),
    prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, name: true, email: true, role: true, disabled: true, lastLoginAt: true, lastSeenAt: true, createdAt: true } }),
    prisma.processingJob.findMany({ orderBy: { updatedAt: 'desc' }, take: 12, include: { tender: { select: { title: true } }, user: { select: { email: true } } } }),
    prisma.apiKey.findMany({ orderBy: [{ priority: 'asc' }, { updatedAt: 'desc' }], take: 20, select: { id: true, provider: true, label: true, keyPreview: true, status: true, priority: true, requestCount: true, failedCount: true, tokenUsage: true, tokenLimit: true, rateLimitPerDay: true, lastUsedAt: true, rotatedAt: true, createdAt: true, user: { select: { email: true } } } }),
    prisma.loginEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 20, include: { user: { select: { email: true, name: true } } } }),
    prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' }, take: 12 })
  ]);

  const data = {
    currentAdmin: { id: user.id, email: user.email, role: user.role, isSuperAdmin: isSuperAdmin(user) },
    cards: [
      ['Users', users],
      ['Admins', totalAdmins],
      ['Active Users', activeUsers],
      ['Online Users', onlineUsers],
      ['Blocked Users', blockedUsers],
      ['Successful Logins', successfulLogins],
      ['Failed Logins', failedLogins],
      ['Tenders', tenders],
      ['Proposals', proposals],
      ['Processing Jobs', jobs],
      ['Failed Jobs', failedJobs],
      ['Active APIs', apiKeys],
      ['New Messages', contactMessages],
      ['24h API Requests', dailyUsage._count],
      ['30d Tokens', monthlyUsage._sum.tokens ?? 0]
    ],
    users: recentUsers,
    jobs: recentJobs,
    apiKeys: keys,
    loginHistory,
    contacts,
    logs
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Control Center</h1>
        <p className="mt-1 text-slate-400">Live admin controls for users, API keys, jobs, audit logs, and platform health.</p>
      </div>
      <AdminClient initialData={JSON.parse(JSON.stringify(data))} />
    </div>
  );
}
