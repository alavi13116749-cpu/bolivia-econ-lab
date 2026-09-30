import type { AnalysisResult } from './run';
import { fmt, fmtP } from '../lib/format';

const sig = (p: number) => (p < 0.01 ? 'al 1%' : p < 0.05 ? 'al 5%' : p < 0.1 ? 'al 10%' : null);

function isLog(term: string) {
  return /^(log|ln)\(/i.test(term) || /^ln_|^log_/i.test(term);
}

/** Interpretación de un coeficiente según la forma funcional (nivel/log). */
function coefMeaning(y: string, x: string, b: number): string {
  const ly = isLog(y);
  const lx = isLog(x);
  if (/\^2$/.test(x)) return `el término cuadrático (${fmt(b)}) indica ${b < 0 ? 'rendimientos decrecientes: el efecto marginal cae a medida que aumenta la variable' : 'un efecto marginal creciente'}.`;
  if (ly && lx) return `un aumento de 1% en ${x} se asocia con una variación de ${fmt(b, 3)}% en ${y} (elasticidad), ceteris paribus.`;
  if (ly && !lx) return `un aumento de una unidad en ${x} se asocia con una variación aproximada de ${fmt(100 * b, 2)}% en ${y} (semielasticidad; el cambio exacto es ${fmt(100 * (Math.exp(b) - 1), 2)}%).`;
  if (!ly && lx) return `un aumento de 1% en ${x} se asocia con un cambio de ${fmt(b / 100, 4)} unidades en ${y}.`;
  return `un aumento de una unidad en ${x} se asocia con un cambio de ${fmt(b)} unidades en ${y}, manteniendo lo demás constante.`;
}

export function interpret(r: AnalysisResult): string {
  const out: string[] = [];
  switch (r.kind) {
    case 'describe': {
      const high = [] as string[];
      r.corr.names.forEach((a, i) => r.corr.names.forEach((b, j) => { if (j > i && Math.abs(r.corr.m[i][j]) > 0.8) high.push(`${a}–${b} (${fmt(r.corr.m[i][j], 2)})`); }));
      out.push(`- Se describen ${r.rows.length} variables.`);
      const skewed = r.rows.filter((x) => Math.abs(x.skew) > 1).map((x) => x.name);
      if (skewed.length) out.push(`- Distribuciones muy asimétricas: **${skewed.join(', ')}**. Considere trabajar en logaritmos.`);
      if (high.length) out.push(`- Correlaciones altas (|r| > 0,8): ${high.join(', ')}. Si entran juntas en una regresión, revise el VIF.`);
      break;
    }
    case 'ols': {
      const { res, tests, spec } = r;
      out.push(`**Ajuste.** El modelo explica el ${(res.r2 * 100).toFixed(1)}% de la variación de ${res.yName} (R² ajustado ${fmt(res.adjR2, 3)}). La prueba F global ${res.Fp < 0.05 ? `rechaza (p = ${fmtP(res.Fp)}) que todos los coeficientes sean cero` : `no rechaza que todos los coeficientes sean cero (p = ${fmtP(res.Fp)})`}.`);
      out.push('**Coeficientes.**');
      res.table.forEach((c, i) => {
        if (i === 0 && c.name === 'const') return;
        const s = sig(c.p);
        out.push(`- **${c.name}**: ${s ? `significativo ${s}` : `no significativo (p = ${fmtP(c.p)})`}; ${coefMeaning(spec.y, c.name, c.coef)}`);
      });
      const failed = tests.filter((t) => t.rejects);
      if (failed.length) {
        out.push('**Problemas detectados.**');
        for (const t of failed) out.push(`- ${t.name}: ${t.conclusion}`);
        if (failed.some((t) => t.id === 'bp' || t.id === 'white') && res.covType === 'classic') out.push('- Sugerencia: vuelva a estimar con errores **HC1**.');
        if (failed.some((t) => t.id === 'bg') && res.covType !== 'HAC') out.push('- Sugerencia: use errores **Newey-West (HAC)** o modele la dinámica con rezagos.');
      } else out.push('**Diagnóstico.** Ninguna prueba rechaza sus supuestos al 5%.');
      const highVif = r.vif.filter((v) => v.vif > 10);
      if (highVif.length) out.push(`- Multicolinealidad fuerte (VIF > 10): ${highVif.map((v) => v.name).join(', ')}. Los errores estándar están inflados.`);
      if (res.r2 > res.dw && res.dw < 1) out.push(`- **Alerta de regresión espuria**: R² (${fmt(res.r2, 3)}) > Durbin-Watson (${fmt(res.dw, 3)}). Verifique raíces unitarias antes de interpretar.`);
      break;
    }
    case 'binary': {
      const { res } = r;
      out.push(`**Ajuste.** Pseudo-R² de McFadden = ${fmt(res.pseudoR2, 3)}; la prueba LR ${res.lrP < 0.05 ? 'confirma' : 'no confirma'} la significancia conjunta (p = ${fmtP(res.lrP)}). El modelo clasifica bien el ${(res.classification.accuracy * 100).toFixed(1)}% de los casos.`);
      out.push('**Efectos marginales promedio** (lo que se interpreta; los coeficientes sólo dan signo):');
      for (const a of res.ame) {
        const s = sig(a.p);
        out.push(`- **${a.name}**: un aumento de una unidad cambia la probabilidad en ${fmt(a.effect * 100, 2)} puntos porcentuales${s ? ` (significativo ${s})` : ' (no significativo)'}.`);
      }
      if (res.oddsRatios) {
        const j = res.names.findIndex((_, i) => i > 0 && res.p[i] < 0.05);
        if (j > 0) out.push(`- Razón de probabilidades de **${res.names[j]}**: ${fmt(res.oddsRatios[j], 3)} → las odds se multiplican por ese factor por cada unidad adicional.`);
      }
      out.push('- Los AME del Logit y del Probit suelen ser muy parecidos y cercanos a los del MPL; los coeficientes no son comparables directamente (en Logit ≈ 1,6 × Probit).');
      break;
    }
    case 'iv': {
      const { res } = r;
      const endo = r.spec.endog;
      endo.forEach((e) => {
        const j = res.main.names.indexOf(e);
        const jo = res.olsComparison.names.indexOf(e);
        out.push(`- **${e}**: MC2E = ${fmt(res.main.beta[j])} vs MCO = ${fmt(res.olsComparison.beta[jo])}. La diferencia refleja el sesgo de simultaneidad/endogeneidad que corrige MC2E.`);
      });
      for (const f of res.firstStage) out.push(`- Relevancia: F de primera etapa para ${f.endog} = ${fmt(f.F, 1)}${f.weak ? ' **< 10: instrumentos débiles**, MC2E puede estar sesgado hacia MCO' : ' (> 10, instrumentos relevantes)'}.`);
      out.push(`- Endogeneidad (Hausman): ${res.hausman.conclusion}`);
      if (res.sargan) out.push(`- Validez (Sargan): ${res.sargan.conclusion}`);
      break;
    }
    case 'panel': {
      const { res, spec } = r;
      out.push(`- ${res.fTestFE.conclusion}`);
      out.push(`- ${res.bpLM.conclusion}`);
      out.push(`- **Hausman**: ${res.hausman.conclusion}`);
      for (const x of spec.x) {
        const jp = res.pooled.names.indexOf(x);
        const jf = res.fe.names.indexOf(x);
        out.push(`- **${x}**: agrupado ${fmt(res.pooled.beta[jp], 3)}, EF ${fmt(res.fe.beta[jf], 3)}, EA ${fmt(res.re.beta[jf], 3)}.`);
      }
      out.push(`- ρ = ${fmt(res.fe.rho, 3)}: el ${(res.fe.rho * 100).toFixed(0)}% de la varianza del error se debe a los efectos individuales.`);
      break;
    }
    case 'unitroot': {
      const { levels, diff, kpssLevels } = r;
      const order = levels.rejects ? 0 : diff.rejects ? 1 : 2;
      out.push(`- **ADF en niveles**: ${levels.conclusion}`);
      out.push(`- **ADF en diferencias**: ${diff.conclusion}`);
      out.push(`- **KPSS (H0 opuesta: estacionariedad)**: ${kpssLevels.conclusion}`);
      const agree = (levels.rejects && !kpssLevels.rejects) || (!levels.rejects && kpssLevels.rejects);
      out.push(`- ${agree ? 'ADF y KPSS coinciden, la conclusión es robusta.' : 'ADF y KPSS no coinciden: la evidencia es ambigua (baja potencia o quiebres estructurales). Reporte ambas.'}`);
      out.push(`- **Conclusión:** la serie es **I(${order})**${order === 1 ? '. Para regresiones use diferencias o evalúe cointegración con otras series I(1).' : '.'}`);
      break;
    }
    case 'correlogram': {
      const sigA = r.acf.slice(1).map((v, i) => [i + 1, v] as const).filter(([, v]) => Math.abs(v) > r.band);
      const sigP = r.pacf.slice(1).map((v, i) => [i + 1, v] as const).filter(([, v]) => Math.abs(v) > r.band);
      const slowDecay = r.acf[1] > 0.9 && r.acf[Math.min(10, r.acf.length - 1)] > 0.5;
      if (slowDecay) out.push('- La FAC decae muy lentamente: señal típica de **raíz unitaria**. Diferencie la serie antes de identificar un ARMA.');
      out.push(`- FAC significativa en rezagos: ${sigA.map(([k]) => k).join(', ') || 'ninguno'}.`);
      out.push(`- FACP significativa en rezagos: ${sigP.map(([k]) => k).join(', ') || 'ninguno'}.`);
      if (!slowDecay) {
        const lastP = sigP.length ? Math.max(...sigP.filter(([k]) => k <= 4).map(([k]) => k), 0) : 0;
        const lastA = sigA.length ? Math.max(...sigA.filter(([k]) => k <= 4).map(([k]) => k), 0) : 0;
        if (lastP > 0 && sigA.length > lastP) out.push(`- Patrón sugerido: FACP se corta en ${lastP} y FAC decae → candidato **AR(${lastP})**.`);
        else if (lastA > 0 && sigP.length > lastA) out.push(`- Patrón sugerido: FAC se corta en ${lastA} y FACP decae → candidato **MA(${lastA})**.`);
        else if (lastA > 0 && lastP > 0) out.push('- Ambas decaen gradualmente → candidato **ARMA(1,1)**; compare AIC/BIC.');
      }
      out.push(`- Ljung-Box: ${r.lb.p < 0.05 ? 'se rechaza ruido blanco' : 'no se rechaza ruido blanco'} (p = ${fmtP(r.lb.p)}).`);
      break;
    }
    case 'arima': {
      const { res } = r;
      out.push(`- ${res.stationary ? 'La parte AR es estacionaria' : 'La parte AR NO es estacionaria: aumente d'}; ${res.invertible ? 'la parte MA es invertible' : 'la parte MA no es invertible'}.`);
      out.push(`- Residuos: ${res.ljungBox.p < 0.05 ? '**no son ruido blanco** (Ljung-Box p < 0,05). Pruebe otro orden.' : 'compatibles con ruido blanco (Ljung-Box p ≥ 0,05). El modelo captura la dinámica.'}`);
      out.push(`- Compare AIC = ${fmt(res.aic, 2)} y BIC = ${fmt(res.bic, 2)} con órdenes alternativos: el menor es preferible (BIC penaliza más la complejidad).`);
      out.push('- Las bandas de pronóstico (95%) se ensanchan con el horizonte; en modelos con d ≥ 1 crecen sin límite.');
      break;
    }
    case 'var': {
      const { res, granger, spec } = r;
      out.push(`- Se usó p = ${res.p} rezagos (AIC sugiere ${r.selection.best.aic}, BIC ${r.selection.best.bic}). ${res.stableRadius < 1 ? 'El VAR es **estable**: los shocks se disipan.' : '**El VAR no es estable**: revise estacionariedad de las series.'}`);
      const sigG = granger.filter((g) => g.rejects);
      out.push(sigG.length ? `- Causalidad de Granger significativa: ${sigG.map((g) => `${g.cause} → ${g.effect}`).join('; ')}.` : '- No hay causalidad de Granger significativa al 5%.');
      out.push(`- Las IRF usan Cholesky con el orden **${spec.variables.join(' → ')}**: la primera variable no responde contemporáneamente a las demás. Cambiar el orden puede cambiar las respuestas.`);
      out.push('- Recuerde: causalidad de Granger = precedencia predictiva, no causalidad estructural.');
      break;
    }
    case 'coint': {
      const { eg, model } = r;
      const i1 = r.orders.filter((o) => !o.levels.rejects && o.diff.rejects).map((o) => o.name);
      out.push(`- Series I(1) según ADF: ${i1.join(', ') || 'ninguna'}. Engle-Granger requiere que todas sean I(1).`);
      out.push(`- ${eg.conclusion}`);
      out.push('- Ojo: los valores críticos no son los de Dickey-Fuller estándar, sino los de MacKinnon para residuos de cointegración (más exigentes).');
      if (eg.rejects) {
        out.push(`- **Largo plazo**: ` + eg.longRun.table.slice(1).map((c) => `${c.name} = ${fmt(c.coef, 3)}`).join(', ') + ' (los errores estándar de esta etapa no son válidos para inferencia).');
        out.push(`- **Ajuste**: γ = ${fmt(model.gamma, 3)} ${model.gamma < 0 ? `(negativo, como se espera): cada período se corrige el ${(Math.abs(model.gamma) * 100).toFixed(1)}% del desequilibrio${Number.isFinite(model.halfLife) ? `; vida media ≈ ${fmt(model.halfLife, 1)} períodos` : ''}.` : '(positivo: no hay corrección hacia el equilibrio, revise la especificación).'}`);
      }
      break;
    }
  }
  return out.join('\n');
}
