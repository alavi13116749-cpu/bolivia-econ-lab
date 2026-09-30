import type { Dataset } from '../data/datasets';
import { buildDesign, cleanSeries, resolveTerm } from './terms';
import { ols, type CovType, type OLSResult } from '../engine/ols';
import { diagnostics, vif, moments, type TestResult, type VIFRow } from '../engine/diagnostics';
import { binaryModel, type BinaryResult } from '../engine/binary';
import { iv2sls, type IVResult } from '../engine/iv';
import { panelModels, type PanelResults } from '../engine/panel';
import {
  acf, adf, arima, ecm, engleGranger, fevd, fitVAR, grangerTest, irf, kpss, ljungBox, pacf, selectVARLag, varForecast,
  type ADFResult, type ARIMAResult, type VARResult,
} from '../engine/timeseries';
import type { DFRegression } from '../engine/distributions';
import { fmt, fmtP, stars } from '../lib/format';

export type AnalysisSpec =
  | { kind: 'describe'; variables?: string[] }
  | { kind: 'ols'; y: string; x: string[]; covType?: CovType; hacLags?: number }
  | { kind: 'binary'; link: 'logit' | 'probit'; y: string; x: string[] }
  | { kind: 'iv'; y: string; exog: string[]; endog: string[]; instruments: string[]; covType?: 'classic' | 'HC1' }
  | { kind: 'panel'; y: string; x: string[] }
  | { kind: 'unitroot'; variable: string; regression?: DFRegression; maxlag?: number }
  | { kind: 'correlogram'; variable: string; lags?: number }
  | { kind: 'arima'; variable: string; p: number; d: number; q: number; horizon?: number; constant?: boolean }
  | { kind: 'var'; variables: string[]; p?: number; maxlags?: number; horizon?: number }
  | { kind: 'coint'; y: string; x: string[]; ecmLags?: number };

export type AnalysisResult =
  | { kind: 'describe'; spec: AnalysisSpec; title: string; report: string; rows: DescribeRow[]; corr: { names: string[]; m: number[][] } }
  | { kind: 'ols'; spec: Extract<AnalysisSpec, { kind: 'ols' }>; title: string; report: string; res: OLSResult; tests: TestResult[]; vif: VIFRow[]; dropped: number; y: number[]; index: string[] }
  | { kind: 'binary'; spec: Extract<AnalysisSpec, { kind: 'binary' }>; title: string; report: string; res: BinaryResult; lpm: OLSResult }
  | { kind: 'iv'; spec: Extract<AnalysisSpec, { kind: 'iv' }>; title: string; report: string; res: IVResult }
  | { kind: 'panel'; spec: Extract<AnalysisSpec, { kind: 'panel' }>; title: string; report: string; res: PanelResults }
  | { kind: 'unitroot'; spec: Extract<AnalysisSpec, { kind: 'unitroot' }>; title: string; report: string; levels: ADFResult; diff: ADFResult; kpssLevels: ReturnType<typeof kpss>; kpssDiff: ReturnType<typeof kpss>; series: number[]; index: string[] }
  | { kind: 'correlogram'; spec: Extract<AnalysisSpec, { kind: 'correlogram' }>; title: string; report: string; acf: number[]; pacf: number[]; band: number; lb: ReturnType<typeof ljungBox>; series: number[]; index: string[] }
  | { kind: 'arima'; spec: Extract<AnalysisSpec, { kind: 'arima' }>; title: string; report: string; res: ARIMAResult; series: number[]; index: string[]; fc: { mean: number[]; lower: number[]; upper: number[] } }
  | { kind: 'var'; spec: Extract<AnalysisSpec, { kind: 'var' }>; title: string; report: string; res: VARResult; selection: ReturnType<typeof selectVARLag>; granger: ReturnType<typeof grangerTest>[]; irf: number[][][]; fevd: number[][][]; forecast: number[][]; data: number[][] }
  | { kind: 'coint'; spec: Extract<AnalysisSpec, { kind: 'coint' }>; title: string; report: string; eg: ReturnType<typeof engleGranger>; model: ReturnType<typeof ecm>; orders: { name: string; levels: ADFResult; diff: ADFResult }[] };

export interface DescribeRow { name: string; n: number; mean: number; sd: number; min: number; max: number; skew: number; kurt: number }

const line = (w = 78) => '─'.repeat(w);

export function olsReport(r: OLSResult, extra = ''): string {
  const head = `${r.method} · Variable dependiente: ${r.yName} · n = ${r.n}${r.covType !== 'classic' ? ` · Errores ${r.covType === 'HC1' ? 'robustos HC1 (White)' : `HAC Newey-West (${r.hacLags} rezagos)`}` : ''}`;
  const rows = r.table.map((c) => `${c.name.padEnd(22).slice(0, 22)} ${fmt(c.coef).padStart(11)} ${fmt(c.se).padStart(11)} ${fmt(c.t, 3).padStart(8)} ${fmtP(c.p).padStart(8)} ${stars(c.p).padEnd(3)}`);
  return [
    head, line(),
    `${'Variable'.padEnd(22)} ${'Coef.'.padStart(11)} ${'Err. est.'.padStart(11)} ${'t'.padStart(8)} ${'P>|t|'.padStart(8)}`,
    line(), ...rows, line(),
    `R² = ${fmt(r.r2)}   R² ajustado = ${fmt(r.adjR2)}   F(${r.dfModel}, ${r.dfResid}) = ${fmt(r.F, 3)}  Prob > F = ${fmtP(r.Fp)}`,
    Number.isFinite(r.aic) ? `σ̂ = ${fmt(r.sigma)}   Log-verosimilitud = ${fmt(r.logLik, 3)}   AIC = ${fmt(r.aic, 3)}   BIC = ${fmt(r.bic, 3)}   Durbin-Watson = ${fmt(r.dw, 3)}` : `σ̂ = ${fmt(r.sigma)}   Durbin-Watson = ${fmt(r.dw, 3)}`,
    extra,
  ].filter(Boolean).join('\n');
}

function testsReport(tests: TestResult[]): string {
  return ['Pruebas de diagnóstico:', ...tests.map((t) => `· ${t.name}: ${t.statLabel} = ${fmt(t.stat, 3)}, p = ${fmtP(t.p)} → ${t.conclusion}`)].join('\n');
}

function isTimeSeries(ds: Dataset) {
  return ds.frequency === 'anual' || ds.frequency === 'mensual' || ds.frequency === 'trimestral';
}

export function runAnalysis(ds: Dataset, spec: AnalysisSpec): AnalysisResult {
  switch (spec.kind) {
    case 'describe': {
      const vars = spec.variables?.length ? spec.variables : ds.columns;
      const rows: DescribeRow[] = vars.map((v) => {
        const s = cleanSeries(ds, v).values;
        const m = moments(s);
        return { name: v, n: s.length, mean: m.mean, sd: Math.sqrt((m.variance * s.length) / (s.length - 1)), min: Math.min(...s), max: Math.max(...s), skew: m.skew, kurt: m.kurtosis };
      });
      const cols = vars.map((v) => resolveTerm(v, ds));
      const m = cols.map((a) => cols.map((b) => {
        const idx = a.map((_, i) => i).filter((i) => Number.isFinite(a[i]) && Number.isFinite(b[i]));
        const ma = idx.reduce((s, i) => s + a[i], 0) / idx.length;
        const mb = idx.reduce((s, i) => s + b[i], 0) / idx.length;
        let sab = 0, saa = 0, sbb = 0;
        for (const i of idx) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; }
        return sab / Math.sqrt(saa * sbb);
      }));
      const report = ['Estadística descriptiva', line(),
        `${'Variable'.padEnd(20)} ${'n'.padStart(5)} ${'Media'.padStart(11)} ${'Desv.est.'.padStart(11)} ${'Mín'.padStart(10)} ${'Máx'.padStart(10)}`,
        ...rows.map((r) => `${r.name.padEnd(20).slice(0, 20)} ${String(r.n).padStart(5)} ${fmt(r.mean).padStart(11)} ${fmt(r.sd).padStart(11)} ${fmt(r.min, 3).padStart(10)} ${fmt(r.max, 3).padStart(10)}`)].join('\n');
      return { kind: 'describe', spec, title: 'Estadística descriptiva', report, rows, corr: { names: vars, m } };
    }
    case 'ols': {
      if (!spec.x.length) throw new Error('Elija al menos un regresor.');
      const d = buildDesign(ds, spec.y, spec.x);
      const res = ols(d.y, d.X, d.names, spec.y, { covType: spec.covType ?? 'classic', hacLags: spec.hacLags });
      const tests = diagnostics(res, d.y, d.X, { timeSeries: isTimeSeries(ds) });
      const vifs = vif(d.X, d.names);
      const report = [olsReport(res, d.dropped ? `(${d.dropped} observaciones excluidas por datos faltantes o rezagos)` : ''), '', testsReport(tests),
        vifs.length > 1 ? `VIF: ${vifs.map((v) => `${v.name} = ${fmt(v.vif, 2)}`).join(', ')}` : ''].join('\n');
      return { kind: 'ols', spec, title: `MCO: ${spec.y} sobre ${spec.x.join(', ')}`, report, res, tests, vif: vifs, dropped: d.dropped, y: d.y, index: d.rows.map((i) => ds.index?.[i] ?? String(i + 1)) };
    }
    case 'binary': {
      if (!spec.x.length) throw new Error('Elija al menos un regresor.');
      const d = buildDesign(ds, spec.y, spec.x);
      const res = binaryModel(d.y, d.X, d.names, spec.link, spec.y);
      const lpm = ols(d.y, d.X, d.names, spec.y, { covType: 'HC1' });
      const L = spec.link === 'logit' ? 'Logit' : 'Probit';
      const report = [
        `${L} · Variable dependiente: ${spec.y} · n = ${res.n} · Máxima verosimilitud (${res.iterations} iteraciones${res.converged ? '' : ', SIN convergencia'})`, line(),
        `${'Variable'.padEnd(22)} ${'Coef.'.padStart(11)} ${'Err. est.'.padStart(11)} ${'z'.padStart(8)} ${'P>|z|'.padStart(8)}${res.oddsRatios ? '  Razón odds'.padStart(12) : ''}`,
        line(),
        ...res.names.map((nm, i) => `${nm.padEnd(22).slice(0, 22)} ${fmt(res.beta[i]).padStart(11)} ${fmt(res.se[i]).padStart(11)} ${fmt(res.z[i], 3).padStart(8)} ${fmtP(res.p[i]).padStart(8)}${res.oddsRatios ? fmt(res.oddsRatios[i]).padStart(12) : ''} ${stars(res.p[i])}`),
        line(),
        `Log-verosimilitud = ${fmt(res.logLik, 3)}   Pseudo-R² de McFadden = ${fmt(res.pseudoR2)}   LR χ²(${res.k - 1}) = ${fmt(res.lr, 3)}, p = ${fmtP(res.lrP)}`,
        `Clasificación correcta (umbral 0,5): ${(res.classification.accuracy * 100).toFixed(1)}%  · Sensibilidad ${(res.classification.sensitivity * 100).toFixed(1)}% · Especificidad ${(res.classification.specificity * 100).toFixed(1)}%`,
        '', 'Efectos marginales promedio (AME, dP/dx):',
        ...res.ame.map((a) => `· ${a.name}: ${fmt(a.effect)} (e.e. ${fmt(a.se)}, p = ${fmtP(a.p)})  | MPL: ${fmt(lpm.beta[res.names.indexOf(a.name)])}`),
      ].join('\n');
      return { kind: 'binary', spec, title: `${L}: ${spec.y}`, report, res, lpm };
    }
    case 'iv': {
      if (!spec.endog.length) throw new Error('Indique al menos un regresor endógeno.');
      if (spec.instruments.length < spec.endog.length) throw new Error(`Modelo no identificado: hay ${spec.instruments.length} instrumento(s) excluido(s) para ${spec.endog.length} endógena(s). La condición de orden exige al menos tantos instrumentos como endógenas.`);
      const overlap = spec.instruments.filter((z) => spec.exog.includes(z) || spec.endog.includes(z));
      if (overlap.length) throw new Error(`${overlap.join(', ')} no puede ser a la vez instrumento excluido y regresor.`);
      const all = [...spec.exog, ...spec.endog, ...spec.instruments];
      const d = buildDesign(ds, spec.y, all);
      const ne = spec.exog.length;
      const nd = spec.endog.length;
      const res = iv2sls({
        y: d.y, yName: spec.y,
        exog: d.X.map((r) => r.slice(0, 1 + ne)), exogNames: ['const', ...spec.exog],
        endog: d.X.map((r) => r.slice(1 + ne, 1 + ne + nd)), endogNames: spec.endog,
        instruments: d.X.map((r) => r.slice(1 + ne + nd)), instrumentNames: spec.instruments,
        covType: spec.covType,
      });
      const report = [
        olsReport(res.main, `Instrumentos: ${spec.instruments.join(', ')} (más exógenas incluidas)`), '',
        'Primera etapa:', ...res.firstStage.map((f) => `· ${f.endog}: F de instrumentos excluidos = ${fmt(f.F, 2)} (p = ${fmtP(f.p)}), R² parcial = ${fmt(f.partialR2, 3)}${f.weak ? ' → INSTRUMENTOS DÉBILES (F < 10)' : ''}`),
        `Hausman (Durbin-Wu-Hausman): F = ${fmt(res.hausman.F, 3)}, p = ${fmtP(res.hausman.p)} → ${res.hausman.conclusion}`,
        res.sargan ? `Sargan: χ²(${res.sargan.df}) = ${fmt(res.sargan.stat, 3)}, p = ${fmtP(res.sargan.p)} → ${res.sargan.conclusion}` : 'Sargan: modelo exactamente identificado (no aplica).',
        '', 'Comparación con MCO: ' + res.olsComparison.table.map((c) => `${c.name} = ${fmt(c.coef)}`).join(', '),
      ].join('\n');
      return { kind: 'iv', spec, title: `MC2E: ${spec.y}`, report, res };
    }
    case 'panel': {
      if (!ds.panel) throw new Error('Este dataset no tiene estructura de panel (individuo × tiempo). Use «Panel departamental».');
      if (!spec.x.length) throw new Error('Elija al menos un regresor.');
      const d = buildDesign(ds, spec.y, spec.x, false);
      const res = panelModels({ y: d.y, yName: spec.y, X: d.X, names: spec.x, entity: d.rows.map((i) => ds.panel!.entity[i]), time: d.rows.map((i) => ds.panel!.time[i]) });
      const tab = (name: string, r: OLSResult) => `${name.padEnd(16)} ` + spec.x.map((x) => { const j = r.names.indexOf(x); return `${x} = ${fmt(r.beta[j])} (${fmt(r.se[j])})${stars(r.p[j])}`; }).join('  ');
      const report = [
        `Datos de panel · N = ${res.N} individuos, T = ${fmt(res.T, 1)}, n = ${res.nobs}${res.balanced ? ' (balanceado)' : ' (no balanceado)'}`, line(),
        tab('MCO agrupado', res.pooled), tab('Efectos fijos', res.fe), tab('Efectos aleat.', res.re), line(),
        `EF: R² within = ${fmt(res.fe.r2Within)}, σ_u = ${fmt(res.fe.sigmaU)}, σ_e = ${fmt(res.fe.sigmaE)}, ρ = ${fmt(res.fe.rho)}`,
        `EA: θ = ${fmt(res.re.theta)}, σ_u = ${fmt(res.re.sigmaU)}, σ_e = ${fmt(res.re.sigmaE)}`,
        `F de efectos individuales: F(${res.fTestFE.df1}, ${res.fTestFE.df2}) = ${fmt(res.fTestFE.F, 3)}, p = ${fmtP(res.fTestFE.p)} → ${res.fTestFE.conclusion}`,
        `LM de Breusch-Pagan: χ²(1) = ${fmt(res.bpLM.stat, 3)}, p = ${fmtP(res.bpLM.p)} → ${res.bpLM.conclusion}`,
        `Hausman: χ²(${res.hausman.df}) = ${fmt(res.hausman.stat, 3)}, p = ${fmtP(res.hausman.p)} → ${res.hausman.conclusion}`,
      ].join('\n');
      return { kind: 'panel', spec, title: `Panel: ${spec.y}`, report, res };
    }
    case 'unitroot': {
      const s = cleanSeries(ds, spec.variable);
      const reg = spec.regression ?? 'c';
      const levels = adf(s.values, { regression: reg, maxlag: spec.maxlag });
      const dv = s.values.slice(1).map((v, i) => v - s.values[i]);
      const diffR = adf(dv, { regression: reg === 'ct' ? 'c' : reg, maxlag: spec.maxlag });
      const kl = kpss(s.values, { regression: reg === 'ct' ? 'ct' : 'c' });
      const kd = kpss(dv, { regression: 'c' });
      const regTxt = reg === 'n' ? 'sin constante' : reg === 'c' ? 'con constante' : 'con constante y tendencia';
      const order = levels.rejects ? 'I(0)' : diffR.rejects ? 'I(1)' : 'I(2) o superior';
      const report = [
        `Raíz unitaria: ${spec.variable} (${regTxt}) · rezagos elegidos por AIC`, line(),
        `ADF niveles:      τ = ${fmt(levels.stat, 3)}  p = ${fmtP(levels.p)}  rezagos = ${levels.usedLag}  n = ${levels.nobs}  críticos 1%/5%/10% = ${fmt(levels.crit['1%'], 3)} / ${fmt(levels.crit['5%'], 3)} / ${fmt(levels.crit['10%'], 3)}`,
        `ADF diferencias:  τ = ${fmt(diffR.stat, 3)}  p = ${fmtP(diffR.p)}  rezagos = ${diffR.usedLag}  n = ${diffR.nobs}`,
        `KPSS niveles:     η = ${fmt(kl.stat, 4)}  crítico 5% = ${kl.crit['5%']}  → ${kl.rejects ? 'rechaza estacionariedad' : 'no rechaza estacionariedad'}`,
        `KPSS diferencias: η = ${fmt(kd.stat, 4)}  → ${kd.rejects ? 'rechaza estacionariedad' : 'no rechaza estacionariedad'}`,
        line(), `Conclusión: ${spec.variable} es ${order}. ${levels.conclusion}`,
      ].join('\n');
      return { kind: 'unitroot', spec, title: `Raíz unitaria: ${spec.variable}`, report, levels, diff: diffR, kpssLevels: kl, kpssDiff: kd, series: s.values, index: s.index };
    }
    case 'correlogram': {
      const s = cleanSeries(ds, spec.variable);
      const lags = Math.min(spec.lags ?? 20, Math.floor(s.values.length / 3));
      const a = acf(s.values, lags);
      const p = pacf(s.values, lags);
      const lb = ljungBox(s.values, Math.min(lags, 12));
      const band = 1.96 / Math.sqrt(s.values.length);
      const report = [`Correlograma de ${spec.variable} (n = ${s.values.length}, banda ±${fmt(band, 3)})`, line(),
        `${'Rezago'.padEnd(8)} ${'FAC'.padStart(8)} ${'FACP'.padStart(8)}`,
        ...a.slice(1).map((v, i) => `${String(i + 1).padEnd(8)} ${fmt(v, 3).padStart(8)}${Math.abs(v) > band ? '*' : ' '} ${fmt(p[i + 1], 3).padStart(8)}${Math.abs(p[i + 1]) > band ? '*' : ' '}`),
        line(), `Ljung-Box Q(${lb.df}) = ${fmt(lb.Q, 3)}, p = ${fmtP(lb.p)} → ${lb.p < 0.05 ? 'hay autocorrelación significativa' : 'compatible con ruido blanco'}`].join('\n');
      return { kind: 'correlogram', spec, title: `Correlograma: ${spec.variable}`, report, acf: a, pacf: p, band, lb, series: s.values, index: s.index };
    }
    case 'arima': {
      const s = cleanSeries(ds, spec.variable);
      const res = arima(s.values, [spec.p, spec.d, spec.q], spec.constant ?? true);
      const h = spec.horizon ?? 8;
      const fc = res.forecast(h);
      const report = [
        `ARIMA(${spec.p},${spec.d},${spec.q}) de ${spec.variable} · Suma de cuadrados condicional · n efectivo = ${res.n}`, line(),
        ...res.params.map((q) => `${q.name.padEnd(14)} ${fmt(q.coef).padStart(11)} ${fmt(q.se).padStart(11)} z = ${fmt(q.z, 3).padStart(8)}  p = ${fmtP(q.p)} ${stars(q.p)}`),
        line(), `σ̂² = ${fmt(res.sigma2)}   AIC = ${fmt(res.aic, 3)}   BIC = ${fmt(res.bic, 3)}`,
        `Estacionario: ${res.stationary ? 'sí' : 'NO'} · Invertible: ${res.invertible ? 'sí' : 'NO'}`,
        `Ljung-Box residuos Q(${res.ljungBox.df}) = ${fmt(res.ljungBox.Q, 3)}, p = ${fmtP(res.ljungBox.p)} → ${res.ljungBox.p < 0.05 ? 'los residuos NO son ruido blanco: reespecifique' : 'residuos compatibles con ruido blanco'}`,
        `Pronóstico ${h} períodos: ${fc.mean.map((v) => fmt(v, 3)).join(', ')}`,
      ].join('\n');
      return { kind: 'arima', spec, title: `ARIMA(${spec.p},${spec.d},${spec.q}): ${spec.variable}`, report, res, series: s.values, index: s.index, fc };
    }
    case 'var': {
      if (spec.variables.length < 2) throw new Error('Un VAR necesita al menos dos variables.');
      const cols = spec.variables.map((v) => resolveTerm(v, ds));
      const rows = cols[0].map((_, i) => i).filter((i) => cols.every((c) => Number.isFinite(c[i])));
      const data = rows.map((i) => cols.map((c) => c[i]));
      const maxlags = Math.min(spec.maxlags ?? 8, Math.floor(data.length / (3 * spec.variables.length)));
      const selection = selectVARLag(data, spec.variables, Math.max(1, maxlags));
      const p = spec.p ?? selection.best.aic;
      const res = fitVAR(data, spec.variables, p);
      const H = spec.horizon ?? 12;
      const ir = irf(res, H);
      const fe = fevd(res, H);
      const granger: ReturnType<typeof grangerTest>[] = [];
      spec.variables.forEach((_, a) => spec.variables.forEach((_, b) => { if (a !== b) granger.push(grangerTest(data, spec.variables, p, a, b)); }));
      const forecast = varForecast(res, data, 12);
      const report = [
        `VAR(${p}) · variables: ${spec.variables.join(', ')} · n = ${res.nobs} · orden de Cholesky: ${spec.variables.join(' → ')}`, line(),
        'Selección de rezagos: ' + selection.rows.map((r) => `p=${r.p}: AIC ${fmt(r.aic, 3)} BIC ${fmt(r.bic, 3)} HQ ${fmt(r.hqic, 3)}`).join(' | '),
        `Óptimo → AIC: ${selection.best.aic}, BIC: ${selection.best.bic}, HQ: ${selection.best.hqic}`,
        `Estabilidad: máximo módulo de raíces = ${fmt(res.stableRadius, 4)} → ${res.stableRadius < 1 ? 'VAR estable' : 'VAR NO estable'}`,
        '', 'Coeficientes por ecuación (sólo significativos al 10%):',
        ...res.equations.map((eq) => `· ${eq.yName}: ` + eq.table.filter((c) => c.p < 0.1).map((c) => `${c.name} ${fmt(c.coef, 3)}${stars(c.p)}`).join(', ') + ` | R² = ${fmt(eq.r2, 3)}`),
        '', 'Causalidad de Granger:', ...granger.map((g) => `· ${g.cause} → ${g.effect}: F(${g.df1}, ${g.df2}) = ${fmt(g.F, 3)}, p = ${fmtP(g.p)}${g.rejects ? '  ✔' : ''}`),
        '', `Impulso-respuesta ortogonalizada (horizonte 0, 1, 4, ${H}):`,
        ...spec.variables.flatMap((imp, b) => spec.variables.map((resp, a) => `· shock ${imp} → ${resp}: ${[0, 1, 4, H].map((h) => fmt(ir[h][a][b], 3)).join(', ')}`)),
        '', `Descomposición de varianza a ${H} períodos:`,
        ...spec.variables.map((v, a) => `· ${v}: ` + spec.variables.map((s, b) => `${s} ${(fe[H - 1][a][b] * 100).toFixed(1)}%`).join(', ')),
      ].join('\n');
      return { kind: 'var', spec: { ...spec, p }, title: `VAR(${p}): ${spec.variables.join(', ')}`, report, res, selection, granger, irf: ir, fevd: fe, forecast, data };
    }
    case 'coint': {
      if (!spec.x.length) throw new Error('Elija al menos una variable para la relación de largo plazo.');
      const ys = resolveTerm(spec.y, ds);
      const xs = spec.x.map((x) => resolveTerm(x, ds));
      const rows = ys.map((_, i) => i).filter((i) => Number.isFinite(ys[i]) && xs.every((x) => Number.isFinite(x[i])));
      const y = rows.map((i) => ys[i]);
      const X = xs.map((x) => rows.map((i) => x[i]));
      const eg = engleGranger(y, X, spec.y, spec.x);
      const model = ecm(y, X, spec.y, spec.x, spec.ecmLags ?? 0);
      const orders = [spec.y, ...spec.x].map((nm, k) => {
        const s = k === 0 ? y : X[k - 1];
        return { name: nm, levels: adf(s, { regression: 'c' }), diff: adf(s.slice(1).map((v, i) => v - s[i]), { regression: 'c' }) };
      });
      const report = [
        `Cointegración de Engle-Granger: ${spec.y} ~ ${spec.x.join(' + ')} · n = ${y.length}`, line(),
        'Orden de integración (ADF con constante): ' + orders.map((o) => `${o.name}: niveles p = ${fmtP(o.levels.p)}, dif. p = ${fmtP(o.diff.p)}`).join(' | '),
        '', 'Relación de largo plazo (MCO estático):', olsReport(eg.longRun),
        '', `ADF sobre residuos: τ = ${fmt(eg.stat, 3)}, p (MacKinnon, N=${spec.x.length + 1}) = ${fmtP(eg.p)}, críticos 1%/5%/10% = ${fmt(eg.crit['1%'], 3)} / ${fmt(eg.crit['5%'], 3)} / ${fmt(eg.crit['10%'], 3)}`,
        `→ ${eg.conclusion}`,
        '', 'Modelo de corrección de errores (2ª etapa):', olsReport(model.shortRun),
        `Velocidad de ajuste γ = ${fmt(model.gamma)}${Number.isFinite(model.halfLife) ? ` → vida media del desequilibrio ≈ ${fmt(model.halfLife, 2)} períodos` : ''}`,
      ].join('\n');
      return { kind: 'coint', spec, title: `Cointegración: ${spec.y}`, report, eg, model, orders };
    }
  }
}
