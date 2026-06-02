'use client';

import { useEffect, useState } from 'react';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export function DashboardCharts({ monthly, categories }: { monthly: { month: string; tenders: number }[]; categories: { name: string; value: number }[] }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="glass h-80 rounded-lg p-5" />
        <div className="glass h-80 rounded-lg p-5" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
      <div className="glass rounded-lg p-5"><h2 className="font-semibold">Tenders by Month</h2><div className="mt-4 h-72"><ResponsiveContainer><BarChart data={monthly}><XAxis dataKey="month" stroke="#94A3B8" /><YAxis stroke="#94A3B8" /><Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} /><Bar dataKey="tenders" fill="#06B6D4" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></div>
      <div className="glass rounded-lg p-5"><h2 className="font-semibold">Tender Categories</h2><div className="mt-4 h-72">{categories.length ? <ResponsiveContainer><PieChart><Pie data={categories} innerRadius={64} outerRadius={96} dataKey="value">{categories.map((_, i) => <Cell key={i} fill={['#6366F1', '#06B6D4', '#22C55E', '#F59E0B'][i % 4]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer> : <div className="grid h-full place-items-center text-sm text-slate-500">No category data yet</div>}</div></div>
    </div>
  );
}
