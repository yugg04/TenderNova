# Running TenderNova Locally

## 1. Environment

Create or update both files:

- `frontend/.env`
- `backend/.env`

Use PostgreSQL:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/TenderNova?schema=public"
```

Use Mistral:

```env
AI_PROVIDER="mistral"
MISTRAL_API_KEY="your-mistral-api-key"
MISTRAL_MODEL="mistral-large-latest"
MISTRAL_API_URL="https://api.mistral.ai/v1/chat/completions"
MISTRAL_OCR_ENABLED="true"
MISTRAL_OCR_MODEL="mistral-ocr-latest"
MISTRAL_OCR_URL="https://api.mistral.ai/v1/ocr"
ANTHROPIC_API_KEY=""
```

`MISTRAL_OCR_ENABLED="true"` sends scanned/image PDFs to Mistral OCR for text extraction.

Use Google login:

```env
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-with-a-long-random-secret"
GOOGLE_CLIENT_ID="your-google-oauth-client-id"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"
```

In Google Cloud Console, set the authorized redirect URI to:

```text
http://localhost:3000/api/auth/callback/google
```

After changing `.env`, restart `npm run dev`.

## 2. Database

From `frontend`:

```bash
npm install
npx prisma generate
npx prisma db push
npm run seed
```

## 3. Start Backend

From `backend`:

```bash
npm install
npm run dev
```

Backend:

```text
http://localhost:4000
http://localhost:4000/health
```

## 4. Start Frontend

From `frontend`:

```bash
npm run dev
```

Frontend:

```text
http://localhost:3000
```

Seeded demo login:

```text
demo@tendernova.ai
password123
```
