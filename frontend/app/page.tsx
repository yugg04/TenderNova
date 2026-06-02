import Link from 'next/link';
import { ArrowRight, BarChart3, Bot, CheckCircle2, ClipboardCheck, FileDown, FileSearch, GitCompare, LineChart, ShieldCheck, Sparkles, Wand2, Zap } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { FAQAccordion, HomepageContactForm } from '@/components/marketing/HomeInteractions';
import { MarketingFooter, MarketingNav } from '@/components/marketing/MarketingShell';

const features = [
  ['AI Tender Analysis', FileSearch, 'Extract deadlines, budgets, risks, documents, and compliance signals.'],
  ['Proposal Generation', Wand2, 'Generate structured drafts from real tender context and saved analysis.'],
  ['Tender Comparison', GitCompare, 'Compare opportunities by risk, fit, complexity, timeline, and readiness.'],
  ['AI-Based Opportunity Scoring', ClipboardCheck, 'Score eligibility, quality, opportunity, and success probability.'],
  ['PDF Export', FileDown, 'Export professional proposal and analysis reports for review.'],
  ['Smart Tender Insights', LineChart, 'Surface deadlines, requirements, risks, and next actions.'],
  ['Faster Proposal Drafting', Sparkles, 'Move from document review to a usable first draft faster.'],
  ['Document Understanding', Bot, 'Ask questions and understand key tender clauses in plain language.']
];

const workflow = ['Upload Tender', 'AI Extracts Insights', 'Compare and Analyze', 'Generate Proposal', 'Export Professional PDF'];

export const metadata = {
  title: 'TenderNova | AI Tender Intelligence Platform',
  description: 'Analyze tenders, compare opportunities, generate proposals, and manage AI bid workflows with TenderNova.'
};

export default async function LandingPage() {
  const data = await getHomepageData();

  return (
    <main className="min-h-screen overflow-hidden [background:radial-gradient(circle_at_top_left,rgba(99,102,241,0.22),transparent_34%),radial-gradient(circle_at_top_right,rgba(6,182,212,0.16),transparent_30%),#0A0B0F]">
      <MarketingNav />

      <section className="relative mx-auto grid min-h-[calc(100vh-74px)] max-w-7xl items-center gap-12 px-5 py-16 lg:grid-cols-[1fr_0.95fr] lg:py-24">
        <div className="absolute inset-x-8 top-24 h-48 rounded-full bg-cyanGlow/10 blur-3xl" />
        <div className="relative">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-cyan-100">
            <Sparkles className="h-4 w-4" />
            Enterprise AI for tender intelligence
          </div>
          <h1 className="max-w-4xl text-4xl font-black leading-tight md:text-6xl lg:text-7xl">
            Analyze tenders faster. Build better proposals.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            TenderNova turns tender documents into clear insights, risk signals, comparisons, and proposal drafts inside one secure SaaS workspace.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login?mode=register" className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigoGlow to-cyanGlow px-5 py-3 font-semibold text-white shadow-glass">
              Start Analysis <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
        <DashboardMockup data={data} />
      </section>

      <section className="border-y border-white/10 bg-white/[0.025] px-5 py-12">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-4">
          {[
            ['Tender clarity', 'Convert dense documents into concise summaries and action points.'],
            ['Document aware', 'Understand PDFs, scanned pages, requirements, and tender language.'],
            ['Proposal ready', 'Move from analysis to structured proposal drafts with less manual work.'],
            ['Team workflow', 'Keep tenders, insights, comparisons, and drafts in one workspace.']
          ].map(([title, copy]) => (
            <div key={title} className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
              <ShieldCheck className="h-5 w-5 text-cyan-200" />
              <h2 className="mt-4 font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20">
        <SectionHeader eyebrow="Founders" title="Built by a focused product team" copy="TenderNova is led by founders building practical AI software for tender-heavy teams." />
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {[
            ['Savan Patel', 'Founder', 'SP', 'https://www.linkedin.com/in/savan-patel-777aa3323?utm_source=share_via&utm_content=profile&utm_medium=member_ios'],
            ['Yug Khatri', 'Co-Founder', 'YK', 'https://www.linkedin.com/in/yug04/']
          ].map(([name, role, initials, href]) => (
            <div key={name} className="glass group rounded-xl p-8 shadow-glass transition hover:-translate-y-1 hover:border-cyanGlow/40">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-5">
                  <div className="grid h-24 w-24 place-items-center rounded-xl bg-gradient-to-br from-indigoGlow to-cyanGlow text-3xl font-black shadow-glass">{initials}</div>
                  <div><p className="text-3xl font-bold">{name}</p><p className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100">{role}</p></div>
                </div>
                <Link href={href} target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 px-4 py-2 text-center text-sm text-cyan-100 hover:bg-white/10">LinkedIn</Link>
              </div>
              <p className="mt-6 max-w-xl text-sm leading-6 text-slate-400">Focused on building a practical, polished AI tender workspace for teams that need faster analysis and better proposals.</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-5 py-20">
        <SectionHeader eyebrow="Capabilities" title="A complete AI bid workspace" copy="Focused tools for tender review, proposal drafting, comparison, scoring, and document understanding." />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(([title, Icon, copy]) => (
            <div key={title as string} className="glass group rounded-lg p-5 shadow-glass transition hover:-translate-y-1 hover:border-cyanGlow/40">
              <Icon className="h-7 w-7 text-cyan-200" />
              <h3 className="mt-5 font-semibold">{title as string}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{copy as string}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="workflow" className="bg-white/[0.025] px-5 py-20">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Workflow" title="From upload to proposal in one flow" copy="A clean process for reducing manual review and moving faster with confidence." />
          <div className="mt-10 grid gap-3 lg:grid-cols-5">
            {workflow.map((step, index) => (
              <div key={step} className="relative rounded-lg border border-white/10 bg-black/20 p-5">
                <div className="text-sm font-semibold text-cyan-200">0{index + 1}</div>
                <h3 className="mt-4 font-semibold">{step}</h3>
                <div className="mt-5 h-1 rounded-full bg-white/10">
                  <div className="h-1 rounded-full bg-gradient-to-r from-indigoGlow to-cyanGlow" style={{ width: `${((index + 1) / workflow.length) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-20 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <SectionHeader eyebrow="Product preview" title="Your tender command center" copy="A clear workspace for tender analysis, proposal generation, AI insights, and bid progress." />
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <PreviewMetric label="Tenders" value={data.tenders} />
            <PreviewMetric label="Proposals" value={data.proposals} />
            <PreviewMetric label="Analyzed" value={data.analyzedTenders} />
            <PreviewMetric label="In Progress" value={data.inProgressTenders} />
          </div>
        </div>
        <div className="glass rounded-lg p-5 shadow-glass">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-400">Analysis pipeline</p>
              <h3 className="mt-1 text-xl font-semibold">Tender insights</h3>
            </div>
            <BarChart3 className="h-6 w-6 text-cyan-200" />
          </div>
          <div className="mt-6 space-y-4">
            {data.statusBars.length ? data.statusBars.map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-sm"><span>{formatStatus(item.label)}</span><span className="text-slate-400">{item.count}</span></div>
                <div className="mt-2 h-2 rounded-full bg-white/10"><div className="h-2 rounded-full bg-gradient-to-r from-indigoGlow to-cyanGlow" style={{ width: `${item.percent}%` }} /></div>
              </div>
            )) : <p className="rounded-lg bg-white/5 p-4 text-sm text-slate-400">No tender activity yet. Upload a tender to populate this dashboard preview.</p>}
          </div>
        </div>
      </section>

      <section className="bg-white/[0.025] px-5 py-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2">
          <div className="glass rounded-lg p-6 shadow-glass">
            <Bot className="h-8 w-8 text-cyan-200" />
            <h2 className="mt-5 text-3xl font-bold">Why choose TenderNova</h2>
            <p className="mt-4 leading-7 text-slate-400">TenderNova reduces repetitive document review and gives bid teams a sharper operating system for procurement work.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {['Faster Tender Processing', 'AI Automation', 'Enterprise Security', 'Reduced Manual Work', 'Better Proposal Quality', 'Smart Insights'].map(item => (
              <div key={item} className="rounded-lg border border-white/10 bg-black/20 p-5">
                <CheckCircle2 className="h-5 w-5 text-emeraldGlow" />
                <p className="mt-4 font-medium">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white/[0.025] px-5 py-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeader eyebrow="FAQ" title="Questions teams ask before adopting TenderNova" copy="Short answers for AI workflows, comparison, proposal generation, and data handling." />
          <FAQAccordion />
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.025] px-5 py-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <SectionHeader eyebrow="Contact" title="Talk to us about your tender workflow" copy="Send a short note and the message will be delivered to the TenderNova team." />
          <HomepageContactForm />
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}

async function getHomepageData() {
  const [tenders, proposals, analyzedTenders, inProgressTenders, statuses] = await Promise.all([
    prisma.tender.count().catch(() => 0),
    prisma.proposal.count().catch(() => 0),
    prisma.tender.count({ where: { status: 'completed' } }).catch(() => 0),
    prisma.tender.count({ where: { status: { in: ['uploaded', 'ai_analyzing', 'processing'] } } }).catch(() => 0),
    prisma.tender.groupBy({ by: ['status'], _count: { status: true } }).catch(() => [])
  ]);
  const maxStatus = Math.max(1, ...statuses.map(item => item._count.status));
  const statusBars = statuses.slice(0, 5).map(item => ({ label: item.status, count: item._count.status, percent: Math.max(8, Math.round((item._count.status / maxStatus) * 100)) }));

  return { tenders, proposals, analyzedTenders, inProgressTenders, statusBars };
}

function DashboardMockup({ data }: { data: Awaited<ReturnType<typeof getHomepageData>> }) {
  return (
    <div className="relative">
      <div className="absolute -inset-5 rounded-3xl bg-gradient-to-br from-indigoGlow/20 to-cyanGlow/10 blur-2xl" />
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#0d1117]/95 shadow-2xl">
        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-4">
          <span className="h-2.5 w-2.5 rounded-full bg-roseGlow" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-emeraldGlow" />
          <span className="ml-3 text-xs text-slate-500">TenderNova dashboard</span>
        </div>
        <div className="grid gap-4 p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4"><p className="text-xs text-slate-500">Tender analysis</p><p className="mt-2 font-semibold">Requirements, risks, dates</p></div>
            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4"><p className="text-xs text-slate-500">Proposal generation</p><p className="mt-2 font-semibold">Structured bid drafts</p></div>
            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4"><p className="text-xs text-slate-500">AI insights</p><p className="mt-2 font-semibold">Opportunity scoring</p></div>
          </div>
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
              <div className="flex items-center justify-between"><span className="text-sm text-slate-400">Tender workflow</span><Zap className="h-4 w-4 text-cyan-200" /></div>
              <div className="mt-4 space-y-3">
                {['Upload', 'Analyze', 'Compare', 'Draft', 'Export'].map((item, index) => <div key={item} className="flex items-center gap-3"><span className="grid h-7 w-7 place-items-center rounded-lg bg-cyanGlow/15 text-xs text-cyan-100">{index + 1}</span><span className="text-sm">{item}</span></div>)}
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
              <div className="flex items-center justify-between"><span className="text-sm text-slate-400">Dashboard analytics</span><BarChart3 className="h-4 w-4 text-cyan-200" /></div>
              <div className="mt-4 space-y-3">
                {data.statusBars.length ? data.statusBars.slice(0, 4).map(item => <div key={item.label} className="h-2 rounded-full bg-white/10"><div className="h-2 rounded-full bg-cyanGlow" style={{ width: `${item.percent}%` }} /></div>) : <p className="text-sm text-slate-500">Waiting for tender data.</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewMetric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4"><p className="text-sm text-slate-400">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>;
}

function SectionHeader({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-bold leading-tight md:text-4xl">{title}</h2>
      <p className="mt-4 leading-7 text-slate-400">{copy}</p>
    </div>
  );
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}
