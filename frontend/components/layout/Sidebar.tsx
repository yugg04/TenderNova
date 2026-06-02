'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronLeft, FileText, GitCompare, LayoutDashboard, LogOut, MessageSquare, Settings, ShieldCheck, Sparkles, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { signOut } from 'next-auth/react';

const items = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tenders', label: 'My Tenders', icon: FileText },
  { href: '/upload', label: 'Upload Tender', icon: Upload },
  { href: '/proposals', label: 'AI Proposals', icon: Sparkles },
  { href: '/chatbot', label: 'AI Chatbot', icon: MessageSquare },
  { href: '/compare', label: 'Compare Tenders', icon: GitCompare },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/admin', label: 'Admin Console', icon: ShieldCheck, adminOnly: true }
];

export function Sidebar({ user }: { user?: { name: string | null; email: string; role: string } | null }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const isAdmin = user?.email?.toLowerCase() === 'savanmpatel1407@gmail.com' && user?.role === 'super_admin';
  const visibleItems = items.filter(item => !item.adminOnly || isAdmin);

  return (
    <motion.aside animate={{ width: collapsed ? 84 : 280 }} className="sticky top-0 hidden h-screen shrink-0 border-r border-white/10 bg-[#07080C]/95 p-4 lg:flex lg:flex-col">
      <Link href="/dashboard" className="mb-8 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-lg bg-gradient-to-br from-indigoGlow to-cyanGlow">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        {!collapsed && <span className="text-xl font-bold">TenderNova</span>}
      </Link>

      <nav className="flex flex-1 flex-col gap-2">
        {visibleItems.map(item => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={cn('group flex h-12 items-center gap-3 rounded-lg px-3 text-sm text-slate-300 transition hover:bg-white/8 hover:text-white', active && 'bg-gradient-to-r from-indigoGlow/35 to-cyanGlow/20 text-white glow-indigo')}>
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="glass rounded-lg p-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-sm font-semibold">TN</div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user?.name ?? user?.email ?? 'Tender Team'}</p>
              <p className="mt-1 w-fit rounded-full bg-cyanGlow/15 px-2 py-0.5 text-xs text-cyan-200">{isAdmin ? 'System admin' : 'Workspace user'}</p>
            </div>
          )}
        </div>
      </div>

      <button onClick={() => signOut({ callbackUrl: '/' })} className="mt-3 flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 text-sm text-slate-300 hover:bg-white/10" aria-label="Logout">
        <LogOut className="h-4 w-4" />
        {!collapsed && <span>Logout</span>}
      </button>

      <button aria-label="Collapse sidebar" onClick={() => setCollapsed(value => !value)} className="mt-4 grid h-10 place-items-center rounded-lg border border-white/10 text-slate-300 hover:bg-white/10">
        <ChevronLeft className={cn('h-5 w-5 transition', collapsed && 'rotate-180')} />
      </button>
    </motion.aside>
  );
}
