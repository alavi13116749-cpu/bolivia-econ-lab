import { describe, expect, it } from 'vitest';
import fx from './fixtures.json';
import { ols } from '../src/engine/ols';
import { breuschGodfrey, breuschPagan, jarqueBera, ramseyReset, vif, whiteTest } from '../src/engine/diagnostics';
import { acf, adf, arima, engleGranger, fevd, fitVAR, grangerTest, irf, kpss, pacf, selectVARLag } from '../src/engine/timeseries';
import { iv2sls } from '../src/engine/iv';
import { binaryModel } from '../src/engine/binary';
import { panelModels } from '../src/engine/panel';
import { chi2Inv, fInv, normCdf, normInv, tCdf, tInv } from '../src/engine/distributions';

const close = (a: number, b: number, rel = 1e-6, abs = 1e-8) =>
  expect(Math.abs(a - b)).toBeLessThanOrEqual(Math.max(abs, rel * Math.abs(b)));
const closeArr = (a: number[], b: number[], rel = 1e-6, abs = 1e-8) => a.forEach((v, i) => close(v, b[i], rel, abs));

describe('distribuciones', () => {
  it('coinciden con valores tabulados', () => {
    close(normCdf(1.96), 0.9750021048517795, 1e-10);
    close(normInv(0.975), 1.959963984540054, 1e-9);
    close(tInv(0.975, 10), 2.2281388519649385, 1e-8);
    close(tCdf(-2, 5), 0.05096973941492914, 1e-8);
    close(fInv(0.95, 3, 20), 3.0983912121407795, 1e-7);
    close(chi2Inv(0.95, 2), 5.991464547107979, 1e-8);
  });
});

describe('MCO y diagnóstico vs statsmodels', () => {
  const o = fx.ols;
  const X = o.y.map((_, i) => [1, o.x1[i], o.x2[i]]);
  const r = ols(o.y, X, ['const', 'x1', 'x2']);
  it('coeficientes, errores estándar y ajuste', () => {
    closeArr(r.beta, o.beta);
    closeArr(r.se, o.se);
    closeArr(r.p, o.p, 1e-5);
    close(r.r2, o.r2);
    close(r.adjR2, o.adjR2);
    close(r.F, o.F);
    close(r.aic, o.aic);
    close(r.bic, o.bic);
    close(r.logLik, o.llf);
    close(r.dw, o.dw);
  });
  it('errores robustos HC1 y HAC', () => {
    closeArr(ols(o.y, X, ['c', 'a', 'b'], 'y', { covType: 'HC1' }).se, o.seHC1);
    close(ols(o.y, X, ['c', 'a', 'b'], 'y', { covType: 'HC1' }).F, o.FHC1);
    closeArr(ols(o.y, X, ['c', 'a', 'b'], 'y', { covType: 'HAC', hacLags: 4 }).se, o.seHAC);
  });
  it('pruebas de especificación', () => {
    const bp = breuschPagan(r, X);
    close(bp.stat, o.bp[0]); close(bp.p, o.bp[1], 1e-5);
    const w = whiteTest(r, X);
    close(w.stat, o.white[0]); close(w.p, o.white[1], 1e-5);
    const bg = breuschGodfrey(r, X, 2);
    close(bg.stat, o.bg[0]); close(bg.p, o.bg[1], 1e-5);
    const jb = jarqueBera(r.resid);
    close(jb.stat, o.jb[0]); close(jb.p, o.jb[1], 1e-5);
    const rs = ramseyReset(r, o.y, X);
    close(rs.stat, o.reset[0]); close(rs.p, o.reset[1], 1e-5);
    closeArr(vif(X, ['const', 'x1', 'x2']).map((v) => v.vif), o.vif);
  });
});

describe('series de tiempo vs statsmodels', () => {
  const t = fx.ts as Record<string, any>;
  for (const name of ['rw', 'ar']) {
    for (const reg of ['c', 'ct', 'n'] as const) {
      it(`ADF ${name} (${reg})`, () => {
        const ref = t[`adf_${name}_${reg}`];
        const r = adf(t[name], { regression: reg });
        expect(r.usedLag).toBe(ref.lag);
        expect(r.nobs).toBe(ref.nobs);
        close(r.stat, ref.stat, 1e-6);
        close(r.p, ref.p, 1e-5);
        closeArr([r.crit['1%'], r.crit['5%'], r.crit['10%']], ref.crit, 1e-6);
      });
    }
    it(`KPSS ${name}`, () => {
      const ref = t[`kpss_${name}`];
      const r = kpss(t[name]);
      expect(r.nlags).toBe(ref.lags);
      close(r.stat, ref.stat, 1e-6);
    });
  }
  it('ACF y PACF', () => {
    closeArr(acf(t.ar, 10), t.acf_ar, 1e-8);
    closeArr(pacf(t.ar, 10), t.pacf_ar, 1e-8);
  });
  it('ARMA(1,1) por CSS cercano a MLE', () => {
    const r = arima(fx.arma.y, [1, 0, 1]);
    // params statsmodels: const, ar.L1, ma.L1, sigma2
    close(r.mu, fx.arma.params[0], 0.05);
    close(r.phi[0], fx.arma.params[1], 0.05);
    close(r.theta[0], fx.arma.params[2], 0.1);
    close(r.sigma2, fx.arma.params[3], 0.05);
    expect(r.stationary).toBe(true);
    expect(r.invertible).toBe(true);
  });
});

describe('VAR vs statsmodels', () => {
  const v = fx.var;
  const r = fitVAR(v.Y, ['y1', 'y2'], 2);
  it('coeficientes, Σu y criterios', () => {
    for (let l = 0; l < 2; l++) for (let a = 0; a < 2; a++) closeArr(r.A[l][a], v.coefs[l][a], 1e-7);
    closeArr(r.c, v.intercept, 1e-7);
    for (let a = 0; a < 2; a++) closeArr(r.sigmaU[a], v.sigma_u[a], 1e-7);
    close(r.aic, v.aic, 1e-7);
    close(r.bic, v.bic, 1e-7);
    close(r.hqic, v.hqic, 1e-7);
    close(r.stableRadius, v.stable_max_root_modulus, 1e-4);
  });
  it('selección de rezagos', () => {
    const s = selectVARLag(v.Y, ['y1', 'y2'], 6);
    expect(s.best).toEqual(v.select);
  });
  it('IRF ortogonalizadas y FEVD', () => {
    const f = irf(r, 8);
    for (let h = 0; h <= 8; h++) for (let a = 0; a < 2; a++) closeArr(f[h][a], v.orth_irfs[h][a], 1e-6);
    const d = fevd(r, 8);
    // statsmodels: decomp[variable][h][shock]
    for (let a = 0; a < 2; a++) for (let h = 0; h < 8; h++) closeArr(d[h][a], v.fevd[a][h], 1e-6);
  });
  it('Granger', () => {
    const g = grangerTest(v.Y, ['y1', 'y2'], 2, 0, 1);
    close(g.F, v.granger_0_to_1[0], 1e-7);
    close(g.p, v.granger_0_to_1[1], 1e-5);
  });
});

describe('cointegración Engle-Granger vs statsmodels.coint', () => {
  it('estadístico, p-valor y críticos', () => {
    const c = fx.coint;
    const r = engleGranger(c.y, [c.x], 'y', ['x']);
    close(r.stat, c.stat, 1e-6);
    close(r.p, c.p, 1e-4, 1e-8);
    closeArr([r.crit['1%'], r.crit['5%'], r.crit['10%']], c.crit, 1e-6);
  });
});

describe('MC2E vs statsmodels IV2SLS', () => {
  it('coeficientes y errores estándar', () => {
    const d = fx.iv;
    const r = iv2sls({
      y: d.y, yName: 'y',
      exog: d.y.map((_, i) => [1, d.w[i]]), exogNames: ['const', 'w'],
      endog: d.x.map((v) => [v]), endogNames: ['x'],
      instruments: d.z1.map((v, i) => [v, d.z2[i]]), instrumentNames: ['z1', 'z2'],
    });
    closeArr(r.main.beta, d.beta, 1e-7);
    closeArr(r.main.se, d.se, 1e-7);
    expect(r.firstStage[0].F).toBeGreaterThan(10);
    expect(r.hausman.rejects).toBe(true);
    expect(r.sargan).not.toBeNull();
  });
});

describe('Logit / Probit vs statsmodels', () => {
  const b = fx.binary;
  const X = b.y.map((_, i) => [1, b.inc[i], b.edu[i]]);
  it('logit', () => {
    const r = binaryModel(b.y, X, ['const', 'inc', 'edu'], 'logit');
    closeArr(r.beta, b.logit.beta, 1e-6);
    closeArr(r.se, b.logit.se, 1e-5);
    close(r.logLik, b.logit.llf, 1e-8);
    close(r.pseudoR2, b.logit.prsq, 1e-7);
    closeArr(r.ame.map((a) => a.effect), b.logit.ame, 1e-6);
    closeArr(r.ame.map((a) => a.se), b.logit.ame_se, 1e-4);
  });
  it('probit', () => {
    const r = binaryModel(b.y, X, ['const', 'inc', 'edu'], 'probit');
    closeArr(r.beta, b.probit.beta, 1e-6);
    closeArr(r.se, b.probit.se, 1e-5);
    close(r.logLik, b.probit.llf, 1e-8);
    closeArr(r.ame.map((a) => a.effect), b.probit.ame, 1e-6);
    closeArr(r.ame.map((a) => a.se), b.probit.ame_se, 1e-4);
  });
});

describe('Panel vs linearmodels', () => {
  const p = fx.panel;
  const r = panelModels({
    y: p.y, yName: 'y', X: p.x1.map((v, i) => [v, p.x2[i]]), names: ['x1', 'x2'], entity: p.e, time: p.t,
  });
  it('efectos fijos', () => {
    closeArr(r.fe.beta.slice(1), p.fe_beta, 1e-8);
    closeArr(r.fe.se.slice(1), p.fe_se, 1e-6);
    close(r.fe.r2Within, p.fe_r2w, 1e-8);
  });
  it('efectos aleatorios', () => {
    close(r.re.theta, p.re_theta, 1e-3);
    closeArr(r.re.beta, p.re_beta, 1e-3);
    closeArr(r.re.se, p.re_se, 1e-2);
  });
});
