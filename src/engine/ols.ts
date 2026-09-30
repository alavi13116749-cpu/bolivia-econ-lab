import { crossprod, crossprodVec, inverse, matMul, matVec, transpose, zeros, type Matrix } from './linalg';
import { fPValue, tInv, tPValue } from './distributions';

export type CovType = 'classic' | 'HC1' | 'HAC';

export interface OLSOptions {
  covType?: CovType;
  /** Rezagos de Newey-West; por defecto floor(4(n/100)^{2/9}). */
  hacLags?: number;
  alpha?: number;
}

export interface CoefRow {
  name: string;
  coef: number;
  se: number;
  t: number;
  p: number;
  ciLow: number;
  ciHigh: number;
}

export interface OLSResult {
  method: 'MCO' | 'MC2E';
  yName: string;
  names: string[];
  n: number;
  k: number;
  beta: number[];
  se: number[];
  t: number[];
  p: number[];
  ciLow: number[];
  ciHigh: number[];
  cov: Matrix;
  covType: CovType;
  hacLags?: number;
  resid: number[];
  fitted: number[];
  ssr: number;
  sst: number;
  r2: number;
  adjR2: number;
  F: number;
  Fp: number;
  dfModel: number;
  dfResid: number;
  sigma: number;
  logLik: number;
  aic: number;
  bic: number;
  dw: number;
  hasConst: boolean;
  table: CoefRow[];
}

export function defaultHacLags(n: number): number {
  return Math.floor(4 * Math.pow(n / 100, 2 / 9));
}

export function isConstantColumn(X: Matrix, j: number): boolean {
  const v0 = X[0][j];
  if (v0 === 0) return false;
  for (let i = 1; i < X.length; i++) if (X[i][j] !== v0) return false;
  return true;
}

function sandwich(X: Matrix, XtXinv: Matrix, resid: number[], covType: CovType, hacLags: number): Matrix {
  const n = X.length;
  const k = X[0].length;
  const S = zeros(k, k);
  for (let i = 0; i < n; i++) {
    const e2 = resid[i] * resid[i];
    const xi = X[i];
    for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) S[a][b] += e2 * xi[a] * xi[b];
  }
  if (covType === 'HAC') {
    for (let l = 1; l <= hacLags; l++) {
      const w = 1 - l / (hacLags + 1);
      for (let i = l; i < n; i++) {
        const ee = resid[i] * resid[i - l];
        const xi = X[i];
        const xl = X[i - l];
        for (let a = 0; a < k; a++)
          for (let b = 0; b < k; b++) S[a][b] += w * ee * (xi[a] * xl[b] + xl[a] * xi[b]);
      }
    }
  }
  const V = matMul(matMul(XtXinv, S), XtXinv);
  const corr = n / (n - k); // corrección de grados de libertad n/(n-k): HC1 y HAC como Stata/EViews
  return V.map((r) => r.map((v) => v * corr));
}

/**
 * Estadístico de Wald en forma F para H0: Rβ = r, dados β y su covarianza.
 */
export function waldF(beta: number[], cov: Matrix, R: Matrix, r: number[], dfResid: number) {
  const Rb = matVec(R, beta).map((v, i) => v - r[i]);
  const RVRt = matMul(matMul(R, cov), transpose(R));
  const inv = inverse(RVRt);
  const q = R.length;
  const invRb = matVec(inv, Rb);
  const W = Rb.reduce((s, v, i) => s + v * invRb[i], 0);
  const F = W / q;
  return { F, df1: q, df2: dfResid, p: fPValue(F, q, dfResid), chi2: W };
}

/** Mínimos cuadrados ordinarios. X debe incluir la columna de 1 si se desea constante. */
export function ols(y: number[], X: Matrix, names: string[], yName = 'y', opts: OLSOptions = {}): OLSResult {
  const n = y.length;
  const k = X[0].length;
  if (n <= k) throw new Error(`Observaciones insuficientes: n=${n} ≤ k=${k}.`);
  const covType = opts.covType ?? 'classic';
  const alpha = opts.alpha ?? 0.05;
  const XtX = crossprod(X);
  const XtXinv = inverse(XtX);
  const beta = matVec(XtXinv, crossprodVec(X, y));
  const fitted = X.map((row) => row.reduce((s, v, j) => s + v * beta[j], 0));
  const resid = y.map((v, i) => v - fitted[i]);
  const ssr = resid.reduce((s, e) => s + e * e, 0);
  let hasConst = false;
  for (let j = 0; j < k; j++) if (isConstantColumn(X, j)) hasConst = true;
  const ybar = y.reduce((a, b) => a + b, 0) / n;
  const sst = hasConst ? y.reduce((s, v) => s + (v - ybar) ** 2, 0) : y.reduce((s, v) => s + v * v, 0);
  const dfResid = n - k;
  const dfModel = hasConst ? k - 1 : k;
  const s2 = ssr / dfResid;
  const hacLags = opts.hacLags ?? defaultHacLags(n);
  const cov = covType === 'classic' ? XtXinv.map((r) => r.map((v) => v * s2)) : sandwich(X, XtXinv, resid, covType, hacLags);
  const se = cov.map((r, i) => Math.sqrt(Math.max(r[i], 0)));
  const t = beta.map((b, i) => b / se[i]);
  const p = t.map((tv) => tPValue(tv, dfResid));
  const tc = tInv(1 - alpha / 2, dfResid);
  const ciLow = beta.map((b, i) => b - tc * se[i]);
  const ciHigh = beta.map((b, i) => b + tc * se[i]);
  const r2 = 1 - ssr / sst;
  const adjR2 = 1 - ((n - (hasConst ? 1 : 0)) / dfResid) * (1 - r2);

  // F global: todos los coeficientes (salvo la constante) = 0
  let F = NaN;
  let Fp = NaN;
  if (dfModel > 0) {
    if (covType === 'classic') {
      F = ((sst - ssr) / dfModel) / s2;
      Fp = fPValue(F, dfModel, dfResid);
    } else {
      const idx = [...Array(k).keys()].filter((j) => !isConstantColumn(X, j));
      const R = idx.map((j) => {
        const row = new Array<number>(k).fill(0);
        row[j] = 1;
        return row;
      });
      const w = waldF(beta, cov, R, new Array(R.length).fill(0), dfResid);
      F = w.F;
      Fp = w.p;
    }
  }
  const logLik = -(n / 2) * (Math.log(2 * Math.PI) + Math.log(ssr / n) + 1);
  const aic = -2 * logLik + 2 * k;
  const bic = -2 * logLik + Math.log(n) * k;
  let num = 0;
  for (let i = 1; i < n; i++) num += (resid[i] - resid[i - 1]) ** 2;
  const dw = num / ssr;
  const table = names.map((name, i) => ({ name, coef: beta[i], se: se[i], t: t[i], p: p[i], ciLow: ciLow[i], ciHigh: ciHigh[i] }));
  return {
    method: 'MCO', yName, names, n, k, beta, se, t, p, ciLow, ciHigh, cov, covType,
    hacLags: covType === 'HAC' ? hacLags : undefined,
    resid, fitted, ssr, sst, r2, adjR2, F, Fp, dfModel, dfResid, sigma: Math.sqrt(s2),
    logLik, aic, bic, dw, hasConst, table,
  };
}

/** Prueba F de restricciones de exclusión comparando SCR restringida y no restringida. */
export function fTestSSR(ssrR: number, ssrU: number, q: number, dfU: number) {
  const F = ((ssrR - ssrU) / q) / (ssrU / dfU);
  return { F, df1: q, df2: dfU, p: fPValue(F, q, dfU) };
}

/** Regresión auxiliar: devuelve sólo R² y SCR (para pruebas LM). */
export function auxR2(y: number[], X: Matrix): { r2: number; ssr: number } {
  const res = ols(y, X, X[0].map((_, j) => `x${j}`));
  return { r2: res.r2, ssr: res.ssr };
}
