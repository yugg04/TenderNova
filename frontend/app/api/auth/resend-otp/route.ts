import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendEmail } from '@/lib/email';
import { generateOtp, hashOtp, OTP_TTL_MS } from '@/lib/otp';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anonymous';
  const limited = checkRateLimit(`resend-otp:${ip}`, 3, 60_000);
  if (!limited.ok) return NextResponse.json({ error: 'Too many OTP requests. Please wait before resending.' }, { status: 429 });

  const body = await request.json();
  const email = String(body.email ?? '').trim().toLowerCase();
  if (!email) return NextResponse.json({ error: 'Email is required.' }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
  if (user.verified) return NextResponse.json({ error: 'This account is already verified.' }, { status: 400 });

  const latest = await prisma.emailOtp.findFirst({ where: { email, purpose: 'signup', verifiedAt: null }, orderBy: { createdAt: 'desc' } });
  if (latest && Date.now() - latest.lastSentAt.getTime() < 60_000) {
    return NextResponse.json({ error: 'Please wait before requesting another code.' }, { status: 429 });
  }

  const otp = generateOtp();
  await prisma.emailOtp.deleteMany({ where: { email, purpose: 'signup', verifiedAt: null } });
  await prisma.emailOtp.create({
    data: {
      email,
      userId: user.id,
      codeHash: await hashOtp(otp),
      purpose: 'signup',
      expiresAt: new Date(Date.now() + OTP_TTL_MS)
    }
  });

  const delivery = await sendEmail({
    to: email,
    subject: 'Your new TenderNova verification code',
    text: `Your new TenderNova verification code is ${otp}. It expires in 5 minutes.`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827"><h2>Your new TenderNova verification code</h2><p style="font-size:28px;font-weight:700;letter-spacing:6px">${otp}</p><p>This code expires in 5 minutes.</p></div>`
  });

  if (!delivery.ok) return NextResponse.json({ error: delivery.error || 'Could not send verification email.' }, { status: 502 });
  return NextResponse.json({ ok: true });
}
