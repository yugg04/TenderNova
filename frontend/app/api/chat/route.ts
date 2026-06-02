import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { streamTenderChat } from '@/lib/ai';
import { estimateTokens, recordApiUsage } from '@/lib/api-usage';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return new Response('Unauthorized', { status: 401 });
  const limit = checkRateLimit(`chat:${session.user.email}`, 30, 60_000);
  if (!limit.ok) return new Response('Too many chat requests', { status: 429, headers: { 'Retry-After': String(limit.retryAfter ?? 60) } });

  const { tenderId, messages } = await request.json();
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user || user.disabled) return new Response('Forbidden', { status: 403 });
  const tender = await prisma.tender.findFirst({ where: { id: tenderId, userId: user.id } });
  if (!tender) return new Response('Not found', { status: 404 });

  const latestUserMessage = Array.isArray(messages) ? [...messages].reverse().find((message: any) => message.role === 'user') : null;
  if (latestUserMessage?.content) {
    await prisma.chatMessage.create({ data: { userId: user.id, tenderId: tender.id, role: 'user', content: String(latestUserMessage.content) } }).catch(() => undefined);
  }

  const readable = await streamTenderChat(messages, tender.fileContent);
  const reader = readable.getReader();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let assistantText = '';

  const tracked = new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const text = decoder.decode(value);
          assistantText += text;
          controller.enqueue(encoder.encode(text));
        }
        await prisma.chatMessage.create({ data: { userId: user.id, tenderId: tender.id, role: 'assistant', content: assistantText } }).catch(() => undefined);
        await recordApiUsage(user.id, 'chat_stream', { tokens: estimateTokens(JSON.stringify(messages), assistantText), success: true });
        controller.close();
      } catch (error) {
        await recordApiUsage(user.id, 'chat_stream', { tokens: estimateTokens(JSON.stringify(messages)), success: false, error: error instanceof Error ? error.message : 'Chat failed' });
        controller.error(error);
      }
    }
  });

  return new Response(tracked, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
