import { prisma } from '@/lib/prisma';

export async function recordApiUsage(userId: string, endpoint: string, options: { tokens?: number; success?: boolean; error?: string } = {}) {
  const provider = (process.env.AI_PROVIDER ?? 'mistral').toLowerCase();
  const key = await prisma.apiKey.findFirst({ where: { provider, status: 'active' }, orderBy: { updatedAt: 'desc' } });
  const tokens = Math.max(0, Math.round(options.tokens ?? 0));

  await prisma.apiUsage.create({
    data: {
      userId,
      apiKeyId: key?.id,
      provider,
      endpoint,
      tokens,
      success: options.success ?? true,
      error: options.error
    }
  }).catch(() => undefined);

  if (key) {
    await prisma.apiKey.update({
      where: { id: key.id },
      data: {
        requestCount: { increment: 1 },
        failedCount: { increment: options.success === false ? 1 : 0 },
        tokenUsage: { increment: tokens },
        lastUsedAt: new Date()
      }
    }).catch(() => undefined);
  }
}

export function estimateTokens(...values: unknown[]) {
  return Math.ceil(values.map(value => String(value ?? '')).join(' ').length / 4);
}
