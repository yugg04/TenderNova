'use client';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="glass rounded-lg p-6">
      <h1 className="text-xl font-bold text-rose-200">Something went wrong</h1>
      <p className="mt-2 text-sm text-slate-400">{error.message}</p>
      <button onClick={reset} className="mt-4 rounded-lg bg-white/10 px-4 py-2">Try again</button>
    </div>
  );
}
