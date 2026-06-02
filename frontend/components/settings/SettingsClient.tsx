'use client';

import type React from 'react';
import { useState } from 'react';
import { Lock, Save } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

type SettingsData = {
  user: any;
  workspace: any;
  notifications: any[];
};

export function SettingsClient({ initialData }: { initialData: SettingsData }) {
  const [data, setData] = useState(initialData);
  const [saving, setSaving] = useState('');
  const toast = useToast();
  const notificationPrefs = data.workspace?.preferences?.notifications ?? {};

  async function patch(section: string, body: Record<string, unknown>) {
    setSaving(section);
    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, ...body })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Settings update failed');
      setData(current => ({ ...current, user: result.user ?? current.user, workspace: result.workspace ?? current.workspace }));
      toast('Settings saved', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Settings update failed', 'error');
    } finally {
      setSaving('');
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <aside className="glass rounded-lg p-5">
        <h2 className="font-semibold">Account Snapshot</h2>
        <div className="mt-4 space-y-3 text-sm text-slate-300">
          <p><span className="text-slate-500">User:</span> {data.user?.name ?? 'Not set'}</p>
          <p><span className="text-slate-500">Email:</span> {data.user?.email}</p>
          <p><span className="text-slate-500">Role:</span> {data.user?.role ?? 'user'}</p>
        </div>
      </aside>

      <div className="grid gap-6">
        <SettingsForm
          title="Profile"
          actionLabel="Save Profile"
          loading={saving === 'profile'}
          fields={[
            { name: 'name', label: 'Name', defaultValue: data.user?.name },
            { name: 'company', label: 'Company', defaultValue: data.user?.company },
            { name: 'phone', label: 'Contact Phone', defaultValue: data.user?.phone },
            { name: 'region', label: 'Region', defaultValue: data.user?.region },
            { name: 'image', label: 'Profile Image URL', defaultValue: data.user?.image }
          ]}
          onSubmit={(values: Record<string, unknown>) => patch('profile', values)}
        />

        <SettingsForm
          title="Notifications"
          actionLabel="Save Notifications"
          loading={saving === 'notifications'}
          fields={[
            { name: 'emailAlerts', label: 'Email Alerts', defaultValue: notificationPrefs.emailAlerts ?? true, type: 'checkbox' },
            { name: 'tenderAlerts', label: 'Tender Alerts', defaultValue: notificationPrefs.tenderAlerts ?? true, type: 'checkbox' },
            { name: 'deadlineReminders', label: 'Deadline Reminders', defaultValue: notificationPrefs.deadlineReminders ?? true, type: 'checkbox' },
            { name: 'proposalCompletionAlerts', label: 'Proposal Completion Alerts', defaultValue: notificationPrefs.proposalCompletionAlerts ?? true, type: 'checkbox' }
          ]}
          onSubmit={(values: Record<string, unknown>) => patch('notifications', values)}
        />

        <SettingsForm
          title="Security"
          icon={<Lock className="h-4 w-4" />}
          actionLabel="Change Password"
          loading={saving === 'password'}
          fields={[
            { name: 'currentPassword', label: 'Current Password', type: 'password' },
            { name: 'nextPassword', label: 'New Password', type: 'password' }
          ]}
          onSubmit={(values: Record<string, unknown>) => patch('password', values)}
        />
      </div>
    </div>
  );
}

function SettingsForm({ title, fields, onSubmit, actionLabel, loading, icon }: any) {
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const values: Record<string, unknown> = {};
    for (const field of fields) {
      values[field.name] = field.type === 'checkbox' ? formData.get(field.name) === 'on' : formData.get(field.name);
    }
    onSubmit(values);
  }

  return (
    <form onSubmit={submit} className="glass rounded-lg p-5">
      <div className="mb-4 flex items-center gap-2">{icon}<h2 className="font-semibold">{title}</h2></div>
      <div className="grid gap-3 md:grid-cols-2">
        {fields.map((field: any) => (
          <label key={field.name} className={field.type === 'checkbox' ? 'flex items-center gap-3 rounded-lg bg-white/5 px-3 py-3 text-sm' : 'grid gap-1 text-sm'}>
            <span className="text-slate-300">{field.label}</span>
            {field.type === 'checkbox' ? (
              <input name={field.name} type="checkbox" defaultChecked={Boolean(field.defaultValue)} className="h-4 w-4 accent-cyanGlow" />
            ) : (
              <input name={field.name} type={field.type ?? 'text'} defaultValue={field.defaultValue ?? ''} className="min-h-11 rounded-lg border border-white/10 bg-black/30 px-3 text-slate-100 outline-none focus:border-cyanGlow" />
            )}
          </label>
        ))}
      </div>
      <button disabled={loading} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-cyanGlow px-4 py-3 font-semibold disabled:opacity-60">
        <Save className="h-4 w-4" /> {loading ? 'Saving...' : actionLabel}
      </button>
    </form>
  );
}
