import Link from 'next/link';
import { ExternalLink, ShieldCheck, Sparkles, Target, Users } from 'lucide-react';
import { MarketingFooter, MarketingNav } from '@/components/marketing/MarketingShell';

const team = [
  {
    name: 'Savan Patel',
    role: 'Founder',
    linkedin: 'https://www.linkedin.com/in/savan-patel-777aa3323?utm_source=share_via&utm_content=profile&utm_medium=member_ios',
    initials: 'SP'
  },
  {
    name: 'Yug Khatri',
    role: 'Co-Founder',
    linkedin: 'https://www.linkedin.com/in/yug04/',
    initials: 'YK'
  }
];

export const metadata = {
  title: 'About Us | TenderNova',
  description: 'Learn about TenderNova and the team building AI tender intelligence for bid teams.'
};

export default function AboutPage() {
  return (
    <main className="min-h-screen [background:radial-gradient(circle_at_top_left,rgba(99,102,241,0.2),transparent_32%),radial-gradient(circle_at_top_right,rgba(6,182,212,0.18),transparent_30%),#0A0B0F]">
      <MarketingNav />

      <section className="mx-auto max-w-7xl px-5 py-20 md:py-28">
        <div className="max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-cyan-100">
            <Sparkles className="h-4 w-4" />
            Built for modern procurement teams
          </div>
          <h1 className="text-4xl font-black leading-tight md:text-6xl">About TenderNova</h1>
          <p className="mt-6 text-lg leading-8 text-slate-300">
            TenderNova helps bid teams turn complex tender documents into clear business decisions. The platform combines document intelligence, risk review, eligibility scoring, proposal support, and tender comparison in one focused workspace.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {[
            ['Mission', Target, 'Make tender review faster, clearer, and more reliable for teams that need to respond with confidence.'],
            ['Platform', ShieldCheck, 'Bring analysis, compliance checks, proposal drafting, and bid strategy into a secure enterprise-grade workflow.'],
            ['Team', Users, 'Build a practical AI product that feels polished, useful, and trustworthy from upload to final proposal.']
          ].map(([title, Icon, copy]) => (
            <div key={title as string} className="glass rounded-lg p-6 shadow-glass">
              <Icon className="h-8 w-8 text-cyan-200" />
              <h2 className="mt-5 text-xl font-semibold">{title as string}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">{copy as string}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.025] px-5 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold md:text-4xl">Team Members</h2>
            <p className="mt-4 text-slate-400">The TenderNova team is focused on making AI tender intelligence practical, accurate, and easy to use for real bid workflows.</p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {team.map(member => (
              <article key={member.name} className="group glass rounded-lg p-6 shadow-glass transition duration-200 hover:-translate-y-1 hover:border-cyanGlow/40">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="grid h-16 w-16 place-items-center rounded-lg bg-gradient-to-br from-indigoGlow/90 to-cyanGlow/90 text-lg font-bold text-white">
                      {member.initials}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">{member.name}</h3>
                      <p className="mt-1 text-sm text-slate-400">{member.role}</p>
                    </div>
                  </div>
                  <Link href={member.linkedin} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-cyan-100 hover:bg-white/10">
                    <ExternalLink className="h-4 w-4" />
                    LinkedIn
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
