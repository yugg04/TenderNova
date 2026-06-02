import { MarketingFooter, MarketingNav } from '@/components/marketing/MarketingShell';

export const metadata = { title: 'Terms and Conditions | TenderNova' };

export default function TermsPage() {
  return (
    <main className="min-h-screen [background:radial-gradient(circle_at_top_left,rgba(99,102,241,0.18),transparent_32%),#0A0B0F]">
      <MarketingNav />
      <section className="mx-auto max-w-3xl px-5 py-20">
        <h1 className="text-4xl font-bold">Terms and Conditions</h1>
        <div className="mt-8 space-y-5 leading-7 text-slate-300">
          <p>TenderNova provides AI-assisted tender analysis, proposal drafting, comparison, and workflow tools.</p>
          <p>AI outputs should be reviewed by qualified users before tender submission, commercial decisions, or legal reliance.</p>
          <p>Users are responsible for uploading documents they are authorized to process and for maintaining accurate account information.</p>
          <p>Unauthorized access, abuse of APIs, or attempts to bypass administrative controls are not permitted.</p>
        </div>
      </section>
      <MarketingFooter />
    </main>
  );
}
