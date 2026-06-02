'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileText, FileUp, X } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

const steps = ['Extracting text...', 'Processing with AI...', 'Generating insights...'];
const MAX_DOCUMENT_BYTES = 200 * 1024 * 1024 * 1024;
const MAX_DOCUMENT_LABEL = '200GB';
const acceptedTypes = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt']
};

export default function UploadPage() {
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState('');
  const [busy, setBusy] = useState(false);
  const [queue, setQueue] = useState<File[]>([]);
  const router = useRouter();
  const toast = useToast();

  const onDrop = useCallback((files: File[]) => {
    const valid = files.filter(file => {
      const supported = Object.keys(acceptedTypes).includes(file.type) || /\.(pdf|docx|txt)$/i.test(file.name);
      if (!supported) toast(`${file.name} is not supported. Upload PDF, DOCX, or TXT.`, 'error');
      if (file.size > MAX_DOCUMENT_BYTES) toast(`${file.name} must be under ${MAX_DOCUMENT_LABEL}`, 'error');
      return supported && file.size <= MAX_DOCUMENT_BYTES;
    });
    setQueue(current => [...current, ...valid]);
  }, [toast]);

  async function uploadFiles() {
    if (!queue.length) return toast('Add at least one document', 'error');
    setBusy(true);
    setProgress(15);
    setStep(steps[0]);
    const timer = setInterval(() => {
      setProgress(value => Math.min(value + 18, 92));
      setStep(steps[Math.min(2, Math.floor(progress / 35))]);
    }, 700);
    try {
      const formData = new FormData();
      queue.forEach(file => formData.append('files', file));
      const response = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Upload failed');
      clearInterval(timer);
      setProgress(100);
      setStep(steps[2]);
      toast(data.warning ?? `${data.items?.length ?? 1} document(s) uploaded. AI analysis is running.`, data.warning ? 'info' : 'success');
      setQueue([]);
      router.push(data.items?.length > 1 ? '/tenders' : `/tenders/${data.id}`);
    } catch (error) {
      clearInterval(timer);
      toast(error instanceof Error ? error.message : 'Upload failed', 'error');
      setBusy(false);
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: true, accept: acceptedTypes });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div><h1 className="text-3xl font-bold">Upload Workspace</h1><p className="mt-1 text-slate-400">Drop PDF, DOCX, or TXT files. TenderNova extracts context, runs OCR when needed, and starts AI analysis.</p></div>
      <div {...getRootProps()} className={`grid min-h-[380px] cursor-pointer place-items-center rounded-lg border border-dashed p-8 text-center transition ${isDragActive ? 'border-cyanGlow bg-cyanGlow/10 glow-cyan' : 'border-white/15 bg-white/[0.03]'} ${busy ? 'animate-pulseBorder' : ''}`}>
        <input {...getInputProps()} />
        <div>
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-lg bg-gradient-to-br from-indigoGlow to-cyanGlow"><FileUp className="h-9 w-9" /></div>
          <h2 className="mt-6 text-2xl font-bold">{busy ? 'Analyzing with AI...' : 'Drag and drop tender documents'}</h2>
          <p className="mt-3 text-slate-400">PDF, DOCX, TXT. Multi-file upload. Max {MAX_DOCUMENT_LABEL} each.</p>
          {busy && (
            <div className="mx-auto mt-8 max-w-md">
              <div className="h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-indigoGlow to-cyanGlow transition-all" style={{ width: `${progress}%` }} /></div>
              <div className="mt-4 grid gap-2 text-sm text-slate-300">{steps.map((label, index) => <p key={label} className={step === label ? 'text-cyan-200' : index < steps.indexOf(step) ? 'text-emerald-200' : ''}>{label}</p>)}</div>
            </div>
          )}
        </div>
      </div>
      {queue.length > 0 && (
        <div className="glass rounded-lg p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-semibold">Upload queue</h2>
            <button disabled={busy} onClick={uploadFiles} className="rounded-lg bg-gradient-to-r from-indigoGlow to-cyanGlow px-4 py-2 text-sm font-semibold disabled:opacity-60">Process {queue.length} file(s)</button>
          </div>
          <div className="mt-4 grid gap-3">
            {queue.map((file, index) => (
              <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 rounded-lg bg-white/5 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <FileText className="h-5 w-5 shrink-0 text-cyan-200" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button disabled={busy} onClick={() => setQueue(current => current.filter((_, i) => i !== index))} className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-slate-300" aria-label="Remove file"><X className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
