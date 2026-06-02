'use client';

import { FormEvent, useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

type FormState = {
  fullName: string;
  email: string;
  subject: string;
  message: string;
};

const initialState: FormState = { fullName: '', email: '', subject: '', message: '' };

export function ContactForm() {
  const [form, setForm] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const error = validate(form);
    if (error) return toast(error, 'error');

    setLoading(true);
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Message could not be sent.');
      setForm(initialState);
      toast('Your message has been sent.', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Message could not be sent.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="glass rounded-lg p-5 shadow-glass md:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full Name" value={form.fullName} onChange={value => setForm(current => ({ ...current, fullName: value }))} />
        <Field label="Email" type="email" value={form.email} onChange={value => setForm(current => ({ ...current, email: value }))} />
      </div>
      <div className="mt-4">
        <Field label="Subject" value={form.subject} onChange={value => setForm(current => ({ ...current, subject: value }))} />
      </div>
      <label className="mt-4 block text-sm font-medium text-slate-200">
        <span className="sr-only">Website</span>
        <input tabIndex={-1} autoComplete="off" value="" name="website" className="hidden" readOnly />
      </label>
      <label className="mt-4 block text-sm font-medium text-slate-200">
        Message
        <textarea value={form.message} onChange={event => setForm(current => ({ ...current, message: event.target.value }))} rows={7} className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm leading-6 outline-none transition focus:border-cyanGlow" placeholder="Tell us what you want to build or improve with TenderNova." />
      </label>
      <button disabled={loading} className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigoGlow to-cyanGlow px-5 font-semibold text-white disabled:opacity-60 sm:w-auto">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Send Message
      </button>
    </form>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block text-sm font-medium text-slate-200">
      {label}
      <input type={type} value={value} onChange={event => onChange(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/30 px-4 text-sm outline-none transition focus:border-cyanGlow" />
    </label>
  );
}

function validate(form: FormState) {
  if (!form.fullName.trim() || !form.email.trim() || !form.subject.trim() || !form.message.trim()) return 'All fields are required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Enter a valid email address.';
  if (form.message.trim().length < 20) return 'Message must be at least 20 characters.';
  return '';
}
