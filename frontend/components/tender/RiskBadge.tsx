import { cn } from '@/lib/utils';

export function RiskBadge({ level }: { level?: string | null }) {
  const normalized = (level ?? 'low').toLowerCase();
  return (
    <span className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold capitalize',
      normalized === 'high' && 'bg-roseGlow/15 text-rose-200',
      normalized === 'medium' && 'bg-amberGlow/15 text-amber-200',
      normalized === 'low' && 'bg-emeraldGlow/15 text-emerald-200'
    )}>
      <span className={cn('h-2 w-2 rounded-full', normalized === 'high' && 'bg-roseGlow', normalized === 'medium' && 'bg-amberGlow', normalized === 'low' && 'bg-emeraldGlow')} />
      {normalized}
    </span>
  );
}
