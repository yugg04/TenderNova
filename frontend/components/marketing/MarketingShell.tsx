'use client';

import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { ExternalLink, Menu, Sparkles, X } from 'lucide-react';
import { useState } from 'react';

export function MarketingNav() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const isLoggedIn = status === 'authenticated';
  const navLinks = [
    ['Features', '/#features'],
    ['How it works', '/#workflow'],
    ['About Us', '/about'],
    ['Contact Us', '/contact']
  ];

  return (
    <nav className="sticky top-0 z-40 border-b border-white/10 bg-[#0A0B0F]/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-indigoGlow to-cyanGlow shadow-glass"><Sparkles className="h-5 w-5 text-white" /></span>
          <span className="text-lg font-bold">TenderNova</span>
        </Link>
        <div className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
          {navLinks.map(([label, href]) => <Link key={href} href={href} className="hover:text-white">{label}</Link>)}
        </div>
        <div className="hidden items-center gap-3 md:flex">
          {isLoggedIn ? (
            <>
              <Link href="/dashboard" className="rounded-lg px-4 py-2 text-sm text-slate-300 hover:bg-white/10">Dashboard</Link>
              <button onClick={() => signOut({ callbackUrl: '/' })} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-obsidian">Logout</button>
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-lg px-4 py-2 text-sm text-slate-300 hover:bg-white/10">Login</Link>
              <Link href="/login?mode=register" className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-obsidian">Get Started</Link>
            </>
          )}
        </div>
        <button onClick={() => setOpen(value => !value)} className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 md:hidden" aria-label="Toggle menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-white/10 px-5 py-4 md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 text-sm">
            {navLinks.map(([label, href]) => <Link key={href} href={href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-slate-300 hover:bg-white/10 hover:text-white">{label}</Link>)}
            {isLoggedIn ? (
              <>
                <Link href="/dashboard" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-slate-300 hover:bg-white/10 hover:text-white">Dashboard</Link>
                <button onClick={() => signOut({ callbackUrl: '/' })} className="rounded-lg bg-white px-3 py-2 text-left font-semibold text-obsidian">Logout</button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-slate-300 hover:bg-white/10 hover:text-white">Login</Link>
                <Link href="/login?mode=register" onClick={() => setOpen(false)} className="rounded-lg bg-white px-3 py-2 font-semibold text-obsidian">Get Started</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/10 px-5 py-12">
      <div className="mx-auto grid max-w-7xl gap-10 text-sm text-slate-400 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-indigoGlow to-cyanGlow"><Sparkles className="h-5 w-5 text-white" /></span>
            <span className="text-lg font-bold text-white">TenderNova</span>
          </Link>
          <p className="mt-4 max-w-sm leading-6">AI tender intelligence for analysis, comparison, proposal generation, and secure bid operations.</p>
        </div>
        <div className="space-y-3">
          <p className="font-semibold text-white">Product</p>
          <Link href="/#features" className="block hover:text-white">Features</Link>
          <Link href="/#workflow" className="block hover:text-white">Workflow</Link>
          <Link href="/dashboard" className="block hover:text-white">Dashboard</Link>
        </div>
        <div className="space-y-3">
          <p className="font-semibold text-white">Company</p>
          <Link href="/about" className="block hover:text-white">About Us</Link>
          <Link href="/contact" className="block hover:text-white">Contact Us</Link>
          <Link href="/privacy" className="block hover:text-white">Privacy Policy</Link>
          <Link href="/terms" className="block hover:text-white">Terms and Conditions</Link>
        </div>
        <div className="space-y-3">
          <p className="font-semibold text-white">Team</p>
          <Link href="https://www.linkedin.com/in/savan-patel-777aa3323?utm_source=share_via&utm_content=profile&utm_medium=member_ios" target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-white">Savan Patel <ExternalLink className="h-3.5 w-3.5" /></Link>
          <Link href="https://www.linkedin.com/in/yug04/" target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-white">Yug Khatri <ExternalLink className="h-3.5 w-3.5" /></Link>
        </div>
      </div>
    </footer>
  );
}
