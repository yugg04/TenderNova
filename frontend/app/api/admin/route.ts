import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isSuperAdmin, resolveAdminUser } from '@/lib/admin';
import { encryptSecret, secretPreview } from '@/lib/crypto';

const VALID_KEY_STATUS = new Set(['active', 'disabled']);

export async function GET() {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

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
    prisma.apiKey.findMany({ orderBy: [{ priority: 'asc' }, { updatedAt: 'desc' }], take: 20, select: apiKeySelect() }),
    prisma.loginEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 20, include: { user: { select: { email: true, name: true } } } }),
    prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' }, take: 12 })
  ]);

  return NextResponse.json({
    currentAdmin: { id: admin.id, email: admin.email, role: admin.role, isSuperAdmin: isSuperAdmin(admin) },
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
  });
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const body = await request.json();
  const action = String(body.action ?? '');

  if (action === 'updateUser') {
    if (!isSuperAdmin(admin)) return NextResponse.json({ error: 'Only the super admin can change user roles or disable accounts' }, { status: 403 });
    const role = String(body.role ?? 'user');
    if (role !== 'user') return NextResponse.json({ error: 'Only the configured system account can be admin' }, { status: 400 });

    const target = await prisma.user.findUnique({ where: { id: String(body.userId) } });
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (target.email.toLowerCase() === admin.email.toLowerCase() && Boolean(body.disabled)) {
      return NextResponse.json({ error: 'You cannot disable your own admin account' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: target.id },
      data: { role: 'user', disabled: Boolean(body.disabled) },
      select: { id: true, name: true, email: true, role: true, disabled: true, lastLoginAt: true, lastSeenAt: true, createdAt: true }
    });
    await audit(admin.id, 'admin_user_updated', { targetUserId: updated.id, role: updated.role, disabled: updated.disabled });
    return NextResponse.json({ ok: true, user: updated });
  }

  if (action === 'retryJob') {
    const job = await prisma.processingJob.update({ where: { id: String(body.jobId) }, data: { status: 'queued', progress: 0, error: null } });
    await audit(admin.id, 'admin_job_retried', { jobId: job.id });
    return NextResponse.json({ ok: true, job });
  }

  if (action === 'addApiKey' || action === 'rotateApiKey') {
    const provider = clean(body.provider);
    const value = clean(body.value);
    if (!provider || !value) return NextResponse.json({ error: 'Provider and API key are required' }, { status: 400 });

    if (action === 'rotateApiKey') {
      const existing = await prisma.apiKey.findUnique({ where: { id: String(body.id) } });
      if (!existing) return NextResponse.json({ error: 'API key not found' }, { status: 404 });
      const updated = await prisma.apiKey.update({
        where: { id: existing.id },
        data: {
          provider,
          label: clean(body.label) || existing.label,
          encryptedValue: encryptSecret(value),
          keyPreview: secretPreview(value),
          status: 'active',
          priority: Number(body.priority ?? existing.priority),
          tokenLimit: optionalNumber(body.tokenLimit),
          rateLimitPerDay: Number(body.rateLimitPerDay ?? existing.rateLimitPerDay),
          rotatedAt: new Date()
        },
        select: apiKeySelect()
      });
      await audit(admin.id, 'admin_api_key_rotated', { apiKeyId: updated.id, provider });
      return NextResponse.json({ ok: true, apiKey: updated });
    }

    const created = await prisma.apiKey.create({
      data: {
        userId: admin.id,
        provider,
        label: clean(body.label) || provider,
        encryptedValue: encryptSecret(value),
        keyPreview: secretPreview(value),
        priority: Number(body.priority ?? 100),
        tokenLimit: optionalNumber(body.tokenLimit),
        rateLimitPerDay: Number(body.rateLimitPerDay ?? 1000)
      },
      select: apiKeySelect()
    });
    await audit(admin.id, 'admin_api_key_added', { apiKeyId: created.id, provider });
    return NextResponse.json({ ok: true, apiKey: created });
  }

  if (action === 'setApiKeyStatus') {
    const status = String(body.status ?? '');
    if (!VALID_KEY_STATUS.has(status)) return NextResponse.json({ error: 'Invalid API key status' }, { status: 400 });
    const updated = await prisma.apiKey.update({ where: { id: String(body.id) }, data: { status }, select: apiKeySelect() });
    await audit(admin.id, 'admin_api_key_status_updated', { apiKeyId: updated.id, status });
    return NextResponse.json({ ok: true, apiKey: updated });
  }

  if (action === 'updateApiKeyPriority') {
    const updated = await prisma.apiKey.update({
      where: { id: String(body.id) },
      data: { priority: Number(body.priority ?? 100), rateLimitPerDay: Number(body.rateLimitPerDay ?? 1000), tokenLimit: optionalNumber(body.tokenLimit) },
      select: apiKeySelect()
    });
    await audit(admin.id, 'admin_api_key_priority_updated', { apiKeyId: updated.id, priority: updated.priority });
    return NextResponse.json({ ok: true, apiKey: updated });
  }

  if (action === 'deleteApiKey') {
    const id = String(body.id);
    await prisma.apiKey.delete({ where: { id } });
    await audit(admin.id, 'admin_api_key_deleted', { apiKeyId: id });
    return NextResponse.json({ ok: true, id });
  }

  if (action === 'setContactStatus') {
    const status = String(body.status ?? 'reviewed');
    if (!['new', 'reviewed', 'closed'].includes(status)) return NextResponse.json({ error: 'Invalid message status' }, { status: 400 });
    const contact = await prisma.contactMessage.update({ where: { id: String(body.id) }, data: { status } });
    await audit(admin.id, 'admin_contact_status_updated', { contactMessageId: contact.id, status });
    return NextResponse.json({ ok: true, contact });
  }

  return NextResponse.json({ error: 'Unknown admin action' }, { status: 400 });
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await resolveAdminUser(session.user.email);
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return user;
}

function clean(value: unknown) {
  const text = String(value ?? '').trim();
  return text || null;
}

function apiKeySelect() {
  return {
    id: true,
    provider: true,
    label: true,
    keyPreview: true,
    status: true,
    priority: true,
    requestCount: true,
    failedCount: true,
    tokenUsage: true,
    tokenLimit: true,
    rateLimitPerDay: true,
    lastUsedAt: true,
    rotatedAt: true,
    createdAt: true,
    user: { select: { email: true } }
  } as const;
}

function optionalNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

async function audit(userId: string, action: string, metadata?: Record<string, unknown>) {
  await prisma.adminLog.create({ data: { userId, action, metadata: metadata as any } }).catch(() => undefined);
}
