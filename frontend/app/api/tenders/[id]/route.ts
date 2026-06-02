import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const tender = await prisma.tender.findUnique({ where: { id: params.id } });
  if (!tender) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(tender);
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const data = await request.json();
  const tender = await prisma.tender.update({ where: { id: params.id }, data });
  return NextResponse.json(tender);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await prisma.tender.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
