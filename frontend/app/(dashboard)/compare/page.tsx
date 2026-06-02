'use client';

import { useEffect, useMemo, useState } from 'react';
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts';
import { GitCompare } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export default function ComparePage() {
  const [tenders, setTenders] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  useEffect(() => {
    setMounted(true);
    fetch('/api/tenders').then(r => r.json()).then(data => setTenders(data.items));
  }, []);
  const selectedTenders = useMemo(() => tenders.filter(t => selected.includes(t.id)), [selected, tenders]);
  const chartRows = result?.comparison ?? selectedTenders.map(t => ({
    tenderId: t.id,
    title: t.title,
    eligibilityMatch: t.eligibility?.score ?? t.aiScore ?? 0,
    budgetFit: t.budget ? 65 : 0,
    timelineFit: t.deadline ? 55 : 0,
    risk: 100 - ((t.risks?.length ?? 0) * 15)
  }));
  const chartData = chartRows.map((row: any) => ({
    tender: row.title.slice(0, 14),
    eligibility: row.eligibilityMatch ?? 0,
    budget: row.budgetFit ?? 0,
    timeline: row.timelineFit ?? 0,
    risk: row.risk ?? (row.riskLevel === 'high' ? 35 : row.riskLevel === 'medium' ? 65 : 85)
  }));

  async function compare() {
    if (selected.length < 2) return toast('Select at least two tenders', 'error');
    setLoading(true);
    try {
      const response = await fetch('/api/compare', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenderIds: selected }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Comparison failed');
      setResult(data);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Comparison failed', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Compare Tenders</h1><p className="mt-1 text-slate-400">Choose opportunities and ask AI which one deserves priority.</p></div>
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <div className="glass rounded-lg p-5"><h2 className="font-semibold">Select tenders</h2><div className="mt-4 space-y-3">{tenders.map(tender => <label key={tender.id} className="flex cursor-pointer gap-3 rounded-lg bg-white/5 p-3 text-sm"><input type="checkbox" checked={selected.includes(tender.id)} onChange={event => setSelected(current => event.target.checked ? [...current, tender.id] : current.filter(id => id !== tender.id))} />{tender.title}</label>)}</div><button disabled={loading} onClick={compare} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigoGlow to-cyanGlow px-4 py-3 font-semibold disabled:opacity-60"><GitCompare className="h-4 w-4" /> {loading ? 'Comparing...' : 'Compare'}</button></div>
        <div className="space-y-5">
          {result?.recommendation && <div className="rounded-lg border border-cyanGlow/30 bg-cyanGlow/10 p-5"><h2 className="font-semibold text-cyan-100">Recommendation</h2><p className="mt-2 text-slate-200">{cleanText(result.recommendation)}</p></div>}
          <div className="glass rounded-lg p-5"><h2 className="font-semibold">Metrics radar</h2><div className="mt-4 h-80">{mounted ? <ResponsiveContainer><RadarChart data={chartData}><PolarGrid /><PolarAngleAxis dataKey="tender" /><Tooltip />{['eligibility', 'budget', 'timeline', 'risk'].map((key, index) => <Radar key={key} dataKey={key} stroke={['#06B6D4', '#6366F1', '#22C55E', '#F59E0B'][index]} fill={['#06B6D4', '#6366F1', '#22C55E', '#F59E0B'][index]} fillOpacity={0.08} />)}</RadarChart></ResponsiveContainer> : null}</div></div>
          <div className="glass rounded-lg p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">Comparison details</h2>
              <span className="text-xs text-slate-500">{(result?.comparison ?? selectedTenders).length} selected</span>
            </div>
            <div className="mt-4 space-y-4">
              {(result?.comparison ?? selectedTenders).map((row: any) => {
                const tenderId = row.tenderId ?? row.id;
                const isWinner = result?.winnerTenderId === tenderId;
                const pros = row.pros ?? ['Run comparison to calculate tender-specific pros'];
                const cons = row.cons ?? ['Run comparison to calculate tender-specific cons'];
                return (
                  <div key={tenderId ?? row.title} className={`rounded-lg border p-4 ${isWinner ? 'border-emeraldGlow/40 bg-emeraldGlow/10' : 'border-white/10 bg-black/20'}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Tender</p>
                        <h3 className="mt-1 break-words font-semibold leading-6">{row.title}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold">Score {row.score ?? row.eligibility?.score ?? '-'}</span>
                        {isWinner && <span className="rounded-full bg-emeraldGlow/20 px-3 py-2 text-xs font-semibold text-emerald-100">Best</span>}
                      </div>
                    </div>
                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      <div className="rounded-lg bg-white/[0.03] p-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">Pros</p>
                        <ul className="space-y-2 text-sm leading-6 text-slate-200">{pros.map((item: any, index: number) => <li key={index} className="break-words">{cleanText(item)}</li>)}</ul>
                      </div>
                      <div className="rounded-lg bg-white/[0.03] p-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-100">Cons</p>
                        <ul className="space-y-2 text-sm leading-6 text-slate-200">{cons.map((item: any, index: number) => <li key={index} className="break-words">{cleanText(item)}</li>)}</ul>
                      </div>
                    </div>
                  </div>
                );
              })}
              {!(result?.comparison ?? selectedTenders).length && <p className="rounded-lg border border-dashed border-white/10 p-4 text-sm text-slate-400">Select at least two tenders to compare.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function cleanText(value: unknown) {
  return String(value ?? '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/[*_`]/g, '')
    .replace(/^\s*---+\s*$/gm, '')
    .trim();
}
