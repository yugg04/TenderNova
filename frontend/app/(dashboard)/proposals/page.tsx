'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Download, Edit3, Eye, Save, Sparkles } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<any[]>([]);
  const [tenders, setTenders] = useState<any[]>([]);
  const [tenderId, setTenderId] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetch('/api/proposals').then(r => r.json()).then(setProposals);
    fetch('/api/tenders?take=100').then(r => r.json()).then(data => setTenders(data.items ?? []));
  }, []);

  async function generate() {
    if (!tenderId) return toast('Select a tender first', 'error');
    setGenerating(true);
    try {
      const response = await fetch('/api/proposals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenderId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Proposal generation failed');
      setProposals(current => [data, ...current]);
      setSelected(data);
      toast('Proposal generated from tender analysis', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Proposal generation failed', 'error');
    } finally {
      setGenerating(false);
    }
  }

  async function save() {
    const response = await fetch('/api/proposals', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(selected) });
    if (response.ok) {
      toast('Proposal saved', 'success');
      setEditing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-3xl font-bold">AI Proposals</h1><p className="mt-1 text-slate-400">Create, edit, review, and print generated proposals.</p></div><button onClick={() => window.print()} className="no-print inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-3"><Download className="h-4 w-4" /> Download as PDF</button></div>
      <div className="no-print glass rounded-lg p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Generate proposal</h2>
            <p className="mt-1 text-sm text-slate-400">{tenderId ? tenders.find(tender => tender.id === tenderId)?.title : 'Choose one tender below.'}</p>
          </div>
          <button disabled={generating || !tenderId} onClick={generate} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigoGlow to-cyanGlow px-4 py-3 font-semibold disabled:opacity-60"><Sparkles className="h-4 w-4" /> {generating ? 'Generating...' : 'Generate Proposal'}</button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {tenders.map(tender => (
            <button key={tender.id} type="button" onClick={() => setTenderId(tender.id)} className={`rounded-lg border p-4 text-left text-sm transition ${tenderId === tender.id ? 'border-cyanGlow bg-cyanGlow/10 text-white glow-cyan' : 'border-white/10 bg-black/20 text-slate-300 hover:border-white/25 hover:bg-white/5'}`}>
              <span className="line-clamp-2 font-medium">{tender.title}</span>
              <span className="mt-2 block text-xs text-slate-500">{tender.category || tender.status || 'Tender document'}</span>
            </button>
          ))}
        </div>
        {!tenders.length && <p className="mt-4 rounded-lg border border-dashed border-white/10 p-4 text-sm text-slate-400">Upload a tender before generating proposals.</p>}
      </div>
      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <div className="no-print grid gap-4">
          {!proposals.length && <div className="glass rounded-lg p-5 text-sm text-slate-400">No proposals yet. Select a tender above and generate a real AI proposal.</div>}
          {proposals.map(proposal => (
            <button key={proposal.id} onClick={() => { setSelected(proposal); setEditing(false); }} className="glass rounded-lg p-5 text-left transition hover:glow-cyan">
              <div className="flex items-start justify-between gap-3"><Sparkles className="h-5 w-5 text-cyan-200" /><span className="rounded-full bg-white/10 px-2 py-1 text-xs capitalize">{proposal.status}</span></div>
              <h2 className="mt-4 line-clamp-2 font-semibold">{proposal.title}</h2>
              <p className="mt-2 text-xs text-slate-400">{new Date(proposal.createdAt).toLocaleDateString()}</p>
              <div className="mt-4 flex gap-2 text-xs text-slate-300"><span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" /> View</span><span className="inline-flex items-center gap-1"><Edit3 className="h-3 w-3" /> Edit</span></div>
            </button>
          ))}
        </div>
        <div className="glass min-h-[640px] rounded-lg p-6">
          {!selected ? <div className="grid h-full place-items-center text-slate-400">Select a proposal to preview.</div> : (
            <div>
              <div className="no-print mb-5 flex justify-end gap-2"><button onClick={() => setEditing(v => !v)} className="rounded-lg bg-white/10 px-3 py-2 text-sm">Edit</button>{editing && <button onClick={save} className="inline-flex items-center gap-2 rounded-lg bg-cyanGlow px-3 py-2 text-sm font-semibold"><Save className="h-4 w-4" /> Save</button>}</div>
              {editing ? <textarea value={selected.content} onChange={event => setSelected({ ...selected, content: event.target.value })} className="min-h-[560px] w-full rounded-lg border border-white/10 bg-black/30 p-4 outline-none focus:border-cyanGlow" /> : (
                <article className="proposal-document mx-auto max-w-4xl rounded-lg bg-white/[0.025] p-6 md:p-9">
                  <ReactMarkdown components={{
                    h1: ({ children }) => <h1 className="mb-6 border-b border-white/10 pb-4 text-3xl font-bold leading-tight">{children}</h1>,
                    h2: ({ children }) => <h2 className="mb-3 mt-8 text-xl font-semibold text-cyan-100">{children}</h2>,
                    h3: ({ children }) => <h3 className="mb-2 mt-5 text-base font-semibold">{children}</h3>,
                    p: ({ children }) => <p className="mb-4 leading-7 text-slate-200">{children}</p>,
                    ul: ({ children }) => <ul className="mb-5 space-y-2 pl-5 text-slate-200">{children}</ul>,
                    ol: ({ children }) => <ol className="mb-5 list-decimal space-y-2 pl-5 text-slate-200">{children}</ol>,
                    li: ({ children }) => <li className="leading-7">{children}</li>,
                    table: ({ children }) => <div className="my-6 overflow-x-auto"><table className="w-full border-collapse text-sm">{children}</table></div>,
                    th: ({ children }) => <th className="border border-white/10 bg-white/10 px-3 py-2 text-left font-semibold">{children}</th>,
                    td: ({ children }) => <td className="border border-white/10 px-3 py-2 align-top">{children}</td>
                  }}>{cleanProposalMarkdown(selected.content)}</ReactMarkdown>
                </article>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function cleanProposalMarkdown(value: string) {
  return value
    .replace(/\r/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`{1,3}([^`]+)`{1,3}/g, '$1')
    .replace(/^\s*---+\s*$/gm, '')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}
