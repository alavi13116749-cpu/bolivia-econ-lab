import {
  Area, Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ReferenceDot, ReferenceLine, ResponsiveContainer,
  Scatter, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useThemeColors, SERIES } from './theme';

export interface SeriesDef { key: string; label: string; color?: string; dashed?: boolean; area?: boolean; dot?: boolean }

const fmtTick = (v: unknown) => (typeof v === 'number' ? (Math.abs(v) >= 1000 ? v.toLocaleString('es-BO', { maximumFractionDigits: 0 }) : Number(v.toFixed(3)).toString()) : String(v));

/** Gráfico de líneas genérico con tooltip, cuadrícula tenue y leyenda para ≥ 2 series. */
export function LineChartX({ data, x, series, height = 260, yLabel, xLabel, refY, refX, band, points, xType = 'category', yDomain }: {
  data: Record<string, number | string | null>[]; x: string; series: SeriesDef[]; height?: number; yLabel?: string; xLabel?: string;
  refY?: { y: number; label?: string }[]; refX?: { x: number | string; label?: string }[];
  band?: { lower: string; upper: string; label?: string };
  points?: { x: number; y: number; label?: string }[];
  xType?: 'category' | 'number'; yDomain?: [number | 'auto', number | 'auto'];
}) {
  const c = useThemeColors();
  const col = (s: SeriesDef, i: number) => (s.color ? (c as Record<string, string>)[s.color] ?? s.color : c[SERIES[i % SERIES.length]]);
  const bandData: Record<string, unknown>[] = band ? data.map((d) => ({ ...d, __band: [d[band.lower], d[band.upper]] })) : data;
  return (
    <div style={{ width: '100%', height }} className="min-w-0">
      <ResponsiveContainer>
        <ComposedChart data={bandData} margin={{ top: 8, right: 16, bottom: xLabel ? 18 : 4, left: 4 }}>
          <CartesianGrid stroke={c.grid} vertical={false} />
          <XAxis dataKey={x} type={xType} domain={xType === 'number' ? ['dataMin', 'dataMax'] : undefined} tick={{ fill: c.muted, fontSize: 11 }} stroke={c.line} tickFormatter={fmtTick} minTickGap={24}
            label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -10, fill: c.muted, fontSize: 11 } : undefined} />
          <YAxis tick={{ fill: c.muted, fontSize: 11 }} stroke={c.line} tickFormatter={fmtTick} width={52} domain={yDomain ?? ['auto', 'auto']}
            label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', fill: c.muted, fontSize: 11, dy: 40 } : undefined} />
          <Tooltip contentStyle={{ background: c.surface, border: `1px solid ${c.line}`, borderRadius: 8, fontSize: 12, color: c.ink }} labelStyle={{ color: c.muted }}
            formatter={(v: unknown) => (typeof v === 'number' ? v.toFixed(4) : Array.isArray(v) ? v.map((z) => Number(z).toFixed(3)).join(' – ') : String(v))} />
          {series.length > 1 && <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12, color: c.muted }} iconType="plainline" />}
          {band && <Area dataKey="__band" name={band.label ?? 'Banda 95%'} stroke="none" fill={c['series-1']} fillOpacity={0.14} isAnimationActive={false} />}
          {refY?.map((r, i) => <ReferenceLine key={`y${i}`} y={r.y} stroke={c.muted} strokeDasharray="4 4" label={r.label ? { value: r.label, fill: c.muted, fontSize: 11, position: 'insideTopRight' } : undefined} />)}
          {refX?.map((r, i) => <ReferenceLine key={`x${i}`} x={r.x} stroke={c.muted} strokeDasharray="4 4" label={r.label ? { value: r.label, fill: c.muted, fontSize: 11, position: 'insideTopLeft' } : undefined} />)}
          {series.map((s, i) =>
            s.area ? (
              <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={col(s, i)} fill={col(s, i)} fillOpacity={0.12} strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
            ) : (
              <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={col(s, i)} strokeWidth={2} strokeDasharray={s.dashed ? '5 4' : undefined} dot={s.dot ? { r: 3 } : false} isAnimationActive={false} connectNulls />
            ),
          )}
          {points?.map((p, i) => <ReferenceDot key={`p${i}`} x={p.x} y={p.y} r={5} fill={c.accent} stroke={c.surface} strokeWidth={2} label={p.label ? { value: p.label, fill: c.ink, fontSize: 11, position: 'top' } : undefined} />)}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Barras (FAC/FACP, histogramas) con bandas opcionales. */
export function BarsX({ data, x, bars, height = 220, refY, xLabel }: {
  data: Record<string, number | string>[]; x: string; bars: SeriesDef[]; height?: number; refY?: { y: number; label?: string }[]; xLabel?: string;
}) {
  const c = useThemeColors();
  return (
    <div style={{ width: '100%', height }} className="min-w-0">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: xLabel ? 18 : 4, left: 4 }} barCategoryGap={2}>
          <CartesianGrid stroke={c.grid} vertical={false} />
          <XAxis dataKey={x} tick={{ fill: c.muted, fontSize: 11 }} stroke={c.line} tickFormatter={fmtTick} minTickGap={12}
            label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -10, fill: c.muted, fontSize: 11 } : undefined} />
          <YAxis tick={{ fill: c.muted, fontSize: 11 }} stroke={c.line} tickFormatter={fmtTick} width={48} />
          <Tooltip cursor={{ fill: c.grid }} contentStyle={{ background: c.surface, border: `1px solid ${c.line}`, borderRadius: 8, fontSize: 12, color: c.ink }} formatter={(v: unknown) => (typeof v === 'number' ? v.toFixed(4) : String(v))} />
          {bars.length > 1 && <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />}
          {refY?.map((r, i) => <ReferenceLine key={i} y={r.y} stroke={c.accent} strokeDasharray="4 4" label={r.label ? { value: r.label, fill: c.muted, fontSize: 11, position: 'insideTopRight' } : undefined} />)}
          {bars.map((b, i) => (
            <Bar key={b.key} dataKey={b.key} name={b.label} fill={b.color ? (c as Record<string, string>)[b.color] ?? b.color : c[SERIES[i % SERIES.length]]} radius={[3, 3, 0, 0]} isAnimationActive={false} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Dispersión con recta ajustada. */
export function ScatterFit({ points, line, height = 260, xLabel, yLabel }: {
  points: { x: number; y: number }[]; line?: { x: number; y: number }[]; height?: number; xLabel?: string; yLabel?: string;
}) {
  const c = useThemeColors();
  return (
    <div style={{ width: '100%', height }} className="min-w-0">
      <ResponsiveContainer>
        <ComposedChart margin={{ top: 8, right: 16, bottom: 18, left: 4 }}>
          <CartesianGrid stroke={c.grid} />
          <XAxis dataKey="x" type="number" domain={['auto', 'auto']} tick={{ fill: c.muted, fontSize: 11 }} stroke={c.line} tickFormatter={fmtTick}
            label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -10, fill: c.muted, fontSize: 11 } : undefined} />
          <YAxis dataKey="y" type="number" domain={['auto', 'auto']} tick={{ fill: c.muted, fontSize: 11 }} stroke={c.line} tickFormatter={fmtTick} width={52}
            label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', fill: c.muted, fontSize: 11, dy: 40 } : undefined} />
          <Tooltip contentStyle={{ background: c.surface, border: `1px solid ${c.line}`, borderRadius: 8, fontSize: 12, color: c.ink }} formatter={(v: unknown) => (typeof v === 'number' ? v.toFixed(4) : String(v))} />
          <Scatter data={points} fill={c['series-1']} fillOpacity={0.55} isAnimationActive={false} shape="circle" />
          {line && <Line data={line} dataKey="y" stroke={c.accent} strokeWidth={2} dot={false} isAnimationActive={false} legendType="none" />}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Histograma a partir de una muestra. */
export function histogram(values: number[], bins = 30, range?: [number, number]) {
  const lo = range?.[0] ?? Math.min(...values);
  const hi = range?.[1] ?? Math.max(...values);
  const w = (hi - lo) / bins || 1;
  const counts = new Array(bins).fill(0);
  for (const v of values) {
    const k = Math.min(bins - 1, Math.max(0, Math.floor((v - lo) / w)));
    if (v >= lo && v <= hi) counts[k]++;
  }
  return counts.map((n, k) => ({ x: Number((lo + (k + 0.5) * w).toFixed(3)), n }));
}
