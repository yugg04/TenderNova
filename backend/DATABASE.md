# Database Recommendation

Use PostgreSQL for this project.

## Connection URL

Use this format:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/tendernova?schema=public"
```

Examples:

```env
# Local PostgreSQL
DATABASE_URL="postgresql://postgres:password@localhost:5432/tendernova?schema=public"

# Neon pooled runtime URL
DATABASE_URL="postgresql://USER:PASSWORD@HOST-pooler.REGION.aws.neon.tech:5432/tendernova?sslmode=require"

# Supabase direct URL
DATABASE_URL="postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true"
```

## Recommendation

Use Neon if you deploy on Vercel or want simple serverless PostgreSQL. Use Supabase if you want database plus auth/storage dashboards.

## Setup

After setting `DATABASE_URL`, run from `frontend`:

```bash
npm install
npx prisma generate
npx prisma db push
npm run seed
```
