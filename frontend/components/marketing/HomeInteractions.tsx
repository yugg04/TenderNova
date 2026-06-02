'use client';

import { FormEvent, useState } from 'react';
import { ChevronDown, Loader2, Send } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

const faqs = [
  ['How does AI analysis work?', 'TenderNova extracts text from uploaded documents, identifies tender requirements, then produces structured analysis for deadlines, eligibility, risks, documents, and proposal strategy.'],
  ['Can multiple tenders be compared?', 'Yes. TenderNova compares selected tenders by eligibility, timeline, risk, complexity, budget fit, and proposal readiness so teams can prioritize the strongest opportunity.'],
  ['How secure is the data?', 'TenderNova protects dashboard access with authentication and keeps tender workflows inside the user workspace.'],
  ['How are proposals generated?', 'Proposal drafts are generated from the tender text and saved analysis, then formatted into clear business sections that teams can review, edit, and export.'],
  ['Can I export reports?', 'Yes. TenderNova supports professional exports for proposals and analysis reports so teams can review and share outputs more easily.']
];

export function FAQAccordion() {
  const [open, setOpen] = useState(0);

  return (
    <div className="space-y-3">
      {faqs.map(([question, answer], index) => (
        <div key={question} className="glass rounded-lg">
          <button onClick={() => setOpen(open === index ? -1 : index)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left">
            <span className="font-medium">{question}</span>
            <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${open === index ? 'rotate-180' : ''}`} />
          </button>
          {open === index && <p className="px-5 pb-5 text-sm leading-6 text-slate-400">{answer}</p>}
        </div>
      ))}
    </div>
  );
}

export function HomepageContactForm() {
  const [form, setForm] = useState({ fullName: '', email: '', message: '' });
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.fullName.trim() || !form.email.trim() || !form.message.trim()) return toast('Name, email, and message are required.', 'error');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return toast('Enter a valid email address.', 'error');
    if (form.message.trim().length < 20) return toast('Message must be at least 20 characters.', 'error');

    setLoading(true);
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, subject: 'Homepage inquiry', website: '' })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Message could not be sent.');
      setForm({ fullName: '', email: '', message: '' });
      toast('Message sent successfully.', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Message could not be sent.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="glass rounded-lg p-5 shadow-glass">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-200">
          Name
          <input value={form.fullName} onChange={event => setForm(current => ({ ...current, fullName: event.target.value }))} className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/30 px-4 outline-none focus:border-cyanGlow" />
        </label>
        <label className="text-sm font-medium text-slate-200">
          Email
          <input type="email" value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/30 px-4 outline-none focus:border-cyanGlow" />
        </label>
      </div>
      <label className="mt-4 block text-sm font-medium text-slate-200">
        Message
        <textarea value={form.message} onChange={event => setForm(current => ({ ...current, message: event.target.value }))} rows={5} className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-black/30 px-4 py-3 leading-6 outline-none focus:border-cyanGlow" />
      </label>
      <button disabled={loading} className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigoGlow to-cyanGlow px-5 font-semibold text-white disabled:opacity-60 sm:w-auto">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Send Message
      </button>
    </form>
  );
}
