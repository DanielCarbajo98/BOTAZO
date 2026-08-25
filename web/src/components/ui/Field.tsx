import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';

const controlBase =
  'w-full rounded-xl border bg-white px-4 text-[0.95rem] text-ink-900 placeholder:text-ink-400 ' +
  'transition-colors focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-500/15 ' +
  'disabled:cursor-not-allowed disabled:bg-ink-50';

export function Label({
  htmlFor,
  children,
  hint,
  optional,
}: {
  htmlFor?: string;
  children: ReactNode;
  hint?: ReactNode;
  optional?: boolean;
}) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-ink-800">
        {children}
        {optional ? <span className="ml-1.5 font-normal text-ink-400">(opcional)</span> : null}
      </label>
      {hint ? <span className="text-xs text-ink-400">{hint}</span> : null}
    </div>
  );
}

export function FieldError({ id, children }: { id?: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 flex items-start gap-1.5 text-sm text-coral-600">
      <span aria-hidden className="mt-px">
        ⚠
      </span>
      <span>{children}</span>
    </p>
  );
}

export function Help({ children }: { children: ReactNode }) {
  return <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{children}</p>;
}

type InputProps = ComponentPropsWithoutRef<'input'> & { invalid?: boolean };

export function Input({ className, invalid, ...props }: InputProps) {
  return (
    <input
      className={cn(controlBase, 'h-12', invalid ? 'border-coral-500' : 'border-ink-200', className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

type TextareaProps = ComponentPropsWithoutRef<'textarea'> & { invalid?: boolean };

export function Textarea({ className, invalid, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(controlBase, 'min-h-28 py-3 leading-relaxed', invalid ? 'border-coral-500' : 'border-ink-200', className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

type SelectProps = ComponentPropsWithoutRef<'select'> & { invalid?: boolean };

export function Select({ className, invalid, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        controlBase,
        'h-12 appearance-none bg-[length:1.1rem] bg-[right_0.9rem_center] bg-no-repeat pr-10',
        invalid ? 'border-coral-500' : 'border-ink-200',
        className,
      )}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b7c9d' stroke-width='2.5' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
      }}
      aria-invalid={invalid || undefined}
      {...props}
    >
      {children}
    </select>
  );
}

/**
 * Tarjeta seleccionable. Es el control principal del wizard: más grande que un
 * radio, se toca bien en móvil y admite icono + descripción.
 */
export function ChoiceCard({
  selected,
  onSelect,
  icon,
  title,
  description,
  badge,
  name,
  value,
  type = 'radio',
  disabled,
}: {
  selected: boolean;
  onSelect: () => void;
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
  name: string;
  value: string;
  type?: 'radio' | 'checkbox';
  disabled?: boolean;
}) {
  const id = `${name}-${value}`;
  return (
    <label
      htmlFor={id}
      className={cn(
        'group relative flex cursor-pointer gap-3.5 rounded-2xl border-2 p-4 transition-all',
        'has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand-500/20',
        selected
          ? 'border-brand-600 bg-brand-50 shadow-soft'
          : 'border-ink-100 bg-white hover:border-ink-300 hover:bg-ink-50/60',
        disabled && 'pointer-events-none opacity-45',
      )}
    >
      <input
        id={id}
        type={type}
        name={name}
        value={value}
        checked={selected}
        onChange={onSelect}
        disabled={disabled}
        className="sr-only"
      />
      {icon ? (
        <span
          aria-hidden
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-xl text-xl transition-colors',
            selected ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 group-hover:bg-ink-200',
          )}
        >
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-ink-900">{title}</span>
          {badge}
        </span>
        {description ? (
          <span className="mt-1 block text-sm leading-relaxed text-ink-500">{description}</span>
        ) : null}
      </span>
      <span
        aria-hidden
        className={cn(
          'mt-0.5 flex size-5 shrink-0 items-center justify-center border-2 transition-all',
          type === 'radio' ? 'rounded-full' : 'rounded-md',
          selected ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-300 bg-white',
        )}
      >
        {selected ? (
          type === 'radio' ? (
            <span className="size-2 rounded-full bg-white" />
          ) : (
            <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          )
        ) : null}
      </span>
    </label>
  );
}

/** Chip compacto para multiselección (intereses, imprescindibles del hotel…). */
export function Chip({
  selected,
  onToggle,
  children,
  disabled,
}: {
  selected: boolean;
  onToggle: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        'rounded-pill border-2 px-4 py-2 text-sm font-medium transition-all',
        selected
          ? 'border-brand-600 bg-brand-600 text-white shadow-soft'
          : 'border-ink-200 bg-white text-ink-700 hover:border-ink-400 hover:bg-ink-50',
        disabled && 'pointer-events-none opacity-45',
      )}
    >
      {children}
    </button>
  );
}

/** Contador +/− accesible para viajeros, habitaciones, noches. */
export function Counter({
  label,
  sublabel,
  value,
  onChange,
  min = 0,
  max = 20,
  id,
}: {
  label: string;
  sublabel?: string;
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  id: string;
}) {
  const btn =
    'flex size-10 items-center justify-center rounded-full border-2 border-ink-200 text-lg font-semibold text-ink-700 transition-colors hover:border-brand-600 hover:bg-brand-50 hover:text-brand-800 disabled:pointer-events-none disabled:opacity-35';
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-ink-100 bg-white px-4 py-3">
      <span>
        <span id={`${id}-label`} className="block font-medium text-ink-900">
          {label}
        </span>
        {sublabel ? <span className="block text-sm text-ink-500">{sublabel}</span> : null}
      </span>
      <span className="flex items-center gap-3">
        <button
          type="button"
          className={btn}
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`Quitar uno: ${label}`}
        >
          −
        </button>
        <output
          aria-labelledby={`${id}-label`}
          className="w-7 text-center text-lg font-semibold tabular-nums text-ink-900"
        >
          {value}
        </output>
        <button
          type="button"
          className={btn}
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`Añadir uno: ${label}`}
        >
          +
        </button>
      </span>
    </div>
  );
}
