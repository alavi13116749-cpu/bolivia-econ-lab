import { useEffect, useState } from 'react';
import type { Dataset } from '../data/datasets';
import type { AnalysisSpec } from '../analysis/run';

export type Kind = AnalysisSpec['kind'];

export const KINDS: { id: Kind; label: string; group: 'Corte transversal y panel' | 'Series de tiempo' | 'Exploración' }[] = [
  { id: 'ols', label: 'MCO', group: 'Corte transversal y panel' },
  { id: 'binary', label: 'Logit / Probit', group: 'Corte transversal y panel' },
  { id: 'iv', label: 'MC2E (VI)', group: 'Corte transversal y panel' },
  { id: 'panel', label: 'Panel EF/EA', group: 'Corte transversal y panel' },
  { id: 'unitroot', label: 'Raíz unitaria', group: 'Series de tiempo' },
  { id: 'correlogram', label: 'Correlograma', group: 'Series de tiempo' },
  { id: 'arima', label: 'ARIMA', group: 'Series de tiempo' },
  { id: 'var', label: 'VAR', group: 'Series de tiempo' },
  { id: 'coint', label: 'Cointegración', group: 'Series de tiempo' },
  { id: 'describe', label: 'Descriptivos', group: 'Exploración' },
];

export interface BuilderState {
  kind: Kind;
  y: string;
  x: string[];
  covType: 'classic' | 'HC1' | 'HAC';
  link: 'logit' | 'probit';
  exog: string[];
  endog: string[];
  instruments: string[];
  variable: string;
  regression: 'n' | 'c' | 'ct';
  lags: number;
  p: number;
  d: number;
  q: number;
  horizon: number;
  variables: string[];
  varP: number | 'auto';
}

export function defaultBuilder(ds: Dataset): BuilderState {
  return {
    kind: 'ols', y: ds.columns[0], x: ds.columns.slice(1, 3), covType: 'classic', link: 'logit', exog: [], endog: [], instruments: [],
    variable: ds.columns[0], regression: 'c', lags: 20, p: 1, d: 0, q: 0, horizon: 8, variables: ds.columns.slice(0, 2), varP: 'auto',
  };
}

const FUNCS = new Set(['log', 'ln', 'exp', 'sqrt', 'd', 'd2', 'lag', 'abs']);

/** ¿Todas las variables que usa el término existen en el dataset? */
export function termValid(term: string, ds: Dataset): boolean {
  const ids = term.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? [];
  const vars = ids.filter((id) => !FUNCS.has(id.toLowerCase()));
  return vars.length > 0 && vars.every((v) => ds.columns.includes(v));
}

/** Adapta el constructor a otro dataset conservando lo que sigue siendo válido. */
export function sanitizeBuilder(b: BuilderState, ds: Dataset): BuilderState {
  const def = defaultBuilder(ds);
  const keep = (xs: string[]) => xs.filter((x) => termValid(x, ds));
  const y = termValid(b.y, ds) ? b.y : def.y;
  const x = keep(b.x).filter((v) => v !== y);
  const variables = keep(b.variables);
  return {
    ...b, y, x: x.length ? x : def.x.filter((v) => v !== y),
    exog: keep(b.exog), endog: keep(b.endog), instruments: keep(b.instruments),
    variable: termValid(b.variable, ds) ? b.variable : def.variable,
    variables: variables.length >= 2 ? variables : def.variables,
  };
}

export function builderFromSpec(ds: Dataset, spec: AnalysisSpec): BuilderState {
  const b = defaultBuilder(ds);
  switch (spec.kind) {
    case 'describe': return { ...b, kind: 'describe', variables: spec.variables?.length ? spec.variables : ds.columns };
    case 'ols': return { ...b, kind: 'ols', y: spec.y, x: spec.x, covType: spec.covType ?? 'classic' };
    case 'binary': return { ...b, kind: 'binary', y: spec.y, x: spec.x, link: spec.link };
    case 'iv': return { ...b, kind: 'iv', y: spec.y, exog: spec.exog, endog: spec.endog, instruments: spec.instruments };
    case 'panel': return { ...b, kind: 'panel', y: spec.y, x: spec.x };
    case 'unitroot': return { ...b, kind: 'unitroot', variable: spec.variable, regression: spec.regression ?? 'c' };
    case 'correlogram': return { ...b, kind: 'correlogram', variable: spec.variable, lags: spec.lags ?? 20 };
    case 'arima': return { ...b, kind: 'arima', variable: spec.variable, p: spec.p, d: spec.d, q: spec.q, horizon: spec.horizon ?? 8 };
    case 'var': return { ...b, kind: 'var', variables: spec.variables, varP: spec.p ?? 'auto', horizon: spec.horizon ?? 12 };
    case 'coint': return { ...b, kind: 'coint', y: spec.y, x: spec.x };
  }
}

export function specFromBuilder(b: BuilderState): AnalysisSpec {
  switch (b.kind) {
    case 'describe': return { kind: 'describe', variables: b.variables };
    case 'ols': return { kind: 'ols', y: b.y, x: b.x, covType: b.covType };
    case 'binary': return { kind: 'binary', link: b.link, y: b.y, x: b.x };
    case 'iv': return { kind: 'iv', y: b.y, exog: b.exog, endog: b.endog, instruments: b.instruments };
    case 'panel': return { kind: 'panel', y: b.y, x: b.x };
    case 'unitroot': return { kind: 'unitroot', variable: b.variable, regression: b.regression };
    case 'correlogram': return { kind: 'correlogram', variable: b.variable, lags: b.lags };
    case 'arima': return { kind: 'arima', variable: b.variable, p: b.p, d: b.d, q: b.q, horizon: b.horizon };
    case 'var': return { kind: 'var', variables: b.variables, p: b.varP === 'auto' ? undefined : b.varP, horizon: b.horizon };
    case 'coint': return { kind: 'coint', y: b.y, x: b.x };
  }
}

/** Selector de términos: variables del dataset + transformaciones escritas a mano. */
function TermPicker({ id, label, ds, value, onChange, hint }: { id: string; label: string; ds: Dataset; value: string[]; onChange: (v: string[]) => void; hint?: string }) {
  const [custom, setCustom] = useState('');
  const add = (t: string) => { const s = t.trim(); if (s && !value.includes(s)) onChange([...value, s]); };
  const extra = value.filter((v) => !ds.columns.includes(v));
  return (
    <fieldset className="grid gap-1.5">
      <legend className="mb-1 text-sm text-muted">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {[...ds.columns, ...extra].map((c) => {
          const on = value.includes(c);
          return (
            <button key={c} type="button" aria-pressed={on} onClick={() => onChange(on ? value.filter((v) => v !== c) : [...value, c])}
              className={`rounded-md border px-2 py-0.5 font-mono text-[12px] transition-colors ${on ? 'border-ink bg-ink text-bg' : 'border-line bg-surface text-muted hover:text-ink'}`}>{c}</button>
          );
        })}
      </div>
      <div className="flex gap-1.5">
        <label htmlFor={id} className="sr-only">Agregar término transformado</label>
        <input id={id} className="field !py-1 font-mono text-[12px]" placeholder="log(x), x^2, lag(x,1), d(x), a*b" value={custom}
          onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(custom); setCustom(''); } }} />
        <button type="button" className="btn btn-ghost !px-2.5 !py-1 text-xs" onClick={() => { add(custom); setCustom(''); }}>Agregar</button>
      </div>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </fieldset>
  );
}

function Single({ id, label, ds, value, onChange }: { id: string; label: string; ds: Dataset; value: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const opts = ds.columns.includes(value) ? ds.columns : [...ds.columns, value];
  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="text-sm text-muted">{label}</label>
      <div className="flex gap-1.5">
        <select id={id} className="field font-mono text-[13px]" value={value} onChange={(e) => onChange(e.target.value)}>
          {opts.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input aria-label={`${label}: término transformado`} className="field w-36 font-mono text-[12px]" placeholder="o d(x)…" value={text === value && ds.columns.includes(value) ? '' : text}
          onChange={(e) => setText(e.target.value)} onBlur={() => text.trim() && onChange(text.trim())} onKeyDown={(e) => e.key === 'Enter' && text.trim() && onChange(text.trim())} />
      </div>
    </div>
  );
}

function Num({ id, label, value, min, max, onChange }: { id: string; label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <label htmlFor={id} className="grid gap-1 text-sm"><span className="text-muted">{label}</span>
      <input id={id} type="number" className="field num" min={min} max={max} value={value} onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || 0)))} />
    </label>
  );
}

export function ModelBuilder({ ds, b, set }: { ds: Dataset; b: BuilderState; set: (p: Partial<BuilderState>) => void }) {
  const groups = ['Corte transversal y panel', 'Series de tiempo', 'Exploración'] as const;
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        {groups.map((g) => (
          <div key={g}>
            <div className="eyebrow mb-1">{g}</div>
            <div className="flex flex-wrap gap-1.5">
              {KINDS.filter((k) => k.group === g).map((k) => (
                <button key={k.id} type="button" aria-pressed={b.kind === k.id} onClick={() => set({ kind: k.id })}
                  className={`rounded-lg border px-2.5 py-1 text-sm transition-colors ${b.kind === k.id ? 'border-accent bg-accent-soft font-semibold text-ink' : 'border-line bg-surface text-muted hover:text-ink'}`}>{k.label}</button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {(b.kind === 'ols' || b.kind === 'binary' || b.kind === 'panel' || b.kind === 'coint') && (
        <>
          <Single id="b-y" label="Variable dependiente" ds={ds} value={b.y} onChange={(y) => set({ y })} />
          <TermPicker id="b-x" label={b.kind === 'coint' ? 'Variables de la relación de largo plazo' : 'Regresores (la constante se agrega sola)'} ds={ds} value={b.x.filter((v) => v !== b.y)} onChange={(x) => set({ x })} />
        </>
      )}
      {b.kind === 'ols' && (
        <div className="grid gap-1 text-sm">
          <span className="text-muted">Errores estándar</span>
          <div className="flex flex-wrap gap-1.5">
            {([['classic', 'Clásicos'], ['HC1', 'Robustos HC1'], ['HAC', 'Newey-West']] as const).map(([id, l]) => (
              <button key={id} type="button" aria-pressed={b.covType === id} onClick={() => set({ covType: id })} className={`rounded-md border px-2.5 py-1 ${b.covType === id ? 'border-ink bg-ink text-bg' : 'border-line text-muted hover:text-ink'}`}>{l}</button>
            ))}
          </div>
        </div>
      )}
      {b.kind === 'binary' && (
        <div className="flex gap-1.5 text-sm">
          {(['logit', 'probit'] as const).map((l) => (
            <button key={l} type="button" aria-pressed={b.link === l} onClick={() => set({ link: l })} className={`rounded-md border px-3 py-1 capitalize ${b.link === l ? 'border-ink bg-ink text-bg' : 'border-line text-muted hover:text-ink'}`}>{l}</button>
          ))}
        </div>
      )}
      {b.kind === 'iv' && (
        <>
          <Single id="iv-y" label="Variable dependiente" ds={ds} value={b.y} onChange={(y) => set({ y })} />
          <TermPicker id="iv-exog" label="Exógenas incluidas" ds={ds} value={b.exog} onChange={(exog) => set({ exog })} />
          <TermPicker id="iv-endog" label="Regresores endógenos" ds={ds} value={b.endog} onChange={(endog) => set({ endog })} />
          <TermPicker id="iv-z" label="Instrumentos excluidos" ds={ds} value={b.instruments} onChange={(instruments) => set({ instruments })} hint="Necesita al menos tantos instrumentos como endógenas (condición de orden)." />
        </>
      )}
      {(b.kind === 'unitroot' || b.kind === 'correlogram' || b.kind === 'arima') && (
        <Single id="ts-v" label="Serie" ds={ds} value={b.variable} onChange={(variable) => set({ variable })} />
      )}
      {b.kind === 'unitroot' && (
        <div className="grid gap-1 text-sm">
          <span className="text-muted">Componentes determinísticos</span>
          <div className="flex flex-wrap gap-1.5">
            {([['n', 'Ninguno'], ['c', 'Constante'], ['ct', 'Constante y tendencia']] as const).map(([id, l]) => (
              <button key={id} type="button" aria-pressed={b.regression === id} onClick={() => set({ regression: id })} className={`rounded-md border px-2.5 py-1 ${b.regression === id ? 'border-ink bg-ink text-bg' : 'border-line text-muted hover:text-ink'}`}>{l}</button>
            ))}
          </div>
        </div>
      )}
      {b.kind === 'correlogram' && <Num id="cg-l" label="Rezagos" value={b.lags} min={4} max={48} onChange={(lags) => set({ lags })} />}
      {b.kind === 'arima' && (
        <div className="grid grid-cols-4 gap-2">
          <Num id="ar-p" label="p (AR)" value={b.p} min={0} max={6} onChange={(p) => set({ p })} />
          <Num id="ar-d" label="d" value={b.d} min={0} max={2} onChange={(d) => set({ d })} />
          <Num id="ar-q" label="q (MA)" value={b.q} min={0} max={4} onChange={(q) => set({ q })} />
          <Num id="ar-h" label="Horizonte" value={b.horizon} min={1} max={36} onChange={(horizon) => set({ horizon })} />
        </div>
      )}
      {(b.kind === 'var' || b.kind === 'describe') && (
        <TermPicker id="var-v" label={b.kind === 'var' ? 'Variables del VAR (el orden define Cholesky)' : 'Variables'} ds={ds} value={b.variables} onChange={(variables) => set({ variables })}
          hint={b.kind === 'var' ? 'Ordene de la más exógena a la más endógena: el orden de selección es el orden de Cholesky.' : undefined} />
      )}
      {b.kind === 'var' && (
        <div className="grid grid-cols-2 gap-2">
          <label htmlFor="var-p" className="grid gap-1 text-sm"><span className="text-muted">Rezagos</span>
            <select id="var-p" className="field" value={String(b.varP)} onChange={(e) => set({ varP: e.target.value === 'auto' ? 'auto' : Number(e.target.value) })}>
              <option value="auto">Automático (AIC)</option>
              {[1, 2, 3, 4, 5, 6, 8, 12].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <Num id="var-h" label="Horizonte IRF" value={b.horizon} min={4} max={36} onChange={(horizon) => set({ horizon })} />
        </div>
      )}
    </div>
  );
}
