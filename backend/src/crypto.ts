import { createDecipheriv, createHash } from 'crypto';

const ALGORITHM = 'aes-256-gcm';

export function decryptSecret(value: string) {
  const [ivText, tagText, encryptedText] = value.split('.');
  if (!ivText || !tagText || !encryptedText) throw new Error('Invalid encrypted secret');
  const decipher = createDecipheriv(ALGORITHM, encryptionKey(), Buffer.from(ivText, 'base64'));
  decipher.setAuthTag(Buffer.from(tagText, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(encryptedText, 'base64')), decipher.final()]).toString('utf8');
}

function encryptionKey() {
  return createHash('sha256').update(process.env.API_KEY_ENCRYPTION_SECRET || process.env.NEXTAUTH_SECRET || 'tendernova-local-dev-key').digest();
}
