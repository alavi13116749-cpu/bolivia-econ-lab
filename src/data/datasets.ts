import { RNG } from '../engine/random';

export type Frequency = 'trimestral' | 'mensual' | 'anual' | 'corte transversal' | 'panel';

export interface Dataset {
  id: string;
  name: string;
  description: string;
  /** Procedencia, siempre visible: los datos simulados nunca se presentan como oficiales. */
  source: 'simulado' | 'Banco Mundial (en vivo)' | 'importado';
  frequency: Frequency;
  columns: string[];
  data: Record<string, number[]>;
  labels: Record<string, string>;
  /** Etiquetas de período (series de tiempo) o de observación. */
  index?: string[];
  panel?: { entity: string[]; time: string[] };
  /** Ejercicios sugeridos para el Lab. */
  exercises: { title: string; hint: string }[];
  course: 'econometria' | 'monetaria' | 'ambos';
}

function quarters(startYear: number, n: number): string[] {
  return Array.from({ length: n }, (_, i) => `${startYear + Math.floor(i / 4)}T${(i % 4) + 1}`);
}
function months(startYear: number, n: number): string[] {
  const m = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return Array.from({ length: n }, (_, i) => `${m[i % 12]}-${String(startYear + Math.floor(i / 12)).slice(2)}`);
}
const round = (x: number, d = 4) => Math.round(x * 10 ** d) / 10 ** d;

/** Demanda de dinero trimestral: ln(M1/P) cointegrado con ln(PIB) y la tasa de interés. */
function moneyDemand(): Dataset {
  const rng = new RNG(1985);
  const n = 80;
  const lnY: number[] = [];
  const i: number[] = [];
  const pi: number[] = [];
  const lnM: number[] = [];
  const bol: number[] = [];
  const tc: number[] = [];
  let y = 10.6;
  let r = 9;
  let inf = 4.5;
  let u = 0;
  for (let t = 0; t < n; t++) {
    y += 0.011 + rng.normal(0, 0.009);
    r = 7 + 0.85 * (r - 7) + rng.normal(0, 0.45);
    inf = 4 + 0.7 * (inf - 4) + rng.normal(0, 0.9) + (t >= 12 && t <= 15 ? 2.2 : 0); // pico de precios de alimentos 2008
    u = 0.55 * u + rng.normal(0, 0.035);
    lnY.push(round(y));
    i.push(round(r, 3));
    pi.push(round(inf, 3));
    lnM.push(round(-2.1 + 1.12 * y - 0.028 * r + u));
    // bolivianización de depósitos: logística estilizada
    bol.push(round(100 / (1 + Math.exp(-(t - 22) / 9)) * 0.86 + 8 + rng.normal(0, 0.6), 2));
    // tipo de cambio oficial estilizado: apreciación gradual y fijación en 6.96
    const year = 2005 + t / 4;
    tc.push(round(year < 2011.75 ? 8.08 - (8.08 - 6.96) * ((year - 2005) / 6.75) ** 0.9 : 6.96, 3));
  }
  return {
    id: 'dinero', name: 'Demanda de dinero (trimestral)',
    description: 'Serie trimestral 2005T1–2024T4 con saldos reales M1, PIB real, tasa de interés, inflación, bolivianización y tipo de cambio. Simulada con una relación de cointegración conocida (elasticidad ingreso = 1.12, semielasticidad tasa = −0.028) para practicar raíces unitarias, cointegración y MCE. La trayectoria del tipo de cambio imita el régimen boliviano (apreciación deslizante y fijación en Bs 6,96).',
    source: 'simulado', frequency: 'trimestral', course: 'ambos',
    columns: ['ln_m1_real', 'ln_pib', 'tasa_interes', 'inflacion', 'bolivianizacion', 'tipo_cambio'],
    data: { ln_m1_real: lnM, ln_pib: lnY, tasa_interes: i, inflacion: pi, bolivianizacion: bol, tipo_cambio: tc },
    labels: {
      ln_m1_real: 'Log de saldos reales M1', ln_pib: 'Log del PIB real', tasa_interes: 'Tasa de interés pasiva (%)',
      inflacion: 'Inflación interanual (%)', bolivianizacion: 'Depósitos en MN (% del total)', tipo_cambio: 'Tipo de cambio oficial (Bs/USD)',
    },
    index: quarters(2005, n),
    exercises: [
      { title: 'Orden de integración', hint: 'Aplique ADF a ln_m1_real y ln_pib en niveles y en diferencias.' },
      { title: 'Cointegración de Engle-Granger', hint: 'ln_m1_real sobre ln_pib y tasa_interes; pruebe raíz unitaria en los residuos.' },
      { title: 'Modelo de corrección de errores', hint: 'Estime el MCE y calcule la vida media del desequilibrio.' },
    ],
  };
}

/** Acceso al crédito de hogares (corte transversal) para Logit/Probit. */
function credit(): Dataset {
  const rng = new RNG(2012);
  const n = 1200;
  const cols = { acceso_credito: [] as number[], ingreso: [] as number[], educacion: [] as number[], urbano: [] as number[], mujer: [] as number[], edad: [] as number[], cuenta_bancaria: [] as number[] };
  for (let k = 0; k < n; k++) {
    const urb = rng.bernoulli(0.7);
    const edu = Math.max(0, Math.min(20, Math.round(rng.normal(urb ? 11 : 7, 3.5))));
    const ing = round(Math.exp(rng.normal(0.9 + 0.06 * edu + 0.25 * urb, 0.5)), 3); // miles de Bs/mes
    const muj = rng.bernoulli(0.5);
    const ed = Math.round(Math.max(18, Math.min(75, rng.normal(40, 12))));
    const cta = rng.bernoulli(1 / (1 + Math.exp(-(-1.2 + 0.12 * edu + 0.6 * urb))));
    const lat = -3.4 + 0.9 * Math.log(ing) + 0.09 * edu + 0.45 * urb - 0.25 * muj + 0.07 * ed - 0.0008 * ed * ed + 0.9 * cta;
    const y = rng.uniform() < 1 / (1 + Math.exp(-lat)) ? 1 : 0;
    cols.acceso_credito.push(y); cols.ingreso.push(ing); cols.educacion.push(edu); cols.urbano.push(urb);
    cols.mujer.push(muj); cols.edad.push(ed); cols.cuenta_bancaria.push(cta);
  }
  return {
    id: 'credito', name: 'Acceso al crédito de hogares',
    description: 'Corte transversal simulado de 1.200 hogares, inspirado en la estructura de las Encuestas de Hogares del INE: acceso a crédito (1/0), ingreso mensual (miles de Bs), años de educación, área urbana, sexo del jefe de hogar, edad y tenencia de cuenta bancaria.',
    source: 'simulado', frequency: 'corte transversal', course: 'econometria',
    columns: Object.keys(cols), data: cols,
    labels: {
      acceso_credito: 'Obtuvo crédito en el último año (1 = sí)', ingreso: 'Ingreso mensual del hogar (miles de Bs)', educacion: 'Años de educación del jefe de hogar',
      urbano: 'Área urbana (1 = sí)', mujer: 'Jefa de hogar mujer (1 = sí)', edad: 'Edad del jefe de hogar', cuenta_bancaria: 'Tiene cuenta bancaria (1 = sí)',
    },
    exercises: [
      { title: 'MPL vs Logit vs Probit', hint: 'Compare los efectos marginales promedio de educacion en los tres modelos.' },
      { title: 'Razón de probabilidades', hint: 'Interprete exp(β) de cuenta_bancaria en el Logit.' },
    ],
  };
}

/** Ecuación de salarios con heteroscedasticidad. */
function wages(): Dataset {
  const rng = new RNG(777);
  const n = 600;
  const c = { ln_salario: [] as number[], educacion: [] as number[], experiencia: [] as number[], mujer: [] as number[], informal: [] as number[], urbano: [] as number[] };
  for (let k = 0; k < n; k++) {
    const edu = Math.max(0, Math.min(22, Math.round(rng.normal(10, 4))));
    const exp = Math.max(0, Math.round(rng.normal(15, 9)));
    const muj = rng.bernoulli(0.45);
    const inf = rng.bernoulli(1 / (1 + Math.exp(-(1.8 - 0.18 * edu))));
    const urb = rng.bernoulli(0.68);
    const sd = 0.18 + 0.028 * edu; // varianza creciente con la educación
    const y = 6.9 + 0.082 * edu + 0.031 * exp - 0.00052 * exp * exp - 0.17 * muj - 0.28 * inf + 0.12 * urb + rng.normal(0, sd);
    c.ln_salario.push(round(y)); c.educacion.push(edu); c.experiencia.push(exp); c.mujer.push(muj); c.informal.push(inf); c.urbano.push(urb);
  }
  return {
    id: 'salarios', name: 'Ecuación de Mincer',
    description: 'Corte transversal simulado de 600 ocupados: log del salario mensual (Bs), educación, experiencia, sexo, informalidad y área. La varianza del error crece con la educación, así que White y Breusch-Pagan deberían detectar heteroscedasticidad.',
    source: 'simulado', frequency: 'corte transversal', course: 'econometria',
    columns: Object.keys(c), data: c,
    labels: { ln_salario: 'Log del salario mensual (Bs)', educacion: 'Años de educación', experiencia: 'Años de experiencia', mujer: 'Mujer (1 = sí)', informal: 'Empleo informal (1 = sí)', urbano: 'Área urbana (1 = sí)' },
    exercises: [
      { title: 'Retorno a la educación', hint: 'Regrese ln_salario sobre educacion, experiencia y experiencia². Interprete 100·β.' },
      { title: 'Heteroscedasticidad', hint: 'Aplique White y compare errores clásicos con HC1.' },
    ],
  };
}

const DEPARTAMENTOS = ['Chuquisaca', 'La Paz', 'Cochabamba', 'Oruro', 'Potosí', 'Tarija', 'Santa Cruz', 'Beni', 'Pando'];

/** Panel departamental 9 × 20. */
function panel(): Dataset {
  const rng = new RNG(2009);
  const years = Array.from({ length: 20 }, (_, i) => 2004 + i);
  const alpha = [0.2, 0.6, 0.5, -0.3, -0.5, 1.4, 1.1, -0.8, -0.6];
  const d = { crecimiento: [] as number[], inversion_publica: [] as number[], escolaridad: [] as number[], precio_minerales: [] as number[] };
  const entity: string[] = [];
  const time: string[] = [];
  DEPARTAMENTOS.forEach((dep, j) => {
    years.forEach((yr, t) => {
      const inv = round(9 + 2.2 * alpha[j] + rng.normal(0, 1.8) + (yr >= 2006 && yr <= 2014 ? 2.5 : 0), 3);
      const esc = round(7.5 + 0.08 * t + 0.6 * alpha[j] + rng.normal(0, 0.4), 3);
      const pm = round(100 * (1 + 0.6 * Math.sin((yr - 2004) / 3.2)) + rng.normal(0, 8), 2);
      const g = round(1.2 + 2 * alpha[j] + 0.22 * inv + 0.35 * esc + ((j === 3 || j === 4) ? 0.018 : 0.004) * pm + rng.normal(0, 1.1), 3);
      d.crecimiento.push(g); d.inversion_publica.push(inv); d.escolaridad.push(esc); d.precio_minerales.push(pm);
      entity.push(dep); time.push(String(yr));
    });
  });
  return {
    id: 'panel', name: 'Panel departamental',
    description: 'Panel balanceado simulado de los 9 departamentos, 2004–2023: crecimiento del PIB departamental (%), inversión pública (% del PIB), escolaridad promedio e índice de precios de minerales. Los efectos departamentales están correlacionados con la inversión, así que Hausman debería favorecer Efectos Fijos.',
    source: 'simulado', frequency: 'panel', course: 'econometria',
    columns: Object.keys(d), data: d,
    labels: { crecimiento: 'Crecimiento del PIB departamental (%)', inversion_publica: 'Inversión pública (% del PIB)', escolaridad: 'Escolaridad promedio (años)', precio_minerales: 'Índice de precios de minerales (2004 = 100)' },
    panel: { entity, time },
    index: entity.map((e, i) => `${e} ${time[i]}`),
    exercises: [
      { title: 'EF vs EA', hint: 'Estime ambos y aplique la prueba de Hausman.' },
      { title: 'Sesgo del MCO agrupado', hint: 'Compare el coeficiente de inversion_publica en MCO agrupado y EF.' },
    ],
  };
}

/** Mercado de quinua: sistema de oferta y demanda (ecuaciones simultáneas). */
function quinoa(): Dataset {
  const rng = new RNG(2013);
  const n = 160;
  const d = { cantidad: [] as number[], precio: [] as number[], lluvia: [] as number[], ingreso_externo: [] as number[], precio_fertilizante: [] as number[] };
  for (let t = 0; t < n; t++) {
    const lluvia = round(rng.normal(0, 1), 3);
    const ing = round(100 + t * 0.35 + rng.normal(0, 6), 2);
    const fert = round(50 + rng.normal(0, 7), 2);
    const u = rng.normal(0, 3); // shock de demanda
    const v = rng.normal(0, 3); // shock de oferta
    // Demanda: Q = 60 − 1.2 P + 0.4 ING + u ; Oferta: Q = 10 + 0.8 P + 4 LLUVIA − 0.3 FERT + v
    const P = (60 + 0.4 * ing + u - 10 - 4 * lluvia + 0.3 * fert - v) / (0.8 + 1.2);
    const Q = 60 - 1.2 * P + 0.4 * ing + u;
    d.cantidad.push(round(Q, 3)); d.precio.push(round(P, 3)); d.lluvia.push(lluvia); d.ingreso_externo.push(ing); d.precio_fertilizante.push(fert);
  }
  return {
    id: 'quinua', name: 'Mercado de quinua',
    description: 'Datos simulados de un mercado con precio y cantidad determinados simultáneamente. Demanda verdadera: Q = 60 − 1,2·P + 0,4·ingreso_externo + u. Oferta: Q = 10 + 0,8·P + 4·lluvia − 0,3·precio_fertilizante + v. La lluvia y el fertilizante desplazan la oferta e identifican la demanda.',
    source: 'simulado', frequency: 'corte transversal', course: 'econometria',
    columns: Object.keys(d), data: d,
    labels: { cantidad: 'Cantidad transada (miles de t)', precio: 'Precio (Bs/qq)', lluvia: 'Anomalía de lluvia en el Altiplano (desv. est.)', ingreso_externo: 'Índice de ingreso de socios comerciales', precio_fertilizante: 'Precio del fertilizante (Bs)' },
    exercises: [
      { title: 'Sesgo de simultaneidad', hint: 'Estime la demanda por MCO y compare la pendiente con −1,2.' },
      { title: 'MC2E', hint: 'Instrumente precio con lluvia y precio_fertilizante; revise el F de primera etapa y Sargan.' },
    ],
  };
}

/** Sistema monetario mensual para VAR. */
function monetaryVar(): Dataset {
  const rng = new RNG(2020);
  const n = 180;
  const names = ['inflacion', 'credito', 'tasa_interbancaria', 'emision'];
  const mu = [4, 12, 3, 10];
  const A1 = [
    [0.55, 0.04, 0.05, 0.06],
    [0.02, 0.62, -0.35, 0.05],
    [0.12, 0.02, 0.6, -0.03],
    [0.05, 0.08, -0.4, 0.5],
  ];
  const A2 = [
    [0.15, 0.02, 0.02, 0.04],
    [0.0, 0.18, -0.1, 0.02],
    [0.05, 0.0, 0.15, 0.0],
    [0.0, 0.02, -0.1, 0.2],
  ];
  const sd = [0.6, 1.4, 0.5, 1.8];
  const Y: number[][] = [mu.slice(), mu.slice()];
  for (let t = 2; t < n + 50; t++) {
    const e = sd.map((s) => rng.normal(0, s));
    e[1] += 0.3 * e[0];
    e[3] += 0.4 * e[0];
    const row = mu.map((m, a) => m + A1[a].reduce((s, c, b) => s + c * (Y[t - 1][b] - mu[b]), 0) + A2[a].reduce((s, c, b) => s + c * (Y[t - 2][b] - mu[b]), 0) + e[a]);
    Y.push(row);
  }
  const Z = Y.slice(50);
  const data: Record<string, number[]> = {};
  names.forEach((nm, a) => (data[nm] = Z.map((r) => round(r[a], 3))));
  return {
    id: 'var', name: 'Transmisión monetaria (mensual)',
    description: 'Sistema mensual simulado 2010–2024 generado por un VAR(2) estable: inflación interanual (%), crecimiento del crédito (%), tasa interbancaria (%) y crecimiento de la emisión (%). Sirve para practicar selección de rezagos, Granger, impulso-respuesta y descomposición de varianza.',
    source: 'simulado', frequency: 'mensual', course: 'ambos',
    columns: names, data,
    labels: { inflacion: 'Inflación interanual (%)', credito: 'Crecimiento del crédito (%)', tasa_interbancaria: 'Tasa interbancaria (%)', emision: 'Crecimiento de la emisión (%)' },
    index: months(2010, n),
    exercises: [
      { title: 'Selección de rezagos', hint: 'Compare AIC, BIC y HQ hasta 8 rezagos.' },
      { title: 'Shock de tasa', hint: 'IRF del crédito ante un shock en tasa_interbancaria (orden: inflación, crédito, tasa, emisión).' },
    ],
  };
}

/** Regresión espuria: dos caminatas aleatorias independientes. */
function spurious(): Dataset {
  const rng = new RNG(1974);
  const n = 100;
  let a = 0;
  let b = 0;
  const x: number[] = [];
  const y: number[] = [];
  for (let t = 0; t < n; t++) {
    a += rng.normal();
    b += rng.normal();
    x.push(round(a + 50, 3));
    y.push(round(b + 30, 3));
  }
  return {
    id: 'espuria', name: 'Regresión espuria',
    description: 'Dos caminatas aleatorias independientes (Granger y Newbold, 1974). Una regresión en niveles suele dar un t "significativo" y un R² alto aunque no haya ninguna relación. Compare con la regresión en diferencias.',
    source: 'simulado', frequency: 'anual', course: 'econometria',
    columns: ['y', 'x'], data: { y, x },
    labels: { y: 'Caminata aleatoria A', x: 'Caminata aleatoria B (independiente de A)' },
    index: Array.from({ length: n }, (_, i) => String(1925 + i)),
    exercises: [{ title: 'Detectar la espuria', hint: 'Mire el Durbin-Watson: la regla práctica R² > DW sugiere regresión espuria.' }],
  };
}

export function builtinDatasets(): Dataset[] {
  return [moneyDemand(), wages(), credit(), quinoa(), panel(), monetaryVar(), spurious()];
}
