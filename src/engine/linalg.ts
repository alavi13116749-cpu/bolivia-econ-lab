// Álgebra lineal mínima para el motor econométrico.
// Matrices densas como number[][] (filas). Suficiente para n ≤ ~10⁴ y k ≤ ~50.

export type Matrix = number[][];
export type Vector = number[];

export function zeros(r: number, c: number): Matrix {
  return Array.from({ length: r }, () => new Array<number>(c).fill(0));
}

export function identity(n: number): Matrix {
  const m = zeros(n, n);
  for (let i = 0; i < n; i++) m[i][i] = 1;
  return m;
}

export function transpose(a: Matrix): Matrix {
  const r = a.length;
  const c = r ? a[0].length : 0;
  const t = zeros(c, r);
  for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) t[j][i] = a[i][j];
  return t;
}

export function matMul(a: Matrix, b: Matrix): Matrix {
  const n = a.length;
  const m = b[0].length;
  const p = b.length;
  const out = zeros(n, m);
  for (let i = 0; i < n; i++) {
    const ai = a[i];
    const oi = out[i];
    for (let k = 0; k < p; k++) {
      const aik = ai[k];
      if (aik === 0) continue;
      const bk = b[k];
      for (let j = 0; j < m; j++) oi[j] += aik * bk[j];
    }
  }
  return out;
}

export function matVec(a: Matrix, v: Vector): Vector {
  return a.map((row) => {
    let s = 0;
    for (let j = 0; j < row.length; j++) s += row[j] * v[j];
    return s;
  });
}

/** X'X sin formar la transpuesta explícitamente. */
export function crossprod(x: Matrix, y: Matrix = x): Matrix {
  const k = x[0].length;
  const m = y[0].length;
  const out = zeros(k, m);
  for (let i = 0; i < x.length; i++) {
    const xi = x[i];
    const yi = y[i];
    for (let a = 0; a < k; a++) {
      const v = xi[a];
      if (v === 0) continue;
      const oa = out[a];
      for (let b = 0; b < m; b++) oa[b] += v * yi[b];
    }
  }
  return out;
}

/** X'v */
export function crossprodVec(x: Matrix, v: Vector): Vector {
  const k = x[0].length;
  const out = new Array<number>(k).fill(0);
  for (let i = 0; i < x.length; i++) {
    const xi = x[i];
    const vi = v[i];
    for (let a = 0; a < k; a++) out[a] += xi[a] * vi;
  }
  return out;
}

export function add(a: Matrix, b: Matrix): Matrix {
  return a.map((row, i) => row.map((v, j) => v + b[i][j]));
}

export function sub(a: Matrix, b: Matrix): Matrix {
  return a.map((row, i) => row.map((v, j) => v - b[i][j]));
}

export function scale(a: Matrix, s: number): Matrix {
  return a.map((row) => row.map((v) => v * s));
}

export function dot(a: Vector, b: Vector): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

export class SingularMatrixError extends Error {
  constructor(msg = 'Matriz singular: hay multicolinealidad perfecta entre regresores.') {
    super(msg);
    this.name = 'SingularMatrixError';
  }
}

/** Inversa por Gauss-Jordan con pivoteo parcial. */
export function inverse(a: Matrix): Matrix {
  const n = a.length;
  const m = a.map((row, i) => {
    const r = new Array<number>(2 * n).fill(0);
    for (let j = 0; j < n; j++) r[j] = row[j];
    r[n + i] = 1;
    return r;
  });
  // Escala de referencia para detectar singularidad relativa
  let maxAbs = 0;
  for (const row of a) for (const v of row) maxAbs = Math.max(maxAbs, Math.abs(v));
  const tol = 1e-12 * Math.max(1, maxAbs);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(m[r][col]) > Math.abs(m[piv][col])) piv = r;
    if (Math.abs(m[piv][col]) < tol) throw new SingularMatrixError();
    [m[col], m[piv]] = [m[piv], m[col]];
    const p = m[col][col];
    const rowc = m[col];
    for (let j = 0; j < 2 * n; j++) rowc[j] /= p;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = m[r][col];
      if (f === 0) continue;
      const rr = m[r];
      for (let j = 0; j < 2 * n; j++) rr[j] -= f * rowc[j];
    }
  }
  return m.map((row) => row.slice(n));
}

export function solve(a: Matrix, b: Vector): Vector {
  return matVec(inverse(a), b);
}

/** Descomposición de Cholesky (triangular inferior). */
export function cholesky(a: Matrix): Matrix {
  const n = a.length;
  const l = zeros(n, n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = a[i][j];
      for (let k = 0; k < j; k++) s -= l[i][k] * l[j][k];
      if (i === j) {
        if (s <= 0) throw new Error('La matriz no es definida positiva.');
        l[i][j] = Math.sqrt(s);
      } else l[i][j] = s / l[j][j];
    }
  }
  return l;
}

export function determinant(a: Matrix): number {
  const n = a.length;
  const m = a.map((r) => r.slice());
  let det = 1;
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[piv][c])) piv = r;
    if (m[piv][c] === 0) return 0;
    if (piv !== c) {
      [m[c], m[piv]] = [m[piv], m[c]];
      det = -det;
    }
    det *= m[c][c];
    for (let r = c + 1; r < n; r++) {
      const f = m[r][c] / m[c][c];
      for (let j = c; j < n; j++) m[r][j] -= f * m[c][j];
    }
  }
  return det;
}

/** log|det(A)| para matrices definidas positivas (vía Cholesky). */
export function logDetPD(a: Matrix): number {
  const l = cholesky(a);
  let s = 0;
  for (let i = 0; i < l.length; i++) s += Math.log(l[i][i]);
  return 2 * s;
}

function frobenius(a: Matrix): number {
  let s = 0;
  for (const r of a) for (const v of r) s += v * v;
  return Math.sqrt(s);
}

/**
 * Radio espectral ρ(A) = lim ‖Aᵏ‖^{1/k}, estimado por cuadrados sucesivos
 * con renormalización: A^{2^s} = M_s · e^{L_s}. Suficiente para evaluar la
 * estabilidad de un VAR (ρ < 1) sin calcular autovalores complejos.
 */
export function spectralRadius(a: Matrix, squarings = 30): number {
  let m = a.map((r) => r.slice());
  let logScale = 0;
  for (let s = 0; s < squarings; s++) {
    const f = frobenius(m);
    if (f === 0) return 0;
    m = matMul(scale(m, 1 / f), scale(m, 1 / f));
    logScale = 2 * (logScale + Math.log(f));
  }
  const f = frobenius(m);
  if (f === 0) return 0;
  return Math.exp((logScale + Math.log(f)) / 2 ** squarings);
}
