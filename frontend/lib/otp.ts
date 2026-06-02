import bcrypt from 'bcryptjs';

export const OTP_TTL_MS = 5 * 60 * 1000;

export function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function hashOtp(code: string) {
  return bcrypt.hash(code, 10);
}

export async function verifyOtp(code: string, hash: string) {
  return bcrypt.compare(code, hash);
}
