'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Archive, Eye, Search, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { RiskBadge } from '@/components/tender/RiskBadge';
import { useToast } from '@/components/ui/Toast';

const columns = ['completed', 'archived'];

export function TenderManager({ initialTenders }: { initialTenders: any[] }) {
  const [tenders, setTenders] = useState(initialTenders);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const toast = useToast();

  const filtered = useMemo(() => tenders.filter(tender => {
    const text = `${tender.title} ${tender.category ?? ''} ${tender.summary ?? ''}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (status === 'all' || tender.status === status);
  }), [query, status, tenders]);

  async function updateTender(id: string, data: any) {
    const response = await fetch(`/api/tenders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) return toast('Could not update tender', 'error');
    const updated = await response.json();
    setTenders(current => current.map(t => t.id === id ? updated : t));
    toast('Tender updated', 'success');
  }

  async function deleteTender(id: string) {
    const response = await fetch(`/api/tenders/${id}`, { method: 'DELETE' });
    if (!response.ok) return toast('Could not delete tender', 'error');
    setTenders(current => current.filter(t => t.id !== id));
    toast('Tender deleted', 'success');
  }

  return (
    <div className="space-y-6">
      <div className="glass rounded-lg p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3">
            <Search className="h-4 w-4 text-slate-400" />
            <input value={query} onChange={event => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="Search tenders, categories, summaries..." />
          </label>
          <select value={status} onChange={event => setStatus(event.target.value)} className="rounded-lg border border-white/10 bg-[#111827] px-4 py-3 text-sm outline-none">
            <option value="all">All statuses</option>
            {['completed', 'analysis_failed', 'lost', 'archived'].map(item => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {columns.map(column => (
          <div key={column} className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold capitalize text-slate-200">{column}</h2>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">{filtered.filter(t => t.status === column).length}</span>
            </div>
            <div className="space-y-3">
              {filtered.filter(t => t.status === column).map(tender => <TenderRow key={tender.id} tender={tender} onUpdate={updateTender} onDelete={deleteTender} />)}
            </div>
          </div>
        ))}
      </div>

      <div className="glass overflow-x-auto rounded-lg p-5">
        <h2 className="font-semibold">All tenders</h2>
        <table className="mt-4 w-full text-left text-sm">
          <thead className="text-slate-400"><tr><th className="py-3">Tender</th><th>Category</th><th>Deadline</th><th>Status</th><th>Risk</th><th>Actions</th></tr></thead>
          <tbody>{filtered.map(tender => <tr key={tender.id} className="border-t border-white/10"><td className="py-3 font-medium">{tender.title}</td><td>{tender.category ?? 'General'}</td><td>{formatDate(tender.deadline)}</td><td><span className="rounded-full bg-white/10 px-2 py-1 text-xs">{tender.status}</span></td><td><RiskBadge level={riskLevel(tender)} /></td><td><TenderActions tender={tender} onUpdate={updateTender} onDelete={deleteTender} /></td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

function TenderRow({ tender, onUpdate, onDelete }: { tender: any; onUpdate: (id: string, data: any) => void; onDelete: (id: string) => void }) {
  return (
    <div className="rounded-lg bg-white/5 p-3">
      <p className="line-clamp-2 text-sm font-medium">{tender.title}</p>
      <p className="mt-2 text-xs text-slate-400">{formatDate(tender.deadline)}</p>
      <div className="mt-3 flex gap-2">
        <Link className="grid h-8 w-8 place-items-center rounded-lg bg-white/10" href={`/tenders/${tender.id}`} aria-label="View"><Eye className="h-4 w-4" /></Link>
        <button className="grid h-8 w-8 place-items-center rounded-lg bg-white/10" onClick={() => onUpdate(tender.id, { status: 'archived' })} aria-label="Archive"><Archive className="h-4 w-4" /></button>
        <button className="grid h-8 w-8 place-items-center rounded-lg bg-roseGlow/15 text-rose-200" onClick={() => onDelete(tender.id)} aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

function TenderActions({ tender, onUpdate, onDelete }: { tender: any; onUpdate: (id: string, data: any) => void; onDelete: (id: string) => void }) {
  return (
    <div className="flex gap-2">
      <Link className="rounded-lg bg-white/10 px-3 py-2 text-xs" href={`/tenders/${tender.id}`}>View</Link>
      <button className="rounded-lg bg-white/10 px-3 py-2 text-xs" onClick={() => onUpdate(tender.id, { status: 'archived' })}>Archive</button>
      <button className="rounded-lg bg-roseGlow/15 px-3 py-2 text-xs text-rose-200" onClick={() => onDelete(tender.id)}>Delete</button>
    </div>
  );
}

function riskLevel(tender: any) {
  const risks = (tender.risks as any[]) ?? [];
  return risks.some(r => r.level === 'high') ? 'high' : risks.some(r => r.level === 'medium') ? 'medium' : 'low';
}
