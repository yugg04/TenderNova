import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limit';
import { verifyOtp } from '@/lib/otp';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anonymous';
  const limited = checkRateLimit(`verify-otp:${ip}`, 12, 60_000);
  if (!limited.ok) return NextResponse.json({ error: 'Too many verification attempts. Please wait and try again.' }, { status: 429 });

  const body = await request.json();
  const email = String(body.email ?? '').trim().toLowerCase();
  const code = String(body.code ?? '').trim();
  if (!email || !/^\d{6}$/.test(code)) return NextResponse.json({ error: 'Enter the 6 digit verification code.' }, { status: 400 });

  const record = await prisma.emailOtp.findFirst({ where: { email, purpose: 'signup', verifiedAt: null }, orderBy: { createdAt: 'desc' } });
  if (!record) return NextResponse.json({ error: 'No active verification code found.' }, { status: 404 });
  if (record.expiresAt < new Date()) return NextResponse.json({ error: 'Verification code expired. Request a new code.' }, { status: 400 });
  if (record.attempts >= 5) return NextResponse.json({ error: 'Too many invalid attempts. Request a new code.' }, { status: 429 });

  const ok = await verifyOtp(code, record.codeHash);
  if (!ok) {
    await prisma.emailOtp.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
    return NextResponse.json({ error: 'Invalid verification code.' }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { email },
    data: { verified: true, disabled: false }
  });
  await prisma.emailOtp.update({ where: { id: record.id }, data: { verifiedAt: new Date() } });

  return NextResponse.json({ ok: true, email: user.email });
}
