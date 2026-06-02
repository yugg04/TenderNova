import { MarketingFooter, MarketingNav } from '@/components/marketing/MarketingShell';

export const metadata = { title: 'Privacy Policy | TenderNova' };

export default function PrivacyPage() {
  return (
    <main className="min-h-screen [background:radial-gradient(circle_at_top_left,rgba(99,102,241,0.18),transparent_32%),#0A0B0F]">
      <MarketingNav />
      <section className="mx-auto max-w-3xl px-5 py-20">
        <h1 className="text-4xl font-bold">Privacy Policy</h1>
        <div className="mt-8 space-y-5 leading-7 text-slate-300">
          <p>TenderNova stores account, tender, proposal, contact, and activity data required to operate the platform.</p>
          <p>Uploaded documents and generated outputs are used to provide tender analysis, comparison, chat, proposal generation, and reporting features.</p>
          <p>API keys are encrypted before storage and are never exposed in frontend code. Access to admin functions is restricted through backend authorization.</p>
          <p>Contact messages are stored for follow-up and operational review by authorized administrators.</p>
        </div>
      </section>
      <MarketingFooter />
    </main>
  );
}
