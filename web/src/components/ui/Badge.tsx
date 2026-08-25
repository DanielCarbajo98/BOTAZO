import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Tone = 'brand' | 'coral' | 'neutral' | 'amber' | 'ink' | 'success' | 'outline';

const tones: Record<Tone, string> = {
  brand: 'bg-brand-100 text-brand-900 ring-brand-200',
  coral: 'bg-coral-100 text-coral-700 ring-coral-100',
  amber: 'bg-amber-50 text-amber-900 ring-amber-200',
  neutral: 'bg-ink-100 text-ink-700 ring-ink-200',
  ink: 'bg-ink-900 text-white ring-ink-900',
  success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  outline: 'bg-white/60 text-ink-700 ring-ink-200',
};

export function Badge({
  children,
  tone = 'brand',
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
