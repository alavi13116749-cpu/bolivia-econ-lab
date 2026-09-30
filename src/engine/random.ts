// Generador pseudoaleatorio con semilla (mulberry32) para simulaciones reproducibles.

export class RNG {
  private s: number;
  private spare: number | null = null;
  constructor(seed = 20250101) {
    this.s = seed >>> 0;
  }
  uniform(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  normal(mean = 0, sd = 1): number {
    if (this.spare !== null) {
      const v = this.spare;
      this.spare = null;
      return mean + sd * v;
    }
    let u = 0;
    let v = 0;
    while (u === 0) u = this.uniform();
    while (v === 0) v = this.uniform();
    const r = Math.sqrt(-2 * Math.log(u));
    this.spare = r * Math.sin(2 * Math.PI * v);
    return mean + sd * r * Math.cos(2 * Math.PI * v);
  }
  normals(n: number, mean = 0, sd = 1): number[] {
    return Array.from({ length: n }, () => this.normal(mean, sd));
  }
  bernoulli(p: number): number {
    return this.uniform() < p ? 1 : 0;
  }
  int(lo: number, hi: number): number {
    return lo + Math.floor(this.uniform() * (hi - lo + 1));
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.uniform() * arr.length)];
  }
}
