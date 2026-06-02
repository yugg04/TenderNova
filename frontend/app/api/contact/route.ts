import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendEmail } from '@/lib/email';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anonymous';
  const limited = checkRateLimit(`contact:${ip}`, 5, 60_000);
  if (!limited.ok) return NextResponse.json({ error: 'Too many contact attempts. Please try again shortly.' }, { status: 429 });

  try {
    const body = await request.json();
    const fullName = clean(body.fullName, 120);
    const email = clean(body.email, 160).toLowerCase();
    const subject = clean(body.subject, 160);
    const message = clean(body.message, 4000);
    const website = clean(body.website, 200);

    if (website) return NextResponse.json({ ok: true });
    if (!fullName || !email || !subject || !message) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }
    if (!EMAIL_PATTERN.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
    }
    if (message.length < 20) {
      return NextResponse.json({ error: 'Message must be at least 20 characters.' }, { status: 400 });
    }

    const saved = await prisma.contactMessage.create({
      data: { fullName, email, subject, message }
    });

    const delivery = await sendEmail({
      to: process.env.CONTACT_TO_EMAIL || 'savanmpatel1407@gmail.com',
      replyTo: email,
      subject: `TenderNova contact: ${subject}`,
      text: [
        `Name: ${fullName}`,
        `Email: ${email}`,
        `Subject: ${subject}`,
        '',
        message
      ].join('\n')
    });
    await prisma.contactMessage.update({
      where: { id: saved.id },
      data: { emailDelivered: delivery.ok, emailError: delivery.ok ? null : delivery.error }
    });

    if (!delivery.ok) {
      return NextResponse.json({ error: delivery.error || 'Message saved, but email delivery failed.' }, { status: 502 });
    }

    return NextResponse.json({ ok: true, delivered: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Could not send your message. Please try again.' }, { status: 500 });
  }
}

function clean(value: unknown, max: number) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}
