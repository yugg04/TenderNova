'use client';

import { useEffect, useState } from 'react';
import { KeyRound, RefreshCcw, Save, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export function AdminClient({ initialData }: { initialData: any }) {
  const [data, setData] = useState(initialData);
  const [saving, setSaving] = useState('');
  const toast = useToast();
  const canManageRoles = Boolean(data.currentAdmin?.isSuperAdmin);

  useEffect(() => {
    const id = window.setInterval(async () => {
      const response = await fetch('/api/admin');
      if (response.ok) setData(await response.json());
    }, 15000);
    return () => window.clearInterval(id);
  }, []);

  async function action(body: Record<string, unknown>) {
    const response = await fetch('/api/admin', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? 'Admin action failed');
    return result;
  }

  async function updateUser(userId: string, role: string, disabled: boolean) {
    setSaving(userId);
    try {
      const result = await action({ action: 'updateUser', userId, role, disabled });
      setData((current: any) => ({ ...current, users: current.users.map((user: any) => user.id === userId ? result.user : user) }));
      toast('User updated', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'User update failed', 'error');
    } finally {
      setSaving('');
    }
  }

  async function retryJob(jobId: string) {
    try {
      await action({ action: 'retryJob', jobId });
      setData((current: any) => ({ ...current, jobs: current.jobs.map((job: any) => job.id === jobId ? { ...job, status: 'queued', progress: 0, error: null } : job) }));
      toast('Job queued for retry', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not retry job', 'error');
    }
  }

  async function saveApiKey(formData: FormData) {
    const value = String(formData.get('value') ?? '');
    if (!value.trim()) return toast('API key value is required', 'error');
    setSaving('apiKey');
    try {
      const result = await action({
        action: 'addApiKey',
        provider: formData.get('provider'),
        label: formData.get('label'),
        value,
        priority: Number(formData.get('priority') ?? 100),
        tokenLimit: Number(formData.get('tokenLimit') ?? 0),
        rateLimitPerDay: Number(formData.get('rateLimitPerDay') ?? 1000)
      });
      setData((current: any) => ({ ...current, apiKeys: [result.apiKey, ...current.apiKeys].sort((a: any, b: any) => a.priority - b.priority) }));
      toast('API key added', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'API key update failed', 'error');
    } finally {
      setSaving('');
    }
  }

  async function setApiKeyStatus(id: string, status: string) {
    const result = await action({ action: 'setApiKeyStatus', id, status });
    setData((current: any) => ({ ...current, apiKeys: current.apiKeys.map((key: any) => key.id === id ? result.apiKey : key) }));
  }

  async function updateApiKeyPriority(id: string, priority: number, rateLimitPerDay: number, tokenLimit: number | null) {
    const result = await action({ action: 'updateApiKeyPriority', id, priority, rateLimitPerDay, tokenLimit });
    setData((current: any) => ({ ...current, apiKeys: current.apiKeys.map((key: any) => key.id === id ? result.apiKey : key).sort((a: any, b: any) => a.priority - b.priority) }));
    toast('API key priority updated', 'success');
  }

  async function deleteApiKey(id: string) {
    await action({ action: 'deleteApiKey', id });
    setData((current: any) => ({ ...current, apiKeys: current.apiKeys.filter((key: any) => key.id !== id) }));
    toast('API key deleted', 'success');
  }

  async function setContactStatus(id: string, status: string) {
    try {
      const result = await action({ action: 'setContactStatus', id, status });
      setData((current: any) => ({ ...current, contacts: (current.contacts ?? []).map((contact: any) => contact.id === id ? result.contact : contact) }));
      toast('Message updated', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Message update failed', 'error');
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.cards.map(([label, value]: [string, string | number]) => <div key={label} className="glass rounded-lg p-5"><p className="text-sm text-slate-400">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></div>)}
      </div>

      <section className="glass rounded-lg p-5">
        <div className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-cyan-200" /><h2 className="font-semibold">API Management</h2></div>
        <ApiKeyForm loading={saving === 'apiKey'} onSave={saveApiKey} />
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-400"><tr><th className="py-3">Priority</th><th>Provider</th><th>Key</th><th>Status</th><th>Requests</th><th>Failed</th><th>Tokens</th><th>Limit/day</th><th>Actions</th></tr></thead>
            <tbody>
              {data.apiKeys.map((key: any) => <ApiKeyRow key={key.id} apiKey={key} onStatus={setApiKeyStatus} onDelete={deleteApiKey} onPriority={updateApiKeyPriority} />)}
              {!data.apiKeys.length && <tr><td colSpan={9} className="py-5 text-center text-slate-500">No API keys configured.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="glass rounded-lg p-5">
        <h2 className="font-semibold">Authentication Monitoring</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-400"><tr><th className="py-3">Email</th><th>Provider</th><th>Status</th><th>Reason</th><th>Time</th></tr></thead>
            <tbody>
              {data.loginHistory.map((event: any) => <tr key={event.id} className="border-t border-white/10"><td className="py-3">{event.email}</td><td>{event.provider}</td><td className={event.success ? 'text-emerald-200' : 'text-rose-200'}>{event.success ? 'Success' : 'Failed'}</td><td>{event.reason ?? '-'}</td><td>{new Date(event.createdAt).toLocaleString()}</td></tr>)}
              {!data.loginHistory.length && <tr><td colSpan={5} className="py-5 text-center text-slate-500">No login events yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="glass rounded-lg p-5">
          <h2 className="font-semibold">User Management</h2>
          <div className="mt-4 space-y-3">{data.users.map((user: any) => <UserRow key={user.id} user={user} saving={saving === user.id} disabled={!canManageRoles} onSave={updateUser} />)}</div>
        </section>

        <section className="glass rounded-lg p-5">
          <h2 className="font-semibold">Processing Jobs</h2>
          <div className="mt-4 space-y-3">
            {data.jobs.map((job: any) => (
              <div key={job.id} className="rounded-lg bg-white/5 p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{job.tender?.title ?? job.type}</p>
                    <p className="mt-1 text-xs text-slate-500">{job.user?.email} - {job.status} - {job.progress}%</p>
                    {job.error && <p className="mt-2 text-xs text-rose-200">{job.error}</p>}
                  </div>
                  <button onClick={() => retryJob(job.id)} className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-cyan-100" aria-label="Retry job"><RefreshCcw className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
            {!data.jobs.length && <p className="text-sm text-slate-500">No processing jobs yet.</p>}
          </div>
        </section>
      </div>

      <section className="glass rounded-lg p-5">
        <h2 className="font-semibold">Contact Messages</h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {(data.contacts ?? []).map((contact: any) => (
            <div key={contact.id} className="rounded-lg bg-white/5 p-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{contact.subject}</p>
                  <p className="mt-1 text-xs text-slate-500">{contact.fullName} - {contact.email}</p>
                  <p className={contact.emailDelivered ? 'mt-1 text-xs text-emerald-200' : 'mt-1 text-xs text-amber-200'}>{contact.emailDelivered ? 'Email delivered' : 'Email not delivered'}</p>
                </div>
                <select value={contact.status} onChange={event => setContactStatus(contact.id, event.target.value)} className="h-9 rounded-lg border border-white/10 bg-black/30 px-2 text-xs">
                  {['new', 'reviewed', 'closed'].map(status => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>
              <p className="mt-3 whitespace-pre-wrap break-words leading-6 text-slate-300">{contact.message}</p>
              <p className="mt-3 text-xs text-slate-500">{new Date(contact.createdAt).toLocaleString()}</p>
            </div>
          ))}
          {!(data.contacts ?? []).length && <p className="text-sm text-slate-500">No contact messages yet.</p>}
        </div>
      </section>

      <section className="glass rounded-lg p-5">
        <h2 className="font-semibold">Audit Logs</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {data.logs.map((log: any) => <div key={log.id} className="rounded-lg bg-white/5 p-3 text-sm"><p>{log.action}</p><p className="mt-1 text-xs text-slate-500">{log.user?.email ?? 'system'} - {new Date(log.createdAt).toLocaleString()}</p></div>)}
          {!data.logs.length && <p className="text-sm text-slate-500">No audit logs yet.</p>}
        </div>
      </section>
    </div>
  );
}

function ApiKeyForm({ loading, onSave }: any) {
  return (
    <form action={onSave} className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_1fr_110px_120px_140px_auto]">
      <input name="provider" defaultValue="mistral" className="h-11 rounded-lg border border-white/10 bg-black/30 px-3 outline-none focus:border-cyanGlow" placeholder="Provider" />
      <input name="label" defaultValue="Mistral" className="h-11 rounded-lg border border-white/10 bg-black/30 px-3 outline-none focus:border-cyanGlow" placeholder="Label" />
      <input name="value" type="password" className="h-11 rounded-lg border border-white/10 bg-black/30 px-3 outline-none focus:border-cyanGlow" placeholder="New API key" />
      <input name="priority" type="number" defaultValue={100} className="h-11 rounded-lg border border-white/10 bg-black/30 px-3 outline-none focus:border-cyanGlow" placeholder="Priority" />
      <input name="tokenLimit" type="number" className="h-11 rounded-lg border border-white/10 bg-black/30 px-3 outline-none focus:border-cyanGlow" placeholder="Token cap" />
      <input name="rateLimitPerDay" type="number" defaultValue={1000} className="h-11 rounded-lg border border-white/10 bg-black/30 px-3 outline-none focus:border-cyanGlow" />
      <button disabled={loading} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-cyanGlow px-4 font-semibold disabled:opacity-60"><Save className="h-4 w-4" /> Save</button>
    </form>
  );
}

function ApiKeyRow({ apiKey, onStatus, onDelete, onPriority }: any) {
  const [priority, setPriority] = useState(apiKey.priority ?? 100);
  const [rateLimit, setRateLimit] = useState(apiKey.rateLimitPerDay ?? 1000);
  const [tokenLimit, setTokenLimit] = useState(apiKey.tokenLimit ?? '');
  return (
    <tr className="border-t border-white/10">
      <td className="py-3"><input value={priority} onChange={event => setPriority(Number(event.target.value))} className="h-9 w-20 rounded bg-black/30 px-2" type="number" /></td>
      <td>{apiKey.label}<p className="text-xs text-slate-500">{apiKey.provider}</p></td>
      <td>{apiKey.keyPreview ?? 'hidden'}</td>
      <td><span className={apiKey.status === 'active' ? 'text-emerald-200' : 'text-slate-500'}>{apiKey.status}</span></td>
      <td>{apiKey.requestCount}</td>
      <td>{apiKey.failedCount}</td>
      <td>{apiKey.tokenUsage}{apiKey.tokenLimit ? ` / ${apiKey.tokenLimit}` : ''}</td>
      <td><input value={rateLimit} onChange={event => setRateLimit(Number(event.target.value))} className="h-9 w-24 rounded bg-black/30 px-2" type="number" /></td>
      <td className="flex flex-wrap gap-2 py-3">
        <input value={tokenLimit} onChange={event => setTokenLimit(event.target.value)} className="h-9 w-24 rounded bg-black/30 px-2" type="number" placeholder="cap" />
        <button onClick={() => onPriority(apiKey.id, priority, rateLimit, tokenLimit ? Number(tokenLimit) : null)} className="rounded-lg bg-white/10 px-3 py-2">Save</button>
        <button onClick={() => onStatus(apiKey.id, apiKey.status === 'active' ? 'disabled' : 'active')} className="rounded-lg bg-white/10 px-3 py-2">{apiKey.status === 'active' ? 'Disable' : 'Enable'}</button>
        <button onClick={() => onDelete(apiKey.id)} className="grid h-9 w-9 place-items-center rounded-lg text-rose-200 hover:bg-roseGlow/10" aria-label="Delete API key"><Trash2 className="h-4 w-4" /></button>
      </td>
    </tr>
  );
}

function UserRow({ user, saving, disabled, onSave }: any) {
  const [role, setRole] = useState(user.role);
  const [isDisabled, setIsDisabled] = useState(Boolean(user.disabled));
  return (
    <div className="rounded-lg bg-white/5 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="font-medium">{user.name ?? 'Unnamed user'}</p><p className="mt-1 text-xs text-slate-500">{user.email}</p><p className="mt-1 text-xs text-slate-500">Last login: {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '-'}</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <select disabled={disabled} value={role} onChange={event => setRole(event.target.value)} className="h-10 rounded-lg border border-white/10 bg-black/30 px-2 disabled:opacity-50">{['user'].map(item => <option key={item} value={item}>{item}</option>)}</select>
          <label className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2"><input disabled={disabled} type="checkbox" checked={isDisabled} onChange={event => setIsDisabled(event.target.checked)} />Disabled</label>
          <button disabled={disabled || saving} onClick={() => onSave(user.id, role, isDisabled)} className="grid h-10 w-10 place-items-center rounded-lg bg-cyanGlow text-white disabled:opacity-40" aria-label="Save user"><Save className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );
}
