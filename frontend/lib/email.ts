export async function sendEmail(input: { to: string; subject: string; text: string; html?: string; replyTo?: string }) {
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.CONTACT_FROM_EMAIL || process.env.AUTH_FROM_EMAIL;

  if (!resendKey || !fromEmail) {
    return { ok: false, error: 'Email service is not configured. Set RESEND_API_KEY and CONTACT_FROM_EMAIL in frontend/.env.' };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [input.to],
      reply_to: input.replyTo,
      subject: input.subject,
      text: input.text,
      html: input.html
    })
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    return { ok: false, error: `Email delivery failed: ${response.status} ${detail}`.slice(0, 500) };
  }

  return { ok: true };
}
