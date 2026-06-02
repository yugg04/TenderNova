'use client';

import { FormEvent, memo, useEffect, useMemo, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

type Message = { role: 'user' | 'assistant'; content: string; createdAt: Date };

const suggestions = ['What is the deadline?', 'What certifications are required?', 'Summarize payment terms', 'What are the main risks?'];

export function ChatInterface({ tenders }: { tenders: any[] }) {
  const [selected, setSelected] = useState(tenders[0]?.id ?? '');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const selectedTender = useMemo(() => tenders.find(tender => tender.id === selected), [selected, tenders]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function submit(value = input) {
    const prompt = value.trim();
    if (!prompt || !selected || loading) return;

    const nextMessages: Message[] = [...messages, { role: 'user', content: prompt, createdAt: new Date() }];
    setMessages([...nextMessages, { role: 'assistant', content: '', createdAt: new Date() }]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenderId: selected, messages: nextMessages.map(({ role, content }) => ({ role, content })) })
      });
      if (!response.ok || !response.body) throw new Error(await response.text());

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { value: chunk, done } = await reader.read();
        if (done) break;
        const text = decoder.decode(chunk);
        setMessages(current => current.map((message, index) => index === current.length - 1 ? { ...message, content: message.content + text } : message));
      }
    } catch (error) {
      setMessages(current => current.slice(0, -1));
      toast(error instanceof Error ? error.message : 'Chat failed', 'error');
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void submit();
  }

  return (
    <div className="grid h-[calc(100vh-7rem)] overflow-hidden rounded-lg border border-white/10 bg-[#080A0F] lg:grid-cols-[320px_1fr]">
      <aside className="min-h-0 border-b border-white/10 p-4 lg:border-b-0 lg:border-r">
        <p className="mb-3 text-sm font-semibold text-slate-300">Tender context</p>
        <div className="max-h-[calc(100%-2rem)] space-y-2 overflow-y-auto pr-1">
          {tenders.map(tender => (
            <button key={tender.id} onClick={() => setSelected(tender.id)} className={`w-full rounded-lg p-3 text-left text-sm transition ${selected === tender.id ? 'bg-cyanGlow/15 text-white ring-1 ring-cyanGlow/30' : 'bg-white/[0.04] text-slate-300 hover:bg-white/10'}`}>
              <span className="line-clamp-2">{tender.title}</span>
              <span className="mt-1 block text-xs text-slate-500">{tender.category ?? tender.status}</span>
            </button>
          ))}
          {!tenders.length && <p className="rounded-lg bg-white/[0.04] p-3 text-sm text-slate-500">Upload a tender to start chatting.</p>}
        </div>
      </aside>

      <section className="flex min-h-0 flex-col">
        <header className="border-b border-white/10 px-5 py-4">
          <h2 className="font-semibold">{selectedTender?.title ?? 'No tender selected'}</h2>
          <p className="mt-1 text-xs text-slate-500">TenderNova answers from the uploaded document context.</p>
        </header>

        <div ref={scroller} className="flex-1 space-y-5 overflow-y-auto px-4 py-5 md:px-6">
          {messages.length === 0 && (
            <div className="grid h-full place-items-center text-center">
              <div>
                <h3 className="text-lg font-semibold">Ask a tender-specific question</h3>
                <p className="mt-2 max-w-md text-sm text-slate-400">Use concise questions for faster answers. Responses stream as they are generated.</p>
              </div>
            </div>
          )}
          {messages.map((message, index) => <MessageBubble key={`${message.role}-${index}`} message={message} loading={loading && index === messages.length - 1} />)}
        </div>

        <div className="border-t border-white/10 p-4">
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {suggestions.map(suggestion => (
              <button key={suggestion} disabled={loading || !selected} onClick={() => submit(suggestion)} className="shrink-0 rounded-full bg-white/[0.06] px-3 py-1.5 text-xs text-slate-200 hover:bg-white/12 disabled:opacity-50">{suggestion}</button>
            ))}
          </div>
          <form onSubmit={onSubmit} className="flex gap-3">
            <input value={input} disabled={!selected} onChange={event => setInput(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-cyanGlow disabled:opacity-50" placeholder="Ask about deadlines, risks, compliance, or proposal strategy..." />
            <button disabled={loading || !input.trim() || !selected} className="grid h-12 w-12 place-items-center rounded-lg bg-cyanGlow text-white disabled:opacity-50" aria-label="Send"><Send className="h-5 w-5" /></button>
          </form>
        </div>
      </section>
    </div>
  );
}

const MessageBubble = memo(function MessageBubble({ message, loading }: { message: Message; loading: boolean }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[86%] rounded-lg px-4 py-3 text-sm leading-6 shadow-sm md:max-w-[74%] ${isUser ? 'bg-cyanGlow text-white' : 'border border-white/10 bg-white/[0.045] text-slate-100'}`}>
        {message.content ? (
          <CleanMessage content={message.content} />
        ) : (
          <span className="inline-flex items-center gap-1 text-slate-300"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyanGlow" /> Thinking</span>
        )}
        <p className={`mt-2 text-[11px] ${isUser ? 'text-white/75' : 'text-slate-500'}`}>{message.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{loading && !isUser ? ' - streaming' : ''}</p>
      </div>
    </div>
  );
});

function CleanMessage({ content }: { content: string }) {
  const blocks = cleanChatText(content).split(/\n{2,}/).filter(Boolean);
  return (
    <div className="space-y-3">
      {blocks.map((block, index) => {
        const lines = block.split('\n').map(line => line.trim()).filter(Boolean);
        const isList = lines.length > 1 && lines.every(line => /^[-•]?\s*[^:]{1,80}:?/.test(line));
        if (isList) {
          return <ul key={index} className="space-y-1.5">{lines.map((line, itemIndex) => <li key={itemIndex} className="leading-6">{line.replace(/^[-•]\s*/, '')}</li>)}</ul>;
        }
        return <p key={index} className="whitespace-pre-wrap leading-6">{lines.join(' ')}</p>;
      })}
    </div>
  );
}

function cleanChatText(value: string) {
  return value
    .replace(/\r/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`{1,3}([^`]+)`{1,3}/g, '$1')
    .replace(/^\s*---+\s*$/gm, '')
    .replace(/^\s*[*]\s+/gm, '')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}
