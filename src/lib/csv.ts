// Lector de CSV/TSV tolerante: detecta separador (, ; tab) y coma decimal (formato boliviano: 1.234,56).

export interface ParsedTable {
  columns: string[];
  data: Record<string, number[]>;
  labels: Record<string, string[]>; // columnas no numéricas (p.ej. fechas, departamentos)
  rows: number;
  warnings: string[];
}

function detectSep(line: string): string {
  const counts = { ',': 0, ';': 0, '\t': 0 } as Record<string, number>;
  let inQ = false;
  for (const ch of line) {
    if (ch === '"') inQ = !inQ;
    else if (!inQ && ch in counts) counts[ch]++;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][1] > 0 ? Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] : ',';
}

function splitLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ;
    } else if (ch === sep && !inQ) { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export function toNumber(raw: string, decimalComma: boolean): number {
  let s = raw.trim().replace(/\s/g, '');
  if (s === '' || s === '.' || /^(na|nan|null|-|\.\.)$/i.test(s)) return NaN;
  if (decimalComma) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(/,/g, '');
  s = s.replace(/%$/, '');
  const v = Number(s);
  return Number.isFinite(v) ? v : NaN;
}

export function sanitizeName(s: string, i: number): string {
  const base = s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase();
  return base && /^[a-z_]/.test(base) ? base : `v${i + 1}${base ? '_' + base : ''}`;
}

export function parseCSV(text: string): ParsedTable {
  const lines = text.replace(/\r\n?/g, '\n').split('\n').filter((l) => l.trim() !== '');
  if (lines.length < 2) throw new Error('El archivo necesita una fila de encabezados y al menos una fila de datos.');
  const sep = detectSep(lines[0]);
  const header = splitLine(lines[0], sep);
  const body = lines.slice(1).map((l) => splitLine(l, sep));
  // coma decimal si el separador no es coma y aparecen patrones 12,5
  const sample = body.slice(0, 50).flat();
  const decimalComma = sep !== ',' && sample.some((c) => /^-?\d+,\d+$/.test(c));
  const columns: string[] = [];
  const data: Record<string, number[]> = {};
  const labels: Record<string, string[]> = {};
  const warnings: string[] = [];
  const used = new Set<string>();
  header.forEach((h, j) => {
    let name = sanitizeName(h, j);
    while (used.has(name)) name += '_';
    used.add(name);
    const raw = body.map((r) => r[j] ?? '');
    const nums = raw.map((c) => toNumber(c, decimalComma));
    const valid = nums.filter((v) => !Number.isNaN(v)).length;
    if (valid >= Math.max(1, raw.filter((c) => c !== '').length * 0.8)) {
      columns.push(name);
      data[name] = nums;
      const miss = nums.length - valid;
      if (miss > 0) warnings.push(`${name}: ${miss} valores faltantes.`);
    } else {
      labels[name] = raw;
    }
  });
  if (!columns.length) throw new Error('No se encontraron columnas numéricas.');
  if (decimalComma) warnings.push('Se detectó coma decimal (formato boliviano).');
  return { columns, data, labels, rows: body.length, warnings };
}
