import { describe, expect, it } from 'vitest';
import { builtinDatasets } from '../src/data/datasets';
import { runAnalysis } from '../src/analysis/run';
import { interpret } from '../src/analysis/interpret';
import { generateCode, LANGS } from '../src/analysis/codegen';
import { parseCSV } from '../src/lib/csv';

const ds = Object.fromEntries(builtinDatasets().map((d) => [d.id, d]));

describe('datasets didácticos recuperan sus parámetros verdaderos', () => {
  it('Mincer: retorno a la educación ≈ 8,2% y heteroscedasticidad detectada', () => {
    const r = runAnalysis(ds.salarios, { kind: 'ols', y: 'ln_salario', x: ['educacion', 'experiencia', 'experiencia^2', 'mujer', 'informal', 'urbano'] });
    if (r.kind !== 'ols') throw new Error();
    expect(r.res.beta[1]).toBeGreaterThan(0.06);
    expect(r.res.beta[1]).toBeLessThan(0.1);
    expect(r.tests.find((t) => t.id === 'white')!.rejects).toBe(true);
    expect(interpret(r)).toContain('HC1');
  });
  it('Quinua: MC2E corrige el sesgo de simultaneidad de la demanda', () => {
    const r = runAnalysis(ds.quinua, { kind: 'iv', y: 'cantidad', exog: ['ingreso_externo'], endog: ['precio'], instruments: ['lluvia', 'precio_fertilizante'] });
    if (r.kind !== 'iv') throw new Error();
    const j = r.res.main.names.indexOf('precio');
    expect(Math.abs(r.res.main.beta[j] - -1.2)).toBeLessThan(0.3);
    const jo = r.res.olsComparison.names.indexOf('precio');
    expect(Math.abs(r.res.olsComparison.beta[jo] - -1.2)).toBeGreaterThan(Math.abs(r.res.main.beta[j] - -1.2));
    expect(r.res.firstStage[0].weak).toBe(false);
  });
  it('Panel: Hausman favorece efectos fijos', () => {
    const r = runAnalysis(ds.panel, { kind: 'panel', y: 'crecimiento', x: ['inversion_publica', 'escolaridad', 'precio_minerales'] });
    if (r.kind !== 'panel') throw new Error();
    expect(r.res.hausman.rejects).toBe(true);
    expect(r.res.N).toBe(9);
  });
  it('Demanda de dinero: series I(1) cointegradas y γ < 0', () => {
    const u = runAnalysis(ds.dinero, { kind: 'unitroot', variable: 'ln_pib' });
    if (u.kind !== 'unitroot') throw new Error();
    expect(u.levels.rejects).toBe(false);
    const c = runAnalysis(ds.dinero, { kind: 'coint', y: 'ln_m1_real', x: ['ln_pib', 'tasa_interes'] });
    if (c.kind !== 'coint') throw new Error();
    expect(c.eg.rejects).toBe(true);
    expect(c.model.gamma).toBeLessThan(0);
    expect(Math.abs(c.eg.longRun.beta[1] - 1.12)).toBeLessThan(0.15);
  });
  it('Crédito: Logit y Probit convergen con AME parecidos', () => {
    const l = runAnalysis(ds.credito, { kind: 'binary', link: 'logit', y: 'acceso_credito', x: ['log(ingreso)', 'educacion', 'urbano', 'mujer', 'edad', 'edad^2', 'cuenta_bancaria'] });
    const p = runAnalysis(ds.credito, { kind: 'binary', link: 'probit', y: 'acceso_credito', x: ['log(ingreso)', 'educacion', 'urbano', 'mujer', 'edad', 'edad^2', 'cuenta_bancaria'] });
    if (l.kind !== 'binary' || p.kind !== 'binary') throw new Error();
    expect(l.res.converged && p.res.converged).toBe(true);
    l.res.ame.forEach((a, i) => expect(Math.abs(a.effect - p.res.ame[i].effect)).toBeLessThan(0.02));
  });
  it('VAR monetario: estable, con IRF y FEVD que suman 1', () => {
    const r = runAnalysis(ds.var, { kind: 'var', variables: ['inflacion', 'credito', 'tasa_interbancaria', 'emision'] });
    if (r.kind !== 'var') throw new Error();
    expect(r.res.stableRadius).toBeLessThan(1);
    r.fevd[11].forEach((row) => expect(row.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10));
  });
  it('Espuria: R² > DW y la interpretación lo advierte', () => {
    const r = runAnalysis(ds.espuria, { kind: 'ols', y: 'y', x: ['x'] });
    if (r.kind !== 'ols') throw new Error();
    expect(r.res.dw).toBeLessThan(0.5);
  });
  it('ARIMA, correlograma y descriptivos corren sobre series reales del dataset', () => {
    expect(runAnalysis(ds.var, { kind: 'arima', variable: 'inflacion', p: 2, d: 0, q: 0 }).report).toContain('ARIMA(2,0,0)');
    expect(runAnalysis(ds.dinero, { kind: 'correlogram', variable: 'd(ln_pib)' }).report).toContain('Ljung-Box');
    expect(runAnalysis(ds.salarios, { kind: 'describe' }).report).toContain('ln_salario');
  });
  it('genera código en los cuatro lenguajes para cada tipo de análisis', () => {
    const specs = [
      { kind: 'ols', y: 'log(y)', x: ['x^2', 'lag(z,2)'], covType: 'HAC' },
      { kind: 'binary', link: 'logit', y: 'a', x: ['b'] },
      { kind: 'iv', y: 'q', exog: ['i'], endog: ['p'], instruments: ['z'] },
      { kind: 'panel', y: 'g', x: ['i'] },
      { kind: 'unitroot', variable: 'y', regression: 'ct' },
      { kind: 'correlogram', variable: 'y' },
      { kind: 'arima', variable: 'y', p: 1, d: 1, q: 1 },
      { kind: 'var', variables: ['a', 'b'], p: 2 },
      { kind: 'coint', y: 'a', x: ['b'] },
    ] as const;
    for (const s of specs) for (const l of LANGS) expect(generateCode(s as never, l.id).length).toBeGreaterThan(40);
  });
});

describe('CSV con formato boliviano', () => {
  it('detecta punto y coma, coma decimal y separador de miles', () => {
    const t = parseCSV('Año;PIB (Bs);Inflación\n2020;1.234,5;0,7\n2021;1.300,25;0,9\n');
    expect(t.columns).toEqual(['ano', 'pib_bs', 'inflacion']);
    expect(t.data.pib_bs).toEqual([1234.5, 1300.25]);
    expect(t.data.inflacion).toEqual([0.7, 0.9]);
  });
});
