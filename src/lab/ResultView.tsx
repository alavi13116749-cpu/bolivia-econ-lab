import { useMemo, useState, type ReactNode } from 'react';
import type { AnalysisResult } from '../analysis/run';
import { interpret } from '../analysis/interpret';
import { generateCode, LANGS, type Lang } from '../analysis/codegen';
import type { TestResult } from '../engine/diagnostics';
import type { OLSResult } from '../engine/ols';
import { fmt, fmtP, stars } from '../lib/format';
import { Markdown } from '../ui/Markdown';
import { BarsX, LineChartX, ScatterFit } from '../ui/Chart';
import { Verdict } from '../ui/controls';
import { openTutor } from '../state/store';

type Tab = 'salida' | 'graficos' | 'interpretacion' | 'codigo';

interface Row { name: string; coef: number; se: number; stat: number; p: number; lo?: number; hi?: number; extra?: string }

export function StataTable({ rows, statLabel = 't', extraLabel, caption }: { rows: Row[]; statLabel?: string; extraLabel?: string; caption?: ReactNode }) {
  const hasCI = rows.some((r) => r.lo !== undefined);
  return (
    <div className="stata overflow-x-auto">
      {caption && <div className="mb-1.5 text-[12px] text-muted">{caption}</div>}
      <table>
        <thead>
          <tr>
            <th scope="col">Variable</th><th scope="col">Coef.</th><th scope="col">Err. est.</th><th scope="col">{statLabel}</th><th scope="col">P&gt;|{statLabel}|</th>
            {hasCI && <th scope="col" colSpan={2}>[IC 95%]</th>}
            {extraLabel && <th scope="col">{extraLabel}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className={r.p < 0.05 ? 'text-ink' : 'text-muted'}>
              <td className="max-w-[16rem] truncate" title={r.name}>{r.name}</td>
              <td className={r.p < 0.05 ? 'font-semibold' : ''}>{fmt(r.coef)}<span className="inline-block w-6 text-left text-accent">{stars(r.p)}</span></td>
              <td>{fmt(r.se)}</td>
              <td>{fmt(r.stat, 2)}</td>
              <td>{fmtP(r.p)}</td>
              {hasCI && <><td>{fmt(r.lo)}</td><td>{fmt(r.hi)}</td></>}
              {extraLabel && <td>{r.extra}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-1 text-[11px] text-muted">*** p&lt;0,01 · ** p&lt;0,05 · * p&lt;0,1</div>
    </div>
  );
}

function olsRows(r: OLSResult): Row[] {
  return r.table.map((c) => ({ name: c.name, coef: c.coef, se: c.se, stat: c.t, p: c.p, lo: c.ciLow, hi: c.ciHigh }));
}

function FitGrid({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-1 font-mono text-[12.5px] sm:grid-cols-3">
      {items.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-3 border-b border-line py-1"><dt className="text-muted">{k}</dt><dd className="num">{v}</dd></div>
      ))}
    </dl>
  );
}

function olsFit(r: OLSResult): [string, ReactNode][] {
  const base: [string, ReactNode][] = [
    ['n', r.n], ['R²', fmt(r.r2)], ['R² ajustado', fmt(r.adjR2)],
    [`F(${r.dfModel}, ${r.dfResid})`, fmt(r.F, 3)], ['Prob > F', fmtP(r.Fp)], ['σ̂', fmt(r.sigma)],
    ['Durbin-Watson', fmt(r.dw, 3)],
  ];
  if (Number.isFinite(r.aic)) base.push(['AIC', fmt(r.aic, 2)], ['BIC', fmt(r.bic, 2)]);
  return base;
}

export function TestCards({ tests }: { tests: TestResult[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {tests.map((t) => (
        <div key={t.id} className="rounded-lg border border-line p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold">{t.name}</div>
            <Verdict ok={!t.rejects}>{t.rejects ? 'rechaza H0' : 'no rechaza H0'}</Verdict>
          </div>
          <div className="mt-1 font-mono text-[12px] text-muted">{t.statLabel} = {fmt(t.stat, 3)}{Array.isArray(t.df) ? ` (${t.df[0]}, ${t.df[1]})` : t.df ? ` (gl ${t.df})` : ''} · p = {fmtP(t.p)}</div>
          <div className="mt-1 text-xs text-muted">H0: {t.h0}</div>
          <p className="mt-1.5 text-[13px]">{t.conclusion}</p>
        </div>
      ))}
    </div>
  );
}

function SimpleTest({ name, stat, p, rejects, conclusion }: { name: string; stat: string; p: number; rejects: boolean; conclusion: string }) {
  return (
    <div className="rounded-lg border border-line p-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><div className="text-sm font-semibold">{name}</div><Verdict ok={!rejects}>{rejects ? 'rechaza H0' : 'no rechaza H0'}</Verdict></div>
      <div className="mt-1 font-mono text-[12px] text-muted">{stat} · p = {fmtP(p)}</div>
      <p className="mt-1.5 text-[13px]">{conclusion}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="grid min-w-0 gap-2"><h4 className="eyebrow">{title}</h4>{children}</section>;
}

function Output({ r }: { r: AnalysisResult }) {
  switch (r.kind) {
    case 'describe':
      return (
        <div className="grid gap-5">
          <div className="stata overflow-x-auto">
            <table>
              <thead><tr><th>Variable</th><th>n</th><th>Media</th><th>Desv. est.</th><th>Mín</th><th>Máx</th><th>Asimetría</th><th>Curtosis</th></tr></thead>
              <tbody>{r.rows.map((x) => <tr key={x.name}><td>{x.name}</td><td>{x.n}</td><td>{fmt(x.mean)}</td><td>{fmt(x.sd)}</td><td>{fmt(x.min, 3)}</td><td>{fmt(x.max, 3)}</td><td>{fmt(x.skew, 3)}</td><td>{fmt(x.kurt, 3)}</td></tr>)}</tbody>
            </table>
          </div>
          <Section title="Matriz de correlaciones">
            <div className="stata overflow-x-auto">
              <table>
                <thead><tr><th></th>{r.corr.names.map((n) => <th key={n}>{n}</th>)}</tr></thead>
                <tbody>{r.corr.names.map((a, i) => (
                  <tr key={a}><td>{a}</td>{r.corr.m[i].map((v, j) => (
                    <td key={j} style={{ background: i === j ? undefined : `color-mix(in oklab, ${v > 0 ? 'var(--series-1)' : 'var(--series-2)'} ${Math.round(Math.abs(v) * 45)}%, transparent)` }}>{fmt(v, 3)}</td>
                  ))}</tr>
                ))}</tbody>
              </table>
            </div>
          </Section>
        </div>
      );
    case 'ols':
      return (
        <div className="grid gap-5">
          <StataTable rows={olsRows(r.res)} caption={<>MCO · dependiente: <strong className="text-ink">{r.res.yName}</strong>{r.res.covType !== 'classic' && <> · errores {r.res.covType === 'HC1' ? 'robustos HC1' : `Newey-West (${r.res.hacLags} rezagos)`}</>}{r.dropped > 0 && <> · {r.dropped} obs. excluidas</>}</>} />
          <FitGrid items={olsFit(r.res)} />
          <Section title="Pruebas de diagnóstico"><TestCards tests={r.tests} /></Section>
          {r.vif.length > 1 && (
            <Section title="Factor de inflación de varianza">
              <div className="flex flex-wrap gap-2">{r.vif.map((v) => <span key={v.name} className={`chip font-mono ${v.vif > 10 ? 'bg-bad-soft text-bad' : v.vif > 5 ? 'bg-warn-soft text-warn' : 'bg-surface-2 text-ink'}`}>{v.name}: {fmt(v.vif, 2)}</span>)}</div>
            </Section>
          )}
        </div>
      );
    case 'binary': {
      const res = r.res;
      return (
        <div className="grid gap-5">
          <StataTable statLabel="z" extraLabel={res.oddsRatios ? 'Razón odds' : undefined}
            rows={res.names.map((n, i) => ({ name: n, coef: res.beta[i], se: res.se[i], stat: res.z[i], p: res.p[i], extra: res.oddsRatios ? fmt(res.oddsRatios[i], 3) : undefined }))}
            caption={<>{res.link === 'logit' ? 'Logit' : 'Probit'} · máxima verosimilitud · dependiente: <strong className="text-ink">{res.yName}</strong> · {res.iterations} iteraciones{!res.converged && ' · SIN convergencia'}</>} />
          <FitGrid items={[['n', res.n], ['Log-verosim.', fmt(res.logLik, 3)], ['Pseudo-R²', fmt(res.pseudoR2)], [`LR χ²(${res.k - 1})`, fmt(res.lr, 2)], ['Prob > χ²', fmtP(res.lrP)], ['AIC', fmt(res.aic, 2)], ['% correcto', `${(res.classification.accuracy * 100).toFixed(1)}%`], ['Sensibilidad', `${(res.classification.sensitivity * 100).toFixed(1)}%`], ['Especificidad', `${(res.classification.specificity * 100).toFixed(1)}%`]]} />
          <Section title="Efectos marginales promedio (dP/dx) frente al MPL con HC1">
            <StataTable statLabel="z" extraLabel="MPL" rows={res.ame.map((a) => ({ name: a.name, coef: a.effect, se: a.se, stat: a.z, p: a.p, extra: fmt(r.lpm.beta[r.lpm.names.indexOf(a.name)]) }))} />
          </Section>
        </div>
      );
    }
    case 'iv':
      return (
        <div className="grid gap-5">
          <StataTable rows={olsRows(r.res.main)} caption={<>MC2E · dependiente: <strong className="text-ink">{r.res.main.yName}</strong> · instrumentos: {r.spec.instruments.join(', ')}</>} />
          <FitGrid items={olsFit(r.res.main)} />
          <Section title="Diagnóstico de instrumentos">
            <div className="grid gap-2 sm:grid-cols-2">
              {r.res.firstStage.map((f) => (
                <div key={f.endog} className="rounded-lg border border-line p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2"><div className="text-sm font-semibold">Primera etapa: {f.endog}</div><Verdict ok={!f.weak}>{f.weak ? 'instrumentos débiles' : 'relevantes'}</Verdict></div>
                  <div className="mt-1 font-mono text-[12px] text-muted">F = {fmt(f.F, 2)} · p = {fmtP(f.p)} · R² parcial = {fmt(f.partialR2, 3)}</div>
                  <p className="mt-1.5 text-[13px]">Regla de Staiger-Stock: F &gt; 10 para descartar instrumentos débiles.</p>
                </div>
              ))}
              <SimpleTest name="Hausman (Durbin-Wu-Hausman)" stat={`F = ${fmt(r.res.hausman.F, 3)}`} p={r.res.hausman.p} rejects={r.res.hausman.rejects} conclusion={r.res.hausman.conclusion} />
              {r.res.sargan && <SimpleTest name="Sargan (sobreidentificación)" stat={`χ²(${r.res.sargan.df}) = ${fmt(r.res.sargan.stat, 3)}`} p={r.res.sargan.p} rejects={r.res.sargan.rejects} conclusion={r.res.sargan.conclusion} />}
            </div>
          </Section>
          <Section title="Comparación: MCO (sesgado si hay endogeneidad)"><StataTable rows={olsRows(r.res.olsComparison)} /></Section>
        </div>
      );
    case 'panel': {
      const p = r.res;
      const cols: [string, OLSResult][] = [['MCO agrupado', p.pooled], ['Efectos fijos', p.fe], ['Efectos aleatorios', p.re]];
      return (
        <div className="grid gap-5">
          <div className="stata overflow-x-auto">
            <div className="mb-1.5 text-[12px] text-muted">Panel · N = {p.N}, T = {fmt(p.T, 1)}, n = {p.nobs} {p.balanced ? '(balanceado)' : '(no balanceado)'} · errores estándar entre paréntesis</div>
            <table>
              <thead><tr><th>Variable</th>{cols.map(([n]) => <th key={n}>{n}</th>)}</tr></thead>
              <tbody>
                {['const', ...r.spec.x].map((v) => (
                  <tr key={v}><td>{v}</td>{cols.map(([n, m]) => { const j = m.names.indexOf(v); return <td key={n}>{j >= 0 ? <>{fmt(m.beta[j])}<span className="text-accent">{stars(m.p[j])}</span><div className="text-muted">({fmt(m.se[j])})</div></> : '—'}</td>; })}</tr>
                ))}
                <tr><td>R² (within para EF)</td><td>{fmt(p.pooled.r2, 3)}</td><td>{fmt(p.fe.r2Within, 3)}</td><td>{fmt(p.re.r2, 3)}</td></tr>
              </tbody>
            </table>
          </div>
          <FitGrid items={[['σ_u (EF)', fmt(p.fe.sigmaU)], ['σ_e', fmt(p.fe.sigmaE)], ['ρ', fmt(p.fe.rho)], ['θ (EA)', fmt(p.re.theta)], ['σ_u (EA)', fmt(p.re.sigmaU)]]} />
          <Section title="¿Qué estimador usar?">
            <div className="grid gap-2 sm:grid-cols-3">
              <SimpleTest name="F de efectos individuales" stat={`F(${p.fTestFE.df1}, ${p.fTestFE.df2}) = ${fmt(p.fTestFE.F, 2)}`} p={p.fTestFE.p} rejects={p.fTestFE.p < 0.05} conclusion={p.fTestFE.conclusion} />
              <SimpleTest name="LM de Breusch-Pagan" stat={`χ²(1) = ${fmt(p.bpLM.stat, 2)}`} p={p.bpLM.p} rejects={p.bpLM.p < 0.05} conclusion={p.bpLM.conclusion} />
              <SimpleTest name="Hausman" stat={`χ²(${p.hausman.df}) = ${fmt(p.hausman.stat, 2)}`} p={p.hausman.p} rejects={p.hausman.rejects} conclusion={p.hausman.conclusion} />
            </div>
          </Section>
        </div>
      );
    }
    case 'unitroot': {
      const rows = [
        { t: 'ADF en niveles', s: `τ = ${fmt(r.levels.stat, 3)}`, p: fmtP(r.levels.p), c: `${fmt(r.levels.crit['1%'], 3)} / ${fmt(r.levels.crit['5%'], 3)} / ${fmt(r.levels.crit['10%'], 3)}`, x: `${r.levels.usedLag} rezagos, n = ${r.levels.nobs}`, ok: r.levels.rejects },
        { t: 'ADF en diferencias', s: `τ = ${fmt(r.diff.stat, 3)}`, p: fmtP(r.diff.p), c: `${fmt(r.diff.crit['1%'], 3)} / ${fmt(r.diff.crit['5%'], 3)} / ${fmt(r.diff.crit['10%'], 3)}`, x: `${r.diff.usedLag} rezagos, n = ${r.diff.nobs}`, ok: r.diff.rejects },
        { t: 'KPSS en niveles', s: `η = ${fmt(r.kpssLevels.stat, 4)}`, p: r.kpssLevels.pBounded ? `${r.kpssLevels.pBounded === 'mayor' ? '>' : '<'} ${fmtP(r.kpssLevels.p)}` : fmtP(r.kpssLevels.p), c: `crítico 5% = ${r.kpssLevels.crit['5%']}`, x: `${r.kpssLevels.nlags} rezagos NW`, ok: !r.kpssLevels.rejects },
        { t: 'KPSS en diferencias', s: `η = ${fmt(r.kpssDiff.stat, 4)}`, p: r.kpssDiff.pBounded ? `${r.kpssDiff.pBounded === 'mayor' ? '>' : '<'} ${fmtP(r.kpssDiff.p)}` : fmtP(r.kpssDiff.p), c: `crítico 5% = ${r.kpssDiff.crit['5%']}`, x: `${r.kpssDiff.nlags} rezagos NW`, ok: !r.kpssDiff.rejects },
      ];
      return (
        <div className="grid gap-5">
          <div className="stata overflow-x-auto">
            <div className="mb-1.5 text-[12px] text-muted">{r.spec.variable} · {r.spec.regression === 'n' ? 'sin constante' : r.spec.regression === 'ct' ? 'con constante y tendencia' : 'con constante'} · rezagos ADF por AIC · p-valores de MacKinnon (1994)</div>
            <table>
              <thead><tr><th>Prueba</th><th>Estadístico</th><th>p-valor</th><th>Críticos 1% / 5% / 10%</th><th>Detalle</th><th>Resultado</th></tr></thead>
              <tbody>{rows.map((x) => <tr key={x.t}><td>{x.t}</td><td>{x.s}</td><td>{x.p}</td><td>{x.c}</td><td>{x.x}</td><td className="!text-left"><Verdict ok={x.ok}>{x.ok ? 'estacionaria' : 'no estacionaria'}</Verdict></td></tr>)}</tbody>
            </table>
          </div>
          <p className="text-sm">{r.levels.conclusion}</p>
        </div>
      );
    }
    case 'correlogram':
      return (
        <div className="grid gap-5">
          <div className="stata overflow-x-auto">
            <table>
              <thead><tr><th>Rezago</th><th>FAC</th><th>FACP</th><th className="!text-left">Banda ±{fmt(r.band, 3)}</th></tr></thead>
              <tbody>{r.acf.slice(1).map((v, k) => (
                <tr key={k}><td>{k + 1}</td><td className={Math.abs(v) > r.band ? 'font-semibold text-ink' : 'text-muted'}>{fmt(v, 3)}</td><td className={Math.abs(r.pacf[k + 1]) > r.band ? 'font-semibold text-ink' : 'text-muted'}>{fmt(r.pacf[k + 1], 3)}</td>
                  <td className="!text-left"><span className="inline-block h-2 rounded-sm bg-[var(--series-1)] align-middle" style={{ width: `${Math.min(Math.abs(v) * 120, 120)}px`, opacity: Math.abs(v) > r.band ? 1 : 0.35 }} /></td></tr>
              ))}</tbody>
            </table>
          </div>
          <SimpleTest name={`Ljung-Box Q(${r.lb.df})`} stat={`Q = ${fmt(r.lb.Q, 3)}`} p={r.lb.p} rejects={r.lb.p < 0.05} conclusion={r.lb.p < 0.05 ? 'Hay autocorrelación: la serie no es ruido blanco.' : 'Compatible con ruido blanco.'} />
        </div>
      );
    case 'arima':
      return (
        <div className="grid gap-5">
          <StataTable statLabel="z" rows={r.res.params.map((q) => ({ name: q.name, coef: q.coef, se: q.se, stat: q.z, p: q.p }))} caption={<>ARIMA({r.spec.p},{r.spec.d},{r.spec.q}) de <strong className="text-ink">{r.spec.variable}</strong> · suma de cuadrados condicional · n efectivo = {r.res.n}</>} />
          <FitGrid items={[['σ̂²', fmt(r.res.sigma2)], ['AIC', fmt(r.res.aic, 2)], ['BIC', fmt(r.res.bic, 2)], ['Estacionario', r.res.stationary ? 'sí' : 'no'], ['Invertible', r.res.invertible ? 'sí' : 'no']]} />
          <SimpleTest name={`Ljung-Box de residuos Q(${r.res.ljungBox.df})`} stat={`Q = ${fmt(r.res.ljungBox.Q, 3)}`} p={r.res.ljungBox.p} rejects={r.res.ljungBox.p < 0.05} conclusion={r.res.ljungBox.p < 0.05 ? 'Los residuos no son ruido blanco: pruebe otro orden.' : 'Residuos compatibles con ruido blanco: el modelo captura la dinámica.'} />
        </div>
      );
    case 'var': {
      const v = r.res;
      return (
        <div className="grid gap-5">
          <Section title="Selección del orden">
            <div className="stata overflow-x-auto"><table>
              <thead><tr><th>p</th><th>AIC</th><th>BIC</th><th>HQ</th></tr></thead>
              <tbody>{r.selection.rows.map((x) => <tr key={x.p}><td>{x.p}</td>{(['aic', 'bic', 'hqic'] as const).map((k) => <td key={k} className={r.selection.best[k] === x.p ? 'font-semibold text-accent' : ''}>{fmt(x[k], 4)}{r.selection.best[k] === x.p ? '*' : ''}</td>)}</tr>)}</tbody>
            </table></div>
          </Section>
          <FitGrid items={[['Orden usado', `VAR(${v.p})`], ['n', v.nobs], ['Log-verosim.', fmt(v.logLik, 2)], ['Máx. |raíz|', fmt(v.stableRadius, 4)], ['Estable', v.stableRadius < 1 ? 'sí' : 'no']]} />
          <Section title="Coeficientes por ecuación">
            <div className="grid gap-4 @4xl:grid-cols-2">{v.equations.map((eq) => <StataTable key={eq.yName} rows={olsRows(eq)} caption={<>Ecuación de <strong className="text-ink">{eq.yName}</strong> · R² = {fmt(eq.r2, 3)}</>} />)}</div>
          </Section>
          <Section title="Causalidad de Granger">
            <div className="stata overflow-x-auto"><table>
              <thead><tr><th>Causa → efecto</th><th>F</th><th>gl</th><th>p-valor</th><th className="!text-left">Resultado</th></tr></thead>
              <tbody>{r.granger.map((g) => <tr key={g.cause + g.effect}><td>{g.cause} → {g.effect}</td><td>{fmt(g.F, 3)}</td><td>({g.df1}, {g.df2})</td><td>{fmtP(g.p)}</td><td className="!text-left"><Verdict ok={!g.rejects}>{g.rejects ? 'causa' : 'no causa'}</Verdict></td></tr>)}</tbody>
            </table></div>
          </Section>
          <Section title={`Descomposición de varianza a ${r.fevd.length} períodos`}>
            <div className="stata overflow-x-auto"><table>
              <thead><tr><th>Variable \ shock</th>{v.names.map((n) => <th key={n}>{n}</th>)}</tr></thead>
              <tbody>{v.names.map((n, a) => <tr key={n}><td>{n}</td>{r.fevd[r.fevd.length - 1][a].map((x, b) => <td key={b}>{(x * 100).toFixed(1)}%</td>)}</tr>)}</tbody>
            </table></div>
          </Section>
        </div>
      );
    }
    case 'coint':
      return (
        <div className="grid gap-5">
          <Section title="Paso 1 · Orden de integración (ADF con constante)">
            <div className="stata overflow-x-auto"><table>
              <thead><tr><th>Serie</th><th>τ niveles</th><th>p</th><th>τ diferencias</th><th>p</th><th className="!text-left">Orden</th></tr></thead>
              <tbody>{r.orders.map((o) => <tr key={o.name}><td>{o.name}</td><td>{fmt(o.levels.stat, 3)}</td><td>{fmtP(o.levels.p)}</td><td>{fmt(o.diff.stat, 3)}</td><td>{fmtP(o.diff.p)}</td><td className="!text-left">{o.levels.rejects ? 'I(0)' : o.diff.rejects ? 'I(1)' : 'I(2)?'}</td></tr>)}</tbody>
            </table></div>
          </Section>
          <Section title="Paso 2 · Relación de largo plazo (MCO estático)"><StataTable rows={olsRows(r.eg.longRun)} caption="Coeficientes superconsistentes; sus errores estándar no son válidos para inferencia." /></Section>
          <SimpleTest name={`Paso 3 · ADF sobre residuos (MacKinnon, N = ${r.spec.x.length + 1})`} stat={`τ = ${fmt(r.eg.stat, 3)} · críticos ${fmt(r.eg.crit['1%'], 2)} / ${fmt(r.eg.crit['5%'], 2)} / ${fmt(r.eg.crit['10%'], 2)}`} p={r.eg.p} rejects={r.eg.rejects} conclusion={r.eg.conclusion} />
          <Section title="Paso 4 · Modelo de corrección de errores">
            <StataTable rows={olsRows(r.model.shortRun)} caption={<>Velocidad de ajuste γ = <strong className="text-ink">{fmt(r.model.gamma)}</strong>{Number.isFinite(r.model.halfLife) && <> · vida media ≈ {fmt(r.model.halfLife, 2)} períodos</>}</>} />
          </Section>
        </div>
      );
  }
}

function Charts({ r }: { r: AnalysisResult }) {
  switch (r.kind) {
    case 'ols': {
      const fitted = r.res.fitted;
      const isTS = r.index.length && !/^\d+$/.test(r.index[0]);
      const series = r.y.map((y, i) => ({ t: r.index[i], observado: +y.toFixed(4), ajustado: +fitted[i].toFixed(4), residuo: +r.res.resid[i].toFixed(4) }));
      return (
        <div className="grid gap-5">
          {isTS ? (
            <Section title="Observado vs ajustado"><LineChartX data={series} x="t" series={[{ key: 'observado', label: 'Observado' }, { key: 'ajustado', label: 'Ajustado', dashed: true }]} /></Section>
          ) : (
            <Section title="Observado vs ajustado"><ScatterFit points={series.map((s) => ({ x: s.ajustado, y: s.observado }))} line={(() => { const mn = Math.min(...fitted), mx = Math.max(...fitted); return [{ x: mn, y: mn }, { x: mx, y: mx }]; })()} xLabel="ajustado" yLabel="observado" /></Section>
          )}
          <Section title="Residuos vs ajustados (busque abanicos o curvas)"><ScatterFit points={series.map((s) => ({ x: s.ajustado, y: s.residuo }))} xLabel="ajustado" yLabel="residuo" /></Section>
          {isTS && <Section title="Residuos en el tiempo"><LineChartX data={series} x="t" series={[{ key: 'residuo', label: 'Residuo', color: 'series-2' }]} refY={[{ y: 0 }]} height={200} /></Section>}
        </div>
      );
    }
    case 'binary': {
      const sorted = r.res.prob.map((p, i) => ({ p, y: r.lpm.fitted[i] })).sort((a, b) => a.p - b.p);
      const step = Math.max(1, Math.floor(sorted.length / 300));
      const data = sorted.filter((_, i) => i % step === 0).map((s, i) => ({ i: i * step, [r.res.link]: +s.p.toFixed(4), MPL: +s.y.toFixed(4) }));
      return <Section title="Probabilidades predichas ordenadas: el MPL se sale de [0, 1]"><LineChartX data={data} x="i" xType="number" series={[{ key: r.res.link, label: r.res.link === 'logit' ? 'Logit' : 'Probit' }, { key: 'MPL', label: 'MPL', color: 'muted' }]} refY={[{ y: 0 }, { y: 1 }]} xLabel="observaciones ordenadas por probabilidad" /></Section>;
    }
    case 'unitroot': {
      const d = r.series.map((v, i) => ({ t: r.index[i], nivel: +v.toFixed(4), diferencia: i ? +(v - r.series[i - 1]).toFixed(4) : null }));
      return (
        <div className="grid gap-5">
          <Section title={`${r.spec.variable} en niveles`}><LineChartX data={d} x="t" series={[{ key: 'nivel', label: 'Nivel' }]} height={220} /></Section>
          <Section title="Primera diferencia"><LineChartX data={d} x="t" series={[{ key: 'diferencia', label: 'Δ', color: 'series-2' }]} height={200} refY={[{ y: 0 }]} /></Section>
        </div>
      );
    }
    case 'correlogram': {
      const d = r.acf.slice(1).map((v, k) => ({ k: k + 1, FAC: +v.toFixed(4), FACP: +r.pacf[k + 1].toFixed(4) }));
      return (
        <div className="grid gap-5 @4xl:grid-cols-2">
          <Section title="FAC"><BarsX data={d} x="k" bars={[{ key: 'FAC', label: 'FAC' }]} refY={[{ y: r.band }, { y: -r.band }]} /></Section>
          <Section title="FACP"><BarsX data={d} x="k" bars={[{ key: 'FACP', label: 'FACP', color: 'series-2' }]} refY={[{ y: r.band }, { y: -r.band }]} /></Section>
          <Section title="Serie"><LineChartX data={r.series.map((v, i) => ({ t: r.index[i], y: +v.toFixed(4) }))} x="t" series={[{ key: 'y', label: r.spec.variable }]} height={200} /></Section>
        </div>
      );
    }
    case 'arima': {
      const hist = r.series.slice(-60).map((v, i, a) => ({ t: r.index[r.index.length - a.length + i], observado: +v.toFixed(4), pronostico: null as number | null, lo: null as number | null, hi: null as number | null }));
      const last = hist[hist.length - 1];
      last.pronostico = last.observado; last.lo = last.observado; last.hi = last.observado;
      const fc = r.fc.mean.map((m, h) => ({ t: `h+${h + 1}`, observado: null, pronostico: +m.toFixed(4), lo: +r.fc.lower[h].toFixed(4), hi: +r.fc.upper[h].toFixed(4) }));
      const resid = r.res.resid.map((e, i) => ({ i, e: +e.toFixed(4) }));
      return (
        <div className="grid gap-5">
          <Section title="Pronóstico con banda de 95%"><LineChartX data={[...hist, ...fc]} x="t" series={[{ key: 'observado', label: 'Observado' }, { key: 'pronostico', label: 'Pronóstico', color: 'accent' }]} band={{ lower: 'lo', upper: 'hi', label: 'Banda 95%' }} height={280} /></Section>
          <Section title="Residuos"><LineChartX data={resid} x="i" series={[{ key: 'e', label: 'Residuo', color: 'series-2' }]} refY={[{ y: 0 }]} height={180} /></Section>
        </div>
      );
    }
    case 'var': {
      const K = r.res.K;
      const names = r.res.names;
      return (
        <div className="grid gap-5">
          <Section title="Impulso-respuesta ortogonalizada (Cholesky) · filas: respuesta · columnas: shock">
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${K > 3 ? 200 : 240}px, 1fr))` }}>
              {names.flatMap((resp, a) => names.map((imp, b) => (
                <div key={`${a}-${b}`} className="min-w-0 rounded-lg border border-line p-2">
                  <div className="truncate text-[11px] text-muted" title={`${imp} → ${resp}`}>shock <strong className="text-ink">{imp}</strong> → {resp}</div>
                  <LineChartX data={r.irf.map((m, h) => ({ h, v: +m[a][b].toFixed(5) }))} x="h" series={[{ key: 'v', label: 'respuesta', color: a === b ? 'accent' : 'series-1' }]} refY={[{ y: 0 }]} height={130} />
                </div>
              )))}
            </div>
          </Section>
          <Section title="Pronóstico a 12 períodos">
            <LineChartX data={[...r.data.slice(-36), ...r.forecast].map((row, i, all) => ({ t: i - (all.length - r.forecast.length), ...Object.fromEntries(names.map((n, k) => [n, +row[k].toFixed(3)])) }))} x="t" series={names.map((n) => ({ key: n, label: n }))} refX={[{ x: 0, label: 'hoy' }]} height={260} />
          </Section>
        </div>
      );
    }
    case 'coint': {
      const u = r.eg.longRun.resid.map((e, i) => ({ i, u: +e.toFixed(4) }));
      return <Section title="Residuo de la relación de largo plazo (desequilibrio)"><LineChartX data={u} x="i" series={[{ key: 'u', label: 'û', color: 'series-3' }]} refY={[{ y: 0 }]} height={240} /></Section>;
    }
    case 'iv': {
      return <Section title="Coeficientes: MCO vs MC2E">
        <BarsX data={r.res.main.names.filter((n) => n !== 'const').map((n) => ({ n, MCO: +r.res.olsComparison.beta[r.res.olsComparison.names.indexOf(n)].toFixed(4), MC2E: +r.res.main.beta[r.res.main.names.indexOf(n)].toFixed(4) }))} x="n" bars={[{ key: 'MCO', label: 'MCO' }, { key: 'MC2E', label: 'MC2E', color: 'series-3' }]} refY={[{ y: 0 }]} />
      </Section>;
    }
    case 'panel': {
      const p = r.res;
      return <Section title="Coeficientes por estimador">
        <BarsX data={r.spec.x.map((x) => ({ x, agrupado: +p.pooled.beta[p.pooled.names.indexOf(x)].toFixed(4), EF: +p.fe.beta[p.fe.names.indexOf(x)].toFixed(4), EA: +p.re.beta[p.re.names.indexOf(x)].toFixed(4) }))} x="x" bars={[{ key: 'agrupado', label: 'MCO agrupado' }, { key: 'EF', label: 'Efectos fijos', color: 'series-2' }, { key: 'EA', label: 'Efectos aleatorios', color: 'series-3' }]} refY={[{ y: 0 }]} />
      </Section>;
    }
    case 'describe':
      return <p className="text-sm text-muted">Use «Correlograma» o «Raíz unitaria» para graficar series individuales.</p>;
  }
}

function CodeTab({ r, datasetId }: { r: AnalysisResult; datasetId: string }) {
  const [lang, setLang] = useState<Lang>('stata');
  const [copied, setCopied] = useState(false);
  const code = useMemo(() => generateCode(r.spec, lang, `${datasetId}.csv`), [r, lang, datasetId]);
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {LANGS.map((l) => <button key={l.id} type="button" aria-pressed={lang === l.id} onClick={() => setLang(l.id)} className={`rounded-md border px-2.5 py-1 text-sm ${lang === l.id ? 'border-ink bg-ink text-bg' : 'border-line text-muted hover:text-ink'}`}>{l.label}</button>)}
        </div>
        <button type="button" className="btn btn-ghost !py-1 text-xs" onClick={() => navigator.clipboard.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => setCopied(false))}>{copied ? 'Copiado' : 'Copiar código'}</button>
      </div>
      <pre className="overflow-x-auto rounded-lg bg-surface-2 p-4 font-mono text-[12.5px] leading-relaxed"><code>{code}</code></pre>
      <p className="text-xs text-muted">Código equivalente para reproducir el análisis en su software. Exporte el dataset con «Descargar CSV» en la pestaña Datos del Lab.</p>
    </div>
  );
}

export function ResultView({ r, datasetId }: { r: AnalysisResult; datasetId: string }) {
  const [tab, setTab] = useState<Tab>('salida');
  const interp = useMemo(() => interpret(r), [r]);
  const [copied, setCopied] = useState(false);
  const tabs: { id: Tab; label: string }[] = [{ id: 'salida', label: 'Salida' }, { id: 'graficos', label: 'Gráficos' }, { id: 'interpretacion', label: 'Interpretación' }, { id: 'codigo', label: 'Stata · R · Python' }];
  return (
    <div className="card min-w-0 fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <div className="eyebrow">Resultado</div>
          <h2 className="truncate text-lg font-semibold" title={r.title}>{r.title}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-ghost !py-1.5 text-xs" onClick={() => navigator.clipboard.writeText(r.report).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => setCopied(false))}>{copied ? 'Copiado' : 'Copiar salida'}</button>
          <button type="button" className="btn btn-primary !py-1.5 text-xs" onClick={() => openTutor(`Interpreta este resultado del Lab (${r.title}) y dime qué debería revisar o mejorar.`)}>Preguntar al Auxiliar</button>
        </div>
      </div>
      <div role="tablist" aria-label="Vistas del resultado" className="flex gap-1 overflow-x-auto border-b border-line px-3 sm:px-4">
        {tabs.map((t) => (
          <button key={t.id} role="tab" type="button" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm ${tab === t.id ? 'border-accent font-semibold text-ink' : 'border-transparent text-muted hover:text-ink'}`}>{t.label}</button>
        ))}
      </div>
      <div className="min-w-0 p-4 sm:p-5" role="tabpanel">
        {tab === 'salida' && <Output r={r} />}
        {tab === 'graficos' && <Charts r={r} />}
        {tab === 'interpretacion' && (
          <div className="grid gap-3">
            <Markdown text={interp} />
            <p className="text-xs text-muted">Interpretación automática generada por reglas a partir de los resultados. Para discutirla, use «Preguntar al Auxiliar».</p>
          </div>
        )}
        {tab === 'codigo' && <CodeTab r={r} datasetId={datasetId} />}
      </div>
    </div>
  );
}
