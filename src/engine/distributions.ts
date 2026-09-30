// Funciones de distribución para inferencia: Normal, t, F, χ², y Dickey-Fuller (MacKinnon).

const LANCZOS = [
  676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
  12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
];

export function lnGamma(z: number): number {
  if (z < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * z))) - lnGamma(1 - z);
  z -= 1;
  let x = 0.99999999999980993;
  for (let i = 0; i < LANCZOS.length; i++) x += LANCZOS[i] / (z + i + 1);
  const t = z + LANCZOS.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

/** Fracción continua de Lentz para la beta incompleta. */
function betacf(a: number, b: number, x: number): number {
  const MAXIT = 300;
  const EPS = 3e-16;
  const FPMIN = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

/** Beta incompleta regularizada I_x(a,b). */
export function incBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  if (x < (a + 1) / (a + b + 2)) return (bt * betacf(a, b, x)) / a;
  return 1 - (bt * betacf(b, a, 1 - x)) / b;
}

/** Gamma incompleta regularizada inferior P(a,x). */
export function incGammaP(a: number, x: number): number {
  if (x <= 0) return 0;
  if (x < a + 1) {
    let sum = 1 / a;
    let del = sum;
    let ap = a;
    for (let n = 0; n < 1000; n++) {
      ap += 1;
      del *= x / ap;
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-16) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - lnGamma(a));
  }
  // Fracción continua para Q(a,x)
  const FPMIN = 1e-300;
  let b = x + 1 - a;
  let c = 1 / FPMIN;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 1000; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = b + an / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-16) break;
  }
  return 1 - Math.exp(-x + a * Math.log(x) - lnGamma(a)) * h;
}

/** erf con precisión ~1e-15 vía la gamma incompleta. */
export function erf(x: number): number {
  const v = incGammaP(0.5, x * x);
  return x >= 0 ? v : -v;
}

export function normPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

export function normCdf(x: number): number {
  if (x < -8) {
    // cola: aproximación asintótica para no perder precisión
    return (normPdf(x) / -x) * (1 - 1 / (x * x) + 3 / x ** 4);
  }
  if (x < 0) return 0.5 * (1 - incGammaP(0.5, (x * x) / 2));
  return 0.5 * (1 + incGammaP(0.5, (x * x) / 2));
}

/** Inversa de la normal (Acklam) con un paso de refinamiento de Newton. */
export function normInv(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pl = 0.02425;
  let x: number;
  if (p < pl) {
    const q = Math.sqrt(-2 * Math.log(p));
    x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= 1 - pl) {
    const q = p - 0.5;
    const r = q * q;
    x = ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  const e = normCdf(x) - p;
  const u = e * Math.sqrt(2 * Math.PI) * Math.exp((x * x) / 2);
  return x - u / (1 + (x * u) / 2);
}

export function tCdf(t: number, df: number): number {
  if (!isFinite(df)) return normCdf(t);
  const x = df / (df + t * t);
  const tail = 0.5 * incBeta(x, df / 2, 0.5);
  return t >= 0 ? 1 - tail : tail;
}

/** p-valor bilateral de un estadístico t. */
export function tPValue(t: number, df: number): number {
  if (!isFinite(t)) return 0;
  const x = df / (df + t * t);
  return incBeta(x, df / 2, 0.5);
}

export function fCdf(f: number, d1: number, d2: number): number {
  if (f <= 0) return 0;
  return incBeta((d1 * f) / (d1 * f + d2), d1 / 2, d2 / 2);
}

export function fPValue(f: number, d1: number, d2: number): number {
  if (f <= 0) return 1;
  return incBeta(d2 / (d2 + d1 * f), d2 / 2, d1 / 2);
}

export function chi2Cdf(x: number, df: number): number {
  return incGammaP(df / 2, x / 2);
}

export function chi2PValue(x: number, df: number): number {
  if (x <= 0) return 1;
  return 1 - incGammaP(df / 2, x / 2);
}

/** Inversión genérica por bisección de una CDF monótona. */
function invert(cdf: (x: number) => number, p: number, lo: number, hi: number): number {
  while (cdf(hi) < p) hi *= 2;
  while (cdf(lo) > p) lo = lo < 0 ? lo * 2 : lo - 1;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (cdf(mid) < p) lo = mid;
    else hi = mid;
    if (hi - lo < 1e-12 * Math.max(1, Math.abs(mid))) break;
  }
  return (lo + hi) / 2;
}

export function tInv(p: number, df: number): number {
  if (!isFinite(df)) return normInv(p);
  return invert((x) => tCdf(x, df), p, -10, 10);
}

export function fInv(p: number, d1: number, d2: number): number {
  return invert((x) => fCdf(x, d1, d2), p, 0, 10);
}

export function chi2Inv(p: number, df: number): number {
  return invert((x) => chi2Cdf(x, df), p, 0, Math.max(10, df * 3));
}

// ---------------------------------------------------------------------------
// Dickey-Fuller / Engle-Granger: MacKinnon (1994) p-valores y (2010) críticos.
// Tablas tomadas de statsmodels.tsa.adfvalues (N = número de series I(1)).

export type DFRegression = 'n' | 'c' | 'ct';

const MK = {
  n: {
    max: [Infinity, 1.51, 0.86, 0.88], min: [-19.04, -19.62, -21.21, -23.25], star: [-1.04, -1.53, -2.68, -3.09],
    small: [[0.6344, 1.2378, 0.032496], [1.9129, 1.3857, 0.035322], [2.7648, 1.4502, 0.034186], [3.4336, 1.4835, 0.0319]],
    large: [[0.4797, 0.93557, -0.06999, 0.033066], [1.5578, 0.8558, -0.2083, -0.033549], [2.2268, 0.68093, -0.32362, -0.054448], [2.7654, 0.64502, -0.30811, -0.044946]],
    crit: [[[-2.56574, -2.2358, -3.627, 0.0], [-1.941, -0.2686, -3.365, 31.223], [-1.61682, 0.2656, -2.714, 25.364]]],
  },
  c: {
    max: [2.74, 0.92, 0.55, 0.61], min: [-18.83, -18.86, -23.48, -28.07], star: [-1.61, -2.62, -3.13, -3.47],
    small: [[2.1659, 1.4412, 0.038269], [2.92, 1.5012, 0.039796], [3.4699, 1.4856, 0.03164], [3.9673, 1.4777, 0.026315]],
    large: [[1.7339, 0.93202, -0.12745, -0.010368], [2.1945, 0.64695, -0.29198, -0.042377], [2.5893, 0.45168, -0.36529, -0.050074], [3.0387, 0.45452, -0.33666, -0.041921]],
    crit: [
      [[-3.43035, -6.5393, -16.786, -79.433], [-2.86154, -2.8903, -4.234, -40.04], [-2.56677, -1.5384, -2.809, 0.0]],
      [[-3.89644, -10.9519, -33.527, 0.0], [-3.33613, -6.1101, -6.823, 0.0], [-3.04445, -4.2412, -2.72, 0.0]],
      [[-4.29374, -14.4354, -33.195, 47.433], [-3.74066, -8.5632, -10.852, 27.982], [-3.45218, -6.2143, -3.718, 0.0]],
      [[-4.64332, -18.1031, -37.972, 0.0], [-4.096, -11.2349, -11.175, 0.0], [-3.8102, -8.3931, -4.137, 0.0]],
    ],
  },
  ct: {
    max: [0.7, 0.63, 0.71, 0.93], min: [-16.18, -21.15, -25.37, -26.63], star: [-2.89, -3.19, -3.5, -3.65],
    small: [[3.2512, 1.6047, 0.049588], [3.6646, 1.5419, 0.036448], [4.0983, 1.5173, 0.029898], [4.5844, 1.5338, 0.028796]],
    large: [[2.5261, 0.61654, -0.37956, -0.060285], [2.85, 0.5272, -0.36622, -0.051695], [3.221, 0.5255, -0.32685, -0.041501], [3.652, 0.59758, -0.27483, -0.032081]],
    crit: [
      [[-3.95877, -9.0531, -28.428, -134.155], [-3.41049, -4.3904, -9.036, -45.374], [-3.12705, -2.5856, -3.925, -22.38]],
      [[-4.32762, -15.4387, -35.679, 0.0], [-3.78057, -9.5106, -12.074, 0.0], [-3.49631, -7.0815, -7.538, 21.892]],
      [[-4.66305, -18.7688, -49.793, 104.244], [-4.1189, -11.8922, -19.031, 77.332], [-3.83511, -9.0723, -8.504, 35.403]],
      [[-4.9694, -22.4694, -52.599, 51.314], [-4.42871, -14.5876, -18.228, 39.647], [-4.14633, -11.25, -9.873, 54.109]],
    ],
  },
} as const;

/** p-valor aproximado de MacKinnon (1994) para un estadístico τ. */
export function mackinnonP(tau: number, regression: DFRegression = 'c', N = 1): number {
  const t = MK[regression];
  const i = N - 1;
  if (tau > t.max[i]) return 1;
  if (tau < t.min[i]) return 0;
  const coef = tau <= t.star[i] ? t.small[i] : t.large[i];
  let z = 0;
  for (let j = coef.length - 1; j >= 0; j--) z = z * tau + coef[j];
  return normCdf(z);
}

/** Valores críticos de MacKinnon (2010) al 1%, 5% y 10% para tamaño muestral nobs. */
export function mackinnonCrit(regression: DFRegression = 'c', N = 1, nobs = Infinity): [number, number, number] {
  const tab = MK[regression].crit[N - 1];
  if (!tab) throw new Error(`Sin tabla de MacKinnon para N=${N} (${regression}).`);
  const inv = isFinite(nobs) ? 1 / nobs : 0;
  return tab.map((c) => c[0] + c[1] * inv + c[2] * inv ** 2 + c[3] * inv ** 3) as [number, number, number];
}
