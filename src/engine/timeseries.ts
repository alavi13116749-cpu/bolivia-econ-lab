import { cholesky, identity, inverse, logDetPD, matMul, spectralRadius, zeros, type Matrix } from './linalg';
import { chi2PValue, fPValue, mackinnonCrit, mackinnonP, tPValue, type DFRegression } from './distributions';
import { ols, type OLSResult } from './ols';

// ---------------------------------------------------------------- utilidades

export function diff(x: number[], d = 1): number[] {
  let out = x.slice();
  for (let k = 0; k < d; k++) out = out.slice(1).map((v, i) => v - out[i]);
  return out;
}

export function mean(x: number[]): number {
  return x.reduce((a, b) => a + b, 0) / x.length;
}

export function acf(x: number[], nlags: number): number[] {
  const n = x.length;
  const m = mean(x);
  const d = x.map((v) => v - m);
  const c0 = d.reduce((s, v) => s + v * v, 0);
  const out = [1];
  for (let k = 1; k <= nlags; k++) {
    let s = 0;
    for (let t = k; t < n; t++) s += d[t] * d[t - k];
    out.push(s / c0);
  }
  return out;
}

/** PACF por Durbin-Levinson sobre la ACF muestral. */
export function pacfFromAcf(r: number[]): number[] {
  const nlags = r.length - 1;
  const out = [1];
  let phiPrev: number[] = [];
  for (let k = 1; k <= nlags; k++) {
    let num = r[k];
    let den = 1;
    for (let j = 1; j < k; j++) {
      num -= phiPrev[j - 1] * r[k - j];
      den -= phiPrev[j - 1] * r[j];
    }
    const phikk = num / den;
    const phi = new Array<number>(k);
    for (let j = 1; j < k; j++) phi[j - 1] = phiPrev[j - 1] - phikk * phiPrev[k - j - 1];
    phi[k - 1] = phikk;
    phiPrev = phi;
    out.push(phikk);
  }
  return out;
}

export function pacf(x: number[], nlags: number): number[] {
  return pacfFromAcf(acf(x, nlags));
}

export function ljungBox(x: number[], lags: number, dfAdjust = 0) {
  const n = x.length;
  const r = acf(x, lags);
  let q = 0;
  for (let k = 1; k <= lags; k++) q += (r[k] * r[k]) / (n - k);
  q *= n * (n + 2);
  const df = Math.max(lags - dfAdjust, 1);
  return { Q: q, df, p: chi2PValue(q, df) };
}

// ---------------------------------------------------------------- ADF

export interface ADFResult {
  stat: number;
  p: number;
  usedLag: number;
  nobs: number;
  crit: { '1%': number; '5%': number; '10%': number };
  regression: DFRegression;
  icBest?: number;
  rejects: boolean;
  conclusion: string;
  reg: OLSResult;
}

function adfDesign(x: number[], lag: number, maxlagForSample: number, regression: DFRegression) {
  // Muestra: t = maxlagForSample+1 .. n-1 (índices en niveles)
  const dx = diff(x);
  const y: number[] = [];
  const X: number[][] = [];
  const names: string[] = [];
  if (regression !== 'n') names.push('const');
  if (regression === 'ct') names.push('tendencia');
  names.push('y(-1)');
  for (let l = 1; l <= lag; l++) names.push(`Δy(-${l})`);
  let trend = 1;
  for (let t = maxlagForSample; t < dx.length; t++) {
    y.push(dx[t]);
    const row: number[] = [];
    if (regression !== 'n') row.push(1);
    if (regression === 'ct') row.push(trend++);
    row.push(x[t]); // y_{t-1} en niveles (dx[t] = x[t+1]-x[t])
    for (let l = 1; l <= lag; l++) row.push(dx[t - l]);
    X.push(row);
  }
  return { y, X, names };
}

export function adf(
  x: number[],
  opts: { regression?: DFRegression; maxlag?: number; autolag?: 'AIC' | 'BIC' | null } = {},
): ADFResult {
  const regression = opts.regression ?? 'c';
  const n = x.length;
  const ntrend = regression === 'n' ? 0 : regression === 'c' ? 1 : 2;
  let maxlag = opts.maxlag ?? Math.ceil(12 * Math.pow(n / 100, 0.25));
  maxlag = Math.max(0, Math.min(Math.floor(n / 2) - ntrend - 1, maxlag));
  const autolag = opts.autolag === undefined ? 'AIC' : opts.autolag;
  let usedLag = maxlag;
  let icBest: number | undefined;
  if (autolag) {
    let best = Infinity;
    for (let l = 0; l <= maxlag; l++) {
      const d = adfDesign(x, l, maxlag, regression);
      const r = ols(d.y, d.X, d.names);
      const ic = autolag === 'AIC' ? r.aic : r.bic;
      if (ic < best - 1e-12) {
        best = ic;
        usedLag = l;
      }
    }
    icBest = best;
  }
  const d = adfDesign(x, usedLag, usedLag, regression);
  const reg = ols(d.y, d.X, d.names, 'Δy');
  const idx = d.names.indexOf('y(-1)');
  const stat = reg.t[idx];
  const p = mackinnonP(stat, regression, 1);
  const [c1, c5, c10] = mackinnonCrit(regression, 1, reg.n);
  const rejects = p < 0.05;
  return {
    stat, p, usedLag, nobs: reg.n, crit: { '1%': c1, '5%': c5, '10%': c10 }, regression, icBest, rejects, reg,
    conclusion: rejects
      ? `τ = ${stat.toFixed(3)} < ${c5.toFixed(3)} (crítico 5%): se rechaza la raíz unitaria. La serie es estacionaria${regression === 'ct' ? ' alrededor de una tendencia' : ''}.`
      : `τ = ${stat.toFixed(3)} > ${c5.toFixed(3)} (crítico 5%): no se rechaza la raíz unitaria. La serie es no estacionaria (I(1) o superior); trabaje en diferencias o evalúe cointegración.`,
  };
}

// ---------------------------------------------------------------- KPSS

export function kpss(x: number[], opts: { regression?: 'c' | 'ct'; nlags?: number } = {}) {
  const regression = opts.regression ?? 'c';
  const n = x.length;
  const X = x.map((_, t) => (regression === 'c' ? [1] : [1, t + 1]));
  const r = ols(x, X, regression === 'c' ? ['const'] : ['const', 'tendencia']);
  const e = r.resid;
  const nlags = opts.nlags ?? Math.min(Math.ceil(12 * Math.pow(n / 100, 0.25)), n - 1);
  let S = 0;
  let eta = 0;
  for (const v of e) {
    S += v;
    eta += S * S;
  }
  eta /= n * n;
  let s2 = e.reduce((a, v) => a + v * v, 0) / n;
  for (let l = 1; l <= nlags; l++) {
    let g = 0;
    for (let t = l; t < n; t++) g += e[t] * e[t - l];
    s2 += (2 * (1 - l / (nlags + 1)) * g) / n;
  }
  const stat = eta / s2;
  const crit = regression === 'c' ? [0.347, 0.463, 0.574, 0.739] : [0.119, 0.146, 0.176, 0.216];
  const pv = [0.1, 0.05, 0.025, 0.01];
  let p: number;
  if (stat <= crit[0]) p = 0.1;
  else if (stat >= crit[3]) p = 0.01;
  else {
    let i = 0;
    while (stat > crit[i + 1]) i++;
    p = pv[i] + ((stat - crit[i]) * (pv[i + 1] - pv[i])) / (crit[i + 1] - crit[i]);
  }
  const rejects = stat > crit[1];
  return {
    stat, p, nlags, regression, crit: { '10%': crit[0], '5%': crit[1], '2.5%': crit[2], '1%': crit[3] }, rejects,
    pBounded: stat <= crit[0] ? 'mayor' : stat >= crit[3] ? 'menor' : null,
    conclusion: rejects
      ? `KPSS = ${stat.toFixed(3)} > ${crit[1]} (crítico 5%): se rechaza la estacionariedad.`
      : `KPSS = ${stat.toFixed(3)} ≤ ${crit[1]} (crítico 5%): no se rechaza la estacionariedad.`,
  };
}

// ---------------------------------------------------------------- ARIMA (CSS)

export interface ARIMAResult {
  order: [number, number, number];
  withConst: boolean;
  params: { name: string; coef: number; se: number; z: number; p: number }[];
  phi: number[];
  theta: number[];
  mu: number;
  sigma2: number;
  resid: number[];
  n: number;
  css: number;
  aic: number;
  bic: number;
  ljungBox: { Q: number; df: number; p: number };
  forecast: (h: number) => { mean: number[]; lower: number[]; upper: number[] };
  stationary: boolean;
  invertible: boolean;
}

function armaResiduals(w: number[], mu: number, phi: number[], theta: number[]): number[] {
  const p = phi.length;
  const q = theta.length;
  const n = w.length;
  const e = new Array<number>(n).fill(0);
  for (let t = p; t < n; t++) {
    let v = w[t] - mu;
    for (let i = 0; i < p; i++) v -= phi[i] * (w[t - i - 1] - mu);
    for (let j = 0; j < q; j++) if (t - j - 1 >= p) v -= theta[j] * e[t - j - 1];
    e[t] = v;
  }
  return e.slice(p);
}

export function nelderMead(f: (x: number[]) => number, x0: number[], opts: { maxIter?: number; tol?: number; step?: number } = {}) {
  const n = x0.length;
  const maxIter = opts.maxIter ?? 2000 * Math.max(1, n);
  const tol = opts.tol ?? 1e-10;
  const step = opts.step ?? 0.1;
  let simplex = [x0.slice()];
  for (let i = 0; i < n; i++) {
    const x = x0.slice();
    x[i] = x[i] !== 0 ? x[i] * (1 + step) + step * 0.1 : step;
    simplex.push(x);
  }
  let vals = simplex.map(f);
  for (let it = 0; it < maxIter; it++) {
    const order = vals.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]).map((a) => a[1]);
    simplex = order.map((i) => simplex[i]);
    vals = order.map((i) => vals[i]);
    if (Math.abs(vals[n] - vals[0]) <= tol * (Math.abs(vals[0]) + tol)) break;
    const c = new Array<number>(n).fill(0);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) c[j] += simplex[i][j] / n;
    const xr = c.map((v, j) => v + (v - simplex[n][j]));
    const fr = f(xr);
    if (fr < vals[0]) {
      const xe = c.map((v, j) => v + 2 * (v - simplex[n][j]));
      const fe = f(xe);
      if (fe < fr) { simplex[n] = xe; vals[n] = fe; } else { simplex[n] = xr; vals[n] = fr; }
    } else if (fr < vals[n - 1]) {
      simplex[n] = xr; vals[n] = fr;
    } else {
      const outside = fr < vals[n];
      const xc = outside ? c.map((v, j) => v + 0.5 * (xr[j] - v)) : c.map((v, j) => v + 0.5 * (simplex[n][j] - v));
      const fc = f(xc);
      if (fc < (outside ? fr : vals[n])) { simplex[n] = xc; vals[n] = fc; } else {
        for (let i = 1; i <= n; i++) {
          simplex[i] = simplex[i].map((v, j) => simplex[0][j] + 0.5 * (v - simplex[0][j]));
          vals[i] = f(simplex[i]);
        }
      }
    }
  }
  return { x: simplex[0], fx: vals[0] };
}

/** Pesos ψ de la representación MA(∞) de φ(L)y = θ(L)e. */
export function psiWeights(phi: number[], theta: number[], h: number): number[] {
  const psi = [1];
  for (let j = 1; j < h; j++) {
    let v = j <= theta.length ? theta[j - 1] : 0;
    for (let i = 1; i <= Math.min(j, phi.length); i++) v += phi[i - 1] * psi[j - i];
    psi.push(v);
  }
  return psi;
}

/** Máximo módulo inverso de las raíces de 1 - c1 z - ... - cp z^p (vía matriz compañera). */
function companionRadius(c: number[]): number {
  const p = c.length;
  if (p === 0) return 0;
  const A = zeros(p, p);
  for (let j = 0; j < p; j++) A[0][j] = c[j];
  for (let i = 1; i < p; i++) A[i][i - 1] = 1;
  return spectralRadius(A);
}

export function arima(y: number[], order: [number, number, number], withConst = true): ARIMAResult {
  const [p, d, q] = order;
  const w = diff(y, d);
  const n = w.length;
  if (n < p + q + 10) throw new Error('Muy pocas observaciones para este orden ARIMA.');
  const wbar = mean(w);
  // Valores iniciales: AR por MCO, MA en cero
  let phi0 = new Array<number>(p).fill(0);
  if (p > 0) {
    const Y: number[] = [];
    const X: number[][] = [];
    for (let t = p; t < n; t++) {
      Y.push(w[t] - wbar);
      X.push(Array.from({ length: p }, (_, i) => w[t - i - 1] - wbar));
    }
    try {
      phi0 = ols(Y, X, X[0].map((_, i) => `ar${i}`)).beta;
    } catch {
      /* se mantiene en cero */
    }
  }
  const pack = (mu: number, ph: number[], th: number[]) => (withConst ? [mu, ...ph, ...th] : [...ph, ...th]);
  const unpack = (x: number[]) => {
    const o = withConst ? 1 : 0;
    return { mu: withConst ? x[0] : 0, phi: x.slice(o, o + p), theta: x.slice(o + p, o + p + q) };
  };
  const obj = (x: number[]) => {
    const u = unpack(x);
    if (companionRadius(u.theta.map((v) => -v)) >= 0.999 && q > 0) return 1e20;
    const e = armaResiduals(w, u.mu, u.phi, u.theta);
    const s = e.reduce((a, v) => a + v * v, 0);
    return isFinite(s) ? s : 1e20;
  };
  const x0 = pack(wbar, phi0, new Array(q).fill(0));
  let best = nelderMead(obj, x0, { step: 0.1 });
  best = nelderMead(obj, best.x, { step: 0.05 }); // reinicio para pulir el óptimo
  const u = unpack(best.x);
  const resid = armaResiduals(w, u.mu, u.phi, u.theta);
  const m = resid.length;
  const kparams = best.x.length;
  const sigma2 = best.fx / m;
  // Errores estándar por Gauss-Newton: σ²(J'J)⁻¹ con Jacobiano numérico de los residuos
  const J: number[][] = resid.map(() => new Array(kparams).fill(0));
  for (let j = 0; j < kparams; j++) {
    const h = 1e-6 * Math.max(1, Math.abs(best.x[j]));
    const xp = best.x.slice(); xp[j] += h;
    const xm = best.x.slice(); xm[j] -= h;
    const up = unpack(xp);
    const um = unpack(xm);
    const ep = armaResiduals(w, up.mu, up.phi, up.theta);
    const em = armaResiduals(w, um.mu, um.phi, um.theta);
    for (let t = 0; t < m; t++) J[t][j] = (ep[t] - em[t]) / (2 * h);
  }
  let se = new Array(kparams).fill(NaN);
  try {
    const JtJ = zeros(kparams, kparams);
    for (const row of J) for (let a = 0; a < kparams; a++) for (let b = 0; b < kparams; b++) JtJ[a][b] += row[a] * row[b];
    const inv = inverse(JtJ);
    se = inv.map((r, i) => Math.sqrt(Math.max(r[i] * sigma2, 0)));
  } catch {
    /* sin errores estándar */
  }
  const names = [...(withConst ? ['μ (media)'] : []), ...u.phi.map((_, i) => `AR(${i + 1})`), ...u.theta.map((_, i) => `MA(${i + 1})`)];
  const params = best.x.map((c, i) => {
    const z = c / se[i];
    return { name: names[i], coef: c, se: se[i], z, p: tPValue(z, Infinity) };
  });
  const ll = -(m / 2) * (Math.log(2 * Math.PI * sigma2) + 1);
  const aic = -2 * ll + 2 * (kparams + 1);
  const bic = -2 * ll + Math.log(m) * (kparams + 1);
  const lbLags = Math.min(10, Math.floor(m / 4));
  const lb = ljungBox(resid, lbLags, p + q);

  const forecast = (h: number) => {
    // Pronóstico de w con errores futuros nulos, luego integración d veces.
    const wExt = w.slice();
    const eFull = new Array<number>(n).fill(0);
    for (let t = 0; t < m; t++) eFull[t + p] = resid[t];
    const wf: number[] = [];
    for (let s = 1; s <= h; s++) {
      const t = n + s - 1;
      let v = u.mu;
      for (let i = 0; i < p; i++) v += u.phi[i] * (wExt[t - i - 1] - u.mu);
      for (let j = 0; j < q; j++) if (t - j - 1 < n) v += u.theta[j] * eFull[t - j - 1];
      wExt.push(v);
      wf.push(v);
    }
    // Integración
    let levels = wf;
    const hist: number[][] = [y];
    for (let k = 1; k < d; k++) hist.push(diff(y, k));
    for (let k = d - 1; k >= 0; k--) {
      const base = hist[k];
      let last = base[base.length - 1];
      levels = levels.map((v) => (last = last + v));
    }
    // Varianza vía ψ del polinomio AR integrado φ(L)(1-L)^d
    let arPoly = [1, ...u.phi.map((v) => -v)];
    for (let k = 0; k < d; k++) {
      const np = new Array(arPoly.length + 1).fill(0);
      for (let i = 0; i < arPoly.length; i++) { np[i] += arPoly[i]; np[i + 1] -= arPoly[i]; }
      arPoly = np;
    }
    const phiStar = arPoly.slice(1).map((v) => -v);
    const psi = psiWeights(phiStar, u.theta, h);
    let cum = 0;
    const lower: number[] = [];
    const upper: number[] = [];
    for (let s = 0; s < h; s++) {
      cum += psi[s] * psi[s];
      const sd = Math.sqrt(sigma2 * cum);
      lower.push(levels[s] - 1.96 * sd);
      upper.push(levels[s] + 1.96 * sd);
    }
    return { mean: levels, lower, upper };
  };

  return {
    order, withConst, params, phi: u.phi, theta: u.theta, mu: u.mu, sigma2, resid, n: m, css: best.fx, aic, bic,
    ljungBox: lb, forecast,
    stationary: companionRadius(u.phi) < 1,
    invertible: companionRadius(u.theta.map((v) => -v)) < 1,
  };
}

/** Simula un ARMA(p,q) con media mu. */
export function simulateARMA(n: number, phi: number[], theta: number[], normals: number[], mu = 0, burn = 200): number[] {
  const total = n + burn;
  const y = new Array<number>(total).fill(0);
  const e = normals.slice(0, total);
  for (let t = 0; t < total; t++) {
    let v = e[t];
    for (let i = 0; i < phi.length; i++) if (t - i - 1 >= 0) v += phi[i] * y[t - i - 1];
    for (let j = 0; j < theta.length; j++) if (t - j - 1 >= 0) v += theta[j] * e[t - j - 1];
    y[t] = v;
  }
  return y.slice(burn).map((v) => v + mu);
}

/** ACF teórica de un ARMA estacionario (vía pesos ψ truncados). */
export function theoreticalACF(phi: number[], theta: number[], nlags: number): number[] {
  const psi = psiWeights(phi, theta, 600);
  const g = (k: number) => {
    let s = 0;
    for (let j = 0; j + k < psi.length; j++) s += psi[j] * psi[j + k];
    return s;
  };
  const g0 = g(0);
  return Array.from({ length: nlags + 1 }, (_, k) => g(k) / g0);
}

// ---------------------------------------------------------------- VAR

export interface VARResult {
  names: string[];
  p: number;
  nobs: number;
  K: number;
  /** coefs[eq] = [const, A1[eq][0..K-1], A2..., ] */
  equations: OLSResult[];
  A: Matrix[]; // A[l] K×K
  c: number[];
  sigmaU: Matrix;
  resid: number[][];
  logLik: number;
  aic: number;
  bic: number;
  hqic: number;
  stableRadius: number;
}

function varDesign(data: number[][], p: number, trim: number) {
  // data: T × K ; muestra desde t = trim
  const T = data.length;
  const K = data[0].length;
  const X: number[][] = [];
  const Y: number[][] = [];
  for (let t = trim; t < T; t++) {
    const row = [1];
    for (let l = 1; l <= p; l++) for (let k = 0; k < K; k++) row.push(data[t - l][k]);
    X.push(row);
    Y.push(data[t].slice());
  }
  return { X, Y };
}

export function fitVAR(data: number[][], names: string[], p: number, trim = p): VARResult {
  const K = names.length;
  const { X, Y } = varDesign(data, p, trim);
  const nobs = X.length;
  const xnames = ['const'];
  for (let l = 1; l <= p; l++) for (const nm of names) xnames.push(`${nm}(-${l})`);
  const equations = names.map((nm, k) => ols(Y.map((r) => r[k]), X, xnames, nm));
  const kpar = 1 + K * p;
  const resid = Y.map((_, t) => equations.map((eq) => eq.resid[t]));
  const sse = zeros(K, K);
  for (const r of resid) for (let a = 0; a < K; a++) for (let b = 0; b < K; b++) sse[a][b] += r[a] * r[b];
  const sigmaU = sse.map((r) => r.map((v) => v / (nobs - kpar)));
  const sigmaMLE = sse.map((r) => r.map((v) => v / nobs));
  const ld = logDetPD(sigmaMLE);
  const free = p * K * K + K;
  const A: Matrix[] = [];
  for (let l = 0; l < p; l++) A.push(names.map((_, eq) => names.map((_, k) => equations[eq].beta[1 + l * K + k])));
  const c = equations.map((eq) => eq.beta[0]);
  const comp = zeros(K * p, K * p);
  for (let l = 0; l < p; l++) for (let a = 0; a < K; a++) for (let b = 0; b < K; b++) comp[a][l * K + b] = A[l][a][b];
  for (let i = K; i < K * p; i++) comp[i][i - K] = 1;
  const logLik = -(nobs * K / 2) * Math.log(2 * Math.PI) - (nobs / 2) * ld - (nobs * K) / 2;
  return {
    names, p, nobs, K, equations, A, c, sigmaU, resid, logLik,
    aic: ld + (2 / nobs) * free,
    bic: ld + (Math.log(nobs) / nobs) * free,
    hqic: ld + ((2 * Math.log(Math.log(nobs))) / nobs) * free,
    stableRadius: spectralRadius(comp),
  };
}

export function selectVARLag(data: number[][], names: string[], maxlags: number) {
  const rows: { p: number; aic: number; bic: number; hqic: number }[] = [];
  for (let p = 1; p <= maxlags; p++) {
    const r = fitVAR(data, names, p, maxlags);
    rows.push({ p, aic: r.aic, bic: r.bic, hqic: r.hqic });
  }
  const argmin = (key: 'aic' | 'bic' | 'hqic') => rows.reduce((b, r) => (r[key] < b[key] ? r : b)).p;
  return { rows, best: { aic: argmin('aic'), bic: argmin('bic'), hqic: argmin('hqic') } };
}

/** Causalidad de Granger (F de una ecuación): ¿los rezagos de `cause` ayudan a predecir `effect`? */
export function grangerTest(data: number[][], names: string[], p: number, cause: number, effect: number) {
  const { X, Y } = varDesign(data, p, p);
  const K = names.length;
  const y = Y.map((r) => r[effect]);
  const U = ols(y, X, X[0].map((_, j) => `x${j}`));
  const keep = X[0].map((_, j) => j).filter((j) => j === 0 || (j - 1) % K !== cause);
  const XR = X.map((r) => keep.map((j) => r[j]));
  const R = ols(y, XR, keep.map((j) => `x${j}`));
  const F = ((R.ssr - U.ssr) / p) / (U.ssr / U.dfResid);
  const pv = fPValue(F, p, U.dfResid);
  return {
    cause: names[cause], effect: names[effect], F, df1: p, df2: U.dfResid, p: pv, rejects: pv < 0.05,
    conclusion: pv < 0.05
      ? `${names[cause]} causa en el sentido de Granger a ${names[effect]} (p = ${pv.toFixed(4)}).`
      : `No hay evidencia de que ${names[cause]} cause en el sentido de Granger a ${names[effect]} (p = ${pv.toFixed(4)}).`,
  };
}

/** Funciones impulso-respuesta ortogonalizadas (Cholesky). irf[h][respuesta][impulso]. */
export function irf(v: VARResult, horizons: number, orthogonal = true): Matrix[] {
  const K = v.K;
  // Φ_0 = I, Φ_i = Σ_j A_j Φ_{i-j}
  const Phi2: Matrix[] = [identity(K)];
  for (let i = 1; i <= horizons; i++) {
    let acc = zeros(K, K);
    for (let j = 1; j <= Math.min(i, v.p); j++) {
      const prod = matMul(v.A[j - 1], Phi2[i - j]);
      acc = acc.map((r, a) => r.map((x, b) => x + prod[a][b]));
    }
    Phi2.push(acc);
  }
  if (!orthogonal) return Phi2;
  const P = cholesky(v.sigmaU);
  return Phi2.map((M) => matMul(M, P));
}

/** Descomposición de varianza del error de pronóstico. fevd[h][variable][shock] (proporciones). */
export function fevd(v: VARResult, horizons: number): Matrix[] {
  const theta = irf(v, horizons - 1, true);
  const K = v.K;
  const out: Matrix[] = [];
  const acc = zeros(K, K);
  for (let h = 0; h < horizons; h++) {
    for (let a = 0; a < K; a++) for (let b = 0; b < K; b++) acc[a][b] += theta[h][a][b] ** 2;
    out.push(acc.map((r) => {
      const tot = r.reduce((s, x) => s + x, 0);
      return r.map((x) => x / tot);
    }));
  }
  return out;
}

/** Pronóstico de un VAR h pasos adelante. */
export function varForecast(v: VARResult, data: number[][], h: number): number[][] {
  const hist = data.map((r) => r.slice());
  const out: number[][] = [];
  for (let s = 0; s < h; s++) {
    const next = v.c.slice();
    for (let l = 1; l <= v.p; l++) {
      const prev = hist[hist.length - l];
      for (let a = 0; a < v.K; a++) for (let b = 0; b < v.K; b++) next[a] += v.A[l - 1][a][b] * prev[b];
    }
    hist.push(next);
    out.push(next);
  }
  return out;
}

// ---------------------------------------------------------------- Cointegración

export function engleGranger(y: number[], xs: number[][], yName: string, xNames: string[]) {
  const X = y.map((_, t) => [1, ...xs.map((x) => x[t])]);
  const lr = ols(y, X, ['const', ...xNames], yName);
  const N = xs.length + 1;
  if (N > 4) throw new Error('Engle-Granger implementado hasta 4 variables.');
  const a = adf(lr.resid, { regression: 'n' });
  const p = mackinnonP(a.stat, 'c', N);
  const [c1, c5, c10] = mackinnonCrit('c', N, y.length - 1);
  const rejects = p < 0.05;
  return {
    longRun: lr, stat: a.stat, p, usedLag: a.usedLag, crit: { '1%': c1, '5%': c5, '10%': c10 }, rejects,
    conclusion: rejects
      ? `τ = ${a.stat.toFixed(3)} < ${c5.toFixed(3)}: se rechaza H0 de no cointegración. Existe una relación de equilibrio de largo plazo; el modelo de corrección de errores es apropiado.`
      : `τ = ${a.stat.toFixed(3)} > ${c5.toFixed(3)}: no se rechaza H0 de no cointegración. La regresión en niveles podría ser espuria.`,
  };
}

/** Modelo de corrección de errores en dos etapas de Engle-Granger. */
export function ecm(y: number[], xs: number[][], yName: string, xNames: string[], lagsDy = 0) {
  const X = y.map((_, t) => [1, ...xs.map((x) => x[t])]);
  const lr = ols(y, X, ['const', ...xNames], yName);
  const u = lr.resid;
  const dy = diff(y);
  const dxs = xs.map((x) => diff(x));
  const Y: number[] = [];
  const Z: number[][] = [];
  for (let t = lagsDy; t < dy.length; t++) {
    Y.push(dy[t]);
    const row = [1, ...dxs.map((dx) => dx[t]), u[t]];
    for (let l = 1; l <= lagsDy; l++) row.push(dy[t - l]);
    Z.push(row);
  }
  const names = ['const', ...xNames.map((n) => `Δ${n}`), 'ECT(-1)'];
  for (let l = 1; l <= lagsDy; l++) names.push(`Δ${yName}(-${l})`);
  const sr = ols(Y, Z, names, `Δ${yName}`);
  const gamma = sr.beta[1 + xNames.length];
  const halfLife = gamma < 0 && gamma > -2 ? Math.log(0.5) / Math.log(1 + gamma) : NaN;
  return { longRun: lr, shortRun: sr, gamma, halfLife };
}

/** Utilidad: cadena de hallazgos sobre el orden de integración. */
export function integrationOrder(x: number[]): { order: number; tests: ADFResult[] } {
  const tests: ADFResult[] = [];
  let s = x;
  for (let d = 0; d <= 2; d++) {
    const r = adf(s, { regression: 'c' });
    tests.push(r);
    if (r.rejects) return { order: d, tests };
    s = diff(s);
  }
  return { order: 3, tests };
}

export { chi2PValue };
