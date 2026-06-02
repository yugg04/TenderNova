import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      workspaces: { orderBy: { createdAt: 'asc' }, take: 1 },
      notifications: { orderBy: { createdAt: 'desc' }, take: 10 }
    }
  });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { password, ...safeUser } = user;
  return NextResponse.json({
    user: safeUser,
    workspace: user.workspaces[0] ?? null,
    notifications: user.notifications
  });
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email }, include: { workspaces: { take: 1 } } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const body = await request.json();
  const section = String(body.section ?? '');

  if (section === 'profile') {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: clean(body.name),
        company: clean(body.company),
        phone: clean(body.phone),
        region: clean(body.region),
        image: clean(body.image)
      }
    });
    await log(user.id, 'settings_profile_updated');
    return NextResponse.json({ ok: true, user: stripPassword(updated) });
  }

  if (section === 'notifications') {
    const workspace = await ensureWorkspace(user.id, user.workspaces[0]?.id, user.company);
    const preferences = {
      ...(workspace.preferences as any ?? {}),
      notifications: {
        emailAlerts: Boolean(body.emailAlerts),
        tenderAlerts: Boolean(body.tenderAlerts),
        deadlineReminders: Boolean(body.deadlineReminders),
        proposalCompletionAlerts: Boolean(body.proposalCompletionAlerts)
      }
    };
    const updated = await prisma.workspace.update({ where: { id: workspace.id }, data: { preferences } });
    await log(user.id, 'settings_notifications_updated');
    return NextResponse.json({ ok: true, workspace: updated });
  }

  if (section === 'password') {
    if (!user.password) return NextResponse.json({ error: 'Password is not enabled for OAuth-only accounts' }, { status: 400 });
    const currentPassword = String(body.currentPassword ?? '');
    const nextPassword = String(body.nextPassword ?? '');
    if (nextPassword.length < 8) return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    await prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(nextPassword, 10) } });
    await log(user.id, 'settings_password_changed');
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown settings section' }, { status: 400 });
}

export async function DELETE(request: NextRequest) {
  return NextResponse.json({ error: 'Settings delete operations are not supported' }, { status: 405 });
}

function clean(value: unknown) {
  const text = String(value ?? '').trim();
  return text || null;
}

function stripPassword(user: any) {
  const { password, ...safeUser } = user;
  return safeUser;
}

async function ensureWorkspace(userId: string, workspaceId?: string, company?: string | null) {
  if (workspaceId) return prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
  return prisma.workspace.create({ data: { userId, name: company || 'TenderNova Workspace' } });
}

async function log(userId: string, action: string, metadata?: Record<string, unknown>) {
  await prisma.adminLog.create({ data: { userId, action, metadata: metadata as any } }).catch(() => undefined);
}
