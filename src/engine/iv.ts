import { crossprod, crossprodVec, inverse, matMul, matVec, zeros, type Matrix } from './linalg';
import { chi2PValue, tInv, tPValue } from './distributions';
import { fTestSSR, ols, waldF, type CovType, type OLSResult } from './ols';

export interface IVSpec {
  y: number[];
  yName: string;
  /** Regresores exógenos (incluida la constante si se desea). */
  exog: Matrix;
  exogNames: string[];
  /** Regresores endógenos. */
  endog: Matrix;
  endogNames: string[];
  /** Instrumentos excluidos. */
  instruments: Matrix;
  instrumentNames: string[];
  covType?: Exclude<CovType, 'HAC'>;
}

export interface FirstStage {
  endog: string;
  F: number;
  p: number;
  partialR2: number;
  weak: boolean;
  reg: OLSResult;
}

export interface IVResult {
  main: OLSResult;
  firstStage: FirstStage[];
  hausman: { stat: number; df: number; p: number; F: number; conclusion: string; rejects: boolean };
  sargan: { stat: number; df: number; p: number; conclusion: string; rejects: boolean } | null;
  olsComparison: OLSResult;
}

export function iv2sls(spec: IVSpec): IVResult {
  const n = spec.y.length;
  const X: Matrix = spec.exog.map((r, i) => [...r, ...spec.endog[i]]);
  const names = [...spec.exogNames, ...spec.endogNames];
  const Z: Matrix = spec.exog.map((r, i) => [...r, ...spec.instruments[i]]);
  const k = X[0].length;
  const L = Z[0].length;
  if (L < k) throw new Error('Modelo no identificado: hay menos instrumentos excluidos que regresores endógenos (condición de orden).');

  const ZtZinv = inverse(crossprod(Z));
  const ZtX = crossprod(Z, X);
  // X̂ = Z (Z'Z)⁻¹ Z'X
  const coefFS = matMul(ZtZinv, ZtX);
  const Xhat = matMul(Z, coefFS);
  const XhXhInv = inverse(crossprod(Xhat));
  const beta = matVec(XhXhInv, crossprodVec(Xhat, spec.y));
  const fitted = X.map((r) => r.reduce((s, v, j) => s + v * beta[j], 0));
  const resid = spec.y.map((v, i) => v - fitted[i]);
  const ssr = resid.reduce((s, e) => s + e * e, 0);
  const dfResid = n - k;
  const s2 = ssr / dfResid;
  const covType = spec.covType ?? 'classic';
  let cov: Matrix;
  if (covType === 'classic') cov = XhXhInv.map((r) => r.map((v) => v * s2));
  else {
    const S = zeros(k, k);
    for (let i = 0; i < n; i++) for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) S[a][b] += resid[i] ** 2 * Xhat[i][a] * Xhat[i][b];
    cov = matMul(matMul(XhXhInv, S), XhXhInv).map((r) => r.map((v) => (v * n) / dfResid));
  }
  const se = cov.map((r, i) => Math.sqrt(r[i]));
  const t = beta.map((b, i) => b / se[i]);
  const p = t.map((v) => tPValue(v, dfResid));
  const tc = tInv(0.975, dfResid);
  const ybar = spec.y.reduce((a, b) => a + b, 0) / n;
  const sst = spec.y.reduce((s, v) => s + (v - ybar) ** 2, 0);
  const hasConst = spec.exog.length > 0 && spec.exog[0].length > 0 && spec.exog.every((r) => r[0] === 1);
  const dfModel = hasConst ? k - 1 : k;
  const idx = [...Array(k).keys()].filter((j) => !(hasConst && j === 0));
  const R = idx.map((j) => { const row = new Array(k).fill(0); row[j] = 1; return row; });
  const w = waldF(beta, cov, R, new Array(R.length).fill(0), dfResid);
  const r2 = 1 - ssr / sst;
  let num = 0;
  for (let i = 1; i < n; i++) num += (resid[i] - resid[i - 1]) ** 2;
  const main: OLSResult = {
    method: 'MC2E', yName: spec.yName, names, n, k, beta, se, t, p,
    ciLow: beta.map((b, i) => b - tc * se[i]), ciHigh: beta.map((b, i) => b + tc * se[i]),
    cov, covType, resid, fitted, ssr, sst, r2,
    adjR2: 1 - ((n - 1) / dfResid) * (1 - r2), F: w.F, Fp: w.p, dfModel, dfResid,
    sigma: Math.sqrt(s2), logLik: NaN, aic: NaN, bic: NaN, dw: num / ssr, hasConst,
    table: names.map((name, i) => ({ name, coef: beta[i], se: se[i], t: t[i], p: p[i], ciLow: beta[i] - tc * se[i], ciHigh: beta[i] + tc * se[i] })),
  };

  // Primera etapa: F de instrumentos excluidos para cada endógena
  const zNames = [...spec.exogNames, ...spec.instrumentNames];
  const firstStage: FirstStage[] = spec.endogNames.map((nm, j) => {
    const yj = spec.endog.map((r) => r[j]);
    const U = ols(yj, Z, zNames, nm);
    const Rr = ols(yj, spec.exog, spec.exogNames, nm);
    const q = spec.instrumentNames.length;
    const ft = fTestSSR(Rr.ssr, U.ssr, q, U.dfResid);
    return { endog: nm, F: ft.F, p: ft.p, partialR2: (Rr.ssr - U.ssr) / Rr.ssr, weak: ft.F < 10, reg: U };
  });

  // Durbin-Wu-Hausman (función de control): añadir residuos de primera etapa a la ecuación estructural
  const V = firstStage.map((fs) => fs.reg.resid);
  const Xaug = X.map((r, i) => [...r, ...V.map((v) => v[i])]);
  const aug = ols(spec.y, Xaug, [...names, ...spec.endogNames.map((e) => `v̂_${e}`)]);
  const base = ols(spec.y, X, names, spec.yName);
  const qh = spec.endogNames.length;
  const fh = fTestSSR(base.ssr, aug.ssr, qh, aug.dfResid);
  const hausmanRejects = fh.p < 0.05;
  const hausman = {
    stat: fh.F * qh, df: qh, p: fh.p, F: fh.F, rejects: hausmanRejects,
    conclusion: hausmanRejects
      ? 'Se rechaza la exogeneidad (p < 0.05): MCO es inconsistente; prefiera MC2E.'
      : 'No se rechaza la exogeneidad: MCO y MC2E no difieren significativamente; MCO es más eficiente.',
  };

  // Sargan de sobreidentificación
  let sargan: IVResult['sargan'] = null;
  const overid = L - k;
  if (overid > 0) {
    const aux = ols(resid, Z, zNames);
    const stat = n * aux.r2;
    const pv = chi2PValue(stat, overid);
    sargan = {
      stat, df: overid, p: pv, rejects: pv < 0.05,
      conclusion: pv < 0.05
        ? 'Se rechaza H0: al menos un instrumento parece correlacionado con el error (instrumentos inválidos).'
        : 'No se rechaza H0: las restricciones de sobreidentificación son válidas.',
    };
  }
  return { main, firstStage, hausman, sargan, olsComparison: base };
}
