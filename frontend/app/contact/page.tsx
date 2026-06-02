import { Mail, MapPin, MessageSquare, ShieldCheck } from 'lucide-react';
import { ContactForm } from '@/components/contact/ContactForm';
import { MarketingFooter, MarketingNav } from '@/components/marketing/MarketingShell';

export const metadata = {
  title: 'Contact Us | TenderNova',
  description: 'Contact TenderNova for AI tender intelligence, proposal automation, and procurement workflow support.'
};

export default function ContactPage() {
  return (
    <main className="min-h-screen [background:radial-gradient(circle_at_top_left,rgba(99,102,241,0.2),transparent_32%),radial-gradient(circle_at_top_right,rgba(6,182,212,0.18),transparent_30%),#0A0B0F]">
      <MarketingNav />

      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-20 md:grid-cols-[0.9fr_1.1fr] md:py-28">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-cyan-100">
            <MessageSquare className="h-4 w-4" />
            Contact TenderNova
          </div>
          <h1 className="text-4xl font-black leading-tight md:text-6xl">Let us help with your tender workflow</h1>
          <p className="mt-6 text-lg leading-8 text-slate-300">
            Send us a message about your tender analysis, proposal generation, or procurement intelligence needs. We will review your request and respond with a practical next step.
          </p>

          <div className="mt-10 grid gap-4">
            <InfoCard icon={Mail} title="Email" value="support@tendernova.ai" />
            <InfoCard icon={MapPin} title="Region" value="India and global remote support" />
            <InfoCard icon={ShieldCheck} title="Security" value="Messages are stored securely for follow-up and admin review." />
          </div>
        </div>

        <ContactForm />
      </section>

      <MarketingFooter />
    </main>
  );
}

function InfoCard({ icon: Icon, title, value }: { icon: any; title: string; value: string }) {
  return (
    <div className="glass flex items-start gap-4 rounded-lg p-4">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/10 text-cyan-200">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-400">{value}</p>
      </div>
    </div>
  );
}
