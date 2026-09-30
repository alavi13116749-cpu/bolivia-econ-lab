import type { Dataset } from './datasets';

// Indicadores del Banco Mundial para Bolivia (BOL), descargados en vivo desde el navegador.
export const WB_INDICATORS: { code: string; col: string; label: string }[] = [
  { code: 'NY.GDP.MKTP.KD.ZG', col: 'crecimiento_pib', label: 'Crecimiento del PIB real (% anual)' },
  { code: 'FP.CPI.TOTL.ZG', col: 'inflacion', label: 'Inflación, precios al consumidor (% anual)' },
  { code: 'FM.LBL.BMNY.GD.ZS', col: 'dinero_amplio_pib', label: 'Dinero amplio (% del PIB)' },
  { code: 'FM.LBL.BMNY.ZG', col: 'crecimiento_m', label: 'Crecimiento del dinero amplio (% anual)' },
  { code: 'FR.INR.LEND', col: 'tasa_activa', label: 'Tasa de interés activa (%)' },
  { code: 'PA.NUS.FCRF', col: 'tipo_cambio', label: 'Tipo de cambio oficial (Bs por USD, promedio)' },
  { code: 'FI.RES.TOTL.MO', col: 'reservas_meses_imp', label: 'Reservas totales en meses de importaciones' },
  { code: 'BN.CAB.XOKA.GD.ZS', col: 'cuenta_corriente_pib', label: 'Cuenta corriente (% del PIB)' },
  { code: 'NE.EXP.GNFS.ZS', col: 'exportaciones_pib', label: 'Exportaciones de bienes y servicios (% del PIB)' },
  { code: 'NY.GDP.PCAP.KD', col: 'pib_pc', label: 'PIB per cápita (USD constantes de 2015)' },
];

interface WBRow { date: string; value: number | null }

async function fetchIndicator(code: string, signal?: AbortSignal): Promise<WBRow[]> {
  const url = `https://api.worldbank.org/v2/country/BOL/indicator/${code}?format=json&per_page=100`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`El Banco Mundial respondió ${res.status} para ${code}.`);
  const json = await res.json();
  if (!Array.isArray(json) || !Array.isArray(json[1])) throw new Error(`Respuesta inesperada para ${code}.`);
  return json[1] as WBRow[];
}

/**
 * Descarga los indicadores y los alinea por año. Conserva sólo los años donde
 * todas las columnas seleccionadas tienen dato (para poder estimar sin huecos).
 */
export async function loadWorldBank(codes: string[], signal?: AbortSignal): Promise<Dataset> {
  const chosen = WB_INDICATORS.filter((w) => codes.includes(w.code));
  const results = await Promise.all(chosen.map((w) => fetchIndicator(w.code, signal)));
  const byYear = new Map<number, Record<string, number>>();
  results.forEach((rows, k) => {
    for (const r of rows) {
      if (r.value == null) continue;
      const y = Number(r.date);
      if (!byYear.has(y)) byYear.set(y, {});
      byYear.get(y)![chosen[k].col] = r.value;
    }
  });
  const years = [...byYear.keys()].filter((y) => chosen.every((w) => byYear.get(y)![w.col] !== undefined)).sort((a, b) => a - b);
  if (years.length < 8) throw new Error('Muy pocos años con todos los indicadores disponibles. Elija menos indicadores.');
  const data: Record<string, number[]> = {};
  const labels: Record<string, string> = {};
  for (const w of chosen) {
    data[w.col] = years.map((y) => byYear.get(y)![w.col]);
    labels[w.col] = `${w.label} [${w.code}]`;
  }
  return {
    id: `wb-${Date.now()}`, name: 'Bolivia — Banco Mundial', source: 'Banco Mundial (en vivo)', frequency: 'anual', course: 'ambos',
    description: `Datos oficiales de los Indicadores del Desarrollo Mundial (api.worldbank.org), ${years[0]}–${years[years.length - 1]}, descargados en este momento. Sólo se conservan los años con todos los indicadores elegidos.`,
    columns: chosen.map((w) => w.col), data, labels, index: years.map(String),
    exercises: [
      { title: 'Hiperinflación de 1985', hint: 'Grafique la inflación: observe el pico de 1985 y la estabilización tras el DS 21060.' },
      { title: 'Dinero e inflación', hint: 'Regrese inflación sobre crecimiento del dinero amplio. ¿Qué pasa si excluye 1982–1986?' },
    ],
  };
}
