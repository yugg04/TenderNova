import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import bcrypt from 'bcryptjs';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase() ?? 'savanmpatel1407@gmail.com';
  const password = process.env.SUPER_ADMIN_PASSWORD ?? 'stender@2005';

  await prisma.user.deleteMany({
    where: {
      email: {
        in: ['demo@tendernova.ai']
      }
    }
  });

  await prisma.user.upsert({
    where: { email },
    update: {
      name: 'Savan Patel',
      password: await bcrypt.hash(password, 10),
      role: 'super_admin',
      verified: true,
      disabled: false
    },
    create: {
      email,
      name: 'Savan Patel',
      password: await bcrypt.hash(password, 10),
      role: 'super_admin',
      verified: true,
      disabled: false
    }
  });
}

main().finally(async () => prisma.$disconnect());
