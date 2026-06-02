# TenderNova Production Cleanup

## Started

- PostgreSQL is now the expected database for frontend and backend.
- Prisma uses the PostgreSQL driver adapter required by Prisma 7.
- `.env.example` files include PostgreSQL connection string templates.
- Mistral is supported through `AI_PROVIDER="mistral"` and `MISTRAL_API_KEY`.

## Next Tasks

1. Replace placeholder `DATABASE_URL` values in:
   - `frontend/.env`
   - `backend/.env`

2. Push schema to PostgreSQL:

   ```bash
   cd frontend
   npx prisma generate
   npx prisma db push
   npm run seed
   ```

3. Auth hardening:
   - Add password reset.
   - Add email verification.
   - Move `NEXTAUTH_SECRET` to a strong production secret.
   - Remove demo-login assumptions from standalone backend auth.

4. File storage:
   - Replace database-only PDF text storage with object storage.
   - Recommended: S3, Cloudflare R2, Supabase Storage, or UploadThing.

5. Proposal export:
   - Replace `window.print()` with server-side PDF generation.
   - Recommended: Playwright PDF or React PDF.

6. Payments and plans:
   - Add Stripe checkout and webhooks if Free/Pro/Enterprise plans are real.

7. Tests:
   - Add API route tests for upload, analysis, proposal CRUD, compare, and chat.
   - Add at least one UI smoke test for the dashboard flow.
