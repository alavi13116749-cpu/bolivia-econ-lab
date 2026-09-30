import type { AnalysisSpec } from './run';

export type Lang = 'stata' | 'r' | 'python' | 'eviews';
export const LANGS: { id: Lang; label: string }[] = [
  { id: 'stata', label: 'Stata' },
  { id: 'r', label: 'R' },
  { id: 'python', label: 'Python' },
  { id: 'eviews', label: 'EViews' },
];

// Traducción de términos del mini-lenguaje a cada software.
function stataTerm(t: string): { expr: string; gen?: string } {
  const safe = t.replace(/[^A-Za-z0-9_]/g, '_').replace(/_+/g, '_').replace(/_$/, '');
  let m = t.match(/^(log|ln)\((\w+)\)$/);
  if (m) return { expr: `ln_${m[2]}`, gen: `gen ln_${m[2]} = ln(${m[2]})` };
  m = t.match(/^d\((\w+)\)$/);
  if (m) return { expr: `D.${m[1]}` };
  m = t.match(/^lag\((\w+),?\s*(\d*)\)$/);
  if (m) return { expr: `L${m[2] || 1}.${m[1]}` };
  m = t.match(/^(\w+)\^2$/);
  if (m) return { expr: `c.${m[1]}#c.${m[1]}` };
  if (/[()^*]/.test(t)) return { expr: safe, gen: `gen ${safe} = ${t}` };
  return { expr: t };
}

function rTerm(t: string): string {
  let m = t.match(/^(log|ln)\((\w+)\)$/);
  if (m) return `log(${m[2]})`;
  m = t.match(/^d\((\w+)\)$/);
  if (m) return `diff(${m[1]})`;
  m = t.match(/^lag\((\w+),?\s*(\d*)\)$/);
  if (m) return `lag(${m[1]}, ${m[2] || 1})`;
  m = t.match(/^(\w+)\^(\d+)$/);
  if (m) return `I(${m[1]}^${m[2]})`;
  return t.replace(/\*/g, ':');
}

function pyTerm(t: string): string {
  let m = t.match(/^(log|ln)\((\w+)\)$/);
  if (m) return `np.log(${m[2]})`;
  m = t.match(/^d\((\w+)\)$/);
  if (m) return `${m[1]}.diff()`;
  m = t.match(/^lag\((\w+),?\s*(\d*)\)$/);
  if (m) return `${m[1]}.shift(${m[2] || 1})`;
  m = t.match(/^(\w+)\^(\d+)$/);
  if (m) return `I(${m[1]}**${m[2]})`;
  return t.replace(/\*/g, ':');
}

function evTerm(t: string): string {
  let m = t.match(/^(log|ln)\((\w+)\)$/);
  if (m) return `log(${m[2]})`;
  m = t.match(/^d\((\w+)\)$/);
  if (m) return `d(${m[1]})`;
  m = t.match(/^lag\((\w+),?\s*(\d*)\)$/);
  if (m) return `${m[1]}(-${m[2] || 1})`;
  return t;
}

export function generateCode(spec: AnalysisSpec, lang: Lang, file = 'datos.csv'): string {
  const header = {
    stata: `* Generado por Bolivia Econ Lab\nimport delimited "${file}", clear`,
    r: `# Generado por Bolivia Econ Lab\ndatos <- read.csv("${file}")`,
    python: `# Generado por Bolivia Econ Lab\nimport numpy as np\nimport pandas as pd\nimport statsmodels.api as sm\nimport statsmodels.formula.api as smf\ndatos = pd.read_csv("${file}")`,
    eviews: `' Generado por Bolivia Econ Lab\nimport "${file}"`,
  }[lang];
  const body = ((): string => {
    switch (spec.kind) {
      case 'describe': {
        const v = spec.variables?.join(' ') ?? '';
        return { stata: `summarize ${v}, detail\ncorrelate ${v}`, r: `summary(datos)\ncor(datos, use = "complete.obs")`, python: `print(datos.describe())\nprint(datos.corr())`, eviews: `group g ${v || '*'}\ng.stats\ng.cor` }[lang];
      }
      case 'ols': {
        const cov = spec.covType ?? 'classic';
        if (lang === 'stata') {
          const ts = [spec.y, ...spec.x].map(stataTerm);
          const gens = ts.filter((t) => t.gen).map((t) => t.gen).join('\n');
          const opt = cov === 'HC1' ? ', vce(robust)' : '';
          const cmd = cov === 'HAC' ? `newey ${ts[0].expr} ${ts.slice(1).map((t) => t.expr).join(' ')}, lag(${spec.hacLags ?? 4})` : `regress ${ts[0].expr} ${ts.slice(1).map((t) => t.expr).join(' ')}${opt}`;
          return [gens, '* tsset t   // si es serie de tiempo', cmd, 'estat hettest      // Breusch-Pagan', 'estat imtest, white', 'estat bgodfrey, lags(2)', 'estat ovtest       // RESET', 'estat vif'].filter(Boolean).join('\n');
        }
        if (lang === 'r') {
          const f = `${rTerm(spec.y)} ~ ${spec.x.map(rTerm).join(' + ')}`;
          const se = cov === 'HC1' ? 'coeftest(m, vcov = vcovHC(m, type = "HC1"))' : cov === 'HAC' ? `coeftest(m, vcov = NeweyWest(m, lag = ${spec.hacLags ?? 4}, prewhite = FALSE))` : 'summary(m)';
          return `library(lmtest); library(sandwich); library(car)\nm <- lm(${f}, data = datos)\n${se}\nbptest(m)                 # Breusch-Pagan (Koenker)\nbgtest(m, order = 2)      # Breusch-Godfrey\nresettest(m, power = 2:3) # RESET\nvif(m)`;
        }
        if (lang === 'python') {
          const f = `${pyTerm(spec.y)} ~ ${spec.x.map(pyTerm).join(' + ')}`;
          const fit = cov === 'HC1' ? `.fit(cov_type="HC1")` : cov === 'HAC' ? `.fit(cov_type="HAC", cov_kwds={"maxlags": ${spec.hacLags ?? 4}, "use_correction": True})` : '.fit()';
          return `from statsmodels.stats.diagnostic import het_breuschpagan, acorr_breusch_godfrey, linear_reset\nm = smf.ols("${f}", data=datos)${fit}\nprint(m.summary())\nprint(het_breuschpagan(m.resid, m.model.exog))\nprint(acorr_breusch_godfrey(m, nlags=2))\nprint(linear_reset(m, power=3, use_f=True))`;
        }
        const opt = cov === 'HC1' ? '(cov=white)' : cov === 'HAC' ? '(cov=hac)' : '';
        return `equation eq1.ls${opt} ${evTerm(spec.y)} c ${spec.x.map(evTerm).join(' ')}\neq1.hettest(type=bpg) @regs\neq1.white\neq1.auto(2)\neq1.reset(2)`;
      }
      case 'binary': {
        const L = spec.link;
        return {
          stata: `${L} ${spec.y} ${spec.x.join(' ')}\nmargins, dydx(*)        // efectos marginales promedio\n${L === 'logit' ? 'logit, or               // razones de odds\n' : ''}estat classification`,
          r: `m <- glm(${spec.y} ~ ${spec.x.map(rTerm).join(' + ')}, family = binomial(link = "${L}"), data = datos)\nsummary(m)\nlibrary(margins); summary(margins(m))`,
          python: `m = smf.${L}("${spec.y} ~ ${spec.x.map(pyTerm).join(' + ')}", data=datos).fit()\nprint(m.summary())\nprint(m.get_margeff().summary())`,
          eviews: `equation eq1.binary(d=${L === 'logit' ? 'l' : 'n'}) ${spec.y} c ${spec.x.join(' ')}\neq1.expfit`,
        }[lang];
      }
      case 'iv':
        return {
          stata: `ivregress 2sls ${spec.y} ${spec.exog.join(' ')} (${spec.endog.join(' ')} = ${spec.instruments.join(' ')})${spec.covType === 'HC1' ? ', vce(robust)' : ''}\nestat firststage\nestat endogenous\nestat overid`,
          r: `library(AER)\nm <- ivreg(${spec.y} ~ ${[...spec.exog, ...spec.endog].join(' + ')} | ${[...spec.exog, ...spec.instruments].join(' + ')}, data = datos)\nsummary(m, diagnostics = TRUE)`,
          python: `from linearmodels.iv import IV2SLS\nm = IV2SLS.from_formula("${spec.y} ~ 1 ${spec.exog.map((e) => '+ ' + e).join(' ')} + [${spec.endog.join(' + ')} ~ ${spec.instruments.join(' + ')}]", data=datos).fit(cov_type="unadjusted")\nprint(m.summary)\nprint(m.first_stage)\nprint(m.wu_hausman())\nprint(m.sargan)`,
          eviews: `equation eq1.tsls ${spec.y} c ${[...spec.exog, ...spec.endog].join(' ')} @ c ${[...spec.exog, ...spec.instruments].join(' ')}`,
        }[lang];
      case 'panel':
        return {
          stata: `encode departamento, gen(id)\nxtset id anio\nxtreg ${spec.y} ${spec.x.join(' ')}, fe\nestimates store fe\nxtreg ${spec.y} ${spec.x.join(' ')}, re\nestimates store re\nxttest0            // LM de Breusch-Pagan\nhausman fe re`,
          r: `library(plm)\npd <- pdata.frame(datos, index = c("departamento", "anio"))\nfe <- plm(${spec.y} ~ ${spec.x.join(' + ')}, data = pd, model = "within")\nre <- plm(${spec.y} ~ ${spec.x.join(' + ')}, data = pd, model = "random")\nphtest(fe, re)   # Hausman\nplmtest(plm(${spec.y} ~ ${spec.x.join(' + ')}, data = pd, model = "pooling"), type = "bp")`,
          python: `from linearmodels.panel import PanelOLS, RandomEffects\nd = datos.set_index(["departamento", "anio"])\nfe = PanelOLS.from_formula("${spec.y} ~ ${spec.x.join(' + ')} + EntityEffects", d).fit()\nre = RandomEffects.from_formula("${spec.y} ~ 1 + ${spec.x.join(' + ')}", d).fit()\nprint(fe, re)`,
          eviews: `' Estructure el workfile como panel (departamento, anio)\nequation fe.ls(cx=f) ${spec.y} c ${spec.x.join(' ')}\nequation re.ls(cx=r) ${spec.y} c ${spec.x.join(' ')}\nre.ranhaus`,
        }[lang];
      case 'unitroot': {
        const reg = spec.regression ?? 'c';
        return {
          stata: `tsset t\ndfuller ${spec.variable}, ${reg === 'ct' ? 'trend ' : reg === 'n' ? 'noconstant ' : ''}lags(4) regress\ndfuller D.${spec.variable}, lags(4)\n* ssc install kpss\nkpss ${spec.variable}`,
          r: `library(urca)\nsummary(ur.df(datos$${spec.variable}, type = "${reg === 'n' ? 'none' : reg === 'c' ? 'drift' : 'trend'}", selectlags = "AIC"))\nsummary(ur.kpss(datos$${spec.variable}, type = "${reg === 'ct' ? 'tau' : 'mu'}"))`,
          python: `from statsmodels.tsa.stattools import adfuller, kpss\nprint(adfuller(datos["${spec.variable}"], regression="${reg}", autolag="AIC"))\nprint(adfuller(datos["${spec.variable}"].diff().dropna(), regression="c", autolag="AIC"))\nprint(kpss(datos["${spec.variable}"], regression="${reg === 'ct' ? 'ct' : 'c'}", nlags="legacy"))`,
          eviews: `${spec.variable}.uroot(adf, ${reg === 'ct' ? 'trend' : reg === 'n' ? 'none' : 'const'}, info=aic)\n${spec.variable}.uroot(adf, dif=1, info=aic)\n${spec.variable}.uroot(kpss)`,
        }[lang];
      }
      case 'correlogram':
        return {
          stata: `tsset t\ncorrgram ${spec.variable}, lags(${spec.lags ?? 20})\nac ${spec.variable}\npac ${spec.variable}`,
          r: `acf(datos$${spec.variable}, lag.max = ${spec.lags ?? 20})\npacf(datos$${spec.variable}, lag.max = ${spec.lags ?? 20})\nBox.test(datos$${spec.variable}, lag = 12, type = "Ljung-Box")`,
          python: `from statsmodels.graphics.tsaplots import plot_acf, plot_pacf\nfrom statsmodels.stats.diagnostic import acorr_ljungbox\nplot_acf(datos["${spec.variable}"], lags=${spec.lags ?? 20}); plot_pacf(datos["${spec.variable}"], lags=${spec.lags ?? 20}, method="ldb")\nprint(acorr_ljungbox(datos["${spec.variable}"], lags=[12]))`,
          eviews: `${spec.variable}.correl(${spec.lags ?? 20})`,
        }[lang];
      case 'arima':
        return {
          stata: `tsset t\narima ${spec.variable}, arima(${spec.p},${spec.d},${spec.q})\npredict res, residuals\nwntestq res\npredict fc, y dynamic(.) `,
          r: `library(forecast)\nm <- Arima(datos$${spec.variable}, order = c(${spec.p},${spec.d},${spec.q}), include.constant = ${spec.constant === false ? 'FALSE' : 'TRUE'}, method = "CSS")\nsummary(m)\ncheckresiduals(m)\nforecast(m, h = ${spec.horizon ?? 8})`,
          python: `from statsmodels.tsa.arima.model import ARIMA\nm = ARIMA(datos["${spec.variable}"], order=(${spec.p},${spec.d},${spec.q})).fit()\nprint(m.summary())\nprint(m.get_forecast(${spec.horizon ?? 8}).summary_frame())`,
          eviews: `equation eq1.ls ${spec.d ? `d(${spec.variable}${spec.d > 1 ? `,${spec.d}` : ''})` : spec.variable} c ${Array.from({ length: spec.p }, (_, i) => `ar(${i + 1})`).join(' ')} ${Array.from({ length: spec.q }, (_, i) => `ma(${i + 1})`).join(' ')}\neq1.correlogram(12)`,
        }[lang];
      case 'var': {
        const v = spec.variables.join(' ');
        const p = spec.p ?? 2;
        return {
          stata: `tsset t\nvarsoc ${v}, maxlag(${spec.maxlags ?? 8})\nvar ${v}, lags(1/${p})\nvarstable\nvargranger\nirf create r1, set(irfs) step(${spec.horizon ?? 12}) replace\nirf graph oirf\nirf table fevd`,
          r: `library(vars)\nY <- datos[, c(${spec.variables.map((x) => `"${x}"`).join(', ')})]\nVARselect(Y, lag.max = ${spec.maxlags ?? 8})\nm <- VAR(Y, p = ${p})\nsummary(m); roots(m)\ncausality(m, cause = "${spec.variables[0]}")\nplot(irf(m, n.ahead = ${spec.horizon ?? 12}, ortho = TRUE))\nfevd(m, n.ahead = ${spec.horizon ?? 12})`,
          python: `from statsmodels.tsa.api import VAR\nm = VAR(datos[[${spec.variables.map((x) => `"${x}"`).join(', ')}]])\nprint(m.select_order(${spec.maxlags ?? 8}).summary())\nr = m.fit(${p})\nprint(r.summary()); print(r.is_stable())\nr.irf(${spec.horizon ?? 12}).plot(orth=True)\nr.fevd(${spec.horizon ?? 12}).summary()`,
          eviews: `var v1.ls 1 ${p} ${v}\nv1.laglen(${spec.maxlags ?? 8})\nv1.arroots\nv1.testexog\nv1.impulse(${spec.horizon ?? 12}, imp=chol)\nv1.decomp(${spec.horizon ?? 12})`,
        }[lang];
      }
      case 'coint':
        return {
          stata: `tsset t\nregress ${spec.y} ${spec.x.join(' ')}\npredict u, residuals\ndfuller u, noconstant lags(4)   // ¡use críticos de MacKinnon para cointegración!\nregress D.${spec.y} ${spec.x.map((x) => 'D.' + x).join(' ')} L.u`,
          r: `library(urca)\nlr <- lm(${spec.y} ~ ${spec.x.join(' + ')}, data = datos)\nsummary(ur.df(residuals(lr), type = "none", selectlags = "AIC"))\nu <- residuals(lr)\necm <- lm(diff(${spec.y}) ~ ${spec.x.map((x) => `diff(${x})`).join(' + ')} + head(u, -1), data = datos)\nsummary(ecm)`,
          python: `from statsmodels.tsa.stattools import coint\nprint(coint(datos["${spec.y}"], datos[[${spec.x.map((x) => `"${x}"`).join(', ')}]], trend="c", autolag="aic"))\nlr = smf.ols("${spec.y} ~ ${spec.x.join(' + ')}", data=datos).fit()\ndatos["u"] = lr.resid\necm = smf.ols("${spec.y}.diff() ~ ${spec.x.map((x) => `${x}.diff()`).join(' + ')} + u.shift(1)", data=datos).fit()\nprint(ecm.summary())`,
          eviews: `equation lr.ls ${spec.y} c ${spec.x.join(' ')}\nlr.coint(method=eg)\nlr.makeresids u\nequation ecm.ls d(${spec.y}) c ${spec.x.map((x) => `d(${x})`).join(' ')} u(-1)`,
        }[lang];
    }
  })();
  return `${header}\n\n${body}\n`;
}
