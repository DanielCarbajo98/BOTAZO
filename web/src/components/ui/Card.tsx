import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Card({
  children,
  className,
  as: As = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'article' | 'li' | 'section';
}) {
  return (
    <As
      className={cn(
        'rounded-card border border-ink-100 bg-white p-6 shadow-soft',
        className,
      )}
    >
      {children}
    </As>
  );
}

export function Section({
  children,
  className,
  id,
  tone = 'sand',
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  tone?: 'sand' | 'white' | 'night' | 'brand';
}) {
  const tones = {
    sand: 'bg-sand-50',
    white: 'bg-white',
    night: 'bg-night text-white',
    brand: 'bg-brand-50',
  } as const;
  return (
    <section id={id} className={cn('py-16 md:py-24', tones[tone], className)}>
      <div className="container-page">{children}</div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
  invert = false,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: 'center' | 'left';
  invert?: boolean;
}) {
  return (
    <div
      data-reveal
      className={cn(
        'max-w-2xl',
        align === 'center' ? 'mx-auto text-center' : 'text-left',
      )}
    >
      {eyebrow ? (
        <p
          className={cn(
            'mb-3 text-xs font-bold uppercase tracking-[0.16em]',
            invert ? 'text-brand-300' : 'text-brand-700',
          )}
        >
          {eyebrow}
        </p>
      ) : null}
      <h2 className={cn('text-3xl md:text-4xl', invert ? 'text-white' : 'text-ink-900')}>{title}</h2>
      {description ? (
        <p className={cn('mt-4 text-lg leading-relaxed', invert ? 'text-ink-300' : 'text-ink-600')}>
          {description}
        </p>
      ) : null}
    </div>
  );
}
