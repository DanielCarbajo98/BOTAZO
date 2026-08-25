import Link from 'next/link';
import { site } from '@/config/site';
import { modeCopy } from '@/config/mode';
import { cn } from '@/lib/utils';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={cn('size-9', className)}>
      <defs>
        <linearGradient id="zarpea-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--color-brand-500)" />
          <stop offset="100%" stopColor="var(--color-brand-800)" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill="url(#zarpea-logo)" />
      {/* Avión trazando una curva descendente: el precio baja */}
      <path
        d="M8 27c6.5-1.5 12-6 16.5-13"
        stroke="rgba(255,255,255,0.45)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeDasharray="2.5 3"
        fill="none"
      />
      <path
        d="M29.8 9.4 18.9 15.1a1 1 0 0 0-.1 1.7l3.2 2.2-.5 4.6a.6.6 0 0 0 1 .5l2.3-2.6 3.6 2a1 1 0 0 0 1.5-.7l1.6-11.9a1 1 0 0 0-1.7-.9Z"
        fill="white"
      />
    </svg>
  );
}

export function Logo({ className, invert = false }: { className?: string; invert?: boolean }) {
  return (
    <Link
      href="/"
      className={cn('group inline-flex items-center gap-2.5', className)}
      aria-label={`${site.name} — inicio`}
    >
      <LogoMark className="transition-transform duration-300 group-hover:-translate-y-0.5" />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            'font-display text-[1.32rem] font-semibold tracking-tight',
            invert ? 'text-white' : 'text-ink-900',
          )}
        >
          {site.name}
        </span>
        <span className={cn('mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.18em]', invert ? 'text-brand-300' : 'text-brand-700')}>
          {modeCopy.roleShort}
        </span>
      </span>
    </Link>
  );
}
