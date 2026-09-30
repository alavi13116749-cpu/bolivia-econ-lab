import type { Dataset } from '../data/datasets';

/**
 * Mini-lenguaje de términos para regresores:
 *   x | log(x) | ln(x) | exp(x) | sqrt(x) | d(x) | d2(x) | lag(x,k) | x^2 | a*b
 * Devuelve la serie con NaN donde no está definida (p.ej. primeros rezagos).
 */
export function resolveTerm(term: string, ds: Dataset): number[] {
  const t = term.trim();
  const col = (name: string) => {
    const v = ds.data[name.trim()];
    if (!v) throw new Error(`La variable «${name.trim()}» no existe en «${ds.name}». Disponibles: ${ds.columns.join(', ')}.`);
    return v;
  };
  const factors = splitTopLevel(t, '*');
  if (factors.length > 1) {
    const parts = factors.map((p) => resolveTerm(p, ds));
    return parts[0].map((_, i) => parts.reduce((s, p) => s * p[i], 1));
  }
  let m = t.match(/^(.+)\^(\d+(?:\.\d+)?)$/);
  if (m) {
    const base = resolveTerm(m[1], ds);
    const k = Number(m[2]);
    return base.map((v) => v ** k);
  }
  m = t.match(/^(log|ln|exp|sqrt|d|d2|lag|abs)\((.+)\)$/i);
  if (m) {
    const fn = m[1].toLowerCase();
    const args = m[2].split(',');
    const inner = resolveTerm(args[0], ds);
    const panelEnt = ds.panel?.entity;
    const sameUnit = (i: number, j: number) => !panelEnt || panelEnt[i] === panelEnt[j];
    switch (fn) {
      case 'log':
      case 'ln':
        return inner.map((v) => (v > 0 ? Math.log(v) : NaN));
      case 'exp':
        return inner.map(Math.exp);
      case 'sqrt':
        return inner.map((v) => (v >= 0 ? Math.sqrt(v) : NaN));
      case 'abs':
        return inner.map(Math.abs);
      case 'd':
        return inner.map((v, i) => (i >= 1 && sameUnit(i, i - 1) ? v - inner[i - 1] : NaN));
      case 'd2': {
        const d1 = inner.map((v, i) => (i >= 1 && sameUnit(i, i - 1) ? v - inner[i - 1] : NaN));
        return d1.map((v, i) => (i >= 1 && sameUnit(i, i - 1) ? v - d1[i - 1] : NaN));
      }
      case 'lag': {
        const k = args[1] ? Number(args[1]) : 1;
        if (!Number.isInteger(k) || k < 1) throw new Error('lag(x,k) requiere k entero positivo.');
        return inner.map((_, i) => (i >= k && sameUnit(i, i - k) ? inner[i - k] : NaN));
      }
    }
  }
  return col(t);
}

/** Construye y, X con eliminación por lista de observaciones incompletas. */
export function buildDesign(ds: Dataset, yTerm: string, xTerms: string[], constant = true) {
  const y = resolveTerm(yTerm, ds);
  const xs = xTerms.map((x) => resolveTerm(x, ds));
  const rows: number[] = [];
  for (let i = 0; i < y.length; i++) {
    if (Number.isFinite(y[i]) && xs.every((x) => Number.isFinite(x[i]))) rows.push(i);
  }
  if (rows.length === 0) throw new Error('No quedan observaciones completas con estas variables.');
  return {
    y: rows.map((i) => y[i]),
    X: rows.map((i) => (constant ? [1, ...xs.map((x) => x[i])] : xs.map((x) => x[i]))),
    names: constant ? ['const', ...xTerms] : [...xTerms],
    rows,
    dropped: y.length - rows.length,
  };
}

/** Serie limpia (sin NaN) para análisis univariante. */
export function cleanSeries(ds: Dataset, term: string) {
  const v = resolveTerm(term, ds);
  const idx: number[] = [];
  v.forEach((x, i) => Number.isFinite(x) && idx.push(i));
  return { values: idx.map((i) => v[i]), index: idx.map((i) => ds.index?.[i] ?? String(i + 1)), rows: idx };
}

/** Divide por `sep` sólo fuera de paréntesis. */
function splitTopLevel(s: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === sep && depth === 0) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}
