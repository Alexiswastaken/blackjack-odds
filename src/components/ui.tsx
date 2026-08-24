import type { ReactNode } from 'react';

/** Primitives partagées : elles gardent les deux thèmes cohérents d'une vue à l'autre. */

export function Panel({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`themed rounded-2xl border border-line bg-surface p-4 ${className}`}>
      {children}
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-sm font-semibold tracking-wider text-ink-muted uppercase">{children}</h2>
  );
}

export function Hint({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-sm text-ink-subtle">{children}</p>;
}

type ButtonVariant = 'neutral' | 'accent' | 'alt';

export function Button({
  children,
  onClick,
  disabled,
  variant = 'neutral',
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: ButtonVariant;
  type?: 'button' | 'submit';
}) {
  const variants: Record<ButtonVariant, string> = {
    neutral: 'border-line bg-raised text-ink hover:border-line-strong',
    accent: 'border-accent-line bg-accent-soft text-accent-ink hover:border-accent',
    alt: 'border-alt bg-alt-soft text-alt-ink hover:border-alt',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`themed rounded-lg border px-3 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]}`}
    >
      {children}
    </button>
  );
}

export function Segmented<T extends string | number>({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label?: string;
  hint?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div>
      {label && <div className="text-sm text-ink">{label}</div>}
      {hint && <div className="text-[11px] text-ink-subtle">{hint}</div>}
      <div
        className={`themed inline-flex flex-wrap rounded-lg border border-line bg-raised p-0.5 ${label ? 'mt-2' : ''}`}
      >
        {options.map((option) => (
          <button
            key={String(option.value)}
            type="button"
            onClick={() => onChange(option.value)}
            className={[
              'rounded-md px-3 py-1 text-xs font-medium transition',
              option.value === value
                ? 'bg-accent text-accent-on'
                : 'text-ink-muted hover:text-ink',
            ].join(' ')}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 accent-[var(--c-accent)]"
      />
      <span>
        <span className="text-sm text-ink">{label}</span>
        {hint && <span className="block text-[11px] text-ink-subtle">{hint}</span>}
      </span>
    </label>
  );
}

/** Barre de progression simple : suffisante pour visualiser une probabilité. */
export function Bar({
  value,
  tone = 'neutral',
}: {
  /** Fraction de 0 à 1. */
  value: number;
  tone?: 'neutral' | 'accent' | 'danger';
}) {
  const tones = {
    neutral: 'bg-ink-faint',
    accent: 'bg-accent',
    danger: 'bg-danger',
  } as const;

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-track">
      <div
        className={`h-full rounded-full transition-[width] duration-300 ${tones[tone]}`}
        style={{ width: `${Math.max(0, Math.min(100, value * 100))}%` }}
      />
    </div>
  );
}
