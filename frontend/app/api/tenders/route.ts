import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const page = Number(request.nextUrl.searchParams.get('page') ?? 1);
  const take = Number(request.nextUrl.searchParams.get('take') ?? 20);
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ items: [], total: 0 });
  const [items, total] = await Promise.all([
    prisma.tender.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * take, take }),
    prisma.tender.count({ where: { userId: user.id } })
  ]);
  return NextResponse.json({ items, total, page, take });
}
