import { inverse, zeros, type Matrix } from './linalg';
import { chi2PValue, normCdf, normPdf, tPValue } from './distributions';
import { isConstantColumn } from './ols';

export type BinaryLink = 'logit' | 'probit';

export interface BinaryResult {
  link: BinaryLink;
  yName: string;
  names: string[];
  n: number;
  k: number;
  beta: number[];
  se: number[];
  z: number[];
  p: number[];
  cov: Matrix;
  logLik: number;
  logLikNull: number;
  pseudoR2: number;
  lr: number;
  lrP: number;
  aic: number;
  bic: number;
  iterations: number;
  converged: boolean;
  /** Efectos marginales promedio (AME). */
  ame: { name: string; effect: number; se: number; z: number; p: number }[];
  /** Efectos marginales en la media (MEM). */
  mem: { name: string; effect: number }[];
  oddsRatios: number[] | null;
  prob: number[];
  classification: { tp: number; tn: number; fp: number; fn: number; accuracy: number; sensitivity: number; specificity: number };
}

const logistic = (x: number) => (x >= 0 ? 1 / (1 + Math.exp(-x)) : Math.exp(x) / (1 + Math.exp(x)));

function cdf(link: BinaryLink, x: number) {
  return link === 'logit' ? logistic(x) : normCdf(x);
}
function pdf(link: BinaryLink, x: number) {
  if (link === 'logit') {
    const p = logistic(x);
    return p * (1 - p);
  }
  return normPdf(x);
}
/** Derivada de la densidad (para el método delta de los AME). */
function dpdf(link: BinaryLink, x: number) {
  if (link === 'logit') {
    const p = logistic(x);
    return p * (1 - p) * (1 - 2 * p);
  }
  return -x * normPdf(x);
}

function loglik(link: BinaryLink, y: number[], X: Matrix, b: number[]) {
  let ll = 0;
  for (let i = 0; i < y.length; i++) {
    const xb = X[i].reduce((s, v, j) => s + v * b[j], 0);
    const p = Math.min(Math.max(cdf(link, xb), 1e-15), 1 - 1e-15);
    ll += y[i] ? Math.log(p) : Math.log(1 - p);
  }
  return ll;
}

export function binaryModel(y: number[], X: Matrix, names: string[], link: BinaryLink, yName = 'y'): BinaryResult {
  const n = y.length;
  const k = X[0].length;
  if (y.some((v) => v !== 0 && v !== 1)) throw new Error('La variable dependiente debe ser binaria (0/1).');
  const ybar = y.reduce((a, b) => a + b, 0) / n;
  if (ybar === 0 || ybar === 1) throw new Error('La variable dependiente no varía.');
  let b = new Array<number>(k).fill(0);
  let ll = loglik(link, y, X, b);
  let it = 0;
  let converged = false;
  let H: Matrix = zeros(k, k);
  for (it = 1; it <= 100; it++) {
    const g = new Array<number>(k).fill(0);
    H = zeros(k, k);
    for (let i = 0; i < n; i++) {
      const xi = X[i];
      const xb = xi.reduce((s, v, j) => s + v * b[j], 0);
      const F = Math.min(Math.max(cdf(link, xb), 1e-15), 1 - 1e-15);
      const f = pdf(link, xb);
      // Puntaje y matriz de información esperada (Fisher scoring; coincide con Newton en logit)
      const w = (f * f) / (F * (1 - F));
      const s = ((y[i] - F) * f) / (F * (1 - F));
      for (let a = 0; a < k; a++) {
        g[a] += s * xi[a];
        for (let c = 0; c < k; c++) H[a][c] += w * xi[a] * xi[c];
      }
    }
    const Hinv = inverse(H);
    const step = Hinv.map((r) => r.reduce((s, v, j) => s + v * g[j], 0));
    let t = 1;
    let nb = b.map((v, j) => v + t * step[j]);
    let nll = loglik(link, y, X, nb);
    while (nll < ll - 1e-12 && t > 1e-6) {
      t /= 2;
      nb = b.map((v, j) => v + t * step[j]);
      nll = loglik(link, y, X, nb);
    }
    const change = Math.abs(nll - ll);
    b = nb;
    ll = nll;
    if (change < 1e-11 && Math.max(...step.map(Math.abs)) < 1e-7) {
      converged = true;
      break;
    }
  }
  // Covarianza: inversa de la Hessiana observada
  const Hobs = zeros(k, k);
  for (let i = 0; i < n; i++) {
    const xi = X[i];
    const xb = xi.reduce((s, v, j) => s + v * b[j], 0);
    let w: number;
    if (link === 'logit') {
      const p = logistic(xb);
      w = p * (1 - p);
    } else {
      const F = Math.min(Math.max(normCdf(xb), 1e-15), 1 - 1e-15);
      const f = normPdf(xb);
      const lam1 = f / F;
      const lam0 = -f / (1 - F);
      w = y[i] ? lam1 * (lam1 + xb) : lam0 * (lam0 + xb);
    }
    for (let a = 0; a < k; a++) for (let c = 0; c < k; c++) Hobs[a][c] += w * xi[a] * xi[c];
  }
  const cov = inverse(Hobs);
  const se = cov.map((r, i) => Math.sqrt(r[i]));
  const z = b.map((v, i) => v / se[i]);
  const p = z.map((v) => tPValue(v, Infinity));
  const llNull = n * (ybar * Math.log(ybar) + (1 - ybar) * Math.log(1 - ybar));
  const hasConst = X[0].some((_, j) => isConstantColumn(X, j));
  const dfLR = hasConst ? k - 1 : k;
  const lr = 2 * (ll - llNull);
  const xb = X.map((r) => r.reduce((s, v, j) => s + v * b[j], 0));
  const prob = xb.map((v) => cdf(link, v));

  // AME con errores estándar por método delta
  const constIdx = X[0].map((_, j) => j).filter((j) => isConstantColumn(X, j));
  const slopeIdx = X[0].map((_, j) => j).filter((j) => !constIdx.includes(j));
  const ame = slopeIdx.map((j) => {
    let eff = 0;
    const grad = new Array<number>(k).fill(0);
    for (let i = 0; i < n; i++) {
      const f = pdf(link, xb[i]);
      const df = dpdf(link, xb[i]);
      eff += f * b[j];
      for (let m = 0; m < k; m++) grad[m] += df * b[j] * X[i][m] + (m === j ? f : 0);
    }
    eff /= n;
    for (let m = 0; m < k; m++) grad[m] /= n;
    let v = 0;
    for (let a = 0; a < k; a++) for (let c = 0; c < k; c++) v += grad[a] * cov[a][c] * grad[c];
    const s = Math.sqrt(v);
    return { name: names[j], effect: eff, se: s, z: eff / s, p: tPValue(eff / s, Infinity) };
  });
  const xmean = X[0].map((_, j) => X.reduce((s, r) => s + r[j], 0) / n);
  const xbMean = xmean.reduce((s, v, j) => s + v * b[j], 0);
  const mem = slopeIdx.map((j) => ({ name: names[j], effect: pdf(link, xbMean) * b[j] }));

  let tp = 0, tn = 0, fp = 0, fn = 0;
  prob.forEach((pr, i) => {
    const pred = pr >= 0.5 ? 1 : 0;
    if (pred === 1 && y[i] === 1) tp++;
    else if (pred === 0 && y[i] === 0) tn++;
    else if (pred === 1) fp++;
    else fn++;
  });
  return {
    link, yName, names, n, k, beta: b, se, z, p, cov, logLik: ll, logLikNull: llNull,
    pseudoR2: 1 - ll / llNull, lr, lrP: chi2PValue(lr, dfLR), aic: -2 * ll + 2 * k, bic: -2 * ll + Math.log(n) * k,
    iterations: it, converged, ame, mem,
    oddsRatios: link === 'logit' ? b.map(Math.exp) : null,
    prob,
    classification: {
      tp, tn, fp, fn,
      accuracy: (tp + tn) / n,
      sensitivity: tp / Math.max(tp + fn, 1),
      specificity: tn / Math.max(tn + fp, 1),
    },
  };
}
