import type { Matrix } from './linalg';
import { chi2PValue, fPValue } from './distributions';
import { auxR2, isConstantColumn, ols, type OLSResult } from './ols';

export interface TestResult {
  id: string;
  name: string;
  /** Hipótesis nula en palabras. */
  h0: string;
  stat: number;
  statLabel: string;
  df?: number | [number, number];
  p: number;
  /** Conclusión al 5% redactada para estudiantes. */
  conclusion: string;
  rejects: boolean;
}

const verdict = (p: number, alpha = 0.05) => p < alpha;

function nonConstCols(X: Matrix): number[] {
  return X[0].map((_, j) => j).filter((j) => !isConstantColumn(X, j));
}

/** Breusch-Pagan (versión de Koenker, LM = nR² de e² sobre X). */
export function breuschPagan(res: OLSResult, X: Matrix): TestResult {
  const e2 = res.resid.map((e) => e * e);
  const { r2 } = auxR2(e2, X);
  const df = nonConstCols(X).length;
  const lm = res.n * r2;
  const p = chi2PValue(lm, df);
  const rej = verdict(p);
  return {
    id: 'bp', name: 'Breusch-Pagan (Koenker)', h0: 'Homoscedasticidad: Var(u|X) = σ²',
    stat: lm, statLabel: 'LM', df, p, rejects: rej,
    conclusion: rej
      ? 'Se rechaza H0 al 5%: hay evidencia de heteroscedasticidad. Use errores estándar robustos (HC1) o MCG factibles.'
      : 'No se rechaza H0 al 5%: no hay evidencia de heteroscedasticidad asociada a los regresores.',
  };
}

/** Prueba general de White: e² sobre X, cuadrados y productos cruzados. */
export function whiteTest(res: OLSResult, X: Matrix): TestResult {
  const cols = nonConstCols(X);
  const Z: Matrix = X.map((row) => {
    const z = [1];
    for (const j of cols) z.push(row[j]);
    for (let a = 0; a < cols.length; a++)
      for (let b = a; b < cols.length; b++) z.push(row[cols[a]] * row[cols[b]]);
    return z;
  });
  // eliminar columnas duplicadas (p.ej. dummy² = dummy)
  const keep: number[] = [];
  const nZ = Z[0].length;
  for (let j = 0; j < nZ; j++) {
    const dup = keep.some((q) => Z.every((r) => Math.abs(r[q] - r[j]) < 1e-12));
    if (!dup) keep.push(j);
  }
  const Zk = Z.map((r) => keep.map((j) => r[j]));
  const e2 = res.resid.map((e) => e * e);
  const { r2 } = auxR2(e2, Zk);
  const df = keep.length - 1;
  const lm = res.n * r2;
  const p = chi2PValue(lm, df);
  const rej = verdict(p);
  return {
    id: 'white', name: 'White (general)', h0: 'Homoscedasticidad (sin forma funcional específica)',
    stat: lm, statLabel: 'LM', df, p, rejects: rej,
    conclusion: rej
      ? 'Se rechaza H0 al 5%: heteroscedasticidad (o mala especificación). Reporte errores robustos.'
      : 'No se rechaza H0 al 5%: los residuos son compatibles con varianza constante.',
  };
}

/** Breusch-Godfrey LM de autocorrelación de orden p. */
export function breuschGodfrey(res: OLSResult, X: Matrix, lags = 2): TestResult {
  const e = res.resid;
  const Z: Matrix = X.map((row, t) => {
    const z = row.slice();
    for (let l = 1; l <= lags; l++) z.push(t - l >= 0 ? e[t - l] : 0);
    return z;
  });
  const { r2 } = auxR2(e, Z);
  const lm = res.n * r2;
  const p = chi2PValue(lm, lags);
  const rej = verdict(p);
  return {
    id: 'bg', name: `Breusch-Godfrey (${lags} rezagos)`, h0: `No hay autocorrelación hasta el orden ${lags}`,
    stat: lm, statLabel: 'LM', df: lags, p, rejects: rej,
    conclusion: rej
      ? 'Se rechaza H0 al 5%: los errores están autocorrelacionados. Los errores estándar MCO no son válidos; use Newey-West (HAC) o reespecifique la dinámica.'
      : 'No se rechaza H0 al 5%: no hay evidencia de autocorrelación serial.',
  };
}

export function moments(x: number[]) {
  const n = x.length;
  const m = x.reduce((a, b) => a + b, 0) / n;
  let m2 = 0, m3 = 0, m4 = 0;
  for (const v of x) {
    const d = v - m;
    m2 += d * d;
    m3 += d * d * d;
    m4 += d * d * d * d;
  }
  m2 /= n; m3 /= n; m4 /= n;
  return { mean: m, variance: m2, skew: m3 / Math.pow(m2, 1.5), kurtosis: m4 / (m2 * m2) };
}

export function jarqueBera(resid: number[]): TestResult & { skew: number; kurtosis: number } {
  const n = resid.length;
  const { skew, kurtosis } = moments(resid);
  const jb = (n / 6) * (skew * skew + ((kurtosis - 3) ** 2) / 4);
  const p = chi2PValue(jb, 2);
  const rej = verdict(p);
  return {
    id: 'jb', name: 'Jarque-Bera', h0: 'Los errores siguen una distribución normal',
    stat: jb, statLabel: 'JB', df: 2, p, rejects: rej, skew, kurtosis,
    conclusion: rej
      ? `Se rechaza normalidad al 5% (asimetría ${skew.toFixed(2)}, curtosis ${kurtosis.toFixed(2)}). En muestras grandes la inferencia sigue siendo válida asintóticamente.`
      : 'No se rechaza la normalidad de los residuos al 5%.',
  };
}

/** RESET de Ramsey con ŷ² y ŷ³ (versión F). */
export function ramseyReset(res: OLSResult, y: number[], X: Matrix, power = 3): TestResult {
  const Z = X.map((row, i) => {
    const z = row.slice();
    for (let p = 2; p <= power; p++) z.push(res.fitted[i] ** p);
    return z;
  });
  const u = ols(y, Z, Z[0].map((_, j) => `z${j}`));
  const q = power - 1;
  const F = ((res.ssr - u.ssr) / q) / (u.ssr / u.dfResid);
  const p = fPValue(F, q, u.dfResid);
  const rej = verdict(p);
  return {
    id: 'reset', name: 'RESET de Ramsey', h0: 'La forma funcional está correctamente especificada',
    stat: F, statLabel: 'F', df: [q, u.dfResid], p, rejects: rej,
    conclusion: rej
      ? 'Se rechaza H0 al 5%: posible error de forma funcional u omisión de variables (pruebe logaritmos, cuadrados o interacciones).'
      : 'No se rechaza H0 al 5%: no hay evidencia de mala especificación funcional.',
  };
}

export interface VIFRow { name: string; vif: number; }

export function vif(X: Matrix, names: string[]): VIFRow[] {
  const cols = nonConstCols(X);
  if (cols.length < 2) return cols.map((j) => ({ name: names[j], vif: 1 }));
  return cols.map((j) => {
    const others = cols.filter((c) => c !== j);
    const Z = X.map((row) => [1, ...others.map((c) => row[c])]);
    const y = X.map((row) => row[j]);
    const { r2 } = auxR2(y, Z);
    return { name: names[j], vif: 1 / (1 - r2) };
  });
}

/** Batería completa de diagnóstico para una regresión MCO. */
export function diagnostics(res: OLSResult, y: number[], X: Matrix, opts: { bgLags?: number; timeSeries?: boolean } = {}) {
  const tests: TestResult[] = [];
  const safe = (f: () => TestResult) => {
    try {
      tests.push(f());
    } catch {
      /* prueba no aplicable (p.ej. regresión auxiliar singular) */
    }
  };
  safe(() => breuschPagan(res, X));
  safe(() => whiteTest(res, X));
  safe(() => breuschGodfrey(res, X, opts.bgLags ?? (opts.timeSeries ? 4 : 2)));
  safe(() => jarqueBera(res.resid));
  safe(() => ramseyReset(res, y, X));
  return tests;
}
