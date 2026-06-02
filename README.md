# TenderNova

TenderNova is an AI-powered tender intelligence platform for analyzing tender documents, comparing opportunities, generating proposals, and managing procurement workflows from one modern dashboard.

The platform is built as a production-style SaaS application with authentication, protected routes, database storage, AI document processing, proposal generation, admin controls, and deployment support.

## Live Demo

```text
https://tender-nova-qrof.vercel.app
```

## Key Features

- Google authentication with protected dashboard routes
- Tender upload support for PDF, DOCX, and TXT documents
- AI tender analysis with summary, deadline, budget, eligibility, risks, requirements, and key dates
- AI proposal generation from uploaded tender context
- Tender comparison with score, pros, cons, risk level, and winner recommendation
- Document-aware AI chatbot for tender questions
- Dashboard with real database-driven tender and proposal data
- Admin panel with user, log, API usage, contact message, and system monitoring views
- Contact form with database storage and email delivery support
- Responsive dark SaaS UI with clean cards, charts, and professional layouts

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js, React, TypeScript |
| Styling | Tailwind CSS, Framer Motion, Lucide Icons |
| Authentication | NextAuth, Google OAuth |
| Database | PostgreSQL, Neon |
| ORM | Prisma |
| AI | Mistral API, optional Anthropic support |
| Document Parsing | pdf-parse, Mammoth, OCR support |
| Email | Resend |
| Charts | Recharts |
| Deployment | Vercel |

## Project Structure

```text
TenderNova/
├── frontend/
│   ├── app/                  # Next.js pages and API routes
│   ├── components/           # Reusable UI components
│   ├── lib/                  # Auth, AI, Prisma, email, parser, and utility logic
│   ├── prisma/               # Prisma schema and seed file
│   ├── generated/            # Generated Prisma client
│   └── package.json
├── backend/                  # Backend source/reference services
├── requirements.txt
├── RUNNING.md
└── README.md
```

## Main Application Flow

1. User signs in using Google.
2. User uploads a tender document.
3. The app extracts readable text from the document.
4. The extracted text is sent to the AI analysis pipeline.
5. AI returns structured tender data such as eligibility, risks, requirements, deadline, and budget.
6. The result is stored in PostgreSQL using Prisma.
7. User can generate proposals, compare tenders, chat with the tender, and export reports.
8. Admin can monitor users, API usage, contact messages, and platform activity.

## Important Pages

| Page | Purpose |
| --- | --- |
| `/` | SaaS landing page |
| `/login` | Authentication page |
| `/dashboard` | Main analytics dashboard |
| `/upload` | Upload tender documents |
| `/tenders` | Manage uploaded tenders |
| `/tenders/[id]` | Tender detail and AI analysis |
| `/proposals` | Generate and manage AI proposals |
| `/compare` | Compare multiple tenders |
| `/chatbot` | Ask questions about tender documents |
| `/settings` | User settings |
| `/admin` | Admin-only monitoring panel |
| `/about` | About and team page |
| `/contact` | Contact form |

## Environment Variables

Create a `.env` file inside the `frontend` folder.

```env
DATABASE_URL="your_neon_postgresql_url"

NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your_nextauth_secret"

GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"

AI_PROVIDER="mistral"
MISTRAL_API_KEY="your_mistral_api_key"
MISTRAL_MODEL="mistral-large-latest"
MISTRAL_API_URL="https://api.mistral.ai/v1/chat/completions"

MISTRAL_OCR_ENABLED="true"
MISTRAL_OCR_MODEL="mistral-ocr-latest"
MISTRAL_OCR_URL="https://api.mistral.ai/v1/ocr"

RESEND_API_KEY="your_resend_api_key"
CONTACT_FROM_EMAIL="TenderNova <onboarding@resend.dev>"
CONTACT_TO_EMAIL="your_resend_account_email"

ADMIN_EMAIL=" "
SUPER_ADMIN_PASSWORD="your_admin_password"
```

For Vercel deployment, set the same variables in:

```text
Vercel Project -> Settings -> Environment Variables
```

For production, update:

```env
NEXTAUTH_URL="https://your-vercel-domain.vercel.app"
```

## Local Setup

Clone the repository:

```bash
git clone <your-repository-url>
cd <your-repository-folder>
```

Install frontend dependencies:

```bash
cd frontend
npm install
```

Generate Prisma client:

```bash
npx prisma generate
```

Push schema to database:

```bash
npx prisma db push
```

Optional seed:

```bash
npm run seed
```

Start development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Build

```bash
cd frontend
npm run build
```

## Vercel Deployment

Recommended Vercel settings:

```text
Framework Preset: Next.js
Root Directory: frontend
Build Command: npm run build
Install Command: npm install
Output Directory: .next
```

After connecting GitHub to Vercel:

```bash
git add .
git commit -m "Update TenderNova"
git push
```

Vercel will automatically create a new deployment.

## Google OAuth Setup

In Google Cloud Console, add these URLs.

Authorized JavaScript origins:

```text
http://localhost:3000
https://your-vercel-domain.vercel.app
```

Authorized redirect URIs:

```text
http://localhost:3000/api/auth/callback/google
https://your-vercel-domain.vercel.app/api/auth/callback/google
```

## Resend Email Note

Resend free testing mode can only send emails to the account owner's email address. To send emails to any user, verify a custom domain in Resend.

For free testing, set:

```env
CONTACT_TO_EMAIL="your_resend_account_email"
CONTACT_FROM_EMAIL="TenderNova <onboarding@resend.dev>"
```

## Database

The project uses Prisma with PostgreSQL. Main models include:

- User
- Tender
- Proposal
- ChatMessage
- ContactMessage
- ApiKey
- LoginEvent
- AdminLog
- ProcessingJob
- EmailOtp

## Security Highlights

- Environment variables are used for all secrets
- Dashboard routes are protected by authentication
- Admin routes are protected by role-based access
- API routes validate request data
- Sensitive keys are not exposed in frontend UI
- Prisma is used to reduce unsafe database query handling

## Team

- Savan Patel - Founder
- Yug Khatri - Co-Founder

## Future Improvements

- Verified production email domain
- Advanced OCR queue processing
- Calendar reminders for tender deadlines
- Cloud file storage
- More detailed usage analytics
- Multi-workspace support

## Summary

TenderNova is a full-stack AI SaaS project that combines document parsing, AI analysis, proposal generation, tender comparison, chatbot assistance, authentication, database storage, admin monitoring, and deployment-ready architecture.

