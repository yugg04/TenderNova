import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { TenderCard } from '@/components/tender/TenderCard';
import { FileText, Sparkles, Target, TrendingUp, Upload, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { DashboardCharts } from '@/components/dashboard/DashboardCharts';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const user = await prisma.user.findUnique({ where: { email: session?.user?.email ?? '' }, include: { tenders: { orderBy: { createdAt: 'desc' } }, proposals: true, jobs: true } });
  const allTenders = user?.tenders ?? [];
  const tenders = allTenders.slice(0, 4);
  const completed = allTenders.filter(t => t.status === 'completed').length;
  const failed = allTenders.filter(t => t.status === 'analysis_failed').length;
  const successRate = completed + failed === 0 ? '0%' : `${Math.round((completed / (completed + failed)) * 100)}%`;
  const monthly = buildMonthly(allTenders);
  const categories = Object.entries(allTenders.reduce((acc, tender) => {
    const key = tender.category ?? 'Uncategorized';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>)).map(([name, value]) => ({ name, value }));
  const stats: { label: string; value: string | number; Icon: LucideIcon }[] = [
    { label: 'Total Tenders', value: allTenders.length, Icon: FileText },
    { label: 'Active Bids', value: allTenders.filter(t => !['archived', 'lost', 'won'].includes(t.status)).length, Icon: Target },
    { label: 'Proposals Generated', value: user?.proposals.length ?? 0, Icon: Sparkles },
    { label: 'AI Success Rate', value: successRate, Icon: TrendingUp }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-3xl font-bold">Dashboard</h1><p className="mt-1 text-slate-400">Tender intelligence overview and next actions.</p></div>
        <Link href="/upload" className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigoGlow to-cyanGlow px-4 py-3 font-semibold"><Upload className="h-4 w-4" /> Upload tender</Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, Icon }) => <div key={label} className="glass rounded-lg p-5"><Icon className="h-5 w-5 text-cyan-200" /><p className="mt-4 text-sm text-slate-400">{label}</p><p className="mt-1 text-3xl font-bold">{value}</p></div>)}
      </div>
      <DashboardCharts monthly={monthly} categories={categories} />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="glass rounded-lg p-5">
          <h2 className="font-semibold">Recent Tenders</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-slate-400"><tr><th className="py-3">Title</th><th>Status</th><th>Category</th><th>Deadline</th></tr></thead>
              <tbody>{tenders.map(t => <tr key={t.id} className="border-t border-white/10"><td className="py-3">{t.title}</td><td><span className="rounded-full bg-cyanGlow/15 px-2 py-1 text-xs text-cyan-200">{t.status}</span></td><td>{t.category ?? 'General'}</td><td>{t.deadline?.toLocaleDateString() ?? 'Open'}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
        <div className="glass rounded-lg p-5"><h2 className="font-semibold">AI Insights</h2><div className="mt-4 space-y-3 text-sm text-slate-300">{buildInsights(allTenders).map(insight => <p key={insight}>{insight}</p>)}</div></div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{tenders.map(tender => <TenderCard key={tender.id} tender={tender} />)}</div>
    </div>
  );
}

function buildMonthly(tenders: { createdAt: Date }[]) {
  const formatter = new Intl.DateTimeFormat('en', { month: 'short' });
  const months = Array.from({ length: 6 }).map((_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index));
    return { date, month: formatter.format(date), tenders: 0 };
  });
  for (const tender of tenders) {
    const match = months.find(m => m.date.getMonth() === tender.createdAt.getMonth() && m.date.getFullYear() === tender.createdAt.getFullYear());
    if (match) match.tenders += 1;
  }
  return months.map(({ month, tenders }) => ({ month, tenders }));
}

function buildInsights(tenders: any[]) {
  if (!tenders.length) return ['Upload your first tender to unlock AI recommendations and deadline intelligence.'];
  const highScore = tenders.filter(t => (t.successProbability ?? t.aiScore ?? 0) >= 75).length;
  const failed = tenders.filter(t => t.status === 'analysis_failed').length;
  const dueSoon = tenders.filter(t => t.deadline && new Date(t.deadline).getTime() - Date.now() < 14 * 86400000).length;
  return [
    `${highScore} tender(s) currently show strong success potential.`,
    failed ? `${failed} tender(s) need analysis retry or document review.` : 'No failed AI analysis jobs currently need attention.',
    dueSoon ? `${dueSoon} tender(s) have deadlines within 14 days.` : 'No urgent deadlines in the next 14 days.'
  ];
}
