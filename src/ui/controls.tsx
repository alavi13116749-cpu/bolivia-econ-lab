import type { ReactNode } from 'react';

export function Slider({ id, label, value, min, max, step, onChange, format }: {
  id: string; label: ReactNode; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format?: (v: number) => string;
}) {
  return (
    <div className="grid gap-1">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <label htmlFor={id} className="text-muted">{label}</label>
        <output htmlFor={id} className="num font-mono text-ink text-[13px]">{format ? format(value) : value}</output>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap rounded-lg border border-line bg-surface p-0.5">
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} onClick={() => onChange(o.id)}
          className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${value === o.id ? 'bg-ink text-bg' : 'text-muted hover:text-ink'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Metric({ label, value, hint, tone }: { label: ReactNode; value: ReactNode; hint?: ReactNode; tone?: 'good' | 'bad' | 'warn' | 'accent' }) {
  const color = tone === 'good' ? 'text-good' : tone === 'bad' ? 'text-bad' : tone === 'warn' ? 'text-warn' : tone === 'accent' ? 'text-accent' : 'text-ink';
  return (
    <div className="grid gap-0.5">
      <div className="eyebrow">{label}</div>
      <div className={`num font-display text-2xl font-semibold ${color}`}>{value}</div>
      {hint && <div className="text-xs text-muted">{hint}</div>}
    </div>
  );
}

export function Verdict({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <span className={`chip ${ok ? 'bg-good-soft text-good' : 'bg-bad-soft text-bad'}`}>
      <span aria-hidden>{ok ? '●' : '▲'}</span>
      {children}
    </span>
  );
}

export function Panel({ title, children, actions, className = '' }: { title?: ReactNode; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={`card min-w-0 p-4 sm:p-5 ${className}`}>
      {(title || actions) && (
        <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {title && <h3 className="text-base font-semibold">{title}</h3>}
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}
