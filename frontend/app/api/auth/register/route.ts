import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendEmail } from '@/lib/email';
import { generateOtp, hashOtp, OTP_TTL_MS } from '@/lib/otp';
import { SUPER_ADMIN_EMAIL } from '@/lib/admin';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anonymous';
  const limited = checkRateLimit(`register:${ip}`, 5, 60_000);
  if (!limited.ok) return NextResponse.json({ error: 'Too many signup attempts. Please try again shortly.' }, { status: 429 });

  const body = await request.json();
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  const name = String(body.name ?? '').trim().slice(0, 120) || email.split('@')[0];

  if (!EMAIL_PATTERN.test(email)) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing?.verified) return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });

  const user = existing
    ? await prisma.user.update({ where: { id: existing.id }, data: { name, password: await bcrypt.hash(password, 10), verified: false, disabled: false } })
    : await prisma.user.create({
        data: {
          email,
          name,
          password: await bcrypt.hash(password, 10),
          role: email === SUPER_ADMIN_EMAIL ? 'super_admin' : 'user',
          verified: false,
          disabled: false
        }
      });

  const otp = generateOtp();
  await prisma.emailOtp.deleteMany({ where: { email, purpose: 'signup' } });
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
    subject: 'Verify your TenderNova account',
    text: `Your TenderNova verification code is ${otp}. It expires in 5 minutes.`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827"><h2>Verify your TenderNova account</h2><p>Your verification code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${otp}</p><p>This code expires in 5 minutes.</p></div>`
  });

  if (!delivery.ok) {
    if (process.env.ALLOW_UNVERIFIED_EMAIL_SIGNUP === 'true') {
      await prisma.emailOtp.deleteMany({ where: { email, purpose: 'signup' } });
      await prisma.user.update({ where: { id: user.id }, data: { verified: true, disabled: false } });
      return NextResponse.json({ ok: true, email, verified: true, warning: 'Email delivery is unavailable, so verification was skipped.' });
    }
    return NextResponse.json({ error: delivery.error || 'Could not send verification email.' }, { status: 502 });
  }

  return NextResponse.json({ ok: true, email });
}
