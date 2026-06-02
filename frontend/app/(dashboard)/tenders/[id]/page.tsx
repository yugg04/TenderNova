import Link from 'next/link';
import { notFound } from 'next/navigation';
import * as Tabs from '@radix-ui/react-tabs';
import { CheckCircle2, Download, MessageSquare, Sparkles, XCircle } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { daysUntil, formatDate } from '@/lib/utils';
import { EligibilityMeter } from '@/components/tender/EligibilityMeter';
import { RiskBadge } from '@/components/tender/RiskBadge';

export default async function TenderDetailPage({ params }: { params: { id: string } }) {
  const tender = await prisma.tender.findUnique({ where: { id: params.id } });
  if (!tender) notFound();
  const analysis: any = tender.analysis ?? {};
  const eligibility: any = tender.eligibility ?? analysis.eligibility ?? { score: 0, criteria: [], met: [], missing: [] };
  const requirements = analysis.requirements ?? { documents: [], technical: [], financial: [] };
  const risks: any[] = ((tender.risks as any[]) ?? analysis.risks ?? []).sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.level as 'high'] - { high: 0, medium: 1, low: 2 }[b.level as 'high']));
  const keyDates = analysis.keyDates ?? [];
  const days = daysUntil(tender.deadline);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-3 flex flex-wrap gap-2"><span className="rounded-full bg-indigoGlow/15 px-3 py-1 text-sm text-indigo-200">{tender.category ?? analysis.category ?? 'General'}</span><span className="rounded-full bg-cyanGlow/15 px-3 py-1 text-sm text-cyan-200">{days === null ? 'No deadline' : `${days} days left`}</span></div>
          <h1 className="max-w-4xl text-3xl font-bold">{tender.title}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/proposals" className="inline-flex items-center gap-2 rounded-lg bg-indigoGlow px-4 py-2 font-semibold"><Sparkles className="h-4 w-4" /> Generate Proposal</Link>
          <Link href="/chatbot" className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2"><MessageSquare className="h-4 w-4" /> Chat with AI</Link>
          <button className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2"><Download className="h-4 w-4" /> Export</button>
        </div>
      </div>
      <Tabs.Root defaultValue="overview" className="space-y-5">
        <Tabs.List className="flex flex-wrap gap-2 rounded-lg bg-white/5 p-2">
          {['overview', 'eligibility', 'risks', 'requirements'].map(tab => <Tabs.Trigger key={tab} value={tab} className="rounded-lg px-4 py-2 text-sm capitalize text-slate-300 data-[state=active]:bg-white/10 data-[state=active]:text-white">{tab}</Tabs.Trigger>)}
        </Tabs.List>
        <Tabs.Content value="overview" className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="glass rounded-lg p-5"><h2 className="font-semibold">AI Summary</h2><p className="mt-3 leading-7 text-slate-300">{tender.summary ?? analysis.summary ?? 'Analysis is still running. Refresh shortly for AI insights.'}</p></div>
          <div className="glass rounded-lg p-5"><h2 className="font-semibold">Budget</h2><p className="mt-3 text-2xl font-bold">{tender.budget ?? analysis.estimatedBudget ?? 'Not specified'}</p><p className="mt-3 text-sm text-slate-400">Deadline: {formatDate(tender.deadline)}</p></div>
          <div className="glass rounded-lg p-5 xl:col-span-2"><h2 className="font-semibold">Key dates</h2><div className="mt-4 grid gap-3 md:grid-cols-3">{keyDates.map((d: any) => <div key={d.event} className="rounded-lg bg-white/5 p-4"><p className="font-medium">{d.event}</p><p className="mt-1 text-sm text-slate-400">{d.date}</p></div>)}</div></div>
        </Tabs.Content>
        <Tabs.Content value="eligibility" className="grid gap-5 xl:grid-cols-[260px_1fr]">
          <div className="glass grid place-items-center rounded-lg p-6"><EligibilityMeter score={eligibility.score ?? 0} /></div>
          <div className="grid gap-5 md:grid-cols-3">
            <List title="Met requirements" icon="check" items={eligibility.met ?? []} />
            <List title="Missing requirements" icon="x" items={eligibility.missing ?? []} />
            <List title="Criteria" items={eligibility.criteria ?? []} />
          </div>
        </Tabs.Content>
        <Tabs.Content value="risks" className="space-y-4">
          <div className="glass rounded-lg p-5"><h2 className="font-semibold">Overall risk summary</h2><p className="mt-2 text-slate-300">Review high and medium risk clauses before committing commercial terms.</p></div>
          {risks.map((risk, index) => <div key={index} className="glass rounded-lg p-5"><RiskBadge level={risk.level} /><p className="mt-3 font-medium">{risk.description}</p><p className="mt-2 text-sm text-slate-400">Clause: {risk.clause ?? 'Not specified'}</p></div>)}
        </Tabs.Content>
        <Tabs.Content value="requirements" className="grid gap-5 md:grid-cols-3">
          <List title="Documents" items={requirements.documents ?? []} />
          <List title="Technical" items={requirements.technical ?? []} />
          <List title="Financial" items={requirements.financial ?? []} />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}

function List({ title, items, icon }: { title: string; items: string[]; icon?: 'check' | 'x' }) {
  return (
    <div className="glass rounded-lg p-5"><h3 className="font-semibold">{title}</h3><div className="mt-4 space-y-3">{items.length ? items.map(item => <div key={item} className="flex gap-3 text-sm text-slate-300">{icon === 'check' && <CheckCircle2 className="h-5 w-5 shrink-0 text-emeraldGlow" />}{icon === 'x' && <XCircle className="h-5 w-5 shrink-0 text-roseGlow" />}{!icon && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-cyanGlow" />}<span>{item}</span></div>) : <p className="text-sm text-slate-500">No items found.</p>}</div></div>
  );
}
