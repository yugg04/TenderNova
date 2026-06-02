import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { SUPER_ADMIN_EMAIL } from '@/lib/admin';

const oauthProviders = [
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET })
    : null
].filter(Boolean) as NextAuthOptions['providers'];

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    ...oauthProviders,
    CredentialsProvider({
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        name: { label: 'Name', type: 'text' },
        mode: { label: 'Mode', type: 'text' }
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase();
        const password = credentials?.password ?? '';
        if (!email || !password) throw new Error('Email and password are required');

        const user = await prisma.user.findUnique({ where: { email } });
        if (user && !user.verified) {
          await logLogin({ email, provider: 'credentials', success: false, reason: 'email_unverified', userId: user.id });
          throw new Error('Verify your email before signing in');
        }
        if (user?.disabled) {
          await logLogin({ email, provider: 'credentials', success: false, reason: 'disabled', userId: user.id });
          throw new Error('This account has been disabled');
        }
        if (!user?.password) {
          await logLogin({ email, provider: 'credentials', success: false, reason: 'not_found', userId: user?.id });
          throw new Error('No account found for this email');
        }
        const ok = await bcrypt.compare(password, user.password);
        if (!ok) {
          await logLogin({ email, provider: 'credentials', success: false, reason: 'bad_password', userId: user.id });
          throw new Error('Incorrect password');
        }
        await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), lastSeenAt: new Date() } });
        await logLogin({ email, provider: 'credentials', success: true, userId: user.id });
        return { id: user.id, email: user.email, name: user.name };
      }
    })
  ],
  callbacks: {
    async signIn({ user }) {
      if (user.email) {
        const email = user.email.toLowerCase();
        const saved = await prisma.user.upsert({
          where: { email },
          update: { name: user.name ?? undefined, image: user.image ?? undefined, verified: true, role: email === SUPER_ADMIN_EMAIL ? 'super_admin' : undefined, lastLoginAt: new Date(), lastSeenAt: new Date() },
          create: { email, name: user.name, image: user.image, verified: true, role: email === SUPER_ADMIN_EMAIL ? 'super_admin' : 'user', lastLoginAt: new Date(), lastSeenAt: new Date() }
        });
        const existing = await prisma.user.findUnique({ where: { email }, select: { disabled: true } });
        if (existing?.disabled) {
          await logLogin({ email, provider: 'oauth', success: false, reason: 'disabled', userId: saved.id });
          return false;
        }
        await logLogin({ email, provider: 'oauth', success: true, userId: saved.id });
      }
      return true;
    },
    async jwt({ token }) {
      if (token.email) {
        const user = await prisma.user.findUnique({
          where: { email: token.email },
          select: { id: true, role: true, name: true, image: true }
        });
        if (user) {
          token.sub = user.id;
          token.name = user.name ?? token.name;
          token.picture = user.image ?? token.picture;
          (token as any).role = user.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.image = token.picture;
        (session.user as any).id = token.sub;
        (session.user as any).role = (token as any).role;
      }
      return session;
    }
  }
};

async function logLogin(input: { email: string; provider: string; success: boolean; reason?: string; userId?: string }) {
  await prisma.loginEvent.create({
    data: {
      email: input.email.toLowerCase(),
      provider: input.provider,
      success: input.success,
      reason: input.reason,
      userId: input.userId
    }
  }).catch(() => undefined);
}
