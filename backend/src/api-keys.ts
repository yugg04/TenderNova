import { prisma } from './prisma';
import { decryptSecret } from './crypto';

export type ManagedKey = { id?: string; value: string };

export async function getProviderKeys(provider: string): Promise<ManagedKey[]> {
  const keys = await prisma.apiKey.findMany({
    where: { provider, status: 'active' },
    orderBy: [{ priority: 'asc' }, { updatedAt: 'desc' }]
  }).catch(() => []);

  const managed = keys.flatMap(key => {
    try {
      if (key.tokenLimit && key.tokenUsage >= key.tokenLimit) return [];
      return [{ id: key.id, value: decryptSecret(key.encryptedValue) }];
    } catch {
      return [];
    }
  });

  const envKey = provider === 'mistral' ? process.env.MISTRAL_API_KEY : process.env.ANTHROPIC_API_KEY;
  return envKey ? [...managed, { value: envKey }] : managed;
}

export async function markKeyFailure(id: string | undefined) {
  if (!id) return;
  await prisma.apiKey.update({ where: { id }, data: { failedCount: { increment: 1 }, lastUsedAt: new Date() } }).catch(() => undefined);
}

export async function markKeySuccess(id: string | undefined, tokens = 0) {
  if (!id) return;
  await prisma.apiKey.update({
    where: { id },
    data: { requestCount: { increment: 1 }, tokenUsage: { increment: Math.max(0, tokens) }, lastUsedAt: new Date() }
  }).catch(() => undefined);
}
