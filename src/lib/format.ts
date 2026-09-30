export function fmt(x: number | undefined | null, digits = 4): string {
  if (x == null || Number.isNaN(x)) return '—';
  if (!Number.isFinite(x)) return x > 0 ? '∞' : '−∞';
  const a = Math.abs(x);
  if (a !== 0 && (a >= 1e6 || a < 1e-4)) return x.toExponential(Math.max(1, digits - 2)).replace('-', '−');
  return x.toFixed(digits).replace('-', '−');
}

export function fmtP(p: number): string {
  if (Number.isNaN(p)) return '—';
  if (p < 0.0001) return '<0.0001';
  return p.toFixed(4);
}

export function stars(p: number): string {
  if (p < 0.01) return '***';
  if (p < 0.05) return '**';
  if (p < 0.1) return '*';
  return '';
}

export function pct(x: number, digits = 1): string {
  return `${(x * 100).toFixed(digits)}%`;
}

export function fmtBs(x: number): string {
  return new Intl.NumberFormat('es-BO', { maximumFractionDigits: 2 }).format(x);
}
