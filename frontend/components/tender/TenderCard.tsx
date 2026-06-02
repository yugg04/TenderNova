import Link from 'next/link';
import { FileText, MessageSquare, Sparkles } from 'lucide-react';
import { daysUntil, formatDate } from '@/lib/utils';
import { RiskBadge } from '@/components/tender/RiskBadge';

export function TenderCard({ tender }: { tender: any }) {
  const eligibility = tender.eligibility as any;
  const score = eligibility?.score ?? 72;
  const days = daysUntil(tender.deadline);
  const risks = (tender.risks as any[]) ?? [];
  const riskLevel = risks.some(r => r.level === 'high') ? 'high' : risks.some(r => r.level === 'medium') ? 'medium' : 'low';

  return (
    <div className="glass group rounded-lg p-5 transition hover:-translate-y-1 hover:glow-cyan">
      <div className="flex items-start justify-between gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-lg bg-indigoGlow/15 text-cyan-200">
          <FileText className="h-5 w-5" />
        </div>
        <RiskBadge level={riskLevel} />
      </div>
      <h3 className="mt-4 line-clamp-2 min-h-12 text-lg font-semibold">{tender.title}</h3>
      <p className="mt-2 line-clamp-2 text-sm text-slate-400">{tender.summary ?? 'AI analysis pending.'}</p>
      <div className="mt-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">Deadline</p>
          <p className="text-sm font-medium">{days === null ? formatDate(tender.deadline) : `${days} days left`}</p>
        </div>
        <div className="relative grid h-14 w-14 place-items-center rounded-full bg-white/5">
          <span className="text-sm font-bold">{score}%</span>
        </div>
      </div>
      <div className="mt-5 flex gap-2">
        <Link className="flex-1 rounded-lg bg-white/10 px-3 py-2 text-center text-sm hover:bg-white/15" href={`/tenders/${tender.id}`}>View</Link>
        <Link aria-label="Generate Proposal" className="grid h-10 w-10 place-items-center rounded-lg bg-indigoGlow/20 text-indigo-100" href="/proposals"><Sparkles className="h-4 w-4" /></Link>
        <Link aria-label="Chat" className="grid h-10 w-10 place-items-center rounded-lg bg-cyanGlow/20 text-cyan-100" href="/chatbot"><MessageSquare className="h-4 w-4" /></Link>
      </div>
    </div>
  );
}
