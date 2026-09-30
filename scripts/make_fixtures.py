"""Genera fixtures de referencia con statsmodels / linearmodels para validar
el motor econométrico en TypeScript (tests/engine.test.ts).

Uso:  python3 scripts/make_fixtures.py
"""
import json
import pathlib

import numpy as np
import pandas as pd
import statsmodels.api as sm
from statsmodels.stats.diagnostic import (acorr_breusch_godfrey, het_breuschpagan,
                                          het_white, linear_reset)
from statsmodels.stats.outliers_influence import variance_inflation_factor
from statsmodels.stats.stattools import jarque_bera
from statsmodels.tsa.stattools import acf, adfuller, coint, kpss, pacf
from statsmodels.tsa.api import VAR
from statsmodels.sandbox.regression.gmm import IV2SLS

OUT = pathlib.Path(__file__).resolve().parent.parent / "tests" / "fixtures.json"
rng = np.random.default_rng(42)
fx = {}

# ---------------------------------------------------------------- MCO + diagnóstico
n = 120
x1 = rng.normal(10, 2, n)
x2 = rng.normal(5, 1, n)
u = rng.normal(0, 1, n) * (0.5 + 0.15 * x1)  # heteroscedástico
for t in range(1, n):
    u[t] += 0.4 * u[t - 1]
y = 2 + 0.8 * x1 - 1.5 * x2 + u
X = sm.add_constant(np.column_stack([x1, x2]))
m = sm.OLS(y, X).fit()
mhc = sm.OLS(y, X).fit(cov_type="HC1")
mhac = sm.OLS(y, X).fit(cov_type="HAC", cov_kwds={"maxlags": 4, "use_correction": True})  # convención Stata/EViews
bp = het_breuschpagan(m.resid, X)
wh = het_white(m.resid, X)
bg = acorr_breusch_godfrey(m, nlags=2)
jb = jarque_bera(m.resid)
rs = linear_reset(m, power=3, use_f=True)
fx["ols"] = {
    "y": y.tolist(), "x1": x1.tolist(), "x2": x2.tolist(),
    "beta": m.params.tolist(), "se": m.bse.tolist(), "p": m.pvalues.tolist(),
    "r2": m.rsquared, "adjR2": m.rsquared_adj, "F": m.fvalue, "Fp": m.f_pvalue,
    "aic": m.aic, "bic": m.bic, "llf": m.llf, "dw": float(sm.stats.durbin_watson(m.resid)),
    "seHC1": mhc.bse.tolist(), "FHC1": float(mhc.fvalue),
    "seHAC": mhac.bse.tolist(),
    "bp": [bp[0], bp[1]], "white": [wh[0], wh[1]], "bg": [bg[0], bg[1]],
    "jb": [float(jb[0]), float(jb[1])], "reset": [float(rs.fvalue), float(rs.pvalue)],
    "vif": [variance_inflation_factor(X, j) for j in (1, 2)],
}

# ---------------------------------------------------------------- Series de tiempo
T = 200
e = rng.normal(0, 1, T)
rw = np.cumsum(e) + 50
ar = np.zeros(T)
for t in range(1, T):
    ar[t] = 0.6 * ar[t - 1] + e[t]
fx["ts"] = {"rw": rw.tolist(), "ar": ar.tolist()}
for name, series in (("rw", rw), ("ar", ar)):
    for reg in ("c", "ct", "n"):
        r = adfuller(series, regression=reg, autolag="AIC")
        fx["ts"][f"adf_{name}_{reg}"] = {"stat": r[0], "p": r[1], "lag": r[2], "nobs": r[3],
                                         "crit": [r[4]["1%"], r[4]["5%"], r[4]["10%"]]}
    k = kpss(series, regression="c", nlags="legacy")
    fx["ts"][f"kpss_{name}"] = {"stat": k[0], "lags": k[2]}
fx["ts"]["acf_ar"] = acf(ar, nlags=10).tolist()
fx["ts"]["pacf_ar"] = pacf(ar, nlags=10, method="ldb").tolist()

# ARMA(1,1) para comparar con MLE (tolerancia amplia: CSS vs máxima verosimilitud)
eps = rng.normal(0, 1, 400)
arma = np.zeros(400)
for t in range(1, 400):
    arma[t] = 0.7 * arma[t - 1] + eps[t] + 0.3 * eps[t - 1]
arma += 5
from statsmodels.tsa.arima.model import ARIMA
am = ARIMA(arma, order=(1, 0, 1)).fit()
fx["arma"] = {"y": arma.tolist(), "params": am.params.tolist()}

# ---------------------------------------------------------------- VAR y Granger
Tv = 250
Y = np.zeros((Tv, 2))
ev = rng.normal(0, 1, (Tv, 2))
for t in range(1, Tv):
    Y[t, 0] = 0.5 * Y[t - 1, 0] + 0.2 * Y[t - 1, 1] + ev[t, 0]
    Y[t, 1] = 0.1 * Y[t - 1, 0] + 0.6 * Y[t - 1, 1] + ev[t, 1] + 0.5 * ev[t, 0]
vm = VAR(Y).fit(2)
irf = vm.irf(8)
sel = VAR(Y).select_order(6)
fd = vm.fevd(8)
fx["var"] = {
    "Y": Y.tolist(), "coefs": vm.coefs.tolist(), "intercept": vm.intercept.tolist(),
    "sigma_u": vm.sigma_u.tolist(), "orth_irfs": irf.orth_irfs.tolist(),
    "aic": vm.aic, "bic": vm.bic, "hqic": vm.hqic,
    "select": {"aic": int(sel.aic), "bic": int(sel.bic), "hqic": int(sel.hqic)},
    "fevd": fd.decomp.tolist(),
    "stable_max_root_modulus": float(np.max(np.abs(vm.roots) ** -1)),
}
from statsmodels.tsa.stattools import grangercausalitytests
gc = grangercausalitytests(Y[:, [1, 0]], maxlag=[2])
fx["var"]["granger_0_to_1"] = [gc[2][0]["ssr_ftest"][0], gc[2][0]["ssr_ftest"][1]]

# ---------------------------------------------------------------- Cointegración
xc = np.cumsum(rng.normal(0, 1, 200))
yc = 1 + 2 * xc + rng.normal(0, 1, 200)
cr = coint(yc, xc, trend="c", autolag="aic")
fx["coint"] = {"y": yc.tolist(), "x": xc.tolist(), "stat": cr[0], "p": cr[1], "crit": cr[2].tolist()}

# ---------------------------------------------------------------- MC2E
ni = 300
z1 = rng.normal(0, 1, ni)
z2 = rng.normal(0, 1, ni)
w = rng.normal(0, 1, ni)
v = rng.normal(0, 1, ni)
uu = 0.8 * v + rng.normal(0, 1, ni)
xend = 1 + 0.7 * z1 + 0.5 * z2 + 0.3 * w + v
yiv = 2 + 1.5 * xend - 0.7 * w + uu
Xiv = sm.add_constant(np.column_stack([w, xend]))
Ziv = sm.add_constant(np.column_stack([w, z1, z2]))
ivm = IV2SLS(yiv, Xiv, Ziv).fit()
fx["iv"] = {"y": yiv.tolist(), "w": w.tolist(), "x": xend.tolist(), "z1": z1.tolist(), "z2": z2.tolist(),
            "beta": ivm.params.tolist(), "se": ivm.bse.tolist()}

# ---------------------------------------------------------------- Logit / Probit
nb = 500
inc = rng.normal(3, 1, nb)
edu = rng.integers(0, 18, nb).astype(float)
lat = -4 + 0.8 * inc + 0.15 * edu
yb = (rng.uniform(size=nb) < 1 / (1 + np.exp(-lat))).astype(float)
Xb = sm.add_constant(np.column_stack([inc, edu]))
lg = sm.Logit(yb, Xb).fit(disp=0)
pr = sm.Probit(yb, Xb).fit(disp=0)
fx["binary"] = {
    "y": yb.tolist(), "inc": inc.tolist(), "edu": edu.tolist(),
    "logit": {"beta": lg.params.tolist(), "se": lg.bse.tolist(), "llf": lg.llf, "prsq": lg.prsquared,
              "ame": lg.get_margeff().margeff.tolist(), "ame_se": lg.get_margeff().margeff_se.tolist()},
    "probit": {"beta": pr.params.tolist(), "se": pr.bse.tolist(), "llf": pr.llf,
               "ame": pr.get_margeff().margeff.tolist(), "ame_se": pr.get_margeff().margeff_se.tolist()},
}

# ---------------------------------------------------------------- Panel
from linearmodels.panel import PanelOLS, RandomEffects, compare
Np, Tp = 9, 15
ent = np.repeat(np.arange(Np), Tp)
tim = np.tile(np.arange(Tp), Np)
alpha = rng.normal(0, 2, Np)[ent]
xp1 = rng.normal(0, 1, Np * Tp) + 0.5 * alpha
xp2 = rng.normal(0, 1, Np * Tp)
yp = 1 + alpha + 0.7 * xp1 - 0.4 * xp2 + rng.normal(0, 1, Np * Tp)
df = pd.DataFrame({"y": yp, "x1": xp1, "x2": xp2, "e": ent, "t": tim}).set_index(["e", "t"])
fe = PanelOLS(df.y, df[["x1", "x2"]], entity_effects=True).fit()
re = RandomEffects(df.y, sm.add_constant(df[["x1", "x2"]])).fit()
fx["panel"] = {
    "y": yp.tolist(), "x1": xp1.tolist(), "x2": xp2.tolist(), "e": ent.tolist(), "t": tim.tolist(),
    "fe_beta": fe.params.tolist(), "fe_se": fe.std_errors.tolist(), "fe_r2w": fe.rsquared_within,
    "re_beta": re.params.tolist(), "re_se": re.std_errors.tolist(), "re_theta": float(re.theta.iloc[0, 0]),
}

OUT.write_text(json.dumps(fx))
print("fixtures escritos en", OUT)
