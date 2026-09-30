import { inverse, matVec, type Matrix } from './linalg';
import { chi2PValue, fPValue, tInv, tPValue } from './distributions';
import { ols, type CovType, type OLSResult } from './ols';

export interface PanelSpec {
  y: number[];
  yName: string;
  /** Regresores SIN constante. */
  X: Matrix;
  names: string[];
  entity: (string | number)[];
  time: (string | number)[];
  covType?: CovType;
}

export interface PanelResults {
  pooled: OLSResult;
  fe: OLSResult & { r2Within: number; sigmaU: number; sigmaE: number; rho: number };
  re: OLSResult & { theta: number; sigmaU: number; sigmaE: number };
  between: OLSResult;
  fTestFE: { F: number; df1: number; df2: number; p: number; conclusion: string };
  bpLM: { stat: number; p: number; conclusion: string };
  hausman: { stat: number; df: number; p: number; conclusion: string; rejects: boolean };
  N: number;
  T: number;
  nobs: number;
  balanced: boolean;
}

function groupIndex(entity: (string | number)[]) {
  const map = new Map<string, number[]>();
  entity.forEach((e, i) => {
    const key = String(e);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(i);
  });
  return map;
}

function relabel(res: OLSResult, dfResid: number, yName: string): OLSResult {
  // Recalcula inferencia con otros grados de libertad residuales (p.ej. efectos fijos)
  const s2 = res.ssr / dfResid;
  const factor = s2 / (res.ssr / res.dfResid);
  const cov = res.covType === 'classic' ? res.cov.map((r) => r.map((v) => v * factor)) : res.cov.map((r) => r.map((v) => (v * res.dfResid) / dfResid));
  const se = cov.map((r, i) => Math.sqrt(r[i]));
  const t = res.beta.map((b, i) => b / se[i]);
  const p = t.map((v) => tPValue(v, dfResid));
  const tc = tInv(0.975, dfResid);
  const ciLow = res.beta.map((b, i) => b - tc * se[i]);
  const ciHigh = res.beta.map((b, i) => b + tc * se[i]);
  return {
    ...res, yName, cov, se, t, p, ciLow, ciHigh, dfResid, sigma: Math.sqrt(s2),
    table: res.names.map((name, i) => ({ name, coef: res.beta[i], se: se[i], t: t[i], p: p[i], ciLow: ciLow[i], ciHigh: ciHigh[i] })),
  };
}

export function panelModels(spec: PanelSpec): PanelResults {
  const { y, X, names, entity, yName } = spec;
  const covType = spec.covType ?? 'classic';
  const n = y.length;
  const k = names.length;
  const groups = groupIndex(entity);
  const N = groups.size;
  const sizes = [...groups.values()].map((g) => g.length);
  const balanced = sizes.every((s) => s === sizes[0]);
  const Tbar = N / sizes.reduce((s, t) => s + 1 / t, 0); // media armónica

  // --- MCO agrupado
  const Xc = X.map((r) => [1, ...r]);
  const pooled = ols(y, Xc, ['const', ...names], yName, { covType });

  // --- Medias por individuo
  const ym = new Array<number>(n);
  const Xm: number[][] = new Array(n);
  const between = { y: [] as number[], X: [] as number[][], T: [] as number[] };
  for (const idx of groups.values()) {
    const my = idx.reduce((s, i) => s + y[i], 0) / idx.length;
    const mx = names.map((_, j) => idx.reduce((s, i) => s + X[i][j], 0) / idx.length);
    for (const i of idx) {
      ym[i] = my;
      Xm[i] = mx;
    }
    between.y.push(my);
    between.X.push([1, ...mx]);
    between.T.push(idx.length);
  }
  const gy = y.reduce((a, b) => a + b, 0) / n;
  const gx = names.map((_, j) => X.reduce((s, r) => s + r[j], 0) / n);

  // --- Efectos fijos (within). Se añade la gran media para reportar una constante, como Stata.
  const yw = y.map((v, i) => v - ym[i] + gy);
  const Xw = X.map((r, i) => [1, ...r.map((v, j) => v - Xm[i][j] + gx[j])]);
  const feRaw = ols(yw, Xw, ['const', ...names], yName, { covType });
  const dfFE = n - N - k;
  const fe0 = relabel(feRaw, dfFE, yName);
  const ywd = y.map((v, i) => v - ym[i]);
  const sstW = ywd.reduce((s, v) => s + v * v, 0);
  const r2Within = 1 - feRaw.ssr / sstW;
  const sigmaE = Math.sqrt(feRaw.ssr / dfFE);
  const ui = [...groups.values()].map((idx) => {
    const i0 = idx[0];
    return ym[i0] - fe0.beta[0] - names.reduce((s, _, j) => s + fe0.beta[j + 1] * Xm[i0][j], 0) + 0;
  });
  const umean = ui.reduce((a, b) => a + b, 0) / N;
  const sigmaUfe = Math.sqrt(ui.reduce((s, v) => s + (v - umean) ** 2, 0) / (N - 1));
  const fe = { ...fe0, r2Within, sigmaU: sigmaUfe, sigmaE, rho: sigmaUfe ** 2 / (sigmaUfe ** 2 + sigmaE ** 2) };

  // F de significancia conjunta de los efectos individuales (agrupado vs EF)
  const pooledCls = ols(y, Xc, ['const', ...names]);
  const Ffe = ((pooledCls.ssr - feRaw.ssr) / (N - 1)) / (feRaw.ssr / dfFE);
  const pFfe = fPValue(Ffe, N - 1, dfFE);

  // --- Between y efectos aleatorios (Swamy-Arora)
  const btw = ols(between.y, between.X, ['const', ...names], yName);
  const sigma2E = feRaw.ssr / dfFE;
  const sigma2B = btw.ssr / (N - k - 1);
  const sigma2U = Math.max(sigma2B - sigma2E / Tbar, 0);
  const thetaI = new Array<number>(n);
  for (const idx of groups.values()) {
    const Ti = idx.length;
    const th = 1 - Math.sqrt(sigma2E / (Ti * sigma2U + sigma2E));
    for (const i of idx) thetaI[i] = th;
  }
  const yr = y.map((v, i) => v - thetaI[i] * ym[i]);
  const Xr = X.map((r, i) => [1 - thetaI[i], ...r.map((v, j) => v - thetaI[i] * Xm[i][j])]);
  const reRaw = ols(yr, Xr, ['const', ...names], yName, { covType });
  // R² global del modelo EA (correlación al cuadrado entre y y Xβ̂)
  const re = { ...reRaw, theta: thetaI[0], sigmaU: Math.sqrt(sigma2U), sigmaE: Math.sqrt(sigma2E) };

  // --- LM de Breusch-Pagan para efectos aleatorios
  const e = pooledCls.resid;
  const sumE2 = e.reduce((s, v) => s + v * v, 0);
  let sumGroup = 0;
  for (const idx of groups.values()) sumGroup += idx.reduce((s, i) => s + e[i], 0) ** 2;
  const T = balanced ? sizes[0] : Tbar;
  const lm = ((n / (2 * (T - 1))) * (sumGroup / sumE2 - 1) ** 2);
  const lmP = chi2PValue(lm, 1);

  // --- Hausman EF vs EA (sólo pendientes)
  const bFE = fe.beta.slice(1);
  const bRE = re.beta.slice(1);
  const d = bFE.map((v, i) => v - bRE[i]);
  const Vd = fe.cov.slice(1).map((r, i) => r.slice(1).map((v, j) => v - re.cov[i + 1][j + 1]));
  let H = NaN;
  try {
    H = d.reduce((s, v, i) => s + v * matVec(inverse(Vd), d)[i], 0);
  } catch {
    /* diferencia de covarianzas singular */
  }
  const hP = chi2PValue(Math.abs(H), k);
  const hRej = hP < 0.05;

  return {
    pooled, fe, re, between: btw,
    fTestFE: {
      F: Ffe, df1: N - 1, df2: dfFE, p: pFfe,
      conclusion: pFfe < 0.05 ? 'Los efectos individuales son significativos: el MCO agrupado está sesgado; use EF o EA.' : 'No se rechaza que los efectos individuales sean nulos: el MCO agrupado es aceptable.',
    },
    bpLM: {
      stat: lm, p: lmP,
      conclusion: lmP < 0.05 ? 'Se rechaza Var(αᵢ)=0: hay heterogeneidad individual; EA es preferible a MCO agrupado.' : 'No se rechaza Var(αᵢ)=0: el MCO agrupado es adecuado.',
    },
    hausman: {
      stat: H, df: k, p: hP, rejects: hRej,
      conclusion: hRej
        ? 'Se rechaza H0 (p < 0.05): los efectos individuales están correlacionados con los regresores. EA es inconsistente → use Efectos Fijos.'
        : 'No se rechaza H0: EA es consistente y eficiente → prefiera Efectos Aleatorios.',
    },
    N, T: balanced ? sizes[0] : Tbar, nobs: n, balanced,
  };
}
